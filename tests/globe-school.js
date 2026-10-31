// v5.2 Globe school: the owner's two datasets (animals Part 16, landmarks Part 17) are baked whole and behave.
// Serve the repo root (python3 -m http.server 8765) then: node tests/globe-school.js
const { chromium } = require('playwright');
const URL = process.env.HH_URL || 'http://localhost:8765/index.html';
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1180, height: 820 } });
  const errs = []; p.on('pageerror', e => errs.push('PAGEERR ' + e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await p.goto(URL); await p.waitForTimeout(300);
  const results = [];
  const T = async (name, fn) => { try { const r = await p.evaluate(fn); results.push([name, r.ok, r.info]); } catch (e) { results.push([name, false, e.message]); } };
  const STEP = `const step = n => { for (let i = 0; i < n; i++) { HH.G.now += 33; HH.G.t += 1 / 30; HH.update(1 / 30); } };`;

  await T('animals: 195 countries x 8 from the dataset, every species in a model family that exists, none unmapped', new Function(`
    const A = window.HH_AN, C = HH.prep(HH.CH[4]), ccs = Object.keys(A.c), bad = [], noModel = new Set(), notOnMap = [];
    for (const cc of ccs) { const L = A.c[cc].a; if (L.length !== 8) bad.push(cc + ':' + L.length); for (const a of L) { if (!a[1] || !a[0]) bad.push(cc + ':' + a[0]); if (!HH.MODEL.get(C, 'an_' + ((a[5] && a[5].m) || a[1]), 0)) noModel.add(a[1]); } if (!C.regionPos(cc)) notOnMap.push(cc); }
    return { ok: ccs.length === 195 && !bad.length && !noModel.size && !notOnMap.length, info: { countries: ccs.length, animals: ccs.reduce((s, c) => s + A.c[c].a.length, 0), families: A.fams.length, bad, noModel: [...noModel], notOnMap } };`));

  await T('animals spot-checks: Australia Red Kangaroo, China Giant Panda, Canada North American Beaver (flagship) with the Orca among its eight', new Function(`
    const c = window.HH_AN.c, f = cc => c[cc].a[0][0], has = (cc, n) => c[cc].a.some(a => a[0].startsWith(n));
    const fam = n => { for (const v of Object.values(c)) for (const a of v.a) if (a[0] === n) return a[1]; };
    const info = { AU: f('AU'), CN: f('CN'), CA: f('CA'), caOrca: has('CA', 'Orca'), kangaroo: fam('Red Kangaroo'), panda: fam('Giant Panda'), beaver: fam('North American Beaver'), orca: fam('Orca (Killer Whale)'), orcaHab: c.CA.a.find(a => a[0].startsWith('Orca'))[2] };
    return { ok: info.AU === 'Red Kangaroo' && info.CN === 'Giant Panda' && info.CA === 'North American Beaver' && info.caOrca && info.kangaroo === 'marsupial' && info.panda === 'panda' && info.beaver === 'rodent' && info.orca === 'whale' && info.orcaHab === 'sea', info };`));

  await T('animals in the world: Australia at a mid size has its own animals (all inside Australia, labelled, flagship the commonest); none at the giant tier; eaten ones go and are never saved', new Function(STEP + `
    const { G, S } = HH; S.ch[4].u = 1; HH.startChapter(4, 'explore'); const C = G.C, save0 = JSON.stringify(S.ch[4]);
    HH.setHoleD(C.sizes[5]); [G.x, G.y] = C.P(134, -25); G.cam.x = G.x; G.cam.y = G.y; G.cam.z = 0; step(80); HH.render();
    const an = G.extra.filter(o => o.an && !o.dead), allAU = an.every(o => o.cc === 'AU' && C.ccAt(o.x, o.y) === 'AU'), names = [...new Set(an.map(o => o.label))];
    const okNames = names.every(n => window.HH_AN.c.AU.a.some(a => a[0] === n)), flag = an.filter(o => o.label === 'Red Kangaroo').length, labels = (G.anLabels || []).length;
    // eat one: it falls, is removed, and nothing about it is written to the save
    const o = an.find(o => o.fw < HH.holeD() * .6); let gone = null;
    if (o) { G.x = o.x; G.y = o.y; G.vx = G.vy = 0; step(40); gone = !G.extra.includes(o); }
    const mid = an.length;
    HH.setHoleD(C.sizes[11]); G.cam.z = 0; step(40); const giant = G.extra.filter(o => o.an && !o.dead).length;
    HH.persist(); const saved = JSON.stringify(S.ch[4]).includes('Kangaroo') || localStorage.getItem('hungry-hole-data-v1').includes('Kangaroo');
    HH.startChapter(1); step(1);
    return { ok: mid >= 8 && allAU && okNames && flag >= 1 && labels > 0 && gone === true && giant === 0 && !saved, info: { mid, allAU, names, flagship: flag, labels, eatenGone: gone, giant, saved } };`));

  for (const [n, ok, info] of results) console.log((ok ? 'PASS ' : 'FAIL ') + n + '  ' + JSON.stringify(info));
  const pass = results.filter(r => r[1]).length; console.log(`${pass}/${results.length} passed; console errors: ${errs.length}`, errs.slice(0, 5));
  await b.close(); process.exit(pass === results.length && !errs.length ? 0 : 1);
})();
