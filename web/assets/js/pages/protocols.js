(function () {
  "use strict";
  var CH = window.CH, $ = CH.$, T = CH.t, esc = CH.esc;
  var metaP = CH.task("ld.data", CH.loadMeta());
  var cls = { included: "green", optional: "amber", experimental: "blue" };
  function render() {
    var C = window.CATALOG, all = C.included.concat(C.extra), m = CH.meta;
    $("prList").innerHTML = all.map(function (p) {
      var inb = m && m.inbounds.filter(function (i) { return i.key === p.key; })[0];
      var live = inb ? (inb.enabled ? '<span class="tag green">' + T("common.online") + "</span>" : '<span class="tag">' + T("dash.off") + "</span>") : "";
      return '<div class="card"><div class="top proto" style="display:flex;justify-content:space-between;gap:10px;align-items:start"><h3>' + esc(p.name) + '</h3><div class="tags"><span class="tag ' + cls[p.status] + '">' + T("pr." + p.status) + "</span>" + live + "</div></div>" +
        '<div class="tags">' + p.tags.map(function (x) { return '<span class="tag blue">' + esc(x) + "</span>"; }).join("") + "</div>" +
        '<div><div class="label">' + T("pr.why") + "</div><p>" + esc(CH.bi(p.via)) + '</p></div><div><div class="label">' + T("pr.clients") + '</div><p class="ltr" style="text-align:start">' + esc(p.clients) + "</p></div></div>";
    }).join("");
    $("noList").innerHTML = C.no.map(function (p) {
      return '<div class="card flat"><h3><span class="tag red">' + T("pr.no") + "</span>" + esc(p.name) + "</h3><p>" + esc(CH.bi(p.why)) + "</p></div>";
    }).join("");
  }
  document.addEventListener("ch:lang", render);
  metaP.then(render); render();
})();
