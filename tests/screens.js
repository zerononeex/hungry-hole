// Screenshots for review (v5): menus, scenes in each of the five worlds, the big map, the finale, and each mode. node tests/screens.js <outdir>
const { chromium } = require('playwright');
const URL = process.env.HH_URL || 'http://localhost:8765/index.html', OUT = process.argv[2] || 'docs/screenshots';
(async () => {
  const b = await chromium.launch(); const errs = [];
  const page = async (w, h) => { const p = await b.newPage({ viewport: { width: w, height: h } }); p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
    await p.goto(URL); await p.waitForTimeout(400); await p.evaluate(() => { for (let n = 1; n <= 5; n++) HH.S.ch[n].u = 1; HH.S.ch[1].w = 640; HH.S.ch[1].up = [3, 2, 0, 1, 0, 0, 0, 0, 0, 0]; HH.UI.main(); }); return p; };
  const shot = (p, name) => p.screenshot({ path: `${OUT}/${name}.jpg`, type: 'jpeg', quality: 82 });
  const p = await page(1180, 820);
  await shot(p, '01-main');
  await p.evaluate(() => HH.UI.chapters('story')); await p.waitForTimeout(300); await shot(p, '02-worlds-story-pick');
  await p.evaluate(() => HH.UI.upgrades(1)); await p.waitForTimeout(300);
  const card = await p.$('[data-up="1"]'); const bx = await card.boundingBox();
  await p.mouse.move(bx.x + bx.width / 2, bx.y + bx.height / 2); await p.mouse.down(); await p.waitForTimeout(700); await shot(p, '03-upgrades-3d-icons'); await p.mouse.up();
  await p.evaluate(() => HH.UI.board(1, 'chapters')); await p.waitForTimeout(300); await shot(p, '04-quest-board');
  await p.evaluate(() => HH.UI.settings('main')); await p.waitForTimeout(300); await shot(p, '05-settings-music-osm-credit');
  // scenes: [file, world, mode, hole size in m (null: as the mode starts), place id or [lon, lat] or null, offset in hole widths x, y]
  const scenes = [
    ['10-w1-home-story-start', 1, 'story', null, null, 0, 0], ['11-w1-home-kitchen', 1, 'explore', .45, 'kettle', 1.5, 1], ['12-w1-home-dollhouse', 1, 'explore', 3, 'mid', 0, 0],
    ['13-w2-vancouver-story-start', 2, 'story', null, null, 0, 0], ['14-w2-downtown', 2, 'explore', 30, 'canadaplace', 0, 1.5], ['15-w2-street-corner-lamps', 2, 'explore', 3, [-123.1207, 49.2827, 100, -50], 0, 0],
    ['16-w2-whistler-snow', 2, 'explore', 300, 'whistler', 0, 1],
    ['17-w3-stanley-story-start', 3, 'story', null, null, 0, 0], ['18-w3-aquarium', 3, 'explore', 8, 'aquarium', 0, 1.5], ['19-w3-lighthouse', 3, 'explore', 6, 'brocktonlh', 1, 1], ['20-w3-park-overview', 3, 'explore', 160, 'mid', 0, 0],
    ['21-w4-space-story-start', 4, 'story', null, null, 0, 0], ['22-w4-saturn', 4, 'explore', 'x1.4', 'saturn', 1.2, 0.4],
    ['23-w5-globe-story-start', 5, 'story', null, null, 0, 0], ['24-w5-golden-gate', 5, 'explore', 'x1.5', 'goldengate', 1, 1], ['25-w5-europe', 5, 'explore', 220, 'eiffel', 0, 0], ['26-w5-the-world', 5, 'explore', 1300, 'everest', 0, 0],
  ];
  for (const [file, n, mode, d, id, ox, oy] of scenes) {
    await p.evaluate(([n, mode, d, id, ox, oy]) => { const { G } = HH; HH.UI.closeModal && HH.UI.closeModal(); HH.startChapter(n, mode);
      const o = typeof id === 'string' && id !== 'mid' && G.auth.find(o => o.id === id);
      if (d) HH.setHoleD(typeof d === 'string' ? o.fw * +d.slice(1) : d);
      if (o) { G.x = o.x + ox * HH.holeD(); G.y = o.y + oy * HH.holeD(); }
      else if (id === 'mid') { G.x = G.C.W / 2; G.y = G.C.H / 2; }
      else if (Array.isArray(id)) { const q = G.C.P(id[0], id[1]); G.x = q[0] + id[2]; G.y = q[1] + id[3]; }
      G.cam.x = G.x; G.cam.y = G.y; }, [n, mode, d, id, ox, oy]);
    await p.waitForTimeout(1800); await shot(p, file);
  }
  // the big map (tap the minimap), the Globe's to-scale world at 100%
  await p.evaluate(() => { HH.G.bigmap = { zi: 0 }; }); await p.waitForTimeout(500); await shot(p, '27-w5-big-map');
  await p.evaluate(() => { HH.startChapter(3, 'story'); HH.G.bigmap = { zi: 0 }; }); await p.waitForTimeout(900); await shot(p, '28-w3-big-map');
  // the finale: the Globe's last objective rolls the credits
  await p.evaluate(() => { HH.G.bigmap = null; HH.startChapter(5); HH.G.C.finish(false); }); await p.waitForTimeout(4500); await shot(p, '29-finale-credits');
  // modes
  await p.evaluate(() => { HH.G.cine = null; HH.UI.main(); }); await p.waitForTimeout(200); await shot(p, '30-menu-four-modes');
  await p.evaluate(() => HH.UI.chapters('ispy')); await p.waitForTimeout(300); await shot(p, '31-ispy-picker');
  await p.evaluate(() => { const { G } = HH; HH.startChapter(2, 'ispy'); const t = G.run.tg[0].o; if (t) { G.x = t.x + HH.holeD() * 3; G.y = t.y; } G.cam.x = G.x; G.cam.y = G.y; });
  await p.waitForTimeout(1500); await shot(p, '32-ispy-run-w2');
  await p.evaluate(() => { const { G } = HH; G.run.tg.forEach(t => t.o && HH.eat(t.o)); }); await p.waitForTimeout(1300); await shot(p, '33-ispy-win');
  await p.evaluate(() => { HH.UI.closeModal(); HH.UI.chapters('edu'); }); await p.waitForTimeout(300); await shot(p, '34-edu-picker');
  await p.evaluate(() => { const { G, S } = HH; S.edu[5] = { set: 0, done: 0 }; HH.startChapter(5, 'edu'); G.helpOn = HH.MODES.edu.target(); });
  await p.waitForTimeout(1500); await shot(p, '35-edu-w5-help-arrow');
  await p.evaluate(() => { const { G, S } = HH; const mi = HH.CH[1].edu.findIndex(E => E.s.some(x => x[0] === 'm')); S.edu[1] = { set: mi, done: 0 }; HH.startChapter(1, 'edu'); G.lvl = 4; });
  await p.waitForTimeout(3600); await shot(p, '36-edu-w1-local-sums');
  await p.evaluate(() => { const { G, S } = HH; S.edu[3] = { set: 0, done: 0 }; HH.startChapter(3, 'edu'); G.helpOn = HH.MODES.edu.target(); });
  await p.waitForTimeout(1500); await shot(p, '37-edu-w3');
  await p.evaluate(() => { HH.UI.closeModal(); HH.UI.chapters('explore'); }); await p.waitForTimeout(300); await shot(p, '38-exploration-picker');
  await p.evaluate(() => { HH.UI.closeModal(); const { G } = HH; HH.startChapter(2); G.lvl = 3; G.cam.x = G.x; G.cam.y = G.y; });
  await p.waitForTimeout(1500); await shot(p, '42-hud-upgrades-button');
  const ph = await page(844, 390); await shot(ph, '40-phone-main');
  await ph.evaluate(() => HH.startChapter(3)); await ph.waitForTimeout(1200); await shot(ph, '41-phone-game');
  console.log('screens done; console errors:', errs.length, errs.slice(0, 3)); await b.close();
  process.exit(errs.length ? 1 : 0);
})();
