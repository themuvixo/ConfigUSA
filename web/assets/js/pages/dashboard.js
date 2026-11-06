(function () {
  "use strict";
  var CH = window.CH, $ = CH.$, T = CH.t, esc = CH.esc, I = CH.icon;
  var hist = { up: [], down: [] }, N = 60;
  var metaP = CH.task("ld.data", CH.loadMeta());
  CH.task("ld.live", metaP.then(function (m) {
    if (!m) return;
    return Promise.race([CH.pollLive(), new Promise(function (r) { setTimeout(r, 3000); })]);
  }));

  function ring(pct, live) {
    var r = 26, C = 2 * Math.PI * r, p = Math.max(0, Math.min(100, pct || 0));
    var col = p >= 90 ? "var(--bad)" : p >= 75 ? "var(--warn)" : "var(--blue)";
    return '<svg viewBox="0 0 64 64"><circle class="trk" cx="32" cy="32" r="' + r + '" stroke-width="6"/><circle class="bar" cx="32" cy="32" r="' + r + '" stroke-width="6" style="stroke:' + col + '" stroke-dasharray="' + C.toFixed(2) + '" stroke-dashoffset="' + (C * (1 - p / 100)).toFixed(2) + '"/></svg><b>' + (live ? Math.round(p) + "%" : "-") + "</b>";
  }
  function renderGauges() {
    var s = CH.isLive && CH.live && CH.live.system;
    var pct = function (o) { return o && o.total ? 100 * o.used / o.total : 0; };
    var us = function (o) { return s && o && o.total ? CH.fmtBytes(o.used) + " / " + CH.fmtBytes(o.total) : "-"; };
    var items = [[T("dash.cpu"), s ? s.cpu_percent : 0, s ? s.cpu_cores + " " + T("common.cores") : "-"], [T("dash.ram"), s ? pct(s.mem) : 0, us(s && s.mem)], [T("dash.swap"), s ? pct(s.swap) : 0, us(s && s.swap)], [T("dash.disk"), s ? pct(s.disk) : 0, us(s && s.disk)]];
    $("gauges").innerHTML = items.map(function (x) { return '<div class="card"><div class="gauge"><div class="g">' + ring(x[1], !!s) + '</div><div><div class="l">' + x[0] + '</div><div class="s ltr">' + x[2] + "</div></div></div></div>"; }).join("");
  }
  function svc(name, ok) {
    var tag = ok === null ? '<span class="tag">-</span>' : ok ? '<span class="tag green">' + T("common.running") + "</span>" : '<span class="tag red">' + T("common.stopped") + "</span>";
    return '<div class="svc"><span>' + name + "</span>" + tag + "</div>";
  }
  function renderLive() {
    var m = CH.meta, s = CH.isLive && CH.live && CH.live.system, L = CH.live;
    $("offlineAlert").hidden = !m || CH.isLive;
    $("valDomain").textContent = m ? m.domain : "-";
    $("valXray").textContent = s && s.xray.running ? "v" + (s.xray.version || "?") : "-";
    $("valLoad").textContent = s ? s.load.join(" · ") : "-";
    $("valTcp").textContent = s ? s.tcp_connections : "-";
    if (m) { $("valRepo").textContent = m.repo || "-"; if (m.repo) $("valRepo").href = "https://github.com/" + m.repo; $("valPub").textContent = m.timestamp ? new Date(m.timestamp * 1000).toLocaleString(CH.lang() === "fa" ? "fa-IR" : "en-GB", { hour12: false, dateStyle: "short", timeStyle: "short" }) : "-"; }
    var sv = s && s.services || {};
    $("svcList").innerHTML = [["Xray", s ? s.xray.running : null], ["Nginx", s ? sv.nginx : null], ["cloudflared", s ? sv.cloudflared : null], ["Hysteria2", s ? sv.hysteria : null], ["playit", s ? sv.playit : null], ["mtg (MTProto)", s ? sv.mtg : null]].map(function (x) { return svc(x[0], x[1]); }).join("");
    if (CH.isLive && L && L.system) {
      var sp = L.system.net_speed || { up: 0, down: 0 };
      hist.up.push(sp.up || 0); hist.down.push(sp.down || 0);
      if (hist.up.length > N) { hist.up.shift(); hist.down.shift(); }
    }
    var sp2 = s ? s.net_speed : { up: 0, down: 0 };
    $("valUpSpeed").textContent = CH.fmtBytes(sp2.up) + "/s"; $("valDownSpeed").textContent = CH.fmtBytes(sp2.down) + "/s";
    var tr = (CH.isLive && L && L.traffic) || {};
    $("valTx").textContent = CH.fmtBytes(tr.tx_bytes); $("valRx").textContent = CH.fmtBytes(tr.rx_bytes); $("valTotal").textContent = CH.fmtBytes(tr.total_bytes);
    renderGauges(); renderChart(); renderInbounds(); tick();
  }
  function renderChart() {
    var W = 600, H = 150, pad = 6, max = Math.max(4096, Math.max.apply(null, hist.up.concat(hist.down, [0]))) * 1.15;
    var x = function (i) { return W * i / (N - 1); }, y = function (v) { return H - pad - (H - pad * 2) * v / max; };
    var off = N - hist.up.length;
    var line = function (a) { return a.map(function (v, i) { return x(off + i).toFixed(1) + "," + y(v).toFixed(1); }).join(" "); };
    var area = function (a) { return a.length > 1 ? "M" + x(off).toFixed(1) + "," + H + " L" + line(a).split(" ").join(" L") + " L" + x(N - 1) + "," + H + " Z" : ""; };
    var grid = [0.25, 0.5, 0.75].map(function (f) { return '<line class="gl" x1="0" x2="' + W + '" y1="' + H * f + '" y2="' + H * f + '" vector-effect="non-scaling-stroke"/>'; }).join("");
    $("chartMax").textContent = hist.up.length > 1 ? CH.fmtBytes(max) + "/s" : "";
    $("chart").innerHTML = '<defs><linearGradient id="gU" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style="stop-color:var(--blue);stop-opacity:.4"/><stop offset="1" style="stop-color:var(--blue);stop-opacity:0"/></linearGradient><linearGradient id="gD" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style="stop-color:var(--text);stop-opacity:.18"/><stop offset="1" style="stop-color:var(--text);stop-opacity:0"/></linearGradient></defs>' + grid +
      (hist.up.length > 1 ? '<path d="' + area(hist.down) + '" fill="url(#gD)"/><path d="' + area(hist.up) + '" fill="url(#gU)"/><polyline points="' + line(hist.down) + '" fill="none" style="stroke:var(--text)" stroke-width="2" stroke-linejoin="round" vector-effect="non-scaling-stroke"/><polyline points="' + line(hist.up) + '" fill="none" style="stroke:var(--blue)" stroke-width="2" stroke-linejoin="round" vector-effect="non-scaling-stroke"/>' : "");
  }
  function tick() {
    var ok = CH.clock && CH.isLive, total = (CH.clock && CH.clock.total) || 20700;
    var left = CH.left(), up = ok ? CH.upNow() : 0;
    $("valLeft").textContent = ok ? CH.fmtSecs(left) : "--:--:--";
    $("valUp").textContent = ok ? CH.fmtSecs(up) : "--:--:--";
    $("valProg").textContent = ok ? Math.min(100, 100 * up / total).toFixed(1) + "%" : "-";
    $("ringBar").style.strokeDashoffset = 414.69 * (1 - (ok ? Math.max(0, left) / total : 0));
  }
  function renderInbounds() {
    var m = CH.meta; if (!m) { $("ibBody").innerHTML = '<tr><td colspan="5" class="muted" style="text-align:center;padding:30px">' + T("home.noData") + "</td></tr>"; $("inCount").textContent = ""; return; }
    var tr = (CH.isLive && CH.live && CH.live.inbound_traffic) || {};
    $("inCount").textContent = m.inbounds.filter(function (i) { return i.enabled; }).length + " / " + m.inbounds.length;
    $("ibBody").innerHTML = m.inbounds.map(function (i) {
      var t = i.tag && tr[i.tag];
      var traffic = !i.enabled ? '<span class="muted">' + T("dash.disabled") + "</span>" : !i.tag ? '<span class="tag">' + T("dash.outside") + "</span>" : '<span class="mono ltr"><span class="up">↑ ' + CH.fmtBytes(t ? t.up : 0) + '</span> &nbsp; <span class="down">↓ ' + CH.fmtBytes(t ? t.down : 0) + "</span></span>";
      var acts = i.enabled ? '<div class="row"><button class="icon-btn sm" type="button" data-copy="' + esc(i.key) + '" aria-label="Copy">' + I("i-copy") + '</button><button class="icon-btn sm" type="button" data-qr="' + esc(i.key) + '" aria-label="QR">' + I("i-qr") + "</button></div>" : '<span class="muted">-</span>';
      return '<tr><td class="nm"><b>' + esc(i.name) + "</b><small>" + esc(i.tag || i.key) + '</small></td><td><span class="tag">' + (i.port_public || "-") + '</span></td><td><div class="tags"><span class="tag blue">' + esc(i.proto) + '</span><span class="tag">' + esc(i.net) + "</span></div></td><td>" + traffic + "</td><td>" + acts + "</td></tr>";
    }).join("");
  }
  $("ibBody").addEventListener("click", function (e) {
    var c = e.target.closest("[data-copy],[data-qr]"); if (!c || !CH.meta) return;
    var key = c.dataset.copy || c.dataset.qr, inb = CH.meta.inbounds.filter(function (i) { return i.key === key; })[0];
    var link = CH.buildLink(inb);
    if (c.dataset.copy) CH.copy(link); else CH.showQR(link, inb.name);
  });
  document.addEventListener("ch:live", renderLive);
  document.addEventListener("ch:meta", renderLive);
  document.addEventListener("ch:lang", renderLive);
  metaP.then(renderLive);
  renderLive();
  setInterval(tick, 1000);
  setInterval(function () { if (CH.meta) CH.pollLive(); }, 3000);
})();
