"""Line art (black lines on white, e.g. a generated textbook-style portrait) → pen strokes the board can draw one by one.

    python tools/trace_lineart.py <image.png> <out.json> [--show 420] [--height 1000] [--min-len 6]
    → <out>.json (strokes) + <out>.png (the drawing with a transparent background, what the board reveals)

Steps: binarise → drop specks → skeleton (the centre line of every ink line) + distance map (its width) → walk the skeleton
into polylines (split at junctions, then joined back where a line clearly continues) → simplify → order like a hand would
draw (top to bottom in bands, long contours before short details) → JSON {w, h, paths: [{p: [x,y,...], w}]} in image pixels.
"""
import json, sys, math
import numpy as np
from PIL import Image
from scipy import ndimage as ndi
from skimage.morphology import skeletonize, remove_small_objects

args = sys.argv[1:]
def opt(k, d):
    return type(d)(args[args.index(k) + 1]) if k in args else d
src, out = args[0], args[1]
H, MINLEN = opt('--height', 1000), opt('--min-len', 6)

img = Image.open(src).convert('L')
# crop to the drawing, then scale to the working height
a = np.asarray(img); ink = a < 140
ys, xs = np.nonzero(ink); pad = 8
img = img.crop((max(0, xs.min() - pad), max(0, ys.min() - pad), min(a.shape[1], xs.max() + pad), min(a.shape[0], ys.max() + pad)))
# the picture the board reveals: same crop, ink as alpha (white paper becomes transparent), at most 1600 px tall
# --show: about how tall (px) it will appear on the board; lines are thickened so they still read like marker lines at that size
SHOW = opt('--show', 420)
pic = img.copy(); pic.thumbnail((4000, SHOW * 2), Image.LANCZOS)
from PIL import ImageFilter
pic = pic.filter(ImageFilter.MinFilter(3))
al = np.clip((235 - np.asarray(pic).astype(np.float32)) * 255 / 150, 0, 255).astype(np.uint8)
rgba = np.zeros((*al.shape, 4), np.uint8); rgba[..., 0:3] = 30; rgba[..., 3] = al
Image.fromarray(rgba, 'RGBA').save(out.rsplit('.', 1)[0] + '.png')
s = H / img.height; img = img.resize((round(img.width * s), H), Image.LANCZOS)
a = np.asarray(img).astype(np.float32)
ink = a < 150
ink = remove_small_objects(ink, max_size=12)
ink = ndi.binary_closing(ink, iterations=1)
dist = ndi.distance_transform_edt(ink)
sk = skeletonize(ink)

# ---- walk the skeleton
NB = [(-1, -1), (-1, 0), (-1, 1), (0, -1), (0, 1), (1, -1), (1, 0), (1, 1)]
pix = set(zip(*np.nonzero(sk)))
def nbrs(p):
    y, x = p
    return [(y + dy, x + dx) for dy, dx in NB if (y + dy, x + dx) in pix]
deg = {p: len(nbrs(p)) for p in pix}
junction = {p for p, d in deg.items() if d >= 3}
seen_edge = set()
def key(a, b): return (a, b) if a < b else (b, a)
paths = []
def walk(start, nxt):
    path = [start, nxt]; seen_edge.add(key(start, nxt)); prev, cur = start, nxt
    while cur not in junction:
        cand = [q for q in nbrs(cur) if key(cur, q) not in seen_edge and q != prev]
        if not cand: break
        # keep going straight
        dy, dx = cur[0] - prev[0], cur[1] - prev[1]
        cand.sort(key=lambda q: -((q[0] - cur[0]) * dy + (q[1] - cur[1]) * dx))
        q = cand[0]; seen_edge.add(key(cur, q)); path.append(q); prev, cur = cur, q
    return path
for p in sorted(pix, key=lambda p: (deg[p] != 1, p)):          # endpoints first, then junctions, then loops
    if deg[p] == 1 or p in junction:
        for q in nbrs(p):
            if key(p, q) not in seen_edge: paths.append(walk(p, q))
for p in sorted(pix):                                          # closed loops
    for q in nbrs(p):
        if key(p, q) not in seen_edge: paths.append(walk(p, q))

# ---- join segments that meet at a junction and continue in the same direction (a junction splits one line into many)
def direction(path, at_end):
    seg = path[-6:] if at_end else path[:6][::-1]
    (y0, x0), (y1, x1) = seg[0], seg[-1]
    n = math.hypot(y1 - y0, x1 - x0) or 1
    return ((y1 - y0) / n, (x1 - x0) / n)
changed = True
while changed:
    changed = False
    ends = {}
    for i, pth in enumerate(paths):
        if pth is None: continue
        for at_end in (False, True):
            e = pth[-1] if at_end else pth[0]
            if e in junction: ends.setdefault(e, []).append((i, at_end))
    for j, lst in ends.items():
        best = None
        for a_ in range(len(lst)):
            for b_ in range(a_ + 1, len(lst)):
                (i, ea), (k, eb) = lst[a_], lst[b_]
                if i == k or paths[i] is None or paths[k] is None: continue
                da, db = direction(paths[i], ea), direction(paths[k], eb)
                c = -(da[0] * db[0] + da[1] * db[1])              # both point into the junction: straight = -1·-1
                if c > .8 and (best is None or c > best[0]): best = (c, i, ea, k, eb)
        if best:
            _, i, ea, k, eb = best
            A = paths[i] if ea else paths[i][::-1]; Bp = paths[k][::-1] if eb else paths[k]
            paths[i] = A + Bp[1:]; paths[k] = None; changed = True
paths = [p for p in paths if p is not None]

# ---- simplify (Ramer–Douglas–Peucker), widths, filter
def rdp(P, eps):
    if len(P) < 3: return P
    (y0, x0), (y1, x1) = P[0], P[-1]; L = math.hypot(y1 - y0, x1 - x0) or 1e-9
    d = [abs((x1 - x0) * (y0 - y) - (x0 - x) * (y1 - y0)) / L for y, x in P[1:-1]]
    i = int(np.argmax(d)) + 1
    return rdp(P[:i + 1], eps)[:-1] + rdp(P[i:], eps) if d[i - 1] > eps else [P[0], P[-1]]
res = []
for p in paths:
    L = sum(math.hypot(p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1]) for i in range(1, len(p)))
    if L < MINLEN: continue
    w = float(np.median([dist[y, x] for y, x in p])) * 2
    q = rdp(p, .7)
    res.append({'p': [round(float(v), 1) for y, x in q for v in (x, y)], 'w': round(max(1.5, w), 2), 'len': L, 'y0': int(min(y for y, _ in p))})

# ---- drawing order: bands from top to bottom; inside a band, long lines first (contours before details)
BAND = H / 8
res.sort(key=lambda r: (int(r['y0'] // BAND), -r['len']))
for r in res: r.pop('len'); r.pop('y0')
json.dump({'w': img.width, 'h': img.height, 'paths': res}, open(out, 'w'), separators=(',', ':'))
print(f'{len(res)} strokes, {sum(len(r["p"]) // 2 for r in res)} points → {out}')
