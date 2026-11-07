(function () {
  "use strict";
  var CH = window.CH, $ = CH.$;
  var inp = $("cleanIn"); inp.value = CH.cleanIp();
  var timer;
  inp.addEventListener("input", function () { clearTimeout(timer); timer = setTimeout(function () { CH.setCleanIp(inp.value); CH.toast(CH.t("set.saved")); }, 450); });
  $("resetAll").addEventListener("click", function () {
    ["cleanIp", "theme", "lang"].forEach(function (k) { CH.store.del(k); });
    inp.value = ""; CH.setTheme("dark"); CH.setLang(/^fa/i.test(navigator.language || "") ? "fa" : "en"); CH.toast(CH.t("set.resetDone"));
  });
  CH.task("ld.data", Promise.resolve());
})();
