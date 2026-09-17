# -*- coding: utf-8 -*-
"""解析人教统编版《语文》一年级上册 PDF 的识字表 / 写字表 → textbook.py 的数据。

依赖 pymupdf（本机没装，也不该装进系统 python）。用法：

    python3 -m venv /tmp/pdfenv && /tmp/pdfenv/bin/pip install pymupdf
    /tmp/pdfenv/bin/python build/parse_textbook_pdf.py <课本.pdf> /tmp/out.json

⚠️ 课本 PDF 自己写着"仅供个人学习使用，未经授权不得另做他用"，
所以 `textbooks/` 已加进 .gitignore，不进仓库。要重跑请自己把 PDF 放回去。


版面规律（对着渲染图逐页核过，别再靠猜）：
  · 识字表(105-107页) = 整行排版。部分行中间有短竖线，一行里放两课。
    所以按【行内从左往右走，遇到课号/园地标签就开新单元】，
    不能按固定 x 切栏 —— 识字4「日月山川水火田禾」的田、禾就落在右半区的 x 上。
  · 写字表(108页)   = 整页一条通高竖线，左右两栏【各自从上往下读】，
    两栏各有自己的「识字/汉语拼音/阅读」栏目标签。必须按栏解析，
    否则右栏的课会被安到左栏的栏目下（园地六曾被误挂到「汉语拼音」）。
  · 字号：18=汉字与课号，14=栏目标签，12=语文园地标签，10.5=拼音
  · 蓝色 0x00AEEF = 多音字，此前已作生字认读，【不计入生字总数】
  · 同一行内 y 有 ±14pt 抖动（园地标签比汉字低），先把 y 归桶再排

课序：书上为省版面把课打乱了（拼音 5,8,6,9,7 这样交错排）。
输出按【栏目段落 → 课号】重排成真正的教学顺序；语文园地排在它所在段落
已出现的最大课号之后（拼音园地二在拼音4之后、园地三在拼音9之后，与课本分单元一致）。
"""
import pymupdf, re, json, sys
BLUE = 0x00AEEF
CJK = lambda c: '一' <= c <= '龥'
YD  = '一二三四五六七八'

def _cells(d, pg, xlo, xhi):
    S = []
    for b in d[pg].get_text("dict")["blocks"]:
        for l in b.get("lines", []):
            for s in l["spans"]:
                t = s["text"].strip()
                if not t or round(s["size"],1) not in (12.0,14.0,18.0): continue
                if '仅供个人' in t or '字  表' in t or t == '①': continue
                if '共' in t and '个' in t: continue
                x = s["bbox"][0]
                if not (xlo <= x < xhi): continue
                S.append([s["bbox"][1], x, round(s["size"],1), s["color"], t])
    S.sort(key=lambda r: r[0])
    rows, cy = [], None
    for r in S:
        if cy is None or r[0]-cy > 14: rows.append([]); cy = r[0]
        rows[-1].append(r)
    for row in rows: row.sort(key=lambda r: r[1])
    return rows

def collect(d, chunks):
    """chunks = [(页, x下限, x上限)]，按给定顺序读。"""
    out, cat, cur, blk, top = [], None, None, -1, 0
    for pg, xlo, xhi in chunks:
        for row in _cells(d, pg, xlo, xhi):
            for _, x, sz, color, t in row:
                if sz == 14.0:
                    if t != cat or True: blk += 1
                    cat, top = t, 0; continue
                if sz == 12.0:
                    if '语文园地' in t:
                        cur = [cat, t, [], blk, top + 0.5]; out.append(cur)
                    continue
                if re.fullmatch(r'\d+', t):
                    if len(t) >= 3: continue                 # 页码
                    no = int(t); top = max(top, no)
                    cur = [cat, '第%d课' % no, [], blk, no]; out.append(cur); continue
                if CJK(t[0]) and cur is not None:
                    cur[2] += [(ch, color == BLUE) for ch in t if CJK(ch)]
    out.sort(key=lambda u: (u[3], u[4]))
    return [[c, n, cs] for c, n, cs, _, _ in out]

if __name__ == '__main__':
    d = pymupdf.open(sys.argv[1])
    W = d[112].rect.width
    res = {
        # 识字表：整行，一次读到底
        "shizi": collect(d, [(109,0,W), (110,0,W), (111,0,W)]),
        # 写字表：左栏读完再读右栏（竖线约在 x=254）
        "xiezi": collect(d, [(112,0,254), (112,254,W)]),
    }
    json.dump(res, open(sys.argv[2],'w'), ensure_ascii=False, indent=1)
    for name, U in (("识字表", res["shizi"]), ("写字表", res["xiezi"])):
        allc = [c for _,_,cs in U for c,_ in cs]
        blue = [c for _,_,cs in U for c,b in cs if b]
        print('【%s】单元 %d / 字次 %d / 蓝色 %d(%s) / 生字 %d'
              % (name, len(U), len(allc), len(blue), ''.join(blue), len(allc)-len(blue)))
