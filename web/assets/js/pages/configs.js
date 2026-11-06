(function () {
  "use strict";
  var CH = window.CH, $ = CH.$, T = CH.t, esc = CH.esc, I = CH.icon, filter = "all", current = null;
  var metaP = CH.task("ld.data", CH.loadMeta());

  function match(i) {
    if (filter === "all") return true;
    if (filter === "cdn") return !!i.cdn;
    if (filter === "xhttp") return i.net === "xhttp";
    return i.group === filter;
  }
  function render() {
    var m = CH.meta, ci = CH.cleanIp();
    $("cleanNote").innerHTML = ci ? T("cfg.cleanOn") + ' <b class="mono ltr">' + esc(ci) + "</b>" : T("cfg.cleanOff");
    if (!m) { $("cfgGrid").innerHTML = '<div class="empty" style="grid-column:1/-1">' + T("cfg.empty") + "</div>"; return; }
    var list = m.inbounds.filter(match);
    $("cfgGrid").innerHTML = list.map(function (i) {
      var link = i.enabled ? CH.buildLink(i) : "";
      var cat = window.CATALOG.included.concat(window.CATALOG.extra).filter(function (c) { return c.key === i.key; })[0];
      var tags = (cat ? cat.tags : [i.proto, i.net]).map(function (x) { return '<span class="tag blue">' + esc(x) + "</span>"; }).join("");
      var state = i.enabled ? '<span class="tag green">' + T("common.online") + "</span>" : '<span class="tag amber">' + T("dash.off") + "</span>";
      var body = i.enabled
        ? '<div class="link-box">' + esc(link) + '</div><span class="hint">' + (i.cdn ? T("cfg.cfNote") : T("cfg.noCf")) + '</span><div class="row"><button class="btn primary sm" type="button" data-act="copy" data-key="' + esc(i.key) + '">' + I("i-copy") + "<span>" + T("common.copy") + '</span></button><button class="btn sm" type="button" data-act="qr" data-key="' + esc(i.key) + '">' + I("i-qr") + '<span>QR</span></button><button class="btn sm" type="button" data-act="info" data-key="' + esc(i.key) + '">' + I("i-info") + "<span>" + T("common.details") + "</span></button>" + (i.tg_link ? '<a class="btn sm" href="' + esc(i.tg_link) + '">' + I("i-send") + "<span>" + T("cfg.openTg") + "</span></a>" : "") + "</div>"
        : '<span class="muted">' + T("cfg.disabled") + "</span>";
      return '<div class="card proto' + (i.enabled ? "" : " off") + '"><div class="top"><div><div class="nm">' + esc(i.name) + '</div><div class="sub ltr">' + esc(i.remark) + "</div></div>" + state + '</div><div class="tags">' + tags + "</div>" + body + "</div>";
    }).join("");
  }
  function byKey(k) { return CH.meta.inbounds.filter(function (i) { return i.key === k; })[0]; }
  $("cfgGrid").addEventListener("click", function (e) {
    var b = e.target.closest("[data-act]"); if (!b) return;
    var i = byKey(b.dataset.key), link = CH.buildLink(i);
    if (b.dataset.act === "copy") CH.copy(link);
    else if (b.dataset.act === "qr") CH.showQR(link, i.name);
    else info(i);
  });
  function rows(i) {
    var d = CH.meta.domain, h = CH.cleanIp() || d, r = [["Protocol", i.proto + " / " + i.net], ["Remark", i.remark]];
    if (i.cdn) {
      r.push(["Address", h], ["Port", "443"]);
      if (i.uuid) r.push(["UUID", i.uuid]); if (i.password) r.push(["Password", i.password]); if (i.method) r.push(["Method", i.method]);
      r.push(["Network", i.net], ["Path", i.path], ["Host / SNI", d], ["Security", "tls"], ["ALPN", i.net === "xhttp" ? "h2" : "http/1.1"], ["Fingerprint", "chrome"]);
      if (i.net === "xhttp") r.push(["XHTTP mode", "packet-up"]);
      if (i.proto === "shadowsocks") r.push(["Plugin", "v2ray-plugin;tls"]);
    } else if (i.proto === "hysteria2") {
      r.push(["Server", i.server], ["Port", i.port_public], ["Auth", i.password], ["Obfs", "salamander"], ["Obfs password", i.obfs_password], ["SNI", i.sni], ["Insecure", "1 (pinned)"], ["pinSHA256", i.pin_sha256 || "-"]);
    } else if (i.proto === "mtproto") {
      r.push(["Server", i.server], ["Port", i.port_public], ["Secret", i.secret], ["Fake-TLS", i.fake_tls_domain]);
    } else {
      r.push(["Server", i.server], ["Port", i.port_public], ["UUID", i.uuid], ["Flow", i.flow], ["Security", "reality"], ["SNI", i.sni], ["Public key", i.public_key], ["Short ID", i.short_id], ["Fingerprint", "chrome"]);
    }
    return r;
  }
  function info(i) {
    current = i; var link = CH.buildLink(i);
    $("infoTitle").textContent = i.name;
    $("infoTags").innerHTML = '<span class="tag blue">' + esc(i.proto) + '</span><span class="tag">' + esc(i.net) + "</span>";
    $("infoBody").innerHTML = '<div class="kv ltr">' + rows(i).map(function (x) { return "<div><span>" + esc(x[0]) + "</span><span>" + esc(x[1]) + "</span></div>"; }).join("") + '</div><div class="url-box">' + esc(link) + "</div>";
    $("infoCopy").onclick = function () { CH.copy(link); };
    $("infoQr").onclick = function () { CH.close("infoModal"); setTimeout(function () { CH.showQR(link, i.name); }, 230); };
    CH.open("infoModal");
  }
  $("filters").addEventListener("click", function (e) {
    var b = e.target.closest("[data-f]"); if (!b) return;
    filter = b.dataset.f; document.querySelectorAll("#filters button").forEach(function (x) { x.classList.toggle("on", x === b); }); render();
  });
  $("copyPlain").addEventListener("click", function () { var l = CH.meta && CH.subLinks(); if (l && l.length) CH.copy(l.join("\n")); });
  $("copyB64").addEventListener("click", function () { var l = CH.meta && CH.subLinks(); if (l && l.length) CH.copy(CH.b64(l.join("\n") + "\n")); });
  document.addEventListener("ch:lang", render);
  document.addEventListener("ch:meta", render);
  metaP.then(render); render();
})();
