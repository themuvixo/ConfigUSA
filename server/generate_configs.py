#!/usr/bin/env python3
"""
Generates server configs (Xray + Nginx + Hysteria2) and client assets.

Everything below the Cloudflare quick tunnel is plain HTTP(S) on 443, so these
transports work on a GitHub Actions runner:

  VLESS  : WebSocket, HTTPUpgrade, XHTTP (packet-up friendly)
  VMess  : WebSocket, HTTPUpgrade
  Trojan : WebSocket
  Shadowsocks : WebSocket (SIP003 v2ray-plugin)

Raw TCP/UDP services need their own tunnel (Cloudflare cannot carry them):

  VLESS + REALITY + Vision      -> TCP via bore.pub (experimental)
  MTProto (Telegram, fake-TLS)  -> TCP via bore.pub
  Hysteria2 (QUIC, salamander)  -> UDP via a playit.gg tunnel (optional)

Per-inbound traffic is exposed through the Xray Stats API on 127.0.0.1:10085.
"""

import argparse
import base64
import json
import os
import re
import secrets
import subprocess
import sys
import time
import urllib.parse
import uuid

SS_METHOD = "aes-128-gcm"
MTPROTO_LOCAL_PORT = 8443
HY2_LOCAL_PORT = 8444
HY2_SNI = "www.bing.com"
REALITY_LOCAL_PORT = 10010
REALITY_DEST = "www.microsoft.com"
XRAY_API_ADDR = "127.0.0.1:10085"

# key, group, display name, xray protocol, transport, local port, path, nginx kind
INBOUNDS = [
    dict(key="vless-ws",    group="cdn",   name="VLESS · WebSocket",    proto="vless",       net="ws",          port=10001, path="/vless-ws"),
    dict(key="vless-hu",    group="cdn",   name="VLESS · HTTPUpgrade",  proto="vless",       net="httpupgrade", port=10002, path="/vless-hu"),
    dict(key="vless-xhttp", group="xhttp", name="VLESS · XHTTP",        proto="vless",       net="xhttp",       port=10003, path="/vless-xhttp/"),
    dict(key="vmess-ws",    group="cdn",   name="VMess · WebSocket",    proto="vmess",       net="ws",          port=10004, path="/vmess-ws"),
    dict(key="vmess-hu",    group="cdn",   name="VMess · HTTPUpgrade",  proto="vmess",       net="httpupgrade", port=10005, path="/vmess-hu"),
    dict(key="trojan-ws",   group="cdn",   name="Trojan · WebSocket",   proto="trojan",      net="ws",          port=10006, path="/trojan-ws"),
    dict(key="ss-ws",       group="cdn",   name="Shadowsocks · WS",     proto="shadowsocks", net="ws",          port=10007, path="/ss-ws"),
]
for _i in INBOUNDS:
    _i["tag"] = _i["key"] + "-in"


# ------------------------------------------------------------- reality ---
def make_reality_keys(xray_bin):
    """Run `xray x25519`; works with both the old and the new output format."""
    if not xray_bin or not os.path.exists(xray_bin):
        return None
    try:
        out = subprocess.run([xray_bin, "x25519"], capture_output=True, text=True, timeout=10).stdout
    except Exception:
        return None
    priv = re.search(r"Private\s*key:\s*(\S+)|PrivateKey:\s*(\S+)", out, re.I)
    pub = re.search(r"Public\s*key:\s*(\S+)|PublicKey:\s*(\S+)|Password[^:]*:\s*(\S+)", out, re.I)
    if not priv or not pub:
        return None
    return {"reality_private": next(g for g in priv.groups() if g),
            "reality_public": next(g for g in pub.groups() if g),
            "reality_short_id": secrets.token_hex(8)}


# ----------------------------------------------------------------- creds ---
def load_or_create_creds(creds_file, fake_tls_domain):
    os.makedirs(os.path.dirname(os.path.abspath(creds_file)), exist_ok=True)
    creds = {}
    if os.path.exists(creds_file):
        with open(creds_file, "r", encoding="utf-8") as f:
            creds = json.load(f)
    changed = False
    defaults = {
        "client_uuid": lambda: str(uuid.uuid4()),
        "trojan_password": lambda: "tr_" + secrets.token_hex(6),
        "ss_password": lambda: "ss_" + secrets.token_hex(8),
        "hy2_password": lambda: "hy_" + secrets.token_hex(10),
        "hy2_obfs": lambda: "ob_" + secrets.token_hex(8),
        # Fake-TLS secret: "ee" + 16 random bytes + hex(domain)
        "mtproto_secret": lambda: "ee" + secrets.token_hex(16) + fake_tls_domain.encode().hex(),
        "mtproto_domain": lambda: fake_tls_domain,
    }
    for key, make in defaults.items():
        if not creds.get(key):
            creds[key] = make()
            changed = True
    if changed:
        with open(creds_file, "w", encoding="utf-8") as f:
            json.dump(creds, f)
    return creds


# ------------------------------------------------------------- xray side ---
def stream_settings(net, path):
    if net == "ws":
        return {"network": "ws", "wsSettings": {"path": path}}
    if net == "httpupgrade":
        return {"network": "httpupgrade", "httpupgradeSettings": {"path": path}}
    if net == "xhttp":
        # "auto" accepts packet-up / stream-up / stream-one from the client
        return {"network": "xhttp", "xhttpSettings": {"path": path, "mode": "auto"}}
    raise ValueError(net)


def inbound_settings(item, creds):
    p = item["proto"]
    if p == "vless":
        return {"clients": [{"id": creds["client_uuid"], "email": item["key"] + "@hub"}], "decryption": "none"}
    if p == "vmess":
        return {"clients": [{"id": creds["client_uuid"], "email": item["key"] + "@hub"}]}
    if p == "trojan":
        return {"clients": [{"password": creds["trojan_password"], "email": item["key"] + "@hub"}]}
    if p == "shadowsocks":
        return {"method": SS_METHOD, "password": creds["ss_password"], "network": "tcp"}
    raise ValueError(p)


def xray_inbound(item, creds):
    return {
        "tag": item["tag"],
        "port": item["port"],
        "listen": "127.0.0.1",
        "protocol": item["proto"],
        "settings": inbound_settings(item, creds),
        "streamSettings": stream_settings(item["net"], item["path"]),
        "sniffing": {"enabled": True, "destOverride": ["http", "tls", "quic"]},
    }


def reality_inbounds(creds):
    if not creds.get("reality_private"):
        return []
    return [{
        "tag": "vless-reality-in", "port": REALITY_LOCAL_PORT, "listen": "127.0.0.1", "protocol": "vless",
        "settings": {"clients": [{"id": creds["client_uuid"], "flow": "xtls-rprx-vision", "email": "reality@hub"}],
                     "decryption": "none"},
        "streamSettings": {"network": "tcp", "security": "reality", "realitySettings": {
            "show": False, "dest": f"{REALITY_DEST}:443", "xver": 0, "serverNames": [REALITY_DEST],
            "privateKey": creds["reality_private"], "shortIds": [creds["reality_short_id"]]}},
        "sniffing": {"enabled": True, "destOverride": ["http", "tls", "quic"], "routeOnly": True},
    }]


def nginx_location(item):
    path, port, net = item["path"], item["port"], item["net"]
    if net == "xhttp":
        # Streaming-friendly: no buffering either way, unlimited body, plain keep-alive
        return f"""
        location {path} {{
            proxy_pass http://127.0.0.1:{port};
            proxy_http_version 1.1;
            proxy_set_header Connection "";
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_buffering off;
            proxy_request_buffering off;
            client_max_body_size 0;
            client_body_timeout 600s;
            proxy_read_timeout 600s;
            proxy_send_timeout 600s;
            tcp_nodelay on;
        }}
"""
    return f"""
        location {path} {{
            proxy_redirect off;
            proxy_pass http://127.0.0.1:{port};
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection "upgrade";
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_buffering off;
            proxy_request_buffering off;
            proxy_read_timeout 3600s;
            proxy_send_timeout 3600s;
        }}
"""


def setup_server(server_dir, creds_file, fake_tls_domain, xray_bin=""):
    os.makedirs(server_dir, exist_ok=True)
    creds = load_or_create_creds(creds_file, fake_tls_domain)
    if not creds.get("reality_private"):
        keys = make_reality_keys(xray_bin)
        if keys:
            creds.update(keys)
            with open(creds_file, "w", encoding="utf-8") as f:
                json.dump(creds, f)

    xray_config = {
        "log": {"loglevel": "warning"},
        "api": {"tag": "api", "listen": XRAY_API_ADDR, "services": ["StatsService"]},
        "stats": {},
        "policy": {
            "levels": {"0": {"statsUserUplink": True, "statsUserDownlink": True}},
            "system": {"statsInboundUplink": True, "statsInboundDownlink": True,
                       "statsOutboundUplink": True, "statsOutboundDownlink": True},
        },
        "inbounds": [xray_inbound(i, creds) for i in INBOUNDS] + reality_inbounds(creds),
        "outbounds": [
            {"tag": "direct", "protocol": "freedom"},
            {"tag": "blocked", "protocol": "blackhole"},
        ],
        "routing": {
            "domainStrategy": "AsIs",
            "rules": [{"type": "field", "ip": ["geoip:private"], "outboundTag": "blocked"}],
        },
    }
    with open(os.path.join(server_dir, "xray_config.json"), "w", encoding="utf-8") as f:
        json.dump(xray_config, f, indent=2)

    locations = "".join(nginx_location(i) for i in INBOUNDS)
    nginx_conf = f"""worker_processes 1;
pid /tmp/nginx.pid;
events {{ worker_connections 2048; }}

http {{
    default_type application/octet-stream;
    access_log off;
    server_tokens off;
    tcp_nodelay on;
    client_max_body_size 0;
    keepalive_timeout 3600s;
    error_log /tmp/nginx_error.log warn;

    map $http_upgrade $connection_upgrade {{
        default upgrade;
        '' close;
    }}

    server {{
        listen 8080 default_server;
        server_name _;

        location /api/ {{
            proxy_pass http://127.0.0.1:8081;
            proxy_set_header Host $host;
        }}

        location ~ ^/(sub|sub[.]txt|sub64|sub64[.]txt|ping|stats|configs) {{
            proxy_pass http://127.0.0.1:8081;
            proxy_set_header Host $host;
        }}
{locations}
        location / {{
            proxy_pass http://127.0.0.1:8081;
            proxy_set_header Host $host;
        }}
    }}
}}
"""
    with open(os.path.join(server_dir, "nginx.conf"), "w", encoding="utf-8") as f:
        f.write(nginx_conf)

    # Hysteria2 (QUIC/UDP). The workflow only starts it when a UDP tunnel is configured.
    hy2_yaml = f"""listen: 0.0.0.0:{HY2_LOCAL_PORT}

tls:
  cert: {os.path.join(server_dir, "hy2.crt")}
  key: {os.path.join(server_dir, "hy2.key")}
  sniGuard: disable

auth:
  type: password
  password: {creds["hy2_password"]}

obfs:
  type: salamander
  salamander:
    password: {creds["hy2_obfs"]}

masquerade:
  type: proxy
  proxy:
    url: https://{HY2_SNI}
    rewriteHost: true
"""
    with open(os.path.join(server_dir, "hysteria.yaml"), "w", encoding="utf-8") as f:
        f.write(hy2_yaml)

    with open(os.path.join(server_dir, "mtproto_secret.txt"), "w", encoding="utf-8") as f:
        f.write(creds["mtproto_secret"])

    print(f"✅ Server configs ready ({len(INBOUNDS)} Xray inbounds, Nginx, Hysteria2, MTProto secret).")


# ----------------------------------------------------------- client links ---
def build_link(item, creds, domain, host=None):
    """Share link for a CDN (Cloudflare) inbound. host = clean IP or domain."""
    q = urllib.parse.quote
    host = host or domain
    p, net, path, name = item["proto"], item["net"], item["path"], item["remark"]
    alpn = "h2" if net == "xhttp" else "http/1.1"
    common = f"security=tls&sni={domain}&fp=chrome&alpn={q(alpn, safe='')}&type={net}&host={domain}&path={q(path, safe='')}"
    if p == "vless":
        extra = "&mode=packet-up" if net == "xhttp" else ""
        return f"vless://{creds['client_uuid']}@{host}:443?encryption=none&{common}{extra}#{q(name)}"
    if p == "trojan":
        return f"trojan://{q(creds['trojan_password'], safe='')}@{host}:443?{common}#{q(name)}"
    if p == "vmess":
        obj = {"v": "2", "ps": name, "add": host, "port": "443", "id": creds["client_uuid"], "aid": "0",
               "scy": "auto", "net": net, "type": "none", "host": domain, "path": path, "tls": "tls",
               "sni": domain, "alpn": alpn, "fp": "chrome"}
        return "vmess://" + base64.b64encode(json.dumps(obj, separators=(",", ":")).encode()).decode()
    if p == "shadowsocks":
        userinfo = base64.urlsafe_b64encode(f"{SS_METHOD}:{creds['ss_password']}".encode()).decode().rstrip("=")
        plugin = q(f"v2ray-plugin;tls;host={domain};path={path}", safe="")
        return f"ss://{userinfo}@{host}:443?plugin={plugin}#{q(name)}"
    raise ValueError(p)


def generate_client(domain, repo, output_dir, server_dir, creds_file, fake_tls_domain,
                    mtproto_host, mtproto_port, hy2_endpoint, hy2_pin, reality_host="", reality_port="", disabled=()):
    os.makedirs(output_dir, exist_ok=True)
    creds = load_or_create_creds(creds_file, fake_tls_domain)
    inbounds, sub_links = [], []

    for it in INBOUNDS:
        rec = dict(it)
        rec["remark"] = it["key"].replace("-", " ").upper().replace(" ", "-") + "-CF"
        failed = it["key"] in disabled
        rec.update({"port_public": 443, "sni": domain, "enabled": not failed, "cdn": True})
        if failed:
            rec["note"] = "failed the live self-test this session"
        if it["proto"] in ("vless", "vmess"):
            rec["uuid"] = creds["client_uuid"]
        if it["proto"] == "trojan":
            rec["password"] = creds["trojan_password"]
        if it["proto"] == "shadowsocks":
            rec.update({"password": creds["ss_password"], "method": SS_METHOD})
        rec["link"] = build_link(rec, creds, domain)
        if not failed:
            sub_links.append(rec["link"])
        inbounds.append(rec)

    # --- Hysteria2 over a UDP tunnel (optional) ---
    hy2 = {"key": "hysteria2", "group": "udp", "name": "Hysteria2 · QUIC", "proto": "hysteria2", "net": "quic",
           "tag": None, "remark": "HYSTERIA2", "cdn": False, "enabled": False}
    if hy2_endpoint and ":" in hy2_endpoint:
        h, _, p = hy2_endpoint.rpartition(":")
        pin = (hy2_pin or "").replace(":", "").upper()
        params = {"obfs": "salamander", "obfs-password": creds["hy2_obfs"], "sni": HY2_SNI, "insecure": "1"}
        if pin:
            params["pinSHA256"] = pin
        link = (f"hysteria2://{urllib.parse.quote(creds['hy2_password'], safe='')}@{h}:{p}/?"
                f"{urllib.parse.urlencode(params, quote_via=urllib.parse.quote)}#HYSTERIA2")
        hy2.update({"enabled": True, "server": h, "port_public": int(p), "password": creds["hy2_password"],
                    "obfs": "salamander", "obfs_password": creds["hy2_obfs"], "sni": HY2_SNI,
                    "pin_sha256": pin, "link": link})
        sub_links.append(link)
    inbounds.append(hy2)

    # --- VLESS + REALITY over bore.pub (raw TCP) ---
    rl = {"key": "vless-reality", "group": "tcp", "name": "VLESS · REALITY + Vision", "proto": "vless", "net": "tcp",
          "tag": "vless-reality-in", "remark": "VLESS-REALITY", "cdn": False, "enabled": False}
    if reality_host and reality_port and creds.get("reality_public") and "vless-reality" not in disabled:
        link = (f"vless://{creds['client_uuid']}@{reality_host}:{reality_port}?encryption=none&flow=xtls-rprx-vision"
                f"&security=reality&sni={REALITY_DEST}&fp=chrome&pbk={creds['reality_public']}"
                f"&sid={creds['reality_short_id']}&type=tcp#VLESS-REALITY")
        rl.update({"enabled": True, "server": reality_host, "port_public": int(reality_port),
                   "uuid": creds["client_uuid"], "sni": REALITY_DEST, "flow": "xtls-rprx-vision",
                   "public_key": creds["reality_public"], "short_id": creds["reality_short_id"], "link": link})
        sub_links.append(link)
    inbounds.append(rl)

    # --- MTProto over bore.pub ---
    mt = {"key": "mtproto", "group": "telegram", "name": "Telegram · MTProto", "proto": "mtproto", "net": "tcp",
          "tag": None, "remark": "MTPROTO", "cdn": False, "enabled": False}
    if mtproto_host and mtproto_port:
        params = urllib.parse.urlencode({"server": mtproto_host, "port": mtproto_port,
                                         "secret": creds["mtproto_secret"]})
        mt.update({"enabled": True, "server": mtproto_host, "port_public": int(mtproto_port),
                   "secret": creds["mtproto_secret"], "fake_tls_domain": creds["mtproto_domain"],
                   "tg_link": f"tg://proxy?{params}", "link": f"https://t.me/proxy?{params}"})
        with open(os.path.join(output_dir, "mtproto.txt"), "w", encoding="utf-8") as f:
            f.write(mt["link"] + "\n" + mt["tg_link"] + "\n")
    elif os.path.exists(os.path.join(output_dir, "mtproto.txt")):
        os.remove(os.path.join(output_dir, "mtproto.txt"))
    inbounds.append(mt)

    sub_plain = "\n".join(sub_links) + "\n"
    sub_b64 = base64.b64encode(sub_plain.encode()).decode()
    for name, body in (("sub.txt", sub_plain), ("sub", sub_plain), ("sub64.txt", sub_b64), ("sub64", sub_b64)):
        with open(os.path.join(output_dir, name), "w", encoding="utf-8") as f:
            f.write(body)
    open(os.path.join(output_dir, ".nojekyll"), "w").close()

    meta = {"version": 2, "domain": domain, "repo": repo, "timestamp": int(time.time()), "inbounds": inbounds}
    for path in (os.path.join(output_dir, "stats.json"), os.path.join(server_dir, "configs.json")):
        os.makedirs(os.path.dirname(os.path.abspath(path)), exist_ok=True)
        with open(path, "w", encoding="utf-8") as f:
            json.dump(meta, f, indent=2)

    on = [i["key"] for i in inbounds if i.get("enabled")]
    print(f"✅ Client assets for {domain}: {len(on)} protocols live -> {', '.join(on)}")


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--action", choices=["server", "client", "all"], default="all")
    ap.add_argument("--domain", default="")
    ap.add_argument("--repo", default="")
    ap.add_argument("--output-dir", default="./dist")
    ap.add_argument("--server-dir", default="/tmp/xray_server")
    ap.add_argument("--creds-file", default="/tmp/xray_server/creds.json")
    ap.add_argument("--fake-tls-domain", default=os.environ.get("MTPROTO_FAKE_TLS_DOMAIN", "www.google.com"))
    ap.add_argument("--mtproto-host", default="")
    ap.add_argument("--mtproto-port", default="")
    ap.add_argument("--xray-bin", default=os.path.expanduser("~/xray/xray"))
    ap.add_argument("--reality-host", default="")
    ap.add_argument("--reality-port", default="")
    ap.add_argument("--hy2-endpoint", default="", help="public host:port of the UDP tunnel")
    ap.add_argument("--disabled", default="", help="comma separated inbound keys that failed the self-test")
    ap.add_argument("--hy2-pin", default="", help="SHA-256 fingerprint of the Hysteria2 certificate")
    ap.add_argument("--probe-list", action="store_true", help="print 'key path net' for every CDN inbound and exit")
    a = ap.parse_args()
    if a.probe_list:
        for _i in INBOUNDS:
            print(_i["key"], _i["path"], _i["net"])
        sys.exit(0)

    if a.action in ("server", "all"):
        setup_server(a.server_dir, a.creds_file, a.fake_tls_domain, a.xray_bin)
    if a.action in ("client", "all"):
        if not a.domain:
            sys.exit("--domain is required for client generation")
        generate_client(a.domain, a.repo, a.output_dir, a.server_dir, a.creds_file, a.fake_tls_domain,
                        a.mtproto_host, a.mtproto_port, a.hy2_endpoint, a.hy2_pin,
                        a.reality_host, a.reality_port, tuple(x for x in a.disabled.split(',') if x))
