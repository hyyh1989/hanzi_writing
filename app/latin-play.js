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

  root.LatinPlay = { play: play, hint: hint, clear: clear };
})(window);
