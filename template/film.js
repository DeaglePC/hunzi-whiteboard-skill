// 《一口气理清魏晋南北朝与五胡十六国》— whiteboard explainer, 16:9. One board, no hands.
// Every regime is a "group chat": a marker circle + name; members are glossy face magnets.
// Board text is Chinese written in real stroke order (hanzi-writer-data medians), latin/digits in EMS Tech.
import * as W from './engine/wb.js';
import { clamp, lerp, TAU, mulberry, hash } from '/core/lib.js';

export const C = {
  k: '#23262c', blue: '#2a5cb3', green: '#2e7a4d', red: '#c8413a', purple: '#7a4fb3',
  orange: '#e0883a', gray: '#7f858e', gold: '#c39114',
};
export const VO = {
  L01: .08, L02: 3.0, L03: 6.1, L04: 10.9, L05: 17.7, L06: 21.9, L07: 27.2,
  L08: 30.8, L09: 34.5, L10: 40.0, L11: 46.5, L12: 51.3, L13: 56.9, L14: 65.6,
};

let HZ = {}, SEEDC = 5;
// handwritten Chinese + latin, vertically centred on y; h = character box size
export function hz(str, x, y, o = {}) {
  str = str.replace(/，/g, ' ').replace(/！/g, '!').replace(/？/g, '?').replace(/：/g, ':').replace(/[“”]/g, '"');
  const h = o.h ?? 80, R = mulberry(o.seed ?? (SEEDC += 17)), out = [], items = [];
  const lw = o.w ?? Math.max(4, h * .085);
  let adv = 0;
  for (const ch of str) {
    if (HZ[ch]) { items.push({ ch, x: adv, cjk: 1 }); adv += h * (o.sp ?? 1); }
    else if (ch === ' ') adv += h * .3;
    else { const g = W.text(ch, 0, 0, { h: h * .62, seed: 1 }); items.push({ ch, x: adv + h * .04, cjk: 0 }); adv += g.width + h * .1; }
  }
  const x0 = o.align === 'center' ? x - adv / 2 : o.align === 'right' ? x - adv : x;
  for (const it of items) {
    if (it.cjk) {
      const rot = (R() - .5) * .07, dy = (R() - .5) * h * .05, sc = (1 + (R() - .5) * .06) * h / 1024, cx = x0 + it.x + h / 2, cy = y + dy;
      const cs = Math.cos(rot), sn = Math.sin(rot);
      for (const m of HZ[it.ch]) {
        const p = [];
        for (const [mx, my] of m) { const px = (mx - 512) * sc, py = (388 - my) * sc; p.push(cx + px * cs - py * sn, cy + px * sn + py * cs); }
        if (p.length === 2) p.push(p[0] + 1, p[1] + 1);
        out.push(new W.Stroke(p, { w: lw, color: o.color, jitter: .3, wav: 90, kind: 'text', smooth: 1, alpha: o.alpha }));
      }
    } else out.push(...W.text(it.ch, x0 + it.x, y + h * .31, { h: h * .62, color: o.color, w: lw, alpha: o.alpha }));
  }
  out.width = adv; out.x0 = x0;
  return out;
}

// ───────── face magnets (the only things that move on the board)
class Mag {
  constructor(id, col, o = {}) { this.id = id; this.col = col; this.r = o.r ?? 58; this.k = []; this.x = 0; this.y = 0; this.face = o.face || 'smile'; }
  key(t, x, y, o = {}) { this.k.push({ t, x, y, lift: o.lift ?? 0, rot: o.rot ?? 0, s: o.s ?? 1, sx: o.sx ?? 1, vis: o.vis ?? 1, e: o.e ?? 'io', face: o.face, col: o.col }); this.x = x; this.y = y; this.lastRot = o.rot ?? 0; return this; }
  pose(t) {
    const K = this.k; if (!K.length || t < K[0].t) return null;
    let i = 0; while (i < K.length - 1 && t >= K[i + 1].t) i++;
    const a = K[i], b = K[Math.min(i + 1, K.length - 1)];
    let face = this.face, col = this.col;
    for (const k of K) { if (k.t > t) break; if (k.face) face = k.face; if (k.col) col = k.col; }
    if (a === b || t >= b.t) return { ...a, face, col };
    const u = (t - a.t) / (b.t - a.t);
    const E = { io: u => u * u * (3 - 2 * u), i: u => u * u, o: u => 1 - (1 - u) * (1 - u), l: u => u }[b.e](u);
    return { x: lerp(a.x, b.x, E), y: lerp(a.y, b.y, E), lift: lerp(a.lift, b.lift, E), rot: lerp(a.rot, b.rot, E), s: lerp(a.s, b.s, E), sx: lerp(a.sx, b.sx, E), vis: lerp(a.vis, b.vis, u), face, col };
  }
}
function drawMag(ctx, m, t, c) {
  const p = m.pose(t); if (!p || p.vis <= .01) return;
  const [sx, sy] = W.toScreen(c, p.x, p.y), r = m.r * c.z * p.s, up = p.lift * 34 * c.z;
  if (sx < -200 || sx > W.VIEW.w + 200 || sy < -200 || sy > W.VIEW.h + 200) return;
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = p.vis;
  ctx.save(); ctx.filter = `blur(${(5 + p.lift * 12) * c.z}px)`; ctx.fillStyle = `rgba(35,30,40,${.32 - p.lift * .12})`;
  ctx.beginPath(); ctx.ellipse(sx + (7 + up * .7) * c.z / Math.max(c.z, .01) * Math.min(1, c.z * 1.4), sy + 10 * c.z + up * .9, r * p.sx, r * .96, 0, 0, TAU); ctx.fill(); ctx.restore();
  ctx.save(); ctx.translate(sx, sy - up); ctx.rotate(p.rot); ctx.scale(p.sx, 1);
  const [R0, G0, B0] = [1, 3, 5].map(i => parseInt(p.col.slice(i, i + 2), 16));
  const g = ctx.createRadialGradient(-r * .35, -r * .4, r * .1, 0, 0, r * 1.05);
  g.addColorStop(0, `rgb(${Math.min(255, R0 + 90)},${Math.min(255, G0 + 90)},${Math.min(255, B0 + 90)})`);
  g.addColorStop(.55, p.col); g.addColorStop(1, `rgb(${R0 * .55 | 0},${G0 * .55 | 0},${B0 * .55 | 0})`);
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.fill();
  ctx.strokeStyle = `rgba(0,0,0,.18)`; ctx.lineWidth = Math.max(1, r * .05); ctx.stroke();
  // printed face
  ctx.fillStyle = '#fffaf2'; ctx.beginPath(); ctx.arc(0, r * .06, r * .66, 0, TAU); ctx.fill();
  ctx.strokeStyle = '#26211f'; ctx.fillStyle = '#26211f'; ctx.lineCap = 'round'; ctx.lineWidth = r * .09;
  const ey = -r * .05, ex = r * .26;
  if (p.face === 'x') {
    for (const s of [-1, 1]) { const x = s * ex; ctx.beginPath(); ctx.moveTo(x - r * .1, ey - r * .1); ctx.lineTo(x + r * .1, ey + r * .1); ctx.moveTo(x + r * .1, ey - r * .1); ctx.lineTo(x - r * .1, ey + r * .1); ctx.stroke(); }
    ctx.beginPath(); ctx.ellipse(0, r * .3, r * .1, r * .13, 0, 0, TAU); ctx.stroke();
  } else {
    for (const s of [-1, 1]) { ctx.beginPath(); ctx.arc(s * ex, ey, r * .085, 0, TAU); ctx.fill(); }
    if (p.face === 'angry') {
      for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(s * (ex + r * .14), ey - r * .22); ctx.lineTo(s * (ex - r * .1), ey - r * .12); ctx.stroke(); }
      ctx.beginPath(); ctx.arc(0, r * .42, r * .16, Math.PI * 1.15, Math.PI * 1.85); ctx.stroke();
    } else if (p.face === 'sad') {
      ctx.beginPath(); ctx.arc(0, r * .45, r * .15, Math.PI * 1.15, Math.PI * 1.85); ctx.stroke();
    } else {
      ctx.beginPath(); ctx.arc(0, r * .14, r * .2, Math.PI * .15, Math.PI * .85); ctx.stroke();
      ctx.fillStyle = 'rgba(232,110,110,.45)'; for (const s of [-1, 1]) { ctx.beginPath(); ctx.ellipse(s * r * .42, r * .16, r * .1, r * .06, 0, 0, TAU); ctx.fill(); }
    }
  }
  ctx.fillStyle = 'rgba(255,255,255,.5)'; ctx.beginPath(); ctx.ellipse(-r * .45, -r * .55, r * .2, r * .09, -.7, 0, TAU); ctx.fill();
  ctx.restore(); ctx.globalAlpha = 1;
}


// ───────── Q-style marker figures (bust: big head + robe), drawn live
// o: {r, hat, eye, brow, mouth, beard, bc (beard colour), col (robe colour), prop}
function fig(x, y, o = {}) {
  const r = o.r ?? 82, w = o.w ?? Math.max(5, r * .1), L = [], P = (pts, oo = {}) => L.push(new W.Stroke(pts.flat(), { w, jitter: .45, smooth: 1, wav: 120, ...oo }));
  const arcP = (cx, cy, rx, ry, a0, a1, n = 14) => { const p = []; for (let i = 0; i <= n; i++) { const a = a0 + (a1 - a0) * i / n; p.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]); } return p; };
  // head
  L.push(W.circle(x, y, r, { w, lap: .12, a0: -1.2 }));
  // hat
  const h = o.hat || 'guan';
  if (h === 'crown') { P([[x - 1.2 * r, y - 1.12 * r], [x + 1.2 * r, y - 1.2 * r]]); P([[x - .6 * r, y - 1.14 * r], [x - .6 * r, y - .78 * r], [x + .6 * r, y - .8 * r], [x + .6 * r, y - 1.18 * r]]); for (const s of [-1.1, -.95, .95, 1.1]) P([[x + s * r, y - 1.15 * r], [x + s * r, y - .78 * r]], { w: w * .7 }); }
  else if (h === 'futou') { P(arcP(x, y - .62 * r, .86 * r, .74 * r, Math.PI, TAU)); P([[x - .9 * r, y - .6 * r], [x + .9 * r, y - .62 * r]]); P([[x - .86 * r, y - .8 * r], [x - 1.95 * r, y - .86 * r]]); P([[x + .86 * r, y - .82 * r], [x + 1.95 * r, y - .9 * r]]); }
  else if (h === 'guan') { P(arcP(x, y - .1 * r, .98 * r, .95 * r, Math.PI * 1.08, Math.PI * 1.92)); L.push(W.circle(x, y - 1.2 * r, .26 * r, { w })); P([[x - .5 * r, y - 1.22 * r], [x + .5 * r, y - 1.26 * r]], { w: w * .8 }); }
  else if (h === 'hu') { P(arcP(x, y - .55 * r, .95 * r, .85 * r, Math.PI, TAU)); const z = []; for (let i = 0; i <= 10; i++) z.push([x - 1.05 * r + i * .21 * r, y - .55 * r + (i % 2 ? -.14 : .1) * r]); P(z); P([[x - 1.0 * r, y - .45 * r], [x - 1.05 * r, y + .3 * r]]); P([[x + 1.0 * r, y - .45 * r], [x + 1.05 * r, y + .3 * r]]); }
  else if (h === 'xianbei') { P([[x - 1.12 * r, y + .7 * r], [x - 1.1 * r, y - .4 * r], ...arcP(x, y - .45 * r, 1.1 * r, 1.0 * r, Math.PI, TAU), [x + 1.12 * r, y + .7 * r]]); P(arcP(x, y - .35 * r, .8 * r, .45 * r, Math.PI * 1.05, Math.PI * 1.95)); }
  else if (h === 'band') { P([[x - .98 * r, y - .45 * r], [x + .98 * r, y - .5 * r]]); P([[x + .95 * r, y - .48 * r], [x + 1.35 * r, y - .2 * r]]); P([[x + .95 * r, y - .48 * r], [x + 1.3 * r, y - .62 * r]]); const z = []; for (let i = 0; i <= 8; i++) z.push([x - .85 * r + i * .21 * r, y - (i % 2 ? 1.25 : .95) * r]); P(z); }
  else if (h === 'bun') { P(arcP(x, y - .05 * r, 1.04 * r, 1.0 * r, Math.PI * 1.02, Math.PI * 1.98)); L.push(W.circle(x, y - 1.35 * r, .38 * r, { w })); P([[x - .6 * r, y - 1.5 * r], [x + .7 * r, y - 1.2 * r]], { w: w * .7 }); P([[x + .4 * r, y - 1.75 * r], [x + .2 * r, y - 1.05 * r]], { w: w * .7 }); }
  else if (h === 'scholar') { P([[x - .85 * r, y - .55 * r], [x - .7 * r, y - 1.35 * r], [x + .5 * r, y - 1.45 * r], [x + .85 * r, y - .55 * r]]); P([[x + .75 * r, y - .9 * r], [x + 1.3 * r, y - .3 * r]], { w: w * .8 }); P([[x + .8 * r, y - .8 * r], [x + 1.45 * r, y - .55 * r]], { w: w * .8 }); }
  else if (h === 'bald') { for (const [dx, dy] of [[-.25, -.75], [0, -.82], [.25, -.75]]) L.push(W.line(x + dx * r, y + dy * r, x + dx * r + 2, y + dy * r + 2, { w: w * 1.1 })); }
  else if (h === 'helmet') { P(arcP(x, y - .5 * r, 1.08 * r, .92 * r, Math.PI, TAU)); P([[x - 1.15 * r, y - .45 * r], [x + 1.15 * r, y - .5 * r]]); P([[x, y - 1.42 * r], [x, y - 1.95 * r]]); P([[x, y - 1.95 * r], [x + .35 * r, y - 1.75 * r], [x, y - 1.6 * r]], { w: w * .8 }); P([[x - 1.08 * r, y - .45 * r], [x - 1.0 * r, y + .35 * r]]); P([[x + 1.08 * r, y - .5 * r], [x + 1.0 * r, y + .35 * r]]); }
  // face
  const ex = .36 * r, ey = -.02 * r, e = o.eye || 'dot';
  for (const s of [-1, 1]) {
    const cx = x + s * ex, cy = y + ey;
    if (e === 'dot') L.push(W.line(cx, cy, cx + 1.5, cy + 1.5, { w: w * 1.35 }));
    else if (e === 'line') P([[cx - .13 * r, cy], [cx + .13 * r, cy + .02 * r]]);
    else if (e === 'o') L.push(W.circle(cx, cy, .13 * r, { w: w * .7 }));
    else if (e === 'x') { P([[cx - .1 * r, cy - .1 * r], [cx + .1 * r, cy + .1 * r]], { w: w * .7 }); P([[cx + .1 * r, cy - .1 * r], [cx - .1 * r, cy + .1 * r]], { w: w * .7 }); }
    const b = o.brow || 'calm', by = cy - .26 * r;
    if (b === 'angry') P([[cx - s * .2 * r, by - .06 * r], [cx + s * .14 * r, by + .08 * r]].map(p => p), { w: w * .9 });
    else if (b === 'sad') P([[cx - s * .18 * r, by + .06 * r], [cx + s * .16 * r, by - .06 * r]], { w: w * .9 });
    else if (b === 'calm') P([[cx - .15 * r, by + .02 * r], [cx + .15 * r, by]], { w: w * .8 });
  }
  const m = o.mouth || 'flat', my = y + .42 * r;
  if (m === 'smile') P(arcP(x, my - .18 * r, .24 * r, .16 * r, .25, Math.PI - .25, 8));
  else if (m === 'frown') P(arcP(x, my + .12 * r, .2 * r, .12 * r, Math.PI + .3, TAU - .3, 8));
  else if (m === 'o') L.push(W.circle(x, my, .1 * r, { w: w * .7 }));
  else if (m === 'grin') { P(arcP(x, my - .2 * r, .32 * r, .2 * r, .15, Math.PI - .15, 10)); P([[x - .3 * r, my - .14 * r], [x + .3 * r, my - .14 * r]], { w: w * .7 }); }
  else P([[x - .16 * r, my], [x + .16 * r, my + .02 * r]]);
  const bd = o.beard, bc = o.bc;
  if (bd === 'goatee') P([[x - .14 * r, y + .72 * r], [x, y + 1.15 * r], [x + .14 * r, y + .72 * r]], { color: bc });
  else if (bd === 'long') { P([[x - .3 * r, y + .7 * r], [x - .22 * r, y + 1.5 * r]], { color: bc }); P([[x, y + .78 * r], [x + .02 * r, y + 1.7 * r]], { color: bc }); P([[x + .3 * r, y + .7 * r], [x + .24 * r, y + 1.5 * r]], { color: bc }); }
  else if (bd === 'full') { const z = []; for (let i = 0; i <= 10; i++) { const a = Math.PI * (.12 + .76 * i / 10); z.push([x + Math.cos(a) * r * (i % 2 ? 1.1 : .95), y + Math.sin(a) * r * (i % 2 ? 1.15 : .98)]); } P(z, { color: bc }); }
  if (bd === 'mustache' || bd === 'long' || bd === 'goatee') { P(arcP(x - .17 * r, y + .28 * r, .17 * r, .1 * r, Math.PI * 1.1, Math.PI * 1.9, 6), { color: bc, w: w * .8 }); P(arcP(x + .17 * r, y + .28 * r, .17 * r, .1 * r, Math.PI * 1.1, Math.PI * 1.9, 6), { color: bc, w: w * .8 }); }
  // robe (bust)
  const body = [[x - 1.42 * r, y + 2.55 * r], [x - 1.28 * r, y + 1.42 * r], [x - .42 * r, y + .96 * r]];
  P(body); P([[x + .42 * r, y + .96 * r], [x + 1.28 * r, y + 1.42 * r], [x + 1.42 * r, y + 2.55 * r]]);
  P([[x - 1.42 * r, y + 2.55 * r], [x + 1.42 * r, y + 2.58 * r]]);
  P([[x - .42 * r, y + .98 * r], [x + .32 * r, y + 2.05 * r]]); P([[x + .42 * r, y + .98 * r], [x + .1 * r, y + 1.5 * r]]);
  P(arcP(x, y + 1.85 * r, .95 * r, .25 * r, .1, Math.PI - .1, 10), { w: w * .9 });
  if (o.prop === 'beads') for (let i = 0; i < 9; i++) { const a = Math.PI * (.15 + .7 * i / 8); L.push(W.circle(x + Math.cos(a) * .62 * r, y + 1.0 * r + Math.sin(a) * .5 * r, .07 * r, { w: w * .6 })); }
  const fill = o.col ? W.hatch([[x - 1.3 * r, y + 2.5 * r], [x - 1.2 * r, y + 1.48 * r], [x - .4 * r, y + 1.04 * r], [x + .4 * r, y + 1.04 * r], [x + 1.2 * r, y + 1.48 * r], [x + 1.3 * r, y + 2.5 * r]], { color: o.col, spacing: r * .2, w: r * .14, alpha: .5 }) : null;
  return { L, fill, r };
}

function drawCrown(ctx, m, t, c) {
  const p = m.pose(t); if (!p || p.vis <= .01) return;
  const [sx, sy] = W.toScreen(c, p.x, p.y), s = m.r * c.z * p.s / 60, up = p.lift * 34 * c.z;
  if (sx < -200 || sx > W.VIEW.w + 200 || sy < -200 || sy > W.VIEW.h + 200) return;
  const shape = g => { g.beginPath(); g.moveTo(-60, 30); g.lineTo(-66, -34); g.lineTo(-32, -6); g.lineTo(0, -50); g.lineTo(32, -6); g.lineTo(66, -34); g.lineTo(60, 30); g.closePath(); };
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = p.vis;
  ctx.save(); ctx.translate(sx + 8 * s + up * .7, sy + 12 * s + up * .9); ctx.scale(s, s); ctx.filter = `blur(${6 + p.lift * 12}px)`; ctx.fillStyle = `rgba(60,40,10,${.35 - p.lift * .15})`; shape(ctx); ctx.fill(); ctx.restore();
  ctx.save(); ctx.translate(sx, sy - up); ctx.rotate(p.rot); ctx.scale(s * p.sx, s);
  const g = ctx.createLinearGradient(0, -50, 0, 30); g.addColorStop(0, '#ffe38a'); g.addColorStop(.5, '#e2a823'); g.addColorStop(1, '#9c6a0c');
  ctx.fillStyle = g; shape(ctx); ctx.fill(); ctx.strokeStyle = 'rgba(90,60,10,.5)'; ctx.lineWidth = 3; ctx.stroke();
  for (const [x, y, col] of [[0, 8, '#d23b3b'], [-34, 12, '#2a5cb3'], [34, 12, '#2e7a4d']]) { ctx.fillStyle = col; ctx.beginPath(); ctx.arc(x, y, 8, 0, TAU); ctx.fill(); }
  ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.beginPath(); ctx.ellipse(-30, -8, 14, 5, -.5, 0, TAU); ctx.fill();
  ctx.restore(); ctx.globalAlpha = 1;
}


// ═════════ 9:16 portrait, three boards, a fixed camera on each (the whole board is always in view)
// ═══════════════════════════════════════════════════════════════════════════════════════════════
// build(): everything below the 'TOPIC CONTENT' markers is the worked example (魏晋南北朝); rewrite those
// sections for a new film. The scheduler, camera, subtitles and render code around them are reusable as is.
// ═══════════════════════════════════════════════════════════════════════════════════════════════
export async function build() {
  W.VIEW.w = 1080; W.VIEW.h = 1920;
  await W.loadFont('tech', 'fonts/EMSTech.json');
  HZ = await (await fetch('hanzi/hz.json')).json();
  const lines = await (await fetch('lines.json')).json();
  let DUR = {}; try { DUR = await (await fetch('voices/dur.json')).json(); } catch { }
  const LT = Object.fromEntries(lines.map(l => [l.id, l.text]));
  // lines.json drives the pacing: sec = a chapter starts here (longer breath before it), pause = extra seconds after the line,
  // board = the first line on board 2 / 3 (the camera moves to the next board just before it)
  const SEC = new Set(lines.filter(l => l.sec).map(l => l.id));
  // a held breath at the end of each board: the board stays up, no subtitles, time to screenshot
  const EXTRA = Object.fromEntries(lines.filter(l => l.pause).map(l => [l.id, l.pause]));
  const VO = {}; { let t = .08; lines.forEach((l, i) => { VO[l.id] = t; const nx = lines[i + 1]; t += (DUR[l.id] ?? [...l.text].length * .22) + (nx && SEC.has(nx.id) ? 1.6 : .65) + (EXTRA[l.id] ?? 0); }); }
  const wt = ch => /[，。；：、！？]/.test(ch) ? 1.1 : 1;
  const atI = (id, pos) => { const chars = [...LT[id]]; let tot = 0, before = 0; chars.forEach((ch, i) => { tot += wt(ch); if (i < pos) before += wt(ch); }); return VO[id] + (DUR[id] ?? chars.length * .22) * before / tot; };
  const at = (id, sub, k = 0, end = false) => { const s = LT[id]; let idx = -1; for (let n = 0; n <= k; n++) idx = s.indexOf(sub, idx + 1); if (idx < 0) throw new Error(`${sub} not in ${id}`); return atI(id, end ? idx + sub.length : idx); };
  const vend = id => VO[id] + (DUR[id] ?? 3);
  const HOLD_END = 2.6, OVERVIEW = 3.4;
  const END = vend(lines[lines.length - 1].id) + HOLD_END + OVERVIEW;

  const tl = new W.Timeline();
  const pen = (id, col, park) => new W.Pen(id, col, { park });
  const K = pen('k', C.k, [1300, 1500]), K2 = pen('k2', C.k, [1250, 1650]), B = pen('b', C.blue, [1350, 1400]), G = pen('g', C.green, [1300, 1750]),
    Rr = pen('r', C.red, [1400, 1550]), P = pen('p', C.purple, [1320, 1600]), O = pen('o', C.orange, [1380, 1450]),
    S = pen('s', C.gray, [1300, 1700]), Y = pen('y', C.gold, [1360, 1680]), B2 = pen('b2', C.blue, [1420, 1500]), K3 = pen('k3', C.k, [1280, 1560]), K4 = pen('k4', C.k, [1340, 1620]), K5 = pen('k5', C.k, [1400, 1700]);
  let kk = 0; const KX = () => [K3, K4, K5][kk++ % 3];
  const PENS = [K, K2, K3, K4, K5, B, G, Rr, P, O, Y, B2];
  const PC = { [C.blue]: B, [C.green]: G, [C.red]: Rr, [C.purple]: P, [C.orange]: O, [C.gold]: Y, [C.k]: K2 };
  // one hand on the board: jobs are sorted by start time and run one after another; a late job is drawn faster to catch up
  const JOBS = [], LAG = [];
  const D = (pn, shapes, t0, t1, tag) => { JOBS.push({ pn, shapes, t0, t1, tag, k: JOBS.length }); };
  const runJobs = () => {
    let HAND = -1e9;
    JOBS.sort((a, b) => a.t0 - b.t0 || a.k - b.k);
    for (const { pn, shapes, t0, t1, tag } of JOBS) {
      const last = pn.segs.length ? pn.segs[pn.segs.length - 1].t1 : -1e9, n = [shapes].flat(9).length;
      const s = Math.max(t0, last + .05, t0 > 0 ? HAND + .08 : -1e9), minWin = Math.max(.2, Math.min(.7, .02 * n));
      if (s - t0 > .4) LAG.push([+t0.toFixed(1), +(s - t0).toFixed(2), tag || '']);
      const e = tl.draw(pn, shapes, s, { by: Math.max(t1, s + minWin), tag });
      if (t0 > 0) HAND = e;
    }
  };
  const mags = [], M = (id, col, o) => { const m = new Mag(id, col, o); mags.push(m); return m; };
  const slide = (m, t0, t1, x, y, o = {}) => { const x0 = m.x, y0 = m.y; m.key(t0, x0, y0); m.key((t0 + t1) / 2, (x0 + x) / 2, (y0 + y) / 2 - (o.arc ?? 0), { lift: o.lift ?? .6, s: 1.1 }); m.key(t1, x, y); tl.cue(t0, 'slide', { x: x0, y: y0, dur: t1 - t0 }); tl.cue(t1, 'clack', { x, y }); };
  const drop = (m, t, x, y) => { m.key(t - .42, x + 30, y - 70, { lift: 1, s: 1.2, vis: 0 }); m.key(t - .36, x + 26, y - 60, { lift: 1, s: 1.18 }); m.key(t, x, y, { e: 'i' }); tl.cue(t, 'clack', { x, y }); };
  const kick = (m, t0, dx, dy, o = {}) => { const x0 = m.x, y0 = m.y, dur = o.dur ?? .75, spin = o.spin ?? 7; m.key(t0, x0, y0, { face: 'x' }); for (let i = 1; i <= 6; i++) { const u = i / 6; m.key(t0 + dur * u, x0 + dx * u, y0 + dy * u - Math.sin(Math.PI * u * .8) * 200, { lift: 1, s: 1 + u * .5, rot: spin * u, vis: i === 6 ? 0 : 1, e: 'l' }); } tl.cue(t0, 'kick', { x: x0, y: y0 }); };
  const txt = (s, x, y, h, col, o = {}) => hz(s, x, y, { h, color: col, align: o.align ?? 'center', ...o });
  const sys = (str, x, y, t0, t1, h = 34) => { const tx = hz(str, x, y, { h, color: C.gray, align: 'center', w: h * .09 }); const w = tx.width + h * 1.1; return D(S, [W.roundRect(x - w / 2, y - h * .85, w, h * 1.7, h * .85, { w: 4, alpha: .7 }), ...tx], t0, t1, 'sys'); };
  const ellipse = (cx, cy, rx, ry, o = {}) => W.circle(cx, cy, rx, { ry, ...o });
  const ringPath = (cx, cy, rx, ry) => { const p = []; for (let i = 0; i <= 72; i++) { const a = -2.2 + i / 72 * (TAU + .3); p.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]); } return p; };
  let kt = 0;
  const F = (name, x, y, o, t0, t1) => {
    const f = fig(x, y, { r: 42, ...o }), pn = [K, K2, K3][kt++ % 3];
    D(pn, [...f.L, ...(f.fill ? [f.fill] : []), ...(name ? txt(name, x, y + f.r * 3.2, o.nh ?? 40, o.ncol ?? C.k) : [])], t0, t1, 'fig');
    return { x, y, r: f.r };
  };
  const bubble = (s, x, y, h, t0, t1, col = C.k, tail = [-1, 1]) => { const tx = txt(s, x, y, h, col); const w = tx.width + h * .9, hh = h * 1.65; return D(KX(), [W.roundRect(x - w / 2, y - hh / 2, w, hh, h * .5, { w: 4 }), W.poly([x + tail[0] * w * .2, y + hh / 2, x + tail[0] * w * .2 + tail[1] * 18, y + hh / 2 + 32, x + tail[0] * w * .2 + 28, y + hh / 2], { w: 4 }), ...tx], t0, t1, 'bubble'); };
  // relation arrow + label (label size ≥ 34 so it reads on a phone); colour = meaning: family black, power red, help blue
  const rel = (x0, y0, x1, y1, label, t0, t1, col = C.k, o = {}) => { const a = W.arrow(x0, y0, x1, y1, { w: 5, head: 18, color: col, ...o }); const mx = (x0 + x1) / 2 + (o.lx ?? 0), my = (y0 + y1) / 2 + (o.ly ?? -26); return D(col === C.red ? Rr : col === C.blue ? B2 : KX(), [a, ...(label ? txt(label, mx, my, o.lh ?? 34, col) : [])], t0, t1, 'rel'); };
  const xmark = (x, y, s, t0, t1, w = 9) => D(Rr, [W.line(x - s, y - s, x + s, y + s, { w }), W.line(x + s, y - s, x - s, y + s, { w })], t0, t1, 'x');
  const crownOn = p => [p.x + p.r * 1.1, p.y - p.r * 1.25];
  const crown = M('crown', C.gold, { r: 30 }); crown.draw = drawCrown;
  const star = (x, y, r) => { const p = []; for (let i = 0; i <= 8; i++) { const a = i * Math.PI / 4 - Math.PI / 2, q = i % 2 ? r * .3 : r; p.push(x + Math.cos(a) * q, y + Math.sin(a) * q); } return W.poly(p, { w: 5, jitter: .3 }); };

  // three boards side by side; the camera sits on one at a time
  const PW = 1080, GAP = 160, X = k => k * (PW + GAP);
  const BOARD_W = 3 * PW + 2 * GAP, BOARD_H = 1920;
  const STAGES = ['三国', '西晋', '东晋·十六国', '南北朝', '隋'];
  // header: where we are on the road, current stages circled in red
  const header = (k, cur, t0) => {
    const parts = []; let x = X(k) + 170; const xs = [];
    STAGES.forEach((s, i) => { const tx = txt(s, x, 300, 38, C.k, { align: 'left' }); xs.push([x, tx.width]); parts.push(...tx); x += tx.width + 18; if (i < STAGES.length - 1) { parts.push(W.line(x, 300, x + 26, 300, { w: 4 }), W.line(x + 14, 290, x + 26, 300, { w: 4 }), W.line(x + 14, 310, x + 26, 300, { w: 4 })); x += 44; } });
    D(K2, parts, t0, t0 + .9, 'header');
    cur.forEach((i, n) => { const [x0, w] = xs[i]; D(Rr, ellipse(x0 + w / 2, 300, w / 2 + 18, 32, { w: 5, lap: .3 }), t0 + .9 + n * .3, t0 + 1.2 + n * .3, 'hl'); });
  };

  // ───────── faint ghosts of old lessons (few, very light)
  const ghosts = [], gR = mulberry(77);
  for (let i = 0; i < 22; i++) { const x = gR() * BOARD_W, y = gR() * BOARD_H, o = { w: 8, alpha: .025 + gR() * .02, color: '#9aa0a8' }; ghosts.push(gR() < .5 ? W.circle(x, y, 30 + gR() * 80, o) : W.line(x, y, x + 120 + gR() * 300, y + (gR() - .5) * 60, o)); }

  // ▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼ TOPIC CONTENT (rewrite per film) ▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼
  // ═════════ layout grid (board-local): 4 columns, 3 figure rows; the bands between rows carry labels and bubbles
  const CX = [220, 430, 640, 850];
  // ═════════ BOARD 1 — hook, then 三国 → 西晋 → 八王
  const x1 = X(0), c1 = i => x1 + CX[i];
  // opening, 混子哥-style: say what we'll sort out. The road of dynasties and the title are on the board at frame 0,
  // then the 五胡十六国 brawl is drawn live under them
  const road = ['三国', '魏晋南北朝', '隋', '唐', '宋...']; { const parts = []; let x = x1 + 120; const xs = [];
    road.forEach((s, i) => { const tx = txt(s, x, 430, 56, C.k, { align: 'left' }); xs.push([x, tx.width]); parts.push(...tx); x += tx.width + 16; if (i < road.length - 1) { parts.push(W.line(x, 430, x + 34, 430, { w: 5 }), W.line(x + 20, 418, x + 34, 430, { w: 5 }), W.line(x + 20, 442, x + 34, 430, { w: 5 })); x += 54; } });
    D(K, parts, -6, -5); const [hx, hw] = xs[1]; D(Rr, ellipse(hx + hw / 2, 430, hw / 2 + 22, 46, { w: 7, lap: .3 }), -4.9, -4.5);
    D(Rr, W.arrow(hx + hw / 2, 480, x1 + 540, 560, { w: 6, head: 20 }), -4.4, -4.2); }
  D(K, txt('一口气理清', x1 + 540, 640, 112), -4.1, -3.2);
  D(Rr, txt('魏晋南北朝', x1 + 540, 810, 150, C.red), -3.1, -2.1);
  D(K, txt('与 五胡十六国', x1 + 540, 985, 104), -2.0, -1.1);
  // the brawl: a cloud of angry little heads, drawn in the first two seconds
  const t0 = .6, brawl = [];
  { const cx = x1 + 540, cy = 1200, rx = 300, ry = 105; const cl = []; for (let i = 0; i <= 120; i++) { const a = -2 + i / 120 * (TAU + .25), q = 1 + .1 * Math.abs(Math.sin(a * 8)); cl.push(cx + Math.cos(a) * rx * q, cy + Math.sin(a) * ry * q * 1.2); }
    brawl.push(new W.Stroke(cl, { w: 7, wav: 200, color: C.orange })); }
  D(O, brawl, t0, t0 + .7, 'brawl');
  const HEADS = [[-200, -20, 'hu'], [-90, 25, 'band'], [20, -25, 'xianbei'], [130, 20, 'crown'], [235, -15, 'hu']];
  D(K, HEADS.flatMap(([dx, dy, h]) => fig(x1 + 540 + dx, 1180 + dy, { r: 30, hat: h, brow: 'angry', mouth: 'grin', col: C.orange }).L.slice(0, 18)), t0 + .7, t0 + 2.2, 'heads');
  D(O, [star(x1 + 210, 1110, 26), star(x1 + 880, 1290, 22), star(x1 + 860, 1100, 18), star(x1 + 230, 1300, 18)], t0 + 2.2, t0 + 2.6);
  D(O, W.arrow(x1 + 760, 1035, x1 + 700, 1110, { w: 5, head: 18 }), t0 + 2.6, t0 + 2.8);
  tl.cue(t0 + 2.3, 'hit');
  // the board is wiped clean and the lesson starts
  const tw = vend('L02') + .1;
  tl.erase(W.zigzag(x1 + 20, 360, 1040, 1040, 14), tw, 1.4, { width: 220, strength: 1 });
  tl.erase([[x1 + 820, 430], [x1 + 1070, 430], [x1 + 820, 470]], tw + 1.4, .3, { width: 120, strength: 1 });   // the far end of the road line   // the opening leaves no ghost
  header(0, [0, 1], tw + 1.0);
  const R1 = 520, R2 = 840, R3 = 1160, B12 = 735, B23 = 1050;
  // 三国
  const caocao = F('曹操', c1(0), R1, { hat: 'futou', eye: 'line', brow: 'angry', mouth: 'smile', beard: 'goatee', col: C.blue }, at('L03', '曹操') - .4, at('L03', '手里', 0, true));
  const caopi = F('曹丕', c1(1), R1, { hat: 'crown', mouth: 'smile', beard: 'mustache', col: C.blue }, at('L03', '曹丕') - .3, at('L03', '群主'));
  rel(c1(0) + 70, R1 - 40, c1(1) - 70, R1 - 40, '儿子', at('L03', '儿子') - .3, at('L03', '儿子') + .2);
  drop(crown, at('L03', '群主', 0, true), ...crownOn(caopi));
  D(B, [ellipse(x1 + 325, R1 + 50, 225, 160, { w: 7 }), ...txt('魏 220', x1 + 120, 375, 38, C.blue, { align: 'left' })], at('L03', '建了魏') - .2, at('L03', '建了魏', 0, true) + .4, 'wei');
  F('刘备', c1(0), R2, { hat: 'guan', mouth: 'smile', beard: 'long', col: C.green }, at('L04', '刘备') - .3, at('L04', '蜀'));
  D(G, [W.circle(x1 + 270, R2 + 50, 165, { w: 7 }), ...txt('蜀', x1 + 115, R2 - 110, 44, C.green)], at('L04', '蜀') - .1, at('L04', '蜀') + .4);
  F('孙权', c1(2), R2, { hat: 'guan', eye: 'o', beard: 'full', bc: C.purple, col: C.red }, at('L04', '孙权') - .3, at('L04', '吴'));
  D(Rr, [W.circle(c1(2), R2 + 50, 140, { w: 7 }), ...txt('吴', c1(2) + 125, R2 - 110, 44, C.red)], at('L04', '吴') - .1, at('L04', '吴') + .4);
  // 司马: three generations down the right column
  F('司马懿', c1(3), R1, { hat: 'futou', eye: 'line', mouth: 'smile', beard: 'long', col: C.purple }, at('L05', '司马懿') - .4, at('L05', '熬死'));
  [['曹操', caocao], ['曹丕', caopi]].forEach(([nm, p]) => { const t = at('L05', nm); xmark(p.x + 62, p.y + 134, 15, t - .05, t + .2, 5); });
  D(Rr, [...txt('曹睿', c1(2), R1 + 20, 36, C.gray), W.line(c1(2) - 40, R1 + 20, c1(2) + 40, R1 + 20, { w: 5 })], at('L05', '曹叡') - .2, at('L05', '曹叡') + .25);
  D(P, txt('高平陵之变 249', c1(2) + 20, 380, 32, C.purple), at('L05', '高平陵'), at('L05', '之变', 0, true) + .3);
  D(Rr, [W.roundRect(c1(2) - 60, R1 + 70, 120, 50, 18, { w: 4 }), ...txt('大权', c1(2), R1 + 95, 32, C.red), ...W.arrow(c1(2) + 62, R1 + 95, c1(3) - 70, R1 + 60, { w: 4, head: 14, color: C.red })], at('L05', '大权到手') - .2, at('L05', '大权到手', 0, true) + .2, 'power');
  F('司马昭', c1(3), R2, { hat: 'futou', brow: 'angry', beard: 'mustache', col: C.purple }, at('L06', '司马昭') - .4, at('L06', '灭了蜀') - .1);
  D(K3, [...W.arrow(c1(3) + 95, R1 + 120, c1(3) + 95, R2 - 60, { w: 4, head: 14 }), ...txt('子', c1(3) + 120, B12, 30)], at('L06', '儿子') - .3, at('L06', '儿子') + .2, 'son1');
  rel(c1(3) - 90, R2 + 40, x1 + 440, R2 + 40, '灭', at('L06', '灭了蜀') - .1, at('L06', '灭了蜀') + .3, C.red, { lh: 36, lx: 60 });
  F('刘禅', x1 + 345, R2 + 30, { r: 30, hat: 'guan', eye: 'line', mouth: 'grin', col: C.green, nh: 28 }, at('L06', '刘禅') - .2, at('L06', '投降') + .1);
  bubble('此间乐 不思蜀', x1 + 270, B23 - 10, 30, at('L06', '此间乐') - .1, at('L06', '不思蜀', 0, true) + .1);
  tl.erase(ringPath(x1 + 270, R2 + 50, 165, 165), vend('L06') - .1, .5, { width: 40 });
  F('司马炎', c1(3), R3, { hat: 'crown', mouth: 'smile', beard: 'goatee', col: C.purple }, at('L07', '司马炎') - .4, at('L07', '直接', 0, true));
  D(K3, [...W.arrow(c1(3) + 95, R2 + 120, c1(3) + 95, R3 - 60, { w: 4, head: 14 }), ...txt('子', c1(3) + 120, B23, 30)], at('L07', '孙子') - .3, at('L07', '孙子') + .2, 'son2');
  slide(crown, at('L07', '让位') - .1, at('L07', '让位') + .55, ...crownOn({ x: c1(3), y: R3, r: 42 }), { arc: 160, lift: 1 });
  D(P, txt('改群名“晋”', c1(3) - 10, R3 + 190, 30, C.purple), at('L07', '群名'), at('L07', '晋', 0, true) + .3);
  const tWu = at('L07', '灭了吴');
  rel(c1(3) - 80, R3 - 20, c1(2) + 70, R2 + 120, '灭', tWu - .2, tWu + .2, C.red, { lh: 36, lx: 30 });
  tl.erase(ringPath(c1(2), R2 + 50, 140, 140), tWu + .3, .45, { width: 40 });
  D(P, W.roundRect(x1 + 118, 342, 844, 1028, 50, { w: 10 }), at('L07', '全国') - .1, vend('L07') + .2, 'jinring');
  // 西晋 falls apart (bottom-left: the princes)
  D(P, txt('西晋 280', x1 + 140, 1330, 38, C.purple, { align: 'left' }), at('L08', '唯一') - .2, at('L08', '合群', 0, true));
  D(Rr, txt('–316', x1 + 320, 1330, 36, C.red, { align: 'left' }), at('L08', '三十多年') - .3, vend('L08') + .2);
  const WANG = []; for (let i = 0; i < 8; i++) WANG.push([x1 + 175 + (i % 4) * 92, R3 - 30 + Math.floor(i / 4) * 105]);
  D(KX(), WANG.flatMap(([x, y]) => { const g = fig(x, y, { r: 22, hat: 'crown', mouth: 'flat', col: C.purple }); return [...g.L, g.fill]; }), at('L09', '亲戚') - .4, at('L09', '还给了兵', 0, true), 'wang');
  D(P, txt('封了二十几个王', x1 + 310, B23, 32, C.purple), at('L09', '封成王') - .3, at('L09', '还给了兵', 0, true), 'fengwang');
  F('司马衷', c1(2), R3, { hat: 'crown', eye: 'o', brow: 'none', mouth: 'o', col: C.purple }, at('L10', '晋惠帝') - .4, at('L10', '司马衷', 0, true) + .2);
  rel(c1(3) - 70, R3 - 40, c1(2) + 70, R3 - 40, '儿子', at('L10', '接班') - .3, at('L10', '接班') + .2);
  bubble('何不食肉糜？', c1(2), B23 - 4, 30, at('L10', '何不食肉糜') - .1, at('L10', '肉糜', 0, true) + .15, C.k, [1, 1]);
  D(Rr, txt('实权→贾南风', c1(2), R3 + 190, 30, C.red), at('L10', '实权') - .2, at('L10', '贾南风', 0, true) + .2, 'jia');
  tl.erase(W.zigzag(x1 + 130, 1305, 330, 50, 2), at('L11', '八个王') - .7, .3, { width: 60 });
  tl.erase(W.zigzag(x1 + 150, B23 - 30, 330, 60, 1), at('L11', '八个王') - .3, .25, { width: 70 });
  const cloud = []; { const cx = x1 + 315, cy = R3 + 25, rx = 205, ry = 120; for (let i = 0; i <= 120; i++) { const a = -2 + i / 120 * (TAU + .25), q = 1 + .1 * Math.abs(Math.sin(a * 8)); cloud.push(cx + Math.cos(a) * rx * q, cy + Math.sin(a) * ry * q * 1.2); } }
  const t11 = at('L11', '八个王');
  D(P, new W.Stroke(cloud, { w: 7, wav: 200 }), t11 - .3, t11 + .6, 'cloud');
  D(O, [star(x1 + 110, R3 - 100, 24), star(x1 + 520, R3 + 120, 20)], t11 + .5, t11 + .9);
  const crack = (x, y, dx, dy) => W.poly([x, y, x + dx * .3 + dy * .3, y + dy * .3 - dx * .3, x + dx * .6 - dy * .3, y + dy * .6 + dx * .3, x + dx, y + dy], { w: 6, jitter: .3 });
  D(Rr, [crack(x1 + 118, 600, 40, 40), crack(x1 + 962, 700, -40, 40), crack(x1 + 500, 342, 30, 45), crack(x1 + 800, 1370, 30, -45)], at('L11', '互相砍') - .2, at('L11', '十六年', 0, true), 'cracks');
  D(P, txt('八王之乱 291–306', x1 + 315, B23 - 40, 32, C.purple), at('L11', '八王之乱') - .4, vend('L11'), 'bawang');
  D(O, [...W.arrow(x1 + 140, 1345, x1 + 470, 1345, { w: 5, head: 18, color: C.orange }), ...txt('借胡兵', x1 + 300, 1318, 30, C.orange)], at('L12', '胡人骑兵') - .6, at('L12', '胡人骑兵', 0, true) + .2, 'hubing');

  // ═════════ BOARD 2 — 五胡 → 西晋亡 → 东晋 → 十六国 → 淝水
  const x2 = X(1), c2 = i => x2 + CX[i];
  header(1, [2], VO.L13 - .9);
  const P1 = 640, P2 = 920, DIV = 1075, P3 = 1205;
  const HUN = ['匈奴', '鲜卑', '羯', '氐', '羌'];
  D(O, [W.roundRect(x2 + 150, 362, 790, 150, 40, { w: 6 }), ...txt('五胡', x2 + 120, 437, 32, C.orange, { align: 'right' })], VO.L13 - .2, VO.L13 + .5);
  HUN.forEach((nm, i) => { const t = at('L13', nm), x = x2 + 225 + i * 157, g = fig(x, 410, { r: 22, hat: ['hu', 'xianbei', 'band', 'crown', 'hu'][i], mouth: 'flat', col: C.orange }); D(O, [...g.L, g.fill, ...txt(nm, x, 488, 28, C.orange)], t - .4, t + .25, 'hu'); });
  F('刘渊', c2(0), P1, { hat: 'hu', brow: 'angry', mouth: 'smile', beard: 'full', col: C.orange }, at('L14', '刘渊') - .4, at('L14', '部下') - .1);
  D(Rr, txt('汉 304', c2(0) + 105, P1 - 75, 30, C.red), at('L14', '国号') - .1, at('L14', '叫汉', 0, true) + .2);
  F('刘聪', c2(1), P1, { hat: 'hu', brow: 'angry', mouth: 'grin', beard: 'goatee', col: C.orange }, at('L15', '刘聪') - .3, at('L15', '派兵'));
  rel(c2(0) + 70, P1 - 40, c2(1) - 70, P1 - 40, '儿子', at('L15', '儿子') - .3, at('L15', '儿子') + .2);
  D(K3, txt('洛阳', c2(2), P1 - 20, 40), at('L15', '洛阳') - .3, at('L15', '洛阳') + .1); xmark(c2(2), P1 - 20, 34, at('L15', '攻破'), at('L15', '攻破') + .25);
  D(K3, txt('长安', c2(3), P1 - 20, 40), at('L15', '长安') - .3, at('L15', '长安') + .1); xmark(c2(3), P1 - 20, 34, at('L15', '丢了') - .1, at('L15', '丢了') + .15);
  D(Rr, txt('西晋亡 316', x2 + 745, P1 + 60, 40, C.red), at('L15', '西晋亡') - .2, at('L15', '西晋亡', 0, true) + .2);
  // 东晋 (bottom box)
  const ruiP = F('司马睿', c2(0), P3, { hat: 'crown', brow: 'sad', beard: 'mustache', col: C.purple }, at('L16', '司马睿') - .4, at('L16', '江南') + .1);
  slide(crown, at('L16', '逃到'), at('L16', '江南', 0, true) + .2, ...crownOn(ruiP), { arc: 260, lift: 1 });
  F('王导', c2(1), P3, { hat: 'futou', eye: 'line', mouth: 'smile', beard: 'long', col: C.blue }, at('L16', '王导') - .3, at('L16', '撑腰'));
  rel(c2(1) - 75, P3 - 20, c2(0) + 70, P3 - 20, '撑腰', at('L16', '撑腰') - .3, at('L16', '撑腰') + .1, C.blue, { ly: 30 });
  D(P, [W.roundRect(x2 + 135, DIV + 25, 810, 300, 40, { w: 7 }), ...txt('东晋 317', x2 + 140, DIV + 60, 26, C.purple, { align: 'left' })], at('L16', '建康') - .2, at('L16', '东晋', 0, true) + .2, 'dongjin');
  D(Rr, txt('王与马 共天下', c2(1) + 40, DIV + 60, 28, C.red, { align: 'left' }), at('L16', '王与马') - .2, vend('L16'));
  D(Rr, W.dashed([[x2 + 140, DIV], [x2 + 540, DIV + 5], [x2 + 940, DIV]], { w: 7, dash: 44, gap: 22 }), VO.L17 - .2, at('L17', '南北分家', 0, true), 'divide');
  D(B, txt('北', x2 + 985, DIV - 40, 42, C.blue), at('L17', '南北分家') - .1, at('L17', '南北分家') + .3);
  D(Rr, txt('南', x2 + 985, DIV + 44, 42, C.red), at('L17', '南北分家') + .2, at('L17', '南北分家', 0, true) + .3);
  // 十几个群 in the band between the northern rows
  const SIX = []; for (let i = 0; i < 9; i++) SIX.push(W.circle(x2 + 175 + i * 52, 818, 15, { w: 4, color: [C.blue, C.green, C.k, C.orange][i % 4] }));
  D(B2, SIX, at('L17', '十几个群') - .3, at('L17', '十几个群', 0, true) + .3, 'six');
  D(Rr, txt('五胡十六国', x2 + 760, 818, 36, C.red), at('L17', '五胡十六国') - .3, vend('L17'), 'title16');
  F('石勒', c2(0), P2, { r: 40, hat: 'band', brow: 'angry', mouth: 'grin', beard: 'full', col: C.orange }, at('L18', '石勒') - .4, at('L18', '奴隶出身', 0, true));
  D(Rr, txt('后赵', c2(0) - 95, P2 - 60, 30, C.red), at('L18', '后赵') - .1, at('L18', '后赵', 0, true) + .2);
  rel(c2(0) + 60, P2 - 55, c2(1) - 30, P1 + 150, '灭前赵', at('L18', '前赵') - .3, at('L18', '灭了', 0, true), C.red, { lh: 28, lx: 40, ly: 0 });
  F('苻坚', c2(2), P2, { r: 40, hat: 'crown', mouth: 'smile', beard: 'goatee', col: C.blue }, at('L19', '苻坚') - .4, at('L19', '前秦'));
  F('王猛', c2(3), P2, { r: 40, hat: 'scholar', eye: 'line', beard: 'long', col: C.green }, at('L19', '王猛') - .4, at('L19', '治国', 0, true));
  rel(c2(2) + 65, P2 - 40, c2(3) - 65, P2 - 40, '重用', at('L19', '重用') - .3, at('L19', '重用') + .2, C.blue);
  const QQ = [x2 + 540, 803, 405, 258];
  D(B, [W.roundRect(x2 + 135, 545, 810, 516, 40, { w: 9 }), ...txt('前秦 376', c2(2) - 90, P2 - 70, 30, C.blue)], at('L19', '376') - .2, vend('L19') + .2, 'qianqin');
  bubble('投鞭断流 号称百万', c2(1), P2 - 20, 28, at('L20', '投鞭') - .2, at('L20', '断其流', 0, true));
  F('谢安', c2(2), P3, { hat: 'scholar', eye: 'line', mouth: 'smile', beard: 'long', col: C.purple }, at('L21', '谢安') - .4, at('L21', '坐镇', 0, true));
  F('谢玄', c2(3), P3, { hat: 'helmet', brow: 'angry', col: C.purple }, at('L21', '谢玄') - .3, at('L21', '北府兵') + .1);
  rel(c2(2) + 70, P3 - 20, c2(3) - 70, P3 - 20, '侄子', at('L21', '侄子') - .3, at('L21', '侄子') + .2, C.k, { ly: 30 });
  const tFei = at('L22', '淝水');
  xmark(c2(1), DIV, 44, tFei - .15, tFei + .2, 13); tl.cue(tFei + .2, 'impact');
  D(Rr, txt('淝水 383', c2(1), DIV - 75, 30, C.red), tFei + .25, tFei + .8);
  bubble('小儿辈遂已破贼', c2(3) - 40, DIV + 60, 24, at('L23', '小儿辈') - .2, at('L23', '破贼', 0, true) + .1, C.purple);
  { const cr = (x, y, dx, dy) => W.poly([x, y, x + dx * .3 + dy * .3, y + dy * .3 - dx * .3, x + dx * .6 - dy * .3, y + dy * .6 + dx * .3, x + dx, y + dy], { w: 6, jitter: .3 });
    D(Rr, [cr(x2 + 135, 700, 40, 36), cr(x2 + 945, 760, -40, 36), cr(x2 + 520, 545, 30, 44), cr(x2 + 760, 1061, 30, -44)], VO.L24 + .1, at('L24', '散架', 0, true), 'qqcrack'); }

  // ═════════ BOARD 3 — 北魏 → 南朝换群主 / 北朝拆群 → 隋 → 独孤信
  const x3 = X(2), c3 = i => x3 + CX[i];
  header(2, [3, 4], VO.L25 - .9);
  const Q1 = 520, Q2 = 830, DIV3 = 1035, Q3 = 1180;
  F('拓跋珪', c3(0), Q1, { hat: 'xianbei', mouth: 'smile', col: C.blue }, at('L25', '拓跋珪') - .4, at('L25', '北魏') + .1);
  F('拓跋焘', c3(1), Q1, { hat: 'xianbei', brow: 'angry', mouth: 'grin', beard: 'goatee', col: C.blue }, at('L25', '拓跋焘') - .4, at('L25', '439'));
  rel(c3(0) + 75, Q1 - 30, c3(1) - 75, Q1 - 30, '孙子', at('L25', '孙子') - .3, at('L25', '孙子') + .2);
  D(B, txt('北魏 439 统一北方', x3 + 325, 375, 32, C.blue), at('L25', '439') - .2, vend('L25'));
  D(Rr, W.dashed([[x3 + 140, DIV3], [x3 + 540, DIV3 + 5], [x3 + 940, DIV3]], { w: 7, dash: 44, gap: 22 }), at('L26', '对峙') - .5, at('L26', '对峙', 0, true), 'divide3');
  D(B, txt('北朝', x3 + 985, DIV3 - 40, 38, C.blue), at('L26', '南北朝') - .2, at('L26', '南北朝') + .2);
  D(Rr, txt('南朝', x3 + 985, DIV3 + 42, 38, C.red), at('L26', '南北朝') + .1, vend('L26') + .2);
  const xw = [c3(2), Q1];
  F('孝文帝', ...xw, { hat: 'xianbei', mouth: 'smile', col: C.blue }, at('L27', '孝文帝') - .4, at('L27', '洛阳'));
  const tHan = at('L27', '改穿汉服');
  tl.erase([[xw[0] - 50, xw[1] - 70], [xw[0] + 50, xw[1] - 70], [xw[0] - 50, xw[1] + 20], [xw[0] + 50, xw[1] + 20]], tHan - .2, .35, { width: 44 });
  tl.erase([[xw[0] - 44, xw[1] - 30], [xw[0] - 44, xw[1] + 30]], tHan - .1, .15, { width: 30 }); tl.erase([[xw[0] + 44, xw[1] - 30], [xw[0] + 44, xw[1] + 30]], tHan + .05, .15, { width: 30 });
  D(K, fig(...xw, { r: 42, hat: 'crown', mouth: 'smile' }).L.slice(0, 10), tHan + .2, tHan + .9);
  D(Rr, [...txt('拓跋', xw[0] - 40, 375, 32, C.gray), W.line(xw[0] - 80, 375, xw[0], 375, { w: 5 }), ...txt('元', xw[0] + 40, 375, 42, C.red)], at('L27', '姓') - .1, vend('L27') + .1);
  // 南朝: the crown keeps changing hands (bottom row)
  const south = [['刘裕', 0, '宋 420', { hat: 'helmet', brow: 'angry', mouth: 'grin', beard: 'goatee', col: C.red }, 'L29', '刘裕'],
    ['萧道成', 1, '齐 479', { hat: 'futou', mouth: 'flat', beard: 'long', col: C.red }, 'L30', '萧道成'],
    ['萧衍', 2, '梁 502', { hat: 'bald', eye: 'line', mouth: 'smile', prop: 'beads', col: C.red }, 'L30', '萧衍'],
    ['陈霸先', 3, '陈 557', { hat: 'helmet', brow: 'angry', beard: 'full', col: C.red }, 'L32', '陈霸先']];
  const owners = south.map(([nm, ci, lab, o, id, w]) => { const t = at(id, w); const p = F(nm, c3(ci), Q3, o, t - .4, t + .5); D(Rr, txt(lab, c3(ci), DIV3 + 45, 30, C.red), t + .2, t + .7); return p; });
  slide(crown, at('L29', '退群') - .1, at('L29', '退群') + .55, ...crownOn(owners[0]), { arc: 200, lift: 1 });
  slide(crown, at('L30', '夺位'), at('L30', '夺位') + .5, ...crownOn(owners[1]), { arc: 120, lift: 1 });
  slide(crown, at('L30', '改成了梁') - .1, at('L30', '改成了梁') + .45, ...crownOn(owners[2]), { arc: 120, lift: 1 });
  rel(c3(1) + 70, Q3 - 40, c3(2) - 70, Q3 - 40, '同族', at('L30', '同族') - .3, at('L30', '同族') + .2);
  D(Rr, txt('出家×4 饿死台城', c3(2) - 20, Q3 + 172, 26, C.red), at('L31', '同泰寺') - .3, at('L31', '饿死', 0, true) + .2, 'xiaoyan');
  slide(crown, at('L32', '收拾') - .1, at('L32', '建了陈', 0, true), ...crownOn(owners[3]), { arc: 140, lift: 1 });
  // 北朝: one group split in two (middle row)
  const NB = [x3 + 340, Q2, 170];
  D(B, [W.circle(...NB, { w: 7 }), ...txt('北魏末', NB[0], NB[1], 34, C.blue)], VO.L33 - .3, VO.L33 + .7, 'nb');
  tl.erase(ringPath(NB[0], NB[1], NB[2], NB[2]), at('L34', '各扶') - .2, .45, { width: 40 });
  tl.erase(W.zigzag(NB[0] - 60, NB[1] - 25, 120, 50, 2), at('L34', '各扶') + .2, .2, { width: 50 });
  const WW = [c3(0), Q2, 92], EE = [c3(1) + 20, Q2, 92];
  F('宇文泰', WW[0], WW[1] - 25, { r: 30, hat: 'helmet', eye: 'line', mouth: 'smile', beard: 'full', col: C.green, nh: 28 }, at('L34', '宇文泰') - .4, at('L34', '西魏'));
  F('高欢', EE[0], EE[1] - 25, { r: 30, hat: 'helmet', brow: 'angry', mouth: 'grin', beard: 'goatee', col: C.blue, nh: 28 }, at('L34', '高欢') - .4, at('L34', '东魏'));
  D(G, [W.circle(WW[0], WW[1], WW[2], { w: 6 }), ...txt('西魏', WW[0], WW[1] + 118, 28, C.green)], at('L34', '西魏') - .1, at('L34', '西魏', 0, true) + .3);
  D(B, [W.circle(EE[0], EE[1], EE[2], { w: 6 }), ...txt('东魏', EE[0], EE[1] + 118, 28, C.blue)], at('L34', '东魏') - .1, at('L34', '东魏', 0, true) + .3);
  tl.cue(at('L34', '拆成两个'), 'hit');
  const tQi = at('L35', '北齐'), tZhou = at('L35', '北周');
  D(Rr, W.line(EE[0] - 32, EE[1] + 118, EE[0] + 32, EE[1] + 121, { w: 5 }), tQi - .35, tQi - .15);
  D(B, txt('北齐 高洋', EE[0], EE[1] + 150, 26, C.blue), tQi - .15, tQi + .4);
  D(Rr, W.line(WW[0] - 32, WW[1] + 118, WW[0] + 32, WW[1] + 121, { w: 5 }), tZhou - .35, tZhou - .15);
  D(G, txt('北周 宇文觉', WW[0], WW[1] + 150, 26, C.green), tZhou - .15, tZhou + .4);
  const tMie = at('L36', '灭了北齐');
  D(G, txt('武帝宇文邕', WW[0], WW[1] + 180, 26, C.green), at('L36', '宇文邕') - .3, at('L36', '宇文邕', 0, true) + .1);
  rel(WW[0] + 72, WW[1] + 178, EE[0] - 62, EE[1] + 154, '灭', tMie - .3, tMie + .1, C.red, { lh: 28, ly: 22 });
  xmark(EE[0], EE[1] + 150, 44, tMie + .1, tMie + .4, 7);
  // 隋 (right column)
  const yang = F('杨坚', c3(3), Q2, { hat: 'futou', eye: 'line', mouth: 'smile', beard: 'goatee', col: C.gold }, at('L37', '杨坚') - .5, at('L37', '581'));
  rel(c3(3) - 65, Q2 - 60, WW[0] + 30, WW[1] - 98, '北周宣帝的岳父', at('L37', '岳父') - .6, at('L37', '岳父') + .3, C.gold, { curve: [x3 + 480, Q2 - 112], lx: 150, ly: -6, lh: 24 });
  D(Y, [W.roundRect(c3(3) - 75, Q1 - 30, 150, 60, 24, { w: 6 }), ...txt('隋 581', c3(3), Q1, 32, C.gold)], at('L37', '建了隋') - .3, at('L37', '建了隋', 0, true) + .2, 'sui');
  D(Rr, txt('589隋灭陈', c3(3) + 10, Q3 + 172, 26, C.red), at('L38', '灭陈') - .4, at('L38', '灭陈', 0, true) + .2, 'miechen');
  slide(crown, at('L38', '灭陈'), at('L38', '灭陈', 0, true) + .5, ...crownOn(yang), { arc: 220, lift: 1 });
  D(Y, W.roundRect(x3 + 120, 345, 840, 1020, 50, { w: 10 }), VO.L39 - .2, vend('L39'), 'suiring');
  tl.cue(vend('L39'), 'ding');
  // 独孤信: one man, lines into three ruling houses (centre of the 北朝 row)
  const DG = [c3(2), Q2];
  D(Y, [W.roundRect(DG[0] - 72, DG[1] - 34, 144, 68, 26, { w: 6 }), ...txt('独孤信', DG[0], DG[1], 34, C.gold)], at('L40', '独孤信') - .4, at('L40', '独孤信', 0, true) + .3, 'dugu');
  rel(DG[0] - 74, DG[1] - 10, WW[0] + 100, WW[1] - 20, '大女儿', at('L41', '大女儿') - .3, at('L41', '北周明帝', 0, true), C.green, { curve: [x3 + 430, Q2 - 70], lx: 0, ly: -16, lh: 26 });
  D(Rr, [...W.arrow(DG[0], DG[1] + 36, DG[0], DG[1] + 90, { w: 4, head: 14 }), W.roundRect(DG[0] - 70, DG[1] + 92, 140, 46, 18, { w: 5 }), ...txt('唐 李渊', DG[0], DG[1] + 115, 26, C.red), ...txt('四女儿', DG[0] - 62, DG[1] + 62, 22, C.k)], at('L41', '四女儿') - .2, at('L41', '李渊', 0, true) + .2);
  rel(DG[0] + 74, DG[1], c3(3) - 70, Q2 + 10, '七女儿', at('L41', '七女儿') - .3, at('L41', '独孤伽罗', 0, true), C.gold, { lx: 0, ly: -18, lh: 24 });
  D(Rr, txt('一家亲戚！', DG[0], DG[1] + 170, 30, C.red), at('L42', '一家亲戚') - .3, at('L42', '一家亲戚', 0, true) + .2, 'family');
  tl.cue(vend('L42') + .05, 'cap');

  // ▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲ TOPIC CONTENT ends ▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲
  runJobs();
  tl.erasers.sort((a, b) => a.t0 - b.t0); tl.erasers.forEach((e, i) => { e.id = i; });
  for (const s of tl.strokes) { let k = 0; while (k < tl.erasers.length && tl.erasers[k].t0 <= s.t0) k++; s.epoch = k; }
  for (const e of tl.erasers) e.strength = Math.max(e.strength, .97);
  tl.end();

  // ───────── camera: fixed on the current board; a short slide to the next one; the 淝水 punch-in; then all three boards
  const CY = 960, Z = 1;
  const first = k => lines.find(l => l.board === k).id, LAST = lines[lines.length - 1].id;
  const b2 = VO[first(2)] - 1.2, b3 = VO[first(3)] - 1.2, tOver = vend(LAST) + HOLD_END;
  const CK = [
    [0, X(0) + 540, CY, Z], [b2 - .9, X(0) + 540, CY, Z * 1.01, 0, 'l'], [b2, X(1) + 540, CY, Z],
    [tFei - .4, X(1) + 540, CY, Z, 0, 'l'], [tFei - .05, X(1) + 600, DIV, 1.45, 0, 'o'], [tFei + .6, X(1) + 600, DIV, 1.5, 0, 'l'], [tFei + 1.3, X(1) + 540, CY, Z],
    [b3 - .9, X(1) + 540, CY, Z * 1.01, 0, 'l'], [b3, X(2) + 540, CY, Z],
    [tOver, X(2) + 540, CY, Z * 1.01, 0, 'l'], [tOver + 1.2, BOARD_W / 2, CY, 1080 / BOARD_W * .98], [END, BOARD_W / 2, CY, 1080 / BOARD_W * .98, 0, 'l'],
  ];
  const cam = new W.Camera(CK);
  for (const [t, d] of [[b2 - .9, .9], [b3 - .9, .9], [tOver, 1.2]]) tl.ev.push({ t: +(t + .1).toFixed(3), type: 'whip', dur: d });
  tl.ev.sort((a, b) => a.t - b.t);

  const pose = (p, t) => W.penPose(p, t, cam);
  const board = new W.Board(tl, { ghosts, W: BOARD_W, H: BOARD_H });
  board.objs.push({ draw: (ctx, t, c) => { for (const m of mags) (m.draw || drawMag)(ctx, m, t, c); } });
  board.objs.push({ draw: (ctx, t, c) => { for (const e of tl.erasers) W.drawEraser(ctx, e, t, c); } });
  const Q = new URLSearchParams(location.search);
  if (!Q.has('nopens')) board.objs.push({ draw: (ctx, t, c) => { for (const p of PENS) W.drawMarker(ctx, p, pose(p, t), c, t); } });

  // ───────── subtitles: ≤ 12 characters a line, two lines at most, bottom edge at y≈1480
  const subs = [];
  for (const L of lines) {
    const parts = L.text.match(/[^，。；：！？]+[，。；：！？]?/g).reduce((acc, p) => {
      const last = acc[acc.length - 1], strip = s => s.replace(/[，。；：]/g, '');
      if (last != null && (strip(last) + strip(p)).length <= 12) acc[acc.length - 1] += p; else acc.push(p); return acc;
    }, []);
    let pos = 0;
    for (const p of parts) {
      const i0 = LT[L.id].indexOf(p, pos); pos = i0 + p.length;
      const t0 = i0 === 0 ? VO[L.id] : atI(L.id, i0), t1 = atI(L.id, i0 + p.length);
      const text = p.replace(/[，。；：]$/, '').replace(/[，；：。]/g, ' ').trim(), c = [...text];
      if (c.length <= 12) subs.push({ t0: t0 - .06, t1: t1 + .3, text });
      else { const h = Math.ceil(c.length / 2), tm = t0 + (t1 - t0) * h / c.length; subs.push({ t0: t0 - .06, t1: tm, text: c.slice(0, h).join('') }, { t0: tm, t1: t1 + .3, text: c.slice(h).join('') }); }
    }
  }
  for (let i = 0; i < subs.length - 1; i++) subs[i].t1 = Math.min(Math.max(subs[i].t1, subs[i].t0 + 1.2), subs[i + 1].t0 - .03);
  subs[subs.length - 1].t1 = vend(LAST) + .5;
  const wrap = s => { const c = [...s]; if (c.length <= 12) return [s]; const h = Math.ceil(c.length / 2); let k = h; for (let d = 0; d < 4; d++) { if (c[h + d] === ' ') { k = h + d; break; } if (c[h - d] === ' ') { k = h - d; break; } } return [c.slice(0, k).join('').trim(), c.slice(k).join('').trim()]; };
  board.overlays.push({
    draw: (ctx, t) => {
      const s = subs.find(s => t >= s.t0 && t < s.t1); if (!s) return;
      const a = Math.min(1, (t - s.t0) / .1, (s.t1 - t) / .1), rows = wrap(s.text);
      ctx.font = '64px WK'; const w = Math.max(...rows.map(r => ctx.measureText(r).width)) + 70, h = 30 + rows.length * 76, y0 = 1727 - h;   // user-chosen spot, centred near y 1675
      ctx.globalAlpha = a * .93; ctx.fillStyle = '#fdfcf8'; ctx.shadowColor = 'rgba(30,30,40,.2)'; ctx.shadowBlur = 18; ctx.shadowOffsetY = 4;
      ctx.beginPath(); ctx.roundRect(540 - w / 2, y0, w, h, 18); ctx.fill();
      ctx.shadowColor = 'transparent'; ctx.globalAlpha = a; ctx.fillStyle = '#23262c'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      rows.forEach((r, i) => ctx.fillText(r, 540, y0 + 15 + 38 + i * 76));
    }
  });
  if (Q.has('nosubs')) board.overlays.length = 0;

  const off = new OffscreenCanvas(W.VIEW.w, W.VIEW.h), oc = off.getContext('2d');
  const FPS = 30;
  const fixCam = Q.get('cam') ? new W.Camera([[0, ...Q.get('cam').split(',').map(Number)]]) : null;
  function render(ctx, t) {
    if (fixCam) { board.render(ctx, t, fixCam); return; }
    const dt = 1 / FPS, a = cam.at(t), b = cam.at(Math.max(0, t - dt));
    const sp = Math.hypot((a.x - b.x) * a.z, (a.y - b.y) * a.z) + Math.abs(Math.log(a.z / b.z)) * 900;
    const N = sp > 14 ? Math.min(12, Math.ceil(sp * .5 / 4)) : 1;
    if (N === 1) { board.render(ctx, t, cam); return; }
    const ov = board.overlays; board.overlays = [];
    for (let i = 0; i < N; i++) { board.render(oc, t - dt * .5 * i / (N - 1), cam); ctx.globalAlpha = 1 / (i + 1); ctx.drawImage(off, 0, 0); }
    ctx.globalAlpha = 1; board.overlays = ov;
    for (const o of ov) { ctx.save(); o.draw(ctx, t); ctx.restore(); }
  }

  const ev = [...tl.ev, ...Object.entries(VO).map(([id, t]) => ({ t, type: 'vo', id }))].sort((a, b) => a.t - b.t);
  for (const e of ev) if (e.x != null) { const c = cam.at(Math.max(0, e.t)), [px, py] = W.toScreen(c, e.x, e.y); e.pan = +clamp((px - 540) / 900, -.7, .7).toFixed(2); e.z = +c.z.toFixed(2); e.on = px > -100 && px < 1180 && py > -100 && py < 2020 ? 1 : 0; }
  window.__LAG = LAG;
  window.__T = { VO, END, impact: tFei + .2, SEC: [...SEC].map(id => VO[id]) };
  return { dur: END, render, ev, subs, cam, tl, VO, at };
}
