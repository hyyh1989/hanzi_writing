/* ──────────────────────────────────────────────────────────────
   写谱号 · 写音符 —— 描 → 写
   独立模块：MusicWrite.attach(host, api)。提示全部英文（MUSIC.md）。

   2026-09-29 家长试过后改的三条（别改回去）：
     · 打开直接开始描，**开头不演示、不讲解、不出说明文字**；写错了才提示
       （示范这一笔 + 一句英文，比如「Start with a dot on the G line.」「Middle C goes here.」）。
       「Watch」按钮留着，想看的时候自己点
     · 加线、符干跟着【她画的圈】走：圈画得偏一点也算对的话，加线要从她的圈中间穿过、
       符干要贴着她的圈的边——不能还按标准位置判，不然看起来是从圈上面穿过去、插在圈顶上
     · 写音符的格子：音符间距拉大，谱号固定在左边，写到后面整串往左滑，给下一个音留地方

   四项（2026-09-29 家长看了练习册后定的）：
     Treble clef、Bass clef ——
       高音谱号照印刷体的走向：G 线上点圆起笔 → 先往右画半圈绕下去 → 转到左边往上 →
       升到顶上的尖 → 一竖往下穿过圈 → 左弯钩，收笔再点一个圆。
       低音谱号：F 线上点圆起笔 → 画弧 → 两个点。
     Treble notes：Middle C D E F G（她的练习册就是这样一串写下来，不是单独练一个全音符）
     Bass notes：F G A B Middle C
       固定写二分音符（家长试过后定的，见 pickType）。
       符干朝向跟着位置走：高音这 5 个都在中线下 → 朝上在右；低音这 5 个都在中线上 → 朝下在左。
       Middle C 她是连加线一起写的（练习册上是一个圈中间一道横），加线也要她写。

   为什么不用写字母的引擎：引擎每一笔都卡方向和顺序，而这里有好几处「怎么写都对」：
   起笔的圆（单独点一下，或者按着笔转个小圈接着画）、两个点的先后、圈的方向、
   Middle C 先画圈还是先画加线、符干往上拉还是往下拉。所以自己判：

     path  谱号那一长笔：起笔点要对（G 线 / F 线，老师反复强调的），整体形状贴着范字走，收笔大致对
     loop  符头：闭合的圈，位置、大小差不多就行，从哪起、往哪转都算对
     line  符干、加线：位置、长度对就行，两个方向都算对
     dot   点：点在该点的地方
   同一个 g 的几笔不分先后（低音谱号两个点；Middle C 的圈和加线）。
   lead：起笔的圆 —— 她要是没单独点、直接从那里画下去，下一笔对了就连这个圆一起算对。
   opt：收笔的圆 —— 点了算对，没点也不算错（1.4 秒后自动算这一格写完）。

   格子坐标：高 130，五线谱的线在 y = 37 51 65 79 93（一个间 = 14，每个音差 7），
   G 线（第二线）= 79，F 线（第四线）= 51，中线（第三线）= 65。
   谱号的范字是她的手写样子（等粗中心线）；写音符的格子左边固定一块，印一个印刷体谱号。
   ────────────────────────────────────────────────────────────── */
(function (root) {
  "use strict";
  var NS = "http://www.w3.org/2000/svg";
  var LINES = [37, 51, 65, 79, 93];
  var RULE_UP = "Notes below the middle line: stem up, on the right.";
  var RULE_DOWN = "Notes on or above the middle line: stem down, on the left.";

  /* 符头：中心 (cx,cy)，略微向右上倾斜的椭圆，从顶上起逆时针（和她写 o 一样；判的时候方向不限） */
  function headPath(cx, cy) {
    var rx = 8.6, ry = 6, a = -20 * Math.PI / 180, d = "";
    for (var i = 0; i <= 36; i++) {
      var t = -Math.PI / 2 - i / 36 * Math.PI * 2, x = rx * Math.cos(t), y = ry * Math.sin(t);
      d += (i ? " L" : "M") + (cx + x * Math.cos(a) - y * Math.sin(a)).toFixed(1) + " " + (cy + x * Math.sin(a) + y * Math.cos(a)).toFixed(1);
    }
    return d;
  }

  var CLEFS = {
    treble: { name: "Treble clef", w: 100, mark: 79, hi: "G",
      tip: "Start with a dot on the G line. Go round to the right first.",
      strokes: [
        { k: "dot", x: 50, y: 79, lead: true },
        { k: "path", d: "M50 79 C58 79 63 84 61 90 C58 97 42 98 36 90 C31 82 34 68 46 63 C58 58 64 50 62 40 " +
                        "C60 30 55 20 52 14 C49 10 44 16 45 24 L54 104 C55 112 47 115 43 110" },
        { k: "dot", x: 43, y: 110, opt: true }] },
    bass: { name: "Bass clef", w: 100, mark: 51, hi: "F",
      tip: "Start with a dot on the F line.",
      strokes: [
        { k: "dot", x: 34, y: 51, lead: true },
        { k: "path", d: "M34 51 C34 42 41 37 49 37 C59 37 65 44 65 53 C65 68 51 80 32 87" },
        { k: "dot", x: 73, y: 44, g: 1, tip: "Two dots: one above the F line, one below." },
        { k: "dot", x: 73, y: 58, g: 1, tip: "Two dots: one above the F line, one below." }] }
  };
  /* 两串音：step = 离最下面一线几个音（每个音 7 个单位）。
     高音谱号最下一线是 E，低音谱号是 G */
  var SEQS = {
    "notes-treble": { name: "Treble notes", clef: "treble", up: true,
      notes: [["C", -2, "Middle C"], ["D", -1], ["E", 0], ["F", 1], ["G", 2]] },
    "notes-bass": { name: "Bass notes", clef: "bass", up: false,
      notes: [["F", 6], ["G", 7], ["A", 8], ["B", 9], ["C", 10, "Middle C"]] }
  };
  var TYPES = { minim: { stem: true }, crotchet: { stem: true, fill: true }, semibreve: { stem: false } };
  /* 固定写二分音符（2026-09-29 家长：她平时一般写二分；四分音符画完圈自动涂黑看着怪）。
     四分、全音符的数据留着：以后要轮换，得在开头用语音说清「这次写什么」，四分音符让她自己涂 */
  function pickType() { return "minim"; }

  /* 写音符的格子：看得见的宽 VIEW_W，左边 PANEL 宽一块固定放谱号；音符排在一条「长纸带」上，
     间距 NOTE_DX（原来 34 太挤），写到第几个音，纸带就往左滑到让这个音落在 FOCUS_X 附近 */
  var VIEW_W = 200, PANEL = 50, NOTE_X0 = 84, NOTE_DX = 56, FOCUS_X = 122;
  function buildSeq(id, type) {
    var q = SEQS[id], T = TYPES[type], strokes = [], slots = [];
    q.notes.forEach(function (n, i) {
      var x = NOTE_X0 + NOTE_DX * i, y = 93 - n[1] * 7, g = "n" + i, name = n[2] || n[0];
      slots.push({ x: x, y: y, letter: n[0], name: name });
      strokes.push({ k: "loop", d: headPath(x, y), cx: x, cy: y, g: g, note: i, fill: !!T.fill, tip: name + " goes here." });
      /* 加线：只有落在「线上」的谱外音才有（Middle C）；谱外间里的音（高音 D、低音 B）没有。和圈不分先后 */
      if ((n[1] < 0 || n[1] > 8) && n[1] % 2 === 0)
        strokes.push({ k: "line", ledger: true, d: "M" + (x - 12) + " " + y + " L" + (x + 12) + " " + y, g: g, note: i,
                       tip: "Middle C has a little line through it." });
      if (T.stem) strokes.push(q.up
        ? { k: "line", stem: "up", d: "M" + (x + 7.6) + " " + (y - 1) + " L" + (x + 7.6) + " " + (y - 47), note: i, tip: RULE_UP }
        : { k: "line", stem: "down", d: "M" + (x - 7.6) + " " + (y + 1) + " L" + (x - 7.6) + " " + (y + 47), note: i, tip: RULE_DOWN });
    });
    strokes.forEach(function (st) { st.d0 = st.d; });
    return { name: q.name, w: VIEW_W, tape: NOTE_X0 + NOTE_DX * 4 + 40, mid: true, printedClef: q.clef,
             slots: slots, strokes: strokes, type: type };
  }
  /* 她画完一个圈：这个音的加线、符干改成贴着她的圈（加线从圈中间穿过，符干贴着圈的右边 / 左边） */
  function fitToHead(it, i, pts) {
    var c = centroid(pts), b = bbox(pts);
    it.strokes.forEach(function (st) {
      if (st.note !== i || st.k !== "line") return;
      if (st.ledger) st.d = "M" + (c.x - 12) + " " + c.y + " L" + (c.x + 12) + " " + c.y;
      else if (st.stem === "up") st.d = "M" + (b.x1 - 0.8) + " " + (c.y - 1) + " L" + (b.x1 - 0.8) + " " + (c.y - 47);
      else st.d = "M" + (b.x0 + 0.8) + " " + (c.y + 1) + " L" + (b.x0 + 0.8) + " " + (c.y + 47);
      st.pts = null;
    });
  }
  var ORDER = ["treble", "bass", "notes-treble", "notes-bass"];
  var NAMES = { treble: "Treble clef", bass: "Bass clef", "notes-treble": "Treble notes", "notes-bass": "Bass notes" };

  /* ── 几何 ── */
  function el(name, attrs) { var e = document.createElementNS(NS, name); for (var k in attrs) e.setAttribute(k, attrs[k]); return e; }
  function dist(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }
  function lengthOf(p) { var L = 0; for (var i = 1; i < p.length; i++) L += dist(p[i - 1], p[i]); return L; }
  function resample(p, n) {
    if (p.length < 2) return p.slice();
    var L = lengthOf(p), step = L / (n - 1), out = [p[0]], acc = 0, i = 1, prev = p[0];
    while (i < p.length && out.length < n) {
      var d = dist(prev, p[i]);
      if (acc + d >= step && d > 0) { var t = (step - acc) / d, q = { x: prev.x + (p[i].x - prev.x) * t, y: prev.y + (p[i].y - prev.y) * t }; out.push(q); prev = q; acc = 0; }
      else { acc += d; prev = p[i]; i++; }
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
    return { w: x1 - x0, h: y1 - y0, x0: x0, x1: x1 };
  }
  var sampler = null;
  function samplePath(d, n) {
    if (!sampler) { sampler = el("svg", { width: 0, height: 0, style: "position:absolute;width:0;height:0" }); document.body.appendChild(sampler); }
    var p = el("path", { d: d }); sampler.appendChild(p);
    var L = p.getTotalLength(), out = [];
    for (var i = 0; i < n; i++) { var q = p.getPointAtLength(L * i / (n - 1)); out.push({ x: q.x, y: q.y }); }
    sampler.removeChild(p);
    return out;
  }

  /* 判一笔。tol = 放宽倍数（描红、宽松模式更宽） */
  function judge(st, pts, tol) {
    if (!pts.length) return false;
    var L = lengthOf(pts);
    if (st.k === "dot") return L < 16 * tol && dist(centroid(pts), st) < 7 * tol;
    if (L < 4) return false;
    var u = resample(pts, 48);
    if (st.k === "loop") {
      var b = bbox(u);
      /* 上下位置要准到半个间以内（差一个音 = 7），不然写成了别的音；左右放宽 */
      var cc = centroid(u);
      return dist(u[0], u[u.length - 1]) < 9 * tol && Math.abs(cc.y - st.cy) < 3.2 * tol && Math.abs(cc.x - st.cx) < 9 * tol &&
             b.w > 7 / tol && b.w < 28 * tol && b.h > 5 / tol && b.h < 20 * tol;
    }
    var t = st.pts || (st.pts = samplePath(st.d, 48));
    if (st.k === "line") {
      var r = L / lengthOf(t), cu = centroid(u), ct = centroid(t);
      if (!(chamfer(u, t) < 4.5 * tol && r > 0.5 / tol && r < 1.7 * tol)) return false;
      /* 加线要从圈的中间穿过（上下差不多），符干要贴着圈的边（左右差不多）——不然看起来就是
         从圈上面擦过去、插在圈顶上（家长 2026-09-29 指出的）。目标位置已经按她画的圈挪过了 */
      if (st.ledger) return Math.abs(cu.y - ct.y) < 2.2 * tol;
      if (st.stem) return Math.abs(cu.x - ct.x) < 2.2 * tol;
      return true;
    }
    /* path（谱号）：起笔点、整体形状、收笔点。起笔处要是转了个小圈当作起笔的圆，形状比较时把开头那段去掉 */
    var start = u[0], s0 = 0;
    for (var i = 1; i < u.length && dist(u[i], t[0]) < 7 * tol; i++) s0 = i;
    var body = s0 > 0 && s0 < u.length - 8 ? resample(pts.slice(Math.floor(s0 / 48 * pts.length)), 48) : u;
    return dist(start, t[0]) < 10 * tol && chamfer(body, t) < 7 * tol && dist(u[u.length - 1], t[t.length - 1]) < 16 * tol;
  }

  /* ── 界面 ── api：id, pos, speak(txt), beep(kind), cat(host), leniency(), clefSvg(clef)（印刷体谱号的 <path>），
         onDone({id,misses,hints}), next:{label,go} */
  function attach(host, api) {
    var isSeq = !!SEQS[api.id];
    var it = isSeq ? buildSeq(api.id, pickType()) : CLEFS[api.id];
    var plan = isSeq ? ["trace", "write"] : ["trace", "write", "write"];
    var cell = -1, done = [], misses = 0, hints = 0, missOn = 0, drawing = null, pet = null, dead = false, timers = [], optTimer = null;
    var off = 0, curNote = -1;
    function later(fn, ms) { var t = setTimeout(function () { if (!dead) fn(); }, ms); timers.push(t); return t; }

    host.innerHTML =
      '<div class="mw' + (isSeq ? " seq" : "") + '">' +
        '<div class="mw-head"><b class="mw-name">' + it.name + '</b><span class="mw-pos">' + (api.pos || "") + '</span></div>' +
        '<div class="mw-steps"></div>' +
        '<div class="mw-stage"><svg class="mw-cell" viewBox="0 0 ' + it.w + ' 130"></svg><div class="mw-pet"></div></div>' +
        '<p class="mw-say" aria-live="polite"></p>' +
        '<div class="controls mw-ctl"></div>' +
      "</div>";
    var svg = host.querySelector(".mw-cell"), sayEl = host.querySelector(".mw-say"),
        stepsEl = host.querySelector(".mw-steps"), ctl = host.querySelector(".mw-ctl");
    if (api.cat) pet = api.cat(host.querySelector(".mw-pet"));
    function btn(label, cls, fn) { var b = document.createElement("button"); b.className = "btn " + (cls || ""); b.textContent = label; b.onclick = fn; return b; }
    function controls() { ctl.innerHTML = ""; [].slice.call(arguments).forEach(function (b) { if (b) ctl.appendChild(b); }); }

    /* 图层：五线谱（整宽）→ 纸带（音符的底色、字母、描红、她的笔迹、提示；写音符时会左右滑）→ 左边固定的谱号块 */
    var gTape, gBack, gSlot, gGuide, gInk, gHint;
    function draw(showGuide) {
      svg.innerHTML = "";
      /* 当前音的底色在五线谱的线下面一层（不然会盖住线），和纸带一起滑 */
      gBack = el("g", { "class": "mw-tape" }); svg.appendChild(gBack);
      gSlot = el("g", { "class": "mw-slots" }); gBack.appendChild(gSlot);
      LINES.forEach(function (y) {
        var cls = "mw-l" + (it.mark === y ? " key" : "") + (it.mid && y === 65 ? " mid" : "");
        svg.appendChild(el("line", { x1: 3, y1: y, x2: it.w - 3, y2: y, "class": cls }));
      });
      if (it.hi) { var t = el("text", { x: it.w - 4, y: it.mark - 2, "class": "mw-lt", "text-anchor": "end" }); t.textContent = it.hi + " line"; svg.appendChild(t); }
      gTape = el("g", { "class": "mw-tape" }); svg.appendChild(gTape);
      if (it.slots) it.slots.forEach(function (s, i) {
        var lt = el("text", { x: s.x, y: 126, "class": "mw-letter", "text-anchor": "middle", "data-i": i }); lt.textContent = s.letter; gTape.appendChild(lt);
      });
      gGuide = el("g", { "class": "mw-guide" }); gInk = el("g", { "class": "mw-ink" }); gHint = el("g", { "class": "mw-hint" });
      gTape.appendChild(gGuide); gTape.appendChild(gInk); gTape.appendChild(gHint);
      if (it.printedClef) {
        var pnl = el("g", { "class": "mw-panel" });
        pnl.appendChild(el("rect", { x: 0, y: 0, width: PANEL, height: 130, "class": "mw-panel-bg" }));
        LINES.forEach(function (y) { pnl.appendChild(el("line", { x1: 3, y1: y, x2: PANEL, y2: y, "class": "mw-l" + (y === 65 ? " mid" : "") })); });
        if (api.clefSvg) { var c = el("g", { "class": "mw-pclef" }); c.innerHTML = api.clefSvg(it.printedClef); pnl.appendChild(c); }
        svg.appendChild(pnl);
      }
      if (showGuide) it.strokes.forEach(function (st) { gGuide.appendChild(shape(st)); });
      setOff(0, false);
    }
    /* 纸带左右滑（px 在 SVG 里就是格子单位） */
    function setOff(o, anim) {
      off = o;
      [gBack, gTape].forEach(function (g) {
        g.style.transition = anim ? "transform .45s ease" : "none";
        g.style.transform = "translateX(" + (-o) + "px)";
      });
    }
    function shape(st) {
      if (st.k === "dot") return el("circle", { cx: st.x, cy: st.y, r: 3, "class": "dot" });
      var e = el("path", { d: st.d }); if (st.fill) e.setAttribute("class", "filled"); return e;
    }
    function inkPath(pts, cls) {
      if (pts.length === 1 || lengthOf(pts) < 3) { var c = centroid(pts); return el("circle", { cx: c.x, cy: c.y, r: 3, "class": "dot " + (cls || "") }); }
      return el("path", { d: "M" + pts.map(function (q) { return q.x.toFixed(1) + " " + q.y.toFixed(1); }).join(" L"), "class": cls || "" });
    }
    function animate(list, g, cls) {
      var t = 0;
      list.forEach(function (st) {
        var e = shape(st); e.setAttribute("class", ((e.getAttribute("class") || "") + " " + (cls || "")).trim());
        if (st.k === "dot" || st.fill) {
          if (st.fill) {                                  /* 四分音符：先画圈，再涂满 */
            var o = el("path", { d: st.d, "class": (cls || "") }); g.appendChild(o);
            var L0 = o.getTotalLength(); o.style.strokeDasharray = L0; o.style.strokeDashoffset = L0;
            o.animate([{ strokeDashoffset: L0 }, { strokeDashoffset: 0 }], { duration: 500, delay: t, fill: "forwards" });
            t += 550;
          }
          g.appendChild(e);
          e.style.opacity = 0; e.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 250, delay: t, fill: "forwards" }); t += 380;
        } else {
          g.appendChild(e);
          var L = e.getTotalLength(); e.style.strokeDasharray = L; e.style.strokeDashoffset = L;
          var dur = Math.max(450, L * 8);
          e.animate([{ strokeDashoffset: L }, { strokeDashoffset: 0 }], { duration: dur, delay: t, fill: "forwards", easing: "ease-in-out" });
          t += dur + 200;
        }
      });
      return t;
    }
    function steps() {
      stepsEl.innerHTML = plan.map(function (k, i) {
        return '<span class="' + (i < cell ? "done" : i === cell ? "now" : "") + '">' + (k === "trace" ? "Trace" : "Write") + "</span>";
      }).join("");
    }
    /* 写音符：当前这个音的位置标底色、字母加粗，纸带滑到让它落在 FOCUS_X */
    function markNote(i) {
      if (!it.slots || i === curNote) return;
      curNote = i; gSlot.innerHTML = "";
      if (i >= 0 && i < it.slots.length) {
        var s = it.slots[i];
        gSlot.appendChild(el("rect", { x: s.x - 20, y: 8, width: 40, height: 110, rx: 6, "class": "mw-slot" }));
        setOff(Math.max(0, Math.min(s.x - FOCUS_X, it.tape - it.w)), true);
      }
      [].forEach.call(svg.querySelectorAll(".mw-letter"), function (t) { t.classList.toggle("now", +t.dataset.i === i); });
    }
    function tip(t) { sayEl.textContent = t || ""; }

    /* 「Watch」：示范现在该写的这几笔（谱号就是整个谱号） */
    function watch() {
      api.beep("tap"); gHint.innerHTML = "";
      var c = candidates(); if (!c.length) return;
      var list = isSeq ? it.strokes.filter(function (s, j) { return !done[j] && s.note === it.strokes[c[0]].note; })
                                         : it.strokes.filter(function (s, j) { return !done[j]; });
      animate(list.length ? list : it.strokes, gHint, "hint");
    }
    function run(i) {
      if (i >= plan.length) return finish();
      cell = i; done = it.strokes.map(function () { return false; }); missOn = 0; curNote = -1;
      it.strokes.forEach(function (st) { if (st.d0) { st.d = st.d0; st.pts = null; } });
      if (optTimer) { clearTimeout(optTimer); optTimer = null; }
      steps(); draw(plan[i] === "trace"); tip("");
      if (isSeq) markNote(0);
      controls(btn("Start again", "quiet", function () { api.beep("tap"); run(cell); }), btn("Watch", "ghost", watch));
    }
    /* 现在可以写的几笔：第一个没写的那一笔，加上和它同一组（g 相同）的 */
    function candidates() {
      var i = done.indexOf(false); if (i < 0) return [];
      var st = it.strokes[i], out = [i];
      if (st.g != null) it.strokes.forEach(function (s, j) { if (j !== i && !done[j] && s.g === st.g) out.push(j); });
      return out;
    }
    function accept(j, pts) {
      var st = it.strokes[j]; done[j] = true;
      gInk.appendChild(pts ? inkPath(pts, st.fill ? "filled" : "") : shape(st));   /* 没单独点的起笔圆：替她补上 */
      if (pts && st.k === "loop") fitToHead(it, st.note, pts);
    }
    function remainingOptional() {
      return done.every(function (d, j) { return d || it.strokes[j].opt; }) && done.indexOf(false) >= 0;
    }
    function strokeDone(pts) {
      if (cell < 0 || cell >= plan.length) return;
      var tol = api.leniency() * (plan[cell] === "trace" ? 1.3 : 1), cand = candidates(), hit = -1;
      cand.forEach(function (j) { if (hit < 0 && judge(it.strokes[j], pts, tol)) hit = j; });
      /* 起笔的圆没单独点、直接画下去了：拿下一笔来比，对了就连圆一起算 */
      if (hit < 0 && cand.length === 1 && it.strokes[cand[0]].lead) {
        var nx = cand[0] + 1;
        if (it.strokes[nx] && judge(it.strokes[nx], pts, tol)) { accept(cand[0], null); hit = nx; }
      }
      if (hit >= 0) {
        api.beep("tap"); missOn = 0; gHint.innerHTML = ""; tip("");
        if (optTimer) { clearTimeout(optTimer); optTimer = null; }
        accept(hit, pts);
        var nxt = done.indexOf(false);
        if (nxt < 0) { later(cellDone, 350); return; }
        if (isSeq) markNote(it.strokes[nxt].note);
        if (remainingOptional()) optTimer = later(function () { optTimer = null; cellDone(); }, 1400);
        return;
      }
      /* 错了：她的这一笔闪一下再消失；描红时错一次、自己写时错两次，就示范这一笔并说一句英文 */
      api.beep("bad");
      if (plan[cell] === "write") misses++;
      missOn++;
      var bad = inkPath(pts, "bad"); gInk.appendChild(bad);
      later(function () { if (bad.parentNode) bad.parentNode.removeChild(bad); }, 450);
      if (missOn >= (plan[cell] === "trace" ? 1 : 2)) {
        if (plan[cell] === "write") hints++;
        gHint.innerHTML = "";
        var list = cand.map(function (j) { return it.strokes[j]; });
        if (list[0].lead) list.push(it.strokes[cand[0] + 1]);
        animate(list, gHint, "hint");
        var t = list[0].tip || it.tip;
        if (t && (missOn === 1 || missOn === 2)) { tip(t); api.speak(t); }
      }
    }
    function cellDone() {
      if (optTimer) { clearTimeout(optTimer); optTimer = null; }
      api.beep("good");
      later(function () { run(cell + 1); }, 600);
    }
    function finish() {
      cell = plan.length; steps(); markNote(-1); setOff(0, true);
      tip("Well done!");
      if (pet && pet.happy) pet.happy(1);            /* 写完就高兴，不看错了几次（和写字页同一条规矩） */
      api.speak("Well done!");
      api.onDone({ id: api.id, misses: misses, hints: hints });
      controls(btn("Again", "quiet", function () { misses = 0; hints = 0; run(0); }), api.next ? btn(api.next.label, "", api.next.go) : null);
    }

    /* 手写输入：屏幕坐标 → 格子坐标，再加上纸带滑过的距离 */
    function toBox(e) {
      var p = svg.createSVGPoint(); p.x = e.clientX; p.y = e.clientY;
      var q = p.matrixTransform(svg.getScreenCTM().inverse()); return { x: q.x + off, y: q.y };
    }
    svg.addEventListener("pointerdown", function (e) {
      if (cell < 0 || cell >= plan.length) return;
      e.preventDefault(); try { svg.setPointerCapture(e.pointerId); } catch (_) {}
      var q = toBox(e); drawing = { pts: [q], el: inkPath([q], "live") }; gInk.appendChild(drawing.el);
    });
    svg.addEventListener("pointermove", function (e) {
      if (!drawing) return;
      var q = toBox(e); if (dist(q, drawing.pts[drawing.pts.length - 1]) < 0.6) return;
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

    run(0);                   /* 直接开始描，不先演示、不讲解（家长 2026-09-29） */
    return { destroy: function () { dead = true; timers.forEach(clearTimeout); if (pet && pet.destroy) pet.destroy(); host.innerHTML = ""; } };
  }

  /* 小图标（音乐页的列表）：谱号是她的手写范字；写音符是一串二分音符 */
  function icon(id) {
    var it = SEQS[id] ? buildSeq(id, "minim") : CLEFS[id], W = it.tape || it.w;
    var h = '<svg class="mw-icon' + (SEQS[id] ? " wide" : "") + '" viewBox="' + (SEQS[id] ? 60 : 0) + ' 0 ' + (W - (SEQS[id] ? 60 : 0)) + ' 130" aria-hidden="true">';
    LINES.forEach(function (y) { h += '<line x1="3" y1="' + y + '" x2="' + (W - 3) + '" y2="' + y + '" class="mw-l"/>'; });
    it.strokes.forEach(function (st) {
      if (st.k === "dot") h += '<circle cx="' + st.x + '" cy="' + st.y + '" r="3" class="ic-dot"/>';
      else h += '<path d="' + st.d + '" class="ic"/>';
    });
    return h + "</svg>";
  }

  root.MusicWrite = { attach: attach, ORDER: ORDER, NAMES: NAMES, CLEFS: CLEFS, SEQS: SEQS, TYPES: TYPES,
                      buildSeq: buildSeq, icon: icon, judge: judge, samplePath: samplePath };
})(window);
