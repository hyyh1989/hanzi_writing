/* ──────────────────────────────────────────────────────────────
   英文单词拼写页 —— 听 → 描红整个词 → 默写（盖住再写）

   独立模块（和 game.js、cat.js 同一个模式），不碰主脚本的内部变量：
       var ctl = Spell.attach(host, api);  ...  ctl.destroy();

   一个单词 = 一排四线格，一个字母一个格子。每个格子是一个写字引擎实例，
   判定、写错示范全部复用字母那一套（latin.js 的笔画数据 + latin-play.js 的示范），
   所以她的写法（单层 a、b 先竖……）和写字母页完全一致。
   默写时写错字母 = 这一笔和该写的字母对不上 → 判错；同一笔错 3 次才示范这一笔，
   不直接告诉她答案。

   格子宽度按每个字母的实际宽窄算（i、l 窄，m、w 宽），看起来像一个词，不是一排方块。
   引擎的画布是正方形的，所以每个格子里的正方形画布往左右伸出去、和邻居叠在一起，
   只有正在写的那个格子接收触摸（其他的 pointer-events:none）。

   api：
     word, pos("第 1/3 个")           当前词
     html(word) / colors(word)        上色（en-words.js）
     speak(word)                      英式发音念这个词
     beep(type), cat(host)            提示音、小猫
     leniency()                       放宽模式乘数（设置里的「宽松」）
     marked() / toggleMark()          「＋多练」
     onDone({word, misses, hints})    默写写完（主脚本记星星、打卡、要多练）
     next: {label, go} | null         「下一个」按钮
   ────────────────────────────────────────────────────────────── */
(function (root) {
  "use strict";
  var NS = "http://www.w3.org/2000/svg";
  var INK_W = 64;               /* 她的笔迹宽度 = 字母笔画的轮廓宽度（1024 坐标） */
  var MARGIN = 70;              /* 字母左右各留多少（1024 坐标），决定字母间距 */

  /* Monster Phonics 颜色 → 描红底色。描红用浅一点的同色，空心字母（不发音）用灰 */
  var TRACE = { red: "rgba(255,59,48,.30)", green: "rgba(34,197,94,.32)", yellow: "rgba(255,200,0,.45)",
                pink: "rgba(255,92,200,.32)", blue: "rgba(30,167,255,.32)", brown: "rgba(184,112,63,.32)",
                gold: "rgba(255,149,0,.36)", silent: "rgba(160,170,178,.25)" };

  function css(n, f) {
    var v = getComputedStyle(document.body).getPropertyValue(n).trim();
    return v || f;
  }
  function h(tag, cls, html) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html != null) e.innerHTML = html;
    return e;
  }
  /* 字母在 1024 方框里横向占哪一段：用中线（medians）算，再两边留 MARGIN */
  function extent(ch) {
    var g = root.LATIN[ch], x0 = 1e9, x1 = -1e9;
    g.m.forEach(function (st) { st.forEach(function (p) { if (p[0] < x0) x0 = p[0]; if (p[0] > x1) x1 = p[0]; }); });
    x0 -= MARGIN; x1 += MARGIN;
    var w = x1 - x0;
    if (w < 300) { var c = (x0 + x1) / 2; x0 = c - 150; x1 = c + 150; w = 300; }   /* i、l 别太挤 */
    return { x0: x0, w: w };
  }
  function inkMarkup(strokes, color) {
    return strokes.map(function (st) {
      if (st.length > 1) return '<polyline points="' + st.map(function (q) { return q.x.toFixed(0) + "," + q.y.toFixed(0); }).join(" ") +
        '" fill="none" stroke="' + color + '" stroke-width="' + INK_W + '" stroke-linecap="round" stroke-linejoin="round"/>';
      if (st.length === 1) return '<circle cx="' + st[0].x.toFixed(0) + '" cy="' + st[0].y.toFixed(0) + '" r="' + INK_W / 2 + '" fill="' + color + '"/>';
      return "";
    }).join("");
  }

  function attach(host, api) {
    var word = api.word, letters = word.split(""), colors = api.colors(word);
    var cells = [], phase = "look", cur = -1, misses = 0, hints = 0, pet = null, dead = false, timers = [];
    var S = 0;

    host.innerHTML = "";
    var head = h("div", "sp-head");
    var wordEl = h("div", "sp-word", api.html(word));
    var say = h("button", "iconbtn", "🔊"); say.setAttribute("aria-label", "再念一遍");
    var mark = h("button", "markbtn");
    var sub = h("div", "sp-sub", api.pos || "");
    var petbox = h("div", "sp-pet");
    head.appendChild(wordEl); head.appendChild(say); head.appendChild(mark);
    host.appendChild(head); host.appendChild(sub);
    var bar = h("div", "hintbar sp-hint");
    var stage = h("div", "sp-stage");
    var row = h("div", "sp-row");
    stage.appendChild(row); stage.appendChild(petbox);
    var result = h("div", "sp-result");
    var controls = h("div", "controls");
    host.appendChild(bar); host.appendChild(stage); host.appendChild(result); host.appendChild(controls);

    say.onclick = function () { api.speak(word); };
    function markUI() {
      var on = api.marked();
      mark.className = "markbtn" + (on ? " on" : "");
      mark.textContent = on ? "✓ 要多练" : "＋多练";
    }
    mark.onclick = function () { api.toggleMark(); markUI(); };
    markUI();
    if (api.cat) pet = api.cat(petbox);

    function later(fn, ms) { var t = setTimeout(function () { if (!dead) fn(); }, ms); timers.push(t); }
    function btn(label, cls, fn) { var b = h("button", "btn " + (cls || ""), label); b.onclick = fn; return b; }
    function setControls() {
      controls.innerHTML = "";
      [].slice.call(arguments).forEach(function (b) { if (b) controls.appendChild(b); });
    }

    /* ── 搭格子 ── */
    function build() {
      row.innerHTML = "";
      cells.forEach(function (c) { if (c.w) try { c.w.cancelQuiz(); } catch (e) {} });
      cells = [];
      var ext = letters.map(function (ch) { return root.LATIN[ch] ? extent(ch) : { x0: 0, w: 260 }; });
      var ratio = ext.reduce(function (a, e) { return a + e.w / 1024; }, 0);
      var avail = Math.max(260, stage.clientWidth - 8);
      S = Math.round(Math.max(56, Math.min(250, avail / ratio, (root.innerHeight - 330) * 0.9)));
      row.style.height = S + "px";
      /* 四线格：整排一条，和字母格同一套比例（顶线 118 / 中线 378 / 基线 670 / 底线 929） */
      row.insertAdjacentHTML("beforeend",
        '<svg class="sp-lines" viewBox="0 0 100 1024" preserveAspectRatio="none" aria-hidden="true"><g class="flg">' +
        '<line class="fl" x1="0" y1="118" x2="100" y2="118" vector-effect="non-scaling-stroke"/>' +
        '<line class="fm" x1="0" y1="378" x2="100" y2="378" vector-effect="non-scaling-stroke"/>' +
        '<line class="fb" x1="0" y1="670" x2="100" y2="670" vector-effect="non-scaling-stroke"/>' +
        '<line class="fl" x1="0" y1="929" x2="100" y2="929" vector-effect="non-scaling-stroke"/></g></svg>');
      letters.forEach(function (ch, i) {
        var e = ext[i], cw = Math.round(e.w / 1024 * S);
        var cell = h("div", "sp-cell"); cell.style.width = cw + "px"; cell.style.height = S + "px";
        var c = { ch: ch, el: cell, ink: [], w: null };
        if (!root.LATIN[ch]) {                 /* 撇号：直接印出来，不用写 */
          cell.innerHTML = '<span class="sp-apos" style="font-size:' + Math.round(S * .5) + 'px">' + ch + "</span>";
          row.appendChild(cell); cells.push(c); return;
        }
        var sq = h("div", "sp-sq");
        sq.style.width = sq.style.height = S + "px";
        sq.style.left = (-Math.round(e.x0 / 1024 * S)) + "px";
        var wd = h("div", "sp-w");
        sq.appendChild(wd);
        sq.insertAdjacentHTML("beforeend",
          '<svg class="sp-ink" viewBox="0 0 1024 1024" aria-hidden="true"></svg>' +
          '<svg class="sp-lp" viewBox="0 0 1024 1024" aria-hidden="true"></svg>');
        cell.appendChild(sq); row.appendChild(cell);
        c.sq = sq; c.inkEl = sq.querySelector(".sp-ink"); c.lp = sq.querySelector(".sp-lp");
        c.w = root.HanziWriter.create(wd, ch, {
          width: S, height: S, padding: 0,
          strokeColor: "rgba(0,0,0,0)",          /* 写的过程只留她的笔迹，不换成标准字形 */
          outlineColor: TRACE[colors[i]] || css("--trace", "#EBD2CE"),
          drawingColor: css("--ink", "#1B2530"),
          drawingWidth: Math.max(4, Math.round(S / 15)),
          showCharacter: false, showOutline: phase === "trace" || phase === "look",
          charDataLoader: function (x, done) { var g = root.LATIN[x]; done(g ? { strokes: g.s, medians: g.m } : null); }
        });
        cells.push(c);
      });
    }
    function paintInk(c, color) { if (c.inkEl) c.inkEl.innerHTML = inkMarkup(c.ink, color || css("--ink", "#1B2530")); }
    function setActive(i) {
      cells.forEach(function (c, k) { c.el.classList.toggle("now", k === i); });
    }

    /* 写第 i 个字母；撇号直接跳过 */
    function quizCell(i, from) {
      while (i < cells.length && !cells[i].w) i++;
      if (i >= cells.length) return wordDone();
      cur = i; setActive(i);
      var c = cells[i], trace = phase === "trace";
      c.w.quiz({
        quizStartStrokeNum: from || 0,
        showOutline: trace,
        leniency: api.leniency() * (trace ? 1.25 : 1) * (root.LATIN[c.ch].k || 1),
        showHintAfterMisses: false,           /* 示范用 latin-play.js（引擎的会冒出多余部分） */
        highlightOnComplete: false,
        onMistake: function (d) {
          api.beep("bad");
          if (!trace) misses++;
          if (d.mistakesOnStroke >= (trace ? 1 : 3) && root.LatinPlay) {
            if (!trace) hints++;
            root.LatinPlay.hint(c.lp, c.ch, d.strokeNum, { ink: css("--teal", "#12796F") });
          }
        },
        onCorrectStroke: function (d) {
          api.beep("tap");
          var pts = (d.drawnPath && d.drawnPath.points) || [];
          c.ink.push(pts.map(function (q) { return { x: q.x, y: 900 - q.y }; }));
          paintInk(c);
          controlsFor();
        },
        onComplete: function () {
          if (root.LatinPlay) root.LatinPlay.clear(c.lp);
          later(function () { quizCell(i + 1, 0); }, 180);
        }
      });
      controlsFor();
    }
    /* 这个字母重写（写歪了、她自己不满意） */
    function redoLetter() {
      var c = cells[cur]; if (!c || !c.w) return;
      c.w.cancelQuiz(); c.ink = []; paintInk(c);
      if (root.LatinPlay) root.LatinPlay.clear(c.lp);
      api.beep("tap"); quizCell(cur, 0);
    }
    function controlsFor() {
      if (phase === "trace" || phase === "write") {
        setControls(btn("这个字母重写", "quiet", redoLetter),
                    btn("从头再来", "ghost", function () { api.beep("tap"); start(phase); }));
      }
    }

    /* ── 三个阶段 ── */
    function look() {
      phase = "look"; wordEl.classList.remove("covered");
      result.innerHTML = "";
      build(); setActive(-1);
      bar.innerHTML = "听一听，看一看这个词";
      setControls(btn("开始描红 →", "", function () { api.beep("tap"); start("trace"); }));
      later(function () { api.speak(word); }, 250);
    }
    function start(p) {
      phase = p; misses = 0; hints = 0; result.innerHTML = "";
      build();
      if (p === "trace") {
        wordEl.classList.remove("covered");
        bar.innerHTML = "描红　顺着浅色的字母，<b>一个一个写</b>";
      } else {
        /* 默写：把词盖住（学校的 Look, Say, Cover, Write, Check） */
        wordEl.classList.add("covered");
        bar.innerHTML = "默写　词盖住了，<b>听一听，自己拼出来</b>";
        api.speak(word);
      }
      quizCell(0, 0);
    }
    function wordDone() {
      setActive(-1);
      if (phase === "trace") {
        bar.innerHTML = "描好了！下面自己写";
        setControls();
        later(function () { start("write"); }, 900);
        return;
      }
      phase = "done";
      wordEl.classList.remove("covered");
      /* 她写的一排保持原样；上面的彩色词揭开，对照着看 */
      var ok = hints === 0;
      bar.innerHTML = "";
      var pic = api.pic && api.pic(word);
      result.innerHTML = '<div class="sp-check">' +
        (pic ? '<span class="sp-pic" aria-hidden="true">' + pic + '</span>' : "") +
        '<span class="sp-check-w">' + api.html(word, 44) + '</span>' +
        '<span class="sp-check-t">' + (ok ? (misses ? "拼对了！" : "拼对了，一次都没错！") : "有几个字母看了提示，下次再试试") + '</span></div>';
      if (pet && pet.happy) pet.happy(1);      /* 写完就为她高兴一下，不看对错（和写字页同一条规矩） */
      api.speak(word);
      api.onDone({ word: word, misses: misses, hints: hints });
      markUI();                                /* 看了提示会自动进「要多练」，按钮跟着变 */
      setControls(btn("再写一遍", "quiet", function () { api.beep("tap"); start("write"); }),
                  api.next ? btn(api.next.label, "", api.next.go) : null);
    }

    function onResize() {
      if (phase !== "trace" && phase !== "write" && phase !== "look") return;
      /* 转屏：写到一半就从当前阶段重新开始（格子大小变了，引擎得重建） */
      clearTimeout(onResize.t);
      onResize.t = setTimeout(function () {
        if (dead) return;
        if (phase === "look") { build(); setActive(-1); } else start(phase);
      }, 250);
    }
    root.addEventListener("resize", onResize);

    look();

    return {
      destroy: function () {
        dead = true;
        timers.forEach(clearTimeout);
        root.removeEventListener("resize", onResize);
        cells.forEach(function (c) { if (c.w) try { c.w.cancelQuiz(); } catch (e) {} if (c.lp && root.LatinPlay) root.LatinPlay.clear(c.lp); });
        if (pet && pet.destroy) pet.destroy();
        host.innerHTML = "";
      }
    };
  }

  root.Spell = { attach: attach };
})(window);
