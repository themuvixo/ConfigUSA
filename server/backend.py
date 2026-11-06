#!/usr/bin/env python3
"""
Real-time stats and subscription backend running on the GitHub Actions runner.
Listens on 127.0.0.1:8081, proxied through Nginx & the TryCloudflare tunnel.

3x-ui style overview data:
  * CPU / RAM / swap / disk / load average / cores
  * live network speed + session traffic (from /proc/net/dev)
  * Xray state, version and per-inbound traffic (Xray Stats API)
  * uptime + remaining time until auto-renewal
Plus subscription endpoints (plain, base64) with CORS.
Configs and subscription files are re-read on every request.
"""

import argparse
import base64
import json
import os
import shutil
import subprocess
import threading
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer


# ------------------------------------------------------------ /proc readers --
def parse_net_dev():
    """Total rx and tx bytes from /proc/net/dev, loopback excluded."""
    rx = tx = 0
    try:
        with open("/proc/net/dev", "r") as f:
            for line in f.readlines()[2:]:
                parts = line.split()
                if len(parts) >= 10 and parts[0].strip(":") != "lo":
                    rx += int(parts[1])
                    tx += int(parts[9])
    except Exception:
        pass
    return rx, tx


def read_cpu_times():
    try:
        with open("/proc/stat", "r") as f:
            vals = [int(x) for x in f.readline().split()[1:]]
        idle = vals[3] + (vals[4] if len(vals) > 4 else 0)
        return sum(vals), idle
    except Exception:
        return 0, 0


def read_meminfo():
    info = {}
    try:
        with open("/proc/meminfo", "r") as f:
            for line in f:
                k, v = line.split(":", 1)
                info[k] = int(v.split()[0]) * 1024
    except Exception:
        pass
    total = info.get("MemTotal", 0)
    avail = info.get("MemAvailable", info.get("MemFree", 0))
    s_total = info.get("SwapTotal", 0)
    s_used = s_total - info.get("SwapFree", 0)
    return {"total": total, "used": max(0, total - avail)}, {"total": s_total, "used": max(0, s_used)}


def read_disk(path="/"):
    try:
        u = shutil.disk_usage(path)
        return {"total": u.total, "used": u.used}
    except Exception:
        return {"total": 0, "used": 0}


def count_tcp_established():
    n = 0
    for p in ("/proc/net/tcp", "/proc/net/tcp6"):
        try:
            with open(p, "r") as f:
                n += sum(1 for line in f.readlines()[1:] if line.split()[3] == "01")
        except Exception:
            pass
    return n


def process_running(name_fragment):
    try:
        for pid in os.listdir("/proc"):
            if not pid.isdigit():
                continue
            try:
                with open(f"/proc/{pid}/cmdline", "rb") as f:
                    cmd = f.read().replace(b"\0", b" ").decode(errors="ignore")
                if name_fragment in cmd and "backend.py" not in cmd:
                    return True
            except Exception:
                continue
    except Exception:
        pass
    return False


def format_bytes(b):
    b = float(b)
    for unit in ["B", "KB", "MB", "GB", "TB"]:
        if b < 1024.0:
            return f"{b:.2f} {unit}"
        b /= 1024.0
    return f"{b:.2f} PB"


def format_duration(seconds):
    seconds = max(0, int(seconds))
    return f"{seconds // 3600:02d}h {(seconds % 3600) // 60:02d}m {seconds % 60:02d}s"


# ---------------------------------------------------------- Sampler thread --
class Sampler:
    """Samples CPU, network speed and Xray stats every 2s in the background."""

    def __init__(self, xray_bin, api_addr):
        self.xray_bin = xray_bin
        self.api_addr = api_addr
        self.lock = threading.Lock()
        self.cpu_pct = 0.0
        self.up_speed = 0
        self.down_speed = 0
        self.inbounds = {}
        self.xray_version = ""
        self._last_cpu = read_cpu_times()
        self._last_net = (time.time(),) + parse_net_dev()

    def xray_version_once(self):
        if self.xray_version or not self.xray_bin or not os.path.exists(self.xray_bin):
            return
        try:
            out = subprocess.run([self.xray_bin, "version"], capture_output=True,
                                 text=True, timeout=5).stdout.split()
            if len(out) >= 2:
                self.xray_version = out[1]
        except Exception:
            pass

    def query_xray(self):
        if not self.xray_bin or not os.path.exists(self.xray_bin):
            return None
        try:
            r = subprocess.run(
                [self.xray_bin, "api", "statsquery", f"--server={self.api_addr}", "-pattern", "inbound>>>"],
                capture_output=True, text=True, timeout=3)
            if r.returncode != 0:
                return None
            data = json.loads(r.stdout or "{}")
        except Exception:
            return None
        result = {}
        for st in data.get("stat", []) or []:
            parts = st.get("name", "").split(">>>")
            if len(parts) != 4 or parts[0] != "inbound" or parts[1] == "api":
                continue
            tag, direction = parts[1], parts[3]
            result.setdefault(tag, {"up": 0, "down": 0})
            val = int(st.get("value", 0) or 0)
            result[tag]["up" if direction == "uplink" else "down"] = val
        return result

    def loop(self):
        while True:
            try:
                self.xray_version_once()
                tot, idle = read_cpu_times()
                ltot, lidle = self._last_cpu
                cpu = 0.0
                if tot > ltot:
                    cpu = 100.0 * (1 - (idle - lidle) / (tot - ltot))
                self._last_cpu = (tot, idle)

                now = time.time()
                rx, tx = parse_net_dev()
                lt, lrx, ltx = self._last_net
                dt = max(0.001, now - lt)
                down = max(0, rx - lrx) / dt
                up = max(0, tx - ltx) / dt
                self._last_net = (now, rx, tx)

                inbounds = self.query_xray()
                with self.lock:
                    self.cpu_pct = round(max(0.0, min(100.0, cpu)), 1)
                    self.down_speed = int(down)
                    self.up_speed = int(up)
                    if inbounds is not None:
                        self.inbounds = inbounds
            except Exception:
                pass
            time.sleep(2)

    def snapshot(self):
        with self.lock:
            return {"cpu": self.cpu_pct, "up": self.up_speed, "down": self.down_speed,
                    "inbounds": dict(self.inbounds), "xray_version": self.xray_version}


# ------------------------------------------------------------------ HTTP ----
class StatsServerHandler(BaseHTTPRequestHandler):
    start_time = time.time()
    initial_rx = 0
    initial_tx = 0
    domain = "unknown"
    max_duration = 20700  # 5 hours 45 minutes
    configs_file_path = ""
    sub_file_path = ""
    sampler = None

    def log_message(self, format, *args):
        return

    def send_cors_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, OPTIONS, HEAD")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With")
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")

    def reply(self, body, ctype="application/json; charset=utf-8", extra=None, code=200):
        if isinstance(body, str):
            body = body.encode("utf-8")
        self.send_response(code)
        self.send_cors_headers()
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(body)))
        for k, v in (extra or {}).items():
            self.send_header(k, v)
        self.end_headers()
        self.wfile.write(body)

    def get_latest_configs(self):
        if self.configs_file_path and os.path.exists(self.configs_file_path):
            try:
                with open(self.configs_file_path, "r", encoding="utf-8") as f:
                    data = json.load(f)
                if data.get("domain"):
                    StatsServerHandler.domain = data["domain"]
                return data
            except Exception:
                pass
        return {}

    def get_latest_subs(self):
        plain = ""
        if self.sub_file_path and os.path.exists(self.sub_file_path):
            try:
                with open(self.sub_file_path, "r", encoding="utf-8") as f:
                    plain = f.read().strip()
            except Exception:
                pass
        return plain, base64.b64encode(plain.encode("utf-8")).decode("utf-8")

    def system_block(self):
        snap = self.sampler.snapshot() if self.sampler else {
            "cpu": 0, "up": 0, "down": 0, "inbounds": {}, "xray_version": ""}
        mem, swap = read_meminfo()
        try:
            load = [round(x, 2) for x in os.getloadavg()]
        except Exception:
            load = [0, 0, 0]
        return {
            "cpu_percent": snap["cpu"],
            "cpu_cores": os.cpu_count() or 1,
            "mem": mem,
            "swap": swap,
            "disk": read_disk("/"),
            "load": load,
            "tcp_connections": count_tcp_established(),
            "net_speed": {"up": snap["up"], "down": snap["down"]},
            "xray": {"running": process_running("xray run"),
                     "version": snap["xray_version"]},
            "services": {
                "nginx": process_running("nginx"),
                "cloudflared": process_running("cloudflared"),
                "mtg": process_running("mtg"),
                "hysteria": process_running("hysteria server"),
                "playit": process_running("playit"),
            },
        }, snap["inbounds"]

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_cors_headers()
        self.end_headers()

    def do_HEAD(self):
        self.send_response(200)
        self.send_cors_headers()
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.end_headers()

    def do_GET(self):
        path = self.path.split("?")[0].rstrip("/") or "/"

        if path in ["/api/stats", "/stats"]:
            now = time.time()
            elapsed = now - self.start_time
            remaining = max(0, self.max_duration - elapsed)
            cur_rx, cur_tx = parse_net_dev()
            delta_rx = max(0, cur_rx - self.initial_rx)
            delta_tx = max(0, cur_tx - self.initial_tx)
            configs_data = self.get_latest_configs()
            system, inbound_traffic = self.system_block()
            data = {
                "status": "online",
                "domain": self.domain,
                "uptime_seconds": int(elapsed),
                "uptime_human": format_duration(elapsed),
                "remaining_seconds": int(remaining),
                "remaining_human": format_duration(remaining),
                "session_progress_percent": min(100.0, round((elapsed / self.max_duration) * 100, 2)),
                "traffic": {
                    "rx_bytes": delta_rx,
                    "tx_bytes": delta_tx,
                    "total_bytes": delta_rx + delta_tx,
                    "rx_human": format_bytes(delta_rx),
                    "tx_human": format_bytes(delta_tx),
                    "total_human": format_bytes(delta_rx + delta_tx),
                },
                "system": system,
                "inbound_traffic": inbound_traffic,
                "configs": configs_data,
                "protocols": [i["key"] for i in configs_data.get("inbounds", []) if i.get("enabled")],
                "server_start_timestamp": int(self.start_time),
                "server_current_timestamp": int(now),
                "renewal_threshold_seconds": self.max_duration,
            }
            self.reply(json.dumps(data, indent=2))

        elif path in ["/sub", "/sub.txt", "/sub64", "/sub64.txt"]:
            plain, b64 = self.get_latest_subs()
            is64 = "64" in path
            self.reply((b64 if is64 else plain) + "\n", "text/plain; charset=utf-8", {
                "Content-Disposition": f'inline; filename="{"sub64" if is64 else "sub"}.txt"',
                "Profile-Update-Interval": "1",
                "Profile-Title": "base64:" + base64.b64encode("Config Hub".encode()).decode(),
            })

        elif path in ["/api/configs", "/configs"]:
            self.reply(json.dumps(self.get_latest_configs(), indent=2))

        elif path in ["/ping", "/health"]:
            self.reply('{"status":"ok","message":"Xray TryCloudflare Server is running"}')

        else:
            self.reply(json.dumps({
                "message": "Xray Live Backend",
                "status": "online",
                "domain": self.domain,
                "endpoints": {
                    "stats": "/api/stats",
                    "subscription_plain": "/sub",
                    "subscription_base64": "/sub64",
                    "configs": "/api/configs",
                    "health": "/ping",
                },
            }, indent=2))


def main():
    parser = argparse.ArgumentParser(description="Xray Backend Monitor")
    parser.add_argument("--port", type=int, default=8081)
    parser.add_argument("--domain", type=str, default="127.0.0.1")
    parser.add_argument("--configs-json", type=str, default="")
    parser.add_argument("--sub-file", type=str, default="")
    parser.add_argument("--xray-bin", type=str, default=os.path.expanduser("~/xray/xray"))
    parser.add_argument("--xray-api", type=str, default="127.0.0.1:10085")
    parser.add_argument("--max-duration", type=int, default=20700)
    args = parser.parse_args()

    StatsServerHandler.domain = args.domain
    StatsServerHandler.start_time = time.time()
    StatsServerHandler.initial_rx, StatsServerHandler.initial_tx = parse_net_dev()
    StatsServerHandler.max_duration = args.max_duration
    StatsServerHandler.configs_file_path = args.configs_json
    StatsServerHandler.sub_file_path = args.sub_file

    sampler = Sampler(args.xray_bin, args.xray_api)
    threading.Thread(target=sampler.loop, daemon=True).start()
    StatsServerHandler.sampler = sampler

    server = ThreadingHTTPServer(("127.0.0.1", args.port), StatsServerHandler)
    print(f"🚀 Live Stats backend running on http://127.0.0.1:{args.port}")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
