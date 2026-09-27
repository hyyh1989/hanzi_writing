/* ──────────────────────────────────────────────────────────────
   「今天」页 —— 练习本的首页

   独立模块，不碰主脚本的内部变量（和 cat.js / game.js 同一个模式）：
       Today.render(host, api)
   api 由主页面提供：
       plan()          → 周计划：7 个数组，下标 0 = 周日，每项是任务 id
       days()          → 打卡记录 {"2026-09-27": {v:1, done:{任务id:1}}}
       saveDays(obj)
       ready(subj)     → 这个科目做好了没有（没做好的任务显示成「线下」）
       go(subj)        → 切到某个科目
       games(el)       → 把小游戏入口画进 el
       cat(el)         → 在 el 里放一只小猫，返回它的控制器
       beep(kind)

   设计约定（和用户定过，别自作主张改，理由见 CLAUDE.md「今天页」一节）：
   · 任务不是门票：小游戏、小猫都不需要先做完任务
   · 没做完不惩罚：日历上没来的日子只是空着，不打叉、不变红；不做「连续 N 天」
   · 周日只显示「今天休息」，不引导去各科目
   · 小猫只陪伴，不成长（用户观察孩子对成长没兴趣，2026-09-27 拿掉了）
   ────────────────────────────────────────────────────────────── */
(function (root) {
  "use strict";

  /* 任务种类。label 是给家长看的，孩子主要看颜色和字 */
  var TASKS = {
    "zh-write":    { subj: "zh",    tag: "中文", label: "写字" },
    "zh-dict":     { subj: "zh",    tag: "中文", label: "听写" },
    "math-digits": { subj: "math",  tag: "数学", label: "写数字" },
    "en-letters":  { subj: "en",    tag: "英文", label: "写字母" },
    "music-write": { subj: "music", tag: "音乐", label: "写谱号和音符",
                     offline: "钢琴上练 10 分钟" },
    "music-read":  { subj: "music", tag: "音乐", label: "认音符",
                     offline: "钢琴上认音符" }
  };

  /* 默认周计划（2026-09-27 和用户定的）：钢琴课周日上，
     课后第一天（周一）复习、课前一天（周六）热身；周日休息 */
  var DEFAULT_PLAN = [
    [],                              /* 周日：休息 */
    ["music-write", "zh-write"],     /* 周一 */
    ["zh-write", "en-letters"],      /* 周二 */
    ["music-read", "zh-write"],      /* 周三 */
    ["zh-write", "math-digits"],     /* 周四 */
    ["music-write", "en-letters"],   /* 周五 */
    ["zh-dict", "music-read"]        /* 周六 */
  ];
  var WEEK = ["日", "一", "二", "三", "四", "五", "六"];

  /* 本地日期（不能用 toISOString：那是 UTC，北京时间早上 8 点前会算成前一天） */
  function dateKey(d) {
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" +
           String(d.getDate()).padStart(2, "0");
  }

  var CSS = '' +
  '.td-head{display:flex;align-items:center;gap:14px;margin:6px 0 16px}' +
  '.td-cat{width:64px;height:64px;flex:none}' +
  '.td-hd{flex:1;min-width:0}' +
  '.td-hd h2{font-size:21px;margin:0}' +
  '.td-hd p{margin:2px 0 0;font-size:13px;color:var(--ink-3)}' +
  '.td-week{display:flex;gap:5px;flex-wrap:wrap}' +
  '.td-week span{width:26px;height:26px;border-radius:50%;display:flex;align-items:center;justify-content:center;' +
    'font-size:12px;font-weight:700;color:var(--ink-3);border:1px solid var(--line)}' +
  '.td-week span.on{background:var(--teal);border-color:var(--teal);color:#fff}' +
  '.td-week span.now{border:2px solid var(--teal)}' +
  '.td-week span.now:not(.on){color:var(--teal-2)}' +
  '.td-week span.rest{border-style:dashed}' +
  '.td-list{display:grid;gap:10px;margin-bottom:22px}' +
  '.td-task{display:flex;align-items:center;gap:12px;background:var(--card);border:1px solid var(--line);' +
    'border-radius:var(--r);padding:14px 15px;box-shadow:var(--shadow)}' +
  '.td-task.off{border-style:dashed;box-shadow:none}' +
  '.td-task.done{opacity:.62}' +
  '.td-tag{flex:none;font-size:13px;font-weight:800;border-radius:8px;padding:3px 10px}' +
  '.td-tag.zh{background:var(--zhu-bg);color:var(--zhu)}' +
  '.td-tag.math{background:var(--amber-soft);color:var(--amber)}' +
  '.td-tag.en{background:#E3ECFA;color:#2F5FA8}' +
  '.td-tag.music{background:var(--teal-soft);color:var(--teal-2)}' +
  '.td-body{flex:1;min-width:0}' +
  '.td-body b{display:block;font-size:16px}' +
  '.td-body small{display:block;font-size:12.5px;color:var(--ink-3);margin-top:1px}' +
  '.td-check{flex:none;width:34px;height:34px;border-radius:10px;border:2px solid var(--line);' +
    'font-size:18px;line-height:30px;text-align:center;color:transparent}' +
  '.td-check[aria-pressed="true"]{background:var(--teal);border-color:var(--teal);color:#fff}' +
  '.td-rest{background:var(--card);border:1px solid var(--line);border-radius:var(--r);padding:26px 18px;' +
    'text-align:center;margin-bottom:22px;box-shadow:var(--shadow)}' +
  '.td-rest b{display:block;font-size:20px;font-family:var(--disp)}' +
  '.td-games h3{font-size:14px;color:var(--ink-2);margin:0 0 9px}';

  function injectCSS() {
    if (document.getElementById("today-css")) return;
    var s = document.createElement("style");
    s.id = "today-css"; s.textContent = CSS;
    document.head.appendChild(s);
  }

  var catCtl = null;

  function render(host, api) {
    injectCSS();
    var now = new Date(), wd = now.getDay(), key = dateKey(now);
    var plan = (api.plan && api.plan()) || DEFAULT_PLAN;
    var ids = (plan[wd] || []).filter(function (id) { return TASKS[id]; });
    var days = (api.days && api.days()) || {};
    var todayRec = days[key] || {};
    var done = todayRec.done || {};

    /* 本周（周一到周日）哪几天来过 */
    var monday = new Date(now); monday.setDate(now.getDate() - ((wd + 6) % 7));
    var weekHTML = [1, 2, 3, 4, 5, 6, 0].map(function (w, i) {
      var d = new Date(monday); d.setDate(monday.getDate() + i);
      var k = dateKey(d), rec = days[k];
      var cls = (rec && rec.v ? "on" : "") + (k === key ? " now" : "") + (w === 0 ? " rest" : "");
      return '<span class="' + cls.trim() + '">' + WEEK[w] + '</span>';
    }).join("");

    var sub = ids.length ? (ids.length === 1 ? "一件事" : "两件事") + "，大约 15 分钟" : "";
    var html =
      '<div class="td-head"><div class="td-cat" id="td-cat"></div>' +
        '<div class="td-hd"><h2>今天 · 周' + WEEK[wd] + '</h2>' + (sub ? '<p>' + sub + '</p>' : '') + '</div>' +
        '<div class="td-week" aria-label="本周来过的日子">' + weekHTML + '</div></div>';

    if (!ids.length) {
      html += '<div class="td-rest"><b>今天休息</b></div>';
    } else {
      html += '<div class="td-list">' + ids.map(function (id) {
        var t = TASKS[id], ready = api.ready ? api.ready(t.subj) : true;
        if (!ready && t.offline) {
          /* 这个科目还没做好：先当线下任务，家长勾 */
          var on = !!done[id];
          return '<div class="td-task off' + (on ? ' done' : '') + '">' +
            '<span class="td-tag ' + t.subj + '">' + t.tag + '</span>' +
            '<span class="td-body"><b>' + t.offline + '</b><small>不在 iPad 上做，做完点右边打勾</small></span>' +
            '<button class="td-check" data-td-check="' + id + '" aria-pressed="' + on + '" aria-label="做完了">✓</button></div>';
        }
        return '<div class="td-task">' +
          '<span class="td-tag ' + t.subj + '">' + t.tag + '</span>' +
          '<span class="td-body"><b>' + t.label + '</b></span>' +
          '<button class="btn" data-td-go="' + t.subj + '">去练 →</button></div>';
      }).join("") + '</div>';
    }
    html += '<div class="td-games"><h3>小游戏</h3><div id="td-games"></div></div>';

    if (catCtl && catCtl.destroy) catCtl.destroy();
    host.innerHTML = html;
    catCtl = api.cat ? api.cat(host.querySelector("#td-cat")) : null;
    if (api.games) api.games(host.querySelector("#td-games"));

    host.onclick = function (e) {
      var g = e.target.closest("[data-td-go]");
      if (g) { api.go(g.getAttribute("data-td-go")); return; }
      var c = e.target.closest("[data-td-check]");
      if (c) {
        var id = c.getAttribute("data-td-check");
        var all = (api.days && api.days()) || {};
        var rec = all[key] || {};
        rec.done = rec.done || {};
        if (rec.done[id]) delete rec.done[id]; else { rec.done[id] = 1; rec.v = 1; }
        all[key] = rec;
        if (api.saveDays) api.saveDays(all);
        if (api.beep) api.beep(rec.done[id] ? "good" : "tap");
        render(host, api);
      }
    };
  }

  function destroy() { if (catCtl && catCtl.destroy) catCtl.destroy(); catCtl = null; }

  root.Today = { render: render, destroy: destroy, TASKS: TASKS, DEFAULT_PLAN: DEFAULT_PLAN, dateKey: dateKey };
})(window);
