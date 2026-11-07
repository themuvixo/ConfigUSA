(function () {
  "use strict";
  var CH = window.CH, $ = CH.$;
  var metaP = CH.task("ld.data", CH.loadMeta());
  function render() {
    var url = CH.subUrl("sub.txt");
    $("subUrl").textContent = url;
    try { $("subQr").innerHTML = window.QR.svg(url, { ecc: "M" }); } catch (e) {}
    $("subCopy").onclick = function () { CH.copy(url); };
    $("subCopyB64").onclick = function () { var l = CH.meta && CH.subLinks(); if (l && l.length) CH.copy(CH.b64(l.join("\n") + "\n")); else CH.copy(CH.subUrl("sub64.txt")); };
  }
  metaP.then(render); render();
})();
