// data tests: every chapter loads; pools are 40; every referenced type/tag/id exists and can spawn at a reachable tier
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1180, height: 820 } });
  const errs = []; p.on('pageerror', e => errs.push('PAGEERR ' + e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await p.goto((process.env.HH_URL || 'http://localhost:8765/index.html')); await p.waitForTimeout(300);
  const res = await p.evaluate(() => {
    const out = [];
    for (let n = 1; n <= 5; n++) {
      const fails = [], C = HH.prep(HH.CH[n]); HH.S.ch[n].u = 1; HH.startChapter(n);
      const G = HH.G, auth = G.auth.concat(G.movers);
      const zoneTypes = new Set(); for (const Z of Object.values(C.Z)) for (const L of Z.t) if (L) for (const [k] of (L.items || L)) zoneTypes.add(Array.isArray(k) ? k[0] : k);
      const spawnable = k => zoneTypes.has(k) || auth.some(o => o.k === k);
      const typesFor = w => Object.values(C.T).filter(T => T.k === w || T.tags.includes(w)).map(T => T.k);
      const count = w => { if (w === '*') return 1e9; const ts = typesFor(w).filter(k => k !== 'coin'); if (ts.some(k => zoneTypes.has(k))) return 1e9; return auth.filter(o => HH.matches(o, w)).length; };
      const reach = w => w === '*' || typesFor(w).some(k => C.T[k].t <= C.N) || auth.some(o => o.id === w && o.t <= C.N);
      const chk = (q, where) => {
        const tag = `${where} "${q.raw}"`;
        if ('cab'.includes(q.k)) {
          if (q.what !== '*' && !typesFor(q.what).length && !auth.some(o => o.id === q.what)) fails.push(tag + ' unknown type/tag');
          else if (!reach(q.what)) fails.push(tag + ' tier above max size');
          else if (q.k !== 'a' && count(q.what) < q.n) fails.push(tag + ` only ${count(q.what)} exist`);
          if (q.rg && !(C.regionPos && C.regionPos(q.rg))) fails.push(tag + ' unknown region');
        }
        if (q.k === 'p') for (const w of q.seq) if (!typesFor(w).some(spawnable)) fails.push(tag + ' pattern item cannot spawn: ' + w);
        if (q.k === 'l' && !Object.values(C.T).some(T => T.k !== 'coin' && T.n[0].toUpperCase() === q.letter && spawnable(T.k))) fails.push(tag + ' no spawnable thing starts with ' + q.letter);
        if (q.k === 'q' && q.ids) for (const id of q.items) if (!auth.some(o => o.id === id)) fails.push(tag + ' missing id ' + id);
        if (q.k === 'q' && !q.ids && q.items.length < 2) fails.push(tag + ' sequence too short');
        if (q.k === 'q' && q.zone && !(C.areas && C.areas[q.zone])) fails.push(tag + ' unknown zone area ' + q.zone);
        if (q.k === 'r' && q.n > C.N) fails.push(tag + ' size above max');
        if (q.k === 'k' && q.n > Object.keys(C.countries || {}).length) fails.push(tag + ' too many stamps');
        if (q.k === 'f' && !['add', 'sub', 'mul', 'big', 'miss', 'word'].includes(q.op)) fails.push(tag + ' unknown op');
        if (!q.txt || /undefined|NaN/.test(q.txt)) fails.push(tag + ' bad text: ' + q.txt);
      };
      if (C.Q.length !== 40) fails.push('pool size ' + C.Q.length);
      if (C.CK.length !== 3) fails.push('checklist size ' + C.CK.length);
      C.CK.forEach(q => chk(q, 'checklist')); C.Q.forEach(q => chk(q, 'quest'));
      for (const Z of Object.values(C.Z)) for (const L of Z.t) if (L) for (const it of (L.items || L)) { const k = Array.isArray(it) ? it[0] : it; if (!C.T[k]) fails.push('zone type missing ' + k); }
      for (const o of auth) if (!o.T) fails.push('authored object without type ' + o.k);
      // v4: real scale (Ch1-4 every type has metres), mode pools, Ch3 POIs + quiet labels
      if (C.metric) for (const k of Object.keys(C.T)) if (k !== 'coin' && !(C.T[k].m && C.T[k].m[0] > 0 && C.T[k].m[1] > 0)) fails.push('no real metres for ' + k);
      const maxD = C.sizes[C.N] * 1.45, eatMax = o => o.fw <= maxD;
      const spawnAny = k => zoneTypes.has(k) || Object.values(C.Z).some(Z => !Z.deco && !Z.wet);
      const specOk = (spec, where) => {
        const s = spec.split('|')[0];
        if (s[0] === '#') { const o = auth.find(o => o.id === s.slice(1)); if (!o) fails.push(where + ' missing id ' + s); else if (!eatMax(o) || o.deco) fails.push(where + ' ' + s + ' not eatable at max size'); }
        else if (!C.T[s]) fails.push(where + ' unknown type ' + s);
        else if (!spawnAny(s) || HH.mkObj(C, s, 0, 0).fw > maxD) fails.push(where + ' ' + s + ' cannot spawn/eat at max size');
      };
      if (!C.ispy || C.ispy.length !== 30 || new Set(C.ispy).size !== 30) fails.push('I Spy pool must be 30 distinct, is ' + (C.ispy || []).length);
      (C.ispy || []).forEach(s => specOk(s, 'ispy'));
      if (!(C.ispy || []).includes('hat')) fails.push('I Spy pool has no hat');
      if (!C.edu || C.edu.length < 4) fails.push('Educational needs >= 4 sets');
      for (const E of C.edu || []) for (const st of E.s) {
        const [k, a, b2] = st.split(':');
        if (k === 'm') { if (!['add', 'sub', 'mul'].includes(a)) fails.push('edu bad op ' + st); }
        else if (k === 'i') specOk(a.split('|')[0], 'edu ' + E.n);
        else if (k === 'c') { specOk(a, 'edu ' + E.n); if (!['yellow', 'red', 'blue', 'green', 'purple', 'orange', 'pink'].includes(b2)) fails.push('edu colour ' + st); }
        else if (k === 'f') a.split(',').forEach(w => specOk(w, 'edu ' + E.n));
        else fails.push('edu unknown step ' + st);
      }
      if (C.key === 'van') {
        const ids = ['scienceworld', 'aquarium', 'mermaid', 'steamclock', 'canadaplace', 'bcplace', 'ubc', 'sfu', 'nightmarket', 'ikea', 'grouse', 'cypress', 'peacearch', 'whiterock', 'whistler', 'yvr'];
        for (const id of ids) if (!auth.some(o => o.id === id)) fails.push('Ch3 POI missing: ' + id);
        const sch = auth.filter(o => o.k === 'school').length, hs = auth.filter(o => o.k === 'highschool').length, cc = auth.filter(o => o.k === 'commcentre').length, cas = auth.filter(o => o.k === 'casino').length;
        if (sch < 400 || hs < 80 || cc < 40 || cas < 5) fails.push(`Ch3 POI layer thin: schools ${sch} high ${hs} community ${cc} casinos ${cas}`);
        const q = auth.filter(o => o.quiet && o.label); if (q.length < 500) fails.push('Ch3 quiet POIs ' + q.length);
        if (q.some(o => HH.labelOn(o) && !o.tgt)) fails.push('a quiet Ch3 label shows before it is targeted');
        q[0].tgt = 1; if (!HH.labelOn(q[0])) fails.push('a targeted Ch3 POI shows no label'); q[0].tgt = 0;
        if (auth.some(o => /langley/i.test(o.label || '') || /langley/i.test(o.nm || ''))) fails.push('Langley is out of bounds but appears');
      }
      // v3: every type resolves to a 3D recipe with a footprint (w x d) and a real height
      let models = 0;
      for (const k of Object.keys(C.T)) {
        const m = HH.MODEL.spec(C, k);
        if (!m) { fails.push('no 3D model for type ' + k); continue; }
        if (!HH.MODEL.R[m.recipe]) fails.push('type ' + k + ' names a missing recipe ' + m.recipe);
        if (!(m.w > 0 && m.d > 0 && m.h > 0)) fails.push('type ' + k + ' has a bad footprint/height ' + JSON.stringify(m));
        else models++;
      }
      out.push({ n, name: C.name, models, quests: C.Q.length, edu: C.Q.filter(q => q.edu).length, authored: auth.length, types: Object.keys(C.T).length, fails });
    }
    return out;
  });
  for (const r of res) console.log(`CH${r.n} ${r.name}: quests=${r.quests} edu=${r.edu} authored=${r.authored} types=${r.types} models=${r.models} ${r.fails.length ? 'FAIL\n   ' + r.fails.join('\n   ') : 'PASS'}`);
  console.log('errors:', JSON.stringify(errs)); await b.close();
  process.exit(res.every(r => !r.fails.length) && !errs.length ? 0 : 1);
})();
