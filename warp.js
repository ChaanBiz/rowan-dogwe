/* ==========================================================================
   warp.js: theme switch + "follow the signal" page transition
   --------------------------------------------------------------------------
   One continuous shot, no cuts, in the current theme:
   1. A signal charges at the top pin of the chip on this page.
   2. The page dissolves into its own circuit board; only the chip and the
      signal remain. The signal leaves the pin and the camera follows it
      along one trace, turning with every bend, through logic gates.
   3. The next page loads mid-flight. The signal slows down, the camera
      settles, and the trace runs into a pin of the real chip on the new
      page, at its exact position on screen. The pins light up and the
      board fades away around it, leaving the new page.
   ========================================================================== */
(function () {
  "use strict";

  var KEY = "rpd-warp", SND = "rpd-snd", THEME = "rpd-theme";
  var reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  var root = document.documentElement;

  var PAGES = {
    "index.html":         { idx: "0x00", label: "Home",                     html: "Home" },
    "personal-info.html": { idx: "0x01", label: "Personal Info",            html: "Personal <i>Info</i>" },
    "about.html":         { idx: "0x02", label: "About Me",                 html: "About <i>Me</i>" },
    "education.html":     { idx: "0x03", label: "Education & Achievements", html: "Education <i>&amp; Achievements</i>" },
    "family.html":        { idx: "0x04", label: "Family",                   html: "My <i>Family</i>" }
  };
  function fileOf(href) { var p = new URL(href, location.href).pathname.split("/").pop(); return p || "index.html"; }
  function pageOf(href) { return PAGES[fileOf(href)] || { idx: "0x??", label: "Next page", html: "Next page" }; }

  /* ---------- tiny math ---------- */
  function rng(seed) {
    return function () {
      seed |= 0; seed = seed + 0x6D2B79F5 | 0;
      var t = Math.imul(seed ^ seed >>> 15, 1 | seed);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function eIn(t) { return t * t * t; }
  function eOut(t) { return 1 - Math.pow(1 - t, 3); }
  function eInOut(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
  function lookAngle(rt, d, ahead) { var p0 = rt.at(d), p1 = rt.at(d + ahead), p2 = rt.at(d + ahead * 2); return Math.atan2((p1.y - p0.y) + (p2.y - p1.y) * 0.6, (p1.x - p0.x) + (p2.x - p1.x) * 0.6); }
  function angTo(a, b, k) { var d = Math.atan2(Math.sin(b - a), Math.cos(b - a)); return a + d * k; }

  /* ======================================================================
     THEME (light by default; the choice is kept for the whole visit)
     ====================================================================== */
  function theme() { return root.getAttribute("data-theme") === "dark" ? "dark" : "light"; }
  function syncButtons() {
    var dark = theme() === "dark";
    document.querySelectorAll("[data-theme-toggle]").forEach(function (b) {
      b.setAttribute("aria-pressed", String(dark));
      b.setAttribute("aria-label", dark ? "Switch to light mode" : "Switch to dark mode");
      var t = b.querySelector(".txt"); if (t) t.textContent = dark ? "Light" : "Dark";
    });
    var m = document.querySelector('meta[name="theme-color"]'); if (m) m.setAttribute("content", dark ? "#0b0b0c" : "#fbfaf6");
  }
  function setTheme(t) {
    root.setAttribute("data-theme", t);
    try { localStorage.setItem(THEME, t); } catch (e) {}
    syncButtons();
    window.dispatchEvent(new CustomEvent("rpd:theme", { detail: { theme: t } }));
  }
  function toggleTheme(btn) {
    var next = theme() === "dark" ? "light" : "dark", r = btn.getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + r.height / 2;
    if (document.startViewTransition && !reduce) {
      var vt = document.startViewTransition(function () { setTheme(next); });
      vt.ready.then(function () {
        var R = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
        root.animate({ clipPath: ["circle(0px at " + x + "px " + y + "px)", "circle(" + R + "px at " + x + "px " + y + "px)"] },
          { duration: 700, easing: "cubic-bezier(.6, 0, .25, 1)", pseudoElement: "::view-transition-new(root)" });
      }).catch(function () {});
    } else setTheme(next);
  }
  document.querySelectorAll("[data-theme-toggle]").forEach(function (b) {
    b.addEventListener("click", function (e) { e.stopPropagation(); toggleTheme(b); });
  });
  syncButtons();

  /* colours of the world inside the transition, per theme */
  var P;
  function palette() {
    return theme() === "dark" ? {
      dark: true, bg: "11,11,12", line: "226,187,98", lineA: [0.13, 0.18, 0.24], main: "rgba(226,187,98,0.5)",
      silk: "226,187,98", fill: "rgba(14,14,14,0.96)", pin: "#c9a063", op: "lighter", core: "#fffaf0",
      trailOut: "217,160,60", trailIn: "255,236,190", streak: "241,211,138", near: "rgba(226,187,98,0.9)",
      dot: "rgba(217,173,79,0.18)", grid: "rgba(217,173,79,0.05)", one: "#f1d38a", zero: "#a07a2c", ring: "241,211,138", glowA: 1
    } : {
      dark: false, bg: "251,250,246", line: "17,17,17", lineA: [0.1, 0.14, 0.19], main: "rgba(17,17,17,0.5)",
      silk: "17,17,17", fill: "rgba(255,255,255,0.97)", pin: "#111111", op: "source-over", core: "#7a5418",
      trailOut: "226,187,98", trailIn: "176,131,39", streak: "17,17,17", near: "rgba(17,17,17,0.9)",
      dot: "rgba(17,17,17,0.14)", grid: "rgba(17,17,17,0.035)", one: "#b08327", zero: "#1a1a1a", ring: "176,131,39", glowA: 0.85
    };
  }

  /* ---------- overlay ---------- */
  var box, cv, g, hud, W, H, D, el = {}, SPR = {};
  function mount() {
    if (box) return;
    box = document.createElement("div"); box.id = "warp"; box.setAttribute("aria-hidden", "true");
    box.innerHTML =
      '<canvas></canvas><div class="whud">' +
        '<div class="w-row w-top"><span class="w-dim">RPD-2026 &middot; <span class="w-gold">Signal route</span><br><span class="w-hide-sm" data-w="path"></span></span>' +
        '<span class="w-freq"><b data-w="freq">4.20<small>GHz</small></b><span class="w-dim" data-w="sub">Clock</span></span></div>' +
        '<div class="w-dest"><span data-w="idx"></span><b data-w="label"></b></div>' +
        '<div class="w-row w-bot"><span class="w-dim w-addr" data-w="addr">ADDR 0x0000</span>' +
        '<span class="w-dim w-hide-sm" style="text-align:right">Trace<span class="w-bar"><i data-w="bar"></i></span></span></div>' +
      '</div>';
    root.appendChild(box);
    cv = box.querySelector("canvas"); g = cv.getContext("2d"); hud = box.querySelector(".whud");
    box.querySelectorAll("[data-w]").forEach(function (n) { el[n.getAttribute("data-w")] = n; });
    size(); addEventListener("resize", size);
    P = palette(); sprites();
  }
  function size() { if (!cv) return; D = Math.min(1.5, window.devicePixelRatio || 1); W = innerWidth; H = innerHeight; cv.width = Math.round(W * D); cv.height = Math.round(H * D); }
  function unmount() { if (box) { box.remove(); box = null; } removeEventListener("resize", size); last = {}; }

  var last = {};
  var lastHud = 0;
  function hudDue(now) { if (now - lastHud < 70) return false; lastHud = now; return true; }
  function setText(k, v, html) { if (last[k] === v) return; last[k] = v; if (html) el[k].innerHTML = v; else el[k].textContent = v; }
  function fmtF(hz) {
    var u = ["Hz", "kHz", "MHz", "GHz", "THz"], i = 0;
    while (hz >= 1000 && i < 4) { hz /= 1000; i++; }
    return (hz < 10 ? hz.toFixed(2) : hz < 100 ? hz.toFixed(1) : hz.toFixed(0)) + "<small>" + u[i] + "</small>";
  }
  function scramble(text, p) {
    var n = Math.floor(text.length * p), out = "";
    for (var i = 0; i < text.length; i++) out += i < n || text[i] === " " ? text[i] : (Math.random() < 0.5 ? "0" : "1");
    return out;
  }

  function sprite(w, h, fn) { var c = document.createElement("canvas"); c.width = w; c.height = h; fn(c.getContext("2d")); return c; }
  function sprites() {
    SPR.glow = sprite(160, 160, function (c) {
      var r = c.createRadialGradient(80, 80, 0, 80, 80, 80);
      if (P.dark) { r.addColorStop(0, "rgba(255,246,220,1)"); r.addColorStop(0.12, "rgba(255,214,130,0.85)"); r.addColorStop(0.4, "rgba(217,160,60,0.22)"); r.addColorStop(1, "rgba(217,160,60,0)"); }
      else { r.addColorStop(0, "rgba(176,131,39,0.95)"); r.addColorStop(0.14, "rgba(226,187,98,0.7)"); r.addColorStop(0.42, "rgba(226,187,98,0.18)"); r.addColorStop(1, "rgba(226,187,98,0)"); }
      c.fillStyle = r; c.fillRect(0, 0, 160, 160);
    });
    ["0", "1"].forEach(function (ch) {
      SPR["d" + ch] = sprite(32, 32, function (c) {
        c.font = "600 22px 'JetBrains Mono', monospace"; c.textAlign = "center"; c.textBaseline = "middle";
        if (P.dark) { c.shadowColor = "rgba(217,173,79,0.9)"; c.shadowBlur = 6; }
        c.fillStyle = ch === "1" ? P.one : P.zero; c.fillText(ch, 16, 17);
      });
      SPR["b" + ch] = sprite(120, 120, function (c) {
        c.font = "500 80px 'JetBrains Mono', monospace"; c.textAlign = "center"; c.textBaseline = "middle";
        c.filter = "blur(5px)"; c.fillStyle = P.near; c.fillText(ch, 60, 64);
      });
    });
    SPR.dots = g.createPattern(sprite(56, 56, function (c) {
      c.fillStyle = P.dot; c.fillRect(27, 27, 2, 2);
      c.fillStyle = P.grid; c.fillRect(0, 28, 56, 1); c.fillRect(28, 0, 1, 56);
    }), "repeat");
  }

  /* ======================================================================
     THE ROUTE: one trace with PCB-style 45/90 degree bends.
     Headings stay in the upper half so the ride always climbs, and after
     `lock` the trace turns straight up into the destination chip.
     ====================================================================== */
  var OFFS = [-60, -48, -36, -24, -12, 12, 24, 36, 48, 60];
  var GATES = ["AND", "OR", "XOR", "NOT", "NAND", "XOR"];
  var LABELS = ["0x7EA", "CLK", "VCC", "GND", "D[7:0]", "A[15:0]", "U12", "U7", "R47", "C21", "0xFF", "BIT 0", "MUX", "ALU", "REG", "0b1011", "IRQ", "PLL", "L1$", "SHL 1"];
  var Q = Math.PI / 4, UP = -Math.PI / 2;
  function Route(seed, lockAt) {
    this.R = rng(seed); this.P = [{ x: 0, y: 0, d: 0 }]; this.A = []; this.items = [];
    this.lock = lockAt == null ? Infinity : lockAt; this.straightFrom = null;
  }
  Route.prototype.extend = function () {
    var P = this.P, A = this.A, R = this.R, p = P[P.length - 1], a, L;
    if (!A.length) { a = UP; L = 380 + R() * 260; }
    else if (p.d >= this.lock) {
      a = UP; L = 8000; if (this.straightFrom == null) this.straightFrom = p.d;
    } else {
      var cur = A[A.length - 1], opts = [];
      [-2, -1, 1, 2].forEach(function (k) { var n = cur + k * Q; if (n >= -Math.PI - 1e-6 && n <= 1e-6) for (var w = 0; w < (Math.abs(k) === 1 ? 3 : 1); w++) opts.push(n); });
      a = opts[Math.floor(R() * opts.length)]; L = 300 + R() * 520;
    }
    var q = { x: p.x + Math.cos(a) * L, y: p.y + Math.sin(a) * L, d: p.d + L };
    A.push(a); P.push(q);
    if (p.d < this.lock && A.length > 1) this.decorate(p, a, L);
  };
  Route.prototype.ensure = function (d) { while (this.P[this.P.length - 1].d < d + 3200) this.extend(); };
  Route.prototype.at = function (d) {
    this.ensure(d);
    var P = this.P, lo = 0, hi = P.length - 2;
    while (lo < hi) { var m = (lo + hi + 1) >> 1; if (P[m].d <= d) lo = m; else hi = m - 1; }
    var a = this.A[lo], t = d - P[lo].d;
    return { x: P[lo].x + Math.cos(a) * t, y: P[lo].y + Math.sin(a) * t, a: a, i: lo };
  };
  Route.prototype.decorate = function (p, a, L) {
    var R = this.R, it = this.items, ca = Math.cos(a), sa = Math.sin(a), nx = -sa, ny = ca;
    var n = 2 + Math.floor(R() * 3);
    for (var k = 0; k < n; k++) {
      var t = 0.1 + R() * 0.8, side = R() < 0.5 ? -1 : 1, off = side * (110 + R() * 300), r = R();
      it.push({
        type: r < 0.34 ? "ic" : r < 0.56 ? "res" : r < 0.68 ? "cap" : r < 0.82 ? "via" : "text",
        x: p.x + ca * L * t + nx * off, y: p.y + sa * L * t + ny * off, a: a, d: p.d + L * t,
        w: 46 + R() * 96, h: 34 + R() * 64, pins: 3 + Math.floor(R() * 6), label: LABELS[Math.floor(R() * LABELS.length)]
      });
    }
    if (L > 420 && R() < 0.7) {
      var tg = 0.45 + R() * 0.2, kind = GATES[Math.floor(R() * GATES.length)], i1 = R() < 0.5 ? 1 : 0, i2 = R() < 0.5 ? 1 : 0;
      it.push({ type: "gate", kind: kind, i1: i1, i2: i2, out: gateOut(kind, i1, i2), x: p.x + ca * L * tg, y: p.y + sa * L * tg, a: a, d: p.d + L * tg, fired: 0 });
    }
  };
  function gateOut(k, a, b) { return k === "AND" ? a & b : k === "OR" ? a | b : k === "XOR" ? a ^ b : k === "NAND" ? 1 - (a & b) : 1 - a; }

  function offPt(rt, i, o) {
    var A = rt.A, n = A.length, a1 = A[Math.max(0, i - 1)], a2 = A[Math.min(n - 1, i)];
    var n1x = -Math.sin(a1), n1y = Math.cos(a1), n2x = -Math.sin(a2), n2y = Math.cos(a2);
    var mx = n1x + n2x, my = n1y + n2y, ml = Math.hypot(mx, my) || 1; mx /= ml; my /= ml;
    var k = o / Math.max(0.35, mx * n1x + my * n1y);
    return [rt.P[i].x + mx * k, rt.P[i].y + my * k];
  }
  function pathRange(rt, o, d0, d1) {
    var a = rt.at(d0), b = rt.at(d1);
    g.beginPath(); g.moveTo(a.x - Math.sin(a.a) * o, a.y + Math.cos(a.a) * o);
    for (var i = a.i + 1; i <= b.i; i++) { var p = offPt(rt, i, o); g.lineTo(p[0], p[1]); }
    g.lineTo(b.x - Math.sin(b.a) * o, b.y + Math.cos(b.a) * o);
  }

  /* ---------- silkscreen ---------- */
  function gatePath(kind) {
    g.beginPath();
    if (kind === "NOT") { g.moveTo(-14, -12); g.lineTo(12, 0); g.lineTo(-14, 12); g.closePath(); g.moveTo(19, 0); g.arc(15.5, 0, 3.5, 0, 6.29); return; }
    if (kind === "AND" || kind === "NAND") { g.moveTo(-16, -13); g.lineTo(0, -13); g.arc(0, 0, 13, -Math.PI / 2, Math.PI / 2); g.lineTo(-16, 13); g.closePath(); if (kind === "NAND") { g.moveTo(20, 0); g.arc(16.5, 0, 3.5, 0, 6.29); } return; }
    g.moveTo(-16, -13); g.quadraticCurveTo(4, -13, 16, 0); g.quadraticCurveTo(4, 13, -16, 13); g.quadraticCurveTo(-8, 0, -16, -13); g.closePath();
    if (kind === "XOR") { g.moveTo(-22, -13); g.quadraticCurveTo(-14, 0, -22, 13); }
  }
  function drawItem(it, now) {
    g.save(); g.translate(it.x, it.y); g.rotate(it.a);
    var s = "rgba(" + P.silk + ",", k;
    if (it.type === "ic") {
      g.fillStyle = P.fill; g.fillRect(-it.w / 2, -it.h / 2, it.w, it.h);
      g.strokeStyle = s + "0.4)"; g.lineWidth = 1.2; g.strokeRect(-it.w / 2, -it.h / 2, it.w, it.h);
      g.fillStyle = s + "0.38)";
      for (k = 0; k < it.pins; k++) { var px = -it.w / 2 + (k + 0.5) * it.w / it.pins - 2; g.fillRect(px, -it.h / 2 - 7, 4, 7); g.fillRect(px, it.h / 2, 4, 7); }
      g.beginPath(); g.arc(-it.w / 2 + 7, -it.h / 2 + 7, 2.2, 0, 6.29); g.fill();
      g.rotate(Math.PI / 2); g.fillStyle = s + "0.55)"; g.font = "500 10px 'JetBrains Mono', monospace"; g.textAlign = "center"; g.fillText(it.label, 0, 4);
    } else if (it.type === "res") {
      g.strokeStyle = s + "0.38)"; g.lineWidth = 1.2; g.strokeRect(-14, -5, 28, 10);
      g.fillStyle = s + "0.32)"; g.fillRect(-24, -4, 8, 8); g.fillRect(16, -4, 8, 8);
    } else if (it.type === "cap") {
      g.strokeStyle = s + "0.38)"; g.lineWidth = 1.6; g.beginPath(); g.moveTo(-3, -10); g.lineTo(-3, 10); g.moveTo(3, -10); g.lineTo(3, 10); g.stroke();
      g.fillStyle = s + "0.3)"; g.fillRect(-14, -3, 8, 6); g.fillRect(6, -3, 8, 6);
    } else if (it.type === "via") {
      g.strokeStyle = s + "0.4)"; g.lineWidth = 2;
      for (k = 0; k < 3; k++) { g.beginPath(); g.arc(k * 16 - 16, 0, 4.5, 0, 6.29); g.stroke(); }
    } else if (it.type === "text") {
      g.rotate(Math.PI / 2); g.fillStyle = s + "0.42)"; g.font = "500 11px 'JetBrains Mono', monospace"; g.textAlign = "center"; g.fillText(it.label, 0, 0);
    } else if (it.type === "gate") {
      var age = it.fired ? (now - it.fired) / 800 : 1, hot = it.fired && age < 1;
      gatePath(it.kind); g.fillStyle = "rgb(" + P.bg + ")"; g.fill();
      g.lineWidth = hot ? 2.6 : 1.5; g.strokeStyle = hot ? "rgba(" + P.trailIn + "," + (1 - age * 0.5) + ")" : s + "0.7)"; g.stroke();
      if (hot) { g.globalCompositeOperation = P.op; g.globalAlpha = (1 - age) * P.glowA; g.drawImage(SPR.glow, -60, -60, 120, 120); g.globalAlpha = 1; g.globalCompositeOperation = "source-over"; }
      g.rotate(Math.PI / 2); g.textAlign = "center"; g.font = "600 11px 'JetBrains Mono', monospace";
      g.fillStyle = hot ? "rgb(" + P.trailIn + ")" : s + "0.65)"; g.fillText(it.kind, 0, 34);
      g.font = "500 10px 'JetBrains Mono', monospace"; g.fillStyle = hot ? "rgb(" + P.trailIn + ")" : s + "0.42)";
      g.fillText(it.kind === "NOT" ? it.i1 + " → " + it.out : it.i1 + " " + it.i2 + " → " + it.out, 0, 48);
    }
    g.restore();
  }

  /* ---------- chips that exist on the real pages, redrawn in the world ---------- */
  function chipFrom(elm, r) {
    var w = r.width, h = r.height, big = w >= 120;
    var c = { cx: r.left + w / 2, cy: r.top + h / 2, w: w, h: h, lit: 0, hitAt: 0,
      pitch: w >= 420 ? 17 : big ? 14 : 5, pinW: w >= 420 ? 7 : big ? 6 : 2, pinL: w >= 420 ? 16 : big ? 13 : 5, inset: big ? 0.13 : 0.2,
      radius: big ? 8 : 3, sides: big ? 4 : 2, img: null, die: null, text: "" };
    var die = elm.querySelector && elm.querySelector(".die");
    if (die) { var dr = die.getBoundingClientRect(); c.die = { x: dr.left - r.left, y: dr.top - r.top, w: dr.width, h: dr.height }; }
    var im = elm.querySelector && elm.querySelector(".die img");
    if (im && im.complete && im.naturalWidth) c.img = im;
    if (!big) { c.text = (elm.textContent || "").trim().slice(0, 3); c.gold = elm.classList.contains("gold") || !!elm.closest(".now"); }
    return c;
  }
  function roundRect(x, y, w, h, r) { g.beginPath(); if (g.roundRect) g.roundRect(x, y, w, h, r); else g.rect(x, y, w, h); }
  function drawChip(c, now) {
    var x0 = c.cx - c.w / 2, y0 = c.cy - c.h / 2, L = c.lit, x, y;
    var pinCol = L ? "rgba(" + (P.dark ? "255,226,160," : "176,131,39,") + (0.55 + L * 0.45) + ")" : P.pin;
    g.fillStyle = pinCol;
    for (x = x0 + c.w * c.inset; x <= x0 + c.w * (1 - c.inset) - c.pinW + 0.5; x += c.pitch) { g.fillRect(x, y0 - c.pinL, c.pinW, c.pinL); g.fillRect(x, y0 + c.h, c.pinW, c.pinL); }
    if (c.sides === 4) for (y = y0 + c.h * c.inset; y <= y0 + c.h * (1 - c.inset) - c.pinW + 0.5; y += c.pitch) { g.fillRect(x0 - c.pinL, y, c.pinL, c.pinW); g.fillRect(x0 + c.w, y, c.pinL, c.pinW); }
    if (L) { g.globalCompositeOperation = P.op; g.globalAlpha = L * 0.7 * P.glowA; var gs = Math.max(c.w, c.h) * 1.9; g.drawImage(SPR.glow, c.cx - gs / 2, c.cy - gs / 2, gs, gs); g.globalAlpha = 1; g.globalCompositeOperation = "source-over"; }
    var gr = g.createLinearGradient(x0, y0, x0 + c.w, y0 + c.h);
    if (c.gold) { gr.addColorStop(0, "#d9ad4f"); gr.addColorStop(1, "#b08327"); } else { gr.addColorStop(0, "#1d201e"); gr.addColorStop(0.55, "#121413"); gr.addColorStop(1, "#0b0c0c"); }
    roundRect(x0, y0, c.w, c.h, c.radius); g.fillStyle = gr; g.fill();
    if (L) { g.strokeStyle = "rgba(226,187,98," + L + ")"; g.lineWidth = 2; g.stroke(); }
    if (c.die) {
      var d = c.die;
      g.fillStyle = "#060606"; g.fillRect(x0 + d.x, y0 + d.y, d.w, d.h);
      if (c.img) {
        var iw = c.img.naturalWidth, ih = c.img.naturalHeight, s = Math.max(d.w / iw, d.h / ih), sw = d.w / s, sh = d.h / s;
        try { g.drawImage(c.img, (iw - sw) / 2, (ih - sh) / 2, sw, sh, x0 + d.x, y0 + d.y, d.w, d.h); } catch (e) {}
      }
      g.strokeStyle = "rgba(217,173,79,0.45)"; g.lineWidth = 1; g.strokeRect(x0 + d.x + 0.5, y0 + d.y + 0.5, d.w - 1, d.h - 1);
    }
    if (c.text) { g.fillStyle = c.gold ? "#111" : "#d9ad4f"; g.font = "600 " + Math.round(c.h * 0.28) + "px 'JetBrains Mono', monospace"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(c.text, c.cx, c.cy + 1); g.textBaseline = "alphabetic"; }
  }

  /* ======================================================================
     THE WORLD: route + camera + everything drawn while riding the signal
     screen = anchor + rotate(rot) * z * (world - cam)
     ====================================================================== */
  function World(seed, lockAt, busScale) {
    this.rt = new Route(seed, lockAt); this.d = 0; this.v = 0; this.z = 1; this.rot = 0; this.R = rng(seed ^ 0x5bd1e995);
    this.offs = OFFS.map(function (o) { return o * busScale; });
    this.bits = []; this.near = []; this.streaks = []; this.sparks = []; this.rings = []; this.lastVertex = 0;
    this.anchor = [W / 2, H * 0.62]; this.cam = [0, 0]; this.chips = []; this.headOn = true; this.minD = -Infinity; this.maxD = Infinity; this.endD = Infinity; this.sub = 1; this.fxA = 1;
    for (var i = 0; i < 70; i++) this.bits.push(this.newBit(400 + this.R() * 3000));
    for (var j = 0; j < 18; j++) this.near.push({ x: this.R(), y: this.R(), s: 40 + this.R() * 90, k: 0.6 + this.R() * 0.9, ch: this.R() < 0.5 ? "0" : "1" });
    for (var s = 0; s < 60; s++) this.streaks.push({ a: this.R() * 6.283, r: 10 + this.R() * 900, w: this.R() });
  }
  World.prototype.newBit = function (d) { var R = this.R; return { o: this.offs[Math.floor(R() * this.offs.length)], d: d, k: 0.15 + R() * 0.45, ch: R() < 0.5 ? "0" : "1" }; };
  World.prototype.step = function (dt, now) {
    var rt = this.rt, R = this.R, self = this, hp = rt.at(this.d);
    if (hp.i > this.lastVertex) { this.lastVertex = hp.i; var vx = rt.P[hp.i]; this.rings.push({ x: vx.x, y: vx.y, t: now }); tick(900 + R() * 500); }
    for (var i = 0; i < rt.items.length; i++) { var it = rt.items[i]; if (it.type === "gate" && !it.fired && this.d >= it.d) { it.fired = now; this.rings.push({ x: it.x, y: it.y, t: now, big: 1 }); tick(1500); } }
    this.bits.forEach(function (b, n) { b.d += self.v * b.k * dt; if (b.d < self.d - 900 / self.z) self.bits[n] = self.newBit(self.d + 1200 + R() * 2000); });
    if (this.headOn && this.v > 400 && R() < 0.6) { var ba = hp.a + Math.PI + (R() - 0.5) * 0.8, bs = 60 + R() * 200; this.sparks.push({ x: hp.x, y: hp.y, vx: Math.cos(ba) * bs, vy: Math.sin(ba) * bs, t: now, life: 160 + R() * 220 }); }
    this.sparks = this.sparks.filter(function (p) { p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 0.95; p.vy *= 0.95; return now - p.t < p.life; });
    this.rings = this.rings.filter(function (r) { return now - r.t < 900; });
    if (rt.items.length > 140) rt.items = rt.items.filter(function (it) { return it.d > self.d - 2500; });
    /* screen-space layers */
    var spd = this.v, ks = 0.9 + clamp(spd / 2500, 0, 3);
    this.near.forEach(function (n) { n.y += spd * n.k * dt / H * 0.9; if (n.y > 1.15) { n.y = -0.15; n.x = Math.random(); } });
    this.streaks.forEach(function (s) { s.r += (s.r * ks + 60) * dt * clamp(spd / 1200, 0, 1); });
    this.hp = hp;
  };
  World.prototype.draw = function (now, clearA) {
    var rt = this.rt, hp = this.hp || rt.at(this.d), z = this.z, ax = this.anchor[0], ay = this.anchor[1], cx = this.cam[0], cy = this.cam[1];
    g.setTransform(D, 0, 0, D, 0, 0); g.globalCompositeOperation = "source-over"; g.globalAlpha = 1;
    if (this.sub < 1) { g.clearRect(0, 0, W, H); g.fillStyle = "rgba(" + P.bg + "," + this.sub + ")"; }
    else g.fillStyle = "rgba(" + P.bg + "," + clearA + ")";
    g.fillRect(0, 0, W, H);

    /* far layer: substrate grid, parallax */
    var pk = 0.55, ps = z * 0.72, rv = Math.hypot(W, H) / ps;
    g.save(); g.globalAlpha = this.sub; g.translate(ax, ay); g.rotate(this.rot); g.scale(ps, ps); g.translate(-cx * pk, -cy * pk);
    g.fillStyle = SPR.dots; g.fillRect(cx * pk - rv, cy * pk - rv, rv * 2, rv * 2); g.restore();

    /* world layer */
    g.save(); g.translate(ax, ay); g.rotate(this.rot); g.scale(z, z); g.translate(-cx, -cy);
    var span = Math.hypot(W, H) / z, lo = Math.max(this.minD, this.d - span), hi = Math.min(this.maxD, this.endD, this.d + span);
    g.lineJoin = "miter"; g.lineCap = "butt";
    if (hi > lo) {
      for (var k = 0; k < this.offs.length; k++) { pathRange(rt, this.offs[k], lo, hi); g.strokeStyle = "rgba(" + P.line + "," + P.lineA[k % 3] + ")"; g.lineWidth = 1.5; g.stroke(); }
      pathRange(rt, 0, lo, hi); g.strokeStyle = P.main; g.lineWidth = 2.2; g.stroke();
    }
    var items = rt.items;
    g.globalAlpha = this.sub;
    for (var i = 0; i < items.length; i++) { var it = items[i]; if (it.d > lo - 300 && it.d < hi + 300 && it.d < this.endD - 200) drawItem(it, now); }
    g.globalAlpha = 1;
    for (var c = 0; c < this.chips.length; c++) drawChip(this.chips[c], now);

    g.globalCompositeOperation = P.op;
    g.globalAlpha = this.fxA;
    for (var b = 0; b < this.bits.length; b++) {
      var bt = this.bits[b]; if (bt.d < lo || bt.d > hi || bt.d > this.endD - 30) continue;
      var bp = rt.at(bt.d); g.drawImage(SPR["d" + bt.ch], bp.x - Math.sin(bp.a) * bt.o - 7, bp.y + Math.cos(bp.a) * bt.o - 7, 14, 14);
    }
    g.globalAlpha = 1;
    /* the signal's trail */
    var TR = Math.min(1400, 220 + this.v * 0.26) / Math.max(0.6, z), tEnd = Math.min(this.d, this.endD);
    for (var n = 0; n < 8; n++) {
      var a0 = Math.max(this.minD, tEnd - TR * (n + 1) / 8), a1 = Math.max(this.minD, tEnd - TR * n / 8), al = Math.pow(1 - n / 8, 1.6);
      if (a1 <= a0) continue;
      pathRange(rt, 0, a0, a1);
      g.strokeStyle = "rgba(" + P.trailOut + "," + (0.32 * al) + ")"; g.lineWidth = 12 * al + 2; g.stroke();
      g.strokeStyle = "rgba(" + P.trailIn + "," + al + ")"; g.lineWidth = 2.4 * al + 1; g.stroke();
    }
    this.rings.forEach(function (r) {
      var t = (now - r.t) / 900; if (t <= 0) return;
      g.strokeStyle = "rgba(" + P.ring + "," + (1 - t) * 0.75 + ")"; g.lineWidth = 1.6; g.beginPath(); g.arc(r.x, r.y, (r.big ? 150 : 100) * eOut(t), 0, 6.29); g.stroke();
    });
    this.sparks.forEach(function (p) {
      var t = (now - p.t) / p.life; g.strokeStyle = "rgba(" + P.trailIn + "," + (1 - t) + ")"; g.lineWidth = 1.3;
      g.beginPath(); g.moveTo(p.x, p.y); g.lineTo(p.x - p.vx * 0.04, p.y - p.vy * 0.04); g.stroke();
    });
    if (this.headOn && this.d >= 0) {
      var pulse = 1 + 0.15 * Math.sin(now / 45), gs = (150 + this.v * 0.02) * pulse / Math.max(0.7, z);
      g.globalAlpha = P.glowA; g.drawImage(SPR.glow, hp.x - gs / 2, hp.y - gs / 2, gs, gs); g.globalAlpha = 1;
      g.fillStyle = P.core; g.beginPath(); g.arc(hp.x, hp.y, 3.6 / Math.max(0.8, z) + 1, 0, 6.29); g.fill();
    }
    g.globalCompositeOperation = "source-over";
    g.restore();

    /* screen space: speed streaks and out-of-focus bits (only at full speed) */
    var spd = clamp((this.v - 1500) / 2600, 0, 1) * this.fxA;
    if (spd > 0) {
      var vx = W / 2, vy = H * 0.14, diag = Math.hypot(W, H);
      g.globalCompositeOperation = P.op; g.lineCap = "round";
      this.streaks.forEach(function (s) {
        var r2 = s.r * (1.08 + spd * 0.4);
        g.strokeStyle = "rgba(" + P.streak + "," + (0.04 + s.w * (P.dark ? 0.2 : 0.1)) * spd + ")"; g.lineWidth = 1 + s.w * 1.4;
        g.beginPath(); g.moveTo(vx + Math.cos(s.a) * s.r, vy + Math.sin(s.a) * s.r); g.lineTo(vx + Math.cos(s.a) * r2, vy + Math.sin(s.a) * r2); g.stroke();
        if (s.r > diag) { s.r = 8 + Math.random() * 60; s.a = Math.random() * 6.283; }
      });
      g.globalAlpha = spd * (P.dark ? 0.3 : 0.08);
      this.near.forEach(function (n) { g.drawImage(SPR["b" + n.ch], n.x * W - n.s / 2, n.y * H - n.s / 2, n.s, n.s); });
      g.globalAlpha = 1; g.globalCompositeOperation = "source-over";
    }
  };

  /* ---------- sound (only if the visitor turned it on) ---------- */
  var ac = null;
  function soundOn() { try { return sessionStorage.getItem(SND) === "1"; } catch (e) { return false; } }
  function audio() { try { ac = ac || new (window.AudioContext || window.webkitAudioContext)(); if (ac.state === "suspended") ac.resume(); return ac; } catch (e) { return null; } }
  function tick(f) {
    if (!soundOn()) return; var a = audio(); if (!a) return;
    try { var o = a.createOscillator(), gg = a.createGain(); o.type = "square"; o.frequency.value = f; gg.gain.setValueAtTime(0.01, a.currentTime); gg.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + 0.05); o.connect(gg); gg.connect(a.destination); o.start(); o.stop(a.currentTime + 0.06); } catch (e) {}
  }
  function hum(from, to, dur) {
    if (!soundOn()) return; var a = audio(); if (!a) return;
    try {
      var o = a.createOscillator(), f = a.createBiquadFilter(), gg = a.createGain(), t = a.currentTime;
      o.type = "sawtooth"; o.frequency.setValueAtTime(from, t); o.frequency.exponentialRampToValueAtTime(to, t + dur);
      f.type = "lowpass"; f.frequency.setValueAtTime(300, t); f.frequency.exponentialRampToValueAtTime(4000, t + dur);
      gg.gain.setValueAtTime(0.0001, t); gg.gain.exponentialRampToValueAtTime(0.04, t + 0.25); gg.gain.setValueAtTime(0.04, t + dur - 0.1); gg.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.25);
      o.connect(f); f.connect(gg); gg.connect(a.destination); o.start(); o.stop(t + dur + 0.3);
    } catch (e) {}
  }
  function chime() {
    if (!soundOn()) return; var a = audio(); if (!a) return;
    [880, 1320, 1760].forEach(function (fq, i) {
      try { var o = a.createOscillator(), gg = a.createGain(), t = a.currentTime + i * 0.06; o.type = "triangle"; o.frequency.value = fq; gg.gain.setValueAtTime(0.0001, t); gg.gain.exponentialRampToValueAtTime(0.05, t + 0.01); gg.gain.exponentialRampToValueAtTime(0.0001, t + 0.5); o.connect(gg); gg.connect(a.destination); o.start(t); o.stop(t + 0.55); } catch (e) {}
    });
  }

  /* the chip on this page that a signal leaves from / arrives at */
  function anchorEl(fallback) {
    var list = Array.prototype.slice.call(document.querySelectorAll("[data-warp-anchor]"));
    list.sort(function (a, b) { return (+a.getAttribute("data-warp-anchor") || 1) - (+b.getAttribute("data-warp-anchor") || 1); });
    for (var i = 0; i < list.length; i++) {
      var r = list[i].getBoundingClientRect();
      if (r.width > 8 && r.top > 20 && r.bottom < innerHeight - 20 && r.left > 0 && r.right < innerWidth) return list[i];
    }
    return fallback || null;
  }

  /* ======================================================================
     LEAVING: the signal charges at the chip's top pin, the page dissolves
     into the board, and the camera follows the signal along its trace
     ====================================================================== */
  var busy = false, srcEl = null;
  function go(href, opts) {
    if (busy) return; opts = opts || {};
    var to = fileOf(href), page = pageOf(href);
    if (reduce) { location.href = href; return; }
    busy = true; window.__warpBusy = true;
    var pre = document.createElement("link"); pre.rel = "prefetch"; pre.href = href; document.head.appendChild(pre);
    mount(); box.classList.add("block"); box.style.background = "transparent"; box.style.opacity = "1";
    var A = anchorEl(opts.from), r = A ? A.getBoundingClientRect() : { left: W / 2 - 30, top: H / 2 - 30, width: 60, height: 60 };
    var src = A ? chipFrom(A, r) : chipFrom(document.body, r);
    if (!A || !A.hasAttribute("data-warp-anchor")) { src.die = null; src.text = ""; src.sides = 2; }
    /* the board redraws this chip in the same place, so hide the page copy to avoid a double */
    srcEl = A; if (A) A.style.visibility = "hidden";
    var busScale = clamp(src.w * 0.42 / 120, 0.18, 1);
    var start = [src.cx, src.cy - src.h / 2 - src.pinL];
    var seed = (Math.random() * 1e9) | 0, world = new World(seed, null, busScale);
    src.cx -= start[0]; src.cy -= start[1]; world.chips.push(src);
    world.cam = [0, 0]; world.anchor = start.slice(); world.z = 1; world.rot = 0; world.sub = 0; world.minD = 0; world.maxD = 0; world.fxA = 1;
    var from = PAGES[fileOf(location.href)] || PAGES["index.html"];
    setText("path", from.idx + " " + from.label + " → " + page.idx + " " + page.label);
    setText("idx", "→ " + page.idx + " · next page");
    window.dispatchEvent(new CustomEvent("warp:out", { detail: { to: to } }));
    hum(70, 900, 2.0); tick(700);

    var CHARGE = 380, NAV = 1900, t0 = performance.now(), lastT = t0, navd = false;
    var camFollow = [W / 2, H * 0.6];
    function frame(now) {
      if (!busy) return;
      var t = now - t0, dt = Math.min(0.05, (now - lastT) / 1000); lastT = now;
      /* 1. charge: the chip lights up, the bus grows out of its top pins */
      src.lit = clamp(t / CHARGE, 0, 1) * (1 - clamp((t - 900) / 500, 0, 1));
      world.maxD = 2600 * eOut(clamp(t / 900, 0, 1)) + world.d;
      /* 2. the page dissolves into the board, leaving the chip and the signal */
      world.sub = clamp((t - 160) / 620, 0, 1);
      if (world.sub >= 1 && document.body.style.visibility !== "hidden") {
        document.body.style.visibility = "hidden"; box.style.background = "rgb(" + P.bg + ")";
      }
      /* 3. the signal leaves the pin and the camera follows it */
      var run = clamp((t - CHARGE) / (NAV - CHARGE), 0, 1);
      world.v = t < CHARGE ? 0 : lerp(90, 3400, Math.pow(run, 1.5));
      world.d += world.v * dt;
      var hp = world.rt.at(world.d), k = eInOut(clamp((t - CHARGE - 120) / 900, 0, 1));
      world.cam = [lerp(0, hp.x, k), lerp(0, hp.y, k)];
      world.anchor = [lerp(start[0], camFollow[0], k), lerp(start[1], camFollow[1], k)];
      world.z = lerp(1, 0.84, k * run);
      world.rot = angTo(world.rot, -Math.PI / 2 - lookAngle(world.rt, world.d, 260 + world.v * 0.12), (1 - Math.pow(0.03, dt)) * k);
      world.step(dt, now);
      world.draw(now, 1);
      var bloom = clamp((t - (NAV - 220)) / 220, 0, 1);
      if (bloom > 0) { g.setTransform(D, 0, 0, D, 0, 0); g.fillStyle = "rgba(" + P.bg + "," + (eIn(bloom) * 0.92) + ")"; g.fillRect(0, 0, W, H); }

      var f = t < CHARGE ? 1 : 4.2e9 * Math.pow(10, 1.1 * eIn(run));
      if (hudDue(now)) {
      setText("freq", t < CHARGE ? fmtF(Math.pow(10, 9.623 * eIn(clamp(t / CHARGE, 0, 1)))) : fmtF(f), true);
      setText("sub", t < CHARGE ? "Charging" : "Signal in transit");
      setText("addr", "ADDR 0x" + ((Math.floor(world.d * 7.31) & 0xffff).toString(16).toUpperCase().padStart(4, "0")));
      el.bar.style.width = (run * 70) + "%";
      setText("label", run < 0.55 ? scramble(page.label, clamp(run / 0.5, 0, 1)) : page.html, run >= 0.55);
      }
      if (t > 650) hud.classList.add("on");

      if (!navd && t > NAV) {
        navd = true;
        try { sessionStorage.setItem(KEY, JSON.stringify({ to: to, v: world.v, f: f, seed: seed, ts: Date.now() })); } catch (e) {}
        location.href = href;
      }
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  /* ======================================================================
     ARRIVING: the signal decelerates, the camera settles, and the trace
     plugs into the real chip on this page, at its exact screen position
     ====================================================================== */
  function arrive(state) {
    window.__warpBusy = true;
    mount(); box.classList.add("block"); box.style.background = "rgb(" + P.bg + ")"; hud.classList.add("on");
    document.body.style.visibility = "hidden"; root.classList.remove("warp-in");
    var page = PAGES[fileOf(location.href)] || pageOf(location.href);
    var A = anchorEl(), r = A ? A.getBoundingClientRect() : { left: W / 2 - 30, top: H * 0.3, width: 60, height: 60 };
    var dst = A ? chipFrom(A, r) : chipFrom(document.body, r);
    if (!A) { dst.die = null; dst.text = ""; dst.sides = 2; }
    var busScale = clamp(dst.w * 0.42 / 120, 0.18, 1);
    var v0 = clamp(state.v || 3400, 1500, 4500), seed = (state.seed || 7) ^ 0x2c1b3c6d;
    var world = new World(seed, 700, busScale), rt = world.rt;
    rt.ensure(2200);
    var sf = rt.straightFrom != null ? rt.straightFrom : 1200;
    var Ls = Math.max(v0 / 3, sf + Math.max(380, dst.h + 220)), T = clamp(3 * Ls / v0, 0.95, 1.5) * 1000;
    var E = rt.at(Ls);
    dst.wx = E.x; dst.wy = E.y - dst.pinL - dst.h / 2;
    world.chips.push(dst); world.endD = Ls; world.v = v0; world.z = 0.84; world.anchor = [W / 2, H * 0.6];
    world.d = 0; world.rot = -Math.PI / 2 - rt.at(0).a; world.sub = 1;
    setText("path", "→ " + page.idx + " " + page.label); setText("idx", page.idx + " · arriving"); setText("label", page.html, true);
    el.bar.style.width = "70%";

    var t0 = performance.now(), lastT = t0, f0 = state.f || 5e10, skipAt = 0, revealed = false, fno = 0;
    var BLEND0 = T * 0.42, FADE0 = T + 260, FADE = 600;
    function skip() { if (!skipAt) skipAt = performance.now(); }
    box.addEventListener("click", skip); addEventListener("keydown", skip, { once: true });

    function frame(now) {
      var t = now - t0, dt = Math.min(0.05, (now - lastT) / 1000); lastT = now;
      if (skipAt && t < FADE0) { t0 -= (FADE0 - t); t = FADE0; skipAt = 0; }
      var pa = clamp(t / T, 0, 1);
      world.d = Ls * (1 - Math.pow(1 - pa, 3)); world.v = pa < 1 ? 3 * Ls / (T / 1000) * Math.pow(1 - pa, 2) : 0;
      world.fxA = 1 - clamp((t - BLEND0) / (T - BLEND0), 0, 1);
      var hp = rt.at(world.d);
      /* the real chip may move a little once fonts load: keep tracking it */
      if (A && (++fno % 8 === 0)) { r = A.getBoundingClientRect(); dst.w = r.width; dst.h = r.height; dst.wy = E.y - dst.pinL - dst.h / 2; }
      dst.cx = dst.wx; dst.cy = dst.wy;
      var Tc = [r.left + r.width / 2, r.top + r.height / 2];
      var camFinal = [dst.wx - (Tc[0] - W / 2), dst.wy - (Tc[1] - H / 2)];
      var e = eInOut(clamp((t - BLEND0) / (T + 120 - BLEND0), 0, 1));
      var rotFollow = angTo(world.rot, -Math.PI / 2 - lookAngle(rt, world.d, 260 + world.v * 0.12), 1 - Math.pow(0.03, dt));
      world.rot = angTo(rotFollow, 0, e);
      world.cam = [lerp(hp.x, camFinal[0], e), lerp(hp.y, camFinal[1], e)];
      world.anchor = [W / 2, lerp(H * 0.6, H / 2, e)];
      world.z = lerp(0.84, 1, e);
      world.step(dt, now);
      if (hudDue(now)) { setText("freq", fmtF(lerp(f0, 4.2e9, eOut(pa))), true); setText("sub", pa < 1 ? "Decelerating" : "Signal locked"); }

      if (pa >= 1 && !dst.hitAt) {
        dst.hitAt = now; world.headOn = false; chime(); el.bar.style.width = "100%";
        world.rings.push({ x: E.x, y: E.y, t: now, big: 1 });
        hud.classList.remove("on");
      }
      if (dst.hitAt) dst.lit = clamp((now - dst.hitAt) / 260, 0, 1) * (1 - clamp((now - dst.hitAt - 500) / 600, 0, 1));
      world.draw(now, 1);
      var bloomIn = 1 - clamp(t / 320, 0, 1);
      if (bloomIn > 0) { g.setTransform(D, 0, 0, D, 0, 0); g.fillStyle = "rgba(" + P.bg + "," + (eOut(bloomIn) * 0.92) + ")"; g.fillRect(0, 0, W, H); }

      /* the board fades away around the chip, leaving the real page */
      var pf = clamp((t - FADE0) / FADE, 0, 1);
      if (pf > 0 && !revealed) {
        revealed = true; box.classList.remove("block");
        document.body.style.visibility = "";
        window.dispatchEvent(new CustomEvent("warp:reveal"));
      }
      if (pf > 0) box.style.opacity = String(1 - eInOut(pf));
      if (pf >= 1) { finish(); return; }
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }
  function finish() { unmount(); busy = false; window.__warpBusy = false; document.body.style.visibility = ""; }

  /* ---------- wiring ---------- */
  document.addEventListener("click", function (e) {
    var a = e.target.closest && e.target.closest("a[data-warp]");
    if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    if (a.getAttribute("aria-current") === "page") return;
    go(a.href, { from: a });
  });
  /* back/forward cache: never come back to a half-finished warp */
  addEventListener("pageshow", function (e) {
    if (!e.persisted) return;
    busy = false; window.__warpBusy = false; unmount(); root.classList.remove("warp-in");
    if (srcEl) srcEl.style.visibility = "";
    document.body.style.transform = ""; document.body.style.visibility = "";
    P = palette();
  });
  window.addEventListener("rpd:theme", function () { P = palette(); });

  P = palette();
  var state = null;
  try { state = JSON.parse(sessionStorage.getItem(KEY) || "null"); sessionStorage.removeItem(KEY); } catch (e) {}
  var arriving = !!(state && fileOf(state.to) === fileOf(location.href) && Date.now() - state.ts < 15000 && !reduce);
  if (arriving) {
    W = innerWidth; H = innerHeight;
    /* wait one frame so the page has laid out and the chip can be measured */
    requestAnimationFrame(function () { arrive(state); });
  } else root.classList.remove("warp-in");

  window.Warp = { go: go, pages: PAGES, arriving: arriving, theme: theme };
})();
