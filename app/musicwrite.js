/* ──────────────────────────────────────────────────────────────
   写谱号 · 写音符 —— 看 → 描 → 写
   独立模块：MusicWrite.attach(host, api)。提示全部英文（MUSIC.md）。

   为什么不用写字母的那套引擎（hanzi-writer）：引擎每一笔都卡方向和顺序。
   家长确认过的写法里有几处「没要求」：低音谱号两个点先点哪个都行、符头椭圆顺时针逆时针都行，
   引擎做不到「这一笔两个方向都对」。谱号只有 2 个、音符 3 种，形状简单，这里自己判：

     path  谱号那一长笔：起笔点要对（G 线 / F 线 —— 这是老师反复强调的），整体形状贴着范字走
           （双向平均最近距离，写得快慢、哪段长哪段短都不影响），收笔点大致对
     loop  符头：画一个闭合的圈，位置、大小差不多就行，从哪起、往哪转都算对
     line  符干：一竖，位置、长度对就行，往上拉往下拉都算对（她是先符头后符干，顺序照卡）
     dot   低音谱号的两个点：点在两个间里，先点哪个都行

   格子坐标：100 × 130，五线谱的线在 y = 37 51 65 79 93（一个间 = 14），
   G 线（第二线）= 79，F 线（第四线）= 51，中线（第三线）= 65。
   范字是她的手写样子（等粗的中心线），不是印刷体——描和写照的是她要写出来的样子。
   四分音符：她画完圈以后自动涂满（家长选的「先画圈，再涂满」，涂满这一步 app 代劳）。
   符干朝向是特意的例外（MUSIC.md）：两种都练，并把规则讲给她。
   ────────────────────────────────────────────────────────────── */
(function (root) {
  "use strict";
  var NS = "http://www.w3.org/2000/svg";
  var LINES = [37, 51, 65, 79, 93];

  /* 符头：中心 (cx,cy)，略微向右上倾斜的椭圆 */
  function head(cx, cy) {
    var rx = 8.6, ry = 6, a = -20 * Math.PI / 180, d = "";
    for (var i = 0; i <= 36; i++) {
      var t = -Math.PI / 2 - i / 36 * Math.PI * 2;            /* 从顶上起，逆时针（和她写 o 一样） */
      var x = rx * Math.cos(t), y = ry * Math.sin(t);
      var X = cx + x * Math.cos(a) - y * Math.sin(a), Y = cy + x * Math.sin(a) + y * Math.cos(a);
      d += (i ? " L" : "M") + X.toFixed(1) + " " + Y.toFixed(1);
    }
    return d;
  }
  var LOW = 86, HIGH = 44, NX = 46;     /* 低音：一线和二线之间；高音：四线和五线之间 */
  var STEM = 47;                        /* 符干长 ≈ 三个半间 */
  var RULE_UP = "Notes below the middle line: stem up, on the right.";
  var RULE_DOWN = "Notes on or above the middle line: stem down, on the left.";

  var ITEMS = {
    treble: { name: "Treble clef", mark: 79, hi: "G",
      say: "This is the treble clef. Start on the G line. That's why it's called the G clef.",
      strokes: [{ k: "path", d: "M52 80 C52 73 44 71 40 76 C35 83 39 93 49 94 C60 95 66 87 64 78 C62 69 53 63 47 58 " +
                                 "C40 51 40 40 47 32 C52 25 57 18 55 16 C52 14 47 20 47 28 L55 108 C56 116 46 119 43 114" }] },
    bass: { name: "Bass clef", mark: 51, hi: "F",
      say: "This is the bass clef. Start on the F line, then add two dots. That's why it's called the F clef.",
      strokes: [{ k: "path", d: "M34 51 C34 42 41 37 49 37 C59 37 65 44 65 53 C65 68 51 80 32 87" },
                { k: "dot", x: 73, y: 44, g: 1 }, { k: "dot", x: 73, y: 58, g: 1 }] },
    semibreve: { name: "Semibreve", mid: true,
      say: "A semibreve is an empty oval.",
      strokes: [{ k: "loop", d: head(NX, 58), cx: NX, cy: 58 }] },
    "minim-up": { name: "Minim", mid: true,
      say: "A minim: draw the head, then the stem. " + RULE_UP,
      strokes: [{ k: "loop", d: head(NX, LOW), cx: NX, cy: LOW },
                { k: "line", d: "M" + (NX + 7.6) + " " + (LOW - 1) + " L" + (NX + 7.6) + " " + (LOW - STEM) }] },
    "minim-down": { name: "Minim", mid: true,
      say: "A minim: draw the head, then the stem. " + RULE_DOWN,
      strokes: [{ k: "loop", d: head(NX, HIGH), cx: NX, cy: HIGH },
                { k: "line", d: "M" + (NX - 7.6) + " " + (HIGH + 1) + " L" + (NX - 7.6) + " " + (HIGH + STEM) }] },
    "crotchet-up": { name: "Crotchet", mid: true, fill: true,
      say: "A crotchet: draw the head, it fills in. Then the stem. " + RULE_UP,
      strokes: [{ k: "loop", d: head(NX, LOW), cx: NX, cy: LOW },
                { k: "line", d: "M" + (NX + 7.6) + " " + (LOW - 1) + " L" + (NX + 7.6) + " " + (LOW - STEM) }] },
    "crotchet-down": { name: "Crotchet", mid: true, fill: true,
      say: "A crotchet: draw the head, it fills in. Then the stem. " + RULE_DOWN,
      strokes: [{ k: "loop", d: head(NX, HIGH), cx: NX, cy: HIGH },
                { k: "line", d: "M" + (NX - 7.6) + " " + (HIGH + 1) + " L" + (NX - 7.6) + " " + (HIGH + STEM) }] }
  };
  var ORDER = ["treble", "bass", "semibreve", "minim-up", "minim-down", "crotchet-up", "crotchet-down"];

  /* ── 几何 ── */
  function el(name, attrs) { var e = document.createElementNS(NS, name); for (var k in attrs) e.setAttribute(k, attrs[k]); return e; }
  function dist(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }
  function lengthOf(p) { var L = 0; for (var i = 1; i < p.length; i++) L += dist(p[i - 1], p[i]); return L; }
  function resample(p, n) {
    if (p.length < 2) return p.slice();
    var L = lengthOf(p), step = L / (n - 1), out = [p[0]], acc = 0, i = 1, prev = p[0];
    while (i < p.length && out.length < n) {
      var d = dist(prev, p[i]);
      if (acc + d >= step && d > 0) {
        var t = (step - acc) / d, q = { x: prev.x + (p[i].x - prev.x) * t, y: prev.y + (p[i].y - prev.y) * t };
        out.push(q); prev = q; acc = 0;
      } else { acc += d; prev = p[i]; i++; }
    }
    while (out.length < n) out.push(p[p.length - 1]);
    return out;
  }
  function meanNN(a, b) {
    var s = 0;
    a.forEach(function (p) { var m = 1e9; b.forEach(function (q) { var d = dist(p, q); if (d < m) m = d; }); s += m; });
    return s / a.length;
  }
  function chamfer(a, b) { return Math.max(meanNN(a, b), meanNN(b, a)); }
  function centroid(p) { var x = 0, y = 0; p.forEach(function (q) { x += q.x; y += q.y; }); return { x: x / p.length, y: y / p.length }; }
  function bbox(p) {
    var x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    p.forEach(function (q) { if (q.x < x0) x0 = q.x; if (q.x > x1) x1 = q.x; if (q.y < y0) y0 = q.y; if (q.y > y1) y1 = q.y; });
    return { w: x1 - x0, h: y1 - y0 };
  }
  /* 路径 → 采样点（用页面里的 <path> 量长度取点） */
  var sampler = null;
  function samplePath(d, n) {
    if (!sampler) { sampler = el("svg", { width: 0, height: 0, style: "position:absolute;width:0;height:0" }); document.body.appendChild(sampler); }
    var p = el("path", { d: d }); sampler.appendChild(p);
    var L = p.getTotalLength(), out = [];
    for (var i = 0; i < n; i++) { var q = p.getPointAtLength(L * i / (n - 1)); out.push({ x: q.x, y: q.y }); }
    sampler.removeChild(p);
    return out;
  }

  /* 判一笔。tol = 放宽倍数（描红、宽松模式更宽）。返回 true/false */
  function judge(st, pts, tol) {
    if (!pts.length) return false;
    var L = lengthOf(pts);
    if (st.k === "dot") {
      var c = centroid(pts);
      return L < 14 * tol && dist(c, st) < 7 * tol;
    }
    if (L < 4) return false;
    var u = resample(pts, 48);
    if (st.k === "loop") {
      var cc = centroid(u), b = bbox(u);
      return dist(u[0], u[u.length - 1]) < 9 * tol && dist(cc, { x: st.cx, y: st.cy }) < 7 * tol &&
             b.w > 7 / tol && b.w < 30 * tol && b.h > 5 / tol && b.h < 22 * tol;
    }
    var t = st.pts || (st.pts = samplePath(st.d, 48));
    if (st.k === "line") {
      var r = L / lengthOf(t);
      return chamfer(u, t) < 4.5 * tol && r > 0.55 / tol && r < 1.6 * tol;
    }
    /* path：谱号。起笔点最要紧（从 G 线 / F 线起），再看整体形状和收笔 */
    return dist(u[0], t[0]) < 10 * tol && chamfer(u, t) < 7 * tol && dist(u[u.length - 1], t[t.length - 1]) < 16 * tol;
  }

  /* ── 界面 ── api：id, list, pos, speak(txt), beep(kind), cat(host), leniency(), onDone({id,misses,hints}), next:{label,go} */
  function attach(host, api) {
    var it = ITEMS[api.id], plan = ["trace", "write", "write"], cell = -1, sIdx = 0, dotsLeft = [];
    var misses = 0, hints = 0, missOnStroke = 0, ink = [], drawing = null, pet = null, dead = false, timers = [];
    function later(fn, ms) { timers.push(setTimeout(function () { if (!dead) fn(); }, ms)); }

    host.innerHTML =
      '<div class="mw">' +
        '<div class="mw-head"><b class="mw-name">' + it.name + '</b><span class="mw-pos">' + (api.pos || "") + '</span></div>' +
        '<p class="mw-say"></p>' +
        '<div class="mw-steps"></div>' +
        '<div class="mw-stage"><svg class="mw-cell" viewBox="0 0 100 130"></svg><div class="mw-pet"></div></div>' +
        '<div class="controls mw-ctl"></div>' +
      "</div>";
    var svg = host.querySelector(".mw-cell"), sayEl = host.querySelector(".mw-say"),
        stepsEl = host.querySelector(".mw-steps"), ctl = host.querySelector(".mw-ctl");
    if (api.cat) pet = api.cat(host.querySelector(".mw-pet"));

    function btn(label, cls, fn) { var b = document.createElement("button"); b.className = "btn " + (cls || ""); b.textContent = label; b.onclick = fn; return b; }
    function controls() { ctl.innerHTML = ""; [].slice.call(arguments).forEach(function (b) { if (b) ctl.appendChild(b); }); }

    /* 画格子：五线谱（谱号的那条线、音符的中线标颜色）+ 描红底 + 她的笔迹 + 提示层 */
    var gGuide, gInk, gHint;
    function draw(showGuide) {
      svg.innerHTML = "";
      LINES.forEach(function (y) {
        var cls = "mw-l" + ((it.mark === y) ? " key" : "") + ((it.mid && y === 65) ? " mid" : "");
        svg.appendChild(el("line", { x1: 3, y1: y, x2: 97, y2: y, "class": cls }));
      });
      if (it.hi) { var t = el("text", { x: 96, y: it.mark - 2, "class": "mw-lt", "text-anchor": "end" }); t.textContent = it.hi + " line"; svg.appendChild(t); }
      if (it.mid) { var t2 = el("text", { x: 96, y: 63, "class": "mw-lt mid", "text-anchor": "end" }); t2.textContent = "middle line"; svg.appendChild(t2); }
      gGuide = el("g", { "class": "mw-guide" }); gInk = el("g", { "class": "mw-ink" }); gHint = el("g", { "class": "mw-hint" });
      svg.appendChild(gGuide); svg.appendChild(gInk); svg.appendChild(gHint);
      if (showGuide) it.strokes.forEach(function (st) { gGuide.appendChild(shape(st)); });
    }
    function shape(st) {
      return st.k === "dot" ? el("circle", { cx: st.x, cy: st.y, r: 2.8, "class": "dot" }) : el("path", { d: st.d });
    }
    function inkPath(pts, cls) {
      if (pts.length === 1) return el("circle", { cx: pts[0].x, cy: pts[0].y, r: 2.6, "class": "dot " + (cls || "") });
      return el("path", { d: "M" + pts.map(function (q) { return q.x.toFixed(1) + " " + q.y.toFixed(1); }).join(" L"), "class": cls || "" });
    }
    /* 按笔顺画一遍（看的阶段、写错后的示范都用它） */
    function animate(list, g, cls) {
      var t = 0;
      list.forEach(function (st) {
        var e = shape(st); if (cls) e.setAttribute("class", (e.getAttribute("class") || "") + " " + cls);
        g.appendChild(e);
        if (st.k === "dot") { e.style.opacity = 0; e.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 250, delay: t, fill: "forwards" }); t += 400; }
        else {
          var L = e.getTotalLength(); e.style.strokeDasharray = L; e.style.strokeDashoffset = L;
          var dur = Math.max(500, L * 9);
          e.animate([{ strokeDashoffset: L }, { strokeDashoffset: 0 }], { duration: dur, delay: t, fill: "forwards", easing: "ease-in-out" });
          t += dur + 250;
        }
      });
      return t;
    }
    function steps() {
      stepsEl.innerHTML = plan.map(function (k, i) {
        return '<span class="' + (i < cell ? "done" : i === cell ? "now" : "") + '">' + (k === "trace" ? "Trace" : "Write") + "</span>";
      }).join("");
    }

    function watch() {
      cell = -1; steps(); draw(false);
      sayEl.textContent = it.say;
      animate(it.strokes, gGuide, "demo");
      api.speak(it.say);
      controls(btn("Watch again", "quiet", watch), btn("Start →", "", function () { api.beep("tap"); run(0); }));
    }
    function run(i) {
      if (i >= plan.length) return finish();
      cell = i; sIdx = 0; ink = []; missOnStroke = 0; dotsLeft = [];
      steps(); draw(plan[i] === "trace");
      sayEl.textContent = plan[i] === "trace" ? "Trace over the grey shape." : "Now write it yourself.";
      controls(btn("Start again", "quiet", function () { api.beep("tap"); run(cell); }), btn("Watch", "ghost", watch));
    }
    /* 这一笔该判哪个：两个点是一组，先点哪个都行 */
    function expected() {
      var st = it.strokes[sIdx]; if (!st) return null;
      if (st.k === "dot" && !dotsLeft.length) dotsLeft = it.strokes.filter(function (s) { return s.k === "dot"; });
      return st;
    }
    function strokeDone(pts) {
      var st = expected(); if (!st || cell < 0) return;
      var tol = api.leniency() * (plan[cell] === "trace" ? 1.3 : 1);
      var ok = false, hit = null;
      if (st.k === "dot") { for (var i = 0; i < dotsLeft.length; i++) if (judge(dotsLeft[i], pts, tol)) { ok = true; hit = dotsLeft[i]; break; } }
      else ok = judge(st, pts, tol);
      if (ok) {
        api.beep("tap"); missOnStroke = 0; gHint.innerHTML = "";
        var e = inkPath(pts, st.k === "dot" ? "" : "");
        if (it.fill && st.k === "loop") e.setAttribute("class", "filled");   /* 四分音符：画完圈自动涂满 */
        gInk.appendChild(e); ink.push(pts);
        if (hit) dotsLeft.splice(dotsLeft.indexOf(hit), 1);
        sIdx++;
        if (sIdx >= it.strokes.length) later(function () { cellDone(); }, 350);
        return;
      }
      /* 错了：她的这一笔闪一下再消失；同一笔错够次数就示范这一笔 */
      api.beep("bad");
      if (plan[cell] === "write") misses++;
      missOnStroke++;
      var bad = inkPath(pts, "bad"); gInk.appendChild(bad);
      later(function () { if (bad.parentNode) bad.parentNode.removeChild(bad); }, 450);
      if (missOnStroke >= (plan[cell] === "trace" ? 1 : 2)) {
        if (plan[cell] === "write") hints++;
        gHint.innerHTML = "";
        animate(st.k === "dot" ? dotsLeft : [st], gHint, "hint");
        if (st.k === "path" && missOnStroke === 2 && it.hi) api.speak("Start on the " + it.hi + " line.");
      }
    }
    function cellDone() {
      api.beep("good");
      if (cell + 1 < plan.length) later(function () { run(cell + 1); }, 500);
      else later(finish, 500);
    }
    function finish() {
      cell = plan.length; steps();
      sayEl.textContent = "Well done!";
      if (pet && pet.happy) pet.happy(1);            /* 写完就高兴，不看错了几次（和写字页同一条规矩） */
      api.speak("Well done!");
      api.onDone({ id: api.id, misses: misses, hints: hints });
      controls(btn("Again", "quiet", function () { misses = 0; hints = 0; run(0); }),
               api.next ? btn(api.next.label, "", api.next.go) : null);
    }

    /* ── 手写输入 ── */
    function toBox(e) {
      var p = svg.createSVGPoint(); p.x = e.clientX; p.y = e.clientY;
      var q = p.matrixTransform(svg.getScreenCTM().inverse()); return { x: q.x, y: q.y };
    }
    svg.addEventListener("pointerdown", function (e) {
      if (cell < 0 || cell >= plan.length) return;
      e.preventDefault(); svg.setPointerCapture(e.pointerId);
      drawing = { pts: [toBox(e)], el: inkPath([toBox(e)], "live") }; gInk.appendChild(drawing.el);
    });
    svg.addEventListener("pointermove", function (e) {
      if (!drawing) return;
      var q = toBox(e), last = drawing.pts[drawing.pts.length - 1];
      if (dist(q, last) < 0.6) return;
      drawing.pts.push(q);
      var ne = inkPath(drawing.pts, "live"); gInk.replaceChild(ne, drawing.el); drawing.el = ne;
    });
    function up() {
      if (!drawing) return;
      var d = drawing; drawing = null;
      if (d.el.parentNode) d.el.parentNode.removeChild(d.el);
      strokeDone(d.pts);
    }
    svg.addEventListener("pointerup", up);
    svg.addEventListener("pointercancel", up);

    watch();
    return { destroy: function () { dead = true; timers.forEach(clearTimeout); if (pet && pet.destroy) pet.destroy(); host.innerHTML = ""; } };
  }

  /* 小图标（音乐页的列表用）：她的手写范字 */
  function icon(id) {
    var it = ITEMS[id], h = '<svg class="mw-icon" viewBox="0 0 100 130" aria-hidden="true">';
    LINES.forEach(function (y) { h += '<line x1="3" y1="' + y + '" x2="97" y2="' + y + '" class="mw-l"/>'; });
    it.strokes.forEach(function (st) {
      if (st.k === "dot") h += '<circle cx="' + st.x + '" cy="' + st.y + '" r="2.8" class="ic-dot"/>';
      else h += '<path d="' + st.d + '" class="ic' + (it.fill && st.k === "loop" ? " filled" : "") + '"/>';
    });
    return h + "</svg>";
  }

  root.MusicWrite = { attach: attach, ITEMS: ITEMS, ORDER: ORDER, icon: icon, judge: judge, samplePath: samplePath };
})(window);
