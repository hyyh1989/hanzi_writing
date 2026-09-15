# -*- coding: utf-8 -*-
"""把 hanzi-writer-data 的全部 9574 个字下载到 build/cache/（可断点续传，重跑只补缺的）。"""
import json, os, sys, urllib.parse, urllib.request
from concurrent.futures import ThreadPoolExecutor

HERE = os.path.dirname(os.path.abspath(__file__))
CACHE = os.path.join(HERE, 'cache')
CDN = 'https://cdn.jsdelivr.net/npm/hanzi-writer-data@2.0.1/'

def one(c):
    p = os.path.join(CACHE, '%d.json' % ord(c))
    if os.path.exists(p) and os.path.getsize(p) > 40:
        return None
    try:
        with urllib.request.urlopen(CDN + urllib.parse.quote(c) + '.json', timeout=30) as r:
            d = r.read().decode()
        json.loads(d)
        open(p, 'w').write(d)
        return None
    except Exception:
        return c

def main():
    os.makedirs(CACHE, exist_ok=True)
    chars = list(open(os.path.join(HERE, 'avail.txt'), encoding='utf-8').read().strip())
    todo = [c for c in chars
            if not (os.path.exists(os.path.join(CACHE, '%d.json' % ord(c)))
                    and os.path.getsize(os.path.join(CACHE, '%d.json' % ord(c))) > 40)]
    print('全部 %d 字，还缺 %d 个' % (len(chars), len(todo)), flush=True)
    bad = []
    with ThreadPoolExecutor(max_workers=24) as ex:
        for i, r in enumerate(ex.map(one, todo)):
            if r: bad.append(r)
            if i and i % 1000 == 0: print('  ...%d' % i, flush=True)
    print('失败 %d 个%s' % (len(bad), ('：' + ''.join(bad[:40])) if bad else ''))

if __name__ == '__main__':
    main()
