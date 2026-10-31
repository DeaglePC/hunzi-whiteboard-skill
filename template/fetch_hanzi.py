"""Stroke-order medians for every Chinese character the board writes → hanzi/hz.json.
Data: hanzi-writer-data (Make Me a Hanzi, Arphic Public License), fetched from jsDelivr, not stored in this repo.
Characters the data set lacks: add a composition to COMPOSE (left part, its x, its width share) or use another
written form on the board (e.g. 曹叡 → 曹睿); missing ones are listed and render as '?'."""
import json, os, urllib.request, urllib.parse
HERE = os.path.dirname(os.path.abspath(__file__)); OUT = os.path.join(HERE, 'hanzi', 'hz.json')
COMPOSE = {'珪': [('王', 0, .42), ('圭', 430, .58)]}
src = open(os.path.join(HERE, 'film.js'), encoding='utf-8').read()
chars = sorted(set(c for c in src if '一' <= c <= '鿿'))
d = json.load(open(OUT)) if os.path.exists(OUT) else {}
get = lambda c: json.load(urllib.request.urlopen('https://cdn.jsdelivr.net/npm/hanzi-writer-data@2.0.1/' + urllib.parse.quote(c) + '.json', timeout=30))['medians']
miss = []
for c in chars:
    if c in d: continue
    try: d[c] = get(c)
    except Exception:
        if c in COMPOSE:
            parts = []
            for p, x0, sx in COMPOSE[c]:
                m = d.get(p) or get(p); d.setdefault(p, m); parts += [[[round(x0 + x * sx), y] for x, y in s] for s in m]
            d[c] = parts
        else: miss.append(c)
os.makedirs(os.path.dirname(OUT), exist_ok=True); json.dump(d, open(OUT, 'w'), separators=(',', ':'))
print(len(d), 'glyphs', '| missing (comments only are fine):', ''.join(miss) or 'none')
