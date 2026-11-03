#!/bin/sh
# Rebuild the whole film (9:16): sh template/build.sh [--vo]
#   --vo  re-synthesise the narration first (MiniMax TTS, see tts.py)
# Env:  FILM_NAME  output file name (default: title.txt in this folder)
#       VIDEOS_ROOT repo with .venv + lib/audio (bgm.py) + brand/avatar.png   (default ~/videos)
#       LIB         Lemo-Opuscar library (render tools, foley)                (default ~/lemo-opuscar)
set -e
SRC=$(cd "$(dirname "$0")" && pwd); P=$(dirname "$SRC"); R=${VIDEOS_ROOT:-$HOME/videos}; LIB=${LIB:-$HOME/lemo-opuscar}
N=${FILM_NAME:-$(cat "$SRC/title.txt" 2>/dev/null || echo film)}; SZ=1080x1920
mkdir -p "$P/build" "$P/deliverables"
[ "$1" = "--vo" ] && (cd $R && .venv/bin/python $SRC/tts.py) && cp $P/build/vo/dur.json $SRC/voices/dur.json
cd $R && .venv/bin/python $SRC/fetch_hanzi.py                                     # stroke data for every board character
cd $LIB && node core/render/events.mjs $SRC --size $SZ --out $P/build/events.json
cd $R && .venv/bin/python $SRC/gen_bgm.py && .venv/bin/python lib/audio/bgm.py $SRC/bgm.json --out $P/build
cd $LIB && .venv/bin/python $SRC/mix.py
cd $LIB && node $SRC/tools/video.mjs $SRC --size $SZ --fps 30 --workers 6 --out $P/build/video30.mp4
AV=$R/brand/avatar.png
if [ -f "$AV" ]; then VF="[2:v]scale=100:100,format=rgba,colorchannelmixer=aa=0.9[av];[0:v][av]overlay=820:120[v];"; IN="-i $AV"; else VF="[0:v]null[v];"; IN=""; fi
cd $P && ffmpeg -y -loglevel error -i build/video30.mp4 -i build/mix.wav $IN -filter_complex "${VF}[1:a]loudnorm=I=-14:TP=-2:LRA=11,aresample=48000[a]" -map "[v]" -map "[a]" -c:v libx264 -crf 19 -preset medium -pix_fmt yuv420p -r 30 -c:a aac -b:a 192k -movflags +faststart -shortest "deliverables/$N.mp4"
cd $LIB && node $SRC/tools/subs.mjs && .venv/bin/python core/render/srt.py $P/build/subs.json "$P/deliverables/$N.srt"
cd $LIB && for k in hook b1 b2 b3 all; do t=$(python3 $SRC/times.py $k); node core/render/still.mjs $SRC $t --size $SZ --q 'nosubs=1&nopens=1' --prefix "${k}_" --out $P/build/stills >/dev/null; cp "$P/build/stills/${k}_$t.jpg" "$P/build/stills/$k.jpg"; done
cd $LIB && (node $SRC/tools/phonecheck.mjs $SRC --ocr || echo "phonecheck: 有问题，详见 build/phonecheck.json（不阻断出片，交付前处理）")   # phone readability
cd $R && .venv/bin/python $SRC/cards.py
cd $P/deliverables && rm -f "${N}_全套.zip" && zip -qr "${N}_全套.zip" . -x "*.zip"
echo built "$P/deliverables/$N.mp4"
