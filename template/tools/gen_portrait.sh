#!/bin/sh
# Textbook-style line-art portrait via Codex image generation, then traced into pen strokes.
#   sh tools/gen_portrait.sh <name> "<who, look, costume, pose>" [show_px]
#   → src/art/<name>.png (raw) + src/art/art_<name>.json / .png (strokes + the transparent drawing the board reveals)
# Needs: codex (logged in, feature image_generation on), ~/videos/.venv with scikit-image.
set -e
SRC=$(cd "$(dirname "$0")/.." && pwd); A=$SRC/art; mkdir -p $A
NAME=$1; WHO=$2; SHOW=${3:-420}
STYLE="in the style of a hand-drawn whiteboard illustration with a black fine-tip marker, like a Chinese history-teacher's whiteboard drawing or a textbook line illustration: clean confident contour lines of fairly even weight, expressive realistic face, only a few short hatching strokes in the deepest clothing folds (no dense cross-hatching, no shading fills), pure white background, black lines only, no color, no gray, no text, no frame, no signature. Half-length, portrait orientation, figure centered filling about 80% of the height."
codex exec --skip-git-repo-check --sandbox workspace-write -C "$A" "Use your image generation tool to create ONE image and save it as $A/$NAME.png (copy the generated file there). Image: $WHO $STYLE Reply with just the saved path." < /dev/null > "$A/$NAME.log" 2>&1
[ -f "$A/$NAME.png" ] || { echo "no image, see $A/$NAME.log"; exit 1; }
${VENV:-$HOME/videos/.venv}/bin/python $SRC/tools/trace_lineart.py "$A/$NAME.png" "$A/art_$NAME.json" --show $SHOW
