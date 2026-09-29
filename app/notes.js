/* ──────────────────────────────────────────────────────────────
   认音符 —— 五线谱上出一个音，她在钢琴键上点对应的琴键
   独立模块（和 game.js、spell.js 同一个模式）：NoteRead.attach(host, api)

   和家长定过的（MUSIC.md，2026-09-29）：
     · 全部英文提示（钢琴老师用英文上乐理课）："Yes! That's E."
     · 范围：高音谱号 Middle C → Treble C，低音谱号 Bass C → Middle C
     · 用钢琴键答，键上标字母（家长可以关掉字母）
     · 每道题都画出谱号：同一个位置在两个谱号里是不同的音。
       高音谱号的 Middle C 在下加一线，低音谱号的在上加一线 —— 点的是【同一个琴键】，
       所以键盘是连着的一整段（Bass C 到 Treble C），Middle C 在正中间，两种谱号共用
     · 高音谱号学了一阵了，低音谱号刚开始 → 低音谱号的题少出，比例家长可调（api.bassShare）

   一轮 10 个音。答错不前进（和小游戏一样）；同一题错 3 次就亮出正确的琴键，免得卡住。
   不计时、不打分：这是练习，不是游戏。做完小猫开心一次（绑「做完了」，不绑「全对」）。
   符头用全音符（空心、没有符干），读音符时不牵扯符干朝向。
   ────────────────────────────────────────────────────────────── */
(function (root) {
  "use strict";

  var PER_ROUND = 10, WRONG_LOCK = 600, RIGHT_HOLD = 1300, SHOW_AFTER = 3;

  /* 白键：Bass C（C3）到 Treble C（C5），MIDI 编号 */
  var WHITE = [48, 50, 52, 53, 55, 57, 59, 60, 62, 64, 65, 67, 69, 71, 72];
  var LETTER = { 0: "C", 2: "D", 4: "E", 5: "F", 7: "G", 9: "A", 11: "B" };
  function letter(m) { return LETTER[m % 12]; }
  function noteName(m) {
    if (m === 60) return "Middle C";
    if (m === 72) return "Treble C";
    if (m === 48) return "Bass C";
    return letter(m);
  }
  /* 每个谱号能出的音，以及它在谱上的位置（step：最下面一线 = 0，往上每一线/间 +1） */
  var CLEFS = {
    treble: { notes: [60, 62, 64, 65, 67, 69, 71, 72], bottom: 64 },   /* 最下一线是 E4 */
    bass:   { notes: [48, 50, 52, 53, 55, 57, 59, 60], bottom: 43 }    /* 最下一线是 G2 */
  };
  /* G2 不在键盘范围里，单独算：白键序列往下延两个 */
  var WHITE_EXT = [43, 45, 47].concat(WHITE);
  function step(m, clef) { return WHITE_EXT.indexOf(m) - WHITE_EXT.indexOf(CLEFS[clef].bottom); }

  /* ── 谱面（SVG，viewBox 300×140）：五条线 y = 50 60 70 80 90，一个间 = 10 ── */
  /* 谱号用印刷体（课本上的样子），轮廓取自 Bravura 字体（Steinberg，SIL OFL 1.1，licenses/Bravura.OFL.txt）：
     gClef U+E050、fClef U+E062。字体坐标 1000/em、一个间 = 250，原点在 G 线 / F 线上；
     这里一个间 = 10，所以缩放 0.04 并上下翻转。低音谱号的两个点已经含在字形里。
     2026-09-29 家长拿课本对过：之前手画的等粗线条和课本不像，看谱就用印刷体。
     （【写】谱号的练习另算，按她的手写笔顺，见 MUSIC.md） */
  var G_CLEF = "M376 415C374 427 376 428 382 434C398 449 419 470 438 491C522 583 572 702 572 815C572 902 548 988 507 1048C492 1070 466 1098 455 1098C441 1098 410 1072 390 1050C316 968 292 843 292 739C292 681 299 616 306 575C308 563 309 561 297 551C233 498 164 437 112 373C43 287 0 194 0 87C0 -87 119 -252 364 -252C387 -252 413 -250 433 -246C444 -244 446 -243 448 -255C460 -322 475 -409 475 -456C475 -604 375 -622 316 -622C262 -622 236 -606 236 -593C236 -586 245 -583 268 -576C299 -567 335 -540 335 -482C335 -427 300 -380 239 -380C172 -380 132 -433 132 -495C132 -560 171 -658 322 -658C389 -658 519 -628 519 -458C519 -401 501 -306 490 -244C488 -232 489 -233 503 -227C604 -187 671 -102 671 11C671 139 577 252 430 252C404 252 404 252 401 270ZM470 943C503 943 530 916 530 861C530 792 497 728 419 650C403 634 379 611 356 591C349 585 345 586 343 599C339 625 337 659 337 691C337 847 409 943 470 943ZM361 262C364 243 364 244 346 238C258 208 201 129 201 44C201 -46 248 -110 316 -133C324 -136 336 -139 343 -139C351 -139 355 -134 355 -128C355 -121 347 -118 340 -115C298 -97 268 -54 268 -8C268 49 307 92 368 109C384 113 386 112 388 101L438 -197C440 -208 439 -208 424 -211C408 -214 388 -216 368 -216C193 -216 80 -119 80 20C80 79 90 158 173 252C233 319 279 356 326 394C336 402 338 401 340 390ZM430 103C428 115 429 118 441 117C522 110 589 42 589 -46C589 -109 551 -160 495 -188C483 -194 481 -194 479 -182Z";
  var F_CLEF = "M252 262C78 262 0 135 0 39C0 -41 42 -110 123 -110C186 -110 229 -66 229 -4C229 60 182 100 133 100C106 100 96 93 83 93C70 93 67 101 67 111C67 151 127 224 229 224C335 224 381 120 381 -37C381 -140 359 -260 297 -356C237 -449 134 -534 10 -605C1 -610 -5 -615 -5 -623C-5 -629 -1 -635 8 -635C13 -635 19 -633 25 -630C158 -565 286 -489 392 -375C479 -281 531 -159 531 -28C531 146 425 262 252 262ZM629 180C598 180 574 156 574 125C574 94 598 70 629 70C660 70 684 94 684 125C684 156 660 180 629 180ZM630 -71C599 -71 576 -94 576 -125C576 -156 599 -179 630 -179C661 -179 684 -156 684 -125C684 -94 661 -71 630 -71Z";
  function score(clef, m, state) {
    var h = '<svg class="nr-staff" viewBox="0 0 300 140" role="img" aria-label="' + clef + ' clef note">';
    [50, 60, 70, 80, 90].forEach(function (y) { h += '<line class="nr-l" x1="10" y1="' + y + '" x2="290" y2="' + y + '"/>'; });
    /* 高音谱号卷在第二线（G 线，y=80），低音谱号从第四线（F 线，y=60）起 */
    if (clef === "treble") h += '<path class="nr-clef" transform="translate(18 80) scale(.04 -.04)" d="' + G_CLEF + '"/>';
    else h += '<path class="nr-clef" transform="translate(18 60) scale(.04 -.04)" d="' + F_CLEF + '"/>';
    if (m != null) {
      var s = step(m, clef), y = 90 - s * 5, x = 180;
      /* 加线：五线谱外面的音，从谱到符头之间每条线都要画 */
      for (var k = -2; k >= s; k -= 2) h += '<line class="nr-l nr-ledger" x1="' + (x - 13) + '" y1="' + (90 - k * 5) + '" x2="' + (x + 13) + '" y2="' + (90 - k * 5) + '"/>';
      for (var k2 = 10; k2 <= s; k2 += 2) h += '<line class="nr-l nr-ledger" x1="' + (x - 13) + '" y1="' + (90 - k2 * 5) + '" x2="' + (x + 13) + '" y2="' + (90 - k2 * 5) + '"/>';
      h += '<ellipse class="nr-head' + (state ? " " + state : "") + '" cx="' + x + '" cy="' + y + '" rx="7.2" ry="5" transform="rotate(-20 ' + x + " " + y + ')"/>';
    }
    return h + "</svg>";
  }

  /* ── 声音：简单的「琴」音（几个泛音 + 衰减），不用音频文件 ── */
  var ac = null;
  function tone(m) {
    try {
      ac = ac || new (root.AudioContext || root.webkitAudioContext)();
      if (ac.state === "suspended") ac.resume();
      var f = 440 * Math.pow(2, (m - 69) / 12), t = ac.currentTime;
      var out = ac.createGain(); out.gain.value = 0.22; out.connect(ac.destination);
      [[1, 1], [2, 0.35], [3, 0.12], [4, 0.06]].forEach(function (p) {
        var o = ac.createOscillator(), g = ac.createGain();
        o.type = "sine"; o.frequency.value = f * p[0];
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(p[1], t + 0.012);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 1.4 / p[0] + 0.3);
        o.connect(g); g.connect(out); o.start(t); o.stop(t + 1.8);
      });
    } catch (e) {}
  }

  function shuffle(a) {
    for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; }
    return a;
  }
  /* 出一轮：低音谱号出 round(10 × 比例) 道；答错过的音权重高一点；同一个音不连着出 */
  function makeRound(share, stats) {
    var nb = Math.max(0, Math.min(PER_ROUND, Math.round(PER_ROUND * share))), out = [];
    function pick(clef) {
      var ns = CLEFS[clef].notes, w = ns.map(function (m) {
        var s = stats && stats[clef + m]; return 1 + (s && s.n ? (s.n - s.ok) / s.n * 2 : 0.5);
      });
      var tot = w.reduce(function (a, b) { return a + b; }, 0), r = Math.random() * tot;
      for (var i = 0; i < ns.length; i++) { r -= w[i]; if (r <= 0) return ns[i]; }
      return ns[ns.length - 1];
    }
    var clefs = shuffle(Array.apply(null, Array(PER_ROUND)).map(function (_, i) { return i < nb ? "bass" : "treble"; }));
    clefs.forEach(function (c) {
      var m, tries = 0;
      do { m = pick(c); tries++; } while (out.length && out[out.length - 1].m === m && out[out.length - 1].clef === c && tries < 8);
      out.push({ clef: c, m: m });
    });
    return out;
  }

  /* api：letters() 键上标不标字母 · bassShare() 低音谱号比例 · stats()/saveStat(key,ok)
          speak(txt) 英式发音 · beep(kind) · cat(host) · onDone() · next: {label,go} */
  function attach(host, api) {
    var items = makeRound(api.bassShare(), api.stats()), idx = 0, wrongN = 0, locked = false, pet = null, timers = [];
    var dead = false;
    function later(fn, ms) { timers.push(setTimeout(function () { if (!dead) fn(); }, ms)); }

    host.innerHTML =
      '<div class="nr">' +
        '<div class="mg-dots nr-dots"></div>' +
        '<p class="nr-q">Which note is this?</p>' +
        '<div class="nr-score"></div>' +
        '<p class="nr-say" aria-live="polite"></p>' +
        '<div class="nr-kb-wrap"><div class="nr-kb-view"><div class="nr-kb"></div></div></div>' +
        '<div class="nr-pet"></div>' +
      "</div>";
    var elDots = host.querySelector(".nr-dots"), elScore = host.querySelector(".nr-score"),
        elSay = host.querySelector(".nr-say"), elKb = host.querySelector(".nr-kb");

    /* 键盘：15 个白键 + 黑键（黑键只是样子，不用点）。不是这个谱号范围的键变淡、点不了 */
    function drawKeys() {
      var h = "", showL = api.letters();
      WHITE.forEach(function (m) {
        h += '<button class="nr-w' + (m === 60 ? " mid" : "") + '" data-m="' + m + '" aria-label="' + noteName(m) + '">' +
             (showL ? "<span>" + letter(m) + "</span>" : "") + (m === 60 ? '<em>Middle C</em>' : "") + "</button>";
      });
      /* 黑键：C# D# F# G# A#，按白键位置算 */
      WHITE.forEach(function (m, i) {
        if (i < WHITE.length - 1 && [0, 2, 5, 7, 9].indexOf(m % 12) >= 0)
          h += '<i class="nr-b" style="left:calc(' + ((i + 1) / WHITE.length * 100) + '% - 2%)"></i>';
      });
      elKb.innerHTML = h;
    }
    /* 键盘只露出 11 个键：这个谱号的 8 个 + 靠 Middle C 那边的 3 个（灰的）。
       整条 15 键的键盘左右滑到位，而不是换一副键盘 —— 让她看出是同一架琴，Middle C 一直在那儿。
       露得少，每个键就宽（2026-09-29 家长：iPad 上琴键有点窄） */
    function setRange(clef) {
      var ok = CLEFS[clef].notes, start = clef === "treble" ? 4 : 0;
      elKb.style.transform = "translateX(" + (-start / WHITE.length * 100) + "%)";
      [].forEach.call(elKb.querySelectorAll(".nr-w"), function (b) {
        var on = ok.indexOf(+b.dataset.m) >= 0;
        b.disabled = !on; b.classList.remove("good", "bad", "show");
      });
    }
    function render() {
      var it = items[idx], d = "";
      for (var i = 0; i < items.length; i++) d += '<i class="' + (i < idx ? "on" : "") + '"></i>';
      elDots.innerHTML = d;
      elScore.innerHTML = score(it.clef, it.m);
      elSay.textContent = "";
      setRange(it.clef);
      wrongN = 0; locked = false;
    }

    elKb.addEventListener("click", function (e) {
      var b = e.target.closest(".nr-w");
      if (!b || b.disabled || locked) return;
      var it = items[idx], m = +b.dataset.m;
      tone(m);
      if (m !== it.m) {
        locked = true; wrongN++;
        b.classList.add("bad"); api.beep("bad");
        api.saveStat(it.clef + it.m, false);
        later(function () {
          b.classList.remove("bad"); locked = false;
          if (wrongN >= SHOW_AFTER) {           /* 卡住了：亮出正确的键，她点了照样往下走 */
            var r = elKb.querySelector('.nr-w[data-m="' + it.m + '"]'); if (r) r.classList.add("show");
          }
        }, WRONG_LOCK);
        return;
      }
      locked = true;
      b.classList.add("good");
      if (wrongN < SHOW_AFTER) api.saveStat(it.clef + it.m, true);
      elScore.innerHTML = score(it.clef, it.m, "good");
      var name = noteName(m);
      elSay.textContent = "Yes! That's " + name + ".";
      later(function () { api.speak("Yes! That's " + name + "."); }, 350);
      later(function () {
        idx++;
        if (idx >= items.length) finish(); else render();
      }, RIGHT_HOLD + 400);
    });

    function finish() {
      host.innerHTML = '<div class="mg-done nr-done"><div class="mg-done-h">All done!</div>' +
        '<p class="nr-done-t">' + PER_ROUND + ' notes</p><div class="mg-pet nr-pet"></div><div class="controls nr-ctl"></div></div>';
      if (api.cat) { pet = api.cat(host.querySelector(".nr-pet")); if (pet && pet.cheer) pet.cheer(); }
      api.beep("good"); api.speak("All done! Well done.");
      api.onDone();
      var c = host.querySelector(".nr-ctl");
      var again = document.createElement("button"); again.className = "btn quiet"; again.textContent = "Play again";
      again.onclick = function () { api.again(); };
      c.appendChild(again);
      if (api.next) { var nb = document.createElement("button"); nb.className = "btn"; nb.textContent = api.next.label; nb.onclick = api.next.go; c.appendChild(nb); }
    }

    drawKeys(); render();
    return { destroy: function () { dead = true; timers.forEach(clearTimeout); if (pet && pet.destroy) pet.destroy(); host.innerHTML = ""; } };
  }

  /* 印刷体谱号，给别的格子用（写音符的格子左边当背景）。space = 那个格子一个间多高，gy/fy = G 线、F 线的 y */
  function clefPath(clef, space, gy, fy, x) {
    var k = space / 250;
    return clef === "treble"
      ? '<path transform="translate(' + x + " " + gy + ") scale(" + k + " " + (-k) + ')" d="' + G_CLEF + '"/>'
      : '<path transform="translate(' + x + " " + fy + ") scale(" + k + " " + (-k) + ')" d="' + F_CLEF + '"/>';
  }
  root.NoteRead = { attach: attach, clefPath: clefPath, score: score, noteName: noteName, CLEFS: CLEFS, step: step, makeRound: makeRound, PER_ROUND: PER_ROUND };
})(window);
