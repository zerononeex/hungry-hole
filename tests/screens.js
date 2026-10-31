// Screenshots for review (v5, v5.1): menus, scenes in each of the five worlds, the big map, the finale, and each mode. node tests/screens.js <outdir>
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
    ['13-w3-vancouver-story-start', 3, 'story', null, null, 0, 0], ['14-w3-downtown', 3, 'explore', 30, 'canadaplace', 0, 1.5], ['15-w3-street-corner-lamps', 3, 'explore', 3, [-123.1207, 49.2827, 100, -50], 0, 0],
    ['16-w3-whistler-snow', 3, 'explore', 300, 'whistler', 0, 1],
    ['17-w2-stanley-story-start', 2, 'story', null, null, 0, 0], ['18-w2-aquarium', 2, 'explore', 8, 'aquarium', 0, 1.5], ['19-w2-lighthouse', 2, 'explore', 6, 'brocktonlh', 1, 1], ['20-w2-park-overview', 2, 'explore', 160, 'mid', 0, 0],
    ['21-w4-globe-story-start', 4, 'story', null, null, 0, 0], ['22-w4-golden-gate', 4, 'explore', 'x1.5', 'goldengate', 1, 1], ['23-w4-europe', 4, 'explore', 220, 'eiffel', 0, 0], ['24-w4-the-world', 4, 'explore', 1300, 'everest', 0, 0],
    ['25-w5-space-story-start', 5, 'story', null, null, 0, 0], ['26-w5-saturn', 5, 'explore', 'x1.4', 'saturn', 1.2, 0.4],
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
  await p.evaluate(() => { HH.startChapter(4, 'explore'); HH.G.bigmap = { zi: 0 }; }); await p.waitForTimeout(900); await shot(p, '27-w4-big-map');
  await p.evaluate(() => { HH.startChapter(2, 'story'); HH.G.bigmap = { zi: 0 }; }); await p.waitForTimeout(900); await shot(p, '28-w2-big-map');
  // the finale: Space (World 5, the last world since v5.1) rolls the credits after its last objective, the Sun
  await p.evaluate(() => { HH.G.bigmap = null; HH.startChapter(5); HH.G.C.finish(false); }); await p.waitForTimeout(4500); await shot(p, '29-finale-credits');
  // modes
  await p.evaluate(() => { HH.G.cine = null; HH.UI.main(); }); await p.waitForTimeout(200); await shot(p, '30-menu-four-modes');
  await p.evaluate(() => HH.UI.chapters('ispy')); await p.waitForTimeout(300); await shot(p, '31-ispy-picker');
  await p.evaluate(() => { const { G } = HH; HH.startChapter(3, 'ispy'); const t = G.run.tg[0].o; if (t) { G.x = t.x + HH.holeD() * 3; G.y = t.y; } G.cam.x = G.x; G.cam.y = G.y; });
  await p.waitForTimeout(1500); await shot(p, '32-ispy-run-w3');
  await p.evaluate(() => { const { G } = HH; G.run.tg.forEach(t => t.o && HH.eat(t.o)); }); await p.waitForTimeout(1300); await shot(p, '33-ispy-win');
  await p.evaluate(() => { HH.UI.closeModal(); HH.UI.chapters('edu'); }); await p.waitForTimeout(300); await shot(p, '34-edu-picker');
  await p.evaluate(() => { const { G, S } = HH; S.edu[4] = { set: 0, done: 0 }; HH.startChapter(4, 'edu'); G.helpOn = HH.MODES.edu.target(); });
  await p.waitForTimeout(1500); await shot(p, '35-edu-w4-help-arrow');
  await p.evaluate(() => { const { G, S } = HH; const mi = HH.CH[1].edu.findIndex(E => E.s.some(x => x[0] === 'm')); S.edu[1] = { set: mi, done: 0 }; HH.startChapter(1, 'edu'); G.lvl = 4; });
  await p.waitForTimeout(3600); await shot(p, '36-edu-w1-local-sums');
  await p.evaluate(() => { const { G, S } = HH; S.edu[2] = { set: 0, done: 0 }; HH.startChapter(2, 'edu'); G.helpOn = HH.MODES.edu.target(); });
  await p.waitForTimeout(1500); await shot(p, '37-edu-w2');
  await p.evaluate(() => { HH.UI.closeModal(); HH.UI.chapters('explore'); }); await p.waitForTimeout(300); await shot(p, '38-exploration-picker');
  await p.evaluate(() => { HH.UI.closeModal(); const { G } = HH; HH.startChapter(3); G.lvl = 3; G.cam.x = G.x; G.cam.y = G.y; });
  await p.waitForTimeout(1500); await shot(p, '42-hud-upgrades-button');
  // v5.1 Part 12: never the void. Each world at its MAX size, at a corner of its map (the Globe and Space have none: they
  // wrap / are open space), plus the v5.1 additions: stair signs, the carport, YVR, Science World, Whistler, co-op picker
  for (const [file, n, at] of [['50-w1-max-size-corner', 1, 'ne'], ['51-w3-max-size-corner', 3, 'nw'], ['52-w3-max-size-corner-se', 3, 'se'], ['53-w2-max-size-corner', 2, 'se'],
    ['54-w2-max-size-corner-nw', 2, 'nw'], ['55-w4-max-size', 4, 'ne'], ['56-w5-max-size', 5, 'ne']]) {
    await p.evaluate(([n, at]) => { const { G } = HH, C = HH.CH[n]; HH.UI.closeModal && HH.UI.closeModal(); HH.startChapter(n, 'explore'); HH.setHoleD(C.sizes[C.N] * 1.45);
      G.x = at.includes('e') ? C.W : 0; G.y = at.includes('s') ? C.H : 0; G.cam.x = G.x; G.cam.y = G.y; }, [n, at]);
    await p.waitForTimeout(2200); await shot(p, file);
  }
  for (const [file, n, js] of [['57-w1-stairs-go-upstairs', 1, 'HH.setHoleD(.3); G.fl = 0; G.x = 2.8; G.y = 29.7'], ['58-w1-deck-stairs-go-downstairs', 1, 'HH.setHoleD(.4); G.fl = 1; G.x = 9.15; G.y = 16'],
    ['59-w1-cars-under-the-porch', 1, 'HH.setHoleD(1.2); G.fl = 0; G.x = 5; G.y = 18.5'], ['60-w3-yvr', 3, 'HH.setHoleD(120); [G.x, G.y] = G.C.P(-123.185, 49.1935)'],
    ['61-w3-science-world', 3, "HH.setHoleD(30); const o = G.auth.find(o => o.id === 'scienceworld'); G.x = o.x; G.y = o.y + 70"], ['62-w3-north-mountain-forest', 3, 'HH.setHoleD(250); [G.x, G.y] = G.C.P(-122.62, 49.6)'],
    ['64-w4-globe-at-the-north-pole', 4, 'HH.setHoleD(G.C.sizes[11]); [G.x, G.y] = G.C.P(-40, 89.4)'], ['65-w4-globe-at-the-south-pole', 4, 'HH.setHoleD(G.C.sizes[10]); [G.x, G.y] = G.C.P(60, -89.7)']]) {
    await p.evaluate(([n, js]) => { const { G } = HH; HH.UI.closeModal && HH.UI.closeModal(); HH.startChapter(n, 'explore'); new Function('G', js)(G); G.cam.x = G.x; G.cam.y = G.y; }, [n, js]);
    await p.waitForTimeout(2200); await shot(p, file);
  }
  await p.evaluate(() => { HH.UI.closeModal(); HH.UI.chapters('story'); }); await p.waitForTimeout(300); await shot(p, '63-play-together-picker');
  const ph = await page(844, 390); await shot(ph, '40-phone-main');
  await ph.evaluate(() => HH.startChapter(2)); await ph.waitForTimeout(1200); await shot(ph, '41-phone-game');
  console.log('screens done; console errors:', errs.length, errs.slice(0, 3)); await b.close();
  process.exit(errs.length ? 1 : 0);
})();
