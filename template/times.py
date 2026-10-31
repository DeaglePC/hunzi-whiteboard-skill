"""Key moments for stills, from build/events.json + lines.json: the opening, the end of each board, the overview."""
import json, os, sys
HERE = os.path.dirname(os.path.abspath(__file__)); B = os.path.join(os.path.dirname(HERE), 'build')
d = json.load(open(os.path.join(B, 'events.json'))); vo = {e['id']: e['t'] for e in d['ev'] if e['type'] == 'vo'}
L = json.load(open(os.path.join(HERE, 'lines.json'))); first = {l['board']: l['id'] for l in L if l.get('board')}
T = {'hook': 3.2, 'b1': round(vo[first[2]] - 2.3, 2), 'b2': round(vo[first[3]] - 2.3, 2), 'b3': round(d['dur'] - 4.2, 2), 'all': round(d['dur'] - .3, 2)}
print(T[sys.argv[1]] if len(sys.argv) > 1 else T)
