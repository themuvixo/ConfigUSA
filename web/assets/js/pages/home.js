(function () {
  "use strict";
  var CH = window.CH, $ = CH.$, T = CH.t;
  var metaP = CH.task("ld.data", CH.loadMeta());
  CH.task("ld.live", metaP.then(function (m) {
    if (!m) return;
    return Promise.race([CH.pollLive(), new Promise(function (r) { setTimeout(r, 2500); })]);
  }));

  function stateTag(key) {
    var m = CH.meta, inb = m && m.inbounds.filter(function (i) { return i.key === key; })[0];
    if (!inb) return '<span class="tag">-</span>';
    return inb.enabled ? '<span class="tag green">' + T("common.online") + "</span>" : '<span class="tag amber">' + T("dash.off") + "</span>";
  }
  function renderProtos() {
    var all = window.CATALOG.included.concat(window.CATALOG.extra);
    $("protoGrid").innerHTML = all.map(function (p) {
      return '<a class="card hv proto" href="' + CH.ROOT + 'protocols/"><div class="top"><div><div class="nm">' + CH.esc(p.name) + "</div></div>" + stateTag(p.key) + "</div>" +
        '<div class="tags">' + p.tags.map(function (x) { return '<span class="tag blue">' + CH.esc(x) + "</span>"; }).join("") + "</div></a>";
    }).join("");
  }
  function renderLive() {
    var m = CH.meta, on = !!CH.isLive;
    var dot = $("homeDot"); dot.className = "dot" + (m ? (on ? "" : " off") : " idle");
    $("homeState").textContent = !m ? T("home.pill.wait") : on ? T("home.pill.on") : T("home.pill.off");
    $("homeDomain").textContent = m ? m.domain : "";
    $("stProto").textContent = m ? m.inbounds.filter(function (i) { return i.enabled; }).length : "-";
    var ci = CH.cleanIp(); $("stClean").textContent = ci || "Auto";
    tick();
  }
  function tick() {
    var ok = CH.clock && CH.isLive;
    $("stLeft").textContent = ok ? CH.fmtSecs(CH.left()) : "--:--:--";
    $("stUp").textContent = ok ? CH.fmtSecs(CH.upNow()) : "--:--:--";
  }
  document.addEventListener("ch:live", renderLive);
  document.addEventListener("ch:meta", function () { renderProtos(); renderLive(); });
  document.addEventListener("ch:lang", function () { renderProtos(); renderLive(); });
  metaP.then(function () { renderProtos(); renderLive(); });
  setInterval(tick, 1000);
  setInterval(function () { if (CH.meta) CH.pollLive(); }, 8000);
})();
