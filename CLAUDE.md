# CLAUDE.md — 米字格练字本

## 这是什么

给 5 岁小朋友的汉字**书写**练习 app。认字由洪恩识字负责，本项目**只管写**。
要解决的具体问题：她在纸上写字时位置、大小、间架结构不稳。

## 使用者背景

**用户是产品经理，不写代码。** 所有代码改动由 Claude 完成，用户负责跑脚本和真机试用。
解释时先说结果和取舍，再说技术细节；不要假设用户熟悉 Python / JS 语法。

## 架构

单文件 app，无框架、无构建步骤。`app/index.html` 里按顺序是：CSS → HTML → 两个
`<script src>`（hanzi-writer 库 + 字库）→ 一个 IIFE 应用脚本。

改字表 → 编辑 `build/charset.py` → 跑 `/usr/local/bin/python3 build/make_chardata.py`。
**不要手改 `app/chardata.js` 或 `app/sd/`**，都是生成物。

**字库是全量的（9574 字）+ 按需加载**：`chardata.js` 只内联核心 392 字，外加一个
`window.AVAIL` 字符串列出全部可用字；其余分成 128 个 `app/sd/NNN.js`，每个是
`Object.assign(window.CHARS,{...})`，由 `ensureChars()` 动态注入 `<script>` 加载
（同源脚本，不受 Artifact CSP 限制）。所以**不需要为了某个字重新构建**——
任何在 AVAIL 里的字都能直接练。

发布：用 Artifact 工具发到
`https://claude.ai/code/artifact/2243a2cf-b820-49d3-949d-a2460996ecdc`（同一个 URL，
重发即更新，iPad 主屏幕上的图标不用换）。发布时 `files` 要带上 `chardata.js`、`hanzi-writer.min.js` 和全部
128 个 `sd/NNN.js`（共 131 个文件、31 MB，上限是 255 个文件 / 64 MB）。
Artifact 的源文件必须在工作目录或 scratchpad 下，本项目不在 quant_system 里，
所以发布前先把 `app/` 镜像到 scratchpad 再推。

## 踩过的坑（别再踩一遍）

1. **`drawnPath.points` 不是像素坐标。** hanzi-writer 的 `onCorrectStroke` 回调里，
   `drawnPath.points` 已经被 `convertExternalPoint()` 转成了**字形内部坐标，且 y 轴朝上**
   （范围约 -124..900），和 `medians` 同一套。转屏幕坐标要用 `y → 900 - y`，
   **不是**按 svg 尺寸做像素换算。（`pathString` 才是像素的。）

2. **SVG 线宽是 viewBox 单位，不是像素。** 米字格画在 `viewBox="0 0 1024 1024"` 里，
   缩到 ~340px 显示时，`stroke-width:1` 等于 0.33px，肉眼不可见。米字格的线宽用 4~6。

3. **结构自动分类不可靠，已废弃。** 试过用笔画外框找"干净的竖向/横向分割线"来判断
   左右/上下结构 —— "江"被判成上下、"水/火"被判成左右。错误的结构提示会误导孩子，
   所以砍掉了，只保留纯几何的占格框和逐笔偏移。**不要再加回来**，除非用人工标注的结构表。

4. **`[hidden]` 会被 `display:flex/grid` 覆盖。** Artifact 的外壳自带
   `[hidden]{display:none!important}`，本地预览没有。CSS 里自己留着这条。

5. **转屏会触发 resize → 重建格子 → 把刚写完的评分冲掉。** 用 `awaiting` 标志挡住。

## 打分口径

三项互相独立，这是设计的核心：

- **位置** = 笔迹外框中心 vs 标准字外框中心的偏移 / 1024
- **大小** = 两个外框最大边长之比
- **间架** = 先把笔迹**平移+等比缩放**到标准位置，再算每一笔重心的平均残差

先归一化再算间架，是为了把"整体写小了"从"内部结构散了"里剥离出来。
改阈值时注意 `cfg.easy`（宽松模式）是个 1.35 的乘数。

6. **打印预览就是打印内容本身，别做第二套渲染。** `#printable` 现在在 `#view-print` 里面，
   屏幕上直接显示（`.p-page` 用 210mm 实宽），`@media print` 只是把页面其余部分
   （`.top` / `.no-print` / `.selbar`）藏掉。早期是"预览只渲染第一个字"的样例 + 另一份隐藏的
   打印内容，结果预览和实际打印对不上。**改这块时注意 `#printable` 不能再有 `display:none`**
   ——踩过一次：DOM 里三页都在、JS 检查全过，屏幕上一片空白，只有截图才看得出来。

7. **`<button>` 别自己当 flex/grid 容器来居中。** 闯关/字库的字块原来用
   `display:grid;place-items:center` 直接放字，Chromium 正常但 **iPad Safari 上字会偏右**。
   现在改成内部一个 `position:absolute;inset:0` 的 `<span class="g">` 用 flex 居中，
   并给 `button` 基础样式补了 `padding:0;margin:0`（UA 默认 padding 也是嫌疑之一）。
   **本机预览是 Chromium 内核，复现不了 Safari 的渲染差异**——这类问题只能靠真机反馈。

8. **多个视图里别用同名 id。** 听写页原来也用 `id="controls"`，和练习页撞了，
   `$("#controls")` 永远返回文档里第一个（练习页的），结果听写页的按钮被画进了隐藏的练习页。
   现在用 `setIn(选择器, ...)`，各视图各用各的容器（`#controls` / `#dctl`）。

9. **方位语序是"左上/右下"，横向在前。** `dirName()` 早期写反了（"上左"）。

10. **`[hidden]` 在本地预览下失效、`http.server` 不发 charset。** 本地预览中文会乱码，
   要看真实效果用线上 Artifact，或给预览副本临时加一行 `<meta charset="utf-8">`。

## 听写模式

「练习表 → 开始听写」。自由书写**不走 hanzi-writer**（它会强制笔顺并替换笔迹），
是自己在 `#dcatch` 上收 pointer 事件、画进 `#dink`。判对错**由家长点**——
自动识别手写汉字这件事离线做不了，别去猜。自动提示只用**笔画数 + 外框**
（`dHints()`），这两项不需要笔画一一对应，所以自由书写也算得准；
「间架」那套逐笔残差算法在这里**用不了**（笔数笔序都可能不同）。

组词数据：`app/words.js`。核心 392 字是**手写**的（`build/words_core.py`）——
jieba 是新闻语料，按词频挑出来是"手段的手""大妈的妈"，念给 5 岁孩子只会更糊涂。
其余字用 jieba 兜底。

## 闯关分组

两套，`groups()` 按 `cfg.lessonMode`（"text" / "stroke"）返回：

- `TEXTBOOK`（`build/textbook.py` → `window.TEXTBOOK`）——**人教版 2016 统编版一上识字表**，
  41 课 300 字，逐字转写自课本扫描页。同文件里还有写字表 100 字（`XIEZI`），
  构建时算出每课的 `write` 子集。换册就往这里加。
- `LESSONS`（`build/charset.py`）—— 按写字难度递进的 9 关。

**三个页签各司其职**：学习（浏览+点字进练习，不做听写）／字库（主题浏览）／
练习（跨单元勾字 → 听写）。曾经有过的「今天练的字／洪恩进度／自定义课本单元」
三个输入框已按用户要求全部移除——听写范围改由练习页勾选决定。

**转写的三重校验**（改数据时请重做）：识字表字次 304 − 蓝色多音字 4（地数长着）= 300，
与表末标注一致；跨课重复的恰好只有这 4 个；写字表 100 字 100% 落在识字表 300 字内。

⚠️ **写字表的课次和识字表的课次不是一回事。** 同一个字往往在 A 课学认、B 课学写。
所以每课的 `write` 只能表述成"这一课的字里，**本册**要求会写的有哪几个"——
写成"这一课要求会写"是错的，早期版本犯过这个错。

**别去网上抓字表。** 可靠来源是图片/PDF 或被验证墙挡住，二手资料混淆识字表和写字表，
而且多版本并存（2016 统编 vs 2024 新版，目录都不同）。要么读课本扫描图逐字转写并做上面的
三重校验，要么让用户自己输。

## 部署

`build/deploy.sh` → Cloudflare Pages（`npx wrangler pages deploy app`）。这是**给小朋友日常用的
正式通道**，脱离 Mac。`build/serve.py` 只是改代码时在真机看一眼用的临时服务器。

`index.html` 顶部自带 `charset` / `viewport` / `manifest` / `apple-touch-icon` ——
Artifact 外壳会自动补 charset 和 viewport，**自己托管时没有**，缺 viewport 在 iPad 上会按
980px 排版。别删。

## 语音

所有朗读都走 `utter(文本, 基准语速)` —— 它统一套用 `cfg.voiceURI`（设置里选的声音）和
`cfg.rate`（语速倍数）。**不要再直接 new SpeechSynthesisUtterance**。

- 声音列表来自 `speechSynthesis.getVoices()` 筛 `zh*`，首次可能为空，靠 `onvoiceschanged` 补。
  浏览器只能用系统装了的声音，**加不了自定义音色**（除非上云端 TTS，要钱要联网）。
  **每台设备的列表都不一样**——苹果中文只预装婷婷，其余要用户在
  iPad 设置 → 辅助功能 → 朗读内容 → 声音 里下载；Mac 上装得多不代表 iPad 上有。
  设置里有「刷新」按钮，因为 iOS 下载完语音后网页不会自动更新列表（有时还得重开页面）。
- `pitch` 保持 1（曾经设 1.06，偏"播音腔"）。**语速别调太慢**，太慢反而更像机器：
  单字 .66、词组 .82，档位 0.85 / 1 / 1.15。
- 档位取值变过一次，老的存档值会匹配不上 `<select>`，打开设置时要兜底回「正常」。

听写组词在 `build/words_core.py`：`CORE_WORDS`（第一个词）+ `CORE_WORDS2`（第二个词），
生成 `words.js` 里的 `{字: [词1, 词2]}`。识字表 300 字里 286 个有两个词。
⚠️ **多音字要按识字表标的读音配词**——踩过：发(fā 不是 fà)、乐(yuè)、觉(jué)、只(zhī)。

## 数据与备份

没有账号、没有后端。全部状态在 localStorage：`mzg.stars` / `mzg.custom` / `mzg.known` /
`mzg.cfg` / `mzg.bakAt`。**localStorage 是按 origin 隔离的**——局域网测试地址和正式部署地址
互不相通，所以「设置 → 备份/恢复」既是防丢，也是换网址时的迁移通道。
备份格式是 `{v,t,stars,custom,known,cfg}` 的 JSON 字符串；改结构时记得兼容旧备份
（恢复逻辑对每个字段单独做类型检查，缺字段就跳过）。

## 语气约定

面向 5 岁孩子的文案和语音：**一次只说一条建议**（挑最弱的那一项）；
**已经三星时不纠错**，建议改成"再注意一点会更棒：…"的锦上添花语气。
不要用"左右结构""独体字"这类术语，用米字格方位词（左上格、横中线的左边、中心点）。
**纠错要说"该往哪挪"，不是只说"偏了"**：用「高一点 / 低一点 / 往左一点 / 往右一点」，
再补一句这一笔该从米字格的哪个位置起笔。见 `fixDir()`。
