/* ──────────────────────────────────────────────────────────────
   英文单词：这学期学校发的两张词表（手写数据，不是生成物）

   颜色照学校发的 Monster Phonics 词表【逐个字母】抄的（2026-09-29，照片见 ENGLISH.md），
   不是按规则推的——同一个音在不同词里学校可能涂得不一样，推出来的会和她在学校看到的对不上。

   每个词写成「片段|片段|…」，片段 = 字母[:颜色][记号]
     颜色  r 红（长 a）  g 绿（长 e）  y 黄（长 i）  p 粉（长 o）  b 蓝（oo）
           n 棕（ow/ou） o 金（Tricky，不按规则读的部分）  s 空心（Silent，不发音）
           不写 = 黑色（Black Cats，按规则读）
     记号  ~ 波浪下划线（th）   _ 直下划线（ck，以及例外词表里 ask put push pull full 的特殊读音）
   例：people = "p|e:g|o:s|p|le:o"  →  p 黑、e 绿、o 空心、p 黑、le 金

   ⚠️ CEW_ONLY 里的 13 个词只出现在例外词表上，那张表是按怪兽分组、字母全黑的，
      颜色是照分组 + 高频词表上同类词的涂法补的，要请家长对照学校资料确认（ENGLISH.md 有清单）。
   ────────────────────────────────────────────────────────────── */
(function (root) {
  "use strict";
  var W = {
    /* ── 高频词表（100 个，照片上的顺序）── */
    "and":"and", "on":"on", "that":"th~|at", "had":"had", "then":"th~|en",
    "big":"big", "from":"from", "got":"got", "off":"off",
    "a":"a:r",                 /* 高频词表上有黑、红两个 a，例外词表把 a 分在红怪兽组，取红的 */
    "for":"for", "with":"wi|th~", "this":"th~|is", "mum":"mum", "it's":"it's",
    "him":"him", "put":"p|u_|t", "an":"an",
    "in":"in", "at":"at", "can":"can", "went":"went", "them":"th~|em",
    "will":"will", "get":"get", "help":"help", "children":"children",
    "it":"it", "but":"but", "up":"up", "not":"not", "dad":"dad",
    "back":"ba|ck_", "just":"just", "if":"if",
    "they":"th|ey:r", "came":"c|a:r|m|e:r", "day":"d|ay:r", "made":"m|a:r|d|e:r", "make":"m|a:r|k|e:r",
    "he":"h|e:g", "she":"sh|e:g", "we":"w|e:g", "be":"b|e:g", "me":"m|e:g",
    "see":"s|ee:g", "very":"ver|y:g", "people":"p|e:g|o:s|p|le:o",
    "I":"I:y", "my":"m|y:y", "like":"l|i:y|k|e:y", "by":"b|y:y", "time":"t|i:y|m|e:y", "I'm":"I:y|'m",
    "so":"s|o:p", "go":"g|o:p", "no":"n|o:p", "don't":"d|o:p|n't", "oh":"o:p|h:s", "old":"o:p|ld",
    "to":"t|o:b", "you":"y|ou:b", "do":"d|o:b", "into":"int|o:b", "too":"t|oo:b",
    "out":"ou:n|t", "down":"d|ow:n|n", "now":"n|ow:n", "about":"ab|ou:n|t", "house":"h|ou:n|s|e:s",
    "have":"hav|e:s", "your":"yo|u:s|r", "could":"c|o:s|u|l:s|d", "when":"w|h:s|en",
    "are":"ar:o|e:s", "what":"w|h:s|a:o|t", "some":"s|o:o|m|e:s", "were":"w|er:o|e:s", "come":"c|o:o|m|e:s",
    "called":"c|al:o|l|e:s|d", "one":"o:o|n|e:s", "of":"o|f:o",
    "the":"th~|e:o", "as":"a|s:o", "was":"w|as:o", "saw":"s|aw:o", "there":"th~|ere:o",
    "all":"al:o|l", "little":"litt|le:o", "look":"l|oo:o|k",
    "is":"i|s:o", "his":"hi|s:o", "said":"s|ai:o|d", "here":"h|ere:o", "their":"th~|eir:o",
    "her":"h|er:o", "asked":"ask|ed:o", "looked":"l|oo:o|k|ed:o",
    "Mr":"M|r:o", "Mrs":"M|rs:o",
    /* ── 只在例外词表上的 13 个（颜色待家长确认）── */
    "today":"t|o:b|d|ay:r", "says":"s|ay:r|s", "school":"sc|h:s|oo:b|l", "our":"ou:n|r",
    "friend":"fr|i:s|end", "love":"l|o:o|v|e:s", "once":"o:o|nc|e:s", "where":"w|h:s|ere:o",
    "has":"ha|s:o", "ask":"a_|sk", "push":"p|u_|sh", "pull":"p|u_|ll", "full":"f|u_|ll"
  };

  /* 例外词表（国家课程 Year 1，45 个）——学校要求会拼写 */
  var CEW = ("the a do to today of said says are were was is his has I you your they " +
             "be he me she we no go so by my here there where love come some one once " +
             "ask friend school put push pull full house our").split(" ");
  /* 高频词表（100 个）——学校要求读得快 */
  var HFW = ("and on that had then big from got off a for with this mum it's him put an " +
             "in at can went them will get help children it but up not dad back just if " +
             "they came day made make he she we be me see very people I my like by time I'm " +
             "so go no don't oh old to you do into too out down now about house " +
             "have your could when are what some were come called one of " +
             "the as was saw there all little look is his said here their her asked looked Mr Mrs").split(" ");
  var CEW_ONLY = ["today","says","school","our","friend","love","once","where","has","ask","push","pull","full"];

  /* 能画出来的词：只在读完之后出现（学校拼读课的要求：不能看图猜词，ENGLISH.md 约定 1） */
  var PIC = { mum:"👩", dad:"👨", house:"🏠", school:"🏫", children:"🧒", people:"👥",
              friend:"🤝", love:"❤️", one:"1️⃣" };

  var COLOR = { r:"red", g:"green", y:"yellow", p:"pink", b:"blue", n:"brown", o:"gold", s:"silent" };

  /* "p|e:g" → [{t:"p"}, {t:"e", c:"green"}]；~ / _ 变成 u:"wavy" / u:"line" */
  function parse(word) {
    var src = W[word]; if (src == null) return null;
    return src.split("|").map(function (seg) {
      var u = null;
      if (/~$/.test(seg)) { u = "wavy"; seg = seg.slice(0, -1); }
      else if (/_$/.test(seg)) { u = "line"; seg = seg.slice(0, -1); }
      var m = /^(.*?)(?::([a-z]))?$/.exec(seg);
      return { t: m[1], c: m[2] ? COLOR[m[2]] : null, u: u };
    });
  }
  function esc(t) { return String(t).replace(/[&<>"]/g, function (m) {
    return { "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;" }[m]; }); }
  /* 上色后的 HTML：<span class="mp mp-red">ay</span> …，样式在 index.html 的 .mp-* */
  function html(word) {
    var p = parse(word); if (!p) return esc(word);
    return p.map(function (s) {
      var cls = "mp" + (s.c ? " mp-" + s.c : "") + (s.u ? " mp-u-" + s.u : "");
      return '<span class="' + cls + '">' + esc(s.t) + "</span>";
    }).join("");
  }
  /* 每个字母的颜色（写字页一个字母一个格子时用），和 word 一一对应 */
  function letterColors(word) {
    var out = [];
    (parse(word) || []).forEach(function (s) {
      for (var i = 0; i < s.t.length; i++) out.push(s.c);
    });
    return out;
  }

  var all = [];
  CEW.concat(HFW).forEach(function (w) { if (all.indexOf(w) < 0) all.push(w); });

  root.EN_WORDS = { W: W, CEW: CEW, HFW: HFW, CEW_ONLY: CEW_ONLY, ALL: all, PIC: PIC,
                    parse: parse, html: html, letterColors: letterColors };
})(window);
