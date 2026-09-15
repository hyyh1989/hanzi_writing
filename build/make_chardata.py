# -*- coding: utf-8 -*-
"""
生成 app/chardata.js（核心字 + 全字表索引）和 app/sd/NNN.js（按需加载的分片）。

字库共 9574 个字（hanzi-writer-data 的全部内容）。其中：
  · charset.py 里用到的"核心字"直接内联进 chardata.js，开页即用
  · 其余的按 unicode 码位分成 SHARDS 片，用到哪个字才下哪一片（每片约 240 KB）

改字表 → 编辑 charset.py → 跑：
    /usr/local/bin/python3 build/make_chardata.py

笔顺原始数据在 build/cache/（gitignore）。缺了就先跑一次：
    /usr/local/bin/python3 build/fetch_all.py
"""
import io, json, os, shutil, sys

SHARDS = 128
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
CACHE = os.path.join(HERE, 'cache')
APP = os.path.join(ROOT, 'app')

sys.path.insert(0, HERE)
from charset import LESSONS, THEMES
from textbook import TEXTBOOK, XIEZI

j = lambda o: json.dumps(o, ensure_ascii=False, separators=(',', ':'))


def entry(c, py):
    with open(os.path.join(CACHE, '%d.json' % ord(c))) as f:
        d = json.load(f)
    # medians 的 y 轴朝上，翻成屏幕坐标后求外框 —— app 用它画"该占的位置"
    pts = [(p[0], 900 - p[1]) for m in (d.get('medians') or []) if m for p in m] or [(512, 512)]
    xs = [p[0] for p in pts]
    ys = [p[1] for p in pts]
    return {'s': d['strokes'], 'm': d['medians'], 'p': py.get(c, ''),
            'b': [round(min(xs)), round(min(ys)), round(max(xs)), round(max(ys))],
            'n': len(d['strokes'])}


def main():
    avail_path = os.path.join(HERE, 'avail.txt')
    if not os.path.exists(avail_path):
        sys.exit('缺 build/avail.txt —— 先跑 build/fetch_all.py')
    avail = list(io.open(avail_path, encoding='utf-8').read().strip())
    have = set(c for c in avail
               if os.path.exists(os.path.join(CACHE, '%d.json' % ord(c))))
    if len(have) < len(avail):
        print('⚠️  cache 里只有 %d/%d 个字，先跑 build/fetch_all.py 补齐'
              % (len(have), len(avail)))
        avail = [c for c in avail if c in have]
    py = json.load(open(os.path.join(HERE, 'pinyin.json')))

    core = []
    for _, _, _, cs in LESSONS:
        core += list(cs)
    for _, cs in THEMES:
        core += list(cs)
    for _, cs in TEXTBOOK:          # 教材的字也内联，首页秒开不用等分片
        core += list(cs)
    core = [c for c in dict.fromkeys(core) if c in have]

    CORE = {c: entry(c, py) for c in core}
    coreset = set(core)
    keep = lambda cs: [c for c in dict.fromkeys(cs) if c in CORE]
    lessons = [{'id': i, 'name': n, 'tip': t, 'chars': keep(cs)} for i, n, t, cs in LESSONS]
    themes = [{'name': n, 'chars': keep(cs)} for n, cs in THEMES]
    xz = set(XIEZI)
    textbook = [{'name': n, 'chars': keep(cs),
                 'write': [c for c in keep(cs) if c in xz]} for n, cs in TEXTBOOK]

    with io.open(os.path.join(APP, 'chardata.js'), 'w', encoding='utf-8') as f:
        f.write('window.CHARS=' + j(CORE) + ';\n')
        f.write('window.AVAIL=' + j(''.join(avail)) + ';\n')
        f.write('window.SHARDS=' + str(SHARDS) + ';\n')
        f.write('window.LESSONS=' + j(lessons) + ';\n')
        f.write('window.THEMES=' + j(themes) + ';\n')
        f.write('window.TEXTBOOK=' + j(textbook) + ';\n')

    sd = os.path.join(APP, 'sd')
    shutil.rmtree(sd, ignore_errors=True)
    os.makedirs(sd)
    buckets = [{} for _ in range(SHARDS)]
    for c in avail:
        if c in coreset:
            continue
        buckets[ord(c) % SHARDS][c] = entry(c, py)
    tot = mx = 0
    for i, b in enumerate(buckets):
        p = os.path.join(sd, '%03d.js' % i)
        io.open(p, 'w', encoding='utf-8').write('Object.assign(window.CHARS,' + j(b) + ');\n')
        sz = os.path.getsize(p)
        tot += sz
        mx = max(mx, sz)

    head = os.path.getsize(os.path.join(APP, 'chardata.js'))
    print('核心内联 %d 字 · chardata.js %.2f MB' % (len(CORE), head / 1e6))
    print('教材 %d 课 · 共 %d 字 · 其中要求会写 %d 字'
          % (len(textbook), sum(len(t['chars']) for t in textbook),
             sum(len(t['write']) for t in textbook)))
    print('分片 %d 个 · 共 %.1f MB · 最大一片 %.0f KB' % (SHARDS, tot / 1e6, mx / 1e3))
    print('全库 %d 字 · 发布体积 %.1f MB / 上限 64 · 文件数 %d / 上限 255'
          % (len(avail), (tot + head) / 1e6, SHARDS + 3))


if __name__ == '__main__':
    main()
