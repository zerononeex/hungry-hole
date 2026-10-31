// Reachability suite (spec F20): flood-fill every chapter's map at MAX hole size using the game's own movement
// limits (border clamp, C.collide walls/doors/invisible borders) and require every playable spot to be reachable.
// Ch1 also gets the per-room growth-sufficiency check: if you slip under a door while tiny and then outgrow the
// 8 cm gap, the rooms you are now shut into must hold enough food to grow until a door fits.
// node tests/reachability.js [chapters]
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1180, height: 820 } });
  const errs = []; p.on('pageerror', e => errs.push('PAGEERR ' + e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await p.goto((process.env.HH_URL || 'http://localhost:8765/index.html')); await p.waitForTimeout(300);
  const chs = (process.argv[2] || '1,2,3,4,5,6,7').split(',').map(Number);
  let ok = true;
  for (const n of chs) {
    const r = await p.evaluate((n) => {
      const { G, S } = HH; S.ch[n].u = 1; HH.startChapter(n); G.mode = 'sim'; S.settings.sound = 0;
      const C = G.C, clamp = (v, a, b) => Math.max(a, Math.min(b, v));
      const setSize = (L, xp) => { G.lvl = L; G.xp = xp; };
      // one move with the engine's own limits (same order as update(): border clamp, then the chapter's collide)
      const move = (x0, y0, x1, y1) => {
        const D = HH.holeD(), r = D / 2, step = Math.max(Math.min(r, C.metric && C.rooms ? .3 : r) * .5, 1e-3);
        G.x = x0; G.y = y0; G.okX = x0; G.okY = y0; G.vx = G.vy = 0;
        const d = Math.hypot(x1 - x0, y1 - y0), k = Math.max(1, Math.ceil(d / step));
        for (let i = 1; i <= k; i++) {
          G.x += (x1 - x0) / k; G.y += (y1 - y0) / k;            // push the stick the same way every step
          if (!C.wrap) { G.x = clamp(G.x, r * 0.4, C.W - r * 0.4); G.y = clamp(G.y, r * 0.4, C.H - r * 0.4); }
          if (C.collide) C.collide(r * 0.45);
          G.vx = G.vy = 0;
        }
        return [G.x, G.y];                                      // where you actually end up (sliding along walls, like a player)
      };
      const flood = (cs, sx, sy, filter) => {
        const nx = Math.ceil(C.W / cs), ny = Math.ceil(C.H / cs), seen = new Uint8Array(nx * ny);
        const ci = Math.floor(sx / cs), cj = Math.floor(sy / cs), q = [[ci, cj, sx, sy]]; seen[ci + cj * nx] = 1; let cnt = 0;
        const pos = new Map(); pos.set(ci + cj * nx, [sx, sy]);
        while (q.length) {
          const [i, j, x, y] = q.pop(); cnt++;
          for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]]) {
            let a = i + di, b2 = j + dj;
            if (C.wrap) { a = (a + nx) % nx; b2 = (b2 + ny) % ny; } else if (a < 0 || b2 < 0 || a >= nx || b2 >= ny) continue;
            const tx = (a + .5) * cs, ty = (b2 + .5) * cs; if (filter && !filter(tx, ty)) continue;
            const fx = C.wrap && Math.abs(tx - x) > C.W / 2 ? tx - Math.sign(tx - x) * C.W : tx, fy = C.wrap && Math.abs(ty - y) > C.H / 2 ? ty - Math.sign(ty - y) * C.H : ty;
            let [ex, ey] = move(x, y, fx, fy);
            if (C.wrap) { ex = ((ex % C.W) + C.W) % C.W; ey = ((ey % C.H) + C.H) % C.H; }
            const ei = Math.floor(ex / cs), ej = Math.floor(ey / cs), eid = ei + ej * nx;
            if (ei < 0 || ej < 0 || ei >= nx || ej >= ny || seen[eid] || (filter && !filter(ex, ey))) continue;
            seen[eid] = 1; pos.set(eid, [ex, ey]); q.push([ei, ej, ex, ey]);
          }
        }
        return { seen, nx, ny, cnt, pos };
      };
      const out = { n, name: C.name, fails: [] };
      // 1) the whole map at max size
      setSize(C.N, HH.need(C.N));
      const Dmax = HH.holeD(), cs = C.rooms ? 0.5 : Math.max(Dmax * 0.6, Math.max(C.W, C.H) / 320);
      const F = flood(cs, C.start[0], C.start[1]);
      let playable = 0, reached = 0; const miss = [];
      // a spot counts as reached when the hole's body covers it from some reachable position
      const reachR = Math.min(Dmax / 2, C.rooms ? 0.36 : Dmax / 2) + cs * 0.75, pts = [...F.pos.values()];
      const hashC = new Map(), hk = (x, y) => Math.floor(x / reachR) + ',' + Math.floor(y / reachR);
      for (const q of pts) { const k = hk(q[0], q[1]); (hashC.get(k) || hashC.set(k, []).get(k)).push(q); }
      const covered = (x, y) => { const a = Math.floor(x / reachR), b3 = Math.floor(y / reachR); for (let u = -1; u <= 1; u++) for (let v = -1; v <= 1; v++) for (const q of hashC.get((a + u) + ',' + (b3 + v)) || []) if (Math.hypot(q[0] - x, q[1] - y) <= reachR) return true; return false; };
      for (let j = 0; j < F.ny; j++) for (let i = 0; i < F.nx; i++) {
        const x = (i + .5) * cs, y = (j + .5) * cs, z = C.zoneAt(x, y);
        if (!z || (C.Z[z] && C.Z[z].deco)) continue;
        if (C.rooms && !C.roomAt(x, y)) continue;                 // wall cells are not floor
        playable++; if (F.seen[i + j * F.nx] || covered(x, y)) reached++; else if (miss.length < 6) miss.push([Math.round(x), Math.round(y), z]);
      }
      out.max = { holeD: +Dmax.toFixed(3), cell: +cs.toFixed(2), playable, reached, pct: +(100 * reached / Math.max(1, playable)).toFixed(2), miss };
      if (reached / playable < 0.995) out.fails.push(`only ${out.max.pct}% of the map reachable at max size; e.g. ${JSON.stringify(miss)}`);
      if (C.rooms) for (const rm of C.rooms) {
        const i = Math.floor((rm[2] + rm[4]) / 2 / cs), j = Math.floor((rm[3] + rm[5]) / 2 / cs);
        if (!F.seen[i + j * F.nx]) out.fails.push('room unreachable at max size: ' + rm[1]);
      }
      // 2) Ch1 per-room growth sufficiency (doors shut once the hole outgrows the under-door gap)
      if (C.rooms) {
        const GAP = C.gap, doors = G.auth.filter(o => o.door);
        let L = 1; while (L < C.N && C.sizes[L + 1] <= GAP) L++;
        setSize(L, Math.ceil(HH.need(L) * 0.25)); while (HH.holeD() <= GAP && G.xp < HH.need(L)) G.xp++;
        const D0 = HH.holeD(), L0 = G.lvl, X0 = G.xp, cs2 = 0.25;
        // every bit of food in the house: authored + every procedural layer, deterministic per cell
        const food = G.auth.filter(o => !o.door && !o.deco && !o.exit);
        for (let t = 0; t < C.LC.length; t++) { if (!C.LC[t]) continue; const s = C.LC[t]; for (let cy = 0; cy * s < C.H; cy++) for (let cx = 0; cx * s < C.W; cx++) for (const o of HH.genCell(t, cx, cy)) if (!o.deco) food.push(o); }
        const done = new Set(), comps = [];
        for (const rm of C.rooms) {
          if (done.has(rm[0])) continue;
          const cx = (rm[2] + rm[4]) / 2, cy = (rm[3] + rm[5]) / 2;
          setSize(L0, X0);
          const Fc = flood(cs2, cx, cy, (x, y) => !!C.roomAt(x, y));
          const inside = new Set(); for (const r2 of C.rooms) { const i = Math.floor((r2[2] + r2[4]) / 2 / cs2), j = Math.floor((r2[3] + r2[5]) / 2 / cs2); if (Fc.seen[i + j * Fc.nx]) { inside.add(r2[0]); done.add(r2[0]); } }
          const inComp = o => { const i = Math.floor(o.x / cs2), j = Math.floor(o.y / cs2); return i >= 0 && j >= 0 && i < Fc.nx && j < Fc.ny && Fc.seen[i + j * Fc.nx]; };
          const exits = doors.filter(d => [[.6, 0], [-.6, 0], [0, .6], [0, -.6]].some(([a, b3]) => inComp({ x: d.x + a, y: d.y + b3 })));
          const need = exits.length ? Math.min(...exits.map(d => d.fw)) : 0;
          // eat everything that fits, grow, repeat (a generous player: same total food, best order)
          let lvl = L0, xp = X0; const eaten = new Set(); const hd = () => { setSize(lvl, xp); return HH.holeD(); };
          const items = food.filter(inComp);
          for (let guard = 0; guard < 400 && hd() < need && lvl < C.N; guard++) {
            const D = hd(); let gain = 0;
            for (const o of items) if (!eaten.has(o) && o.fw <= D) { eaten.add(o); gain += (o.coin ? o.t * 0.5 : o.t) * 1.8; }
            if (!gain) break;
            xp += gain; while (lvl < C.N && xp >= HH.need(lvl)) { xp -= HH.need(lvl); lvl++; }
          }
          const reachD = hd();
          comps.push({ rooms: [...inside].join('+'), food: items.length, exitDoor: +need.toFixed(2), grewTo: +reachD.toFixed(3), ok: reachD >= need || !exits.length });
          if (!(reachD >= need || !exits.length)) out.fails.push(`shut in ${[...inside].join('+')}: food grows the hole only to ${reachD.toFixed(2)} m, the door needs ${need.toFixed(2)} m`);
        }
        out.rooms = { startD: +D0.toFixed(3), comps };
      }
      return out;
    }, n);
    ok = ok && !r.fails.length;
    console.log(`CH${r.n} ${r.name}: max hole ${r.max.holeD} cell ${r.max.cell} reachable ${r.max.reached}/${r.max.playable} (${r.max.pct}%) ${r.fails.length ? 'FAIL\n   ' + r.fails.join('\n   ') : 'PASS'}`);
    if (r.rooms) { console.log(`  per-room growth from ${r.rooms.startD} m (just past the under-door gap):`); for (const c of r.rooms.comps) console.log(`    ${c.ok ? 'ok  ' : 'FAIL'} ${c.rooms}: ${c.food} things, grows to ${c.grewTo} m, door ${c.exitDoor} m`); }
  }
  console.log('errors:', JSON.stringify(errs.slice(0, 5))); await b.close();
  process.exit(ok && !errs.length ? 0 : 1);
})();
