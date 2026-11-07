(function () {
  "use strict";
  var CH = window.CH, $ = CH.$, T = CH.t, esc = CH.esc, I = CH.icon;
  var metaP = CH.task("ld.data", CH.loadMeta());

  /* Official Cloudflare IPv4 ranges (cloudflare.com/ips) */
  var RANGES = ["173.245.48.0/20", "103.21.244.0/22", "103.22.200.0/22", "103.31.4.0/22", "141.101.64.0/18", "108.162.192.0/18", "190.93.240.0/20", "188.114.96.0/20", "197.234.240.0/22", "198.41.128.0/17", "162.158.0.0/15", "104.16.0.0/13", "104.24.0.0/14", "172.64.0.0/13", "131.0.72.0/22"];
  var parsed = RANGES.map(function (c) { var p = c.split("/"), o = p[0].split(".").map(Number), base = ((o[0] << 24) >>> 0) + (o[1] << 16) + (o[2] << 8) + o[3], size = Math.pow(2, 32 - Number(p[1])); return { cidr: c, base: base, size: size }; });
  var chosen = {}; ["104.16.0.0/13", "172.64.0.0/13", "162.158.0.0/15", "188.114.96.0/20"].forEach(function (c) { chosen[c] = true; });

  function ipStr(n) { return [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255].join("."); }
  function fmtSize(n) { return n >= 1000000 ? (n / 1048576).toFixed(1) + "M" : n >= 1024 ? Math.round(n / 1024) + "K" : String(n); }

  /* ---------- gate + form ---------- */
  $("gateOk").addEventListener("click", function () {
    $("gate").classList.add("closing-gate"); $("gate").hidden = true; $("scanForm").hidden = false;
    $("scanForm").style.animation = "scaleIn .3s ease both";
  });
  function renderRanges() {
    $("rangeList").innerHTML = parsed.map(function (r) {
      return '<label class="chk"><input type="checkbox" data-c="' + r.cidr + '"' + (chosen[r.cidr] ? " checked" : "") + '><span class="ltr">' + r.cidr + "</span><small>" + fmtSize(r.size) + "</small></label>";
    }).join("");
  }
  $("rangeList").addEventListener("change", function (e) { var c = e.target.dataset.c; if (c) { if (e.target.checked) chosen[c] = true; else delete chosen[c]; } });
  $("selAll").addEventListener("click", function () { parsed.forEach(function (r) { chosen[r.cidr] = true; }); renderRanges(); });
  $("selNone").addEventListener("click", function () { chosen = {}; renderRanges(); });
  renderRanges();

  var count = 100;
  function setCount(v) { count = Math.max(1, Math.min(2000, Math.round(Number(v) || 1))); $("countOut").textContent = count; $("countNum").value = count; $("countRange").value = Math.min(1000, Math.max(10, count)); }
  $("countRange").addEventListener("input", function () { setCount(this.value); });
  $("countNum").addEventListener("input", function () { setCount(this.value); });
  setCount(100);

  function renderCfg() {
    var m = CH.meta, sel = $("cfgSel"), prev = sel.value, opts = "";
    if (m) m.inbounds.filter(function (i) { return i.enabled && i.cdn; }).forEach(function (i) { opts += '<option value="' + esc(i.key) + '">' + esc(i.name) + "</option>"; });
    opts += '<option value="__custom">' + T("scan.custom") + "</option>";
    sel.innerHTML = opts; if (prev && sel.querySelector('option[value="' + prev + '"]')) sel.value = prev;
    $("cfgCustom").hidden = sel.value !== "__custom";
  }
  $("cfgSel").addEventListener("change", function () { $("cfgCustom").hidden = this.value !== "__custom"; });
  metaP.then(renderCfg); renderCfg();
  document.addEventListener("ch:lang", renderCfg);
  document.addEventListener("ch:meta", renderCfg);

  /* ---------- sampling ---------- */
  function sample(n) {
    var rs = parsed.filter(function (r) { return chosen[r.cidr]; }), total = rs.reduce(function (a, r) { return a + r.size; }, 0), out = [], seen = {}, guard = 0;
    n = Math.min(n, Math.max(1, total - rs.length * 2));
    while (out.length < n && guard++ < n * 30) {
      var x = Math.floor(Math.random() * total), r = rs[0];
      for (var k = 0; k < rs.length; k++) { if (x < rs[k].size) { r = rs[k]; break; } x -= rs[k].size; }
      var ip = ipStr((r.base + x) >>> 0), last = (r.base + x) & 255;
      if (last === 0 || last === 255 || seen[ip]) continue;
      seen[ip] = 1; out.push(ip);
    }
    return out;
  }

  /* ---------- probing ---------- */
  var plain = location.protocol === "http:";
  function probe(ip, timeout) {
    var t0 = performance.now(), ctrl = new AbortController(), to = setTimeout(function () { ctrl.abort(); }, timeout);
    var url = (plain ? "http://" : "https://") + ip + "/cdn-cgi/trace?r=" + Math.random().toString(36).slice(2);
    return fetch(url, { mode: "no-cors", cache: "no-store", credentials: "omit", referrerPolicy: "no-referrer", signal: ctrl.signal }).then(function () {
      clearTimeout(to); return { ok: true, ms: performance.now() - t0 };
    }, function () {
      clearTimeout(to); var ms = performance.now() - t0;
      // https to a bare IP always ends in a certificate error: a fast, non-timeout failure still proves a TLS server answered.
      return { ok: !plain && !ctrl.signal.aborted && ms > 25, ms: ms };
    });
  }
  function calibrate() { // an unroutable address should time out; if it fails instantly the network resets everything
    return probe("203.0.113.7", 2500).then(function (r) { return r.ok; });
  }

  /* ---------- scan ---------- */
  var scan = null;
  function baseLink() {
    var k = $("cfgSel").value;
    if (k === "__custom") return $("cfgCustom").value.trim();
    var inb = CH.meta && CH.meta.inbounds.filter(function (i) { return i.key === k; })[0];
    return inb ? CH.buildLink(inb, CH.meta.domain) : "";
  }
  function label() { var k = $("cfgSel").value; var inb = CH.meta && CH.meta.inbounds.filter(function (i) { return i.key === k; })[0]; return inb ? inb.remark : "CF"; }

  $("applyBtn").addEventListener("click", function () {
    $("scanErr").textContent = "";
    if (!Object.keys(chosen).length) { $("scanErr").textContent = T("scan.needRange"); return; }
    var link = baseLink(), lbl = label();
    if ($("cfgSel").value === "__custom" && !/^[a-z0-9]+:\/\//i.test(link)) link = "";
    start(sample(count), link, lbl, Number($("maxMs").value));
  });

  function start(ips, link, lbl, maxMs) {
    if (scan) scan.stop = true;
    var s = scan = { stop: false, ips: ips, link: link, label: lbl, maxMs: maxMs, done: 0, found: [] };
    $("resList").innerHTML = ""; $("resEmpty").hidden = true; $("scanBar").style.width = "0";
    $("scanStat").textContent = "0 / " + ips.length; $("scanMode").textContent = plain ? T("scan.mode.http") : T("scan.mode.https");
    $("scanNote").hidden = !!link; $("scanNote").textContent = T("scan.onlyIps");
    setRunning(true); CH.open("scanModal");
    calibrate().then(function (bad) {
      if (bad) { $("scanNote").hidden = false; $("scanNote").textContent = T("scan.calib") + (link ? "" : " " + T("scan.onlyIps")); }
      run(s);
    });
  }
  function setRunning(r) {
    var b = $("scanStop");
    b.innerHTML = r ? I("i-stop") + "<span>" + T("scan.stop") + "</span>" : I("i-refresh") + "<span>" + T("scan.apply") + "</span>";
    b.dataset.mode = r ? "stop" : "again";
  }
  function run(s) {
    var idx = 0, active = 0, CONC = 12, TIMEOUT = Math.max(1500, s.maxMs * 2 > 4000 ? 4000 : s.maxMs * 2);
    function pump() {
      if (s !== scan) return;
      while (!s.stop && active < CONC && idx < s.ips.length) {
        (function (ip) {
          active++;
          probe(ip, TIMEOUT).then(function (r) { // second probe gives a warm, fairer latency
            if (!r.ok) return r;
            return probe(ip, TIMEOUT).then(function (r2) { return r2.ok ? { ok: true, ms: Math.min(r.ms, r2.ms) } : r; });
          }).then(function (r) {
            active--; s.done++;
            if (r.ok && r.ms <= s.maxMs) addResult(s, ip, Math.round(r.ms));
            progress(s); pump();
          });
        })(s.ips[idx++]);
      }
      if ((s.stop || idx >= s.ips.length) && active === 0) finish(s);
    }
    pump();
  }
  function progress(s) { $("scanBar").style.width = (100 * s.done / s.ips.length) + "%"; $("scanStat").textContent = s.done + " / " + s.ips.length + "  ·  " + T("scan.found") + " " + s.found.length; }
  function addResult(s, ip, ms) {
    var cfg = s.link ? CH.withHost(s.link, ip, s.label + "-" + ip) : ip;
    var rec = { ip: ip, ms: ms, cfg: cfg }; s.found.push(rec); s.found.sort(function (a, b) { return a.ms - b.ms; });
    renderResults(s);
  }
  function renderResults(s) {
    $("resEmpty").hidden = s.found.length > 0 || !s.finished;
    $("resList").innerHTML = s.found.map(function (r, n) {
      var col = r.ms < 250 ? "green" : r.ms < 600 ? "blue" : "amber";
      return '<div class="res"><span class="tag ' + col + ' ms ltr">' + r.ms + ' ms</span><div class="mid"><span class="ip ltr">' + r.ip + '</span><span class="cfg">' + esc(r.cfg) + '</span></div><div class="row" style="flex-wrap:nowrap"><button class="icon-btn sm" type="button" data-use="' + n + '" title="' + T("scan.useIp") + '" aria-label="' + T("scan.useIp") + '">' + I("i-check") + '</button><button class="btn sm" type="button" data-one="' + n + '">' + I("i-copy") + "<span>" + T("common.copy") + "</span></button></div></div>";
    }).join("");
  }
  function finish(s) {
    if (s !== scan || s.finished) return;
    s.finished = true; setRunning(false); $("resEmpty").hidden = s.found.length > 0;
    $("scanBar").style.width = s.stop ? $("scanBar").style.width : "100%";
  }
  $("resList").addEventListener("click", function (e) {
    var b = e.target.closest("[data-one],[data-use]"); if (!b || !scan) return;
    if (b.dataset.one != null) CH.copy(scan.found[b.dataset.one].cfg);
    else { CH.setCleanIp(scan.found[b.dataset.use].ip); CH.toast(T("scan.saved") + ": " + scan.found[b.dataset.use].ip); }
  });
  $("copyAllCfg").addEventListener("click", function () { if (scan && scan.found.length) CH.copy(scan.found.map(function (r) { return r.cfg; }).join("\n")); });
  $("copyIps").addEventListener("click", function () { if (scan && scan.found.length) CH.copy(scan.found.map(function (r) { return r.ip; }).join("\n")); });
  $("scanStop").addEventListener("click", function () {
    if (!scan) return;
    if (this.dataset.mode === "stop") { scan.stop = true; }
    else start(sample(count), baseLink(), label(), Number($("maxMs").value));
  });
  $("scanModal").addEventListener("ch:closed", function () { if (scan) scan.stop = true; });
  document.addEventListener("ch:lang", function () { if (scan) { setRunning(!scan.finished); renderResults(scan); } });
})();
