// Screenshots for review (v4): menus, one or more scenes per chapter, and each mode. node tests/screens.js <outdir>
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
  await p.mouse.move(bx.x + bx.width / 2, bx.y + bx.height / 2); await p.mouse.down(); await p.waitForTimeout(700); await shot(p, '03-upgrades-3d-icons'); await p.mouse.up();
  await p.evaluate(() => HH.UI.board(1, 'chapters')); await p.waitForTimeout(300); await shot(p, '04-quest-board');
  await p.evaluate(() => HH.UI.settings('main')); await p.waitForTimeout(300); await shot(p, '05-settings-music-osm-credit');
  // scenes: [file, chapter, size, place id/label or null, offset in hole widths x, y]
  const scenes = [
    ['10-ch1-house-playroom', 1, 2, null, 0, 0], ['11-ch1-house-kitchen', 1, 6, 'island', -2, 3],
    ['12-ch2-backyard', 2, 3, null, 0, 0], ['13-ch2-streets', 2, 7, 'myhouse', 0, 6],
    ['14-ch3-downtown', 3, 5, 'canadaplace', 0, 2], ['15-ch3-stanley-park', 3, 4, 'aquarium', 1, 1], ['16-ch3-whistler', 3, 6, 'whistler', 0, 1], ['17-ch3-border', 3, 6, 'peacearch', 0, -1],
    ['18-ch4-ant-campsite', 4, 1, null, 0, 0], ['19-ch4-dam', 4, 11, 'dam', 1, 1], ['20-ch4-desert', 4, 10, 'dinodig', 1, 0], ['21-ch4-antarctic', 4, 10, 'station', 1, 1],
    ['22-ch5-globe-tracker', 5, 4, 'eiffel', 1, 1], ['23-ch6-iss-earth', 6, 2, 'iss', 1, 0], ['24-ch6-saturn-rings', 6, 6, 'saturn', 1.2, 0.4], ['25-ch7-chaos', 7, 5, 'whale1', 1, 1],
  ];
  for (const [file, n, l, id, ox, oy] of scenes) {
    await p.evaluate(([n, l, id, ox, oy]) => { const { G } = HH; HH.startChapter(n); G.lvl = l; G.xp = 0;
      const o = id && G.auth.find(o => o.id === id || o.label === id || o.k === id); if (o) { G.x = o.x + ox * HH.holeD(); G.y = o.y + oy * HH.holeD(); }
      G.cam.x = G.x; G.cam.y = G.y; G.cam.z = 1280 / (HH.holeD() * 13); }, [n, l, id, ox, oy]);
    await p.waitForTimeout(1500); await shot(p, file);
  }
  // the Ch5 finale sky (Moon rolling in; the Sun, Mercury and Mars behind)
  await p.evaluate(() => { const { G } = HH; HH.startChapter(5); G.lvl = G.C.N; G.C.finish(); G.cine.t0 = G.now - 1500; });
  await p.waitForTimeout(400); await shot(p, '26-ch5-finale-sky');
  // modes
  await p.evaluate(() => { HH.G.cine = null; HH.UI.main(); }); await p.waitForTimeout(200); await shot(p, '30-menu-story-ispy-edu');
  await p.evaluate(() => HH.UI.chapters('ispy')); await p.waitForTimeout(300); await shot(p, '31-ispy-picker');
  await p.evaluate(() => { const { G } = HH; HH.startChapter(4, 'ispy'); const t = G.run.tg[0].o; if (t) { G.x = t.x + HH.holeD() * 3; G.y = t.y; } G.cam.x = G.x; G.cam.y = G.y; });
  await p.waitForTimeout(1500); await shot(p, '32-ispy-run-ch4');
  await p.evaluate(() => { const { G } = HH; G.run.tg.forEach(t => t.o && HH.eat(t.o)); }); await p.waitForTimeout(1300); await shot(p, '33-ispy-win');
  await p.evaluate(() => { HH.UI.closeModal(); HH.UI.chapters('edu'); }); await p.waitForTimeout(300); await shot(p, '34-edu-picker');
  await p.evaluate(() => { const { G, S } = HH; S.edu[5] = { set: 0, done: 0 }; HH.startChapter(5, 'edu'); G.helpOn = HH.MODES.edu.target(); });
  await p.waitForTimeout(1500); await shot(p, '35-edu-ch5-find-france-help-arrow');
  await p.evaluate(() => { const { G, S } = HH; const mi = HH.CH[1].edu.findIndex(E => E.s.some(x => x[0] === 'm')); S.edu[1] = { set: mi, done: 0 }; HH.startChapter(1, 'edu'); G.lvl = 4; });
  await p.waitForTimeout(3600); await shot(p, '36-edu-ch1-local-sums');
  await p.evaluate(() => { const { G, S } = HH; S.edu[2] = { set: HH.CH[2].edu.findIndex(E => E.s.some(x => x[0] === 'c')), done: 0 }; HH.startChapter(2, 'edu'); G.helpOn = HH.MODES.edu.target(); });
  await p.waitForTimeout(1500); await shot(p, '37-edu-ch2-colour-fetch');
  const ph = await page(844, 390); await shot(ph, '40-phone-main');
  await ph.evaluate(() => HH.startChapter(3)); await ph.waitForTimeout(1200); await shot(ph, '41-phone-game');
  console.log('screens done; console errors:', errs.length, errs.slice(0, 3)); await b.close();
  process.exit(errs.length ? 1 : 0);
})();
