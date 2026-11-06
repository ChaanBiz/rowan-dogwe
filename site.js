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
  document.querySelectorAll("[data-tel]").forEach(function (n) { n.setAttribute("href", "tel:" + dec(n.getAttribute("data-tel"))); });

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
