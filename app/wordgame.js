/* ──────────────────────────────────────────────────────────────
   听音选词小游戏 —— 听一个英文词，从 4 个写出来的词里点对的那个
   独立模块，用 window.ListenGame.attach(host, api)。和认字小游戏（game.js）同一套规矩：

     · 一局 10 个词，成绩是【用了多久】，不是答对几个（定量计时）
     · 答错不前进：那个词灰掉、冻结 0.6 秒，题目不变 → 乱点一定更慢，猜没好处
     · 一天 3 局是「限量」不是「门票」，不用先写完单词才能玩
     · 小猫绑「做完了」，不绑「答对/更快」

   为什么是「听 → 选词」：学校要求高频词【读得快】。她听到音、在几个词里找出来，
   就是在做「字形 → 读音」的快速对应，秒数每天看得见变化。
   选项是上了学校颜色的词（Monster Phonics），颜色本身就是读音的提示，和学校一致。

   干扰项专挑容易混的：was/saw、no/on、of/off、there/their/where……
   正好对准镜像、顺序颠倒、长得像这几类错误。凑不够再挑首字母或长度相近的。

   图：只有 9 个画得出来的词有图，而且【答对之后】才出现（学校拼读课的要求：不能看图猜词）。
   ────────────────────────────────────────────────────────────── */
(function () {
  "use strict";

  var PER_ROUND = 10, CHOICES = 4, WRONG_LOCK = 600, RIGHT_HOLD = 1100;

  /* 容易混的组：同组的互为干扰项 */
  var CONFUSE = [
    ["was", "saw", "as", "has"], ["no", "on", "go", "so"], ["of", "off", "for", "if"],
    ["there", "their", "where", "here", "her"], ["then", "them", "when", "they", "the"],
    ["what", "that", "with", "went"], ["from", "for", "form"], ["come", "some", "came", "one"],
    ["look", "looked", "like", "little"], ["said", "says", "see", "she"], ["you", "your", "our", "out"],
    ["to", "too", "do", "into", "today"], ["he", "she", "we", "me", "be"], ["his", "has", "is", "him"],
    ["it", "it's", "at", "in", "if"], ["put", "push", "pull", "full"], ["house", "out", "about", "our"],
    ["could", "called", "old", "all"], ["my", "by", "me"], ["made", "make", "came", "day"],
    ["had", "have", "has", "help"], ["one", "once", "on"], ["ask", "asked", "as"],
    ["mum", "me", "my"], ["dad", "day", "did"], ["big", "but", "back"], ["got", "get", "go"],
    ["I", "I'm", "in"], ["are", "our", "were"], ["can", "came", "come"], ["now", "no", "down"],
    ["Mr", "Mrs", "my"], ["just", "put", "but"], ["up", "put", "pull"], ["an", "and", "a"],
    ["will", "with", "went"], ["friend", "from", "for"], ["school", "look", "too"],
    ["love", "look", "little"], ["children", "called", "could"], ["people", "put", "help"],
    ["very", "they", "every"], ["time", "like", "made"], ["don't", "down", "do"], ["oh", "old", "on"]
  ];

  function shuffle(a, rnd) {
    for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(rnd() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; }
    return a;
  }

  /* 挑这一局的词：答得慢、答错过、很久没考、没考过的优先（和认字游戏同一个加权） */
  function pickWords(pool, stats, n, rnd) {
    var now = Date.now();
    return pool.map(function (w) {
      var s = stats && stats[w], need;
      if (!s || !s.n) need = 2.5;
      else {
        var acc = s.ok / s.n, avg = s.ok ? s.rt / s.ok : 6000;
        need = 1 + (1 - acc) * 3 + Math.min(avg / 2500, 3);
        need += Math.min((s.last ? (now - s.last) / 86400000 : 30) / 7, 1.5);
      }
      return { w: w, k: need * (0.7 + rnd() * 0.6) };
    }).sort(function (a, b) { return b.k - a.k; }).slice(0, Math.min(n, pool.length)).map(function (x) { return x.w; });
  }

  /* 干扰项：先同组的，再首字母相同或长度相近的，最后随便挑 */
  function distractors(w, pool, rnd) {
    var out = [];
    function add(x) { if (x !== w && pool.indexOf(x) >= 0 && out.indexOf(x) < 0 && out.length < CHOICES - 1) out.push(x); }
    CONFUSE.forEach(function (g) { if (g.indexOf(w) >= 0) shuffle(g.slice(), rnd).forEach(add); });
    shuffle(pool.filter(function (x) {
      return x[0].toLowerCase() === w[0].toLowerCase() || Math.abs(x.length - w.length) <= 1;
    }), rnd).forEach(add);
    shuffle(pool.slice(), rnd).forEach(add);
    return out;
  }

  function makeItem(w, pool, rnd) {
    return { w: w, opts: shuffle([w].concat(distractors(w, pool, rnd)), rnd) };
  }

  /* api：words() 词表 · html(w) 上色 · pic(w) 读完之后给的图 · stats()/saveStat(w,ok,ms)
          best()/saveBest(ms) · useRound() · speak(w) · say(txt) · beep(kind) · cat(host) · onExit() */
  function attach(host, api) {
    var pool = api.words(), rnd = Math.random;
    var items = pickWords(pool, api.stats(), PER_ROUND, rnd).map(function (w) { return makeItem(w, pool, rnd); });
    var idx = 0, t0 = 0, shownAt = 0, first = true, locked = false, pet = null, timers = [];
    function later(fn, ms) { timers.push(setTimeout(fn, ms)); }

    host.innerHTML =
      '<div class="mg lg">' +
      '<div class="mg-dots"></div>' +
      '<div class="mg-prompt"><button class="lg-say" aria-label="再听一遍">🔊</button>' +
      '<span class="lg-pic"></span></div>' +
      '<div class="mg-opts lg-opts"></div>' +
      '<div class="mg-pet"></div></div>';
    var elDots = host.querySelector(".mg-dots"), elOpts = host.querySelector(".lg-opts"),
        elPic = host.querySelector(".lg-pic"), elSay = host.querySelector(".lg-say");
    elSay.onclick = function () { api.speak(items[idx].w); };

    function render() {
      var it = items[idx], h = "";
      for (var i = 0; i < items.length; i++) h += '<i class="' + (i < idx ? "on" : "") + '"></i>';
      elDots.innerHTML = h;
      elPic.textContent = ""; elPic.classList.remove("show");
      elOpts.innerHTML = it.opts.map(function (o, i) {
        return '<button class="mg-opt lg-opt" data-i="' + i + '"><span class="eng">' + api.html(o) + "</span></button>";
      }).join("");
      shownAt = performance.now(); locked = false;
      api.speak(it.w);
    }

    elOpts.addEventListener("click", function (e) {
      var b = e.target.closest(".lg-opt");
      if (!b || locked) return;
      var it = items[idx], o = it.opts[+b.dataset.i], now = performance.now();
      if (first) { first = false; t0 = shownAt; }
      if (o !== it.w) {
        locked = true; b.classList.add("bad"); api.beep("bad");
        api.saveStat(it.w, false, now - shownAt);
        later(function () { locked = false; }, WRONG_LOCK);
        return;
      }
      locked = true; b.classList.add("good"); api.beep("good");
      api.saveStat(it.w, true, now - shownAt);
      var p = api.pic(it.w);                     /* 图只在读对之后出现 */
      if (p) { elPic.textContent = p; elPic.classList.add("show"); }
      later(function () { api.speak(it.w); }, 250);
      later(function () {
        idx++;
        if (idx >= items.length) finish(now - t0); else render();
      }, RIGHT_HOLD);
    });

    function finish(ms) {
      timers.forEach(clearTimeout); timers = [];
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
        '<div class="mg-pet"></div><button class="btn" id="lg-ok">好了</button></div>';
      if (api.cat) { pet = api.cat(host.querySelector(".mg-pet")); if (pet && pet.cheer) pet.cheer(); }
      api.beep("good");
      if (api.say) api.say(faster ? "比上次快" : "做完啦", true);
      host.querySelector("#lg-ok").onclick = function () { api.onExit(); };
    }

    render();
    return { destroy: function () { timers.forEach(clearTimeout); if (pet && pet.destroy) pet.destroy(); } };
  }

  window.ListenGame = { attach: attach, PER_ROUND: PER_ROUND, CONFUSE: CONFUSE,
                        pickWords: pickWords, distractors: distractors, makeItem: makeItem };
})();
