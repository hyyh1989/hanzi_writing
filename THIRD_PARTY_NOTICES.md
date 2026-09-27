# 第三方素材与授权

本仓库是公开的。这里列出所有进了仓库（或其派生数据进了仓库）的第三方内容，
授权原文在 `licenses/` 下，均为从上游原样下载。

| 内容 | 仓库里的位置 | 上游 | 授权 |
|---|---|---|---|
| 笔顺 / 字形数据 | `app/chardata.js`、`app/sd/*.js` | [hanzi-writer-data](https://github.com/chanind/hanzi-writer-data) 2.0.1，源自 [Make Me a Hanzi](https://github.com/skishore/makemeahanzi)，再上游是文鼎（Arphic）字体 | **Arphic Public License** → `licenses/ARPHICPL.TXT` |
| 笔顺动画与描红引擎 | `app/hanzi-writer.min.js` | [hanzi-writer](https://github.com/chanind/hanzi-writer) 3.7.0，© 2014 David Chanin | MIT → `licenses/hanzi-writer.MIT.txt` |
| 拼音 | `app/chardata.js` 里的 `p` 字段（构建时由 `build/pinyin.json` 生成） | [pinyin-pro](https://github.com/zh-lx/pinyin-pro)，© zh-lx | MIT → `licenses/pinyin-pro.MIT.txt` |
| 兜底组词（手写组词之外的字） | `app/words.js` | [nodejieba](https://github.com/yanyiwu/nodejieba) 2.6.0 的 `jieba.dict.utf8` | MIT → `licenses/nodejieba.MIT.txt` |

**Arphic Public License 的要点**：允许商用分发，但它是 copyleft —— 字形数据及其修改版
必须以同一授权保持自由可得。它只约束字形数据本身，不传染到本项目自己的代码。

## 刻意**没有**进仓库的

| 内容 | 为什么 |
|---|---|
| `app/meow.wav`（猫叫） | Mixkit Sound Effects Free License 允许用在成品网页里，但**禁止和源码一起再分发**。只留在本机，部署时上传。详见 `pet/CREDITS.md` |
| `textbooks/*.pdf`（课本） | 版权页写明「仅供个人学习使用，未经授权不得另做他用」。字表数据是从中解析的事实性信息 |
| `build/pinyin-pro.js`、`build/jieba.dict.utf8` | 构建依赖，按需下载即可，没必要放进仓库 |

小猫形象（`app/cat.js`）和认字游戏的界面是本项目自己画/写的。认字游戏里的图用的是
系统 emoji，由设备自带字体显示，仓库里只存字符本身。
