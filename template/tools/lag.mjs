// Report drawing jobs that start late because the single hand is busy
const { openDemo, closeServer } = await import((process.env.LIB || process.env.HOME + '/lemo-opuscar') + '/core/render/page.mjs');
const { browser, page } = await openDemo(process.argv[2]);
const L = await page.evaluate(() => window.__LAG);
console.log(L.length, 'late jobs; >1s', L.filter(l => l[1] > 1).length, '; >2s', L.filter(l => l[1] > 2).length);
console.log(JSON.stringify(L.filter(l => l[1] > 1.2)));
await browser.close(); closeServer();
