// Balance bot: auto-plays each chapter from a fresh state, prints [minute, size, coins, checklist, board, points]
// and the sim-minute the CHECKLIST was finished, then the v3 pace-gate table. node tests/balance-bot.js 1,2,3 6
// auto-player: steers to nearest edible thing, reports progression per chapter
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1180, height: 820 } });
  const errs = []; p.on('pageerror', e => errs.push('PAGEERR ' + e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await p.goto((process.env.HH_URL || 'http://localhost:8765/index.html')); await p.waitForTimeout(300);
  const chs = (process.argv[2] || '1,2,3,4,5,6,7').split(',').map(Number), mins = +(process.argv[3] || 6), table = [];
  for (const n of chs) {
    const r = await p.evaluate(([n, mins, sb]) => {
      const { G, S } = HH; S.ch[n] = HH.normalize({}).ch[n]; S.ch[n].u = 1; HH.startChapter(n); G.mode = 'sim'; S.settings.sound = 0;
      const dt = 1 / 30, out = []; let eaten = 0, tgt = null, retarget = 0, doneAt = null;
      let seed = n * 7919 + 13 + sb * 104729;   // deterministic bot choices
      const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
      const marks = []; let lastCk = '';
      const ckDone = () => G.C.CK.every((q, j) => HH.qDone(q, G.st.check[j]));
      for (let s = 0; s < mins * 60 * 30; s++) {
        G.now += dt * 1000; G.t += dt;
        if (G.cine) { G.mode = 'play'; }
        HH.update(dt);
        if (G.cine) continue;
        const ckS = G.st.check.join('/'); if (ckS !== lastCk) { lastCk = ckS; marks.push((s / 1800).toFixed(2) + ':' + ckS); }
        if (doneAt === null && ckDone()) { doneAt = s / 1800; out.push(['checklist done', +doneAt.toFixed(2), G.lvl, G.st.check.join('/')]); break; }
        const D = HH.holeD(), sp = D * (G.C.spd || 4.32);
        if (s % 30 === 0) { const mv = Math.hypot(G.x - (G.px || 0), G.y - (G.py || 0)); G.px = G.x; G.py = G.y; if (mv < D * 0.3 && tgt) { tgt.skip = (tgt.skip || 0) + 1; tgt = null; G.wa = rnd() * 7; G.stuck = 45; } }
        if (G.stuck > 0) { G.stuck--; tgt = { x: G.x + Math.cos(G.wa) * D * 5, y: G.y + Math.sin(G.wa) * D * 5, dead: 0 }; }
        else if (!tgt || tgt.dead || --retarget < 0) {
          retarget = 30; let best = null, bd = 1e18;
          const Q = G.C.Q, av = G.st.act.filter(a => Q[a.i].k === 'a').map(a => Q[a.i].what);
          const want = G.st.act.map(a => { const q = Q[a.i]; return q.k === 'p' ? q.seq[a.p] : (q.k === 'c' || q.k === 'b') ? q.what : null; }).filter(Boolean)
            .concat(G.C.CK.map((q, j) => G.st.check[j] < (q.n || 1) && (q.k === 'c' || q.k === 'b') ? q.what : null).filter(Boolean));
          for (const o of G.vis) if (HH.canEat(o) && !(o.skip > 2) && !(o.T && o.T.tags && av.some(w => HH.matches(o, w)))) {
            let d = Math.hypot(o.x - G.x, o.y - G.y) / (o.t + 1);
            if (o.tile || o.helper || (o.T && o.T.tags && want.some(w => HH.matches(o, w)))) d /= 8;
            if (d < bd) { bd = d; best = o; } }
          if ((!best || !(best.tile || best.helper)) && (s / 600 | 0) % 2 === 0) { const ct = HH.compassTargets(); if (ct.length) { const c = ct[(s / 1800 | 0) % ct.length].o; best = { x: c.x, y: c.y, dead: 0, fake: 1 }; } }
          if (!best) { // wander
            G.wa = (G.wa || rnd() * 6) + (rnd() - .5) * .3;
            tgt = { x: G.x + Math.cos(G.wa) * D * 5, y: G.y + Math.sin(G.wa) * D * 5, dead: 0, fake: 1 }; retarget = 20;
          } else tgt = best;
        }
        const ddx = tgt.x - G.x, ddy = tgt.y - G.y, d = Math.hypot(ddx, ddy);
        if (d > 1) { const m = Math.min(d, sp * dt); G.x += ddx / d * m; G.y += ddy / d * m; }
        if (s % (30 * 60) === 0) out.push([Math.round(s / 1800), G.lvl, G.st.w, G.st.check.join('/'), G.st.board.filter(Boolean).length, G.st.pts]);
        if (G.mode !== 'sim' && G.mode !== 'play') break;
      }
      out.push(["end", G.lvl, G.st.w, G.st.check.join('/'), G.st.board.filter(Boolean).length, G.st.pts, G.mode]);
      out.push(['checklist ticks', marks.join(' ')]);
      return { out, doneAt, check: G.st.check.join('/') };
    }, [n, mins, +(process.env.BOT_SEED || 0)]).then(r => { table.push([n, r.doneAt, r.check]); return r.out; });
    console.log('CH' + n + ' [min,lvl,coins,check,board,pts]'); r.forEach(x => console.log('  ' + JSON.stringify(x)));
  }
  const GATE = { 5: 3.0, 6: 3.0 }; let ok = true;
  console.log('\nPACE GATE (bot checklist sim-minutes)');
  for (const [n, t, ck] of table) { const g = GATE[n] || 2.5, pass = t !== null && t <= g; ok = ok && pass;
    console.log(`  Ch${n}  ${t === null ? 'not done (' + ck + ')' : t.toFixed(2) + ' min'}  gate <= ${g.toFixed(1)}  ${pass ? 'PASS' : 'FAIL'}`); }
  console.log('errors:', JSON.stringify(errs.slice(0, 5))); await b.close();
  process.exit(ok && !errs.length ? 0 : 1);
})();
