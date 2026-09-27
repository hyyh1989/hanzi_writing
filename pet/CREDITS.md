> 文件位置：`app/cat.js` + `app/meow.wav`（放在部署目录里，练字页直接引用）。
> `pet/` 下只剩这份说明和 `preview.html` 评审页。

# 素材出处

## 小猫形象 `app/cat.js`

**自己画的**（SVG，2026-09-17）。没有用任何第三方素材，无授权限制。

为什么不用现成的——三类都实地查过：

| 来源 | 授权 | 为什么不用 |
|---|---|---|
| [Kenney Animal Pack](https://kenney.nl/assets/animal-pack) | CC0 | 只有一张静态的脸，没身体没动作，**没有猫** |
| [Animal Farm Project](https://single-head-games.itch.io/animal-farm-project) | 购买后可商用可改 | $4；**俯视角行走贴图**（给游戏里走动用），不是正面朝人的陪伴角色；没有猫 |
| [LPC 农场动物](https://opengameart.org/content/lpc-style-farm-animals) | GPL2+ / CC-BY | 同样是 RPG 行走贴图，只有猪和羊 |
| [いらすとや](https://www.irasutoya.com/) | 免费但**保留版权**，商用 20 点上限 | 有猫，但静态全身插画，做挤压拉伸会走形 |
| [ONWA イラスト](https://onwa-illust.com/terms/) | 免费但**保留版权** | 同上 |

结论：游戏素材包做的是「在世界里走动的贴图」，我们要的是「正面朝着孩子做反应的角色」，
是两个品类。而且 SVG 分部件才能各动各的（眨眼、摇尾巴、飘爱心），PNG 做不到。

## 猫叫 `app/meow.wav`

来源：[**Sweet kitty meow**](https://mixkit.co/free-sound-effects/cat/) — Mixkit（Envato 旗下）。

**授权：Mixkit Sound Effects Free License** —— 免费、**免署名**、商用非商用都可以，
条款里明确列了「Video games / Educational Purposes / 任何 web 平台」。

> ⚠️ **唯一的限制，和我们有关**：原文 "You can't redistribute the Item on its own,
> as stock, in a tool or template, **or with source files**."
> 即**不能把音效文件本身和源码一起再分发**。
> - 部署到 hanzi-writing.pages.dev **没问题**——那是「成品网页」，条款明确允许。
> - **2026-09-23 仓库为了做 GitHub Pages 镜像改成了公开**，而它当时还在 git 里——踩线了。
>   **2026-09-27 已改为不进 git**（`.gitignore` 里有 `app/meow.wav`）：
>   文件只留在本机 `app/` 下，`build/deploy.sh` 从磁盘拷贝上传，主站照常有猫叫；
>   GitHub 镜像站没有这个文件，`cat.js` 播放失败会自动退回合成音 `chirp()`。
> - ⚠️ **git 历史里仍有旧版本**（3 个老提交），清掉需要改写历史 + 强制推送，
>   见 `CLAUDE.md`「陪伴小猫」一节的待办。
> - ⚠️ **换电脑 / 重新 clone 之后 `app/meow.wav` 不会跟过来**，要自己从 Mixkit 重新下载
>   「Sweet kitty meow」按下面的方法处理后放回去；不放也能用，只是主站也会变成合成音。

处理：原文件 44.1kHz 立体声 151KB / 0.88 秒，剪出发声段（0.12–0.82 秒，起音前留 40ms、
尾音后留 60ms），降采样到 22.05kHz 单声道，12ms 淡入 / 50ms 淡出去掉咔哒声，峰值归一化到 0.85。
成品 **0.70 秒 / 30KB / 16bit WAV**。

**为什么换掉上一版**（Wikimedia 的暹罗猫 CC0 录音）：不是处理问题，是**音源本身就闷**。
频谱实测：

| | 峰值频率 | 2–8kHz 能量占比 | 0–1kHz |
|---|---|---|---|
| 旧 · 暹罗猫（CC0） | 765 Hz | 26.8% | ~50% |
| **新 · Sweet kitty meow** | **2160 Hz** | **79.1%** | 5.1% |
| 「清脆可爱」的目标区间 | 1500–3000 Hz | ≥40% | — |

小朋友听感上的「清楚」基本由 2–4kHz 决定（人耳最敏感的频段）。旧录音一半能量堆在 1kHz 以下，
是成年猫的低「喵呜」，在 iPad 小喇叭上更糊；新的这声是幼猫的高「喵」，正好落在目标区间中间。

**为什么是 WAV 不是 MP3**：Mixkit 下载下来原生就是 WAV，剪完 30KB 完全可以接受，
省掉一层转码——这台机器没有 ffmpeg（afconvert 也不解 Vorbis），**Safari 又不支持 Ogg/Opus**，
能不转码就不转码。WAV 所有浏览器都支持。

曾经考虑过的其他来源：Wikimedia 的 `Meow.ogg` 是 CC BY-SA 3.0（要署名且有传染性）、
`Meow domestic cat.ogg` 是 GFDL、`Weibliche Britisch Kurzhaar….wav` 是 CC BY 4.0 且 3MB，
实测比暹罗猫还闷（峰值 940Hz / 2–8kHz 仅 14.2%）。

> 顺带记一笔：[SoundGator](https://www.soundgator.com/content/license/) 的条款是免署名可商用，
> 但禁止「把音效单独发布到网上」。嵌进网页后文件 URL 其实可被直接访问，属于灰色地带，所以没用它。
