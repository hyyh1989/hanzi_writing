#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
latin_glyphs.py 的中心线 → app/latin.js（写字引擎能直接吃的格式）。

    /usr/local/bin/python3 build/make_latin.py

输出 `window.LATIN = {字: {s: [轮廓路径...], m: [[[x,y]...]...], n: 笔数, c: [中心线...]}}`，
和汉字的 `window.CHARS[字]` 同一个结构，所以主程序的 charDataLoader 不用区分汉字和字母。

三步：
1. 解析路径（M/L/C/A），沿中心线密集采点、按弧长均匀重采样
2. 换算坐标：100×130 的四线格 → 引擎的 1024 方框，保持宽高比、水平居中；
   引擎内部 y 轴朝上，屏幕 y → 900 - y（和 CLAUDE.md「踩过的坑 1」同一套）
3. 生成轮廓：中心线两侧各偏移半个笔宽；拐角外侧补圆弧、内侧取偏移线交点，
   两头补半圆笔帽——引擎用这个轮廓画字、做描红底字
   中位线（medians）= 稀疏采样的中心线，引擎用它判定笔顺和运笔方向
"""
import io, json, math, os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from latin_glyphs import ALL  # noqa: E402

APP = os.path.join(HERE, os.pardir, 'app')

BOX_H = 130.0
S = 1024.0 / BOX_H                 # 7.877：四线格的 130 高刚好撑满 1024
OX = (1024.0 - 100.0 * S) / 2.0    # 水平居中
WIDTH = 64.0                       # 笔宽（引擎坐标）。汉字笔画大约 60~100
DOT_R = WIDTH * 0.62               # i / j 的点


# ── 1. 路径解析与采样 ─────────────────────────────────────────────
def _arc_points(x1, y1, rx, ry, phi, fa, fs, x2, y2, n=48):
    """SVG 端点参数化圆弧 → 点列（W3C 附录 F.6）。"""
    phi = math.radians(phi)
    c, s = math.cos(phi), math.sin(phi)
    dx, dy = (x1 - x2) / 2, (y1 - y2) / 2
    x1p, y1p = c * dx + s * dy, -s * dx + c * dy
    lam = (x1p ** 2) / (rx ** 2) + (y1p ** 2) / (ry ** 2)
    if lam > 1:
        rx, ry = rx * math.sqrt(lam), ry * math.sqrt(lam)
    num = rx * rx * ry * ry - rx * rx * y1p * y1p - ry * ry * x1p * x1p
    den = rx * rx * y1p * y1p + ry * ry * x1p * x1p
    co = math.sqrt(max(0.0, num / den)) if den else 0.0
    if fa == fs:
        co = -co
    cxp, cyp = co * rx * y1p / ry, -co * ry * x1p / rx
    cx = c * cxp - s * cyp + (x1 + x2) / 2
    cy = s * cxp + c * cyp + (y1 + y2) / 2

    def ang(ux, uy, vx, vy):
        a = math.atan2(ux * vy - uy * vx, ux * vx + uy * vy)
        return a
    t1 = ang(1, 0, (x1p - cxp) / rx, (y1p - cyp) / ry)
    dt = ang((x1p - cxp) / rx, (y1p - cyp) / ry, (-x1p - cxp) / rx, (-y1p - cyp) / ry)
    if not fs and dt > 0:
        dt -= 2 * math.pi
    elif fs and dt < 0:
        dt += 2 * math.pi
    pts = []
    for i in range(1, n + 1):
        t = t1 + dt * i / n
        px, py = rx * math.cos(t), ry * math.sin(t)
        pts.append((c * px - s * py + cx, s * px + c * py + cy))
    return pts


def parse(d):
    """路径字符串 → 密集点列（100×130 坐标）。只支持绝对坐标 M L C A。"""
    tok = re.findall(r'[MLCA]|-?\d*\.?\d+', d)
    pts, i, cur = [], 0, None
    cmd = None
    while i < len(tok):
        if tok[i] in 'MLCA':
            cmd = tok[i]; i += 1
        if cmd == 'M':
            cur = (float(tok[i]), float(tok[i + 1])); i += 2
            pts.append(cur); cmd = 'L'          # M 后面跟的坐标按 L 处理
        elif cmd == 'L':
            nxt = (float(tok[i]), float(tok[i + 1])); i += 2
            pts.append(nxt); cur = nxt
        elif cmd == 'C':
            x1, y1, x2, y2, x, y = map(float, tok[i:i + 6]); i += 6
            x0, y0 = cur
            for k in range(1, 33):
                t = k / 32; u = 1 - t
                pts.append((u ** 3 * x0 + 3 * u * u * t * x1 + 3 * u * t * t * x2 + t ** 3 * x,
                            u ** 3 * y0 + 3 * u * u * t * y1 + 3 * u * t * t * y2 + t ** 3 * y))
            cur = (x, y)
        elif cmd == 'A':
            rx, ry, phi, fa, fs, x, y = map(float, tok[i:i + 7]); i += 7
            pts += _arc_points(cur[0], cur[1], rx, ry, phi, int(fa), int(fs), x, y)
            cur = (x, y)
        else:
            raise ValueError('不支持的路径命令：%r' % tok[i])
    return pts


def resample(pts, step):
    """按弧长均匀重采样，首尾保留。"""
    out = [pts[0]]
    acc = 0.0
    for a, b in zip(pts, pts[1:]):
        seg = math.dist(a, b)
        if seg == 0:
            continue
        while acc + seg >= step:
            t = (step - acc) / seg
            a = (a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t)
            out.append(a)
            seg = math.dist(a, b)
            acc = 0.0
        acc += seg
    if math.dist(out[-1], pts[-1]) > step * 0.3:
        out.append(pts[-1])
    else:
        out[-1] = pts[-1]
    return out


def length(pts):
    return sum(math.dist(a, b) for a, b in zip(pts, pts[1:]))


# ── 2. 坐标换算 ──────────────────────────────────────────────────
def to_screen(p):          # 100×130 → 1024 方框的屏幕坐标（y 朝下）
    return (OX + p[0] * S, p[1] * S)


def to_engine(p):          # 屏幕坐标 → 引擎内部坐标（y 朝上）
    return (p[0], 900.0 - p[1])


# ── 3. 轮廓 ─────────────────────────────────────────────────────
def _norm(v):
    L = math.hypot(*v) or 1.0
    return (v[0] / L, v[1] / L)


def _arc(c, r, a0, a1, ccw, n=10):
    """以 c 为圆心从角 a0 转到 a1。ccw=True 取角度增大的方向。"""
    d = a1 - a0
    if ccw and d < 0:
        d += 2 * math.pi
    if not ccw and d > 0:
        d -= 2 * math.pi
    return [(c[0] + r * math.cos(a0 + d * k / n), c[1] + r * math.sin(a0 + d * k / n))
            for k in range(1, n)]


def _sausage(pts, r):
    """一段顺滑的中心线 → 带两个半圆笔帽的闭合轮廓（屏幕坐标）。"""
    if len(pts) == 1:
        return circle(pts[0], r)
    n = len(pts)
    dirs = [_norm((b[0] - a[0], b[1] - a[1])) for a, b in zip(pts, pts[1:])]
    left, right = [], []
    for i in range(n):
        din = dirs[i - 1] if i > 0 else dirs[0]
        dout = dirs[i] if i < n - 1 else dirs[-1]
        m = _norm((-din[1] - dout[1], din[0] + dout[0]))
        p = pts[i]
        left.append((p[0] + m[0] * r, p[1] + m[1] * r))
        right.append((p[0] - m[0] * r, p[1] - m[1] * r))
    d0, d1 = dirs[0], dirs[-1]
    end_cap = _arc(pts[-1], r, math.atan2(d1[0], -d1[1]), math.atan2(-d1[0], d1[1]), ccw=False, n=12)
    start_cap = _arc(pts[0], r, math.atan2(-d0[0], d0[1]), math.atan2(d0[0], -d0[1]), ccw=False, n=12)
    return left + end_cap + right[::-1] + start_cap


def outline(pts, r, corner_deg=40):
    """中心线 → 若干个互相叠着的轮廓（屏幕坐标）。

    在拐角和掉头处把一笔拆成几段顺滑的小段，每段各自带圆头，叠起来就是完整的笔画、
    拐角自然成了圆角。以前是在一整条轮廓上硬算拐角：遇到 b/d/n 那种「竖下去原路折返」
    的 180° 掉头，一侧边线会被收到中心线上，字上就破了个口（2026-09-27 预览里 b 的竖上看得到）。
    各段绕行方向一致，重叠处按 nonzero 规则照样填满，不会互相抵消成洞。"""
    runs, cur = [], [pts[0]]
    for i in range(1, len(pts) - 1):
        cur.append(pts[i])
        a = _norm((pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]))
        b = _norm((pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1]))
        turn = math.degrees(math.acos(max(-1.0, min(1.0, a[0] * b[0] + a[1] * b[1]))))
        if turn > corner_deg:
            runs.append(cur)
            cur = [pts[i]]
    cur.append(pts[-1])
    runs.append(cur)
    return [_sausage(run, r) for run in runs]


def circle(c, r, n=24):
    return [(c[0] + r * math.cos(2 * math.pi * k / n), c[1] + r * math.sin(2 * math.pi * k / n))
            for k in range(n)]


def path_str(poly):
    pts = [to_engine(p) for p in poly]
    return 'M ' + ' L '.join('%d %d' % (round(x), round(y)) for x, y in pts) + ' Z'


def keep_reversals(med, side=8):
    """在「原路折返」的点后面插一个往旁边偏 side 个单位的小点。

    引擎画字时会先过滤「共线」的中线点（hanzi-writer `_filterParallelPoints`），判据是
    两段方向的叉积 == 0 —— 这把**原路折返**（反向共线）也算进去了，折返点被删，
    n/h/m 竖的下半截、B/D/P 的整条竖就画不出来（2026-09-27 用户在 iPad 上看到的缺笔画）。
    汉字从不折返，引擎作者没考虑过。判定用的是没过滤的原始中线，所以只影响显示。
    插一个侧偏点，让折返不再严格共线，就不会被过滤。8 个单位在 1024 坐标里看不出来。"""
    out = [med[0]]
    for i in range(1, len(med)):
        out.append(med[i])
        if i >= len(med) - 1:
            continue
        v1 = (med[i][0] - med[i - 1][0], med[i][1] - med[i - 1][1])
        v2 = (med[i + 1][0] - med[i][0], med[i + 1][1] - med[i][1])
        cross = v1[0] * v2[1] - v1[1] * v2[0]
        dot = v1[0] * v2[0] + v1[1] * v2[1]
        if cross != 0 or dot >= 0:
            continue
        L = math.hypot(*v1) or 1.0
        perp = (-v1[1] / L, v1[0] / L)
        # 偏向折返之后笔要去的那一侧（比如 n 折返后往右拱），看不出来就随便取一侧
        sign = 1
        for j in range(i + 2, len(med)):
            w = (med[j][0] - med[i][0], med[j][1] - med[i][1])
            c = v1[0] * w[1] - v1[1] * w[0]
            if c != 0:
                sign = 1 if (perp[0] * w[0] + perp[1] * w[1]) > 0 else -1
                break
        out.append([med[i][0] + round(perp[0] * side * sign), med[i][1] + round(perp[1] * side * sign)])
    return out


def _is_reversal(a, b, c):
    v1 = (b[0] - a[0], b[1] - a[1]); v2 = (c[0] - b[0], c[1] - b[1])
    return v1[0] * v2[1] - v1[1] * v2[0] == 0 and v1[0] * v2[0] + v1[1] * v2[1] < 0


# ── 组装 ────────────────────────────────────────────────────────
def build_char(strokes):
    outs, meds = [], []
    for d in strokes:
        if d.startswith('dot:'):
            x, y = map(float, d[4:].split(','))
            c = to_screen((x, y))
            outs.append(path_str(circle(c, DOT_R)))
            # 点也要有一条能判定的短中线：从上往下点一下
            meds.append([[round(v) for v in to_engine((c[0], c[1] - 18))],
                         [round(v) for v in to_engine((c[0], c[1] + 18))]])
            continue
        raw = [to_screen(p) for p in parse(d)]
        dense = resample(raw, 6.0)
        outs.append(' '.join(path_str(poly) for poly in outline(dense, WIDTH / 2)))
        L = length(dense)
        k = max(2, int(round(L / 45.0)) + 1)
        sparse = resample(raw, L / (k - 1))
        med = []
        for q in sparse:
            q = [round(v) for v in to_engine(q)]
            # ⚠️ 取整后相邻两点可能重合。引擎会给孩子的笔迹去重，却【不会】给字的中线去重：
            # 长度为 0 的一段算方向夹角得 NaN，这一笔就永远判不过（2026-09-27 m 就是这么卡住的）
            if not med or q != med[-1]:
                med.append(q)
        meds.append(keep_reversals(med))
    # c = 原始中心线（100×130 坐标）。笔顺播放用它自己画（app/latin-play.js），
    # 不用引擎的 animateCharacter —— 见 latin-play.js 文件头
    return {'s': outs, 'm': meds, 'n': len(strokes), 'c': list(strokes)}


def main():
    data = {ch: build_char(st) for ch, st in ALL.items()}
    # 自检：所有点都落在引擎坐标范围内，且中线里没有重合的相邻点
    for ch, g in data.items():
        for med in g['m']:
            for x, y in med:
                assert -10 <= x <= 1034 and -140 <= y <= 910, (ch, x, y)
            assert all(a != b for a, b in zip(med, med[1:])), ('中线有重合点', ch)
            assert not any(_is_reversal(*med[k:k + 3]) for k in range(len(med) - 2)), ('中线有严格共线的折返，引擎会删点', ch)
    js = ('/* 由 build/make_latin.py 生成，别手改。源数据在 build/latin_glyphs.py */\n'
          'window.LATIN=' + json.dumps(data, ensure_ascii=False, separators=(',', ':')) + ';\n')
    out = os.path.join(APP, 'latin.js')
    io.open(out, 'w', encoding='utf-8').write(js)
    print('生成 %d 个字 → app/latin.js（%.1f KB）' % (len(data), len(js) / 1024))
    for ch, g in data.items():
        print('  %s  %d 笔  中线点数 %s' % (ch, g['n'], [len(m) for m in g['m']]))


if __name__ == '__main__':
    main()
