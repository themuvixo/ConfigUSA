#!/usr/bin/env python3
"""Generates the static pages in web/. Every page lives in its own folder (page/index.html)
so URLs are clean: /configs/ instead of /configs.html. Run: python3 tools/build_pages.py"""
import os, sys

WEB = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "web")

SPRITE = """<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs>
<symbol id="i-menu" viewBox="0 0 24 24"><path d="M4 7h16M4 12h16M4 17h16"/></symbol>
<symbol id="i-x" viewBox="0 0 24 24"><path d="M18 6 6 18M6 6l12 12"/></symbol>
<symbol id="i-sun" viewBox="0 0 24 24"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></symbol>
<symbol id="i-moon" viewBox="0 0 24 24"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></symbol>
<symbol id="i-copy" viewBox="0 0 24 24"><rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></symbol>
<symbol id="i-qr" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><path d="M14 14h3v3M21 14v.01M14 21h3M21 17v4"/></symbol>
<symbol id="i-info" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></symbol>
<symbol id="i-check" viewBox="0 0 24 24"><path d="M20 6 9 17l-5-5"/></symbol>
<symbol id="i-alert" viewBox="0 0 24 24"><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0zM12 9v4M12 17h.01"/></symbol>
<symbol id="i-radar" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/><path d="m12 12 7-7"/></symbol>
<symbol id="i-send" viewBox="0 0 24 24"><path d="M22 2 11 13M22 2l-7 20-4-9-9-4z"/></symbol>
<symbol id="i-play" viewBox="0 0 24 24"><path d="M6 4l14 8-14 8z"/></symbol>
<symbol id="i-stop" viewBox="0 0 24 24"><rect x="6" y="6" width="12" height="12" rx="1"/></symbol>
<symbol id="i-refresh" viewBox="0 0 24 24"><path d="M21 12a9 9 0 1 1-3-6.7L21 8M21 3v5h-5"/></symbol>
<symbol id="i-link" viewBox="0 0 24 24"><path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7"/></symbol>
<symbol id="i-sliders" viewBox="0 0 24 24"><path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6"/></symbol>
<symbol id="i-shield" viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></symbol>
<symbol id="i-bolt" viewBox="0 0 24 24"><path d="M13 2 3 14h9l-1 8 10-12h-9z"/></symbol>
<symbol id="i-layers" viewBox="0 0 24 24"><path d="m12 2 10 5-10 5L2 7zM2 17l10 5 10-5M2 12l10 5 10-5"/></symbol>
</defs></svg>"""

NAV = [("home", "", "Home"), ("configs", "configs/", "Configs"), ("sub", "subscription/", "Subscription"),
       ("scanner", "scanner/", "IP Scanner"), ("dashboard", "dashboard/", "Dashboard"), ("protocols", "protocols/", "Protocols")]

LOADER = """<div id="loader" role="status" aria-live="polite" aria-label="Loading">
  <div class="ring-wrap"><i class="ripple"></i><i class="ripple"></i><i class="ripple"></i>
    <svg class="prog" viewBox="0 0 144 144" aria-hidden="true"><circle class="trk" cx="72" cy="72" r="64"/><circle class="bar" id="ldBar" cx="72" cy="72" r="64"/></svg>
    <div class="core">CH</div></div>
  <div class="pct" id="ldPct">0%</div><div class="step" id="ldStep">Starting</div>
</div>"""


def shell(page, root, title, desc, body, scripts):
    nav = "".join(
        f'<a href="{root}{href}" data-nav="{key}" data-i18n="nav.{key}">{label}</a>' for key, href, label in NAV)
    sheet = "".join(
        f'<a href="{root}{href}" data-nav="{key}"><span data-i18n="nav.{key}">{label}</span></a>'
        for key, href, label in NAV + [("settings", "settings/", "Settings")])
    scr = "".join(f'<script src="{root}assets/js/{s}" defer></script>\n' for s in scripts)
    return f"""<!doctype html>
<html lang="en" data-root="{root}" data-theme="light">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>{title}</title>
<meta name="description" content="{desc}">
<meta name="theme-color" content="#ffffff">
<link rel="icon" href="{root}assets/img/favicon.svg" type="image/svg+xml">
<link rel="preload" href="{root}assets/fonts/Inter.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="{root}assets/fonts/SpaceGrotesk.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="{root}assets/css/app.css">
<script>(function(){{try{{var r=document.documentElement,t=localStorage.getItem("ch.theme")||"light",l=localStorage.getItem("ch.lang")||(/^fa/i.test(navigator.language||"")?"fa":"en");r.dataset.theme=t;r.lang=l;r.dir=l==="fa"?"rtl":"ltr"}}catch(e){{}}}})()</script>
<noscript><style>#loader{{display:none}}</style></noscript>
</head>
<body data-page="{page}">
{LOADER}
{SPRITE}
<header class="hdr"><div class="wrap">
  <a class="brand" href="{root}" aria-label="ConfigUSA"><span class="mark">CH</span><span>ConfigUSA</span></a>
  <nav class="nav" aria-label="Main">{nav}</nav>
  <div class="tools">
    <button class="icon-btn lang-btn" id="langBtn" type="button" aria-label="Language">FA</button>
    <button class="icon-btn" id="themeBtn" type="button" data-i18n-aria="theme.toggle" aria-label="Toggle theme"><svg class="i"><use id="themeIcon" href="#i-sun"/></svg></button>
    <a class="icon-btn" href="{root}settings/" data-nav="settings" data-i18n-aria="nav.settings" aria-label="Settings"><svg class="i"><use href="#i-sliders"/></svg></a>
    <button class="icon-btn" id="menuBtn" type="button" data-i18n-aria="nav.menu" aria-label="Menu"><svg class="i"><use href="#i-menu"/></svg></button>
  </div>
</div></header>

<div class="sheet" id="menu" role="dialog" aria-modal="true" aria-label="Menu"><div class="panel">
  <button class="icon-btn close" type="button" data-close data-i18n-aria="nav.close" aria-label="Close"><svg class="i"><use href="#i-x"/></svg></button>
  {sheet}
</div></div>

<main id="main">
{body}
</main>

<footer class="ftr"><div class="wrap">
  <span data-i18n="ftr.line">Runs on GitHub Actions. Sessions renew about every 5h45m.</span>
  <nav>{"".join(f'<a href="{root}{href}" data-i18n="nav.{key}">{label}</a>' for key, href, label in NAV[1:])}</nav>
</div></footer>

<div id="toast" role="status" aria-live="polite"><span><svg class="i"><use href="#i-check"/></svg><b></b></span></div>

<div class="modal" id="qrModal"><div class="dialog" role="dialog" aria-modal="true" style="width:min(420px,100%)">
  <header><h3 id="qrTitle">QR</h3><button class="icon-btn sm" type="button" data-close aria-label="Close"><svg class="i"><use href="#i-x"/></svg></button></header>
  <div class="body"><div class="qr-box" id="qrBox"></div></div>
  <footer><span class="hint" data-i18n="qr.title">QR code</span><button class="btn primary" id="qrCopy" type="button"><svg class="i"><use href="#i-copy"/></svg><span data-i18n="common.copy">Copy</span></button></footer>
</div></div>
{scr}</body>
</html>
"""


def head(title_key, title, lead_key, lead, extra=""):
    return f"""<div class="wrap"><div class="page-head">
  <span class="eyebrow">{extra}</span>
  <h1 data-i18n="{title_key}">{title}</h1>
  <p class="lead" data-i18n="{lead_key}">{lead}</p>
</div></div>"""


PAGES = {}

PAGES["home"] = dict(root="./", out="index.html", title="ConfigUSA · Proxy hub on GitHub Actions",
    desc="Free rotating proxy hub: VLESS, VMess, Trojan, Shadowsocks, XHTTP, Hysteria2 on GitHub Actions behind Cloudflare.",
    scripts=["qr.js", "core.js", "catalog.js", "pages/home.js"], body="""
<section class="hero"><div class="wrap"><div class="stack">
  <span class="pill"><i class="dot idle" id="homeDot"></i><span id="homeState" data-i18n="home.pill.wait">Checking server</span><span class="mono muted ltr" id="homeDomain"></span></span>
  <h1><span data-i18n="home.h1a">Your own proxy hub.</span> <em data-i18n="home.h1b">Free, rotating, always on.</em></h1>
  <p class="lead" data-i18n="home.lead">Nine protocols on one subscription: VLESS, VMess, Trojan, Shadowsocks, XHTTP, Hysteria2 and more, served from a GitHub runner behind Cloudflare.</p>
  <div class="row">
    <a class="btn primary lg" href="configs/"><svg class="i"><use href="#i-link"/></svg><span data-i18n="home.cta1">Get configs</span></a>
    <a class="btn lg" href="scanner/"><svg class="i"><use href="#i-radar"/></svg><span data-i18n="home.cta2">Scan clean IPs</span></a>
    <a class="btn lg" href="dashboard/"><svg class="i"><use href="#i-bolt"/></svg><span data-i18n="home.cta3">Dashboard</span></a>
  </div>
</div>
<div class="stats-strip">
  <div><b id="stProto">-</b><span data-i18n="home.s1">Protocols live</span></div>
  <div><b id="stLeft" class="ltr">--:--:--</b><span data-i18n="home.s2">Session left</span></div>
  <div><b id="stUp" class="ltr">--:--:--</b><span data-i18n="home.s3">Uptime</span></div>
  <div><b id="stClean" class="ltr" style="font-size:20px">-</b><span data-i18n="home.s4">Clean IP</span></div>
</div></div></section>

<section class="sec"><div class="wrap">
  <div class="sec-head"><div><h2 data-i18n="home.protoTitle">What you get</h2><p class="muted" data-i18n="home.protoSub">Every protocol below is generated on each session and added to the subscription.</p></div>
  <a class="btn sm" href="protocols/"><span data-i18n="nav.protocols">Protocols</span></a></div>
  <div class="grid g3" id="protoGrid"></div>
</div></section>

<section class="sec"><div class="wrap">
  <div class="sec-head"><h2 data-i18n="home.howTitle">How it works</h2></div>
  <div class="steps">
    <div class="card"><h3 data-i18n="home.how1t">Push to GitHub</h3><p data-i18n="home.how1d">The workflow starts Xray, Nginx, Hysteria2 and a Cloudflare tunnel on a fresh runner.</p></div>
    <div class="card"><h3 data-i18n="home.how2t">Subscribe once</h3><p data-i18n="home.how2d">Add the subscription link to your client. It never changes, even when the tunnel domain does.</p></div>
    <div class="card"><h3 data-i18n="home.how3t">Scan, then connect</h3><p data-i18n="home.how3d">Find a clean Cloudflare IP for your ISP and paste it in. Every config updates instantly.</p></div>
  </div>
</div></section>
""")

PAGES["dashboard"] = dict(root="../", out="dashboard/index.html", title="Dashboard · ConfigUSA",
    desc="Live runner status: CPU, memory, traffic and per-protocol usage.",
    scripts=["qr.js", "core.js", "pages/dashboard.js"], body=head("dash.title", "Dashboard", "dash.lead", "Live state of the runner behind your tunnel.", "live") + """
<div class="wrap" style="display:grid;gap:16px;padding-bottom:20px">
  <div class="err-box" id="offlineAlert" hidden><svg class="i"><use href="#i-alert"/></svg><span data-i18n="dash.offlineMsg">Live server is not reachable right now.</span></div>

  <div class="dash-top">
    <div class="card accent">
      <h3 data-i18n="dash.renew">Renews in</h3>
      <div class="big-ring">
        <div class="ring-txt"><svg viewBox="0 0 150 150"><circle class="trk" cx="75" cy="75" r="66" stroke-width="9"/><circle class="bar" id="ringBar" cx="75" cy="75" r="66" stroke-width="9" stroke-dasharray="414.69" stroke-dashoffset="414.69"/></svg><div class="ring-center ltr" id="valLeft">--:--:--</div></div>
        <div class="kv" style="width:100%">
          <div><span data-i18n="dash.domain">Tunnel domain</span><span id="valDomain">-</span></div>
          <div><span data-i18n="dash.uptime">Uptime</span><span class="ltr" id="valUp">--:--:--</span></div>
          <div><span data-i18n="dash.progress">Progress</span><span id="valProg">-</span></div>
          <div><span data-i18n="dash.xray">Xray</span><span id="valXray">-</span></div>
        </div>
      </div>
    </div>
    <div class="card">
      <div class="row" style="justify-content:space-between"><h3 data-i18n="dash.traffic">Live traffic</h3><span class="mono muted ltr" id="chartMax"></span></div>
      <svg id="chart" viewBox="0 0 600 150" preserveAspectRatio="none" aria-hidden="true"></svg>
      <div class="legend"><span><i style="background:var(--blue)"></i><span data-i18n="dash.up">Upload</span> <b class="ltr" id="valUpSpeed">0 B/s</b></span><span><i style="background:var(--text)"></i><span data-i18n="dash.down">Download</span> <b class="ltr" id="valDownSpeed">0 B/s</b></span></div>
      <div class="kv">
        <div><span><span data-i18n="dash.up">Upload</span> · <span data-i18n="dash.thisSession">this session</span></span><span id="valTx">-</span></div>
        <div><span><span data-i18n="dash.down">Download</span> · <span data-i18n="dash.thisSession">this session</span></span><span id="valRx">-</span></div>
        <div><span data-i18n="dash.total">Total</span><span id="valTotal">-</span></div>
      </div>
    </div>
  </div>

  <div class="grid g4" id="gauges"></div>

  <div class="grid g2">
    <div class="card"><h3 data-i18n="dash.services">Services</h3><div id="svcList"></div></div>
    <div class="card"><h3 data-i18n="dash.session">Session</h3>
      <div class="kv">
        <div><span data-i18n="dash.load">Load</span><span class="ltr" id="valLoad">-</span></div>
        <div><span data-i18n="dash.tcp">TCP connections</span><span id="valTcp">-</span></div>
        <div><span data-i18n="dash.repo">Repository</span><a class="mono blue" id="valRepo" href="#" target="_blank" rel="noopener">-</a></div>
        <div><span data-i18n="dash.published">Published</span><span id="valPub">-</span></div>
      </div>
    </div>
  </div>

  <div class="sec-head" style="margin:20px 0 0"><h2 style="font-size:28px" data-i18n="dash.inbounds">Inbounds</h2><span class="tag blue" id="inCount"></span></div>
  <div class="tbl-wrap"><table class="tbl"><thead><tr>
    <th data-i18n="th.name">Name</th><th data-i18n="th.port">Port</th><th data-i18n="th.proto">Protocol</th><th data-i18n="th.traffic">Traffic</th><th data-i18n="th.actions">Actions</th>
  </tr></thead><tbody id="ibBody"></tbody></table></div>
</div>
""")

PAGES["configs"] = dict(root="../", out="configs/index.html", title="Configs · ConfigUSA",
    desc="Copy or scan every protocol config.",
    scripts=["qr.js", "core.js", "catalog.js", "pages/configs.js"], body=head("cfg.title", "Configs", "cfg.lead", "Tap copy, scan the QR, or grab the whole subscription.", "xray · hysteria2 · mtproto") + """
<div class="wrap" style="display:grid;gap:18px;padding-bottom:20px">
  <div class="row" style="justify-content:space-between">
    <div class="seg" id="filters" role="tablist">
      <button type="button" data-f="all" class="on" data-i18n="cfg.all">All</button>
      <button type="button" data-f="cdn" data-i18n="cfg.cdn">Cloudflare</button>
      <button type="button" data-f="xhttp" data-i18n="cfg.xhttp">XHTTP</button>
      <button type="button" data-f="udp" data-i18n="cfg.udp">UDP</button>
      <button type="button" data-f="tcp" data-i18n="cfg.tcp">TCP</button>
      <button type="button" data-f="telegram" data-i18n="cfg.telegram">Telegram</button>
    </div>
    <div class="row"><button class="btn primary" id="copyB64" type="button"><svg class="i"><use href="#i-copy"/></svg><span data-i18n="cfg.copyAll">Copy all (Base64)</span></button>
    <button class="btn" id="copyPlain" type="button"><svg class="i"><use href="#i-copy"/></svg><span data-i18n="cfg.copyAllPlain">Copy all links</span></button></div>
  </div>
  <div class="card flat" style="grid-auto-flow:column;grid-template-columns:1fr auto;align-items:center;padding:14px 18px"><span id="cleanNote" class="muted"></span><a class="btn sm" href="../scanner/" data-i18n="cfg.cleanBtn">Find one</a></div>
  <div class="grid g3" id="cfgGrid"></div>
</div>
<div class="modal" id="infoModal"><div class="dialog" role="dialog" aria-modal="true">
  <header><h3 id="infoTitle">Details</h3><button class="icon-btn sm" type="button" data-close aria-label="Close"><svg class="i"><use href="#i-x"/></svg></button></header>
  <div class="body" id="infoBody"></div>
  <footer><span class="tags" id="infoTags"></span><div class="row"><button class="btn" id="infoQr" type="button"><svg class="i"><use href="#i-qr"/></svg>QR</button><button class="btn primary" id="infoCopy" type="button"><svg class="i"><use href="#i-copy"/></svg><span data-i18n="common.copy">Copy</span></button></div></footer>
</div></div>
""")

PAGES["subscription"] = dict(root="../", out="subscription/index.html", title="Subscription · ConfigUSA",
    desc="One subscription link for all protocols.",
    scripts=["qr.js", "core.js", "pages/subscription.js"], body=head("sub.title", "Subscription", "sub.lead", "One link for every protocol. It stays the same after each renewal.", "sub.txt") + """
<div class="wrap" style="display:grid;gap:16px;padding-bottom:20px">
  <div class="grid g2">
    <div class="card accent">
      <h3 data-i18n="sub.link">Subscription link</h3>
      <div class="url-box" id="subUrl">-</div>
      <div class="row"><button class="btn primary" id="subCopy" type="button"><svg class="i"><use href="#i-copy"/></svg><span data-i18n="sub.copy">Copy link</span></button>
      <button class="btn" id="subCopyB64" type="button"><svg class="i"><use href="#i-copy"/></svg><span data-i18n="sub.copyB64">Copy Base64 link</span></button></div>
      <p data-i18n="sub.how">Add it as a subscription in your client and enable auto-update. The tunnel domain rotates, the link does not.</p>
    </div>
    <div class="card" style="justify-items:center"><div class="qr-box" id="subQr"></div></div>
  </div>
  <div class="card"><h3 data-i18n="sub.apps">Works with</h3>
    <div class="tags"><span class="tag blue">v2rayN</span><span class="tag blue">v2rayNG</span><span class="tag blue">Hiddify</span><span class="tag blue">NekoBox</span><span class="tag blue">Streisand</span><span class="tag blue">Shadowrocket</span><span class="tag blue">sing-box</span><span class="tag blue">Clash Meta</span></div>
  </div>
</div>
""")

PAGES["scanner"] = dict(root="../", out="scanner/index.html", title="Cloudflare IP Scanner · ConfigUSA",
    desc="Find Cloudflare IPs that work on your network and copy ready configs.",
    scripts=["qr.js", "core.js", "pages/scanner.js"], body=head("scan.title", "Cloudflare IP scanner", "scan.lead", "Find Cloudflare IPs that actually answer on your network, then turn them into ready configs.", "clean ip") + """
<div class="wrap" style="padding-bottom:20px">
  <div class="warn-box" id="gate">
    <h3><svg class="i"><use href="#i-alert"/></svg><span data-i18n="scan.warnTitle">Turn your VPN off first</span></h3>
    <p data-i18n="scan.warnBody">The scan measures your real connection to Cloudflare. With a VPN, proxy or this very config running, every result is wrong. Disconnect completely, then continue.</p>
    <div class="row"><button class="btn primary lg" id="gateOk" type="button"><svg class="i"><use href="#i-check"/></svg><span data-i18n="scan.confirm">My VPN is off, continue</span></button></div>
  </div>

  <div class="scan-grid" id="scanForm" hidden>
    <div class="card">
      <div class="row" style="justify-content:space-between"><h3 data-i18n="scan.ranges">IP ranges</h3>
        <div class="row"><button class="btn sm" id="selAll" type="button" data-i18n="scan.selAll">Select all</button><button class="btn sm" id="selNone" type="button" data-i18n="scan.selNone">Clear</button></div></div>
      <p class="hint" data-i18n="scan.rangesHint">Pick one or more.</p>
      <div class="ranges" id="rangeList"></div>
    </div>
    <div class="card">
      <div class="field"><label for="countRange" data-i18n="scan.count">How many IPs to scan</label>
        <div class="count-out ltr" id="countOut">100</div>
        <input class="range" id="countRange" type="range" min="10" max="1000" step="10" value="100">
        <input class="input mono" id="countNum" type="number" min="1" max="2000" value="100" inputmode="numeric">
        <span class="hint" data-i18n="scan.countHint">More IPs means a better pick and a longer wait.</span></div>
      <div class="field"><label for="cfgSel" data-i18n="scan.cfg">Config to rewrite</label>
        <select class="select" id="cfgSel"></select>
        <textarea class="input" id="cfgCustom" rows="3" data-i18n-ph="scan.customPh" placeholder="Paste a link" hidden></textarea>
        <span class="hint" data-i18n="scan.cfgHint">Each clean IP replaces the address in this config.</span></div>
      <div class="field"><label for="maxMs" data-i18n="scan.maxMs">Max latency</label>
        <select class="select" id="maxMs"><option value="500">500 ms</option><option value="800" selected>800 ms</option><option value="1200">1200 ms</option><option value="2500">2500 ms</option></select></div>
      <button class="btn primary lg" id="applyBtn" type="button"><svg class="i"><use href="#i-play"/></svg><span data-i18n="scan.apply">Apply</span></button>
      <span class="hint" id="scanErr" style="color:var(--bad)"></span>
      <p class="hint" data-i18n="scan.reDisclaim">Browsers cannot read TLS details, so this is a reachability and speed estimate. Always test the final IP in your client.</p>
    </div>
  </div>
</div>

<div class="modal" id="scanModal"><div class="dialog" role="dialog" aria-modal="true">
  <header><h3 data-i18n="scan.modal">Clean IPs</h3><button class="icon-btn sm" type="button" data-close aria-label="Close"><svg class="i"><use href="#i-x"/></svg></button></header>
  <div class="body">
    <div class="progress"><i id="scanBar"></i></div>
    <div class="row" style="justify-content:space-between"><span class="mono muted ltr" id="scanStat">0 / 0</span><span class="tag blue" id="scanMode"></span></div>
    <div class="hint" id="scanNote" hidden></div>
    <div class="res-list" id="resList"></div>
    <div class="empty" id="resEmpty" hidden><svg class="i" style="width:34px;height:34px"><use href="#i-radar"/></svg><span data-i18n="scan.noneFound">No clean IP found yet.</span></div>
  </div>
  <footer>
    <button class="btn" id="scanStop" type="button"><svg class="i"><use href="#i-stop"/></svg><span data-i18n="scan.stop">Stop</span></button>
    <div class="row"><button class="btn" id="copyIps" type="button"><span data-i18n="scan.copyIps">Copy IPs</span></button>
    <button class="btn primary" id="copyAllCfg" type="button"><svg class="i"><use href="#i-copy"/></svg><span data-i18n="scan.copyAll">Copy All</span></button></div>
  </footer>
</div></div>
""")

PAGES["protocols"] = dict(root="../", out="protocols/index.html", title="Protocols · ConfigUSA",
    desc="Every protocol that works on GitHub Actions and what cannot.",
    scripts=["qr.js", "core.js", "catalog.js", "pages/protocols.js"], body=head("pr.title", "Protocols", "pr.lead", "What can truly run on a GitHub Actions runner.", "research") + """
<div class="wrap" style="display:grid;gap:26px;padding-bottom:20px">
  <div class="card accent"><h3><svg class="i"><use href="#i-alert"/></svg><span data-i18n="pr.limits">Honest limits</span></h3><p data-i18n="pr.limits.body">GitHub Actions is not a hosting service.</p></div>
  <div class="grid g2" id="prList"></div>
  <div><div class="sec-head"><h2 style="font-size:28px" data-i18n="pr.noTitle">Does not work here</h2></div><div class="grid g2" id="noList"></div></div>
</div>
""")

PAGES["settings"] = dict(root="../", out="settings/index.html", title="Settings · ConfigUSA",
    desc="Theme, language and clean IP.", scripts=["qr.js", "core.js", "pages/settings.js"],
    body=head("set.title", "Settings", "set.lead", "Saved in this browser only.", "local") + """
<div class="wrap" style="display:grid;gap:16px;padding-bottom:20px">
  <div class="grid g2">
    <div class="card"><h3 data-i18n="set.appearance">Appearance</h3>
      <div class="field"><span class="label" data-i18n="set.theme">Theme</span>
        <div class="seg"><button type="button" data-theme-set="dark" data-i18n="set.dark">Dark</button><button type="button" data-theme-set="light" data-i18n="set.light">Light</button></div></div>
      <div class="field"><span class="label" data-i18n="set.lang">Language</span>
        <div class="seg"><button type="button" data-lang="en">English</button><button type="button" data-lang="fa">فارسی</button></div></div>
    </div>
    <div class="card"><h3 data-i18n="set.cleanTitle">Clean IP / CDN host</h3>
      <div class="field"><label for="cleanIn" data-i18n="set.cleanLabel">Clean IP or host</label>
        <input class="input mono" id="cleanIn" type="text" placeholder="104.16.x.x" autocomplete="off" spellcheck="false" dir="ltr">
        <span class="hint" data-i18n="set.cleanHint">Every Cloudflare link and QR on the site is rewritten with this address.</span></div>
      <div class="row"><a class="btn" href="../scanner/"><svg class="i"><use href="#i-radar"/></svg><span data-i18n="set.cleanScan">Scan for one</span></a>
      <button class="btn" id="resetAll" type="button" data-i18n="set.reset">Reset everything</button></div>
    </div>
  </div>
</div>
""")

NOTFOUND = """<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Not found · ConfigUSA</title><style>
@font-face{font-family:"Space Grotesk";src:url("assets/fonts/SpaceGrotesk.woff2") format("woff2");font-weight:300 700}@font-face{font-family:Inter;src:url("assets/fonts/Inter.woff2") format("woff2");font-weight:100 900}
body{margin:0;min-height:100vh;display:grid;place-items:center;background:#fff;color:#1d1d1f;font-family:Inter,system-ui,Segoe UI,Tahoma,sans-serif;text-align:center}
@keyframes scaleIn{from{opacity:0;transform:scale(.92)}to{opacity:1;transform:scale(1)}}
div{animation:scaleIn .4s ease both;padding:24px}b{display:block;font:700 clamp(80px,22vw,180px)/1 'Space Grotesk',Inter,sans-serif;color:#1d1d1f;letter-spacing:-.05em}
p{color:#6e6e73;margin:8px 0 24px}a{display:inline-block;background:#0071e3;color:#fff;text-decoration:none;padding:12px 24px;border-radius:980px;font-weight:400}
</style></head><body><div><b>404</b><p>This page does not exist.</p><a id="h" href="/">Back home</a></div>
<script>(function(){var h=location.hostname.split(".");if(h[1]==="github"&&location.pathname.split("/")[1])document.getElementById("h").href="/"+location.pathname.split("/")[1]+"/"})()</script></body></html>
"""

FAVICON = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="16" fill="#2b6bff"/><text x="32" y="42" text-anchor="middle" font-family="ui-monospace,Menlo,monospace" font-weight="800" font-size="28" fill="#fff">CH</text></svg>
"""

for key, p in PAGES.items():
    path = os.path.join(WEB, p["out"])
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        f.write(shell(key, p["root"], p["title"], p["desc"], p["body"], p["scripts"]))
with open(os.path.join(WEB, "404.html"), "w", encoding="utf-8") as f:
    f.write(NOTFOUND)
os.makedirs(os.path.join(WEB, "assets/img"), exist_ok=True)
with open(os.path.join(WEB, "assets/img/favicon.svg"), "w", encoding="utf-8") as f:
    f.write(FAVICON)
print("built", ", ".join(PAGES))
