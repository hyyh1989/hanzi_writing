/* ──────────────────────────────────────────────────────────────
   「今天」页（首页）和「每周计划」编辑页

   独立模块，不碰主脚本的内部变量（和 cat.js / game.js 同一个模式）：
       Today.render(host, api)       首页
       Today.renderPlan(host, api)   每周计划（从设置里进）
   api 由主页面提供：
       plan() / savePlan(p)  → 周计划 {days:[7 个数组，下标 0 = 周日], custom:{id:文字}}
       days() / saveDays(o)  → 每天的记录 {"2026-09-29": {v, done, pick, skip, cheered}}
       ready(subj, id)       → 这个任务能不能在 iPad 上做（不能的显示成「线下」，比如音乐的写谱号还没做）
       info(taskId)          → 能在 iPad 上做的任务：{items, label, done, total, doneSet, single}，
                               single = 一次做完的任务（听写），不显示「几 / 几」
                               内容当天第一次生成后就固定（主页面负责）
       start(taskId)         → 直接开始这个任务（进练字页 / 听写页）
       reroll(taskId)        → 换一批
       go(subj)              → 去某个科目页
       enabled(subj)         → 这个科目上线了没有。没上线的（现在是音乐）首页和计划编辑页都不出现，
                               就算存下来的周计划里有它也隐藏（2026-09-29 用户：音乐做好再一起上）
       games(el) / subjects() / cat(el) / beep(kind)

   设计约定（和用户定过，别自作主张改，理由见 CLAUDE.md「今天页」一节）：
   · 任务不是门票：小游戏、小猫都不需要先做完任务
   · 没做完不惩罚：日历上没来的日子只是空着，不打叉、不变红；不做「连续 N 天」
   · 周日（或当天没排任务）只显示「今天休息」，不引导去各科目
   · 小猫只陪伴，不成长；全部做完时开心一次
   · 周计划只有家长设，但暂不做权限（孩子认字少）
   ────────────────────────────────────────────────────────────── */
(function (root) {
  "use strict";

  /* 任务种类（顺序 = 同一天里的显示顺序）。offline = 这一科还没做好时的线下说法 */
  var TASKS = {
    "zh-write":    { subj: "zh",    tag: "中文", label: "写字" },
    "zh-dict":     { subj: "zh",    tag: "中文", label: "听写" },
    "math-digits": { subj: "math",  tag: "数学", label: "写数字" },
    "en-letters":  { subj: "en",    tag: "英文", label: "写字母" },
    "en-words":    { subj: "en",    tag: "英文", label: "拼单词" },
    "music-write": { subj: "music", tag: "音乐", label: "写谱号和音符", offline: "钢琴上练 10 分钟" },
    "music-read":  { subj: "music", tag: "音乐", label: "认音符",       offline: "钢琴上认音符" }
  };
  var ORDER = ["zh-write", "zh-dict", "math-digits", "en-words", "en-letters", "music-write", "music-read"];

  /* 默认周计划（2026-09-29 用户定：音乐做好再上，先去掉音乐）。周日休息。
     英文单词上线后周一、周五换成拼单词（拼单词本身就在练字母），周三保留写字母 */
  var DEFAULT_PLAN = [
    [],                              /* 周日：休息 */
    ["zh-write", "en-words"],        /* 周一 */
    ["zh-write", "math-digits"],     /* 周二 */
    ["zh-write", "en-letters"],      /* 周三 */
    ["zh-write", "math-digits"],     /* 周四 */
    ["zh-write", "en-words"],        /* 周五 */
    ["zh-dict"],                     /* 周六 */
  ];
  /* 音乐上线时换回这一版（2026-09-27 定的）：钢琴课周日上，课后第一天（周一）复习、
     课前一天（周六）热身。音乐任务「认音符」是练习形式；「音符拼单词」做成游戏放小游戏区，不当任务
       周一 music-write + zh-write · 周二 zh-write + en-words · 周三 music-read + zh-write
       周四 zh-write + math-digits · 周五 music-write + en-words · 周六 zh-dict + music-read */
  var WEEK = ["日", "一", "二", "三", "四", "五", "六"];
  var MON_FIRST = [1, 2, 3, 4, 5, 6, 0];

  /* 存储格式：早期是 7 个数组，现在是 {days, custom}。两种都认 */
  function normPlan(p) {
    if (Array.isArray(p) && p.length === 7) return { days: p, custom: {} };
    if (p && Array.isArray(p.days) && p.days.length === 7) return { days: p.days, custom: p.custom || {} };
    return { days: DEFAULT_PLAN.map(function (d) { return d.slice(); }), custom: {} };
  }
  /* 某个任务的说明：内置的查 TASKS，自定义线下任务（c-开头）查 custom */
  function kind(id, plan) {
    if (TASKS[id]) return TASKS[id];
    if (plan.custom[id]) return { subj: "off", tag: "线下", label: plan.custom[id], offline: plan.custom[id], custom: true };
    return null;
  }
  /* 本地日期（不能用 toISOString：那是 UTC，北京时间早上 8 点前会算成前一天） */
  function dateKey(d) {
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" +
           String(d.getDate()).padStart(2, "0");
  }
  function esc(t) {
    return String(t).replace(/[&<>"]/g, function (m) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;" }[m];
    });
  }

  var CSS = '' +
  /* 窄屏时本周打卡自动换到下一行（给标题留够最小宽度），否则会把「今天 · 周二」挤成一字一行 */
  '.td-head{display:flex;align-items:center;gap:10px 14px;margin:6px 0 16px;flex-wrap:wrap}' +
  '.td-cat{width:64px;height:64px;flex:none}' +
  '.td-hd{flex:1;min-width:150px}' +
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
  '.td-task{background:var(--card);border:1px solid var(--line);border-radius:var(--r);padding:14px 15px;box-shadow:var(--shadow)}' +
  '.td-row{display:flex;align-items:center;gap:12px}' +
  '.td-task.off{border-style:dashed;box-shadow:none}' +
  '.td-task.done{border-color:var(--teal);background:var(--teal-soft);box-shadow:none}' +
  '.td-task.skip{opacity:.55;box-shadow:none}' +
  '.td-tag{flex:none;font-size:13px;font-weight:800;border-radius:8px;padding:3px 10px}' +
  '.td-tag.zh{background:var(--zhu-bg);color:var(--zhu)}' +
  '.td-tag.math{background:var(--amber-soft);color:var(--amber)}' +
  '.td-tag.en{background:#E3ECFA;color:#2F5FA8}' +
  '.td-tag.music,.td-tag.off{background:var(--teal-soft);color:var(--teal-2)}' +
  '.td-body{flex:1;min-width:0}' +
  '.td-body b{display:block;font-size:16px}' +
  '.td-body small{display:block;font-size:12.5px;color:var(--ink-3);margin-top:1px}' +
  '.td-items{font-family:"Andika",var(--han),sans-serif;font-size:19px;font-weight:700;letter-spacing:.12em;color:var(--ink)}' +
  '.td-items s{text-decoration:none;color:var(--teal-2);opacity:.55}' +
  '.td-prog{flex:none;font-size:13.5px;font-weight:800;color:var(--ink-3);font-variant-numeric:tabular-nums}' +
  '.td-ok{flex:none;width:34px;height:34px;border-radius:50%;background:var(--teal);color:#fff;font-size:18px;' +
    'line-height:34px;text-align:center}' +
  '.td-check{flex:none;width:34px;height:34px;border-radius:10px;border:2px solid var(--line);' +
    'font-size:18px;line-height:30px;text-align:center;color:transparent}' +
  '.td-check[aria-pressed="true"]{background:var(--teal);border-color:var(--teal);color:#fff}' +
  '.td-more{display:flex;gap:14px;margin:8px 0 0 2px}' +
  '.td-more button{font-size:12.5px;color:var(--ink-3);text-decoration:underline;text-underline-offset:3px}' +
  '.td-rest{background:var(--card);border:1px solid var(--line);border-radius:var(--r);padding:26px 18px;' +
    'text-align:center;margin-bottom:22px;box-shadow:var(--shadow)}' +
  '.td-rest b{display:block;font-size:20px;font-family:var(--disp)}' +
  '.td-sec{font-size:14px;color:var(--ink-2);margin:0 0 9px}' +
  '.td-games{margin-bottom:24px}' +
  '.td-subjs{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px}' +
  /* 按钮里不用 flex（iPad Safari 上 <button> 当 flex 容器内容会偏），里面用块级 span */
  '.td-subj{display:block;width:100%;text-align:left;background:var(--card);border:1px solid var(--line);' +
    'border-radius:var(--r);padding:14px 15px;box-shadow:var(--shadow)}' +
  '.td-subj b{display:block;font-size:17px;font-family:var(--disp)}' +
  '.td-subj small{display:block;font-size:12.5px;color:var(--ink-3);margin-top:3px;line-height:1.45}' +
  '.td-subj i{display:block;width:26px;height:4px;border-radius:2px;margin-bottom:9px}' +
  '.td-subj.zh i{background:var(--zhu)}.td-subj.math i{background:var(--amber)}' +
  '.td-subj.en i{background:#2F5FA8}.td-subj.music i{background:var(--teal)}' +
  /* 每周计划 */
  '.pl-note{font-size:13px;color:var(--ink-3);margin:14px 0 14px;line-height:1.6}' +
  '.pl-day{background:var(--card);border:1px solid var(--line);border-radius:var(--r);padding:12px 14px;margin-bottom:10px}' +
  '.pl-day h3{font-size:15px;margin:0 0 8px}' +
  '.pl-day h3 small{font-weight:400;font-size:12.5px;color:var(--ink-3);margin-left:8px}' +
  '.pl-chips{display:flex;flex-wrap:wrap;gap:7px}' +
  '.pl-chip{font-size:13.5px;font-weight:700;border-radius:99px;padding:7px 12px;background:var(--sunk);' +
    'color:var(--ink-3);border:1.5px solid transparent}' +
  '.pl-chip[aria-pressed="true"]{background:var(--card);color:var(--ink);border-color:var(--teal)}' +
  '.pl-chip[aria-pressed="true"]::before{content:"✓ ";color:var(--teal)}' +
  '.pl-add{display:flex;gap:8px;margin:16px 0 6px}' +
  '.pl-add input{flex:1;min-width:0;font:inherit;font-size:15px;padding:10px 12px;border-radius:10px;' +
    'border:1px solid var(--line);background:var(--card);color:var(--ink)}' +
  '.pl-custom{display:flex;flex-wrap:wrap;gap:7px;margin:6px 0 18px}' +
  '.pl-custom span{font-size:13px;background:var(--sunk);border-radius:99px;padding:5px 6px 5px 12px;color:var(--ink-2)}' +
  '.pl-custom button{margin-left:4px;width:22px;height:22px;border-radius:50%;color:var(--ink-3)}';

  function injectCSS() {
    if (document.getElementById("today-css")) return;
    var s = document.createElement("style");
    s.id = "today-css"; s.textContent = CSS;
    document.head.appendChild(s);
  }

  var catCtl = null;

  /* ── 首页 ─────────────────────────────────────────────── */
  function render(host, api) {
    injectCSS();
    var now = new Date(), wd = now.getDay(), key = dateKey(now);
    var plan = normPlan(api.plan && api.plan());
    var on = function (id) { var t = kind(id, plan); return t && (t.custom || !api.enabled || api.enabled(t.subj)); };
    var ids = ORDER.concat(Object.keys(plan.custom)).filter(function (id) {
      return (plan.days[wd] || []).indexOf(id) >= 0 && on(id);
    });
    var days = (api.days && api.days()) || {};
    var rec = days[key] || {};
    var done = rec.done || {}, skip = rec.skip || {};

    /* 本周（周一到周日）哪几天来过 */
    var monday = new Date(now); monday.setDate(now.getDate() - ((wd + 6) % 7));
    var weekHTML = MON_FIRST.map(function (w, i) {
      var d = new Date(monday); d.setDate(monday.getDate() + i);
      var k = dateKey(d), r = days[k];
      var cls = (r && r.v ? "on" : "") + (k === key ? " now" : "") + (w === 0 ? " rest" : "");
      return '<span class="' + cls.trim() + '">' + WEEK[w] + '</span>';
    }).join("");

    /* 每个任务现在的状态 */
    var cards = ids.map(function (id) {
      var t = kind(id, plan);
      var offline = t.custom || !(api.ready ? api.ready(t.subj, id) : true);
      if (offline) return { id: id, t: t, offline: true, finished: !!done[id], skipped: !!skip[id] };
      var info = api.info ? api.info(id) : null;
      if (!info || !info.items.length) return { id: id, t: t, empty: true, skipped: !!skip[id] };
      return { id: id, t: t, info: info, finished: info.done >= info.total || !!done[id], skipped: !!skip[id] };
    });
    var need = cards.filter(function (c) { return !c.skipped && !c.empty; });
    var allDone = need.length > 0 && need.every(function (c) { return c.finished; });

    var sub = !ids.length ? "" : allDone ? "今天的都做完了" : !need.length ? "今天的都跳过了" :
              (need.length === 1 ? "一件事" : need.length === 2 ? "两件事" : need.length + " 件事") + "，大约 15 分钟";
    var html =
      '<div class="td-head"><div class="td-cat" id="td-cat"></div>' +
        '<div class="td-hd"><h2>今天 · 周' + WEEK[wd] + '</h2>' + (sub ? '<p>' + sub + '</p>' : '') + '</div>' +
        '<div class="td-week" aria-label="本周来过的日子">' + weekHTML + '</div></div>';

    if (!ids.length) {
      html += '<div class="td-rest"><b>今天休息</b></div>';
    } else {
      html += '<div class="td-list">' + cards.map(cardHTML).join("") + '</div>';
    }
    html += '<div class="td-games"><h3 class="td-sec">小游戏</h3><div id="td-games"></div></div>';
    var subs = (api.subjects && api.subjects()) || [];
    if (subs.length) {
      html += '<h3 class="td-sec">科目</h3><div class="td-subjs">' + subs.map(function (x) {
        return '<button class="td-subj ' + x.id + '" data-td-go="' + x.id + '"><i></i><b>' + x.name + '</b>' +
               '<small>' + x.items + '</small></button>';
      }).join("") + '</div>';
    }

    if (catCtl && catCtl.destroy) catCtl.destroy();
    host.innerHTML = html;
    catCtl = api.cat ? api.cat(host.querySelector("#td-cat")) : null;
    if (api.games) api.games(host.querySelector("#td-games"));

    /* 今天的全部做完：小猫开心一次（一天只一次，回首页不会反复叫） */
    if (allDone && !rec.cheered && catCtl && catCtl.happy) {
      setTimeout(function () { if (catCtl) catCtl.happy(1); }, 350);
      var all = (api.days && api.days()) || {};
      var r2 = all[key] || {}; r2.cheered = 1; all[key] = r2;
      if (api.saveDays) api.saveDays(all);
    }

    host.onclick = function (e) {
      var b;
      if ((b = e.target.closest("[data-td-go]"))) { api.go(b.getAttribute("data-td-go")); return; }
      if ((b = e.target.closest("[data-td-start]"))) { api.start(b.getAttribute("data-td-start")); return; }
      if ((b = e.target.closest("[data-td-reroll]"))) {
        api.reroll(b.getAttribute("data-td-reroll")); if (api.beep) api.beep("tap"); render(host, api); return;
      }
      if ((b = e.target.closest("[data-td-skip]"))) { toggle("skip", b.getAttribute("data-td-skip")); return; }
      if ((b = e.target.closest("[data-td-check]"))) { toggle("done", b.getAttribute("data-td-check")); return; }
    };
    function toggle(field, id) {
      var all = (api.days && api.days()) || {};
      var r = all[key] || {};
      r[field] = r[field] || {};
      if (r[field][id]) delete r[field][id]; else r[field][id] = 1;
      if (field === "done" && r.done[id]) r.v = 1;          /* 线下任务做完也算来过 */
      all[key] = r;
      if (api.saveDays) api.saveDays(all);
      if (api.beep) api.beep(field === "done" && r.done[id] ? "good" : "tap");
      render(host, api);
    }
  }

  function cardHTML(c) {
    var tag = '<span class="td-tag ' + c.t.subj + '">' + esc(c.t.tag) + '</span>';
    if (c.skipped) {
      return '<div class="td-task skip"><div class="td-row">' + tag +
        '<span class="td-body"><b>' + esc(c.t.label) + '</b><small>今天跳过了</small></span></div>' +
        '<div class="td-more"><button data-td-skip="' + c.id + '">不跳过了</button></div></div>';
    }
    if (c.offline) {
      return '<div class="td-task off' + (c.finished ? ' done' : '') + '"><div class="td-row">' + tag +
        '<span class="td-body"><b>' + esc(c.t.offline) + '</b><small>不在 iPad 上做，做完点右边打勾</small></span>' +
        '<button class="td-check" data-td-check="' + c.id + '" aria-pressed="' + c.finished + '" aria-label="做完了">✓</button>' +
        '</div></div>';
    }
    if (c.empty) {
      return '<div class="td-task skip"><div class="td-row">' + tag +
        '<span class="td-body"><b>' + esc(c.t.label) + '</b><small>还没有能练的内容</small></span></div></div>';
    }
    var info = c.info;
    /* 已经写完的字淡一点，一眼看出还剩哪些 */
    var items = info.items.map(function (x) {
      return info.doneSet && info.doneSet[x] ? '<s>' + esc(x) + '</s>' : esc(x);
    }).join(info.items.some(function (x) { return x.length > 1; }) ? " · " : " ");   /* 单词之间要分得开 */
    var right = c.finished
      ? '<span class="td-ok" aria-label="做完了">✓</span>'
      : (info.single ? '' : '<span class="td-prog">' + info.done + ' / ' + info.total + '</span>') +
        '<button class="btn" data-td-start="' + c.id + '">' + (info.single ? '开始' : info.done ? '继续' : '开始') + '</button>';
    return '<div class="td-task' + (c.finished ? ' done' : '') + '"><div class="td-row">' + tag +
      '<span class="td-body"><b>' + esc(info.label || c.t.label) + '</b>' +
      '<span class="td-items">' + items + '</span></span>' + right + '</div>' +
      (c.finished ? '' :
        '<div class="td-more">' + (info.fixed ? '' : '<button data-td-reroll="' + c.id + '">换一批</button>') +
        '<button data-td-skip="' + c.id + '">今天跳过</button></div>') +
      '</div>';
  }

  /* ── 每周计划 ─────────────────────────────────────────── */
  function renderPlan(host, api) {
    injectCSS();
    var plan = normPlan(api.plan && api.plan());
    var ids = ORDER.concat(Object.keys(plan.custom)).filter(function (id) {
      var t = kind(id, plan); return t && (t.custom || !api.enabled || api.enabled(t.subj));
    });
    var html = '<p class="pl-note">点一下选上，再点一下取消。每天一两件、15 分钟左右比较合适，周日默认休息。<br>' +
      '钢琴练习、一起读绘本这类不在 iPad 上做的事，可以在最下面加成「线下任务」。</p>';
    html += MON_FIRST.map(function (wd) {
      var on = (plan.days[wd] || []).filter(function (x) { return ids.indexOf(x) >= 0; });
      return '<div class="pl-day"><h3>周' + WEEK[wd] + (on.length ? '' : '<small>休息</small>') + '</h3>' +
        '<div class="pl-chips">' + ids.map(function (id) {
          var t = kind(id, plan);
          var label = t.custom ? t.label : (t.tag + ' · ' + t.label);
          return '<button class="pl-chip" data-pl-day="' + wd + '" data-pl-id="' + id + '" aria-pressed="' +
                 (on.indexOf(id) >= 0) + '">' + esc(label) + '</button>';
        }).join("") + '</div></div>';
    }).join("");
    html += '<h3 class="td-sec" style="margin-top:18px">线下任务</h3>' +
      '<p class="pl-note" style="margin-top:0">不在 iPad 上做的事，比如和她一起读绘本、钢琴练习。加上之后可以排进任何一天。</p>' +
      '<div class="pl-add"><input id="pl-new" maxlength="20" placeholder="和妈妈读一本绘本">' +
      '<button class="btn" id="pl-add">添加</button></div>' +
      '<div class="pl-custom">' + Object.keys(plan.custom).map(function (id) {
        return '<span>' + esc(plan.custom[id]) + '<button data-pl-del="' + id + '" aria-label="删掉">×</button></span>';
      }).join("") + '</div>' +
      '<button class="btn quiet" id="pl-reset">恢复默认计划</button>';
    host.innerHTML = html;

    function save(p) { if (api.savePlan) api.savePlan(p); renderPlan(host, api); }
    host.onclick = function (e) {
      var b;
      if ((b = e.target.closest("[data-pl-id]"))) {
        var wd = +b.getAttribute("data-pl-day"), id = b.getAttribute("data-pl-id");
        var arr = plan.days[wd] = (plan.days[wd] || []).slice();
        var i = arr.indexOf(id);
        if (i >= 0) arr.splice(i, 1); else arr.push(id);
        if (api.beep) api.beep("tap");
        save(plan); return;
      }
      if ((b = e.target.closest("[data-pl-del]"))) {
        var did = b.getAttribute("data-pl-del");
        delete plan.custom[did];
        plan.days = plan.days.map(function (d) { return d.filter(function (x) { return x !== did; }); });
        save(plan); return;
      }
      if (e.target.closest("#pl-add")) {
        var inp = host.querySelector("#pl-new"), txt = (inp.value || "").trim();
        if (!txt) { inp.focus(); return; }
        plan.custom["c" + Date.now().toString(36)] = txt;
        if (api.beep) api.beep("good");
        save(plan); return;
      }
      if (e.target.closest("#pl-reset")) {
        save({ days: DEFAULT_PLAN.map(function (d) { return d.slice(); }), custom: plan.custom }); return;
      }
    };
  }

  function destroy() { if (catCtl && catCtl.destroy) catCtl.destroy(); catCtl = null; }

  root.Today = { render: render, renderPlan: renderPlan, destroy: destroy,
                 TASKS: TASKS, DEFAULT_PLAN: DEFAULT_PLAN, dateKey: dateKey, normPlan: normPlan };
})(window);
