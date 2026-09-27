# 用法：from hwmatch import match, user_curve —— 改字母数据前，用它模拟孩子的写法偏差、检查会不会误判
# hanzi-writer 3.7.0 的笔画判定（strokeMatches / getMatchData），逐行移植，用来做敏感性分析
import math, json, re, sys
sys.path.insert(0, __import__('os').path.dirname(__import__('os').path.abspath(__file__)))
import make_latin as ML
def dist(a,b): return math.hypot(a[0]-b[0], a[1]-b[1])
def length(c): return sum(dist(a,b) for a,b in zip(c,c[1:]))
def ext(p1,p2,d):
    vx,vy=p2[0]-p1[0],p2[1]-p1[1]; n=math.hypot(vx,vy); m=d/n; return (p2[0]+m*vx,p2[1]+m*vy)
def subdiv(c,maxLen=0.05):
    o=[c[0]]
    for p in c[1:]:
        q=o[-1]; L=dist(p,q)
        if L>maxLen:
            n=math.ceil(L/maxLen); s=L/n
            for i in range(n): o.append(ext(p,q,-1*s*(i+1)))
        else: o.append(p)
    return o
def outline(c,n=30):
    L=length(c); seg=L/(n-1); o=[c[0]]; rem=list(c[1:])
    for i in range(n-2):
        lp=o[-1]; rd=seg; f=False
        while not f:
            nd=dist(lp,rem[0])
            if nd<rd: rd-=nd; lp=rem.pop(0)
            else: o.append(ext(lp,rem[0],rd-nd)); f=True
    o.append(c[-1]); return o
def norm(c):
    o=outline(c); mx=sum(p[0] for p in o)/len(o); my=sum(p[1] for p in o)/len(o)
    t=[(p[0]-mx,p[1]-my) for p in o]
    sc=math.sqrt((t[0][0]**2+t[0][1]**2+t[-1][0]**2+t[-1][1]**2)/2)
    return subdiv([(p[0]/sc,p[1]/sc) for p in t])
def rot(c,th): return [(math.cos(th)*p[0]-math.sin(th)*p[1], math.sin(th)*p[0]+math.cos(th)*p[1]) for p in c]
def frechet(c1,c2):
    L,S=(c1,c2) if len(c1)>=len(c2) else (c2,c1); prev=[]
    for i in range(len(L)):
        cur=[]
        for j in range(len(S)):
            d=dist(L[i],S[j])
            if i==0 and j==0: v=d
            elif j==0: v=max(prev[0],d)
            elif i==0: v=max(cur[-1],d)
            else: v=max(min(prev[j],prev[j-1],cur[-1]),d)
            cur.append(v)
        prev=cur
    return prev[-1]
def cos(a,b):
    na=math.hypot(*a); nb=math.hypot(*b); return (a[0]*b[0]+a[1]*b[1])/(na*nb)
def match(user, med, leniency=1.0, outline_visible=False, stroke_num=0):
    distMod = 0.5 if (outline_visible or stroke_num>0) else 1
    avgD = sum(min(dist(p,q) for q in med) for p in user)/len(user)
    r = {'avgDist': avgD <= 350*distMod*leniency}
    r['startEnd'] = dist(med[0],user[0]) <= 250*leniency and dist(med[-1],user[-1]) <= 250*leniency
    ev=[(b[0]-a[0],b[1]-a[1]) for a,b in zip(user,user[1:])]; sv=[(b[0]-a[0],b[1]-a[1]) for a,b in zip(med,med[1:])]
    r['direction'] = sum(max(cos(s,e) for s in sv) for e in ev)/len(ev) > 0
    n1,n2=norm(user),norm(med); fr=min(frechet(n1,rot(n2,th)) for th in (math.pi/16,math.pi/32,0,-math.pi/32,-math.pi/16))
    r['shape'] = fr <= 0.4*leniency; r['_frechet']=round(fr,3)
    r['length'] = leniency*(length(user)+25)/(length(med)+25) >= 0.35
    r['ok'] = all(v for k,v in r.items() if not k.startswith('_'))
    return r
def user_curve(d, fn):
    """把中心线路径按 fn 变形（100×130 坐标），换算成引擎坐标，模拟每 ~10 单位一个触点"""
    pts=[fn(p) for p in ML.parse(d)]
    pts=ML.resample([ML.to_screen(p) for p in pts], 10.0)
    return [ML.to_engine(p) for p in pts]
