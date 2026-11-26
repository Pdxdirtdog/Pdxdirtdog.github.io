/**
 * PortlandRealEstate.guide chat widget
 * Self-contained: injects its own CSS. No dependencies.
 *
 * Embed (after hosting widget.js on HTTPS):
 *   <script src="https://YOUR-HOST/widget.js" defer></script>
 *
 * Optional config (set before the script, or via data-* on the script tag):
 *   window.PREChatConfig = {
 *     botName, botTitle, companyName, greeting, avatarUrl, logoUrl,
 *     phoneNumber,      // confirmed: 5035016468
 *     avatarInitials,   // "R" until a photo is provided (avatarUrl)
 *     apiUrl,           // POST /chat on the worker; unset = FAQ/scripted fallback
 *     leadWebhookUrl,   // POST /lead on the worker; unset = do not send
 *     siteBase, homeValueUrl, probateUrl, seniorUrl, poweredBy
 *   };
 *
 * Public API: window.PREChat.open() / close() / toggle() / reset()
 */
(function (global) {
  "use strict";

  if (global.__PRE_CHAT_WIDGET__) return;
  global.__PRE_CHAT_WIDGET__ = true;

  var SITE = "https://www.portlandrealestate.guide";

  var DEFAULTS = {
    botName: "Ricky B",
    botTitle: "Client Concierge",
    companyName: "PortlandRealEstate.guide",
    greeting: "Hi, I'm Ricky B. What brings you here today?",
    financingPath: "/blog/low-to-no-down-payment-home-loans/",
    nextgenPath: "/blog/2026-nextgen-homebuyer-report/",
    lendingVendorsPath: "/preferred-vendors/#lending-banking",
    usdaSearchPath: "/property-search/results/?searchtype=2&searchid=2005250",
    avatarUrl: "https://pdxdirtdog.github.io/chat-widget/ricky-b-avatar.svg",
    avatarInitials: "R",
    logoUrl: "",
    /* Confirmed by Kevin on Nov 25, 2026: Call me / Text me use this number. */
    phoneNumber: "5035016468",
    apiUrl: "",
    leadWebhookUrl: "",
    siteBase: SITE,
    homeValueUrl: "https://guestimatenomore.com/",
    probateUrl: "https://portland-probate-properties.portlandreal-3394.chatgpt.site/",
    seniorUrl: "https://portland-senior-transition.portlandreal-3394.chatgpt.site/",
    probateOnsitePath: "/personal-representative-support/",
    seniorOnsitePath: "/senior-housing-transition-specialist/",
    relocatingPath: "/portland-relocation-guide/",
    poweredBy: "PortlandRealEstate.guide",
    position: "bottom-right"
  };

  var AREA_GROUPS = [
    {
      label: "Portland",
      items: [
        { name: "North Portland", path: "/north-portland/" },
        { name: "NE Portland", path: "/ne-portland/" },
        { name: "SE Portland", path: "/se-portland/" },
        { name: "NW Portland", path: "/nw-portland/" },
        { name: "SW Portland", path: "/sw-portland/" },
        { name: "Pearl District", path: "/pearl-district/" },
        { name: "South Waterfront", path: "/s-waterfront/" }
      ]
    },
    {
      label: "Oregon suburbs",
      items: [
        { name: "Lake Oswego", path: "/lake-oswego/" },
        { name: "West Linn", path: "/west-linn/" },
        { name: "Beaverton", path: "/beaverton/" },
        { name: "Tigard", path: "/tigard/" },
        { name: "Tualatin", path: "/tualatin/" },
        { name: "Oregon City", path: "/oregon-city/" },
        { name: "Happy Valley", path: "/happy-valley/" },
        { name: "Gresham", path: "/gresham/" }
      ]
    },
    {
      label: "Southwest Washington",
      items: [
        { name: "Vancouver", path: "/vancouver/" },
        { name: "Unincorporated Vancouver", path: "/vancouver-unincorporated/" },
        { name: "Camas", path: "/camas/" },
        { name: "Battle Ground", path: "/battle-ground/" }
      ]
    }
  ];

  var ALL_AREAS = AREA_GROUPS.reduce(function (acc, g) {
    return acc.concat(g.items);
  }, []);

  var BUDGETS = [
    "Under $400k",
    "$400k–$600k",
    "$600k–$800k",
    "$800k–$1M",
    "$1M+",
    "Flexible"
  ];

  var BEDS = ["1+", "2+", "3+", "4+", "5+", "Flexible"];

  var TIMELINES = [
    "Ready now",
    "1–3 months",
    "3–6 months",
    "6+ months / exploring"
  ];

  function normalizeFthbTimeline(text) {
    var t = String(text || "").toLowerCase();
    var i;
    for (i = 0; i < TIMELINES.length; i++) {
      if (t === TIMELINES[i].toLowerCase()) return TIMELINES[i];
    }
    if (/ready|asap|immediately|now|right away/.test(t)) return "Ready now";
    if (/1\s*[-–to]+\s*3|soon/.test(t)) return "1–3 months";
    if (/3\s*[-–to]+\s*6/.test(t)) return "3–6 months";
    if (/6\+|6\s*\+|exploring|just looking|no rush|later|next year/.test(t)) return "6+ months / exploring";
    return String(text || "").trim() || "6+ months / exploring";
  }

  function normalizeFthbPreapproval(text) {
    var t = String(text || "").toLowerCase();
    if (/working|in process|getting|applying|started/.test(t)) return "Working on it";
    if (/not sure|unsure|don'?t know/.test(t)) return "Not sure";
    if (/\byes\b|pre-?approved|already (approved|pre)/.test(t)) return "Yes, pre-approved";
    if (/not yet|\bno\b|haven'?t|not pre/.test(t)) return "Not yet";
    return String(text || "").trim() || "Not sure";
  }

  var CSS = [
    ':host{all:initial;font-size:16px;}',
    '*{box-sizing:border-box;}',
    '.pre{',
    '  --blue:#245b74;',
    '  --blue-dark:#1a4456;',
    '  --blue-deep:#123445;',
    '  --lime:#92d400;',
    '  --lime-dark:#6fa300;',
    '  --paper:#f4f2ee;',
    '  --char:#404040;',
    '  --muted:#6b7280;',
    '  --line:#e5e2db;',
    '  --white:#fff;',
    '  --shadow:0 12px 40px rgba(18,52,69,.28);',
    '  font-family:Nunito,system-ui,-apple-system,Segoe UI,sans-serif;',
    '  color:var(--char);',
    '  line-height:1.45;',
    '}',
    '.pre button,.pre input,.pre a{font:inherit;}',
    '.pre-launcher{',
    '  position:fixed;right:20px;bottom:20px;z-index:2147483000;',
    '  width:64px;height:64px;border-radius:50%;border:0;',
    '  background:var(--blue);color:#fff;cursor:pointer;',
    '  border:3px solid var(--lime);',
    '  box-shadow:0 8px 24px rgba(36,91,116,.4);',
    '  display:flex;align-items:center;justify-content:center;',
    '  transition:transform .18s ease,background .18s ease;',
    '}',
    '.pre--left .pre-launcher{right:auto;left:20px;}',
    '.pre-launcher:hover,.pre-launcher:focus-visible{background:var(--blue-dark);transform:scale(1.05);outline:none;}',
    '.pre-launcher svg{width:30px;height:30px;fill:currentColor;}',
    '.pre-launcher.is-open{background:var(--blue-dark);}',
    '.pre-launcher.is-open .pre-icon-chat{display:none;}',
    '.pre-launcher.is-open .pre-icon-x{display:block;}',
    '.pre-icon-x{display:none;}',
    '.pre-pulse{',
    '  position:absolute;inset:-4px;border-radius:50%;',
    '  border:2px solid var(--lime);animation:prePulse 2.4s ease-out infinite;',
    '  pointer-events:none;',
    '}',
    '.pre-launcher.is-open .pre-pulse{display:none;}',
    '@keyframes prePulse{0%{transform:scale(.92);opacity:.7}70%{transform:scale(1.15);opacity:0}100%{opacity:0}}',
    '.pre-panel{',
    '  position:fixed;right:20px;bottom:96px;z-index:2147483001;',
    '  width:min(420px,calc(100vw - 24px));',
    '  height:min(720px,calc(100vh - 110px));',
    '  background:var(--white);border-radius:20px;',
    '  box-shadow:var(--shadow);',
    '  display:flex;flex-direction:column;overflow:hidden;',
    '  opacity:0;transform:translateY(12px) scale(.98);',
    '  pointer-events:none;visibility:hidden;',
    '  transition:opacity .18s ease,transform .18s ease,visibility .18s;',
    '}',
    '.pre--left .pre-panel{right:auto;left:20px;}',
    '.pre-panel.is-open{opacity:1;transform:none;pointer-events:auto;visibility:visible;}',
    '.pre-header{',
    '  flex:0 0 auto;',
    '  display:flex;align-items:center;gap:10px;',
    '  padding:12px 12px 12px 14px;',
    '  background:linear-gradient(180deg,var(--blue-deep),var(--blue-dark));',
    '  color:#fff;',
    '}',
    '.pre-avatar-wrap{position:relative;flex:0 0 auto;}',
    '.pre-avatar{',
    '  width:44px;height:44px;border-radius:50%;object-fit:cover;',
    '  background:#245b74;display:flex;align-items:center;justify-content:center;',
    '  font-family:Montserrat,Nunito,sans-serif;font-weight:700;font-size:16px;',
    '  color:#fff;border:2px solid rgba(255,255,255,.25);overflow:hidden;',
    '}',
    '.pre-avatar img{width:100%;height:100%;object-fit:cover;display:block;}',
    '.pre-dot{',
    '  position:absolute;right:0;bottom:0;width:12px;height:12px;',
    '  background:#3dcf5b;border:2px solid var(--blue-dark);border-radius:50%;',
    '}',
    '.pre-head-text{flex:1;min-width:0;}',
    '.pre-name{',
    '  font-family:Montserrat,Nunito,sans-serif;font-weight:700;',
    '  font-size:14px;line-height:1.25;white-space:nowrap;',
    '  overflow:hidden;text-overflow:ellipsis;',
    '}',
    '.pre-sub{',
    '  font-size:11.5px;opacity:.82;white-space:nowrap;',
    '  overflow:hidden;text-overflow:ellipsis;',
    '}',
    '.pre-head-logo{',
    '  height:22px;width:auto;max-width:56px;object-fit:contain;flex:0 0 auto;',
    '  filter:brightness(0) invert(1);opacity:.92;',
    '}',
    '.pre-close{',
    '  flex:0 0 auto;width:36px;height:36px;border:0;border-radius:50%;',
    '  background:transparent;color:#fff;cursor:pointer;',
    '  display:flex;align-items:center;justify-content:center;',
    '}',
    '.pre-close:hover,.pre-close:focus-visible{background:rgba(255,255,255,.12);outline:none;}',
    '.pre-close svg{width:18px;height:18px;stroke:currentColor;fill:none;stroke-width:2.2;stroke-linecap:round;}',
    '.pre-messages{',
    '  flex:1;overflow-y:auto;padding:16px 14px 8px;',
    '  background:var(--paper);',
    '  display:flex;flex-direction:column;gap:10px;',
    '}',
    '.pre-row{display:flex;gap:8px;align-items:flex-end;}',
    '.pre-row--user{justify-content:flex-end;}',
    '.pre-mini-av{',
    '  width:24px;height:24px;border-radius:50%;flex:0 0 auto;',
    '  background:var(--blue);color:#fff;overflow:hidden;',
    '  font-family:Montserrat,sans-serif;font-weight:700;font-size:9px;',
    '  display:flex;align-items:center;justify-content:center;',
    '}',
    '.pre-mini-av img{width:100%;height:100%;object-fit:cover;display:block;}',
    '.pre-bubble{',
    '  max-width:82%;padding:10px 13px;border-radius:16px;',
    '  font-size:14.5px;white-space:pre-wrap;word-wrap:break-word;',
    '}',
    '.pre-bubble--bot{',
    '  background:#fff;color:var(--char);border:1px solid var(--line);',
    '  border-bottom-left-radius:6px;',
    '}',
    '.pre-bubble--user{',
    '  background:var(--blue);color:#fff;border-bottom-right-radius:6px;',
    '}',
    '.pre-links{display:flex;flex-direction:column;gap:6px;margin-top:8px;}',
    '.pre-link{',
    '  display:inline-flex;align-items:center;gap:6px;',
    '  color:var(--blue);font-weight:700;font-size:13.5px;text-decoration:none;',
    '  border-bottom:1px solid transparent;',
    '}',
    '.pre-link:hover{border-bottom-color:var(--lime);}',
    '.pre-chips{',
    '  display:flex;flex-wrap:wrap;gap:8px;margin-top:10px;',
    '}',
    '.pre-chip{',
    '  appearance:none;background:#fff;color:var(--blue);',
    '  border:1.5px solid var(--blue);border-radius:999px;',
    '  padding:7px 12px;font-size:13px;font-weight:700;cursor:pointer;',
    '  display:inline-flex;align-items:flex-start;gap:6px;line-height:1.25;',
    '  max-width:100%;white-space:normal;text-align:left;',
    '}',
    '.pre-chip:hover,.pre-chip:focus-visible{background:rgba(36,91,116,.08);outline:none;}',
    '.pre-chip svg{width:15px;height:15px;flex:0 0 auto;margin-top:1px;stroke:currentColor;fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;}',
    '.pre-chip--group{',
    '  flex:0 0 100%;margin:4px 0 0;padding:0;border:0;background:none;',
    '  color:var(--muted);font-size:11px;font-weight:700;letter-spacing:.04em;',
    '  text-transform:uppercase;cursor:default;pointer-events:none;',
    '}',
    '.pre-form{',
    '  margin-top:10px;display:flex;flex-direction:column;gap:8px;',
    '}',
    '.pre-form label{font-size:11px;font-weight:700;color:var(--muted);letter-spacing:.03em;text-transform:uppercase;}',
    '.pre-form input{',
    '  width:100%;border:1px solid var(--line);border-radius:10px;',
    '  padding:8px 10px;background:#fff;color:var(--char);',
    '}',
    '.pre-form input:focus{outline:2px solid var(--lime);border-color:transparent;}',
    '.pre-form-go{',
    '  appearance:none;border:0;border-radius:10px;padding:9px 12px;',
    '  background:var(--blue);color:#fff;font-weight:700;cursor:pointer;',
    '}',
    '.pre-form-go:hover{background:var(--blue-dark);}',
    '.pre-typing{display:flex;gap:5px;padding:12px 16px;width:auto;}',
    '.pre-typing i{',
    '  width:7px;height:7px;border-radius:50%;background:#9aa3ab;',
    '  animation:preDot 1s infinite ease-in-out;',
    '}',
    '.pre-typing i:nth-child(2){animation-delay:.15s;}',
    '.pre-typing i:nth-child(3){animation-delay:.3s;}',
    '@keyframes preDot{0%,80%,100%{transform:translateY(0);opacity:.4}40%{transform:translateY(-3px);opacity:1}}',
    '.pre-composer{flex:0 0 auto;background:#fff;border-top:1px solid var(--line);padding:10px 12px 8px;}',
    '.pre-input-row{display:flex;align-items:center;gap:8px;}',
    '.pre-field{',
    '  flex:1;display:flex;align-items:center;gap:4px;',
    '  background:var(--paper);border:1px solid var(--line);border-radius:999px;',
    '  padding:2px 2px 2px 14px;min-height:44px;',
    '}',
    '.pre-field:focus-within{border-color:var(--blue);box-shadow:0 0 0 3px rgba(36,91,116,.12);}',
    '.pre-field input{',
    '  flex:1;border:0;background:transparent;outline:none;',
    '  font-size:14px;color:var(--char);min-width:0;padding:8px 0;',
    '}',
    '.pre-icon-btn{',
    '  width:36px;height:36px;border:0;border-radius:50%;background:transparent;',
    '  color:var(--blue);cursor:pointer;display:flex;align-items:center;justify-content:center;',
    '}',
    '.pre-icon-btn:hover,.pre-icon-btn:focus-visible{background:rgba(36,91,116,.1);outline:none;}',
    '.pre-icon-btn.is-on{background:var(--blue);color:#fff;}',
    '.pre-icon-btn svg{width:18px;height:18px;stroke:currentColor;fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;}',
    '.pre-send{',
    '  width:44px;height:44px;border:0;border-radius:50%;',
    '  background:var(--lime);color:#1a3a14;cursor:pointer;',
    '  display:flex;align-items:center;justify-content:center;',
    '  flex:0 0 auto;',
    '}',
    '.pre-send:hover,.pre-send:focus-visible{background:var(--lime-dark);color:#fff;outline:none;}',
    '.pre-send:disabled{opacity:.45;cursor:not-allowed;}',
    '.pre-send svg{width:18px;height:18px;fill:currentColor;}',
    '.pre-cta-row{display:flex;gap:8px;padding:0 12px 8px;background:#fff;}',
    '.pre-cta{',
    '  flex:1;height:40px;border-radius:10px;font-weight:700;font-size:14px;',
    '  cursor:pointer;text-decoration:none;display:flex;align-items:center;',
    '  justify-content:center;gap:6px;',
    '}',
    '.pre-cta svg{width:16px;height:16px;stroke:currentColor;fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;}',
    '.pre-cta--call{background:#fff;color:var(--blue);border:1.5px solid var(--blue);}',
    '.pre-cta--call:hover{background:rgba(36,91,116,.08);}',
    '.pre-cta--text{background:var(--lime);color:#1a3a14;border:1.5px solid var(--lime);}',
    '.pre-cta--text:hover{background:var(--lime-dark);color:#fff;}',
    '.pre-cta.is-disabled{cursor:not-allowed;}',
    '.pre-footer{',
    '  background:#fff;text-align:center;font-size:11px;color:var(--muted);',
    '  padding:2px 12px 10px;letter-spacing:.02em;',
    '}',
    '.pre-note{',
    '  margin:0 0 4px;padding:8px 10px;border-radius:10px;',
    '  background:#fff7e6;color:#6a4b00;font-size:12.5px;border:1px solid #f3e0b0;',
    '}',
    '.pre-sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0,0,0,0);}',
    '@media (max-width:480px){',
    '  .pre-panel{',
    '    right:0;left:0;bottom:0;width:100vw;height:min(100vh,100dvh);',
    '    border-radius:16px 16px 0 0;max-height:100vh;',
    '  }',
    '  .pre--left .pre-panel{left:0;right:0;}',
    '  .pre-launcher{right:16px;bottom:16px;}',
    '  .pre-chips{gap:6px;}',
    '  .pre-chip{padding:6px 11px;font-size:12.5px;}',
    '}',
    '@media (prefers-reduced-motion:reduce){',
    '  .pre-pulse{animation:none;display:none;}',
    '  .pre-panel,.pre-launcher{transition:none;}',
    '  .pre-typing i{animation:none;}',
    '}'
  ].join("\n");

  function $(tag, attrs, kids) {
    var n = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        var v = attrs[k];
        if (v == null || v === false) return;
        if (k === "class") n.className = v;
        else if (k === "text") n.textContent = v;
        else if (k === "html") n.innerHTML = v;
        else if (k.indexOf("on") === 0 && typeof v === "function") n.addEventListener(k.slice(2), v);
        else if (k === "dataset") Object.keys(v).forEach(function (d) { n.dataset[d] = v[d]; });
        else n.setAttribute(k, v === true ? "" : String(v));
      });
    }
    (kids || []).forEach(function (c) {
      if (c == null) return;
      n.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
    });
    return n;
  }

  function svg(html) {
    var w = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    var box = html.match(/viewBox="([^"]+)"/);
    w.setAttribute("viewBox", box ? box[1] : "0 0 24 24");
    w.setAttribute("aria-hidden", "true");
    w.innerHTML = html.replace(/^[^>]*>/, "").replace(/<\/svg>$/, "");
    return w;
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c];
    });
  }

  function digitsPhone(s) {
    var d = String(s || "").replace(/\D/g, "");
    if (d.length === 11 && d.charAt(0) === "1") d = d.slice(1);
    return d;
  }

  function prettyPhone(s) {
    var d = digitsPhone(s);
    if (d.length === 10) return "(" + d.slice(0, 3) + ") " + d.slice(3, 6) + "-" + d.slice(6);
    return String(s || "").trim();
  }

  function telHref(s) {
    var d = digitsPhone(s);
    return d ? "tel:+1" + d : "";
  }

  function smsHref(s) {
    var d = digitsPhone(s);
    return d ? "sms:+1" + d : "";
  }

  function isUsableUrl(u) {
    if (!u) return false;
    var s = String(u).trim();
    if (!/^https?:\/\//i.test(s)) return false;
    if (/YOUR_|PLACEHOLDER|example\.com|changeme/i.test(s)) return false;
    return true;
  }

  function loadFonts() {
    if (document.getElementById("pre-chat-fonts")) return;
    var l = document.createElement("link");
    l.id = "pre-chat-fonts";
    l.rel = "stylesheet";
    l.href =
      "https://fonts.googleapis.com/css2?family=Montserrat:wght@600;700&family=Nunito:wght@400;600;700&display=swap";
    document.head.appendChild(l);
  }

  function scriptEl() {
    return (
      document.currentScript ||
      document.querySelector("script[src*='widget.js']") ||
      document.querySelector("script[data-pre-chat]")
    );
  }

  function dashToCamel(s) {
    return s.replace(/-([a-z])/g, function (_, c) { return c.toUpperCase(); });
  }

  function readConfig() {
    var cfg = {};
    var keys = Object.keys(DEFAULTS);
    keys.forEach(function (k) { cfg[k] = DEFAULTS[k]; });
    var fromWin = global.PREChatConfig || {};
    keys.forEach(function (k) {
      if (fromWin[k] != null && fromWin[k] !== "") cfg[k] = fromWin[k];
    });
    var el = scriptEl();
    if (el && el.dataset) {
      Object.keys(el.dataset).forEach(function (k) {
        var key = k === "preChat" ? null : k;
        if (!key) return;
        if (Object.prototype.hasOwnProperty.call(DEFAULTS, key) && el.dataset[k] !== "") {
          cfg[key] = el.dataset[k];
        }
        var camel = dashToCamel(k);
        if (Object.prototype.hasOwnProperty.call(DEFAULTS, camel) && el.dataset[k] !== "") {
          cfg[camel] = el.dataset[k];
        }
      });
    }
    cfg.siteBase = String(cfg.siteBase || SITE).replace(/\/$/, "");
    /* Sierra may still send the previous default greeting. Map that exact
       obsolete string to the approved opening so the live site updates
       without a snippet change. Any other custom greeting is left alone. */
    if (cfg.greeting === "Welcome! I'm Ricky B. Questions about pricing your home for sale?") {
      cfg.greeting = DEFAULTS.greeting;
    }
    return cfg;
  }

  function initials(cfg) {
    if (cfg && cfg.avatarInitials) {
      return String(cfg.avatarInitials).slice(0, 2).toUpperCase();
    }
    var name = cfg && cfg.botName ? cfg.botName : "R";
    var p = String(name).replace(/^the\s+/i, "").trim().split(/\s+/);
    var a = (p[0] && p[0].charAt(0)) || "R";
    return a.toUpperCase();
  }

  function pathUrl(cfg, path) {
    if (!path) return cfg.siteBase + "/";
    if (/^https?:/i.test(path)) return path;
    return cfg.siteBase + (path.charAt(0) === "/" ? path : "/" + path);
  }

  function matchArea(text) {
    var t = String(text || "").toLowerCase().replace(/[’']/g, "'");
    var best = null;
    var bestScore = 0;
    ALL_AREAS.forEach(function (a) {
      var n = a.name.toLowerCase();
      if (t === n || t.indexOf(n) !== -1) {
        var score = n.length;
        if (score > bestScore) { best = a; bestScore = score; }
      }
    });
    if (best) return best;
    var aliases = [
      { re: /\bne\b|northeast/, name: "NE Portland" },
      { re: /\bse\b|southeast/, name: "SE Portland" },
      { re: /\bnw\b|northwest/, name: "NW Portland" },
      { re: /\bsw\b|southwest portland/, name: "SW Portland" },
      { re: /\bnorth portland|\bst\.?\s*johns\b/, name: "North Portland" },
      { re: /pearl/, name: "Pearl District" },
      { re: /south\s*waterfront|so\s*wa/, name: "South Waterfront" },
      { re: /lake\s*oswego|\blo\b/, name: "Lake Oswego" },
      { re: /west\s*linn/, name: "West Linn" },
      { re: /beaverton/, name: "Beaverton" },
      { re: /tigard/, name: "Tigard" },
      { re: /tualatin/, name: "Tualatin" },
      { re: /oregon\s*city/, name: "Oregon City" },
      { re: /happy\s*valley/, name: "Happy Valley" },
      { re: /gresham/, name: "Gresham" },
      { re: /unincorporated/, name: "Unincorporated Vancouver" },
      { re: /vancouver/, name: "Vancouver" },
      { re: /camas/, name: "Camas" },
      { re: /battle\s*ground/, name: "Battle Ground" }
    ];
    for (var i = 0; i < aliases.length; i++) {
      if (aliases[i].re.test(t)) {
        return ALL_AREAS.filter(function (a) { return a.name === aliases[i].name; })[0] || null;
      }
    }
    return null;
  }

  /* FAQ replies use only pages and facts published on portlandrealestate.guide.
     Do not add unsourced claims about Kevin. */
  function faqMatch(text, cfg) {
    var t = String(text || "").toLowerCase();
    var links;
    function R(msg, l) { return { text: msg, links: l || [] }; }

    if (/school|district|pps|test score/.test(t)) {
      return R(
        "School assignment in the Portland area is typically by address, and it can change. The site has a schools and districts hub, plus local guides on many town pages.",
        [{ label: "Schools & districts", href: pathUrl(cfg, "/schools-districts/all/") }]
      );
    }
    if (/\bfha\b|\bva\b|\busda\b|down\s*payment|financ|mortgage|loan|pre-?qualif|pre-?approv|flex lending|chenoa|home ?ready|home ?possible/.test(t)) {
      return R(
        "Kevin's guide covers low- and no-down-payment options for Oregon buyers, including FHA, conventional, VA, USDA, and Oregon Flex Lending. Program rules and cash-to-close amounts vary — a lender has to run the numbers — and Kevin is not the lender. There's also a preferred-vendors list for lending contacts.",
        [
          { label: "Low- to no-down-payment loans", href: pathUrl(cfg, cfg.financingPath) },
          { label: "2026 NextGen homebuyer report", href: pathUrl(cfg, cfg.nextgenPath) },
          { label: "Preferred vendors (lending)", href: pathUrl(cfg, cfg.lendingVendorsPath) }
        ]
      );
    }
    if (/assumable/.test(t)) {
      return R(
        "The homepage highlights assumable mortgages. I can also help you start a home search, or you can browse listings on the site.",
        [{ label: "Search homes", href: pathUrl(cfg, "/property-search/results/") }]
      );
    }
    if (/cash offer|express\s*offer/.test(t)) {
      return R(
        "There's a page on the site about cash-offer options in the Portland market.",
        [{ label: "Cash offers in Portland", href: pathUrl(cfg, "/blog/cash-offer-portland-home/") }]
      );
    }
    if (/price (my|our)?\s*home|pricing|list my|sell my|market analysis|\bcma\b|what('s| is) my (home|house) worth|home'?s value|appraisal/.test(t)) {
      return R(
        "For a value estimate, the site points sellers to GuessItImateNoMore. There's also a Portland pricing-strategy guide on the blog.",
        [
          { label: "Get a home-value estimate", href: cfg.homeValueUrl },
          { label: "How to price your home to sell", href: pathUrl(cfg, "/blog/how-to-price-your-home-to-sell-the-ultimate-portland-seller-strategy/") }
        ]
      );
    }
    if (/off-?market|pocket listing|coming soon|before (they )?(hit|reach) the (mls|market)/.test(t)) {
      return R(
        "Kevin has a guide on the site about finding off-market homes in the Portland area.",
        [{ label: "How to find off-market homes", href: pathUrl(cfg, "/blog/how-to-find-off-market-homes/") }]
      );
    }
    if (/condo|townhome|townhouse/.test(t)) {
      return R(
        "There's a Portland condos and townhomes guide on the site, and you can also search current listings.",
        [
          { label: "Condos & townhomes guide", href: pathUrl(cfg, "/blog/portland-condos-townhomes/") },
          { label: "Search homes", href: pathUrl(cfg, "/property-search/results/") }
        ]
      );
    }
    if (/55\+|fifty-?five|retirement community/.test(t)) {
      return R(
        "You can browse 55+ community listings on the site search.",
        [{ label: "55+ communities", href: pathUrl(cfg, "/property-search/results/?searchtype=2&searchid=2005265") }]
      );
    }
    if (/fixer|renovat|fix-?up/.test(t)) {
      return R(
        "The site has a saved search for fixer and renovation homes.",
        [{ label: "Fixer / renovations", href: pathUrl(cfg, "/property-search/results/?searchtype=2&searchid=2005251") }]
      );
    }
    if (/new construction/.test(t)) {
      return R(
        "You can browse new-construction listings on the site.",
        [{ label: "New construction", href: pathUrl(cfg, "/property-search/results/?searchtype=2&searchid=2004295") }]
      );
    }
    if (/zip code|search by zip/.test(t)) {
      return R("You can search homes by ZIP code on the site.", [
        { label: "Search by ZIP", href: pathUrl(cfg, "/zip/") }
      ]);
    }
    if (/vendor|inspector|contractor|lender|preferred (service|vendor)/.test(t)) {
      return R(
        "Kevin keeps a preferred-service-providers list on the site.",
        [{ label: "Preferred vendors", href: pathUrl(cfg, "/preferred-vendors/") }]
      );
    }
    if (/about kevin|who is kevin|your broker|license|eXp|exp realty/.test(t)) {
      return R(
        "Kevin Donahue is a licensed Oregon real estate broker with eXp Realty. His about page has more on how he works with buyers, sellers, estate properties, and senior housing transitions.",
        [{ label: "About Kevin", href: pathUrl(cfg, "/about/") }]
      );
    }
    if (/contact|email|appointment|talk to kevin|speak (with|to)|schedule a call/.test(t)) {
      links = [{ label: "Contact page", href: pathUrl(cfg, "/contact/") }];
      return R(
        "You can reach Kevin through the contact page" +
          (digitsPhone(cfg.phoneNumber) ? ", or use Call me / Text me below." : ". Call and text will work once a phone number is added to this widget's config.") ,
        links
      );
    }
    if (/hello|hi there|^hi$|^hey\b|good (morning|afternoon|evening)/.test(t)) {
      return R("Hi — I can help you find a home, get a value estimate, plan a move to Portland, or talk through an inherited property or a senior housing transition. What would you like to do?");
    }
    if (/thank/.test(t)) {
      return R("You're welcome. I'm here if you want to keep looking or leave a message for Kevin.");
    }
    return null;
  }

  function intentOf(text) {
    var t = String(text || "").toLowerCase();
    if (/talk to kevin|call (kevin|me|now)|text (kevin|me)|speak (to|with) kevin|reach kevin/.test(t)) return "talk";
    if (/first[- ]?time|first home|keep (your|my) down-?payment|down[- ]?payment|\bdpa\b|\bgrants?\b|flex lending|ohcs|chenoa|home ?ready|home ?possible|pre-?approv(ed|al)|low-? ?or ?no-?down|no[- ]down[- ]payment|zero[- ]down/.test(t)) return "fthb";
    if (/reloc|moving (to|from) portland|new (in|to) (the )?area|transfer|job relocation/.test(t)) return "relocating";
    if (/probate|inherit|inherited|estate home|personal representative|executor/.test(t)) return "probate";
    if (/senior|downsiz|assisted living|aging (parent|mom|dad)|older adult|care home|memory care/.test(t)) return "senior";
    if (/home'?s value|worth of (my|our) (home|house)|price my|sell my|market analysis|\bcma\b/.test(t)) return "value";
    if (/find (me )?(a )?home|see homes|looking for (a )?(home|house)|buy(ing)? (a )?(home|house)|home search|show me (homes|houses)/.test(t)) return "home";
    return null;
  }

  function areaChipList() {
    var chips = [{ id: "area:unsure", label: "Not sure yet — search all homes" }];
    AREA_GROUPS.forEach(function (g) {
      chips.push({ id: "group:" + g.label, label: g.label, group: true });
      g.items.forEach(function (a) {
        chips.push({ id: "area:" + a.path, label: a.name });
      });
    });
    return chips;
  }

  function starterChips() {
    return [
      { id: "flow:home", label: "See homes for sale", icon: "search" },
      { id: "flow:value", label: "What's my home worth?", icon: "dollar" },
      { id: "flow:fthb", label: "First home? Keep your down\u2011payment", icon: "percent" },
      { id: "flow:relocating", label: "Moving to Portland", icon: "map" },
      { id: "flow:probate", label: "Selling a home in probate", icon: "home" },
      { id: "flow:senior", label: "Helping a parent downsize", icon: "heart" },
      { id: "flow:talk", label: "Talk to Kevin now", icon: "phone" }
    ];
  }

  function ICONS() {
    return {
      search: '<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"></circle><path d="M20 20l-3.5-3.5"></path></svg>',
      dollar: '<svg viewBox="0 0 24 24"><path d="M12 2v20"></path><path d="M17 7.5c0-2-2.2-3.5-5-3.5S7 5.5 7 7.5 9 10 12 11s5 1.8 5 4-2.2 3.5-5 3.5-5-1.5-5-3.5"></path></svg>',
      map: '<svg viewBox="0 0 24 24"><path d="M12 21s7-6.2 7-11a7 7 0 10-14 0c0 4.8 7 11 7 11z"></path><circle cx="12" cy="10" r="2.2"></circle></svg>',
      home: '<svg viewBox="0 0 24 24"><path d="M3 11.5L12 4l9 7.5"></path><path d="M6 10.5V20h12v-9.5"></path></svg>',
      heart: '<svg viewBox="0 0 24 24"><path d="M12 20s-7-4.6-9.2-8.2C.8 8.6 2.2 5 5.6 5c2 0 3.3 1.2 4.4 2.6C11.1 6.2 12.4 5 14.4 5c3.4 0 4.8 3.6 2.8 6.8C19 15.4 12 20 12 20z"></path></svg>',
      percent: '<svg viewBox="0 0 24 24"><circle cx="6.5" cy="7" r="2.4"></circle><circle cx="17.5" cy="17" r="2.4"></circle><path d="M17 6L7 18"></path></svg>',
      phone: '<svg viewBox="0 0 24 24"><path d="M6.5 3.5h3l1.5 4-2 1.5a12 12 0 006 6l1.5-2 4 1.5v3c0 1-1 2-2.2 2C9.5 19.5 4.5 14.5 4.5 5.7c0-1.2 1-2.2 2-2.2z"></path></svg>',
      text: '<svg viewBox="0 0 24 24"><path d="M4 5h16v11H8l-4 4V5z"></path></svg>',
      mic: '<svg viewBox="0 0 24 24"><rect x="9" y="3" width="6" height="11" rx="3"></rect><path d="M6 11a6 6 0 0012 0M12 17v4"></path></svg>',
      send: '<svg viewBox="0 0 24 24"><path d="M3 11.5L21 3 13 21l-1.5-7.5L3 11.5z"></path></svg>',
      ext: '<svg viewBox="0 0 24 24"><path d="M14 5h5v5M19 5l-9 9M10 5H6a1 1 0 00-1 1v12a1 1 0 001 1h12a1 1 0 001-1v-4"></path></svg>',
      chat: '<svg viewBox="0 0 24 24"><path d="M4 5h16v11H8l-4 4V5z" fill="currentColor" stroke="none"></path></svg>',
      x: '<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"></path></svg>'
    };
  }

  function Widget(cfg) {
    this.cfg = cfg;
    this.state = {
      open: false,
      messages: [],
      flow: null,
      step: null,
      home: { area: null, budget: null, beds: null, timeline: null },
      fthb: { timeline: null, preapproval: null },
      lead: { name: "", email: "", phone: "" },
      leadAfter: null,
      typing: false,
      listening: false,
      notice: ""
    };
    this.root = null;
    this.shadow = null;
    this.ui = {};
    this.recognition = null;
    this._id = 0;
  }

  Widget.prototype.mount = function () {
    loadFonts();
    var host = document.createElement("div");
    host.id = "pre-chat-root";
    document.body.appendChild(host);
    var shadow = host.attachShadow({ mode: "open" });
    var style = document.createElement("style");
    style.textContent = CSS;
    var wrap = $("div", { class: "pre" + (this.cfg.position === "bottom-left" ? " pre--left" : "") });
    shadow.appendChild(style);
    shadow.appendChild(wrap);
    this.root = wrap;
    this.shadow = shadow;
    this.renderShell();
    this.greet();
    this.bindGlobal();
  };

  Widget.prototype.renderShell = function () {
    var self = this;
    var cfg = this.cfg;
    var icons = ICONS();
    this.root.innerHTML = "";

    var avInner;
    if (cfg.avatarUrl) {
      avInner = $("img", { src: cfg.avatarUrl, alt: "" });
    } else {
      avInner = document.createTextNode(initials(cfg));
    }

    var logo = cfg.logoUrl
      ? $("img", { class: "pre-head-logo", src: cfg.logoUrl, alt: cfg.companyName })
      : null;

    var launcher = $("button", {
      class: "pre-launcher",
      type: "button",
      "aria-label": "Open chat",
      "aria-expanded": "false",
      onclick: function () { self.toggle(); }
    }, [
      $("span", { class: "pre-pulse" }),
      (function () {
        var s = svg('<svg viewBox="0 0 24 24"><path d="M4 5h16v11H8l-4 4V5z"></path></svg>');
        s.setAttribute("class", "pre-icon-chat");
        s.style.fill = "currentColor";
        s.style.stroke = "none";
        return s;
      })(),
      (function () {
        var s = svg('<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"></path></svg>');
        s.setAttribute("class", "pre-icon-x");
        s.style.stroke = "currentColor";
        s.style.fill = "none";
        s.style.strokeWidth = "2.2";
        return s;
      })()
    ]);

    var closeBtn = $("button", {
      class: "pre-close",
      type: "button",
      "aria-label": "Close chat",
      onclick: function () { self.close(); }
    }, [svg('<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"></path></svg>')]);

    var messages = $("div", { class: "pre-messages", role: "log", "aria-live": "polite", "aria-relevant": "additions" });

    var input = $("input", {
      type: "text",
      placeholder: "Or just ask me anything...",
      "aria-label": "Message",
      autocomplete: "off",
      onkeydown: function (e) {
        if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault();
          self.submitInput();
        }
      }
    });

    var micBtn = $("button", {
      class: "pre-icon-btn",
      type: "button",
      "aria-label": "Speak a question",
      title: "Speak a question",
      onclick: function () { self.toggleMic(); }
    }, [svg('<svg viewBox="0 0 24 24"><rect x="9" y="3" width="6" height="11" rx="3"></rect><path d="M6 11a6 6 0 0012 0M12 17v4"></path></svg>')]);

    var sendBtn = $("button", {
      class: "pre-send",
      type: "button",
      "aria-label": "Send message",
      onclick: function () { self.submitInput(); }
    }, [svg('<svg viewBox="0 0 24 24"><path d="M3 11.5L21 3 13 21l-1.5-7.5L3 11.5z" fill="currentColor" stroke="none"></path></svg>')]);

    var phoneOk = !!digitsPhone(cfg.phoneNumber);
    var call = $("a", {
      class: "pre-cta pre-cta--call" + (phoneOk ? "" : " is-disabled"),
      href: phoneOk ? telHref(cfg.phoneNumber) : "#",
      role: "button",
      "aria-disabled": phoneOk ? "false" : "true",
      onclick: function (e) {
        if (!phoneOk) {
          e.preventDefault();
          self.showNotice("Call and text will work once a phone number is added in the widget config. Do not invent a number — confirm the number Kevin wants used.");
        }
      }
    }, [svg('<svg viewBox="0 0 24 24"><path d="M6.5 3.5h3l1.5 4-2 1.5a12 12 0 006 6l1.5-2 4 1.5v3c0 1-1 2-2.2 2C9.5 19.5 4.5 14.5 4.5 5.7c0-1.2 1-2.2 2-2.2z"></path></svg>'), "Call me"]);

    var textMe = $("a", {
      class: "pre-cta pre-cta--text" + (phoneOk ? "" : " is-disabled"),
      href: phoneOk ? smsHref(cfg.phoneNumber) : "#",
      role: "button",
      "aria-disabled": phoneOk ? "false" : "true",
      onclick: function (e) {
        if (!phoneOk) {
          e.preventDefault();
          self.showNotice("Call and text will work once a phone number is added in the widget config. Do not invent a number — confirm the number Kevin wants used.");
        }
      }
    }, [svg('<svg viewBox="0 0 24 24"><path d="M4 5h16v11H8l-4 4V5z"></path></svg>'), "Text me"]);

    var panel = $("div", {
      class: "pre-panel",
      role: "dialog",
      "aria-label": cfg.botName + " chat",
      "aria-modal": "false",
      hidden: "hidden"
    }, [
      $("div", { class: "pre-header" }, [
        $("div", { class: "pre-avatar-wrap" }, [
          $("div", { class: "pre-avatar" }, [avInner]),
          $("span", { class: "pre-dot", title: "Online" })
        ]),
        $("div", { class: "pre-head-text" }, [
          $("div", { class: "pre-name", text: cfg.botName }),
          $("div", { class: "pre-sub", text: cfg.botTitle })
        ]),
        logo,
        closeBtn
      ]),
      messages,
      $("div", { class: "pre-composer" }, [
        $("div", { class: "pre-input-row" }, [
          $("div", { class: "pre-field" }, [input, micBtn]),
          sendBtn
        ])
      ]),
      $("div", { class: "pre-cta-row" }, [call, textMe]),
      $("div", { class: "pre-footer", text: "Powered by " + cfg.poweredBy })
    ]);

    this.root.appendChild(panel);
    this.root.appendChild(launcher);
    this.ui.panel = panel;
    this.ui.launcher = launcher;
    this.ui.messages = messages;
    this.ui.input = input;
    this.ui.mic = micBtn;
    this.ui.send = sendBtn;
  };

  Widget.prototype.bindGlobal = function () {
    var self = this;
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && self.state.open) self.close();
    });
  };

  Widget.prototype.showNotice = function (msg) {
    this.state.notice = msg;
    this.renderMessages();
    var self = this;
    setTimeout(function () {
      if (self.state.notice === msg) {
        self.state.notice = "";
        self.renderMessages();
      }
    }, 6000);
  };

  Widget.prototype.open = function () {
    this.state.open = true;
    this.ui.panel.classList.add("is-open");
    this.ui.panel.removeAttribute("hidden");
    this.ui.launcher.classList.add("is-open");
    this.ui.launcher.setAttribute("aria-expanded", "true");
    this.ui.launcher.setAttribute("aria-label", "Close chat");
    var self = this;
    setTimeout(function () { self.ui.input && self.ui.input.focus(); }, 50);
    this.scrollToEnd();
  };

  Widget.prototype.close = function () {
    this.state.open = false;
    this.ui.panel.classList.remove("is-open");
    this.ui.panel.setAttribute("hidden", "hidden");
    this.ui.launcher.classList.remove("is-open");
    this.ui.launcher.setAttribute("aria-expanded", "false");
    this.ui.launcher.setAttribute("aria-label", "Open chat");
    this.stopMic();
  };

  Widget.prototype.toggle = function () {
    if (this.state.open) this.close();
    else this.open();
  };

  Widget.prototype.reset = function () {
    this.state.messages = [];
    this.state.flow = null;
    this.state.step = null;
    this.state.home = { area: null, budget: null, beds: null, timeline: null };
    this.state.fthb = { timeline: null, preapproval: null };
    this.state.lead = { name: "", email: "", phone: "" };
    this.state.leadAfter = null;
    this.greet();
  };

  Widget.prototype.greet = function () {
    this.pushBot({
      text: this.cfg.greeting,
      chips: starterChips()
    }, true);
  };

  Widget.prototype.nextId = function () {
    this._id += 1;
    return "m" + this._id;
  };

  Widget.prototype.pushUser = function (text) {
    this.state.messages.push({ id: this.nextId(), role: "user", text: text });
    this.renderMessages();
    this.scrollToEnd();
  };

  Widget.prototype.pushBot = function (msg, immediate) {
    var self = this;
    var payload = Object.assign({ id: this.nextId(), role: "bot" }, msg);
    if (immediate) {
      this.state.messages.push(payload);
      this.state.typing = false;
      this.renderMessages();
      this.scrollToEnd();
      return;
    }
    this.state.typing = true;
    this.renderMessages();
    this.scrollToEnd();
    var delay = 450 + Math.min(800, String(msg.text || "").length * 8);
    setTimeout(function () {
      self.state.typing = false;
      self.state.messages.push(payload);
      self.renderMessages();
      self.scrollToEnd();
    }, delay);
  };

  Widget.prototype.avatarNode = function (cls) {
    var cfg = this.cfg;
    var wrap = $("div", { class: cls });
    if (cfg.avatarUrl) wrap.appendChild($("img", { src: cfg.avatarUrl, alt: "" }));
    else wrap.textContent = initials(cfg);
    return wrap;
  };

  Widget.prototype.renderMessages = function () {
    var self = this;
    var box = this.ui.messages;
    box.innerHTML = "";
    if (this.state.notice) {
      box.appendChild($("div", { class: "pre-note", role: "status", text: this.state.notice }));
    }
    this.state.messages.forEach(function (m) {
      if (m.role === "user") {
        box.appendChild(
          $("div", { class: "pre-row pre-row--user" }, [
            $("div", { class: "pre-bubble pre-bubble--user", text: m.text })
          ])
        );
        return;
      }
      var bubbleKids = [];
      if (m.text) bubbleKids.push(document.createTextNode(m.text));
      if (m.links && m.links.length) {
        var links = $("div", { class: "pre-links" });
        m.links.forEach(function (l) {
          var isPhone = /^(tel|sms):/i.test(l.href || "");
          var attrs = { class: "pre-link", href: l.href };
          if (!isPhone) {
            attrs.target = "_blank";
            attrs.rel = "noopener noreferrer";
          }
          links.appendChild($("a", attrs, [l.label + (isPhone ? "" : " ↗")]));
        });
        bubbleKids.push(links);
      }
      if (m.form) bubbleKids.push(self.renderLeadForm(m));
      if (m.chips && m.chips.length) {
        var chips = $("div", { class: "pre-chips" });
        m.chips.forEach(function (c) {
          if (c.group) {
            chips.appendChild($("div", { class: "pre-chip pre-chip--group", text: c.label }));
            return;
          }
          var btn = $("button", {
            class: "pre-chip",
            type: "button",
            dataset: { id: c.id },
            onclick: function () { self.onChip(c, m); }
          });
          if (c.icon && ICONS()[c.icon]) {
            var ic = svg(ICONS()[c.icon]);
            btn.appendChild(ic);
          }
          btn.appendChild(document.createTextNode(c.label));
          chips.appendChild(btn);
        });
        bubbleKids.push(chips);
      }
      box.appendChild(
        $("div", { class: "pre-row" }, [
          self.avatarNode("pre-mini-av"),
          $("div", { class: "pre-bubble pre-bubble--bot" }, bubbleKids)
        ])
      );
    });
    if (this.state.typing) {
      box.appendChild(
        $("div", { class: "pre-row" }, [
          this.avatarNode("pre-mini-av"),
          $("div", { class: "pre-bubble pre-bubble--bot pre-typing" }, [
            $("i"), $("i"), $("i")
          ])
        ])
      );
    }
  };

  Widget.prototype.renderLeadForm = function (/* msg */) {
    var self = this;
    var lead = this.state.lead;
    var form = $("form", { class: "pre-form" });
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var name = form.querySelector('[name="name"]').value.trim();
      var email = form.querySelector('[name="email"]').value.trim();
      var phone = form.querySelector('[name="phone"]').value.trim();
      if (!name || !email || !phone) {
        self.showNotice("Please add a name, email, and phone so Kevin can follow up.");
        return;
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        self.showNotice("That email doesn't look quite right. Want to try again?");
        return;
      }
      self.state.lead = { name: name, email: email, phone: phone };
      self.pushUser("Name: " + name + " · " + email + " · " + prettyPhone(phone));
      self.submitLead();
    });
    form.appendChild($("label", { text: "Name" }));
    form.appendChild($("input", { name: "name", type: "text", required: true, value: lead.name, autocomplete: "name" }));
    form.appendChild($("label", { text: "Email" }));
    form.appendChild($("input", { name: "email", type: "email", required: true, value: lead.email, autocomplete: "email" }));
    form.appendChild($("label", { text: "Phone" }));
    form.appendChild($("input", { name: "phone", type: "tel", required: true, value: lead.phone, autocomplete: "tel" }));
    form.appendChild($("button", { class: "pre-form-go", type: "submit", text: "Send to Kevin" }));
    return form;
  };

  Widget.prototype.scrollToEnd = function () {
    var box = this.ui.messages;
    if (!box) return;
    setTimeout(function () { box.scrollTop = box.scrollHeight; }, 30);
  };

  Widget.prototype.onChip = function (chip) {
    if (chip.id.indexOf("flow:") === 0) {
      this.pushUser(chip.label);
      this.startFlow(chip.id.slice(5));
      return;
    }
    if (chip.id.indexOf("area:") === 0) {
      this.pushUser(chip.label);
      this.homeSetArea(chip.id === "area:unsure" ? { name: "Not sure yet", path: "/property-search/results/" } : ALL_AREAS.filter(function (a) { return "area:" + a.path === chip.id; })[0]);
      return;
    }
    if (chip.id.indexOf("budget:") === 0) {
      this.pushUser(chip.label);
      this.homeSetBudget(chip.label);
      return;
    }
    if (chip.id.indexOf("beds:") === 0) {
      this.pushUser(chip.label);
      this.homeSetBeds(chip.label);
      return;
    }
    if (chip.id.indexOf("time:") === 0) {
      this.pushUser(chip.label);
      this.homeSetTimeline(chip.label);
      return;
    }
    if (chip.id.indexOf("fthb-time:") === 0) {
      this.pushUser(chip.label);
      this.fthbSetTimeline(chip.label);
      return;
    }
    if (chip.id.indexOf("fthb-pre:") === 0) {
      this.pushUser(chip.label);
      this.fthbSetPreapproval(chip.label);
      return;
    }
    if (chip.id === "lead:yes") {
      this.pushUser("Yes, have Kevin follow up");
      this.startLead();
      return;
    }
    if (chip.id === "lead:no") {
      this.pushUser("No thanks");
      this.pushBot({
        text: "No problem. I'm here if you have another question, or you can keep browsing the links above.",
        chips: starterChips()
      });
      return;
    }
    if (chip.id === "more:home") {
      this.pushUser("Help me find a home");
      this.startFlow("home");
    }
  };

  Widget.prototype.startFlow = function (name) {
    this.state.flow = name;
    if (name === "home") {
      this.state.home = { area: null, budget: null, beds: null, timeline: null };
      this.state.step = "area";
      this.pushBot({
        text: "Happy to help you look. Which area are you most interested in? You can pick one below or type a town name.",
        chips: areaChipList()
      });
      return;
    }
    if (name === "value") {
      this.state.step = "value";
      this.pushBot({
        text: "For a home-value estimate, the site points sellers to GuessItImateNoMore. You can run an estimate there, and there's also a Portland pricing-strategy guide if you want the bigger picture.",
        links: [
          { label: "Get a home-value estimate", href: this.cfg.homeValueUrl },
          { label: "How to price your home to sell", href: pathUrl(this.cfg, "/blog/how-to-price-your-home-to-sell-the-ultimate-portland-seller-strategy/") }
        ],
        chips: [
          { id: "lead:yes", label: "Have Kevin walk me through it" },
          { id: "lead:no", label: "Just browsing" }
        ]
      });
      return;
    }
    if (name === "relocating") {
      this.state.step = "relocating";
      this.pushBot({
        text: "Kevin wrote a local Portland relocation guide — neighborhood and suburb profiles, everyday spots, and practical move details. The guide page also notes that he completed the Relocation Certification held by Revenos. You can read a preview there and open the full guide.",
        links: [
          { label: "Portland Relocation Guide", href: pathUrl(this.cfg, this.cfg.relocatingPath) }
        ],
        chips: [
          { id: "more:home", label: "Help me pick an area to search" },
          { id: "lead:yes", label: "Have Kevin help with my move" },
          { id: "lead:no", label: "Just browsing" }
        ]
      });
      return;
    }
    if (name === "probate") {
      this.state.step = "probate";
      this.pushBot({
        text: "If you're handling an inherited home, Kevin offers personal-representative support: options for the property, preparation, and sale decisions. That's real estate guidance, not legal advice — probate legal questions belong with an attorney. There's also a Portland probate-properties resource if you're looking at this kind of inventory.",
        links: [
          { label: "Personal representative support", href: pathUrl(this.cfg, this.cfg.probateOnsitePath) },
          { label: "Portland probate properties", href: this.cfg.probateUrl }
        ],
        chips: [
          { id: "lead:yes", label: "Have Kevin get in touch" },
          { id: "lead:no", label: "Just browsing" }
        ]
      });
      return;
    }
    if (name === "senior") {
      this.state.step = "senior";
      this.pushBot({
        text: "Kevin helps families coordinate a senior housing transition — placement, the home sale, belongings, and the move, shaped around the older adult's wishes. The site notes that senior-living placement guidance is free to families; participating care providers pay a referral fee. Housing, care, real estate, and third-party services have separate costs.",
        links: [
          { label: "Senior housing transition", href: pathUrl(this.cfg, this.cfg.seniorOnsitePath) },
          { label: "Portland senior transition resource", href: this.cfg.seniorUrl }
        ],
        chips: [
          { id: "lead:yes", label: "Have Kevin get in touch" },
          { id: "lead:no", label: "Just browsing" }
        ]
      });
      return;
    }
    if (name === "fthb") {
      this.state.fthb = { timeline: null, preapproval: null };
      this.state.leadAfter = "First home? Keep your down-payment";
      this.state.step = "fthb-timeline";
      this.pushBot({
        text: "Happy to help you look at first-time buyer financing and down-payment assistance. Kevin helps first-time buyers explore grants, down-payment assistance, and loan options that may include little or no down payment — availability, eligibility, closing costs, and lender approval vary, and Kevin is not the lender. What's your timeline for buying?",
        chips: TIMELINES.map(function (b) { return { id: "fthb-time:" + b, label: b }; })
      });
      return;
    }
    if (name === "talk") {
      this.state.leadAfter = "Talk to Kevin now";
      this.state.step = "talk";
      var phoneOk = !!digitsPhone(this.cfg.phoneNumber);
      var talkText = phoneOk
        ? "You can call or text Kevin now at " + prettyPhone(this.cfg.phoneNumber) + ". Use Call me or Text me below, or the links here. If you'd rather have him reach out, I can take your name, email, and phone."
        : "Call and text aren't configured yet. I can take your name so Kevin can follow up, or you can use the contact page.";
      var talkLinks = phoneOk
        ? [
            { label: "Call " + prettyPhone(this.cfg.phoneNumber), href: telHref(this.cfg.phoneNumber) },
            { label: "Text " + prettyPhone(this.cfg.phoneNumber), href: smsHref(this.cfg.phoneNumber) }
          ]
        : [{ label: "Contact page", href: pathUrl(this.cfg, "/contact/") }];
      this.pushBot({
        text: talkText,
        links: talkLinks,
        chips: [
          { id: "lead:yes", label: "Have Kevin call me back" },
          { id: "lead:no", label: "I'll reach out myself" }
        ]
      });
    }
  };

  Widget.prototype.homeSetArea = function (area) {
    this.state.home.area = area || { name: "Not sure yet", path: "/property-search/results/" };
    this.state.step = "budget";
    this.pushBot({
      text: "Got it — " + this.state.home.area.name + ". What's a comfortable budget range?",
      chips: BUDGETS.map(function (b) { return { id: "budget:" + b, label: b }; })
    });
  };

  Widget.prototype.homeSetBudget = function (budget) {
    this.state.home.budget = budget;
    this.state.step = "beds";
    this.pushBot({
      text: "And how many bedrooms do you need?",
      chips: BEDS.map(function (b) { return { id: "beds:" + b, label: b }; })
    });
  };

  Widget.prototype.homeSetBeds = function (beds) {
    this.state.home.beds = beds;
    this.state.step = "timeline";
    this.pushBot({
      text: "What's your timeline?",
      chips: TIMELINES.map(function (b) { return { id: "time:" + b, label: b }; })
    });
  };

  Widget.prototype.homeSetTimeline = function (timeline) {
    this.state.home.timeline = timeline;
    this.state.step = "home-done";
    var h = this.state.home;
    var links = [];
    if (h.area && h.area.path && h.area.path !== "/property-search/results/") {
      links.push({ label: h.area.name + " area guide", href: pathUrl(this.cfg, h.area.path) });
    } else {
      links.push({ label: "Explore communities", href: pathUrl(this.cfg, "/communities/") });
    }
    links.push({ label: "Search homes", href: pathUrl(this.cfg, "/property-search/results/") });
    this.pushBot({
      text:
        "Here's a starting point for " +
        (h.area ? h.area.name : "the Portland area") +
        ", " +
        h.budget +
        ", " +
        h.beds +
        " bedrooms, timeline: " +
        h.timeline +
        ". I can send you to the matching area guide and the site's home search. (Search filters for budget and beds would be applied later if this is wired into Sierra's search.)",
      links: links,
      chips: [
        { id: "lead:yes", label: "Have Kevin follow up with homes" },
        { id: "lead:no", label: "I'll browse on my own" }
      ]
    });
  };

  Widget.prototype.fthbSetTimeline = function (timeline) {
    this.state.fthb.timeline = timeline;
    this.state.step = "fthb-pre";
    this.pushBot({
      text: "Got it — " + timeline + ". Are you already pre-approved for a mortgage?",
      chips: [
        { id: "fthb-pre:yes", label: "Yes, pre-approved" },
        { id: "fthb-pre:working", label: "Working on it" },
        { id: "fthb-pre:notyet", label: "Not yet" },
        { id: "fthb-pre:unsure", label: "Not sure" }
      ]
    });
  };

  Widget.prototype.fthbSetPreapproval = function (preapproval) {
    this.state.fthb.preapproval = preapproval;
    this.state.step = "fthb-done";
    this.pushBot({
      text: "Thanks. For Oregon buyers, some conventional loans can start around 3% down, FHA around 3.5%, and eligible VA or USDA loans may be 0% down — but that is not a universal minimum, and a lender has to run your numbers. Cash to close also includes closing costs, which commonly run about 2% to 5% of the price. OHCS Flex Lending can sometimes pair a first mortgage with assistance that may cover up to 100% of cash to close. Kevin's guide walks through the options, and there's a preferred-vendors list if you want lending contacts.",
      links: [
        { label: "Low- to no-down-payment loans", href: pathUrl(this.cfg, this.cfg.financingPath) },
        { label: "2026 NextGen homebuyer report", href: pathUrl(this.cfg, this.cfg.nextgenPath) },
        { label: "Preferred vendors (lending)", href: pathUrl(this.cfg, this.cfg.lendingVendorsPath) },
        { label: "USDA-qualified homes", href: pathUrl(this.cfg, this.cfg.usdaSearchPath) }
      ],
      chips: [
        { id: "lead:yes", label: "Have Kevin follow up" },
        { id: "more:home", label: "See homes for sale" },
        { id: "lead:no", label: "I'll browse on my own" }
      ]
    });
  };

  Widget.prototype.startLead = function () {
    this.state.flow = "lead";
    this.state.step = "lead";
    this.pushBot({
      text: "I can collect a name, email, and phone so Kevin can follow up. This prototype will not send your information anywhere until a lead destination is configured.",
      form: true
    });
  };

  Widget.prototype.submitLead = function () {
    var self = this;
    var lead = this.state.lead;
    var payload = {
      source: "portlandrealestate.guide-chat-widget",
      name: lead.name,
      email: lead.email,
      phone: lead.phone,
      topic: this.state.leadAfter || this.state.home.area || this.state.step,
      homeSearch: this.state.home,
      pageUrl: global.location && global.location.href,
      capturedAt: new Date().toISOString(),
      transcript: this.state.messages
        .filter(function (m) { return m.role === "user" || m.role === "bot"; })
        .map(function (m) { return { role: m.role, text: m.text || "" }; })
    };

    var url = this.cfg.leadWebhookUrl;
    if (!isUsableUrl(url)) {
      this.pushBot({
        text:
          "Thanks, " +
          lead.name +
          ". I have your info in this chat only — nothing was sent. When a lead webhook is added to the widget config (for example, later to Cloze CRM), this is where it would go.",
        chips: starterChips()
      });
      this.state.flow = null;
      return;
    }

    this.pushBot({ text: "Thanks, " + lead.name + ". Sending your note through now…" }, true);
    fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      mode: "cors",
      credentials: "omit"
    })
      .then(function (res) {
        if (!res.ok) throw new Error("bad status");
        self.pushBot({
          text: "All set — Kevin can follow up with you. I'm here if you have another question.",
          chips: starterChips()
        });
      })
      .catch(function () {
        self.pushBot({
          text: "I couldn't reach the lead destination just now. Please use the contact page, or try Call me / Text me if a number is configured.",
          links: [{ label: "Contact page", href: pathUrl(self.cfg, "/contact/") }],
          chips: starterChips()
        });
      });
    this.state.flow = null;
  };

  Widget.prototype.submitInput = function () {
    var raw = (this.ui.input.value || "").trim();
    if (!raw) return;
    this.ui.input.value = "";
    this.pushUser(raw);
    this.handleText(raw);
  };

  Widget.prototype.handleText = function (text) {
    var self = this;
    if (this.state.flow === "home" && this.state.step === "area") {
      var area = matchArea(text);
      if (area) { this.homeSetArea(area); return; }
      if (/not sure|anywhere|all (homes|areas)|open|flexible|don'?t know/.test(text.toLowerCase())) {
        this.homeSetArea({ name: "Not sure yet", path: "/property-search/results/" });
        return;
      }
      this.pushBot({
        text: "I may not have a dedicated page for that exact name. You can pick an area below, or choose “Not sure yet” and we'll use the main home search.",
        chips: areaChipList()
      });
      return;
    }
    if (this.state.flow === "home" && this.state.step === "budget") {
      this.homeSetBudget(text);
      return;
    }
    if (this.state.flow === "home" && this.state.step === "beds") {
      this.homeSetBeds(text);
      return;
    }
    if (this.state.flow === "home" && this.state.step === "timeline") {
      this.homeSetTimeline(text);
      return;
    }
    if (this.state.flow === "fthb" && this.state.step === "fthb-timeline") {
      this.fthbSetTimeline(normalizeFthbTimeline(text));
      return;
    }
    if (this.state.flow === "fthb" && this.state.step === "fthb-pre") {
      this.fthbSetPreapproval(normalizeFthbPreapproval(text));
      return;
    }

    var intent = intentOf(text);
    if (intent) {
      this.startFlow(intent);
      return;
    }

    var areaOnly = matchArea(text);
    if (areaOnly && /live|look|buy|move|area|neighborhood|home|house|in /.test(text.toLowerCase())) {
      this.state.flow = "home";
      this.homeSetArea(areaOnly);
      return;
    }

    if (isUsableUrl(this.cfg.apiUrl)) {
      this.callAi(text);
      return;
    }

    var faq = faqMatch(text, this.cfg);
    if (faq) {
      faq.chips = starterChips();
      this.pushBot(faq);
      return;
    }

    this.pushBot({
      text: "I don't have a scripted answer for that yet, and an AI backend isn't configured. I can help with homes for sale, a value estimate, first-time buyer financing and down-payment assistance, moving to Portland, selling a home in probate, or helping a parent downsize — or you can talk to Kevin now.",
      chips: starterChips().concat([{ id: "lead:yes", label: "Leave my contact info" }])
    });
  };

  Widget.prototype.callAi = function (text) {
    var self = this;
    this.state.typing = true;
    this.renderMessages();
    var history = this.state.messages.slice(-12).map(function (m) {
      return { role: m.role === "user" ? "user" : "assistant", content: m.text || "" };
    });
    fetch(this.cfg.apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: text,
        history: history,
        pageUrl: global.location && global.location.href,
        source: "portlandrealestate.guide-chat-widget"
      }),
      mode: "cors",
      credentials: "omit"
    })
      .then(function (res) { return res.json().then(function (j) { return { ok: res.ok, j: j }; }); })
      .then(function (out) {
        self.state.typing = false;
        var j = out.j || {};
        var reply = j.reply || j.message || (j.replies && j.replies[0]) || "";
        if (!out.ok || !reply) throw new Error("empty");
        var chips = Array.isArray(j.chips) && j.chips.length ? j.chips : starterChips();
        if (j.suggestLead) {
          chips = chips.concat([
            { id: "lead:yes", label: "Have Kevin follow up" },
            { id: "lead:no", label: "Just browsing" }
          ]);
        }
        var links = Array.isArray(j.links) ? j.links.filter(function (l) {
          return l && isUsableUrl(l.href) && l.label;
        }) : [];
        self.pushBot({ text: String(reply), links: links, chips: chips }, true);
      })
      .catch(function () {
        self.state.typing = false;
        self.pushBot({
          text: "I couldn't reach the AI assistant just now. I can still help with the main topics below, or you can use the contact page.",
          links: [{ label: "Contact page", href: pathUrl(self.cfg, "/contact/") }],
          chips: starterChips()
        }, true);
      });
  };

  Widget.prototype.toggleMic = function () {
    var Speech = global.SpeechRecognition || global.webkitSpeechRecognition;
    if (!Speech) {
      this.showNotice("Voice input isn't available in this browser. You can type your question instead.");
      return;
    }
    if (this.state.listening) {
      this.stopMic();
      return;
    }
    var self = this;
    var rec = new Speech();
    rec.lang = "en-US";
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    rec.onresult = function (e) {
      var t = e.results && e.results[0] && e.results[0][0] && e.results[0][0].transcript;
      if (t) {
        self.ui.input.value = t;
        self.submitInput();
      }
    };
    rec.onerror = function () { self.stopMic(); };
    rec.onend = function () { self.stopMic(); };
    this.recognition = rec;
    this.state.listening = true;
    this.ui.mic.classList.add("is-on");
    this.ui.mic.setAttribute("aria-label", "Stop listening");
    try { rec.start(); } catch (err) { this.stopMic(); }
  };

  Widget.prototype.stopMic = function () {
    if (this.recognition) {
      try { this.recognition.stop(); } catch (e) {}
      this.recognition = null;
    }
    this.state.listening = false;
    if (this.ui.mic) {
      this.ui.mic.classList.remove("is-on");
      this.ui.mic.setAttribute("aria-label", "Speak a question");
    }
  };

  function init() {
    if (document.getElementById("pre-chat-root")) return;
    var cfg = readConfig();
    var w = new Widget(cfg);
    w.mount();
    global.PREChat = {
      open: function () { w.open(); },
      close: function () { w.close(); },
      toggle: function () { w.toggle(); },
      reset: function () { w.reset(); },
      config: cfg,
      _widget: w
    };
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})(window);
