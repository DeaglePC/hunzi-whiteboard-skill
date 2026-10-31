"""MiniMax TTS per line → build/vo/<id>.wav, durations → build/vo/dur.json"""
import json, os, subprocess, sys, time
VOICE, SPEED = 'male-qn-jingying', '1.0'   # 梳理类白板片：语速 1.0（1.15 用户嫌快）
HERE = os.path.dirname(os.path.abspath(__file__)); P = os.path.dirname(HERE); OUT = os.path.join(P, 'build', 'vo')
os.makedirs(OUT, exist_ok=True)
lines = json.load(open(os.path.join(HERE, 'lines.json')))
only = set(sys.argv[1:])
for L in lines:
    if only and L['id'] not in only: continue
    mp3 = os.path.join(OUT, L['id'] + '.mp3')
    for k in range(4):
        r = subprocess.run(['mmx', 'speech', 'synthesize', '--text', L.get('tts', L['text']), '--voice', VOICE, '--speed', SPEED,
                            '--language', 'Chinese', '--out', mp3, '--quiet'], capture_output=True, text=True)
        if r.returncode == 0 and os.path.exists(mp3): break
        print(L['id'], 'retry', r.stderr[-200:]); time.sleep(15)
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', mp3, '-ar', '48000', '-ac', '1',
                    '-af', 'silenceremove=start_periods=1:start_threshold=-45dB,areverse,silenceremove=start_periods=1:start_threshold=-45dB,areverse',
                    os.path.join(OUT, L['id'] + '.wav')], check=True)
    time.sleep(2)
dur = {}
for L in lines:
    w = os.path.join(OUT, L['id'] + '.wav')
    if os.path.exists(w):
        dur[L['id']] = float(subprocess.check_output(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', w]))
json.dump(dur, open(os.path.join(OUT, 'dur.json'), 'w'), indent=1)
print(dur, sum(dur.values()))
