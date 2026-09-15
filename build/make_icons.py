# -*- coding: utf-8 -*-
"""
生成 app 图标（加到 iPad 主屏幕后显示的那个）。
画的就是 app 自己的样子：朱红米字格 + 一个"写"字。

    /usr/local/bin/python3 build/make_icons.py
"""
import os
from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
APP = os.path.join(os.path.dirname(HERE), 'app')
PAPER, ZHU, ZHU_SOFT, INK = '#FAFAF7', '#CE3E33', '#E9A9A3', '#1B2530'
FONTS = ['/System/Library/Fonts/PingFang.ttc',
         '/System/Library/Fonts/Supplemental/Songti.ttc',
         '/System/Library/Fonts/STHeiti Medium.ttc']


def dashed(d, a, b, color, w, dash=34, gap=26):
    (x0, y0), (x1, y1) = a, b
    n = max(abs(x1 - x0), abs(y1 - y0))
    if not n:
        return
    steps = int(n // (dash + gap)) + 1
    for i in range(steps):
        t0 = (i * (dash + gap)) / n
        t1 = min(1.0, (i * (dash + gap) + dash) / n)
        if t0 >= 1:
            break
        d.line([(x0 + (x1 - x0) * t0, y0 + (y1 - y0) * t0),
                (x0 + (x1 - x0) * t1, y0 + (y1 - y0) * t1)], fill=color, width=w)


def make(size):
    S = 1024
    img = Image.new('RGB', (S, S), PAPER)
    d = ImageDraw.Draw(img)
    m = int(S * 0.11)                      # 边距
    box = (m, m, S - m, S - m)
    lw = max(2, int(S * 0.022))
    thin = max(2, int(S * 0.012))
    d.rectangle(box, outline=ZHU, width=lw)
    cx = cy = S // 2
    dashed(d, (cx, m), (cx, S - m), ZHU_SOFT, thin)
    dashed(d, (m, cy), (S - m, cy), ZHU_SOFT, thin)
    dashed(d, (m, m), (S - m, S - m), ZHU_SOFT, thin)
    dashed(d, (S - m, m), (m, S - m), ZHU_SOFT, thin)

    font = None
    for f in FONTS:
        if os.path.exists(f):
            for idx in (0, 1, 2):
                try:
                    font = ImageFont.truetype(f, int(S * 0.56), index=idx)
                    break
                except Exception:
                    continue
        if font:
            break
    if font:
        t = '写'
        l, top, r, bot = d.textbbox((0, 0), t, font=font)
        d.text((cx - (r + l) / 2, cy - (bot + top) / 2), t, font=font, fill=INK)
    return img.resize((size, size), Image.LANCZOS)


def main():
    for n in (180, 192, 512):
        p = os.path.join(APP, 'icon-%d.png' % n)
        make(n).save(p, optimize=True)
        print('  icon-%d.png  %.0f KB' % (n, os.path.getsize(p) / 1e3))


if __name__ == '__main__':
    main()
