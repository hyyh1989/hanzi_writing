/* ──────────────────────────────────────────────────────────────
   音符拼单词小游戏 —— 五线谱上一串音符，在琴键上按顺序点出来，拼成一个英文词
   独立模块：NoteGame.attach(host, api)。放在首页小游戏区（不属于任何科目，也不当任务）。

   来历：她的练习册里就有这种题（音符下面写字母，拼出一个词）；2026-09-27 定的做法是
   A–G 画成音符，其他字母直接印出来（made = m + A D E），这样她词表里的词也能玩。

   规矩照搬认字游戏 / 听音选词（CLAUDE.md），别自作主张改：
     · 一局 6 个词，成绩是【用了多久】；点错不前进（琴键闪红、冻结 0.6 秒）；一天 3 局；
       小猫绑「做完了」
     · 图只在拼出来之后出现（学校拼读课：不能看图猜词）
   和「认音符」的差别：这里是拼字，**只看字母，不看是哪个八度**（C 点高的低的都算对）。
   谱号：大多高音谱号，低音谱号的比例跟认音符的设置（api.bassShare）。
   ────────────────────────────────────────────────────────────── */
(function (root) {
  "use strict";
  var PER_ROUND = 6, WRONG_LOCK = 600, WORD_HOLD = 1500;

  /* 词：纯 A–G 的 + 她高频词表里至少有两个 A–G 字母的 */
  var WORDS = ["bag", "bed", "cab", "dad", "egg", "face", "bee", "bad", "fed", "age", "add", "beg", "cage", "feed",
               "had", "and", "big", "back", "came", "made", "see", "be"];
  var PIC = { bag: "👜", bed: "🛏️", cab: "🚕", egg: "🥚", face: "🙂", bee: "🐝", dad: "👨", big: "🐘" };

  var WHITE = [48, 50, 52, 53, 55, 57, 59, 60, 62, 64, 65, 67, 69, 71, 72];
  var LETTER = { 0: "C", 2: "D", 4: "E", 5: "F", 7: "G", 9: "A", 11: "B" };
  var WHITE_EXT = [43, 45, 47].concat(WHITE);
  /* 每个字母在这个谱号范围里的音（C 有两个，随机取一个） */
  var RANGE = { treble: [60, 62, 64, 65, 67, 69, 71, 72], bass: [48, 50, 52, 53, 55, 57, 59, 60] };
  var BOTTOM = { treble: 64, bass: 43 };
  function letter(m) { return LETTER[m % 12]; }
  function step(m, clef) { return WHITE_EXT.indexOf(m) - WHITE_EXT.indexOf(BOTTOM[clef]); }

  function shuffle(a) { for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function makeWord(w, clef) {
    return { w: w, clef: clef, slots: w.split("").map(function (ch) {
      var L = ch.toUpperCase();
      if ("ABCDEFG".indexOf(L) < 0) return { ch: ch };                /* 不是音符：直接印出来 */
      var opts = RANGE[clef].filter(function (m) { return letter(m) === L; });
      return { ch: ch, L: L, m: opts[Math.floor(Math.random() * opts.length)] };
    }) };
  }

  /* 谱面：五条线 y = 50…90（一个间 = 10），每个字母一格宽 34 */
  var X0 = 62, DX = 34;
  function score(item, cur, clefPath) {
    var n = item.slots.length, W = X0 + DX * n + 6;
    var h = '<svg class="ng-staff" viewBox="0 0 ' + W + ' 140" role="img" aria-label="notes">';
    if (cur >= 0 && cur < n) h += '<rect class="ng-now" x="' + (X0 + DX * cur - 16) + '" y="22" width="32" height="112" rx="5"/>';
    [50, 60, 70, 80, 90].forEach(function (y) { h += '<line class="nr-l" x1="6" y1="' + y + '" x2="' + (W - 4) + '" y2="' + y + '"/>'; });
    if (clefPath) h += '<g class="nr-clefg">' + clefPath(item.clef, 10, 80, 60, 12) + "</g>";
    item.slots.forEach(function (s, i) {
      var x = X0 + DX * i;
      if (s.m != null) {
        var st = step(s.m, item.clef), y = 90 - st * 5;
        for (var k = -2; k >= st; k -= 2) h += '<line class="nr-l" x1="' + (x - 12) + '" y1="' + (90 - k * 5) + '" x2="' + (x + 12) + '" y2="' + (90 - k * 5) + '"/>';
        for (var k2 = 10; k2 <= st; k2 += 2) h += '<line class="nr-l" x1="' + (x - 12) + '" y1="' + (90 - k2 * 5) + '" x2="' + (x + 12) + '" y2="' + (90 - k2 * 5) + '"/>';
        h += '<ellipse class="nr-head' + (s.got ? " good" : "") + '" cx="' + x + '" cy="' + y + '" rx="7.2" ry="5" transform="rotate(-20 ' + x + " " + y + ')"/>';
      }
      /* 下面的格子：音符的字母点对了才出现；不是音符的字母一直在 */
      var shown = s.m == null || s.got;
      h += '<text class="ng-l' + (s.m == null ? " fixed" : "") + '" x="' + x + '" y="128" text-anchor="middle">' + (shown ? s.ch : "") + "</text>";
      if (!shown) h += '<line class="ng-blank" x1="' + (x - 9) + '" y1="131" x2="' + (x + 9) + '" y2="131"/>';
    });
    return h + "</svg>";
  }

  /* 声音：和认音符一样的合成琴音 */
  var ac = null;
  function tone(m) {
    try {
      ac = ac || new (root.AudioContext || root.webkitAudioContext)();
      if (ac.state === "suspended") ac.resume();
      var f = 440 * Math.pow(2, (m - 69) / 12), t = ac.currentTime, out = ac.createGain();
      out.gain.value = 0.22; out.connect(ac.destination);
      [[1, 1], [2, 0.35], [3, 0.12], [4, 0.06]].forEach(function (p) {
        var o = ac.createOscillator(), g = ac.createGain();
        o.type = "sine"; o.frequency.value = f * p[0];
        g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(p[1], t + 0.012);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 1.4 / p[0] + 0.3);
        o.connect(g); g.connect(out); o.start(t); o.stop(t + 1.8);
      });
    } catch (e) {}
  }

  /* api：bassShare() · letters() · clefPath(clef,space,gy,fy,x) · best()/saveBest(ms) · useRound()
          speak(txt) · say(txt) · beep(kind) · cat(host) · onExit() */
  function attach(host, api) {
    var nb = Math.round(PER_ROUND * Math.max(0, Math.min(1, api.bassShare())));
    var clefs = shuffle(Array.apply(null, Array(PER_ROUND)).map(function (_, i) { return i < nb ? "bass" : "treble"; }));
    var items = shuffle(WORDS.slice()).slice(0, PER_ROUND).map(function (w, i) { return makeWord(w, clefs[i]); });
    var idx = 0, pos = 0, t0 = 0, first = true, locked = false, pet = null, dead = false, timers = [];
    function later(fn, ms) { timers.push(setTimeout(function () { if (!dead) fn(); }, ms)); }

    host.innerHTML =
      '<div class="nr ng">' +
        '<div class="mg-dots"></div>' +
        '<div class="ng-score"></div>' +
        '<p class="nr-say ng-word" aria-live="polite"></p>' +
        '<div class="nr-kb-wrap"><div class="nr-kb-view"><div class="nr-kb"></div></div></div>' +
      "</div>";
    var elDots = host.querySelector(".mg-dots"), elScore = host.querySelector(".ng-score"),
        elWord = host.querySelector(".ng-word"), elKb = host.querySelector(".nr-kb");

    /* 键盘：和认音符同一副（15 个白键，露 11 个，按谱号滑到位） */
    (function drawKeys() {
      var h = "", showL = api.letters();
      WHITE.forEach(function (m) {
        h += '<button class="nr-w' + (m === 60 ? " mid" : "") + '" data-m="' + m + '" aria-label="' + letter(m) + '">' +
             (showL ? "<span>" + letter(m) + "</span>" : "") + (m === 60 ? "<em>Middle C</em>" : "") + "</button>";
      });
      WHITE.forEach(function (m, i) {
        if (i < WHITE.length - 1 && [0, 2, 5, 7, 9].indexOf(m % 12) >= 0)
          h += '<i class="nr-b" style="left:calc(' + ((i + 1) / WHITE.length * 100) + '% - 2%)"></i>';
      });
      elKb.innerHTML = h;
    })();
    function setRange(clef) {
      elKb.style.transform = "translateX(" + (-(clef === "treble" ? 4 : 0) / WHITE.length * 100) + "%)";
      [].forEach.call(elKb.querySelectorAll(".nr-w"), function (b) {
        b.disabled = RANGE[clef].indexOf(+b.dataset.m) < 0; b.classList.remove("good", "bad");
      });
    }
    function nextPos() { var s = items[idx].slots; while (pos < s.length && s[pos].m == null) pos++; }
    function render() {
      var d = ""; for (var i = 0; i < items.length; i++) d += '<i class="' + (i < idx ? "on" : "") + '"></i>';
      elDots.innerHTML = d;
      elScore.innerHTML = score(items[idx], pos, api.clefPath);
    }
    function startWord() {
      pos = 0; nextPos(); elWord.textContent = ""; locked = false;
      setRange(items[idx].clef); render();
    }

    elKb.addEventListener("click", function (e) {
      var b = e.target.closest(".nr-w"); if (!b || b.disabled || locked) return;
      var it = items[idx], s = it.slots[pos], m = +b.dataset.m;
      if (!s) return;
      if (first) { first = false; t0 = performance.now(); }
      tone(m);
      if (letter(m) !== s.L) {
        locked = true; b.classList.add("bad"); api.beep("bad");
        later(function () { b.classList.remove("bad"); locked = false; }, WRONG_LOCK);
        return;
      }
      b.classList.add("good"); later(function () { b.classList.remove("good"); }, 250);
      s.got = true; pos++; nextPos();
      if (pos < it.slots.length) { render(); return; }
      /* 拼出来了：念出这个词，有图的出图 */
      locked = true; render();
      elWord.textContent = it.w + (PIC[it.w] ? "  " + PIC[it.w] : "");
      api.beep("good");
      later(function () { api.speak(it.w); }, 250);
      later(function () {
        idx++;
        if (idx >= items.length) finish(performance.now() - t0 - WORD_HOLD * PER_ROUND); else startWord();
      }, WORD_HOLD);
    });

    function finish(ms) {
      ms = Math.max(ms, 1000);
      var prev = api.best();
      api.useRound(); api.saveBest(ms);
      var maxMs = Math.max(ms, prev || ms) * 1.05;
      function bar(label, v, cls) {
        if (!v) return "";
        return '<div class="mg-bar ' + cls + '"><span class="mg-bar-l">' + label + '</span><span class="mg-bar-t"><i style="width:' +
          (v / maxMs * 100).toFixed(1) + '%"></i></span><span class="mg-bar-n">' + (Math.round(v / 100) / 10) + " 秒</span></div>";
      }
      var faster = prev && ms < prev;
      host.innerHTML = '<div class="mg-done"><div class="mg-done-h">' + (faster ? "比上次快！" : "做完啦") + "</div>" +
        bar("上次", prev, "old") + bar("这次", ms, "new") +
        '<div class="mg-pet"></div><button class="btn" id="ng-ok">好了</button></div>';
      if (api.cat) { pet = api.cat(host.querySelector(".mg-pet")); if (pet && pet.cheer) pet.cheer(); }
      api.beep("good");
      if (api.say) api.say(faster ? "比上次快" : "做完啦", true);
      host.querySelector("#ng-ok").onclick = function () { api.onExit(); };
    }

    startWord();
    return { destroy: function () { dead = true; timers.forEach(clearTimeout); if (pet && pet.destroy) pet.destroy(); } };
  }

  root.NoteGame = { attach: attach, WORDS: WORDS, PER_ROUND: PER_ROUND, makeWord: makeWord };
})(window);
