// Code-only tricks a hand-drawn board can't do (2026-11-03):
//   1. camera tour   — one dense board, the camera goes to the part being explained and comes back to the whole board
//   2. spotlight     — whoever the narration names glows and pops; finished ink elsewhere fades back for a moment
//   3. label table   — every board label with its world box, for tools/phonecheck.mjs (is it readable on a phone?)
// All of it is deterministic in t, so stills, renders and checks agree.
import * as W from './wb.js';

export const SAFE = { x0: 140, x1: 940, y0: 360, y1: 1350 };   // where board content must sit on a 1080×1920 screen
const ease = u => u * u * (3 - 2 * u);

// camera view {x, y, z} that puts world box [x0,y0,x1,y1] in the safe area; clamp = [X0,Y0,X1,Y1] keeps the view inside a board panel
export function fitView(box, o = {}) {
  const pad = o.pad ?? 50, bw = box[2] - box[0] + 2 * pad, bh = box[3] - box[1] + 2 * pad;
  const z = Math.min((SAFE.x1 - SAFE.x0) / bw, (SAFE.y1 - SAFE.y0) / bh, o.zmax ?? 1.7);
  let x = (box[0] + box[2]) / 2 + (W.VIEW.w / 2 - (SAFE.x0 + SAFE.x1) / 2) / z;
  let y = (box[1] + box[3]) / 2 + (W.VIEW.h / 2 - (SAFE.y0 + SAFE.y1) / 2) / z;
  if (o.clamp) {
    const [X0, Y0, X1, Y1] = o.clamp, hw = W.VIEW.w / 2 / z, hh = W.VIEW.h / 2 / z;
    if (X1 - X0 > 2 * hw) x = Math.min(Math.max(x, X0 + hw), X1 - hw);
    if (Y1 - Y0 > 2 * hh) y = Math.min(Math.max(y, Y0 + hh), Y1 - hh);
  }
  return { x, y, z };
}

// Merge "looks" into a base camera (keys [t, x, y, z, rot?, ease?]).
// look = {t0, t1, box, zmax?, pad?, clamp?}: the camera arrives at t0 (moving in over IN s), holds until t1, then goes back (OUT s).
// Looks closer than IN+OUT+hold go straight from one part of the board to the next. A look that would hide a move of the
// base camera (a board change, a punch-in) is dropped with a warning.
export function withLooks(CK, looks, o = {}) {
  const IN = o.in ?? .8, OUT = o.out ?? .9, HOLD = o.hold ?? .6;
  const base = new W.Camera(CK), same = (a, b) => Math.abs(a.x - b.x) < 1 && Math.abs(a.y - b.y) < 1 && Math.abs(a.z - b.z) < .005;
  const L = looks.filter(l => l.t1 - l.t0 > .6).sort((a, b) => a.t0 - b.t0).filter(l => {
    const moves = CK.some(k => k[0] > l.t0 - IN - .05 && k[0] < l.t1 + OUT + .05 && !same(base.at(k[0]), base.at(l.t0 - IN)));
    if (moves) console.warn(`look ${l.t0.toFixed(1)}–${l.t1.toFixed(1)} crosses a camera move, dropped`);
    return !moves;
  });
  for (let i = 1; i < L.length; i++) if (L[i].t0 < L[i - 1].t1 + IN) L[i - 1].t1 = Math.max(L[i - 1].t0 + .6, L[i].t0 - IN);   // no overlaps
  const out = CK.filter(k => !L.some(l => k[0] > l.t0 - IN - .05 && k[0] < l.t1 + OUT + .05));
  L.forEach((l, i) => {
    const v = l.view || fitView(l.box, l), prev = L[i - 1], next = L[i + 1];
    const chainIn = prev && l.t0 - prev.t1 < IN + OUT + HOLD, chainOut = next && next.t0 - l.t1 < IN + OUT + HOLD;
    if (!chainIn) { const b = base.at(l.t0 - IN); out.push([l.t0 - IN, b.x, b.y, b.z, 0, 'l']); }
    else out.push([Math.max(prev.t1, l.t0 - IN), prev.v.x, prev.v.y, prev.v.z, 0, 'l']);
    out.push([l.t0, v.x, v.y, v.z, 0, 'io'], [l.t1, v.x, v.y, v.z, 0, 'l']);
    if (!chainOut) { const b = base.at(l.t1 + OUT); out.push([l.t1 + OUT, b.x, b.y, b.z, 0, 'io']); }
    l.v = v;
  });
  return out.sort((a, b) => a[0] - b[0]);
}

// Looks from the narration: consecutive lines are merged while the box around what they draw still lets the camera move in
// by ≥ minGain; a chapter (a line with sec / board) always closes the look a little early, so the whole board shows for a
// breath before the next part. skip(stroke) leaves out strokes that shouldn't steer the camera (the header, the opening).
export function chapterLooks({ tl, lines, VO, vend, base, panel, skip = () => false, minGain = 1.2, zmax = 1.6, from = 0, minDur = 3 }) {
  const cam = new W.Camera(base), looks = [], U = (a, b) => [Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.max(a[2], b[2]), Math.max(a[3], b[3])];
  const segs = lines.map((l, i) => {
    const t0 = VO[l.id], nx = lines[i + 1], t1 = nx ? VO[nx.id] - .3 : vend(l.id) + .5;
    const S = tl.strokes.filter(s => s.t0 >= t0 - .3 && s.t0 < t1 && !skip(s));
    return { l, t0, t1, end: vend(l.id), S, box: S.length ? S.reduce((b, s) => U(b, s.box), [1e9, 1e9, -1e9, -1e9]) : null };
  }).filter(g => g.t0 >= from);
  // don't cut things in half at the frame edge: anything (one drawing job) the view slices through is pulled in, as long as
  // the camera still moves in by ≥ minGain; otherwise keep the tighter view
  const jobBox = {}; for (const s of tl.strokes) { if (skip(s)) continue; const b = jobBox[s.job]; jobBox[s.job] = b ? { box: U(b.box, s.box), t0: Math.min(b.t0, s.t0) } : { box: [...s.box], t0: s.t0 }; }
  const complete = (box, v, tEnd, pn, z0) => {
    for (let it = 0; it < 6; it++) {
      const hw = W.VIEW.w / 2 / v.z, hh = W.VIEW.h / 2 / v.z, R = [v.x - hw, v.y - hh, v.x + hw, v.y + hh];
      const cut = Object.values(jobBox).filter(({ box: b, t0 }) => t0 <= tEnd && b[0] < R[2] && b[2] > R[0] && b[1] < R[3] && b[3] > R[1] && !(b[0] >= R[0] && b[2] <= R[2] && b[1] >= R[1] && b[3] <= R[3]))
        .sort((a, b) => (a.box[2] - a.box[0]) * (a.box[3] - a.box[1]) - (b.box[2] - b.box[0]) * (b.box[3] - b.box[1]));
      let moved = false;
      for (const j of cut) { const g = U(box, j.box), v2 = fitView(g, { zmax, clamp: pn }); if (v2.z >= z0 * minGain) { box = g; v = v2; moved = true; break; } }
      if (!moved) break;
    }
    return { box, v };
  };
  let cur = null;
  const close = (chapterEnd) => {
    if (!cur) return; const S = cur.S; cur.t1e = chapterEnd ? cur.end - .5 : cur.t1;
    if (S.length >= 3 && cur.t1e - cur.t0 >= minDur) {
      const pn = panel(cam.at(cur.t0)), { box, v } = complete(cur.box, cur.v, cur.t1e, pn, cam.at(cur.t0).z);
      looks.push({ t0: Math.max(cur.t0 - .2, S[0].t0 - .3), t1: cur.t1e, box, view: v, chapter: cur.l.id });
    }
    cur = null;
  };
  for (const g of segs) {
    if (g.l.sec || g.l.board) close(true);
    const b = cam.at(g.t0), pn = panel(b);
    if (!cur) { if (!g.box) continue; const v = fitView(g.box, { zmax, clamp: pn }); if (v.z >= b.z * minGain) cur = { ...g, S: [...g.S], v }; continue; }
    const box = g.box ? U(cur.box, g.box) : cur.box, v = fitView(box, { zmax, clamp: pn });
    if (v.z >= b.z * minGain) Object.assign(cur, { box, v, t1: g.t1, end: g.end, S: cur.S.concat(g.S) });
    else { close(false); if (g.box) { const v1 = fitView(g.box, { zmax, clamp: pn }); if (v1.z >= b.z * minGain) cur = { ...g, S: [...g.S], v: v1 }; } }
  }
  close(true);
  return looks;
}

// Spotlight windows from the narration: when a line names a group (a person drawn earlier), that group lights up.
// groups: {name: [x0,y0,x1,y1]}; drawnAt: {name: t when its drawing finished}. Windows that would light ≥ maxOn groups at once
// (a roll-call of names) are skipped; overlapping windows merge.
export function autoSpots({ lines, at, groups, drawnAt, dur = 1.5, maxOn = 3, from = 0 }) {
  const W0 = [];
  for (const l of lines) for (const g of Object.keys(groups)) {
    let k = 0, i = -1;
    while ((i = l.text.indexOf(g, i + 1)) >= 0) {
      const t = at(l.id, g, k++);
      if (t >= from && drawnAt[g] != null && drawnAt[g] < t - .3) W0.push({ t0: t - .1, t1: t + dur, on: new Set([g]) });
    }
  }
  W0.sort((a, b) => a.t0 - b.t0);
  const out = [];
  for (const w of W0) { const p = out[out.length - 1]; if (p && w.t0 < p.t1 + .25) { p.t1 = Math.max(p.t1, w.t1); w.on.forEach(g => p.on.add(g)); } else out.push({ ...w, on: new Set(w.on) }); }
  return out.filter(w => w.on.size < maxOn + 1);
}

// Board.spot function from windows [{t0, t1, on:Set}]; fades in/out over `fade` s, pops by `pop` at the start
export function spotlight(windows, boxes, o = {}) {
  const fade = o.fade ?? .25, dim = o.dim ?? .4, pop = o.pop ?? .06;
  return t => {
    const w = windows.find(w => t > w.t0 && t < w.t1 + fade); if (!w) return null;
    const k = ease(Math.min(1, (t - w.t0) / fade, Math.max(0, (w.t1 + fade - t) / fade)));
    const u = (t - w.t0) / .45, p = u < 1 ? Math.sin(Math.PI * u) * pop : 0;
    return { on: w.on, k, t0: w.t0, dim, pop: p, box: boxes };
  };
}

// Label table for the phone check: labels = [{text, h, strokes, tag}] collected by the film's txt(); returns world boxes + draw times
export function labelTable(labels) {
  return labels.filter(l => l.strokes.length && l.strokes[0].t0 < 1e8).map((l, i) => {
    const S = l.strokes, box = S.reduce((b, s) => [Math.min(b[0], s.box[0]), Math.min(b[1], s.box[1]), Math.max(b[2], s.box[2]), Math.max(b[3], s.box[3])], [1e9, 1e9, -1e9, -1e9]);
    return { i, text: l.text, h: l.h, tag: l.tag || S[0].tag || '', job: S[0].job, box, t0: Math.min(...S.map(s => s.t0)), t1: Math.max(...S.map(s => s.t1)) };
  });
}

// Phone check, run in the page (tools/phonecheck.mjs calls window.__PHONECHECK()).
//   small   — the label is never shown at ≥ minPx character height on the 1080-wide screen (too small to read on a phone)
//   shot    — in the final screenshot frame the label is below shotPx (the "知识图" a viewer saves won't read)
//   overlap — two labels from different drawing jobs overlap
//   crossed — a line from another job runs through the label
//   unsafe  — when it is drawn, the label is outside the safe area (x 140–940, y 360–1350)
export function phoneCheck({ labels, tl, cam, END, minPx = 30, shotPx = 20, skipTags = ['header'], shotT }) {
  const T = labels, S = tl.strokes, E = tl.erasers, issues = [];
  const inBox = (x, y, b, m = 0) => x > b[0] - m && x < b[2] + m && y > b[1] - m && y < b[3] + m;
  const shrink = (b, f) => { const dx = (b[2] - b[0]) * f, dy = (b[3] - b[1]) * f; return [b[0] + dx, b[1] + dy, b[2] - dx, b[3] - dy]; };
  const erasedAt = (box, after) => { for (const e of E) if (e.t0 > after) { const p = e.path.pts; for (let i = 0; i < p.length; i += 6) if (inBox(p[i], p[i + 1], box, e.width / 2 - 10)) return e.t0 + (e.t1 - e.t0) * (i / p.length); } return Infinity; };
  const scr = (b, c) => { const [x0, y0] = W.toScreen(c, b[0], b[1]), [x1, y1] = W.toScreen(c, b[2], b[3]); return [x0, y0, x1, y1]; };
  for (const l of T) { l.gone = Math.min(END, erasedAt(shrink(l.box, .3), l.t1)); }
  const tShot = shotT ?? END - .3;
  for (const l of T) {
    if (l.gone <= l.t1 + .2) continue;
    let best = 0, bt = 0;
    for (let t = l.t1; t < l.gone; t += .25) {
      const c = cam.at(t), b = scr(l.box, c);
      if (b[0] < -10 || b[2] > W.VIEW.w + 10 || b[1] < -10 || b[3] > W.VIEW.h + 10) continue;
      if (l.h * c.z > best) { best = l.h * c.z; bt = t; }
    }
    l.best = +best.toFixed(1);
    if (best < minPx) issues.push({ kind: 'small', text: l.text, px: l.best, t: +bt.toFixed(1), need: minPx });
    if (l.gone >= tShot) { const c = cam.at(tShot), px = l.h * c.z; if (px < shotPx) issues.push({ kind: 'shot', text: l.text, px: +px.toFixed(1), need: shotPx }); }
    if (!skipTags.includes(l.tag)) {
      const b = scr(l.box, cam.at(l.t1));
      if (b[0] < SAFE.x0 - 10 || b[2] > SAFE.x1 + 10 || b[1] < SAFE.y0 - 10 || b[3] > SAFE.y1 + 10) issues.push({ kind: 'unsafe', text: l.text, t: +l.t1.toFixed(1), screen: b.map(Math.round) });
    }
  }
  for (let i = 0; i < T.length; i++) for (let j = i + 1; j < T.length; j++) {
    const a = T[i], b = T[j]; if (a.job === b.job) continue;
    const lo = Math.max(a.t1, b.t1), hi = Math.min(a.gone, b.gone); if (hi - lo < .3) continue;
    const A = shrink(a.box, .12), B = shrink(b.box, .12);
    if (A[0] < B[2] && B[0] < A[2] && A[1] < B[3] && B[1] < A[3]) issues.push({ kind: 'overlap', text: a.text, other: b.text, t: +lo.toFixed(1) });
  }
  for (const l of T) {
    const B = shrink(l.box, .15), hit = new Map();
    for (const s of S) {
      if (s.job === l.job || s.kind === 'text' || s.t0 > l.gone || s.box[0] > B[2] || s.box[2] < B[0] || s.box[1] > B[3] || s.box[3] < B[1]) continue;
      let n = 0; const p = s.pts; for (let i = 0; i < p.length; i += 2) if (inBox(p[i], p[i + 1], B)) n++;
      if (n >= 3 && erasedAt(B, s.t1) > l.t1 && erasedAt(B, Math.max(s.t1, l.t1)) > Math.max(s.t1, l.t1) + .3) hit.set(s.tag || s.kind, (hit.get(s.tag || s.kind) || 0) + n);
    }
    if (hit.size) issues.push({ kind: 'crossed', text: l.text, by: [...hit.keys()].join(','), t: +l.t1.toFixed(1) });
  }
  const count = k => issues.filter(i => i.kind === k).length;
  return { labels: T.length, minPx, shotPx, summary: Object.fromEntries(['small', 'shot', 'overlap', 'crossed', 'unsafe'].map(k => [k, count(k)])), issues, best: T.map(l => [l.text, l.best]) };
}

// labels fully on screen at t (drawn, not erased) — what a viewer could read in that frame
export function onScreen(labels, cam, t) {
  const c = cam.at(t);
  return labels.filter(l => l.t1 <= t && (l.gone ?? Infinity) > t).filter(l => {
    const [x0, y0] = W.toScreen(c, l.box[0], l.box[1]), [x1, y1] = W.toScreen(c, l.box[2], l.box[3]);
    return x0 >= 0 && y0 >= 0 && x1 <= W.VIEW.w && y1 <= W.VIEW.h;
  }).map(l => l.text);
}
