# 素材出处

## 小猫形象 `cat.js`

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

## 猫叫 `meow.wav`

来源：[Meow of a Siamese cat — freemaster2](https://commons.wikimedia.org/wiki/File:Meow_of_a_Siamese_cat_-_freemaster2.wav)，
Wikimedia Commons。

**授权：CC0（公有领域）** —— 免署名、无传染性、可随意修改分发。

处理：原文件 44.1kHz 立体声 131KB，剪出 0.24–1.06 秒那一声，降采样到 22.05kHz 单声道，
两端加淡入淡出去掉咔哒声，峰值归一化到 0.85。成品 **0.82 秒 / 35KB / 16bit WAV**。
重做的话见 git 历史里的处理脚本。

**为什么是 WAV 不是 Ogg/MP3**：Commons 上的猫叫绝大多数是 Ogg，**Safari 不支持 Ogg**，
而这台机器没有 ffmpeg（afconvert 也不解 Vorbis）。这个文件原生就是 WAV，
剪完 35KB 完全可以接受，而且 WAV 所有浏览器都支持，省掉一层转码。

排除掉的候选：`Meow.ogg` 是 CC BY-SA 3.0（要署名且有传染性），
`Meow domestic cat.ogg` 是 GFDL（更麻烦），
`Weibliche Britisch Kurzhaar…wav` 是 CC BY 4.0（要署名）且有 3MB。

> 顺带记一笔：[SoundGator](https://www.soundgator.com/content/license/) 的条款是免署名可商用，
> 但禁止「把音效单独发布到网上」。嵌进网页后文件 URL 其实可被直接访问，属于灰色地带，
> 所以没用它。Commons 的 CC0 没有这个问题。
