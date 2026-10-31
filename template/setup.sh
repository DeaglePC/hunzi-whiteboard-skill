#!/bin/sh
# One-time setup for a new film folder made from this template:  sh <film>/src/setup.sh
#  - EMS Tech single-line font (latin / digits on the board) from the Lemo-Opuscar library
#  - LXGW WenKai (subtitles, covers, cards), downloaded once and subset to the narration's characters
set -e
SRC=$(cd "$(dirname "$0")" && pwd); P=$(dirname "$SRC"); R=${VIDEOS_ROOT:-$HOME/videos}; LIB=${LIB:-$HOME/lemo-opuscar}
mkdir -p "$SRC/fonts" "$SRC/hanzi" "$SRC/voices" "$P/assets/fonts" "$P/build" "$P/deliverables"
cp "$LIB/styles/whiteboard/demo/fonts/EMSTech.json" "$SRC/fonts/"
WK="$P/assets/fonts/LXGWWenKai-Medium.ttf"
[ -s "$WK" ] || curl -sL -o "$WK" https://github.com/lxgw/LxgwWenKai/releases/download/v1.530/LXGWWenKai-Medium.ttf
"$R/.venv/bin/python" -m fontTools.subset "$WK" --text-file="$SRC/lines.json" --text="0123456789×—？！ “”" --output-file="$SRC/fonts/wenkai-sub.ttf"
echo "setup ok — next: write lines.json, sh $SRC/build.sh --vo"
