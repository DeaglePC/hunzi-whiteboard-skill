// Phone readability check: node tools/phonecheck.mjs <src> [--min 30] [--shot 20] [--ocr]
//   geometry (always): every board label's best on-screen size, the final screenshot frame, overlaps, lines through labels, safe area
//   --ocr: also renders the key stills at phone-ish size (540 wide) and asks macOS Vision which labels it can still read
// Writes build/phonecheck.json. Exit code 1 when there are 'small' / 'overlap' / 'crossed' / 'unsafe' issues (a 'shot' alone is a warning).
import fs from 'fs'; import path from 'path'; import { execFileSync } from 'child_process'; import { fileURLToPath } from 'url';
const LIB = process.env.LIB || process.env.HOME + '/lemo-opuscar';
const { openDemo, closeServer } = await import(LIB + '/core/render/page.mjs');
const args = process.argv.slice(2), opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const dir = path.resolve(args[0] || path.join(path.dirname(fileURLToPath(import.meta.url)), '..')), B = path.join(dir, '..', 'build');
const MIN = +opt('--min', 30), SHOT = +opt('--shot', 20);
const { browser, page } = await openDemo(dir, { w: 1080, h: 1920, q: 'nosubs=1&nopens=1' + (opt('--q') ? '&' + opt('--q') : '') });
const res = await page.evaluate(o => window.__PHONECHECK ? window.__PHONECHECK(o) : null, { minPx: MIN, shotPx: SHOT });
if (!res) { console.error('phonecheck: NOT CHECKED — the page has no window.__PHONECHECK (see engine/tour.js)'); process.exit(2); }
const kt = await page.evaluate(() => window.__KEYTIMES || []);
let ocr = null;
if (args.includes('--ocr')) {
  ocr = [];
  const sd = path.join(B, 'phonecheck'); fs.mkdirSync(sd, { recursive: true });
  for (const [name, t] of kt) {
    await page.evaluate(t => window.render(t), t);
    const f = path.join(sd, `${name}.png`); await page.screenshot({ path: f });
    execFileSync('sips', ['-Z', '960', f, '--out', f], { stdio: 'ignore' });          // 1080×1920 → 540×960: roughly what a phone shows at arm's length
    const read = execFileSync('swift', [path.join(dir, 'tools', 'ocr.swift'), f], { encoding: 'utf8' }).replace(/\s/g, '');
    const want = await page.evaluate(t => window.__ONSCREEN(t), t);
    const hitRate = s => { const c = [...s.replace(/[\s·,，:：!！?？()（）]/g, '')]; return c.length ? c.filter(ch => read.includes(ch)).length / c.length : 1; };
    const missed = want.filter(w => hitRate(w) < .6);
    ocr.push({ still: name, t, labels: want.length, unread: missed.length, missed });
  }
}
await browser.close(); closeServer();
fs.mkdirSync(B, { recursive: true }); fs.writeFileSync(path.join(B, 'phonecheck.json'), JSON.stringify({ ...res, ocr }, null, 1));
const S = res.summary, NAME = { small: '太小（全片最大时 < ' + MIN + 'px）', shot: '结尾截图里 < ' + SHOT + 'px', overlap: '标签互相重叠', crossed: '线穿过标签', unsafe: '画的时候在安全区外' };
console.log(`phonecheck: ${res.labels} 个标签`);
for (const k of Object.keys(NAME)) {
  const L = res.issues.filter(i => i.kind === k); if (!L.length) { console.log(`  ✓ ${NAME[k]}: 0`); continue; }
  console.log(`  ✗ ${NAME[k]}: ${L.length}`);
  for (const i of L.slice(0, 12)) console.log('     ' + [i.text, i.other && '↔ ' + i.other, i.by && '被 ' + i.by, i.px != null && i.px + 'px', i.t != null && '@' + i.t + 's'].filter(Boolean).join('  '));
  if (L.length > 12) console.log(`     …还有 ${L.length - 12} 条，见 build/phonecheck.json`);
}
if (ocr) for (const o of ocr) console.log(`  OCR ${o.still} @${o.t.toFixed(1)}s（540 宽）: ${o.labels - o.unread}/${o.labels} 认得出` + (o.missed.length ? '；认不出：' + o.missed.slice(0, 10).join('、') : ''));
process.exit(S.small + S.overlap + S.crossed + S.unsafe ? 1 : 0);
