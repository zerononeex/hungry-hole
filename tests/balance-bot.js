// Balance bot (v5): auto-plays each world's STORY from a fresh save and reports the sim-minute each objective on the
// ladder is eaten and when the world completes (the last objective). Window 8-15 min per world (spec B7 / v5).
// The bot plays like a decent kid: while the current objective is too big it eats whatever it can reach (inside the
// current zone ring, on its own floor), preferring bigger things; as soon as the objective fits, it goes for it.
// In two-storey worlds it plans routes on a grid (doorways, stairs) instead of pushing into walls.
// node tests/balance-bot.js [worlds] [max sim-minutes]
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1180, height: 820 } });
  const errs = []; p.on('pageerror', e => errs.push('PAGEERR ' + e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await p.goto((process.env.HH_URL || 'http://localhost:8765/index.html')); await p.waitForTimeout(300);
  const chs = (process.argv[2] || '1,2,3,4,5').split(',').map(Number), mins = +(process.argv[3] || 25), table = [];
  for (const n of chs) {
    const r = await p.evaluate(([n, mins, sb, process_trace]) => {
      const { G, S } = HH; S.ch[n] = HH.normalize({}).ch[n]; S.ch[n].u = 1; HH.startChapter(n); G.mode = 'sim'; S.settings.sound = 0;
      const C = G.C, dt = 1 / 30, out = [], beats = [], steps = []; G.eats = 0; G.big = 0; G.b0 = 0; G.e0 = 0; G.lastL = 0; G.rc = 0; const bigs = []; let tgt = null, retarget = 0, doneAt = null, lastBeat = G.st.beat;
      let seed = n * 7919 + 13 + sb * 104729;
      const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
      const lv = [];
      // ---- grid route planner for two-storey worlds ----
      const cs = 0.2, NX = Math.ceil(C.W / cs), NY = Math.ceil(C.H / cs);
      const free = new Map();
      const passable = (i, j, f, cr) => { const k = (f * NY + j) * NX + i + ':' + cr; let v = free.get(k); if (v === undefined) { const x = (i + .5) * cs, y = (j + .5) * cs; const wk = (a, b2) => C.walkable(a, b2, f) || C.walkable(a, b2, 1 - f); v = C.walkable(x, y, f) && wk(x + cr, y) && wk(x - cr, y) && wk(x, y + cr) && wk(x, y - cr); free.set(k, v); } return v && (G.noSol || !solid(i, j, f, cr)); };
      // furniture the hole can't eat yet blocks like a wall: rasterise the engine's own solid boxes (refreshed now and then)
      let sol = null, solF = -1;
      const solid = (i, j, f, cr) => {
        if (!sol || solF !== f) {
          sol = new Uint8Array(NX * NY); solF = f; const fl0 = G.fl; G.fl = f;
          for (const [x, y, hw, hd, yaw, ofl] of HH.solidBoxes(cr / 0.45 * 0 + HH.holeD() / 2)) {
            const c = Math.cos(yaw), sn = Math.sin(yaw), R = Math.hypot(hw, hd) + cr;
            for (let jj = Math.max(0, Math.floor((y - R) / cs)); jj <= Math.min(NY - 1, Math.floor((y + R) / cs)); jj++) for (let ii = Math.max(0, Math.floor((x - R) / cs)); ii <= Math.min(NX - 1, Math.floor((x + R) / cs)); ii++) {
              const ox = (ii + .5) * cs - x, oy = (jj + .5) * cs - y, lx = ox * c - oy * sn, lz = ox * sn + oy * c;
              if (Math.abs(lx) < hw + cr * .5 && Math.abs(lz) < hd + cr * .5) sol[jj * NX + ii] = 1;
            }
          }
          G.fl = fl0;
        }
        return sol[j * NX + i] === 1;
      };
      function route(tx, ty, tf) {
        if (++G.rc % 15 === 0) sol = null;   // eaten furniture opens up: refresh the solids now and then
        const cr = Math.round(Math.min(HH.holeD() / 2 * 0.45, 0.32) * 20) / 20 + 0.02;
        const si = Math.floor(G.x / cs), sj = Math.floor(G.y / cs), ti = Math.floor(tx / cs), tj = Math.floor(ty / cs), f0 = G.fl || 0;
        const id = (i, j, f) => (f * NY + j) * NX + i, prev = new Int32Array(NX * NY * 2).fill(-1), q = [id(si, sj, f0)]; prev[q[0]] = q[0];
        let found = -1;
        for (let h = 0; h < q.length; h++) {
          const c = q[h], f = Math.floor(c / (NX * NY)), j = Math.floor((c % (NX * NY)) / NX), i = c % NX;
          if (f === tf && Math.abs(i - ti) <= 1 && Math.abs(j - tj) <= 1) { found = c; break; }
          const nb = [[1, 0, f], [-1, 0, f], [0, 1, f], [0, -1, f]];
          for (const s of C.stairs || []) { const [x0, y0, x1, y1] = s.r, x = (i + .5) * cs, y = (j + .5) * cs; if (x >= x0 && x <= x1 && y >= y0 && y <= y1) { const t = s.ax === 'x' ? (x - x0) / (x1 - x0) : (y - y0) / (y1 - y0); if (t > .44 && t < .56) nb.push([0, 0, 1 - f]); } }
          for (const [di, dj, nf] of nb) {
            const a = i + di, b2 = j + dj; if (a < 0 || b2 < 0 || a >= NX || b2 >= NY) continue;
            const k = id(a, b2, nf); if (prev[k] !== -1) continue;
            if (!passable(a, b2, nf, cr) && !(Math.abs(a - si) + Math.abs(b2 - sj) < 3) && !(nf === tf && Math.abs(a - ti) + Math.abs(b2 - tj) < 3 && C.walkable((a + .5) * cs, (b2 + .5) * cs, nf))) continue;
            prev[k] = c; q.push(k);
          }
        }
        if (found < 0) return null;
        const path = []; for (let c = found; c !== prev[c]; c = prev[c]) path.push(c); path.reverse();
        const w = path[Math.min(path.length - 1, 3)];
        if (w === undefined) return { x: tx, y: ty };
        const wf = Math.floor(w / (NX * NY)), wj = Math.floor((w % (NX * NY)) / NX), wi = w % NX;
        return { x: (wi + .5) * cs, y: (wj + .5) * cs, fl: wf };
      }
      for (let s = 0; s < mins * 60 * 30; s++) {
        G.now += dt * 1000; G.t += dt;
        if (G.cine) { G.mode = 'play'; }
        HH.update(dt);
        if (G.cine) continue;
        if (G.st.beat !== lastBeat) { lastBeat = G.st.beat; beats.push(+(s / 1800).toFixed(2)); }
        if (G.lvl !== G.lastL) { if (G.lastL) { steps.push(G.eats - (G.e0 || 0)); bigs.push(G.big - (G.b0 || 0)); } G.lastL = G.lvl; G.e0 = G.eats; G.b0 = G.big; }
        if (doneAt === null && G.st.c) { doneAt = s / 1800; out.push(['world complete', +doneAt.toFixed(2), G.lvl]); break; }
        const D = HH.holeD(), sp = D * (C.spd || 4.32) * (C.botSpd || 1), goal = HH.goals()[0], rg = HH.ringNow();
        const inRing = o => !rg || (o.x >= rg[0] && o.x <= rg[2] && o.y >= rg[1] && o.y <= rg[3]);
        if (s % 30 === 0) { const mv = Math.hypot(G.x - (G.px || 0), G.y - (G.py || 0)); G.px = G.x; G.py = G.y; if (mv < D * 0.2 && tgt) { tgt.skip = (tgt.skip || 0) + 1; tgt = null; G.wa = rnd() * 7; G.stuck = 30; G.wp = null; } }
        if (G.stuck > 0) { G.stuck--; tgt = { x: G.x + Math.cos(G.wa) * D * 5, y: G.y + Math.sin(G.wa) * D * 5, dead: 0 }; }
        else if (!tgt || tgt.dead || --retarget < 0) {
          retarget = 20; let best = null, bd = 1e18;
          if (goal && goal.fw <= D) best = goal;
          else for (const o of G.vis) {
            if (!HH.canEat(o) || o.skip > 2 || !inRing(o) || (C.layered && o.fl !== undefined && o.fl !== G.fl)) continue;
            const d = Math.hypot(o.x - G.x, o.y - G.y) / Math.pow(o.fw, 0.7);
            if (d < bd) { bd = d; best = o; }
          }
          if (!best && goal) best = goal;          // nothing in sight: head toward the objective (new ground)
          tgt = best || { x: G.x + Math.cos(rnd() * 7) * D * 5, y: G.y + Math.sin(rnd() * 7) * D * 5, dead: 0 };
        }
        let gx = tgt.x, gy = tgt.y;
        if (C.layered && !(G.stuck > 0)) { const tf = tgt.fl !== undefined ? tgt.fl : G.fl; if (tf !== G.fl || s % 6 === 0 || !G.wp) G.wp = route(gx, gy, tf) || ((G.noSol = 1) && (G.wp2 = route(gx, gy, tf), G.noSol = 0, G.wp2)) || { x: gx, y: gy }; gx = G.wp.x; gy = G.wp.y; }
        const ddx = gx - G.x, ddy = gy - G.y, d = Math.hypot(ddx, ddy);
        if (d > 1e-4) { const m = Math.min(d, sp * dt); G.x += ddx / d * m; G.y += ddy / d * m; }
        if (process_trace && s % 150 === 0 && s > 3600 && s < 5400) out.push(["t", +(s / 1800).toFixed(2), +G.x.toFixed(2), +G.y.toFixed(2), G.fl, G.wp && [+G.wp.x.toFixed(2), +G.wp.y.toFixed(2), G.wp.fl], tgt && tgt.id, G.stuck]);
        if (s % (30 * 60) === 0) { out.push([Math.round(s / 1800), G.lvl, +D.toFixed(3), G.st.beat, G.st.w, G.fl || 0, +G.x.toFixed(1), +G.y.toFixed(1)]); lv.push(G.lvl); }
        if (G.mode !== 'sim' && G.mode !== 'play') break;
      }
      out.push(['end', G.lvl, +HH.holeD().toFixed(3), 'beat ' + G.st.beat + '/' + (C.beats || []).length, G.st.w]);
      out.push(['objectives eaten at', beats.join(' ')]);
      out.push(['eats per size step', steps.join(' '), 'avg ' + (steps.reduce((a, b) => a + b, 0) / Math.max(1, steps.length)).toFixed(1)]);
      out.push(['size-worthy eats per step (things at most one size below you)', bigs.join(' '), 'avg ' + (bigs.reduce((a, b) => a + b, 0) / Math.max(1, bigs.length)).toFixed(1)]);
      return { out, doneAt, lvl: G.lvl, N: C.N, lv, beat: G.st.beat, nb: (C.beats || []).length };
    }, [n, mins, +(process.env.BOT_SEED || 0), !!process.env.BOT_TRACE]).then(r => { table.push([n, r.doneAt, r.lvl + '/' + r.N, r.lv, r.beat + '/' + r.nb]); return r.out; });
    console.log('W' + n + ' [min,lvl,holeD,beat,coins,floor,x,y]'); r.forEach(x => console.log('  ' + JSON.stringify(x)));
  }
  let ok = true;
  console.log('\nPACE REPORT (bot sim-minutes to finish the world\'s objective ladder; window 8-15 min)');
  for (const [n, t, lv, curve, bt] of table) {
    const tag = t === null ? 'NOT FINISHED in ' + mins + ' min (objective ' + bt + ')' : t < 8 ? 'UNDER window' : t <= 15 ? 'in window' : 'OVER window';
    if (t === null || t < 8 || t > 15) ok = false;
    console.log(`  W${n}  ${t === null ? '  —  ' : t.toFixed(1).padStart(5) + ' min'}  ${tag}   size by minute: ${curve.join(' ')}`);
  }
  console.log('errors:', JSON.stringify(errs.slice(0, 5))); await b.close();
  process.exit(ok && !errs.length ? 0 : 1);
})();
