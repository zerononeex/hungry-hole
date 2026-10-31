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

  await T('landmarks: the owner\'s whole roster is on the Globe (195 countries, 10-20 each, 2,358 places; every one a landmark model, a named area, or the hand-made landmark it already was), and no brand or theme-park name anywhere', new Function(`
    const C = HH.prep(HH.CH[4]), R = window.HH_LM2.lm, by = {}, placed = new Set(), bad = [];
    for (const r of R) (by[r[0]] = by[r[0]] || []).push(r[7]);
    for (const l of C.LMS) for (const s of (l.src || [])) placed.add(l.cc + '|' + s);
    for (const a of C.AREAS) placed.add(a.cc + '|' + a.src);
    const missing = R.filter(r => !placed.has(r[0] + '|' + r[7]) && !C.LMS.some(l => (l.src || []).includes(r[7]))).map(r => r[0] + ':' + r[7]);
    const sizes = Object.values(by).map(v => v.length), ccs = Object.keys(by);
    const noShape = [...new Set(C.LMS.filter(l => l.k && !HH.MODEL.get(C, l.k, 0)).map(l => l.k))];
    const ip = C.LMS.map(l => l.label).concat(C.AREAS.map(a => a.label)).filter(n => /disney|lego|universal studios|hobbiton|popeye|tivoli|ferrari|guinness|atlantis|james bond|haw par|jerudong/i.test(n));
    const sameAsAn = ccs.filter(c => !window.HH_AN.c[c]);
    return { ok: R.length === 2358 && ccs.length === 195 && Math.min(...sizes) >= 10 && Math.max(...sizes) <= 20 && !missing.length && !noShape.length && !ip.length && !sameAsAn.length,
      info: { places: R.length, countries: ccs.length, min: Math.min(...sizes), max: Math.max(...sizes), points: C.LMS.filter(l => /^lm2_/.test(l.id)).length, areas: C.AREAS.length, missing: missing.slice(0, 8), noShape, ip, sameAsAn } };`));

  await T('landmarks in the world: every built landmark stands inside its own country; every land area is centred inside its country (reefs, lakes and islands may sit in its sea)', new Function(STEP + `
    const { G, S } = HH; S.ch[4].u = 1; HH.startChapter(4, 'explore'); const C = G.C;
    const objs = [...G.agrid.values()].flat().filter(o => o.keep && (/^lm2_/.test(o.id) || (C.LMS.find(l => l.id === o.id) || {}).src));
    const out = objs.filter(o => !/^lm_(reef|island|ship|felucca|yacht|glacier)$/.test(o.mk || o.k || '') && !/reef|island|ship|felucca|yacht|glacier/.test(o.type || '') && !C.inCountry(o.cc, o.x, o.y)).map(o => o.cc + ':' + o.label);
    const WET = { reef: 1, water: 1, islands: 1, island: 1, falls: 1, beach: 1 };
    const aOut = C.AREAS.filter(a => !WET[a.type] && !C.inCountry(a.cc, a.x, a.y)).map(a => a.cc + ':' + a.label);
    HH.startChapter(1); step(1);
    return { ok: objs.length > 1300 && !out.length && !aOut.length, info: { built: objs.length, outside: out.slice(0, 10), nOut: out.length, areasOutside: aOut.slice(0, 10), nAOut: aOut.length } };`));

  await T('landmark spot-checks: Japan (Mount Fuji, Tokyo Tower, Tokyo Skytree), UK (Buckingham Palace, Tower Bridge), Canada (Stanley Park), Egypt (Pyramids of Giza), each at its real place', new Function(STEP + `
    const { G, S } = HH; S.ch[4].u = 1; HH.startChapter(4, 'explore'); const C = G.C;
    const objs = [...G.agrid.values()].flat().filter(o => o.keep);
    const find = (cc, n) => { const o = objs.find(o => o.cc === cc && (o.label === n || ((C.LMS.find(l => l.id === o.id) || {}).src || []).includes(n)));
      if (o) return { as: 'landmark', o, ll: C.ll(o.x, o.y) }; const a = C.AREAS.find(a => a.cc === cc && a.src === n); return a ? { as: 'area', o: a, ll: C.ll(a.x, a.y) } : null; };
    const want = [['JP', 'Mount Fuji', 138.73, 35.36], ['JP', 'Tokyo Tower', 139.745, 35.659], ['JP', 'Tokyo Skytree', 139.811, 35.71], ['GB', 'Buckingham Palace', -0.142, 51.501],
      ['GB', 'Tower Bridge', -0.075, 51.505], ['CA', 'Stanley Park (Vancouver)', -123.14, 49.30], ['EG', 'Pyramids of Giza', 31.134, 29.979]];
    const info = {}, bad = [];
    for (const [cc, n, lo, la] of want) { const f = find(cc, n); if (!f) { bad.push(n + ' missing'); continue; }
      const d = Math.hypot(f.ll[0] - lo, f.ll[1] - la); info[n] = f.as + ' ' + d.toFixed(3) + 'deg ' + (f.o.k || f.o.type || f.o.mk || '');
      if (d > .08 || !C.inCountry(cc, f.o.x, f.o.y)) bad.push(n + ' off by ' + d.toFixed(3)); }
    HH.startChapter(1); step(1);
    return { ok: !bad.length, info: { info, bad } };`));

  for (const [n, ok, info] of results) console.log((ok ? 'PASS ' : 'FAIL ') + n + '  ' + JSON.stringify(info));
  const pass = results.filter(r => r[1]).length; console.log(`${pass}/${results.length} passed; console errors: ${errs.length}`, errs.slice(0, 5));
  await b.close(); process.exit(pass === results.length && !errs.length ? 0 : 1);
})();
