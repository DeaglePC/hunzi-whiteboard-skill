"""bgm.json from build/events.json + lines.json: one music section per chapter (lines with "sec"), the big impact as the hero."""
import json, os
HERE = os.path.dirname(os.path.abspath(__file__)); B = os.path.join(os.path.dirname(HERE), 'build')
d = json.load(open(os.path.join(B, 'events.json'))); E = d['ev']
vo = {e['id']: e['t'] for e in E if e['type'] == 'vo'}
chap = [l['id'] for l in json.load(open(os.path.join(HERE, 'lines.json'))) if l.get('sec')]
imp = next((e['t'] for e in E if e['type'] == 'impact'), None)
sections = [0] + [round(vo[c] - .3, 2) for c in chap]
levels = [0.45] + [0.6 + 0.3 * ((i % 3) / 2) for i in range(len(chap))]   # gentle rise and fall chapter by chapter
levels[-1] = 0.55                                                           # the ending breathes out
if imp is not None:
    i = max(k for k, s in enumerate(sections) if s <= imp); sections.insert(i + 1, round(imp, 2)); levels.insert(i + 1, 1.0)
cfg = {'duration': round(d['dur'], 2), 'recipe': 'explainer', 'recipe_kw': {'key': 'F', 'bpm': 104}, 'sections': sections, 'levels': levels, 'music_lufs': -24}
if imp is not None: cfg['hero'] = round(imp, 2)
json.dump(cfg, open(os.path.join(HERE, 'bgm.json'), 'w'), indent=1)
print(len(sections), 'sections, hero', imp)
