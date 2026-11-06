# ConfigUSA Hub: Xray + Hysteria2 on GitHub Actions

A free, rotating proxy hub. GitHub Actions starts Xray, Nginx, Hysteria2 and a Cloudflare quick tunnel, publishes a subscription plus a multi-page site to GitHub Pages, and renews itself every ~5h45m.

## Protocols

| Protocol | Path | Status |
|---|---|---|
| VLESS WebSocket / HTTPUpgrade / **XHTTP** (packet-up) | Cloudflare tunnel → Nginx → Xray | included |
| **VMess** WebSocket / HTTPUpgrade | Cloudflare tunnel | included |
| Trojan WebSocket, Shadowsocks (v2ray-plugin) | Cloudflare tunnel | included |
| **Hysteria2** (QUIC, salamander, pinned cert) | UDP via playit.gg | optional, see below |
| VLESS **REALITY** + Vision | raw TCP via bore.pub | experimental |
| Telegram MTProto (fake-TLS) | raw TCP via bore.pub | included |

Not possible on a runner: TUIC/WireGuard/mKCP (UDP, no free stable relay), gRPC (quick tunnel talks HTTP/1.1 to the origin; XHTTP replaces it), REALITY through Cloudflare. See the Protocols page for the reasoning.

## Setup

1. Extract the zip into the repo root, commit, push to `main`.
2. Settings → Pages → Source: **GitHub Actions**.
3. Secret `PAT_TOKEN` (fine-grained, this repo only, Actions + Contents read/write).
4. Hysteria2 (optional, free, ~3 minutes):
   1. Sign in at playit.gg, create an **Agent** (self-managed) and copy its secret key.
   2. In the playit dashboard add a tunnel: type **UDP (custom)**, local address `127.0.0.1`, local port **8444**.
   3. Repo → Settings → Secrets → add `PLAYIT_SECRET` = the agent secret. That is all: the workflow now asks playit for the public `host:port` by itself. (If auto-detect ever fails, set the repo Variable `HY2_ENDPOINT` to that `host:port`.)

## The site

Static, page by page, clean URLs (`/configs/`, `/scanner/`, ... no `.html`; each page is a folder with `index.html`). Black / white / blue theme, light + dark, English + Persian (RTL), responsive. Motion uses only fade, scale and color animations. A real loader tracks actual asset and data loading. To preview locally use a server, e.g. `cd web && python3 -m http.server` (opening files directly will not resolve folder URLs).

Pages: Home, Configs (copy / QR / details), Subscription, **IP Scanner**, Dashboard, Protocols, Settings.

### Cloudflare clean IP scanner
Warns that the VPN must be off, lets you pick ranges and how many IPs to scan, and on **Apply** opens a modal where results stream in. Copy configs one by one or **Copy All**; each clean IP is injected into the config you chose (or your own pasted link). Browsers cannot read TLS details, so results are a reachability/latency estimate (HTTP probe is exact when the site is served over http). Always test the final IP in your client.

`tools/build_pages.py` regenerates the HTML pages if you edit the templates.

## Honest limits
GitHub Actions is not hosting: no public IP, ~6h sessions, quick-tunnel domains rotate. Workflow changes here were written to the documented behavior of Xray, Hysteria2, playit and bore but could not be run in the build sandbox (no internet), so check the first Actions run's log.

## v4 UI (Aurora)
Floating glass header, bento cards, gradient accents. English: Space Grotesk + Inter + JetBrains Mono. Persian: Vazirmatn for all text.

## v3 changes
- **Fonts bundled** in `web/assets/fonts/` (self-hosted, SIL OFL, no CDN): Space Grotesk (headings), Inter (text), JetBrains Mono (code), Vazirmatn (Persian).
- New visual layer (gradient accents, grid hero, rounded pill controls, glass header).
- **Self-test before publishing**: every inbound is probed through the public tunnel (WebSocket/HTTPUpgrade must answer 101, XHTTP must answer, REALITY must answer through bore.pub). Failing ones are left out of the subscription and shown as Off, so clients no longer import dead entries (the red -1 rows). The Actions log shows a ✅/❌ line per protocol.
- Nginx upgrade handling hardened (explicit `Connection: upgrade`, no buffering, long timeouts).
- Note: XHTTP needs Xray/v2rayN core 1.8.24+ on the client; sing-box based clients cannot use it.
