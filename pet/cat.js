/* 小猫：矢量角色 + 情绪动画。
 *
 * 为什么手画 SVG 而不用现成素材（2026-09-17 查过）：
 *   · Kenney（CC0）只有一张静态的脸，没身体没动作，也没有猫
 *   · itch.io / OpenGameArt 的农场动物包都是【俯视角行走贴图】，给游戏里走动用的，
 *     不是正面朝着孩子做反应的陪伴角色；而且基本都没有猫
 *   · いらすとや / ONWA 有猫但是静态全身插画，保留版权，做变形动画会走形
 * SVG 分部件的好处：耳朵、眼睛、尾巴各是一个元素，能各动各的（眨眼、摇尾巴），
 * 这是静态 PNG 做不到的；矢量几 KB，任意缩放不糊；零授权顾虑。
 *
 * 性格 = 一组数值（MOODS）。"安静陪着"和"活泼捧场"是同一只猫换参数，
 * 以后在游戏交互里想改成活泼的，改 mood 就行，不用重画。
 */
(function (root) {
  "use strict";

  /* 配色对齐 app：朱红项圈、杏黄铃铛、暖调姜黄毛色。
     用自带颜色而不是主题变量——深浅色背景下都得站得住。 */
  var C = {
    fur: "#F0C48C",
    furDark: "#DFA663",
    belly: "#FDF1E0",
    line: "#6B4B31",
    eye: "#2A2118",
    blush: "#E9857A",
    nose: "#CE3E33",
    collar: "#CE3E33",
    bell: "#D98C1F"
  };

  /* 性格参数。amp=幅度，dur=周期（秒），blink=眨眼间隔（毫秒） */
  var MOODS = {
    calm: {                       /* 安静陪着——写字时用这个 */
      floatAmp: 2.0, floatDur: 3.6,
      tailAmp: 7, tailDur: 4.4,
      bounce: 0.09, bounceDur: 700,
      blinkMin: 4200, blinkMax: 9000,
      tiltDeg: 7, hearts: 3
    },
    lively: {                     /* 活泼捧场——以后游戏里用 */
      floatAmp: 5.0, floatDur: 1.9,
      tailAmp: 17, tailDur: 1.5,
      bounce: 0.22, bounceDur: 520,
      blinkMin: 1800, blinkMax: 4200,
      tiltDeg: 12, hearts: 5
    }
  };

  function svg() {
    return '' +
'<svg class="cat" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' +
  '<ellipse class="cat-shadow" cx="100" cy="186" rx="46" ry="7"/>' +
  '<g class="cat-all">' +

    /* 尾巴：两条同路径，粗的做描边、细的做毛色 */
    '<g class="cat-tail">' +
      '<path d="M140 168 C 172 166 182 142 172 118 C 168 108 158 106 154 114" ' +
            'fill="none" stroke="' + C.line + '" stroke-width="21" stroke-linecap="round"/>' +
      '<path d="M140 168 C 172 166 182 142 172 118 C 168 108 158 106 154 114" ' +
            'fill="none" stroke="' + C.fur + '" stroke-width="14" stroke-linecap="round"/>' +
      '<path d="M176 130 C 180 124 180 118 176 113" fill="none" ' +
            'stroke="' + C.furDark + '" stroke-width="10" stroke-linecap="round"/>' +
    '</g>' +

    /* 身体 */
    '<path d="M100 104 C 66 104 54 136 56 160 C 58 176 76 183 100 183 ' +
             'C 124 183 142 176 144 160 C 146 136 134 104 100 104 Z" ' +
          'fill="' + C.fur + '" stroke="' + C.line + '" stroke-width="3.6" stroke-linejoin="round"/>' +
    '<path d="M100 132 C 82 132 76 152 78 166 C 80 178 88 182 100 182 ' +
             'C 112 182 120 178 122 166 C 124 152 118 132 100 132 Z" ' +
          'fill="' + C.belly + '" stroke="none" opacity=".85"/>' +
    /* 前爪 */
    '<ellipse cx="80" cy="176" rx="13" ry="9" fill="' + C.belly + '" ' +
             'stroke="' + C.line + '" stroke-width="3.2"/>' +
    '<ellipse cx="120" cy="176" rx="13" ry="9" fill="' + C.belly + '" ' +
             'stroke="' + C.line + '" stroke-width="3.2"/>' +

    /* 项圈（以后挂配饰的地方） */
    '<path d="M72 122 Q 100 136 128 122" fill="none" stroke="' + C.collar + '" ' +
          'stroke-width="9" stroke-linecap="round"/>' +
    '<circle cx="100" cy="133" r="7" fill="' + C.bell + '" ' +
            'stroke="' + C.line + '" stroke-width="2.4"/>' +
    '<path d="M96 133 h8" stroke="' + C.line + '" stroke-width="2" stroke-linecap="round"/>' +

    '<g class="cat-head">' +
      /* 耳朵画在头后面，头把耳根盖住 */
      '<path d="M64 48 L 70 14 L 100 36 Z" fill="' + C.fur + '" ' +
            'stroke="' + C.line + '" stroke-width="3.6" stroke-linejoin="round"/>' +
      '<path d="M136 48 L 130 14 L 100 36 Z" fill="' + C.fur + '" ' +
            'stroke="' + C.line + '" stroke-width="3.6" stroke-linejoin="round"/>' +
      '<path d="M71 43 L 74 25 L 91 37 Z" fill="' + C.blush + '" opacity=".75"/>' +
      '<path d="M129 43 L 126 25 L 109 37 Z" fill="' + C.blush + '" opacity=".75"/>' +

      '<circle cx="100" cy="74" r="50" fill="' + C.fur + '" ' +
              'stroke="' + C.line + '" stroke-width="3.6"/>' +
      /* 额头上两道浅斑 */
      '<path d="M88 30 q 6 10 2 20" fill="none" stroke="' + C.furDark + '" ' +
            'stroke-width="5" stroke-linecap="round" opacity=".8"/>' +
      '<path d="M112 30 q -6 10 -2 20" fill="none" stroke="' + C.furDark + '" ' +
            'stroke-width="5" stroke-linecap="round" opacity=".8"/>' +

      '<circle class="cat-cheek" cx="64" cy="94" r="9"/>' +
      '<circle class="cat-cheek" cx="136" cy="94" r="9"/>' +

      /* 三种眼睛叠着，靠 class 切换显示 */
      '<g class="cat-eyes">' +
        '<g class="eye-open">' +
          '<ellipse cx="78" cy="78" rx="8.5" ry="10.5" fill="' + C.eye + '"/>' +
          '<ellipse cx="122" cy="78" rx="8.5" ry="10.5" fill="' + C.eye + '"/>' +
          '<circle cx="75" cy="74" r="3.2" fill="#fff"/>' +
          '<circle cx="119" cy="74" r="3.2" fill="#fff"/>' +
        '</g>' +
        '<g class="eye-shut">' +
          '<path d="M70 79 q 8 6 16 0" fill="none" stroke="' + C.eye + '" ' +
                'stroke-width="3.6" stroke-linecap="round"/>' +
          '<path d="M114 79 q 8 6 16 0" fill="none" stroke="' + C.eye + '" ' +
                'stroke-width="3.6" stroke-linecap="round"/>' +
        '</g>' +
        '<g class="eye-glad">' +
          '<path d="M70 81 q 8 -9 16 0" fill="none" stroke="' + C.eye + '" ' +
                'stroke-width="3.6" stroke-linecap="round"/>' +
          '<path d="M114 81 q 8 -9 16 0" fill="none" stroke="' + C.eye + '" ' +
                'stroke-width="3.6" stroke-linecap="round"/>' +
        '</g>' +
      '</g>' +

      /* 口鼻 */
      '<ellipse cx="100" cy="100" rx="23" ry="15" fill="' + C.belly + '" opacity=".9"/>' +
      '<path d="M93 94 Q 100 91 107 94 Q 100 103 93 94 Z" fill="' + C.nose + '"/>' +
      '<path d="M100 101 q -6 7 -12 2" fill="none" stroke="' + C.line + '" ' +
            'stroke-width="2.6" stroke-linecap="round"/>' +
      '<path d="M100 101 q 6 7 12 2" fill="none" stroke="' + C.line + '" ' +
            'stroke-width="2.6" stroke-linecap="round"/>' +
      /* 胡须 */
      '<g stroke="' + C.line + '" stroke-width="2.2" stroke-linecap="round" opacity=".75">' +
        '<path d="M74 96 L 46 91"/><path d="M74 101 L 45 103"/>' +
        '<path d="M126 96 L 154 91"/><path d="M126 101 L 155 103"/>' +
      '</g>' +
    '</g>' +
  '</g>' +
  /* 爱心在 cat-all 外面：跟着蹦会被挤压拉伸带歪 */
  '<g class="cat-hearts">' +
    heart('h1',  100, 28, 1.30, 0) +
    heart('h2',   74, 36, 1.05, -14) +
    heart('h3',  126, 36, 1.05, 14) +
    heart('h4',   86, 24, 0.82, -22) +
    heart('h5',  114, 24, 0.82, 22) +
  '</g>' +
'</svg>';
  }

  /* 一颗小爱心。dx = 上浮时往哪边飘 */
  function heart(cls, x, y, scale, dx) {
    var d = 'M0 4.2 C -5.6 -1.4, -5.6 -7, -2 -7 C -0.6 -7, 0 -5.9, 0 -5.3 ' +
            'C 0 -5.9, 0.6 -7, 2 -7 C 5.6 -7, 5.6 -1.4, 0 4.2 Z';
    /* 定位放外层 <g> 的 transform 属性，动画放内层 path 的 CSS transform——
       两者写在同一个元素上会互相覆盖（CSS 赢），爱心会跳到左上角。 */
    return '<g transform="translate(' + x + ' ' + y + ') scale(' + scale + ')">' +
             '<path class="cat-heart ' + cls + '" d="' + d + '" fill="' + C.nose + '" ' +
                   'style="--dx:' + dx + 'px"/>' +
           '</g>';
  }

  var CSS = '' +
'.cat{display:block;width:100%;height:100%;overflow:visible}' +
'.cat-shadow{fill:rgba(60,40,25,.13)}' +
'.cat-cheek{fill:' + C.blush + ';opacity:.5}' +
'.cat-all{transform-box:fill-box;transform-origin:50% 100%;' +
        'animation:catFloat var(--float-dur) ease-in-out infinite}' +
'.cat-tail{transform-box:fill-box;transform-origin:8% 92%;' +
         'animation:catTail var(--tail-dur) ease-in-out infinite}' +
'.cat-head{transform-box:fill-box;transform-origin:50% 88%;transition:transform .5s ease}' +
'.eye-shut,.eye-glad{opacity:0}' +
'.cat[data-eyes="shut"] .eye-open,.cat[data-eyes="glad"] .eye-open{opacity:0}' +
'.cat[data-eyes="shut"] .eye-shut{opacity:1}' +
'.cat[data-eyes="glad"] .eye-glad{opacity:1}' +
'.cat[data-act="happy"] .cat-all{animation:catBounce var(--bounce-dur) ease-out}' +
'.cat[data-act="happy"] .cat-tail{animation-duration:calc(var(--tail-dur)/3)}' +
'.cat[data-act="happy"] .cat-cheek{opacity:.8}' +
'.cat[data-act="cheer"] .cat-head{transform:rotate(var(--tilt))}' +
'.cat-heart{opacity:0;transform-box:fill-box;transform-origin:50% 50%}' +
'.cat[data-act="happy"] .cat-heart{animation:catHeart 1.15s ease-out}' +
'.cat[data-act="happy"] .h2{animation-delay:.10s}' +
'.cat[data-act="happy"] .h3{animation-delay:.19s}' +
'.cat[data-act="happy"] .h4{animation-delay:.28s}' +
'.cat[data-act="happy"] .h5{animation-delay:.36s}' +
'.cat[data-hearts="3"] .h4,.cat[data-hearts="3"] .h5{display:none}' +
'@keyframes catHeart{0%{opacity:0;transform:translate(0,4px) scale(.35)}' +
  '22%{opacity:1;transform:translate(calc(var(--dx)*.35),-10px) scale(1.05)}' +
  '100%{opacity:0;transform:translate(var(--dx),-34px) scale(.72)}}' +
'@keyframes catFloat{0%,100%{transform:translateY(0)}50%{transform:translateY(calc(var(--float-amp)*-1px))}}' +
'@keyframes catTail{0%,100%{transform:rotate(calc(var(--tail-amp)*-1deg))}' +
                  '50%{transform:rotate(var(--tail-amp))}}' +
'@keyframes catBounce{0%{transform:translateY(0) scale(1,1)}' +
  '18%{transform:translateY(0) scale(calc(1 + var(--bounce)),calc(1 - var(--bounce)))}' +
  '48%{transform:translateY(calc(var(--bounce)*-64px)) scale(calc(1 - var(--bounce)*.6),calc(1 + var(--bounce)*.6))}' +
  '76%{transform:translateY(0) scale(calc(1 + var(--bounce)*.5),calc(1 - var(--bounce)*.5))}' +
  '100%{transform:translateY(0) scale(1,1)}}' +
'@media (prefers-reduced-motion:reduce){.cat-all,.cat-tail,.cat-heart{animation:none}}';

  function injectCSS() {
    if (document.getElementById("cat-css")) return;
    var s = document.createElement("style");
    s.id = "cat-css";
    s.textContent = CSS;
    document.head.appendChild(s);
  }

  /* 叫声：优先放真猫叫（CC0 录音，见 meow.wav 旁注），放不出来再退回合成音。
     iOS 要求音频由用户操作触发——这里的调用链都始于孩子的一次落笔，没问题。 */
  var meowEl = null, meowBad = false;
  function meow(vol) {
    if (!vol) return;
    if (meowBad) return chirp(vol);
    try {
      if (!meowEl) {
        meowEl = new Audio(root.Cat.soundURL);
        meowEl.preload = "auto";
        meowEl.addEventListener("error", function () { meowBad = true; });
      }
      meowEl.volume = Math.max(0, Math.min(1, vol * 0.75));
      meowEl.currentTime = 0;
      var p = meowEl.play();
      if (p && p.catch) p.catch(function () { meowBad = true; chirp(vol); });
    } catch (e) { meowBad = true; chirp(vol); }
  }

  /* 合成的兜底音：不是猫叫，只是一声可爱的小音 */
  var ac = null;
  function chirp(vol) {
    if (!vol) return;
    try {
      ac = ac || new (window.AudioContext || window.webkitAudioContext)();
      if (ac.state === "suspended") ac.resume();
      var t = ac.currentTime;
      var o = ac.createOscillator(), g = ac.createGain(), f = ac.createBiquadFilter();
      o.type = "triangle";
      o.frequency.setValueAtTime(700, t);
      o.frequency.exponentialRampToValueAtTime(980, t + 0.09);
      o.frequency.exponentialRampToValueAtTime(560, t + 0.30);
      f.type = "lowpass"; f.frequency.value = 2400;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.09 * vol, t + 0.04);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.34);
      o.connect(f); f.connect(g); g.connect(ac.destination);
      o.start(t); o.stop(t + 0.36);
    } catch (e) {}
  }

  function attach(host, opts) {
    opts = opts || {};
    injectCSS();
    host.innerHTML = svg();
    var el = host.querySelector(".cat");
    var timer = null, actTimer = null, mood = null;

    function applyMood(name) {
      mood = MOODS[name] || MOODS.calm;
      el.style.setProperty("--float-amp", mood.floatAmp);
      el.style.setProperty("--float-dur", mood.floatDur + "s");
      el.style.setProperty("--tail-amp", mood.tailAmp + "deg");
      el.style.setProperty("--tail-dur", mood.tailDur + "s");
      el.style.setProperty("--bounce", mood.bounce);
      el.style.setProperty("--bounce-dur", mood.bounceDur + "ms");
      el.style.setProperty("--tilt", mood.tiltDeg + "deg");
      el.dataset.hearts = mood.hearts;
      scheduleBlink();
    }
    function scheduleBlink() {
      clearTimeout(timer);
      var gap = mood.blinkMin + Math.random() * (mood.blinkMax - mood.blinkMin);
      timer = setTimeout(function () {
        if (el.dataset.eyes !== "glad") {
          el.dataset.eyes = "shut";
          setTimeout(function () {
            if (el.dataset.eyes === "shut") el.dataset.eyes = "open";
          }, 140);
        }
        scheduleBlink();
      }, gap);
    }
    function act(name, eyes, hold) {
      clearTimeout(actTimer);
      el.dataset.act = "";
      void el.offsetWidth;                 /* 强制重排，动画才会重新播 */
      el.dataset.act = name;
      el.dataset.eyes = eyes;
      actTimer = setTimeout(function () {
        el.dataset.act = "";
        el.dataset.eyes = "open";
      }, hold);
    }

    el.dataset.eyes = "open";
    el.dataset.act = "";
    applyMood(opts.mood || "calm");

    return {
      el: el,
      setMood: applyMood,
      idle: function () { clearTimeout(actTimer); el.dataset.act = ""; el.dataset.eyes = "open"; },
      happy: function (vol) {
        act("happy", "glad", Math.max(mood.bounceDur, 1600));   /* 撑到爱心飘完 */
        meow(vol == null ? 1 : vol);
      },
      cheer: function () { act("cheer", "open", 1400); },
      destroy: function () { clearTimeout(timer); clearTimeout(actTimer); host.innerHTML = ""; }
    };
  }

  root.Cat = {
    svg: svg, attach: attach, MOODS: MOODS, colors: C,
    /* 猫叫文件位置。放到别的目录用时改这个（例如 "pet/meow.wav"） */
    soundURL: "meow.wav"
  };
})(window);
