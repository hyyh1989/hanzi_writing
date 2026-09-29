# 英语词表与设计约定

2026-09-27 整理。孩子在读 **英式课程 Year 1**，学校用 **Monster Phonics**。
这份文档记录：词表从哪来、怎么核对过的、做英语练习时必须遵守的教学约定。

---

## 学校用的是什么

| | 结论 | 怎么确认的 |
|---|---|---|
| 拼读教材 | **Monster Phonics** | 两张词表右下角都印着 ©Monster Phonics；它是英国教育部（DfE）认证的系统自然拼读课程 |
| 课程体系 | **英格兰国家课程**（English National Curriculum） | 下面第一张表和官方文件 *English Appendix 1: Spelling* 里 Year 1 的 common exception words **逐词一致 45/45** |
| 年级 | **Year 1** | 用户确认 |

Year 1 结束（每年 6 月）有全国统一的 **Phonics Screening Check**，gov.uk 上有历年真题。

## 词表

### ① Common Exception Words（Year 1，45 个）

国家课程规定的"不按常规拼读规则"的词，要整体记。**已和官方 PDF 核对。**

```
the a do to today of said says are were was is his has I you your they
be he me she we no go so by my here there where love come some one once
ask friend school put push pull full house our
```

来源：[English Appendix 1: Spelling](https://assets.publishing.service.gov.uk/media/5a7ccc06ed915d63cc65ce61/English_Appendix_1_-_Spelling.pdf)（第 7 页前后）

### ② High Frequency Words（学校发的「200 个」里的前 100 个）

照片转录，**和英国 *Letters and Sounds*（DfES 2007）的 100 高频词逐词一致 100/100**。

```
and on that had then big from got off a for with this mum it's him put an
in at can went them will get help children it but up not dad back just if
they came day made make he she we be me see very people I my like by time I'm
so go no don't oh old to you do into too out down now about house
have your could when are what some were come called one of
the as was saw there all little look is his said here their her asked looked Mr Mrs
```

⚠️ 照片上「make」那一行末尾还有一个红色的 **a**，和第二行的 a 重复，去掉它刚好 100 个，按排版失误处理。
⚠️ 标题写的是 200 个，**另外 100 个没拍到**，要做全的话请用户补拍。

---

## 设计约定（做英语练习时必须遵守）

### 1. 图片放在「读完之后」，不能放在「读之前」

英国教育部对认证拼读课程的要求里明确写着：**不能鼓励孩子根据图片或上下文去猜词**，
要先用拼读把词读出来（*"should not encourage children to guess unknown words from clues
such as pictures or context"*）。学校就是按这个教的。

所以：

| | 做法 |
|---|---|
| ❌ | 词和图同时出现 —— 她会看图猜，和学校教的方法冲突 |
| ❌ | 看图选词 —— 更糟，完全是从图反推 |
| ✅ | **先只显示词，读对了再出图** —— 图是「意思对上了」的确认和奖励 |
| ✅ | 看词选图（和认字游戏一样的方向）—— 先读、后匹配，可以 |

2026-09-27 用户确认：图画部分按学校的官方建议做。

### 2. 能配图的词很少，别硬凑

上面两张表 145 个词里，**具体、画得出来的只有十个左右**：

| 词 | 图 |
|---|---|
| mum | 👩 |
| dad | 👨 |
| house | 🏠 |
| school | 🏫 |
| children | 🧒🧒 |
| people | 👥 |
| friend | 🧑‍🤝‍🧑 |
| love | ❤️ |
| one | 1️⃣ |
| big / little | 只能成对出现（🐘 / 🐭），单独一个没法画 |

其余是 the / said / was / of 这类**功能词，本来就画不出来**。这和认字游戏「只收具体名词」
是同一个道理。功能词的练法是**读得快**（流利度）和**放进短句里读**，不是配图。

### 3. 颜色要和学校一致，不能自己编

Monster Phonics 的核心是**每种颜色代表一个发音**，每个发音配一只小怪兽。
两张表上对得上的 6 组（从词本身推出来的，两张表一致）：

| 颜色 | 发音 | 表上的词 |
|---|---|---|
| 红 | /ai/ | they, came, day, made, make, says |
| 绿 | /ee/ | he, she, we, be, me, see |
| 黄 | /igh/ | I, my, by, like, time |
| 粉 | /oa/ | no, go, so, old, don't, oh |
| 蓝 | /oo/ | to, do, you, too, into, today, school |
| 棕 | /ow/ | out, down, now, about, house, our |

**2026-09-29 已按学校词表逐字母抄进 `app/en-words.js`**（照片逐词放大看、再量颜色确认）。几点和官方颜色表不同，按学校的来：
- 学校只用了上面 6 色 + **金色（Tricky，不按规则读的部分）** + **空心（Silent，不发音）** + 黑色。
  look、all、saw、are、were、her、said、was、the 里的特殊部分**全是同一种金色**（量过，色相都在 37–42°）。
- 带波浪下划线的是 **th**（the, that, with, this, then, them, there, their；they 没有），back 的 ck 是直下划线。
- 例外词表的 ask put push pull full 在特殊读音的字母下画直线（a、u）。
- 高频词表上 a 有黑、红两个，例外词表把 a 分在红怪兽组，取红的。

⚠️ **待家长确认的 13 个词**：today says school our friend love once where has ask push pull full。
它们只在例外词表上，那张表按怪兽分组、字母全黑，颜色是参照同组的词补的：
today（o 蓝、ay 红）· says（ay 红）· school（h 空心、oo 蓝）· our（ou 棕）· friend（i 空心）·
love / once（o 金、e 空心）· where（h 空心、ere 金）· has（s 金）· ask push pull full（a/u 下划线）。

### 4. 音符拼单词

两张表里，**全部字母都在 A–G 之内、能完全用音符拼出来的只有 a、be、dad**。
所以按用户的主意用混合写法：**A–G 画成音符，其他字母直接写**
（made = m + 🎵A + 🎵D + 🎵E），这样任何词都能玩。

---

## 字母和数字的书写方案（2026-09-27 和孩子逐个确认）

用对照卡（[claude.ai/artifact/29FC2xjhjUuV2XbgUU5R4t](https://claude.ai/artifact/29FC2xjhjUuV2XbgUU5R4t)，
结果存在它的数据库 `letters/choices` 里）请她逐个写、家长勾选。

| | 她的写法 | | 她的写法 |
|---|---|---|---|
| a | 单层（圈 + 竖） | u | 右边加一竖 |
| g | 单层，竖往下带钩 | I | 上下带横 |
| q | 竖末尾往右勾 | J | 顶上带横 |
| y | u 加钩 | **小尾巴** | **带**（末尾向右上甩出） |
| t | 底部带弯 | b | 先竖后圆 |
| l | 底部带弯 | d | 先圆后竖（先写 c） |
| k | 第二笔带小圈 | p | 先竖后圆 |
| f | 停在基线，不往下伸 | | |

| 数字 | 她的写法 |
|---|---|
| 1 | 带小旗 |
| 4 | 顶上开口 |
| 7 | 不带横 |
| 9 | 竖是直的，圈封口 |
| 5 | 顶上的横最后写 |
| 8 | 一笔连写 |

**判断**：单层 a/g、t 和 l 底部带弯、k 带圈、u 带竖、末尾带出笔——这一整套**前后一致**，
是英国学校典型的「预备连笔」（pre-cursive）写法，说明她是照学校教的写，不是自己乱写的。
b 先竖、d 先圆、p 先竖也正好是英国防止 b/d 写反的标准教法，**这部分她已经对了**；
镜像问题更可能出在 s、z、j、N、S、Z 和数字 2、3、5、7、9 的**方向**上，做的时候重点盯这些。

⚠️ 两处可能是她个人的习惯，不一定是学校教的：**J 带横**（英国一般不带）、**f 不往下伸**。
按她的写法做，等以后拿到学校的书写方案名称再核对。

补充确认（同一天）：**不带引笔**（直接从中线/顶线起笔）、数字 **2 平底**。一共 23 项。

**抬笔习惯**（家长看她实际书写，2026-09-27）：
- **小写字母全部一笔连写**。b、d、n 这类是「竖下去，笔不离纸原路折返，再拱过去」
- **大写只有 M 是两笔**（先写左边一竖，再从左上斜下、斜上、竖下）；B D N P R 都是一笔
- **9 是一笔**
- 本来就得抬笔的不算：i j 的点、t f 的横
- 分开写的几个大写字母，孩子看过预览后确认（2026-09-27）：**H 是竖、横、竖**；
  **Y 是短左臂斜到中间 + 一条长斜线从右上直接斜到左下**（像放大的小写 y，不是中间竖下来）。
  英国学校两种都有人教：Unlocking Letters and Sounds 的官方大写字母指引里 H 是「竖、竖、横」、
  Y 就是长斜线版本。按她学的做。A E F K Q T X 和小写 x 她看过说对
- **9 的圈要封口**（她学的是封口的）

## 还缺的

- [x] Monster Phonics 颜色：已照学校词表抄完（上面 13 个待确认）
- [x] 高频词：这学期只有这 100 个（2026-09-29 用户确认）
- [x] 书写方案：已和孩子确认 21 项，见上面
- [x] 引笔（不带）、数字 2（平底）
- [ ] 学校书写方案的名称（问老师，用来核对 J 和 f）
- [ ] 现在拼读教到哪个阶段（决定先练哪些词）
