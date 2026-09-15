# -*- coding: utf-8 -*-
"""
生成 app/words.js —— 听写时用的组词（"天，天空的天"）。

核心 392 个字的词是**手写的**（见 words_core.py）——jieba 是新闻语料，按词频挑出来是
"手段的手""大妈的妈"，念给 5 岁孩子只会更糊涂。其余的字用 jieba 自动兜底：
  · 只要双字词，两个字都在字库里
  · 排除人名/地名/机构/专名（nr/ns/nt/nz 开头的词性）
  · 搭档字过一遍儿童不宜的黑名单
  · 同条件下取词频最高的
跑法：
    /usr/local/bin/python3 build/make_words.py
"""
import io, json, os, sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
DICT = os.path.join(HERE, 'jieba.dict.utf8')

# 搭档字里不出现这些——组词是念给 5 岁孩子听的
BAD = set('死尸杀奸淫娼妓嫖赌毒枪弹血腥骸棺坟墓尿屎粪毙丧殡葬癌瘤疫瘟艾滋毒瘾裸胸乳臀'
          '奴娼盗抢劫匪凶恶罪犯赃毁灭亡灾祸殃衰败贱蠢丑陋恨怨仇骂咒诅魔妖邪鬼狱刑囚')


def main():
    if not os.path.exists(DICT):
        sys.exit('缺 build/jieba.dict.utf8 —— 从 '
                 'https://cdn.jsdelivr.net/npm/nodejieba@2.6.0/dict/jieba.dict.utf8 下载')
    avail = set(io.open(os.path.join(HERE, 'avail.txt'), encoding='utf-8').read().strip())
    sys.path.insert(0, HERE)
    from words_core import CORE_WORDS, CORE_WORDS2

    best = {}
    for line in io.open(DICT, encoding='utf-8'):
        parts = line.split()
        if len(parts) < 3:
            continue
        w, freq, pos = parts[0], parts[1], parts[2]
        if len(w) != 2:
            continue
        if pos[:2] in ('nr', 'ns', 'nt', 'nz'):
            continue
        a, b = w[0], w[1]
        if a not in avail or b not in avail:
            continue
        try:
            f = int(freq)
        except ValueError:
            continue
        for i, c in ((0, a), (1, b)):
            other = b if i == 0 else a
            if other in BAD or other == c:
                continue
            cur = best.get(c)
            if cur is None or f > cur[1]:
                best[c] = (w, f)

    words = {c: [v[0]] for c, v in best.items()}
    for c, w in CORE_WORDS.items():   # 手写的优先，覆盖自动挑的
        words[c] = [w]
    for c, w in CORE_WORDS2.items():  # 第二个词，听写时一并念
        if c in words and w not in words[c]:
            words[c].append(w)
    out = os.path.join(ROOT, 'app', 'words.js')
    io.open(out, 'w', encoding='utf-8').write(
        'window.WORDS=' + json.dumps(words, ensure_ascii=False, separators=(',', ':')) + ';\n')
    two = sum(1 for v in words.values() if len(v) > 1)
    print('覆盖 %d / %d 个字（手写 %d，其中 %d 个有两个词）· words.js %.0f KB'
          % (len(words), len(avail), len(CORE_WORDS), two, os.path.getsize(out) / 1e3))
    miss = [c for c in avail if c not in words]
    print('没组到词的 %d 个（听写时只念字本身）：%s' % (len(miss), ''.join(miss[:60])))


if __name__ == '__main__':
    main()
