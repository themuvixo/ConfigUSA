/* ConfigUSA hub: shared runtime (loader, i18n, theme, modals, data, link builders).
   Motion: eased fades, rises, scales, colour changes and rolling digits (see app.css). */
(function () {
  "use strict";
  var doc = document, root = doc.documentElement;
  var ROOT = root.dataset.root || "./";
  var PAGE = doc.body.dataset.page || "";
  var $ = function (id) { return doc.getElementById(id); };
  var CH = window.CH = { ROOT: ROOT, PAGE: PAGE, $: $, meta: null, live: null, isLive: false, clock: null };

  /* ---------------------------------------------------------- storage */
  var store = CH.store = {
    get: function (k, d) { try { var v = localStorage.getItem("ch." + k); return v === null ? d : v; } catch (e) { return d; } },
    set: function (k, v) { try { localStorage.setItem("ch." + k, v); } catch (e) {} },
    del: function (k) { try { localStorage.removeItem("ch." + k); } catch (e) {} }
  };

  /* ---------------------------------------------------------- i18n */
  var I18N = {
    en: {
      "nav.home": "Home", "nav.dashboard": "Dashboard", "nav.configs": "Configs", "nav.sub": "Subscription",
      "nav.scanner": "IP Scanner", "nav.protocols": "Protocols", "nav.settings": "Settings", "nav.menu": "Menu", "nav.close": "Close",
      "theme.toggle": "Toggle theme", "ftr.line": "Runs on GitHub Actions. Sessions renew about every 5h45m.",
      "ld.start": "Starting", "ld.assets": "Loading interface", "ld.fonts": "Preparing type", "ld.data": "Fetching configs", "ld.live": "Checking the live server", "ld.done": "Ready",
      "common.copy": "Copy", "common.copied": "Copied", "common.qr": "QR", "common.details": "Details", "common.close": "Close", "common.reset": "Reset",
      "common.online": "Online", "common.offline": "Offline", "common.running": "Running", "common.stopped": "Stopped", "common.yes": "Yes", "common.no": "No",
      "common.refresh": "Refresh", "common.cores": "cores", "common.none": "None",
      "home.eyebrow": "GitHub Actions · Cloudflare · Xray",
      "home.h1a": "Your own proxy hub.", "home.h1b": "Free, rotating, always on.",
      "home.lead": "Ten protocols on one subscription: VLESS, VMess, Trojan, Shadowsocks, XHTTP, Hysteria2 and more, served from a GitHub runner behind Cloudflare.",
      "home.cta1": "Get configs", "home.cta2": "Scan clean IPs", "home.cta3": "Dashboard",
      "home.pill.on": "Server online", "home.pill.off": "Server offline", "home.pill.wait": "Checking server",
      "home.s1": "Protocols live", "home.s2": "Session left", "home.s3": "Uptime", "home.s4": "Clean IP",
      "home.protoTitle": "What you get", "home.protoSub": "Every protocol below is generated on each session and added to the subscription.",
      "home.howTitle": "How it works",
      "home.how1t": "Push to GitHub", "home.how1d": "The workflow starts Xray, Nginx, Hysteria2 and a Cloudflare tunnel on a fresh runner.",
      "home.how2t": "Subscribe once", "home.how2d": "Add the subscription link to your client. It never changes, even when the tunnel domain does.",
      "home.how3t": "Scan, then connect", "home.how3d": "Find a clean Cloudflare IP for your ISP and paste it in. Every config updates instantly.",
      "home.noData": "No configs published yet. Run the workflow once and this page fills itself.",
      "dash.title": "Dashboard", "dash.lead": "Live state of the runner behind your tunnel.",
      "dash.renew": "Renews in", "dash.session": "Session", "dash.uptime": "Uptime", "dash.progress": "Progress", "dash.domain": "Tunnel domain", "dash.xray": "Xray",
      "dash.load": "Load", "dash.tcp": "TCP connections", "dash.cpu": "CPU", "dash.ram": "RAM", "dash.swap": "Swap", "dash.disk": "Disk",
      "dash.traffic": "Live traffic", "dash.up": "Upload", "dash.down": "Download", "dash.total": "Total", "dash.thisSession": "this session",
      "dash.services": "Services", "dash.inbounds": "Inbounds", "dash.offlineMsg": "Live server is not reachable right now. It may be restarting; this page retries every few seconds.",
      "dash.published": "Published", "dash.repo": "Repository",
      "th.name": "Name", "th.proto": "Protocol", "th.port": "Port", "th.traffic": "Traffic", "th.state": "State", "th.actions": "Actions",
      "dash.outside": "Outside Xray", "dash.disabled": "Disabled this session", "dash.on": "On", "dash.off": "Off",
      "cfg.title": "Configs", "cfg.lead": "Tap copy, scan the QR, or grab the whole subscription.",
      "cfg.all": "All", "cfg.cdn": "Cloudflare", "cfg.xhttp": "XHTTP", "cfg.udp": "UDP", "cfg.tcp": "TCP", "cfg.telegram": "Telegram",
      "cfg.copyAll": "Copy all (Base64)", "cfg.copyAllPlain": "Copy all links", "cfg.cleanOn": "Clean IP active:", "cfg.cleanOff": "Using tunnel domain. Set a clean IP to speed things up.",
      "cfg.cleanBtn": "Find one", "cfg.disabled": "Disabled this session", "cfg.openTg": "Open in Telegram", "cfg.field": "Field", "cfg.value": "Value",
      "cfg.empty": "No configs published yet. Run the workflow once.", "cfg.cfNote": "Goes through Cloudflare; clean IP applies.", "cfg.noCf": "Direct tunnel; clean IP does not apply.",
      "sub.title": "Subscription", "sub.lead": "One link for every protocol. It stays the same after each renewal.",
      "sub.link": "Subscription link", "sub.copy": "Copy link", "sub.copyB64": "Copy configs as Base64", "sub.qr": "Show QR", "sub.apps": "Works with",
      "sub.how": "Add it as a subscription in your client and enable auto-update. The tunnel domain rotates, the link does not.",
      "sub.local": "Opened from a local file. The link below is relative to wherever this site is hosted.",
      "scan.title": "Cloudflare IP scanner", "scan.lead": "Find Cloudflare IPs that actually answer on your network, then turn them into ready configs.",
      "scan.warnTitle": "Turn your VPN off first", "scan.warnBody": "The scan measures your real connection to Cloudflare. With a VPN, proxy or this very config running, every result is wrong. Disconnect completely, then continue.",
      "scan.confirm": "My VPN is off, continue", "scan.ranges": "IP ranges", "scan.rangesHint": "Pick one or more. IPs are sampled randomly across everything you select.",
      "scan.selAll": "Select all", "scan.selNone": "Clear", "scan.count": "How many IPs to scan", "scan.countHint": "More IPs means a better pick and a longer wait.",
      "scan.cfg": "Config to rewrite", "scan.cfgHint": "Each clean IP replaces the address in this config.", "scan.custom": "My own link…", "scan.customPh": "Paste a vless:// vmess:// trojan:// or ss:// link",
      "scan.maxMs": "Max latency", "scan.apply": "Apply", "scan.needRange": "Select at least one range.", "scan.reDisclaim": "Browsers cannot read TLS details, so this is a reachability and speed estimate. Always test the final IP in your client.",
      "scan.modal": "Clean IPs", "scan.scanned": "Scanned", "scan.found": "Found", "scan.stop": "Stop", "scan.running": "Scanning…", "scan.finished": "Scan finished",
      "scan.stopped": "Scan stopped", "scan.copyAll": "Copy All", "scan.copyIps": "Copy IPs", "scan.useIp": "Use as my clean IP", "scan.noneFound": "No clean IP found yet. Try more IPs, other ranges, or check that the VPN is off.",
      "scan.mode.http": "Mode: HTTP probe (accurate)", "scan.mode.https": "Mode: TLS reachability (estimate)", "scan.calib": "Your network resets unreachable IPs instantly, so results may include false positives.",
      "scan.saved": "Saved as your clean IP", "scan.onlyIps": "No config selected: copying plain IPs.", "scan.ranges.n": "ranges", "scan.ips": "IPs",
      "set.title": "Settings", "set.lead": "Saved in this browser only.", "set.appearance": "Appearance", "set.theme": "Theme", "set.dark": "Dark", "set.light": "Light", "set.lang": "Language",
      "set.cleanTitle": "Clean IP / CDN host", "set.cleanLabel": "Clean IP or host", "set.cleanHint": "Every Cloudflare link and QR on the site is rewritten with this address.", "set.cleanScan": "Scan for one",
      "set.reset": "Reset everything", "set.resetDone": "Reset done", "set.saved": "Saved",
      "pr.title": "Protocols", "pr.lead": "What can truly run on a GitHub Actions runner, what needs an extra tunnel, and what cannot.",
      "pr.included": "Included", "pr.optional": "Optional", "pr.experimental": "Experimental", "pr.no": "Not possible",
      "pr.why": "How it travels", "pr.clients": "Clients", "pr.limits": "Honest limits",
      "pr.limits.body": "GitHub Actions is not a hosting service. Runners have no public IP, sessions end after about six hours, and anything not HTTP needs a third-party tunnel. Treat this as a free, rotating backup, not a permanent server.",
      "pr.noTitle": "Does not work here", "m.fmt": "Copy",
      "qr.title": "QR code"
    },
    fa: {
      "nav.home": "خانه", "nav.dashboard": "داشبورد", "nav.configs": "کانفیگ‌ها", "nav.sub": "سابسکریپشن",
      "nav.scanner": "اسکنر IP", "nav.protocols": "پروتکل‌ها", "nav.settings": "تنظیمات", "nav.menu": "منو", "nav.close": "بستن",
      "theme.toggle": "تغییر تم", "ftr.line": "روی GitHub Actions اجرا می‌شود. هر حدود ۵ ساعت و ۴۵ دقیقه تمدید می‌شود.",
      "ld.start": "در حال شروع", "ld.assets": "بارگذاری رابط", "ld.fonts": "آماده‌سازی فونت", "ld.data": "دریافت کانفیگ‌ها", "ld.live": "بررسی سرور زنده", "ld.done": "آماده",
      "common.copy": "کپی", "common.copied": "کپی شد", "common.qr": "QR", "common.details": "جزئیات", "common.close": "بستن", "common.reset": "بازنشانی",
      "common.online": "آنلاین", "common.offline": "آفلاین", "common.running": "فعال", "common.stopped": "متوقف", "common.yes": "بله", "common.no": "خیر",
      "common.refresh": "تازه‌سازی", "common.cores": "هسته", "common.none": "هیچ",
      "home.eyebrow": "GitHub Actions · Cloudflare · Xray",
      "home.h1a": "هاب پروکسی شخصی شما.", "home.h1b": "رایگان، چرخشی، همیشه روشن.",
      "home.lead": "ده پروتکل در یک سابسکریپشن: VLESS، VMess، Trojan، Shadowsocks، XHTTP، Hysteria2 و بیشتر، از یک رانر گیت‌هاب پشت Cloudflare.",
      "home.cta1": "دریافت کانفیگ", "home.cta2": "اسکن IP تمیز", "home.cta3": "داشبورد",
      "home.pill.on": "سرور آنلاین", "home.pill.off": "سرور آفلاین", "home.pill.wait": "بررسی سرور",
      "home.s1": "پروتکل فعال", "home.s2": "زمان باقی‌مانده", "home.s3": "آپتایم", "home.s4": "IP تمیز",
      "home.protoTitle": "چه چیزی می‌گیرید", "home.protoSub": "همه پروتکل‌های زیر در هر سشن ساخته و به سابسکریپشن اضافه می‌شوند.",
      "home.howTitle": "چطور کار می‌کند",
      "home.how1t": "پوش به گیت‌هاب", "home.how1d": "ورک‌فلو روی یک رانر تازه Xray، Nginx، Hysteria2 و تانل Cloudflare را راه می‌اندازد.",
      "home.how2t": "یک‌بار سابسکرایب", "home.how2d": "لینک سابسکریپشن را به کلاینت اضافه کنید. حتی اگر دامنه عوض شود، لینک ثابت می‌ماند.",
      "home.how3t": "اسکن و اتصال", "home.how3d": "یک IP تمیز کلودفلر برای اینترنت خودتان پیدا کنید و وارد کنید. همه کانفیگ‌ها فوری به‌روز می‌شوند.",
      "home.noData": "هنوز کانفیگی منتشر نشده. یک‌بار ورک‌فلو را اجرا کنید.",
      "dash.title": "داشبورد", "dash.lead": "وضعیت زنده رانر پشت تانل شما.",
      "dash.renew": "تمدید تا", "dash.session": "سشن", "dash.uptime": "آپتایم", "dash.progress": "پیشرفت", "dash.domain": "دامنه تانل", "dash.xray": "Xray",
      "dash.load": "بار", "dash.tcp": "اتصال TCP", "dash.cpu": "پردازنده", "dash.ram": "رم", "dash.swap": "سواپ", "dash.disk": "دیسک",
      "dash.traffic": "ترافیک زنده", "dash.up": "آپلود", "dash.down": "دانلود", "dash.total": "مجموع", "dash.thisSession": "در این سشن",
      "dash.services": "سرویس‌ها", "dash.inbounds": "اینباندها", "dash.offlineMsg": "سرور زنده فعلاً در دسترس نیست. شاید در حال ری‌استارت است؛ این صفحه هر چند ثانیه دوباره تلاش می‌کند.",
      "dash.published": "زمان انتشار", "dash.repo": "مخزن",
      "th.name": "نام", "th.proto": "پروتکل", "th.port": "پورت", "th.traffic": "ترافیک", "th.state": "وضعیت", "th.actions": "عملیات",
      "dash.outside": "خارج از Xray", "dash.disabled": "در این سشن غیرفعال", "dash.on": "روشن", "dash.off": "خاموش",
      "cfg.title": "کانفیگ‌ها", "cfg.lead": "کپی کنید، QR را اسکن کنید، یا کل سابسکریپشن را بردارید.",
      "cfg.all": "همه", "cfg.cdn": "کلودفلر", "cfg.xhttp": "XHTTP", "cfg.udp": "UDP", "cfg.tcp": "TCP", "cfg.telegram": "تلگرام",
      "cfg.copyAll": "کپی همه (Base64)", "cfg.copyAllPlain": "کپی همه لینک‌ها", "cfg.cleanOn": "IP تمیز فعال:", "cfg.cleanOff": "از دامنه تانل استفاده می‌شود. برای سرعت بیشتر IP تمیز تنظیم کنید.",
      "cfg.cleanBtn": "پیدا کردن", "cfg.disabled": "در این سشن غیرفعال", "cfg.openTg": "باز کردن در تلگرام", "cfg.field": "فیلد", "cfg.value": "مقدار",
      "cfg.empty": "هنوز کانفیگی منتشر نشده. یک‌بار ورک‌فلو را اجرا کنید.", "cfg.cfNote": "از Cloudflare عبور می‌کند؛ IP تمیز اعمال می‌شود.", "cfg.noCf": "تانل مستقیم؛ IP تمیز اعمال نمی‌شود.",
      "sub.title": "سابسکریپشن", "sub.lead": "یک لینک برای همه پروتکل‌ها. بعد از هر تمدید ثابت می‌ماند.",
      "sub.link": "لینک سابسکریپشن", "sub.copy": "کپی لینک", "sub.copyB64": "کپی کانفیگ‌ها (Base64)", "sub.qr": "نمایش QR", "sub.apps": "سازگار با",
      "sub.how": "آن را به‌عنوان سابسکریپشن در کلاینت اضافه و به‌روزرسانی خودکار را روشن کنید. دامنه تانل عوض می‌شود، لینک نه.",
      "sub.local": "از فایل محلی باز شده. لینک زیر نسبت به محل میزبانی سایت است.",
      "scan.title": "اسکنر IP کلودفلر", "scan.lead": "IPهای کلودفلری را پیدا کنید که روی شبکه شما واقعاً جواب می‌دهند و آن‌ها را به کانفیگ آماده تبدیل کنید.",
      "scan.warnTitle": "اول VPN را خاموش کنید", "scan.warnBody": "اسکن اتصال واقعی شما به کلودفلر را می‌سنجد. با VPN، پروکسی یا همین کانفیگ روشن، همه نتایج غلط می‌شود. کاملاً قطع کنید و ادامه دهید.",
      "scan.confirm": "VPN خاموش است، ادامه", "scan.ranges": "رنج‌های IP", "scan.rangesHint": "یک یا چند مورد انتخاب کنید. IPها به‌صورت تصادفی از بین انتخاب‌ها نمونه‌گیری می‌شوند.",
      "scan.selAll": "انتخاب همه", "scan.selNone": "پاک کردن", "scan.count": "تعداد IP برای اسکن", "scan.countHint": "IP بیشتر یعنی انتخاب بهتر و انتظار بیشتر.",
      "scan.cfg": "کانفیگ برای جایگزینی", "scan.cfgHint": "هر IP تمیز جای آدرس این کانفیگ می‌نشیند.", "scan.custom": "لینک خودم…", "scan.customPh": "لینک vless:// vmess:// trojan:// یا ss:// را بچسبانید",
      "scan.maxMs": "حداکثر تأخیر", "scan.apply": "اعمال", "scan.needRange": "حداقل یک رنج انتخاب کنید.", "scan.reDisclaim": "مرورگر جزئیات TLS را نمی‌بیند، پس این نتیجه تخمین دسترسی و سرعت است. IP نهایی را حتماً در کلاینت تست کنید.",
      "scan.modal": "IPهای تمیز", "scan.scanned": "اسکن شده", "scan.found": "پیدا شده", "scan.stop": "توقف", "scan.running": "در حال اسکن…", "scan.finished": "اسکن تمام شد",
      "scan.stopped": "اسکن متوقف شد", "scan.copyAll": "کپی همه", "scan.copyIps": "کپی IPها", "scan.useIp": "استفاده به‌عنوان IP تمیز", "scan.noneFound": "هنوز IP تمیزی پیدا نشده. IP بیشتر، رنج دیگر، یا خاموش بودن VPN را بررسی کنید.",
      "scan.mode.http": "حالت: پروب HTTP (دقیق)", "scan.mode.https": "حالت: دسترسی TLS (تخمینی)", "scan.calib": "شبکه شما IPهای غیرقابل‌دسترس را فوراً قطع می‌کند، پس ممکن است نتایج کاذب باشد.",
      "scan.saved": "به‌عنوان IP تمیز ذخیره شد", "scan.onlyIps": "کانفیگی انتخاب نشده: فقط IP کپی می‌شود.", "scan.ranges.n": "رنج", "scan.ips": "IP",
      "set.title": "تنظیمات", "set.lead": "فقط در همین مرورگر ذخیره می‌شود.", "set.appearance": "ظاهر", "set.theme": "تم", "set.dark": "تیره", "set.light": "روشن", "set.lang": "زبان",
      "set.cleanTitle": "IP تمیز / هاست CDN", "set.cleanLabel": "IP تمیز یا هاست", "set.cleanHint": "همه لینک‌ها و QRهای کلودفلر در سایت با این آدرس بازنویسی می‌شوند.", "set.cleanScan": "اسکن برای پیدا کردن",
      "set.reset": "بازنشانی همه چیز", "set.resetDone": "بازنشانی شد", "set.saved": "ذخیره شد",
      "pr.title": "پروتکل‌ها", "pr.lead": "چه چیزی واقعاً روی رانر GitHub Actions اجرا می‌شود، چه چیزی تانل اضافه می‌خواهد و چه چیزی ممکن نیست.",
      "pr.included": "شامل", "pr.optional": "اختیاری", "pr.experimental": "آزمایشی", "pr.no": "ناممکن",
      "pr.why": "مسیر عبور", "pr.clients": "کلاینت‌ها", "pr.limits": "محدودیت‌های واقعی",
      "pr.limits.body": "GitHub Actions سرویس هاستینگ نیست. رانرها IP عمومی ندارند، سشن‌ها حدود شش ساعت بعد تمام می‌شوند و هرچه HTTP نباشد تانل شخص ثالث می‌خواهد. این را یک بک‌آپ رایگان و چرخشی ببینید، نه سرور دائمی.",
      "pr.noTitle": "اینجا کار نمی‌کند", "m.fmt": "کپی",
      "qr.title": "کد QR"
    }
  };
  var lang = store.get("lang", /^fa/i.test(navigator.language || "") ? "fa" : "en");
  if (!I18N[lang]) lang = "en";
  var t = CH.t = function (k) { return (I18N[lang] && I18N[lang][k]) || I18N.en[k] || k; };
  CH.lang = function () { return lang; };
  CH.addI18n = function (l, o) { Object.keys(o).forEach(function (k) { I18N[l][k] = o[k]; }); };
  CH.bi = function (o) { return (o && (o[lang] || o.en)) || ""; }; // {en, fa} helper

  function applyLang(l, silent) {
    lang = I18N[l] ? l : "en"; store.set("lang", lang);
    root.lang = lang; root.dir = lang === "fa" ? "rtl" : "ltr";
    doc.querySelectorAll("[data-i18n]").forEach(function (el) { el.textContent = t(el.dataset.i18n); });
    doc.querySelectorAll("[data-i18n-ph]").forEach(function (el) { el.placeholder = t(el.dataset.i18nPh); });
    doc.querySelectorAll("[data-i18n-aria]").forEach(function (el) { el.setAttribute("aria-label", t(el.dataset.i18nAria)); });
    doc.querySelectorAll("[data-lang]").forEach(function (b) { b.classList.toggle("on", b.dataset.lang === lang); });
    var lb = $("langBtn"); if (lb) lb.textContent = lang === "fa" ? "EN" : "FA";
    var ti = doc.querySelector('[data-i18n="nav.' + PAGE + '"]');
    doc.title = (PAGE === "home" ? "ConfigUSA" : t("nav." + PAGE) + " · ConfigUSA");
    if (!silent) doc.dispatchEvent(new CustomEvent("ch:lang"));
  }
  CH.setLang = applyLang;

  /* ---------------------------------------------------------- theme */
  function applyTheme(th) {
    if (th !== "light") th = "dark";
    store.set("theme", th); root.dataset.theme = th;
    doc.querySelectorAll("[data-theme-set]").forEach(function (b) { b.classList.toggle("on", b.dataset.themeSet === th); });
    var ic = $("themeIcon"); if (ic) ic.setAttribute("href", th === "light" ? "#i-moon" : "#i-sun");
    var m = doc.querySelector('meta[name="theme-color"]'); if (m) m.content = th === "light" ? "#ffffff" : "#000000";
  }
  CH.setTheme = applyTheme;

  /* ---------------------------------------------------------- loader */
  var loader = $("loader"), tasks = [], doneCount = 0, finished = false, startedAt = performance.now();
  var firstVisit = !sessionStorage.getItem("ch.seen");
  function setProgress(label) {
    var pct = tasks.length ? Math.round(100 * doneCount / tasks.length) : 0;
    var bar = $("ldBar"), p = $("ldPct"), s = $("ldStep");
    if (bar) bar.style.strokeDashoffset = String(402 * (1 - pct / 100));
    if (p) p.textContent = pct + "%";
    if (s && label) s.textContent = label;
  }
  CH.task = function (labelKey, promise) {
    if (finished) return promise;
    var rec = { k: labelKey, done: false };
    tasks.push(rec); setProgress(t(labelKey));
    var fin = function () { if (rec.done) return; rec.done = true; doneCount++; setProgress(t(labelKey)); maybeFinish(); };
    Promise.resolve(promise).then(fin, fin);
    return promise;
  };
  function maybeFinish() {
    if (finished || doneCount < tasks.length) return;
    finished = true; setProgress(t("ld.done"));
    var wait = Math.max(0, (firstVisit ? 650 : 280) - (performance.now() - startedAt));
    setTimeout(function () {
      sessionStorage.setItem("ch.seen", "1");
      doc.body.classList.add("enter");
      if (loader) {
        loader.classList.add("done");
        loader.addEventListener("animationend", function () { loader.remove(); }, { once: true });
        setTimeout(function () { if (loader.parentNode) loader.remove(); }, 700);
      }
      doc.dispatchEvent(new CustomEvent("ch:ready"));
    }, wait);
  }
  setTimeout(function () { if (!finished) { doneCount = tasks.length; maybeFinish(); } }, 12000); // safety net

  /* ---------------------------------------------------------- UI helpers */
  var toastTimer;
  CH.toast = function (msg) {
    var el = $("toast"); if (!el) return;
    el.querySelector("span b").textContent = msg;
    el.classList.remove("closing"); el.classList.add("open");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      el.classList.add("closing");
      setTimeout(function () { el.classList.remove("open", "closing"); }, 210);
    }, 1700);
  };
  function lockScroll() { doc.body.style.overflow = doc.querySelector(".modal.open,.sheet.open") ? "hidden" : ""; }
  CH.open = function (el) {
    if (typeof el === "string") el = $(el); if (!el) return;
    el.classList.remove("closing"); el.classList.add("open"); lockScroll();
    var f = el.querySelector("[data-autofocus]"); if (f) f.focus({ preventScroll: true });
  };
  CH.close = function (el) {
    if (typeof el === "string") el = $(el);
    if (!el || !el.classList.contains("open") || el.classList.contains("closing")) return;
    el.classList.add("closing");
    var done = function () { el.classList.remove("open", "closing"); lockScroll(); el.dispatchEvent(new CustomEvent("ch:closed")); };
    el.addEventListener("animationend", function h(e) { if (e.target !== el) return; el.removeEventListener("animationend", h); done(); });
    setTimeout(function () { if (el.classList.contains("closing")) done(); }, 420);
  };
  doc.addEventListener("click", function (e) {
    var c = e.target.closest("[data-close]");
    if (c) { CH.close(c.closest(".modal,.sheet")); return; }
    if (e.target.classList && (e.target.classList.contains("modal") || e.target.classList.contains("sheet"))) CH.close(e.target);
  });
  doc.addEventListener("keydown", function (e) {
    if (e.key === "Escape") { var o = doc.querySelectorAll(".modal.open,.sheet.open"); if (o.length) CH.close(o[o.length - 1]); }
  });

  CH.copy = function (text, msgKey) {
    if (!text) return;
    var ok = function () { CH.toast(t(msgKey || "common.copied")); };
    if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(text).then(ok, function () { fallback(text, ok); });
    else fallback(text, ok);
  };
  function fallback(text, cb) {
    var ta = doc.createElement("textarea"); ta.value = text; ta.setAttribute("readonly", "");
    ta.style.cssText = "position:fixed;opacity:0;inset-block-start:0"; doc.body.appendChild(ta); ta.select();
    try { doc.execCommand("copy"); cb(); } catch (e) {} ta.remove();
  }

  /* colorIn / colorOut on hover and focus */
  var HV = ".nav a,.icon-btn,.btn,.seg button,.chk,.card.hv,.sheet a,.ftr a";
  doc.addEventListener("pointerover", function (e) {
    var el = e.target.closest && e.target.closest(HV); if (!el || el.contains(e.relatedTarget)) return;
    el.classList.remove("co"); el.classList.add("ci");
  });
  doc.addEventListener("pointerout", function (e) {
    var el = e.target.closest && e.target.closest(HV); if (!el || el.contains(e.relatedTarget)) return;
    if (!el.classList.contains("ci")) return;
    el.classList.remove("ci"); el.classList.add("co");
    el.addEventListener("animationend", function () { el.classList.remove("co"); }, { once: true });
  });

  /* page transitions: fadeOut, then go */
  doc.addEventListener("click", function (e) {
    if (e.defaultPrevented || e.button || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    var a = e.target.closest("a[href]"); if (!a || a.target || a.hasAttribute("download")) return;
    var u; try { u = new URL(a.href, location.href); } catch (x) { return; }
    if (u.origin !== location.origin || location.protocol === "file:" || u.pathname === location.pathname) return;
    e.preventDefault();
    var sheet = doc.querySelector(".sheet.open"); if (sheet) sheet.style.animation = "none";
    doc.body.classList.add("leaving");
    setTimeout(function () { location.href = a.href; }, 200);
  });
  window.addEventListener("pageshow", function (e) { if (e.persisted) doc.body.classList.remove("leaving"); });

  /* ---------------------------------------------------------- formatting */
  CH.fmtBytes = function (b) {
    b = Number(b) || 0; var u = ["B", "KB", "MB", "GB", "TB"], i = 0;
    while (b >= 1024 && i < u.length - 1) { b /= 1024; i++; }
    return (i === 0 ? b.toFixed(0) : b.toFixed(b >= 100 ? 1 : 2)) + " " + u[i];
  };
  CH.fmtSecs = function (s) { s = Math.max(0, Math.floor(s)); return [s / 3600 | 0, (s % 3600) / 60 | 0, s % 60].map(function (x) { return String(x).padStart(2, "0"); }).join(":"); };
  CH.esc = function (s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); };
  CH.icon = function (id) { return '<svg class="i" aria-hidden="true"><use href="#' + id + '"/></svg>'; };
  var enc = CH.b64 = function (s) { return btoa(unescape(encodeURIComponent(s))); };
  var dec = CH.unb64 = function (s) { return decodeURIComponent(escape(atob(s))); };

  /* ---------------------------------------------------------- data */
  var metaPromise;
  CH.loadMeta = function () {
    if (metaPromise) return metaPromise;
    metaPromise = (async function () {
      try {
        var r = await fetch(ROOT + "stats.json?t=" + Date.now(), { cache: "no-store" });
        if (!r.ok) throw new Error("HTTP " + r.status);
        var m = await r.json();
        if (!m || !Array.isArray(m.inbounds)) throw new Error("old manifest");
        CH.meta = m;
        refreshFromGithub(m);
        return m;
      } catch (e) { CH.metaError = String(e && e.message || e); return null; }
    })();
    return metaPromise;
  };
  async function refreshFromGithub(m) { // Pages can lag behind; prefer a newer gh-pages copy in the background
    if (!m.repo) return;
    try {
      var c = new AbortController(), to = setTimeout(function () { c.abort(); }, 4000);
      var rr = await fetch("https://raw.githubusercontent.com/" + m.repo + "/gh-pages/stats.json?t=" + Date.now(), { cache: "no-store", signal: c.signal });
      clearTimeout(to);
      if (!rr.ok) return;
      var m2 = await rr.json();
      if (m2 && Array.isArray(m2.inbounds) && Number(m2.timestamp || 0) > Number(m.timestamp || 0)) {
        CH.meta = m2; doc.dispatchEvent(new CustomEvent("ch:meta"));
      }
    } catch (e) {}
  }
  CH.pollLive = async function () {
    if (!CH.meta || !CH.meta.domain) return false;
    try {
      var c = new AbortController(), to = setTimeout(function () { c.abort(); }, 6000);
      var r = await fetch("https://" + CH.meta.domain + "/api/stats?t=" + Date.now(), { mode: "cors", cache: "no-store", signal: c.signal });
      clearTimeout(to);
      if (!r.ok) throw new Error("HTTP " + r.status);
      var d = await r.json(); CH.live = d; CH.isLive = true;
      if (d.domain && CH.meta) CH.meta.domain = d.domain;
      if (d.configs && Array.isArray(d.configs.inbounds)) CH.meta = d.configs;
      if (typeof d.uptime_seconds === "number")
        CH.clock = { up: d.uptime_seconds, left: d.remaining_seconds != null ? d.remaining_seconds : 0, total: d.renewal_threshold_seconds || 20700, at: performance.now() };
    } catch (e) { CH.isLive = false; }
    doc.dispatchEvent(new CustomEvent("ch:live"));
    return CH.isLive;
  };
  CH.left = function () { return CH.clock ? CH.clock.left - (performance.now() - CH.clock.at) / 1000 : 0; };
  CH.upNow = function () { return CH.clock ? CH.clock.up + (performance.now() - CH.clock.at) / 1000 : 0; };

  /* ---------------------------------------------------------- clean ip + links */
  CH.cleanIp = function () { return store.get("cleanIp", ""); };
  CH.setCleanIp = function (v) { v = (v || "").trim(); if (v) store.set("cleanIp", v); else store.del("cleanIp"); };
  CH.subUrl = function (name) { return new URL(ROOT + (name || "sub.txt"), location.href).href; };

  CH.buildLink = function (inb, host) {
    if (!inb || !inb.enabled) return "";
    if (!inb.cdn) return inb.link || "";
    var d = CH.meta.domain, h = host || CH.cleanIp() || d, e = encodeURIComponent;
    var net = inb.net, alpn = net === "xhttp" ? "h2" : "http/1.1";
    var common = "security=tls&sni=" + d + "&fp=chrome&alpn=" + e(alpn) + "&type=" + net + "&host=" + d + "&path=" + e(inb.path);
    if (inb.proto === "vless") return "vless://" + inb.uuid + "@" + h + ":443?encryption=none&" + common + (net === "xhttp" ? "&mode=packet-up" : "") + "#" + e(inb.remark);
    if (inb.proto === "trojan") return "trojan://" + e(inb.password) + "@" + h + ":443?" + common + "#" + e(inb.remark);
    if (inb.proto === "vmess") return "vmess://" + btoa(JSON.stringify({ v: "2", ps: inb.remark, add: h, port: "443", id: inb.uuid, aid: "0", scy: "auto", net: net, type: "none", host: d, path: inb.path, tls: "tls", sni: d, alpn: alpn, fp: "chrome" }));
    if (inb.proto === "shadowsocks") return "ss://" + btoa(inb.method + ":" + inb.password).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "") + "@" + h + ":443?plugin=" + e("v2ray-plugin;tls;host=" + d + ";path=" + inb.path) + "#" + e(inb.remark);
    return inb.link || "";
  };
  CH.subLinks = function () { return (CH.meta ? CH.meta.inbounds : []).filter(function (i) { return i.enabled && i.proto !== "mtproto"; }).map(function (i) { return CH.buildLink(i); }).filter(Boolean); };

  /* replace the address of any share link (vless / trojan / ss / vmess) */
  CH.withHost = function (link, ip, label) {
    link = (link || "").trim();
    if (/^vmess:\/\//i.test(link)) {
      try { var o = JSON.parse(dec(link.slice(8).trim())); o.add = ip; if (label) o.ps = label; return "vmess://" + btoa(JSON.stringify(o)); } catch (e) { return link; }
    }
    var out = link.replace(/^([a-z0-9]+:\/\/)([^@\/?#]*@)([^:\/?#]+|\[[^\]]+\])/i, function (m, a, b) { return a + b + ip; });
    if (label) out = /#/.test(out) ? out.replace(/#.*$/, "#" + encodeURIComponent(label)) : out + "#" + encodeURIComponent(label);
    return out;
  };

  /* QR modal (shared) */
  CH.showQR = function (text, title) {
    var m = $("qrModal"); if (!m) return;
    $("qrTitle").textContent = title || t("qr.title");
    try { $("qrBox").innerHTML = window.QR.svg(text, { ecc: "M" }); } catch (e) { $("qrBox").innerHTML = "<div style='color:#000;padding:12px;font:12px monospace;word-break:break-all;max-width:260px'>" + CH.esc(text) + "</div>"; }
    $("qrCopy").onclick = function () { CH.copy(text); };
    CH.open(m);
  };


  /* ---------------------------------------------------------- rolling numbers (odometer)
     Any element listed below (or marked data-roll) animates digit by digit whenever its text changes. */
  (function () {
    var IDS = ["stProto", "stLeft", "stUp", "valLeft", "valUp", "valProg", "valTcp", "valUpSpeed", "valDownSpeed", "valTx", "valRx", "valTotal", "inCount"];
    // Each digit cell holds ONE digit. On change the old digit slides out and the new one slides in,
    // so the DOM (and copy/paste, screen readers) always contains just the real number.
    function esc(s) { return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/ /g, "&nbsp;"); }
    function sig(t) { return t.replace(/[0-9]/g, "#"); }
    function build(el, t) {
      var h = "", run = "", n = 0;
      for (var i = 0; i < t.length; i++) {
        if (/[0-9]/.test(t[i])) { if (run) { h += '<span class="rs">' + esc(run) + "</span>"; run = ""; } h += '<span class="rd"><span class="rv in" style="animation-delay:' + Math.min(n * 40, 320) + 'ms">' + t[i] + "</span></span>"; n++; }
        else run += t[i];
      }
      if (run) h += '<span class="rs">' + esc(run) + "</span>";
      el.innerHTML = h; el.setAttribute("aria-label", t);
    }
    function update(el, t) {
      if (!el._t || sig(el._t) !== sig(t)) return build(el, t);
      var cells = el.querySelectorAll(".rd"), a = el._t.replace(/[^0-9]/g, ""), b = t.replace(/[^0-9]/g, "");
      for (var n = 0; n < b.length; n++) {
        if (a[n] === b[n] || !cells[n]) continue;
        var cell = cells[n], old = cell.querySelector(".rv:not(.out)"), nv = doc.createElement("span");
        nv.className = "rv in"; nv.textContent = b[n];
        if (old) { old.className = "rv out"; cell.insertBefore(nv, old); setTimeout(function (o) { if (o.parentNode) o.parentNode.removeChild(o); }, 900, old); }
        else cell.appendChild(nv);
      }
      el.setAttribute("aria-label", t);
    }
    function init(el) {
      if (!el || el._roll) return; el._roll = true; el.classList.add("rn");
      var t0 = el.textContent; el._t = "";
      // Pages keep assigning textContent every tick: route it through the roller and skip identical values.
      Object.defineProperty(el, "textContent", {
        configurable: true,
        get: function () { return el._t; },
        set: function (v) { v = String(v == null ? "" : v); if (v === el._t) return; update(el, v); el._t = v; }
      });
      if (t0 && t0.trim()) { build(el, t0); el._t = t0; }
    }
    function scan() { IDS.forEach(function (id) { init($(id)); }); doc.querySelectorAll("[data-roll]").forEach(init); }
    CH.rollInit = init;
    if (doc.readyState === "loading") doc.addEventListener("DOMContentLoaded", scan); else scan();
  })();

  /* ---------------------------------------------------------- boot */
  doc.querySelectorAll("[data-theme-set]").forEach(function (b) { b.addEventListener("click", function () { applyTheme(b.dataset.themeSet); }); });
  doc.querySelectorAll("[data-lang]").forEach(function (b) { b.addEventListener("click", function () { applyLang(b.dataset.lang); }); });
  var tb = $("themeBtn"); if (tb) tb.addEventListener("click", function () { applyTheme(root.dataset.theme === "light" ? "dark" : "light"); });
  var lb = $("langBtn"); if (lb) lb.addEventListener("click", function () { applyLang(lang === "fa" ? "en" : "fa"); });
  var mb = $("menuBtn"); if (mb) mb.addEventListener("click", function () { CH.open("menu"); });
  var qc = doc.querySelectorAll('[data-nav="' + PAGE + '"]'); qc.forEach(function (a) { a.classList.add("active"); a.setAttribute("aria-current", "page"); });

  applyTheme(store.get("theme", "light"));
  applyLang(lang, true);

  CH.task("ld.assets", new Promise(function (res) { if (doc.readyState !== "loading") res(); else doc.addEventListener("DOMContentLoaded", res); }));
  CH.task("ld.fonts", Promise.race([doc.fonts && doc.fonts.ready || Promise.resolve(), new Promise(function (r) { setTimeout(r, 1800); })]));
  CH.task("ld.start", new Promise(function (res) { if (doc.readyState === "complete") res(); else window.addEventListener("load", res); }));
  setProgress(t("ld.start"));
})();
