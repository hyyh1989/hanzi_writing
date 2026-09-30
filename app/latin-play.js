/* ──────────────────────────────────────────────────────────────
   字母 / 数字的笔顺播放 —— 不用写字引擎自带的动画

   为什么：引擎画一笔 = 沿中线画一条 200 宽（1024 坐标）的粗线，再用这一笔的轮廓裁出来。
   汉字的一笔只是一条带子，没问题；但她的 b / q / a / d / g 是【一笔】里圆和竖贴在一起，
   写竖的时候粗线已经扫到旁边的圆，圆贴着竖的那一截提前冒出来，看起来笔顺就错了
   （2026-09-27 用户在 iPad 上发现）。宽度是引擎写死的；也不能拆成两笔——她是一笔连写，
   拆了判定就对不上。

   所以播放和提示改用这里：沿原始中心线画一条和笔画一样宽的线，笔走到哪就只画到哪。
   引擎只剩判定、描红底字、写对后整笔淡入（那是一次性显示，不会冒出多余的部分）。

   用法：在写字格上面叠一个 <svg viewBox="0 0 1024 1024">（pointer-events:none），
       LatinPlay.play(svg, "b", {ink:"#232A36"}).then(...)   // 整个字按笔顺画一遍
       LatinPlay.hint(svg, "b", 0, {ink:"#1E9A62"})           // 只示范第 1 笔，然后淡出
       LatinPlay.clear(svg)
   数据来自 window.LATIN[字].c（build/make_latin.py 输出的中心线，100×130 坐标）。
   ────────────────────────────────────────────────────────────── */
(function (root) {
  "use strict";
  var NS = "http://www.w3.org/2000/svg";
  var S = 1024 / 130, OX = (1024 - 100 * S) / 2;   /* 和 make_latin.py 的换算一致 */
  var W = 64 / S;                                  /* 笔宽 = 轮廓宽度，换成 100×130 单位 */
  var DOT_R = 64 * 0.62 / S;
  var GO = "#1E9A62";                              /* 起笔绿点 */
  var REDUCE = root.matchMedia && root.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function el(name, attrs) {
    var e = document.createElementNS(NS, name);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    return e;
  }
  function startOf(d) {
    var m = /^M\s*(-?[\d.]+)[\s,]+(-?[\d.]+)/.exec(d);
    return m ? [+m[1], +m[2]] : null;
  }
  function clear(svg) {
    (svg.__anims || []).forEach(function (a) { try { a.cancel(); } catch (e) {} });
    svg.__anims = [];
    svg.__token = (svg.__token || 0) + 1;
    while (svg.firstChild) svg.removeChild(svg.firstChild);
  }
  function layer(svg) {
    var g = el("g", { transform: "translate(" + OX + " 0) scale(" + S + ")" });
    svg.appendChild(g);
    return g;
  }
  function anim(svg, node, frames, opt) {
    var a = node.animate(frames, opt);
    svg.__anims.push(a);
    return a;
  }

  /* 画一笔：先亮起笔点，再沿中心线画出来。返回这一笔占用的时长（毫秒） */
  function drawStroke(svg, g, d, t0, ink, opts) {
    if (d.indexOf("dot:") === 0) {
      var p = d.slice(4).split(",");
      var dot = el("circle", { cx: p[0], cy: p[1], r: DOT_R, fill: ink, opacity: REDUCE ? 1 : 0 });
      g.appendChild(dot);
      if (!REDUCE) anim(svg, dot, [{ opacity: 0 }, { opacity: 1 }], { duration: 220, delay: t0, fill: "forwards" });
      return 320;
    }
    var path = el("path", {
      d: d, fill: "none", stroke: ink, "stroke-width": W,
      "stroke-linecap": "round", "stroke-linejoin": "round"
    });
    g.appendChild(path);
    var len = path.getTotalLength();
    var dur = Math.max(380, Math.min(2800, len * (opts.msPerUnit || 13)));
    path.setAttribute("stroke-dasharray", len + " " + len);
    path.setAttribute("stroke-dashoffset", REDUCE ? 0 : len);
    var s = startOf(d);
    if (s && !REDUCE) {
      var mk = el("circle", { cx: s[0], cy: s[1], r: W * 0.62, fill: GO, opacity: 0 });
      g.appendChild(mk);
      anim(svg, mk, [{ opacity: 0 }, { opacity: 1, offset: 0.25 }, { opacity: 1, offset: 0.8 }, { opacity: 0 }],
           { duration: dur + 260, delay: t0, fill: "forwards" });
    }
    if (!REDUCE) {
      anim(svg, path, [{ strokeDashoffset: len }, { strokeDashoffset: 0 }],
           { duration: dur, delay: t0 + 180, easing: "ease-in-out", fill: "forwards" });
    }
    return dur + 180;
  }

  function play(svg, ch, opts) {
    opts = opts || {};
    clear(svg);
    var data = root.LATIN && root.LATIN[ch];
    if (!data || !data.c) return Promise.resolve(false);
    var token = svg.__token, g = layer(svg), ink = opts.ink || "#232A36", t = 0, gap = opts.gap || 320;
    data.c.forEach(function (d) { t += drawStroke(svg, g, d, t, ink, opts) + gap; });
    return new Promise(function (res) {
      setTimeout(function () { res(svg.__token === token); }, REDUCE ? 0 : t);
    });
  }

  /* 只示范第 i 笔（写错几次后的提示），示范完淡出 */
  function hint(svg, ch, i, opts) {
    opts = opts || {};
    clear(svg);
    var data = root.LATIN && root.LATIN[ch];
    if (!data || !data.c || !data.c[i]) return Promise.resolve(false);
    var token = svg.__token, g = layer(svg);
    var dur = drawStroke(svg, g, data.c[i], 0, opts.ink || GO, opts);
    if (!REDUCE) anim(svg, g, [{ opacity: 1 }, { opacity: 0 }], { duration: 400, delay: dur + 500, fill: "forwards" });
    return new Promise(function (res) {
      setTimeout(function () { if (svg.__token === token) clear(svg); res(svg.__token === token + 1); }, REDUCE ? 600 : dur + 950);
    });
  }

  /* ── i、j 的点：替写字引擎判 ──
     引擎把「只有一个点」的笔画直接丢掉（hanzi-writer endUserStroke：points.length === 1 就 return），
     而孩子点一下笔多半就只有一个点 → 怎么点都没反应；手指稍微动一点，引擎又会把这一小笔放大了比形状，
     和「从上往下一小竖」的中线比，也经常不过（2026-09-30 用户：i 的点怎么写都判不过）。
     所以轮到点的这一笔时，我们先截下她的输入：
       · 很短（点一下或一小笔）、落在点附近 → 替她沿中线「写」一遍交给引擎，引擎判对
       · 否则 → 把她的原笔迹原样交给引擎，照常判（写错照样算错）
     用法：LatinPlay.dotAssist(外层元素, function(){ return {ch, stroke, svg} 或 null })，
     返回 {lastTap()}：她实际点的位置（引擎坐标），onCorrectStroke 里画墨迹用 */
  function isDot(ch, i) {
    var g = root.LATIN && root.LATIN[ch], m = g && g.m && g.m[i];
    return !!(m && m.length === 2 && Math.hypot(m[1][0] - m[0][0], m[1][1] - m[0][1]) < 80);
  }
  function dotAssist(el, getState) {
    var cur = null, pts = [], replaying = false, lastTouch = 0, last = null;
    function st() { var s = getState(); return s && s.svg && isDot(s.ch, s.stroke) ? s : null; }
    function pt(e) { var t = e.touches && e.touches[0] || e.changedTouches && e.changedTouches[0] || e; return { x: t.clientX, y: t.clientY }; }
    function send(svg, list) {           /* 按引擎认的事件（mousedown 在 svg 上、mouseup 在 document 上）重放一笔 */
      replaying = true;
      try {
        var o = function (p) { return { clientX: p.x, clientY: p.y, bubbles: true, cancelable: true, view: root }; };
        svg.dispatchEvent(new MouseEvent("mousedown", o(list[0])));
        for (var i = 1; i < list.length; i++) svg.dispatchEvent(new MouseEvent("mousemove", o(list[i])));
        document.dispatchEvent(new MouseEvent("mouseup", o(list[list.length - 1])));
      } finally { replaying = false; }
    }
    function down(e) {
      if (replaying) return;
      if (e.type === "mousedown" && Date.now() - lastTouch < 800) { e.stopPropagation(); e.preventDefault(); return; }  /* 触摸之后浏览器补发的鼠标事件 */
      var s = st(); if (!s) return;
      if (e.type === "touchstart") lastTouch = Date.now();
      e.stopPropagation(); if (e.cancelable) e.preventDefault();
      cur = s; pts = [pt(e)];
    }
    function move(e) {
      if (replaying || !cur) return;
      e.stopPropagation(); if (e.cancelable) e.preventDefault();
      pts.push(pt(e));
    }
    function up(e) {
      if (replaying || !cur) return;
      e.stopPropagation(); if (e.cancelable) e.preventDefault();
      if (e.type === "touchend") lastTouch = Date.now();
      var s = cur; cur = null;
      var r = s.svg.getBoundingClientRect(), S = r.width, m = root.LATIN[s.ch].m[s.stroke];
      var toPx = function (q) { return { x: r.left + q[0] / 1024 * S, y: r.top + (900 - q[1]) / 1024 * S }; };
      var c = { x: 0, y: 0 }; pts.forEach(function (p) { c.x += p.x; c.y += p.y; }); c.x /= pts.length; c.y /= pts.length;
      var L = 0; for (var i = 1; i < pts.length; i++) L += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
      var mid = toPx([(m[0][0] + m[1][0]) / 2, (m[0][1] + m[1][1]) / 2]);
      var tol = (s.leniency || 1) * 0.12 * S;
      if (L < 0.16 * S && Math.hypot(c.x - mid.x, c.y - mid.y) < tol) {
        last = { x: (c.x - r.left) / S * 1024, y: 900 - (c.y - r.top) / S * 1024 };
        var a = toPx(m[0]), b = toPx(m[1]), line = [];
        for (var k = 0; k <= 6; k++) line.push({ x: a.x + (b.x - a.x) * k / 6, y: a.y + (b.y - a.y) * k / 6 });
        send(s.svg, line);
      } else if (pts.length > 1) send(s.svg, pts);
    }
    ["touchstart", "mousedown"].forEach(function (t) { el.addEventListener(t, down, { capture: true, passive: false }); });
    ["touchmove", "mousemove"].forEach(function (t) { el.addEventListener(t, move, { capture: true, passive: false }); });
    ["touchend", "touchcancel", "mouseup"].forEach(function (t) { root.addEventListener(t, up, { capture: true, passive: false }); });
    return {
      lastTap: function () { return last; },
      destroy: function () {
        ["touchstart", "mousedown"].forEach(function (t) { el.removeEventListener(t, down, true); });
        ["touchmove", "mousemove"].forEach(function (t) { el.removeEventListener(t, move, true); });
        ["touchend", "touchcancel", "mouseup"].forEach(function (t) { root.removeEventListener(t, up, true); });
      }
    };
  }

  root.LatinPlay = { play: play, hint: hint, clear: clear, isDot: isDot, dotAssist: dotAssist };
})(window);
