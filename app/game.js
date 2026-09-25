/* ──────────────────────────────────────────────────────────────
   认字配对小游戏 —— 看字选图
   独立模块，不依赖主脚本的内部变量；用 window.MatchGame.attach(host, api)。

   这个游戏的定位（想清楚了再改）：
   **它不教新字。** 新字由洪恩识字和课本负责，这里只做三件事：
     1. 巩固 —— 把学过的字反复调用
     2. 迁移 —— 换一个完全不同的外壳，检验她是不是只在洪恩的界面里认得
        （情境绑定是早期识字最常见也最隐形的假性掌握）
     3. 测流利度 —— 认得 ≠ 认得快。反应时间是练字和听写都给不了的数据

   为什么是「一个字 → 四张图」，而不是双向配对：
     · 单个提示 + 单次点击，反应时间才是**纯粹的认字延迟**，双向配对里她可能
       从图反推，数据就脏了
     · 只有一个提示字，她必须读它 —— 强制 **形→义**（阅读方向），没法绕
     · 答错不前进 + 短冻结，而成绩是**总耗时** → 乱点一定更慢，猜没有任何好处

   拼音的位置：**不进选择，只进反馈。** 答对之后才亮出拼音并读出来 ——
   那时形、音、义三者同时在场，是最好的强化时机；放进选择项则会拖慢游戏、
   污染反应时间，而且她现在拼音本身还在学（见 docs 里的讨论）。
   ────────────────────────────────────────────────────────────── */
(function () {
  "use strict";

  /* ── 字 → 图 ──────────────────────────────────────────────
     一个字给 2~3 张图，每次随机取一张。

     ⚠️ 这不是为了好看。只给一张图的话，玩上几周她会记住「这个字配那个图形」，
     退化成纯图形配对，一个字都不用认。**换图就断了这条捷径，逼她回到字义上。**

     选图的三条规矩：
       1. 一眼能认出（含糊的一律不要，比如「风」🌬️）
       2. 同一局里出现的图必须互不相像
       3. 只收**具体名词**。代词（你我他）、抽象字（的了是在）、
          相对概念（大小）没法画，它们不进这个游戏 —— 交给课本和亲子共读。
          想覆盖它们得画简笔画，那是另一笔投入，等覆盖面不够了再说。
     ────────────────────────────────────────────────────────── */
  const PICTURES = {
    /* 识字 1-4 · 语文园地一（她最早学的） */
    人: ["🧍", "🧑"],
    口: ["👄", "😮"],
    耳: ["👂"],
    目: ["👁️", "👀"],
    手: ["✋", "🖐️"],
    足: ["🦶"],
    日: ["☀️", "🌞"],
    月: ["🌙", "🌛"],
    山: ["⛰️", "🏔️"],
    水: ["💧", "🚰"],
    火: ["🔥"],
    禾: ["🌾"],
    上: ["⬆️", "🔼"],
    下: ["⬇️", "🔽"],
    /* 拼音 3-4 */
    爸: ["👨", "🧔"],
    妈: ["👩"],
    马: ["🐴", "🐎"],
    路: ["🛣️"],
    /* 语文园地二 · 拼音 5-9 */
    本: ["📕", "📗"],
    花: ["🌸", "🌺"],
    木: ["🪵"],
    纸: ["📄"],
    书: ["📖", "📚"],
    鱼: ["🐟", "🐠"],
    鸭: ["🦆"],
    /* 语文园地三 · 拼音 10-14 */
    星: ["⭐", "🌟"],
    菜: ["🥬"],
    瓜: ["🍉"],
    果: ["🍎", "🍏"],
    桥: ["🌉"],
    雪: ["❄️", "⛄"],
    云: ["☁️", "⛅"],
    草: ["🌿", "🍀"],
    冰: ["🧊"],
    车: ["🚗", "🚕"],
    /* 阅读 1-4 */
    树: ["🌳", "🌲"],
    叶: ["🍃"],
    家: ["🏠", "🏡"],
    鸡: ["🐔", "🐓"],
    竹: ["🎋", "🎍"],
    牙: ["🦷"],
    鸟: ["🐦", "🕊️"],
    蛙: ["🐸"],
    /* 语文园地五 · 识字 5-8 */
    男: ["👦"],
    女: ["👧"],
    雨: ["🌧️", "☔"],
    虫: ["🐛", "🐞"],
    桃: ["🍑"],
    林: ["🌲🌲"],
    心: ["❤️", "💗"],
    金: ["🪙"],
    包: ["🎒", "👜"],
    尺: ["📏"],
    笔: ["✏️", "🖊️"],
    刀: ["🔪"],
    旗: ["🚩", "🏁"],
    /* 语文园地六 · 阅读 5-9 · 语文园地七-八 */
    门: ["🚪"],
    船: ["⛵", "🚢"],
    狗: ["🐶", "🐕"],
    爷: ["👴"],
    奶: ["👵"],
    伞: ["☂️", "🌂"],
    兔: ["🐰", "🐇"],
    石: ["🪨"],
    牛: ["🐄", "🐮"],
    羊: ["🐑", "🐏"],
  };

  /** 一局几个字 */
  const PER_ROUND = 10;
  /** 每题几个选项 */
  const CHOICES = 4;
  /** 答错之后冻结多久（毫秒）。够她看清"这个不对"，又不至于觉得卡住了 */
  const WRONG_LOCK = 600;
  /** 答对之后停留多久再出下一题 —— 要够念完拼音 */
  const RIGHT_HOLD = 900;

  /* ── 纯函数部分（这几个能单独测）────────────────────────── */

  /** 这些字里，有图可配的有哪些 */
  function playable(chars) {
    const seen = {};
    return (chars || []).filter(function (c) {
      if (seen[c] || !PICTURES[c]) return false;
      seen[c] = 1;
      return true;
    });
  }

  /**
   * 挑出这一局要考的字。
   *
   * 不是纯随机 —— 按「需要练的程度」加权：**答得慢的、答错过的、很久没考的，
   * 出现概率更高**。这就是把间隔重复藏进游戏里，她不会觉得在被针对性训练。
   */
  function pickChars(pool, stats, n, rnd) {
    const now = Date.now();
    const scored = pool.map(function (c) {
      const s = (stats && stats[c]) || null;
      let need = 1;
      if (!s || !s.n) {
        need = 2.5; /* 没考过的优先 */
      } else {
        const acc = s.ok / s.n;
        const avg = s.ok ? s.rt / s.ok : 6000;
        need = 1 + (1 - acc) * 3 + Math.min(avg / 2000, 3);
        const days = s.last ? (now - s.last) / 86400000 : 30;
        need += Math.min(days / 7, 1.5); /* 太久没见也该复习 */
      }
      return { c: c, w: need * (0.7 + rnd() * 0.6) };
    });
    scored.sort(function (a, b) {
      return b.w - a.w;
    });
    return scored.slice(0, Math.min(n, pool.length)).map(function (x) {
      return x.c;
    });
  }

  /** 给一个字出一道题：正确的图 + 若干张别的字的图 */
  function makeItem(ch, pool, rnd) {
    const others = pool.filter(function (c) {
      return c !== ch;
    });
    /* 洗牌取干扰项 */
    for (let i = others.length - 1; i > 0; i--) {
      const j = Math.floor(rnd() * (i + 1));
      const t = others[i];
      others[i] = others[j];
      others[j] = t;
    }
    const picked = [ch].concat(others.slice(0, CHOICES - 1));
    const opts = picked.map(function (c) {
      const imgs = PICTURES[c];
      return { ch: c, img: imgs[Math.floor(rnd() * imgs.length)] };
    });
    for (let i = opts.length - 1; i > 0; i--) {
      const j = Math.floor(rnd() * (i + 1));
      const t = opts[i];
      opts[i] = opts[j];
      opts[j] = t;
    }
    return { ch: ch, opts: opts };
  }

  /** 今天还能玩几局 */
  function leftToday(rec, limit, today) {
    if (!rec || rec.d !== today) return limit;
    return Math.max(0, limit - (rec.n || 0));
  }

  /* ── 界面 ──────────────────────────────────────────────── */

  /**
   * api 需要提供：
   *   learned()      -> 她学过的字（数组）
   *   pinyinOf(ch)   -> 拼音字符串
   *   stats()        -> 每个字的成绩 {ch:{n,ok,rt,last}}
   *   saveStat(ch, ok, ms)
   *   best()         -> 上一次的成绩（毫秒），没有就 0
   *   saveBest(ms)
   *   useRound()     -> 记一局（扣掉今天的次数）
   *   speak(ch)      -> 读一个字
   *   say(txt, cut)  -> 读一句话
   *   beep(kind)     -> 'good' | 'bad' | 'tap'
   *   cat(host)      -> 可选，挂一只猫，返回 {cheer()}
   *   onExit()       -> 玩完或退出时回主界面
   */
  function attach(host, api) {
    const pool = playable(api.learned());
    if (pool.length < CHOICES) {
      host.innerHTML =
        '<div class="mg-empty"><p>她学过的字里，能配图的还不够 ' +
        CHOICES +
        " 个。<br>再学几课就能玩了。</p></div>";
      return { destroy: function () {} };
    }

    const rnd = Math.random;
    const chars = pickChars(pool, api.stats(), PER_ROUND, rnd);
    const items = chars.map(function (c) {
      return makeItem(c, pool, rnd);
    });

    let idx = 0;
    let t0 = 0; /* 整局的起点，第一次点击才开始计时 */
    let itemShownAt = 0;
    let firstTap = true;
    let locked = false;
    let pet = null;
    const timers = [];
    function later(fn, ms) {
      timers.push(setTimeout(fn, ms));
    }
    function clearTimers() {
      timers.forEach(clearTimeout);
      timers.length = 0;
    }

    host.innerHTML =
      '<div class="mg">' +
      '<div class="mg-dots" id="mg-dots"></div>' +
      '<div class="mg-prompt"><span class="mg-ch" id="mg-ch"></span>' +
      '<span class="mg-py" id="mg-py"></span></div>' +
      '<div class="mg-opts" id="mg-opts"></div>' +
      '<div class="mg-pet" id="mg-pet"></div>' +
      "</div>";

    const elDots = host.querySelector("#mg-dots");
    const elCh = host.querySelector("#mg-ch");
    const elPy = host.querySelector("#mg-py");
    const elOpts = host.querySelector("#mg-opts");

    function drawDots() {
      let h = "";
      for (let i = 0; i < items.length; i++) {
        h += '<i class="' + (i < idx ? "on" : "") + '"></i>';
      }
      elDots.innerHTML = h;
    }

    function render() {
      const it = items[idx];
      drawDots();
      elCh.textContent = it.ch;
      elPy.textContent = ""; /* 拼音只在答对之后出现 */
      elPy.classList.remove("show");
      elOpts.innerHTML = it.opts
        .map(function (o, i) {
          return (
            '<button class="mg-opt" data-i="' +
            i +
            '"><span>' +
            o.img +
            "</span></button>"
          );
        })
        .join("");
      itemShownAt = performance.now();
      locked = false;
    }

    elOpts.addEventListener("click", function (e) {
      const btn = e.target.closest(".mg-opt");
      if (!btn || locked) return;
      const it = items[idx];
      const opt = it.opts[+btn.dataset.i];
      const now = performance.now();
      if (firstTap) {
        firstTap = false;
        t0 = itemShownAt; /* 计时从第一题出现算起 */
      }

      if (opt.ch !== it.ch) {
        /* 答错：这张图灰掉，题目不变，可以再试。
           ⚠️ 不前进是关键 —— 成绩是总耗时，所以乱点一定更慢，猜没好处。 */
        locked = true;
        btn.classList.add("bad");
        api.beep("bad");
        api.saveStat(it.ch, false, now - itemShownAt);
        later(function () {
          locked = false;
        }, WRONG_LOCK);
        return;
      }

      /* 答对 */
      locked = true;
      btn.classList.add("good");
      api.beep("good");
      api.saveStat(it.ch, true, now - itemShownAt);

      /* 拼音只在这一刻出现：形、音、义三者同时在场 */
      const py = api.pinyinOf(it.ch);
      if (py) {
        elPy.textContent = py;
        elPy.classList.add("show");
      }
      api.speak(it.ch);

      later(function () {
        idx++;
        if (idx >= items.length) finish(now - t0);
        else render();
      }, RIGHT_HOLD);
    });

    function finish(ms) {
      clearTimers();
      const prev = api.best();
      api.useRound();
      api.saveBest(ms);

      /* 两条横条对比：短的那条快。不认字也看得懂，数字只是给大人看的 */
      const maxMs = Math.max(ms, prev || ms) * 1.05;
      const bar = function (label, v, cls) {
        if (!v) return "";
        return (
          '<div class="mg-bar ' +
          cls +
          '"><span class="mg-bar-l">' +
          label +
          '</span><span class="mg-bar-t"><i style="width:' +
          ((v / maxMs) * 100).toFixed(1) +
          '%"></i></span><span class="mg-bar-n">' +
          (Math.round(v / 100) / 10) +
          " 秒</span></div>"
        );
      };
      const faster = prev && ms < prev;

      host.innerHTML =
        '<div class="mg-done">' +
        '<div class="mg-done-h">' +
        (faster ? "比上次快！" : "做完啦") +
        "</div>" +
        bar("上次", prev, "old") +
        bar("这次", ms, "new") +
        '<div class="mg-pet" id="mg-pet"></div>' +
        '<button class="btn" id="mg-ok">好了</button>' +
        "</div>";

      /* 猫绑「做完了」，不绑「答对/更快」—— 和听写页那条规则同一个道理：
         它不参与评判她。 */
      if (api.cat) {
        pet = api.cat(host.querySelector("#mg-pet"));
        if (pet && pet.cheer) pet.cheer();
      }
      api.beep("good");
      if (api.say) api.say(faster ? "比上次快" : "做完啦", true);
      host.querySelector("#mg-ok").onclick = function () {
        api.onExit();
      };
    }

    render();

    return {
      destroy: function () {
        clearTimers();
        if (pet && pet.destroy) pet.destroy();
      },
    };
  }

  window.MatchGame = {
    attach: attach,
    /* 下面几个导出来是为了能单独验证 */
    PICTURES: PICTURES,
    playable: playable,
    pickChars: pickChars,
    makeItem: makeItem,
    leftToday: leftToday,
    PER_ROUND: PER_ROUND,
    CHOICES: CHOICES,
  };
})();
