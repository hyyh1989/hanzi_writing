# 音乐（升级第 5 步）：已经定下的事

2026-09-29 和用户确认。还没开始做，先把决定记下来，做的时候照这里。

## 范围

| | 内容 |
|---|---|
| 写谱号 | Treble clef（高音谱号）、Bass clef（低音谱号） |
| 写音符 | semibreve（全音符）、minim（二分音符）、crotchet（四分音符） |
| 认音符 | 低音谱号 **Bass C → Middle C**；高音谱号 **Middle C → Treble C**（各 8 个音） |

边界照旧：**钢琴老师负责教，这里只负责练。** 不加新的乐理内容。

## 语言：全部英文

钢琴老师上乐理课用英文名称，所以音乐部分的**提示、引导、语音全部用英文**（英式发音，`utterEn`）。

- 音符名用**英式**：crotchet / minim / semibreve（不用 quarter / half / whole note）
- 高音谱号第三间那个 C 叫 **Treble C**（用户最早按读音拼成「trafo c」，正确写法是 Treble C）
- 认对了：「Yes! That's E.」这类短句，并弹出这个音的音高

## 谱号的写法（照她学的）

| | 起笔 | 笔画 | 提示语 |
|---|---|---|---|
| Treble clef | **从 G 线（第二线）起笔** | **一笔**画完 | *Start on the G line.* + *That's why it's called the G clef.* |
| Bass clef | **从 F 线（第四线）起笔**，先画弧 | 弧之后**再点两个点**（F 线上下两间） | *Start on the F line.* + *That's why it's called the F clef.* |

**「G clef / F clef」是老师反复强调的**：谱号的起笔点就是它标出的那个音所在的线。
起笔提示要把「从哪条线开始」和「所以叫 G / F 谱号」连在一起说。

笔画数据和字母一样：路径方向 = 运笔方向，笔数照她的习惯（高音谱号一笔；低音谱号 = 弧 + 两个点）。
画之前先做对照卡请她确认细节（弧的起笔位置、点的先后）。

## 进首页的方式

- `index.html` 的 `MUSIC_READY` 改成 `true`，`today.js` 的 `DEFAULT_PLAN` 换回注释里带音乐的那版
- 「音符拼单词」做成小游戏放首页小游戏区，不当任务。A–G 画成音符，其他字母直接写（见 ENGLISH.md）

## 建议顺序

1. 认音符（不需要她的书写数据，先做）：五线谱 + 音高播放 + 字母键 C D E F G A B
2. 写谱号、写音符：先出对照卡确认写法
3. 音符拼单词小游戏
