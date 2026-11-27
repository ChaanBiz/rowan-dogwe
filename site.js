/* site.js: inner pages: live circuit-board background + boot sequence */
(function () {
  "use strict";
  var reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- background board ---------- */
  var cv = document.getElementById("bg"), g = cv.getContext("2d"), W, H, D, paths = [], art = [], pulses = [], cache = null;
  function rng(seed) { return function () { seed |= 0; seed = seed + 0x6D2B79F5 | 0; var t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  function mk(pts) { var segs = [], len = 0; for (var i = 1; i < pts.length; i++) { var l = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); segs.push(l); len += l; } return { pts: pts, segs: segs, len: len }; }
  function at(p, d) {
    for (var i = 0; i < p.segs.length; i++) { if (d <= p.segs[i] || i === p.segs.length - 1) { var t = p.segs[i] ? Math.min(1, Math.max(0, d / p.segs[i])) : 0, a = p.pts[i], b = p.pts[i + 1]; return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]; } d -= p.segs[i]; }
    return p.pts[p.pts.length - 1];
  }
  var P;
  function pal() { P = document.documentElement.getAttribute("data-theme") === "dark" ? { ink: "226,187,98", a1: 0.12, a2: 0.07, txt: 0.16, gold: "241,211,138" } : { ink: "17,17,17", a1: 0.12, a2: 0.07, txt: 0.15, gold: "176,131,39" }; }
  pal();
  function build() {
    D = Math.min(2, window.devicePixelRatio || 1); W = innerWidth; H = innerHeight;
    cv.width = W * D; cv.height = H * D;
    var R = rng((document.body.getAttribute("data-seed") | 0) || 2026), dirs = [[1, 0], [0, 1], [-1, 0], [0, -1]], diag = [[0.7071, 0.7071], [-0.7071, 0.7071], [0.7071, -0.7071], [-0.7071, -0.7071]];
    paths = []; art = [];
    var n = Math.round(W * H / 26000);
    for (var k = 0; k < n; k++) {
      var pt = [R() * W, R() * H], pts = [pt], d0 = dirs[Math.floor(R() * 4)];
      for (var j = 0; j < 3 + Math.floor(R() * 3); j++) { var dir = j % 2 ? diag[Math.floor(R() * 4)] : d0, l = 50 + R() * 260; pt = [pt[0] + dir[0] * l, pt[1] + dir[1] * l]; pts.push(pt); }
      var p = mk(pts); p.w = R() < 0.25 ? 1.6 : 1.1; paths.push(p);
    }
    for (var a = 0; a < Math.round(n / 2.4); a++) art.push({ t: R() < 0.5 ? "R" : R() < 0.6 ? "U" : "C", x: R() * W, y: R() * H, n: 1 + Math.floor(R() * 40) });
    cache = document.createElement("canvas"); cache.width = W * D; cache.height = H * D;
    var c = cache.getContext("2d"); c.setTransform(D, 0, 0, D, 0, 0); c.lineCap = "round"; c.lineJoin = "round";
    paths.forEach(function (p) {
      c.strokeStyle = "rgba(" + P.ink + "," + (p.w > 1.2 ? P.a1 : P.a2) + ")"; c.lineWidth = p.w;
      c.beginPath(); c.moveTo(p.pts[0][0], p.pts[0][1]); p.pts.forEach(function (q) { c.lineTo(q[0], q[1]); }); c.stroke();
      var e = p.pts[p.pts.length - 1]; c.beginPath(); c.arc(e[0], e[1], 3, 0, 6.29); c.stroke();
    });
    c.font = "500 9.5px 'JetBrains Mono', monospace"; c.fillStyle = "rgba(" + P.ink + "," + P.txt + ")"; c.strokeStyle = "rgba(" + P.ink + "," + (P.a1 - 0.02) + ")";
    art.forEach(function (a) {
      if (a.t === "R") { c.strokeRect(a.x, a.y, 24, 10); c.fillRect(a.x - 7, a.y + 2, 6, 6); c.fillRect(a.x + 25, a.y + 2, 6, 6); c.fillText("R" + a.n, a.x, a.y - 4); }
      else if (a.t === "U") { c.strokeRect(a.x, a.y, 36, 26); for (var i = 0; i < 4; i++) { c.fillRect(a.x + 3 + i * 9, a.y - 5, 3, 5); c.fillRect(a.x + 3 + i * 9, a.y + 26, 3, 5); } c.fillText("U" + a.n, a.x, a.y - 9); }
      else { c.beginPath(); c.moveTo(a.x, a.y); c.lineTo(a.x, a.y + 16); c.moveTo(a.x + 5, a.y); c.lineTo(a.x + 5, a.y + 16); c.stroke(); c.fillText("C" + a.n, a.x - 4, a.y - 4); }
    });
    g.setTransform(D, 0, 0, D, 0, 0);
  }
  var last = 0, spawn = 0;
  function draw(now) {
    if (document.body.style.visibility === "hidden" || window.__warpBusy) { last = now; if (!reduce) requestAnimationFrame(draw); return; }
    var dt = Math.min(0.05, (now - (last || now)) / 1000); last = now;
    g.clearRect(0, 0, W, H); g.drawImage(cache, 0, 0, W, H);
    if (!reduce) {
      if (now - spawn > 260 && paths.length) { spawn = now; pulses.push({ p: paths[Math.floor(Math.random() * paths.length)], d: 0, v: 160 + Math.random() * 240 }); }
      pulses = pulses.filter(function (q) {
        q.d += q.v * dt; if (q.d > q.p.len + 40) return false;
        for (var k = 0; k < 7; k++) { var pos = at(q.p, Math.max(0, q.d - k * 6)); g.fillStyle = "rgba(" + P.gold + "," + (0.85 - k * 0.12) + ")"; g.beginPath(); g.arc(pos[0], pos[1], 2.4 - k * 0.28, 0, 6.29); g.fill(); }
        return true;
      });
      requestAnimationFrame(draw);
    }
  }
  build(); addEventListener("resize", function () { build(); if (reduce) draw(performance.now()); });
  addEventListener("rpd:theme", function () { pal(); build(); if (reduce) draw(performance.now()); });
  requestAnimationFrame(draw);

  /* ---------- contact details are kept out of the page source (anti-scraping) ---------- */
  function dec(v) { try { return decodeURIComponent(escape(atob(v))); } catch (e) { return ""; } }
  document.querySelectorAll("[data-c]").forEach(function (n) { n.textContent = dec(n.getAttribute("data-c")); });
  document.querySelectorAll("[data-mail]").forEach(function (n) { n.setAttribute("href", "mailto:" + dec(n.getAttribute("data-mail"))); });
  document.querySelectorAll("[data-tel]").forEach(function (n) { n.setAttribute("href", "tel:" + dec(n.getAttribute("data-tel"))); });


  /* ---------- personal info sections ---------- */
  document.querySelectorAll("[data-pitab]").forEach(function (b) {
    b.addEventListener("click", function () {
      var k = b.getAttribute("data-pitab");
      document.querySelectorAll("[data-pitab]").forEach(function (x) { var on = x === b; x.classList.toggle("on", on); x.setAttribute("aria-selected", String(on)); });
      document.querySelectorAll("[data-pipane]").forEach(function (p) { p.classList.toggle("on", p.getAttribute("data-pipane") === k); });
    });
  });

  /* ---------- light sweep between the parts of a section (no CPU warp) ---------- */
  var PARTS = ["education.html", "achievements.html", "experience.html"];
  function fileOf(h) { return new URL(h, location.href).pathname.split("/").pop() || "index.html"; }
  var html = document.documentElement;
  if (html.classList.contains("sliding-in")) setTimeout(function () { html.classList.remove("sliding-in", "dir-l", "dir-r"); }, 700);
  document.addEventListener("click", function (e) {
    var a = e.target.closest && e.target.closest("a[data-slide]");
    if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    if (a.getAttribute("aria-current") === "page" || html.classList.contains("sliding-out")) return;
    var dir = PARTS.indexOf(fileOf(a.href)) > PARTS.indexOf(fileOf(location.href)) ? "r" : "l";
    if (reduce) { location.href = a.href; return; }
    try { sessionStorage.setItem("rpd-slide", JSON.stringify({ dir: dir, ts: Date.now() })); } catch (err) {}
    html.classList.remove("sliding-in", "dir-l", "dir-r");
    html.classList.add("sliding-out", "dir-" + dir);
    setTimeout(function () { location.href = a.href; }, 460);
  });
  addEventListener("pageshow", function (e) { if (e.persisted) html.classList.remove("sliding-out", "sliding-in", "dir-l", "dir-r"); });

  /* ---------- proof viewer: click a proof to see it full-size ---------- */
  var lb = document.getElementById("lb");
  if (lb) {
    var lbImg = lb.querySelector("img"), lbCap = lb.querySelector("figcaption"), lbN = lb.querySelector(".lb-n"), lastFocus = null, set = [], lbAt = 0;
    function closeLb() { lb.hidden = true; lbImg.removeAttribute("src"); if (lastFocus) lastFocus.focus(); }
    function show(i) {
      lbAt = (i + set.length) % set.length;
      lbImg.src = set[lbAt][0]; lbImg.alt = set[lbAt][2] || ""; lbCap.innerHTML = set[lbAt][1] || "";
      if (lbN) lbN.textContent = (lbAt + 1) + " / " + set.length;
      lb.classList.toggle("single", set.length < 2);
    }
    function item(el) { return [el.getAttribute("data-proof"), el.getAttribute("data-cap"), (el.querySelector("img") || {}).alt]; }
    document.addEventListener("click", function (e) {
      if (!lb.hidden && e.target.closest(".lb-prev")) { show(lbAt - 1); return; }
      if (!lb.hidden && e.target.closest(".lb-next")) { show(lbAt + 1); return; }
      var p = e.target.closest && e.target.closest("[data-proof]");
      if (p) {
        lastFocus = p; var start = 0;
        var g = p.getAttribute("data-gallery"), s = p.getAttribute("data-set");
        if (g) { try { set = JSON.parse(g); start = Math.min(set.length - 1, +p.getAttribute("data-start") || 0); } catch (err) { set = [item(p)]; } }
        else if (s) { var all = document.querySelectorAll('[data-proof][data-set="' + s + '"]'); set = []; for (var k = 0; k < all.length; k++) { if (all[k] === p) start = k; set.push(item(all[k])); } }
        else set = [item(p)];
        show(start); lb.hidden = false; lb.querySelector(".lb-x").focus(); return;
      }
      if (!lb.hidden && (e.target === lb || e.target.closest(".lb-x"))) closeLb();
    });
    document.addEventListener("keydown", function (e) {
      if (lb.hidden) return;
      if (e.key === "Escape") { e.preventDefault(); closeLb(); }
      else if (e.key === "ArrowRight" && set.length > 1) show(lbAt + 1);
      else if (e.key === "ArrowLeft" && set.length > 1) show(lbAt - 1);
    });
  }

  /* ---------- photo strips on awards / jobs: photos travel left -> right, ALL IN SYNC, loop forever ----------
     One shared clock drives every strip, so they all start on load and move together. Pointing at any strip
     pauses all of them. Photos are laid in reverse and the view moves leftwards, so each next photo
     (1, 2, 3 ...) slides in from the LEFT and the strip flows to the right. */
  (function () {
    var boxes = document.querySelectorAll(".phs[data-n]");
    if (!boxes.length) return;
    var SEC = 3.2, clock = { t: 0, hover: 0, hold: 0 }, strips = [], last = 0;   /* clock.t = seconds of motion */
    boxes.forEach(function (box) {
      var tr = box.querySelector(".phs-track"), n = +box.getAttribute("data-n");
      if (n < 2) return;                                   /* a single picture stays still */
      var kids = [].slice.call(tr.children);
      kids.reverse().forEach(function (k) { tr.appendChild(k); });                   /* n .. 1 */
      kids.forEach(function (k) { var c = k.cloneNode(true); c.setAttribute("aria-hidden", "true"); c.tabIndex = -1; tr.appendChild(c); });
      tr.style.scrollSnapType = "none";
      var st = { box: box, tr: tr, n: n, cnt: box.querySelector(".phs-n"), off: 0, busy: 0, pos: 0 };
      strips.push(st);
      box.addEventListener("mouseenter", function () { clock.hover++; });
      box.addEventListener("mouseleave", function () { clock.hover = Math.max(0, clock.hover - 1); });
      tr.addEventListener("touchstart", function () { clock.hold = performance.now() + 4000; }, { passive: true });
      tr.addEventListener("scroll", function () {               /* someone dragged / swiped it: keep that spot */
        if (performance.now() < st.busy || Math.abs(tr.scrollLeft - st.pos) <= 2) return;
        var w = W(st); st.off = ((2 * n - 1) * w - w * clock.t / SEC - tr.scrollLeft) / w; st.pos = tr.scrollLeft; upd(st);
      }, { passive: true });
      tr.addEventListener("wheel", function (e) {               /* mouse wheel steps through the photos */
        if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return;
        e.preventDefault(); if (box._lock) return; box._lock = 1; go(st, e.deltaY > 0 ? 1 : -1); setTimeout(function () { box._lock = 0; }, 450);
      }, { passive: false });
    });
    function W(st) { return Math.max(1, st.tr.clientWidth); }
    function norm(st, x) { var w = W(st), L = st.n * w; while (x < L - w - 0.5) x += L; while (x > 2 * L - w + 0.5) x -= L; return x; }
    function target(st) { var w = W(st); return norm(st, (2 * st.n - 1 - st.off) * w - w * clock.t / SEC); }
    function upd(st) { st.cnt.textContent = (st.n - (Math.round(st.pos / W(st)) % st.n)) + "/" + st.n; }
    function place(st) { st.pos = target(st); st.tr.scrollLeft = st.pos; upd(st); }
    function go(st, d) {                                        /* d = +1: next photo (comes in from the left) */
      var w = W(st), j = Math.round(st.pos / w);
      if (d < 0 && j + 1 > 2 * st.n - 1) { st.pos -= st.n * w; st.tr.scrollLeft = st.pos; j -= st.n; }
      st.busy = performance.now() + 600;
      st.tr.scrollTo({ left: (j - d) * w, behavior: reduce ? "auto" : "smooth" });
      setTimeout(function () { st.off += d; place(st); }, 560);
    }
    function tick(t) {
      var dt = last ? Math.min(64, t - last) : 0; last = t;
      var moving = !clock.hover && t > clock.hold && !reduce && !document.hidden && !window.__warpBusy && (!lb || lb.hidden);
      if (moving) clock.t += dt / 1000;
      for (var i = 0; i < strips.length; i++) if (t > strips[i].busy) place(strips[i]);
      requestAnimationFrame(tick);
    }
    strips.forEach(place);                                      /* every strip starts on photo 1, together */
    addEventListener("resize", function () { strips.forEach(place); });
    requestAnimationFrame(tick);
  })();

  /* ---------- "View all pictures" pop-up (Achievements) ---------- */
  var ap = document.getElementById("allpics");
  if (ap) {
    var apOpener = null, apBody = ap.querySelector(".ap-body");
    function openAp(btn) { apOpener = btn; ap.hidden = false; html.classList.add("ap-open"); apBody.scrollTop = 0; ap.querySelector(".ap-x").focus(); }
    function closeAp() { ap.hidden = true; html.classList.remove("ap-open"); if (apOpener) apOpener.focus(); }
    document.addEventListener("click", function (e) {
      var t = e.target;
      if (t.closest("[data-allpics]")) { openAp(t.closest("[data-allpics]")); return; }
      if (ap.hidden) return;
      var j = t.closest(".ap-jump a");
      if (j) { e.preventDefault(); var sec = ap.querySelector(j.getAttribute("href")); if (sec) apBody.scrollTo({ top: sec.offsetTop - apBody.offsetTop, behavior: reduce ? "auto" : "smooth" }); return; }
      if (t.closest(".ap-x") || t === ap) closeAp();
    });
    document.addEventListener("keydown", function (e) {
      if (ap.hidden || e.defaultPrevented || (lb && !lb.hidden)) return;
      if (e.key === "Escape") closeAp();
    });
  }

  /* ---------- photo stacks that slowly cycle (e.g. Muay Thai) ---------- */
  var cycles = document.querySelectorAll(".proof.cycle");
  if (cycles.length && !reduce) setInterval(function () {
    if (document.hidden || window.__warpBusy) return;
    for (var c = 0; c < cycles.length; c++) {
      var imgs = cycles[c].querySelectorAll("img"), cur = 0;
      for (var j = 0; j < imgs.length; j++) if (imgs[j].classList.contains("on")) cur = j;
      imgs[cur].classList.remove("on"); imgs[(cur + 1) % imgs.length].classList.add("on");
    }
  }, 2800);

  /* ---------- age stays correct after every birthday ---------- */
  document.querySelectorAll("[data-age]").forEach(function (n) {
    var b = new Date(n.getAttribute("data-age") + "T00:00:00"), t = new Date(), a = t.getFullYear() - b.getFullYear();
    if (t.getMonth() < b.getMonth() || (t.getMonth() === b.getMonth() && t.getDate() < b.getDate())) a--;
    if (a > 0 && a < 120) n.textContent = a;
  });

  /* ---------- boot: stagger the parts in and decode the title from bits ---------- */
  document.querySelectorAll("[data-boot]").forEach(function (n, i) { n.style.setProperty("--i", i); });
  function decode(el) {
    var nodes = [], walk = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    while (walk.nextNode()) nodes.push({ n: walk.currentNode, t: walk.currentNode.nodeValue });
    var total = nodes.reduce(function (s, x) { return s + x.t.length; }, 0), t0 = performance.now(), DUR = 750;
    (function step(now) {
      var k = Math.floor(total * Math.min(1, (now - t0) / DUR)), seen = 0;
      nodes.forEach(function (x) {
        var out = "";
        for (var i = 0; i < x.t.length; i++, seen++) out += seen < k || x.t[i] === " " ? x.t[i] : (Math.random() < 0.5 ? "0" : "1");
        x.n.nodeValue = out;
      });
      if (k < total) requestAnimationFrame(step);
    })(t0);
  }
  var booted = false;
  function boot() {
    if (booted) return; booted = true;
    document.body.classList.add("booted");
    if (!reduce) document.querySelectorAll("[data-decode]").forEach(decode);
  }
  if (window.Warp && window.Warp.arriving) addEventListener("warp:reveal", function () { setTimeout(boot, 60); });
  else requestAnimationFrame(function () { requestAnimationFrame(boot); });
})();

/* ---------- side photo rails: the moment the cursor leaves a rail it moves again
   (drop the focus a clicked photo kept, which would otherwise hold the pause) ---------- */
document.querySelectorAll(".rail").forEach(function (r) {
  r.addEventListener("mouseleave", function () { var a = document.activeElement; if (a && r.contains(a)) a.blur(); });
});
/* ---------- side photo rails: same gentle speed whatever their length ---------- */
(function () {
  function tune() {
    var rails = document.querySelectorAll(".rail-track");
    for (var i = 0; i < rails.length; i++) {
      var set = rails[i].querySelector(".rail-set"); if (!set) continue;
      var len = innerWidth <= 860 ? set.offsetWidth : set.offsetHeight;
      if (len) rails[i].style.setProperty("--dur", Math.max(8.5, len / 60).toFixed(1) + "s");   /* 60 px/s */
    }
  }
  addEventListener("load", tune); addEventListener("resize", tune);
})();

/* ---------- Achievements: shrink the middle just enough to fit one screen ---------- */
(function () {
  var mid = document.querySelector(".mid"), inner = mid && mid.querySelector(".mid-in");
  if (!inner) return;
  var root = document.documentElement;
  function reset() { inner.style.transform = ""; inner.style.width = ""; inner.style.minHeight = ""; inner.style.removeProperty("--s"); }
  /* the Senior High awards box and the College "Working student" box: same top, same height (same width already) */
  function syncBoxes(s) {
    var a = inner.querySelector(".sc-aw1"), n = inner.querySelector(".sc.now .sc-note");
    if (!a || !n) return;
    [a, n].forEach(function (el) { el.style.marginTop = ""; el.style.height = ""; el.style.flex = ""; });
    if (innerWidth <= 860) return;
    var ra = a.getBoundingClientRect(), rn = n.getBoundingClientRect();
    var pa = a.parentElement.getBoundingClientRect(), pn = n.parentElement.getBoundingClientRect();
    var pba = parseFloat(getComputedStyle(a.parentElement).paddingBottom) * s, pbn = parseFloat(getComputedStyle(n.parentElement).paddingBottom) * s;
    var T = Math.max(ra.top, rn.top), B = Math.min(pa.bottom - pba, pn.bottom - pbn), H = (B - T) / s;
    if (H < 40) return;
    a.style.marginTop = (parseFloat(getComputedStyle(a).marginTop) + (T - ra.top) / s) + "px";
    n.style.marginTop = (parseFloat(getComputedStyle(n).marginTop) + (T - rn.top) / s) + "px";
    a.style.height = H + "px"; n.style.height = H + "px"; n.style.flex = "none";
    /* if the awards text does not fit the shared height, make the photo narrower, then the text slightly smaller */
    var ul = a.querySelector("ul"), ph = a.querySelector(".ph"), f = 1, w = 42;
    if (ph) ph.style.maxWidth = "";
    while (a.scrollHeight > a.clientHeight + 1 && w > 26 && ph) { w -= 4; ph.style.maxWidth = w + "%"; }
    var txt = ul ? [].slice.call(ul.querySelectorAll("b, span")) : [];
    var base = txt.map(function (el) { return parseFloat(getComputedStyle(el).fontSize); });
    while (a.scrollHeight > a.clientHeight + 1 && f > 0.72) { f -= 0.04; txt.forEach(function (el, i) { el.style.fontSize = (base[i] * f).toFixed(2) + "px"; }); }
  }
  /* text on this page is 50% larger than the stylesheet's sizes (pictures unchanged) */
  var TEXT = 1.5, textEls = null;
  function bumpText() {
    textEls = textEls || [].slice.call(inner.querySelectorAll("*")).filter(function (el) { return !/^(IMG|svg|path|circle|rect)$/i.test(el.tagName); });
    textEls.forEach(function (el) { el.style.fontSize = ""; });
    var sizes = textEls.map(function (el) { return parseFloat(getComputedStyle(el).fontSize); });
    textEls.forEach(function (el, i) { if (sizes[i]) el.style.fontSize = (sizes[i] * TEXT).toFixed(2) + "px"; });
  }
  /* scale the whole middle (text AND pictures) so it fills the space between the menu and the bottom buttons
     exactly: smaller screens shrink it, bigger screens grow it. Width is set to 100/s % so it always spans
     the full width, edge to edge. */
  var SMIN = 0.5, SMAX = 1.9;
  function apply(s) { inner.style.width = (100 / s) + "%"; inner.style.transform = "scale(" + s + ")"; inner.style.setProperty("--s", s); }
  function fit() {
    reset(); root.classList.remove("ach-nohead"); bumpText();
    if (innerWidth <= 860) return;
    root.classList.add("ach-nohead");
    var room = mid.clientHeight, s = 1;
    for (var i = 0; i < 8; i++) {                       /* width changes the wrapping, so converge */
      apply(s);
      var h = inner.offsetHeight, ns = Math.min(SMAX, Math.max(SMIN, room / h));
      if (Math.abs(ns - s) < 0.002) break;
      s = ns;
    }
    apply(s);
    while (inner.offsetHeight * s > room + 0.5 && s > SMIN) { s -= 0.005; apply(s); }
    syncBoxes(s);
    for (var g = 0; g < 60 && inner.offsetHeight * s > room + 0.5 && s > SMIN; g++) { s -= 0.005; apply(s); syncBoxes(s); }   /* matching the two boxes can add height: shrink again */
    inner.style.minHeight = (room / s - 1) + "px";      /* any space left over goes to the Extracurricular / Work row */
    if (window.__tlDraw) setTimeout(window.__tlDraw, 30);
  }
  var t; function soon() { clearTimeout(t); t = setTimeout(fit, 60); }
  fit(); addEventListener("load", fit); addEventListener("resize", soon);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(fit);
  /* late-loading pictures can make the cards taller after fitting: re-fit when each one arrives */
  inner.querySelectorAll("img").forEach(function (im) { if (!im.complete) im.addEventListener("load", soon, { once: true }); });
})();

/* ---------- Achievements timeline: a true year ruler (.yr). Schools are bars above the ruler, recognitions a bar and pins below.
   Traces tie every card to its bar. A playhead sweeps the years (month + year readout): bars fill as it passes, a card powers on
   (spark burst + unlock pop-up) when its bar starts, the trace carries current, and the counters count up. Holds at Now, then
   runs again. ---------- */
(function () {
  var tl = document.querySelector(".tml"), yr = tl && tl.querySelector(".yr"), svg = tl && tl.querySelector(".tl-traces");
  if (!yr || !svg) return;
  var NS = "http://www.w3.org/2000/svg", reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  var A = +yr.getAttribute("data-a"), B = +yr.getAttribute("data-b"), NOW = +yr.getAttribute("data-now");
  var head = yr.querySelector(".yr-head"), hl = head.querySelector("em");
  var items = [].slice.call(yr.querySelectorAll(".yb, .yp")).map(function (el) {
    return { el: el, k: el.getAttribute("data-for"), a: +el.getAttribute("data-a"), b: +el.getAttribute("data-b"), kind: el.getAttribute("data-k"), n: +el.getAttribute("data-n") || 0,
      pop: el.getAttribute("data-pop"), top: !!el.closest(".yr-edu"), card: tl.querySelector('[data-tl="' + el.getAttribute("data-for") + '"]'), on: null, f: -1 };
  });
  var ticks = [].slice.call(yr.querySelectorAll(".yt")).map(function (t) { return { el: t, y: +t.textContent }; });
  var counters = {}; [].slice.call(document.querySelectorAll(".tl-count")).forEach(function (c) { counters[c.getAttribute("data-k")] = c; });
  var totals = {}; items.forEach(function (it) { totals[it.kind] = (totals[it.kind] || 0) + it.n; });
  var shown = {}, quiet = false;
  var MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  function scale() { var m = document.querySelector(".mid-in"); return (m && parseFloat(m.style.getPropertyValue("--s"))) || 1; }

  /* traces: card -> its bar / pin, routed in lanes so they never overlap */
  function draw() {
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    if (!document.querySelector(".ach3.board")) return;
    /* v44 board: a stem from each card straight to its own bar (elbow only when the card cannot sit over its bar) */
    var s0 = scale(), T0 = tl.getBoundingClientRect(), Q = function (x, y) { return [(x - T0.left) / s0, (y - T0.top) / s0]; };
    items.forEach(function (it) {
      if (!it.card) return;
      var cr = it.card.getBoundingClientRect(), tgt = it.el.classList.contains("yp") ? it.el.querySelector("i") : it.el, br = tgt.getBoundingClientRect();
      var lo = Math.max(cr.left + 14, br.left + 4), hi = Math.min(cr.right - 14, br.right - 4);
      var y1 = it.top ? cr.bottom : cr.top, y2 = it.top ? br.top : br.bottom, d;
      if (lo <= hi) { var x = (lo + hi) / 2; var a = Q(x, y1), b = Q(x, y2); d = "M" + a[0].toFixed(1) + " " + a[1].toFixed(1) + " V" + b[1].toFixed(1); }
      else {
        var bx = br.left + br.width / 2, cx = bx < cr.left ? cr.left + 18 : cr.right - 18, mid = (y1 + y2) / 2;
        var a1 = Q(cx, y1), m1 = Q(cx, mid), m2 = Q(bx, mid), b1 = Q(bx, y2);
        d = "M" + a1[0].toFixed(1) + " " + a1[1].toFixed(1) + " V" + m1[1].toFixed(1) + " H" + m2[0].toFixed(1) + " V" + b1[1].toFixed(1);
      }
      var p = document.createElementNS(NS, "path"); p.setAttribute("d", d); p.setAttribute("data-for", it.k); if (it.on) p.classList.add("lit"); svg.appendChild(p);
      var st = d.match(/^M([\d.]+) ([\d.]+)/), c = document.createElementNS(NS, "circle"); c.setAttribute("cx", st[1]); c.setAttribute("cy", st[2]); c.setAttribute("r", 3.4); svg.appendChild(c);
    });
    return;
    var s = scale(), T = tl.getBoundingClientRect(), P = function (x, y) { return [(x - T.left) / s, (y - T.top) / s]; };
    var links = items.filter(function (it) { return it.card; }).map(function (it) {
      var cr = it.card.getBoundingClientRect(), tr = (it.el.querySelector("i") || it.el).getBoundingClientRect();
      var tx = it.el.classList.contains("yp") ? tr.left + tr.width / 2 : tr.left + Math.min(tr.width / 2, Math.max(10, tr.width * 0.5));
      return { it: it, top: it.top, cx: P(cr.left + cr.width / 2, 0)[0], cy: P(0, it.top ? cr.bottom : cr.top)[1], nx: P(tx, 0)[0], ny: P(0, it.top ? tr.top : tr.bottom)[1] };
    });
    [true, false].forEach(function (top) {
      var L = links.filter(function (l) { return l.top === top; });
      L.sort(function (a, b) { return Math.abs(b.nx - b.cx) - Math.abs(a.nx - a.cx); });
      L.forEach(function (l, k) {
        var gap = Math.abs(l.ny - l.cy), step = Math.min(7, (gap - 6) / (L.length + 1)), laneY = top ? l.ny - (k + 1) * step : l.ny + (k + 1) * step;
        var p = document.createElementNS(NS, "path");
        p.setAttribute("d", "M" + l.cx.toFixed(1) + " " + l.cy.toFixed(1) + " V" + laneY.toFixed(1) + " H" + l.nx.toFixed(1) + " V" + l.ny.toFixed(1));
        p.setAttribute("data-for", l.it.k); if (!top) p.setAttribute("class", "bot"); if (l.it.on) p.classList.add("lit"); svg.appendChild(p);
        var c = document.createElementNS(NS, "circle"); c.setAttribute("cx", l.cx); c.setAttribute("cy", l.cy); c.setAttribute("r", 3.4); c.setAttribute("class", "pad"); svg.appendChild(c);
        var c2 = document.createElementNS(NS, "circle"); c2.setAttribute("cx", l.nx); c2.setAttribute("cy", l.ny); c2.setAttribute("r", 2.2); svg.appendChild(c2);
      });
    });
  }

  function count() {
    var sum = {}; items.forEach(function (it) { if (it.on) sum[it.kind] = (sum[it.kind] || 0) + it.n; });
    Object.keys(counters).forEach(function (k) {
      var v = sum[k] || 0; if (shown[k] === v) return; var up = v > (shown[k] || 0); shown[k] = v;
      counters[k].querySelector("b").textContent = v;
      if (up && !quiet) { counters[k].classList.remove("bump"); void counters[k].offsetWidth; counters[k].classList.add("bump"); }
    });
  }
  function burst(it) {
    var s = scale(), Y = yr.getBoundingClientRect(), r = (it.el.querySelector("i") || it.el).getBoundingClientRect();
    var x = it.el.classList.contains("yp") ? (r.left + r.width / 2 - Y.left) / s : (r.left - Y.left) / s + 2, y = (r.top + r.height / 2 - Y.top) / s;
    for (var k = 0; k < 14; k++) {
      var ang = (k / 14) * Math.PI * 2 + Math.random() * 0.4, d = 16 + Math.random() * 20, sp = document.createElement("span");
      sp.className = "tl-spark"; sp.style.left = x + "px"; sp.style.top = y + "px";
      sp.style.setProperty("--dx", (Math.cos(ang) * d).toFixed(1) + "px"); sp.style.setProperty("--dy", (Math.sin(ang) * d).toFixed(1) + "px");
      yr.appendChild(sp); setTimeout(function (e) { return function () { e.remove(); }; }(sp), 800);
    }
    if (!it.pop) return;
    var pop = document.createElement("span"); pop.className = "tl-pop" + (it.top ? " up" : ""); pop.innerHTML = it.pop;
    pop.style.left = Math.max(60, Math.min(yr.offsetWidth - 60, x + 30)) + "px"; pop.style.top = (it.top ? (r.top - Y.top) / s - 30 : (r.bottom - Y.top) / s + 6) + "px";
    yr.appendChild(pop); setTimeout(function () { pop.remove(); }, 1750);
  }
  function setOn(it, on) {
    if (it.on === on) return; it.on = on;
    if (it.el.classList.contains("yp")) it.el.classList.toggle("lit", on);
    if (it.card) { it.card.classList.toggle("lit", on); if (on) it.card.classList.add("on"); }
    svg.querySelectorAll('path[data-for="' + it.k + '"]').forEach(function (p) { p.classList.toggle("lit", on); });
    if (on && !reduce && !quiet) { it.el.classList.add("flash"); setTimeout(function () { it.el.classList.remove("flash"); }, 380); burst(it); }
    count();
  }
  function apply(y, fade) {   /* y = the playhead's date as a decimal year */
    items.forEach(function (it) {
      var f = it.b > it.a ? Math.max(0, Math.min(1, (y - it.a) / (it.b - it.a))) : (y >= it.a ? 1 : 0);
      if (Math.abs(f - it.f) > 0.002 || (f === 1 && it.f !== 1) || (f === 0 && it.f !== 0)) { it.f = f; it.el.style.setProperty("--f", f.toFixed(3)); }
      if (!it.el.classList.contains("yp")) { it.el.classList.toggle("lit", f >= 0.97); it.el.classList.toggle("go", f > 0); }
      setOn(it, fade > 0.05 && y >= it.a);
    });
    ticks.forEach(function (t) { t.el.classList.toggle("past", fade > 0.05 && y >= t.y); });
    yr.style.setProperty("--fade", fade.toFixed(2));
  }
  var TRAVEL = 9000, HOLD = 3000, FADE = 800, t0 = performance.now() + 700;
  if (!reduce && innerWidth > 860) tl.classList.add("boot");
  var bigY = document.querySelector(".jy-year b");
  function frame(now, once) {
    if (true) {
      if (reduce) { apply(NOW, 1); if (bigY) bigY.textContent = "Now"; }
      else {
        var t = now - t0, y = A, fade = 1, w = yr.offsetWidth;
        if (t >= 0) {
          t = t % (TRAVEL + HOLD + FADE);
          if (t < TRAVEL) { var u = t / TRAVEL; u = u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2; u = 0.35 * u + 0.65 * (t / TRAVEL); y = A + (NOW - A) * u; }
          else { y = NOW; if (t > TRAVEL + HOLD) fade = 1 - (t - TRAVEL - HOLD) / FADE; }
          var x = (y - A) / (B - A) * w;
          head.style.transform = "translateX(" + x.toFixed(1) + "px)"; head.classList.toggle("on", t < TRAVEL + HOLD);
          var m = Math.min(11, Math.floor((y - Math.floor(y)) * 12)); hl.textContent = MON[m] + " " + Math.floor(y); head.classList.toggle("end", y >= NOW - 0.08); if (bigY) { var tx = y >= NOW - 0.08 ? "Now" : String(Math.floor(y)); if (bigY.textContent !== tx) bigY.textContent = tx; }
          apply(y, fade);
        }
      }
    }
    if (!once && !reduce) requestAnimationFrame(frame);
  }
  function sync() { draw(); quiet = true; frame(performance.now(), true); quiet = false; }
  window.__tlDraw = sync;
  var tm; addEventListener("resize", function () { clearTimeout(tm); tm = setTimeout(sync, 150); });
  addEventListener("load", function () { setTimeout(sync, 250); });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { setTimeout(sync, 250); });
  setTimeout(sync, 400); setTimeout(sync, 1600);
  if (reduce) Object.keys(counters).forEach(function (k) { counters[k].querySelector("b").textContent = totals[k]; });
  /* hovering a card highlights its chapter on the ruler (nothing is clickable) */
  items.forEach(function (it) { if (!it.card) return;
    it.card.addEventListener("mouseenter", function () { it.card.classList.add("hot"); it.el.classList.add("hot"); });
    it.card.addEventListener("mouseleave", function () { it.card.classList.remove("hot"); it.el.classList.remove("hot"); }); });
  if (!reduce) requestAnimationFrame(frame);
})();

/* ---------- Family & Friends: traces from the RPD hub to each card (left cards: out of the hub's left side; right cards: right side),
   each with a pad at the card and a pulse of current flowing outward ---------- */
(function () {
  var ff = document.querySelector(".ff"), svg = ff && ff.querySelector(".ff-traces"), hub = ff && ff.querySelector(".ff-hub");
  if (!svg || !hub) return;
  var NS = "http://www.w3.org/2000/svg";
  function el(n, a) { var e = document.createElementNS(NS, n); for (var k in a) e.setAttribute(k, a[k]); svg.appendChild(e); return e; }
  function draw() {
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    if (innerWidth <= 860) return;
    var F = ff.getBoundingClientRect(), H = hub.getBoundingClientRect(), hx = H.left + H.width / 2 - F.left, hy = H.top + H.height / 2 - F.top, hw = H.width / 2;
    svg.setAttribute("viewBox", "0 0 " + F.width + " " + F.height);
    [].slice.call(ff.querySelectorAll(".ff-card")).forEach(function (c, i) {
      var r = c.getBoundingClientRect(), left = r.left + r.width / 2 < F.left + F.width / 2, top = r.top + r.height / 2 < F.top + F.height / 2;
      var ex = (left ? r.right : r.left) - F.left, ey = r.top + r.height * (top ? 0.62 : 0.38) - F.top;   /* pad on the card edge facing the hub */
      var sx = hx + (left ? -1 : 1) * Math.min(hw * 0.45, 12), sy = hy + (top ? -hw - 8 : hw + 8);         /* leave from a pin on the hub's top / bottom */
      var mx = sx;
      var d = "M" + sx.toFixed(1) + " " + sy.toFixed(1) + " V" + ey.toFixed(1) + " H" + ex.toFixed(1);
      el("path", { d: d });
      var g = el("path", { d: d, "class": "glow" }); g.style.animationDelay = (i * 0.65) + "s";
      el("circle", { cx: mx, cy: ey, r: 2.6, "class": "via" });
      el("circle", { cx: ex, cy: ey, r: 4 });
    });
  }
  var t; addEventListener("resize", function () { clearTimeout(t); t = setTimeout(draw, 120); });
  addEventListener("load", draw); if (document.fonts && document.fonts.ready) document.fonts.ready.then(draw);
  setTimeout(draw, 300); setTimeout(draw, 1200);
})();

/* ---------- Family: parents' panels tilt toward the pointer ---------- */
(function () {
  if (matchMedia("(prefers-reduced-motion: reduce)").matches || !matchMedia("(hover: hover) and (min-width: 861px)").matches) return;
  document.querySelectorAll("[data-tilt]").forEach(function (el) {
    el.addEventListener("pointermove", function (e) {
      var r = el.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
      el.classList.add("tilting"); el.style.setProperty("--ry", (x * 8).toFixed(2) + "deg"); el.style.setProperty("--rx", (-y * 6).toFixed(2) + "deg");
    });
    el.addEventListener("pointerleave", function () { el.classList.remove("tilting"); el.style.setProperty("--ry", "0deg"); el.style.setProperty("--rx", "0deg"); });
  });
})();
