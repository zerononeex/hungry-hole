// Screenshots for review: node tests/screens.js <outdir>
const { chromium } = require('playwright');
const URL = process.env.HH_URL || 'http://localhost:8765/index.html', OUT = process.argv[2] || 'docs/screenshots';
(async () => {
  const b = await chromium.launch(); const errs = [];
  const page = async (w, h) => { const p = await b.newPage({ viewport: { width: w, height: h } }); p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
    await p.goto(URL); await p.waitForTimeout(400); await p.evaluate(() => { for (let n = 1; n <= 7; n++) HH.S.ch[n].u = 1; HH.S.ch[1].w = 640; HH.S.ch[1].up = [3, 2, 0, 1, 0, 0, 0, 0, 0, 0]; HH.UI.main(); }); return p; };
  const shot = (p, name) => p.screenshot({ path: `${OUT}/${name}.jpg`, type: 'jpeg', quality: 82 });
  const p = await page(1180, 820);
  await shot(p, '01-main');
  await p.evaluate(() => HH.UI.chapters()); await p.waitForTimeout(300); await shot(p, '02-chapters');
  await p.evaluate(() => HH.UI.upgrades(1)); await p.waitForTimeout(300);
  const card = await p.$('[data-up="1"]'); const bx = await card.boundingBox();
  await p.mouse.move(bx.x + bx.width / 2, bx.y + bx.height / 2); await p.mouse.down(); await p.waitForTimeout(700); await shot(p, '03-upgrades-hold-popup'); await p.mouse.up();
  await p.evaluate(() => HH.UI.board(1, 'chapters')); await p.waitForTimeout(300); await shot(p, '04-quest-board');
  await p.evaluate(() => HH.UI.settings('main')); await p.waitForTimeout(300); await shot(p, '05-settings');
  // one scene per chapter: [chapter, size, landmark id or null, dx, dy]
  const scenes = [[1, 2, null, 0, 0], [2, 3, 'home', 0, 260], [3, 5, 'Canada Place', 0, 300], [4, 4, 'dam1', 300, 200], [5, 7, 'eiffel', 300, 100], [6, 7, 'saturn', 400, 200], [7, 7, 'gstar0', 900, 500]];
  for (const [n, l, id, ox, oy] of scenes) {
    await p.evaluate(([n, l, id, ox, oy]) => { const { G } = HH; HH.startChapter(n); G.lvl = l; G.xp = 0;
      const o = id && G.auth.find(o => o.id === id || o.label === id); if (o) { G.x = o.x + ox * HH.holeD() / 40; G.y = o.y + oy * HH.holeD() / 40; }
      G.cam.x = G.x; G.cam.y = G.y; G.cam.z = 1280 / (HH.holeD() * 13); G.ptr = null; }, [n, l, id, ox, oy]);
    await p.waitForTimeout(1500); await shot(p, `1${n}-chapter${n}`);
  }
  // v3 scale drama: a tower looming over a small hole, and a mountain filling the screen
  const near = async (n, l, pick, back, side, name) => {
    await p.evaluate(([n, l, pick, back, side]) => { const { G } = HH; HH.startChapter(n); G.lvl = l; G.xp = 0; G.ptr = null;
      const m = new RegExp(pick); let o = G.auth.find(o => m.test(o.label || '') || m.test(o.k));
      if (!o) { for (let i = 0; i < 3; i++) { G.now += 33; HH.update(1 / 30); } o = G.vis.filter(o => m.test(o.k)).sort((a, b) => Math.hypot(a.x - G.x, a.y - G.y) - Math.hypot(b.x - G.x, b.y - G.y))[0]; }
      G.x = o.x + o.fw * side; G.y = o.y + o.fw * back; G.cam.x = G.x; G.cam.y = G.y; G.cam.z = 1280 / (HH.holeD() * 13); }, [n, l, pick, back, side]);
    await p.waitForTimeout(1500); await shot(p, name); };
  await near(3, 5, '^(tower|skyline)$', 0.1, -0.85, '18-tower-looming');
  await near(4, 4, 'The Rocky Mountains', 0.56, 0, '19-mountain');
  const ph = await page(844, 390); await shot(ph, '20-phone-main');
  await ph.evaluate(() => HH.startChapter(3)); await ph.waitForTimeout(1200); await shot(ph, '21-phone-game');
  console.log('screens done; console errors:', errs.length, errs.slice(0, 3)); await b.close();
})();
