// Reachability suite (spec F20, v5): flood-fill every world's map at MAX hole size using the game's own movement
// limits (border clamp, C.collide walls / stairs / invisible borders) and require every playable spot to be reached.
// Two-storey worlds (C.layered) flood both floors: a stair run carries the hole from one floor to the other, exactly
// as in play (the floor flips as the hole passes the middle of the run). The objective ladder's zone rings are a
// story pacing device and are not applied here (Exploration and Educational roam the whole map).
// node tests/reachability.js [worlds]
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1180, height: 820 } });
  const errs = []; p.on('pageerror', e => errs.push('PAGEERR ' + e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await p.goto((process.env.HH_URL || 'http://localhost:8765/index.html')); await p.waitForTimeout(300);
  const chs = (process.argv[2] || '1,2,3,4,5').split(',').map(Number);
  let ok = true;
  for (const n of chs) {
    const r = await p.evaluate((n) => {
      const { G, S } = HH; S.ch[n].u = 1; HH.startChapter(n, 'explore'); G.mode = 'sim'; S.settings.sound = 0;
      const C = G.C, clamp = (v, a, b) => Math.max(a, Math.min(b, v)), FL = C.layered ? [0, 1] : [0];
      const ringOff = HH.ringOff; HH.setRingOff && HH.setRingOff(1);
      // one move with the engine's own limits (same order as update(): border clamp, then the world's collide)
      const move = (x0, y0, fl, x1, y1) => {
        const D = HH.holeD(), r = D / 2, step = Math.max(Math.min(r, C.layered ? .12 : r) * .5, 1e-3);
        G.x = x0; G.y = y0; G.fl = fl; G.okX = x0; G.okY = y0; G.vx = G.vy = 0;
        const d = Math.hypot(x1 - x0, y1 - y0), k = Math.max(1, Math.ceil(d / step));
        for (let i = 1; i <= k; i++) {
          G.x += (x1 - x0) / k; G.y += (y1 - y0) / k;
          if (!C.wrap) { const em = C.edge != null ? Math.min(r * 0.4, C.edge) : r * 0.4; G.x = clamp(G.x, em, C.W - em); G.y = clamp(G.y, em, C.H - em); }
          if (C.collide) C.collide(r * 0.45);
          G.vx = G.vy = 0;
        }
        return [G.x, G.y, G.fl || 0];
      };
      const flood = (cs, sx, sy, sfl) => {
        const nx = Math.ceil(C.W / cs), ny = Math.ceil(C.H / cs), seen = new Uint8Array(nx * ny * FL.length);
        const id = (i, j, f) => i + j * nx + f * nx * ny;
        const ci = Math.floor(sx / cs), cj = Math.floor(sy / cs), q = [[ci, cj, sx, sy, sfl]]; seen[id(ci, cj, sfl)] = 1;
        const pos = [];
        while (q.length) {
          const [i, j, x, y, f] = q.pop(); pos.push([x, y, f]);
          for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]]) {
            let a = i + di, b2 = j + dj;
            if (C.wrap) { a = (a + nx) % nx; b2 = (b2 + ny) % ny; } else if (a < 0 || b2 < 0 || a >= nx || b2 >= ny) continue;
            const tx = (a + .5) * cs, ty = (b2 + .5) * cs;
            const fx = C.wrap && Math.abs(tx - x) > C.W / 2 ? tx - Math.sign(tx - x) * C.W : tx, fy = C.wrap && Math.abs(ty - y) > C.H / 2 ? ty - Math.sign(ty - y) * C.H : ty;
            let [ex, ey, ef] = move(x, y, f, fx, fy);
            if (C.wrap) { ex = ((ex % C.W) + C.W) % C.W; ey = ((ey % C.H) + C.H) % C.H; }
            const ei = Math.floor(ex / cs), ej = Math.floor(ey / cs);
            if (ei < 0 || ej < 0 || ei >= nx || ej >= ny || seen[id(ei, ej, ef)]) continue;
            seen[id(ei, ej, ef)] = 1; q.push([ei, ej, ex, ey, ef]);
          }
        }
        return { seen, nx, ny, pos, id };
      };
      const out = { n, name: C.name, fails: [] };
      HH.setHoleD(C.sizes[C.N] * 1.45);
      const Dmax = HH.holeD(), cs = C.layered ? 0.2 : C.reachCell || Math.max(Dmax * 0.6, Math.max(C.W, C.H) / 320);
      const F = flood(cs, C.start[0], C.start[1], C.layered ? C.startFl || 0 : 0);
      let playable = 0, reached = 0; const miss = [];
      // a spot counts as reached when the hole's body covers it from some reachable position on that floor
      const reachR = (C.layered ? 0.32 : Dmax / 2) + cs * 0.75;
      const hashC = new Map(), hk = (x, y, f) => Math.floor(x / reachR) + ',' + Math.floor(y / reachR) + ',' + f;
      for (const q of F.pos) { const k = hk(q[0], q[1], q[2]); (hashC.get(k) || hashC.set(k, []).get(k)).push(q); }
      const covered = (x, y, f) => { const a = Math.floor(x / reachR), b3 = Math.floor(y / reachR); for (let u = -1; u <= 1; u++) for (let v = -1; v <= 1; v++) for (const q of hashC.get((a + u) + ',' + (b3 + v) + ',' + f) || []) if (Math.hypot(q[0] - x, q[1] - y) <= reachR) return true; return false; };
      for (const f of FL) {
        G.fl = f;
        for (let j = 0; j < F.ny; j++) for (let i = 0; i < F.nx; i++) {
          const x = (i + .5) * cs, y = (j + .5) * cs;
          if (C.walkable) { if (!C.walkable(x, y, f)) continue; }
          else { const z = C.zoneAt(x, y); if (!z || (C.Z[z] && C.Z[z].deco)) continue; if (C.blocked && C.blocked(x, y)) continue; }
          playable++; if (F.seen[F.id(i, j, f)] || covered(x, y, f)) reached++; else if (miss.length < 6) miss.push([+x.toFixed(1), +y.toFixed(1), f, C.zoneAt(x, y)]);
        }
      }
      out.max = { holeD: +Dmax.toFixed(3), cell: +cs.toFixed(2), playable, reached, pct: +(100 * reached / Math.max(1, playable)).toFixed(2), miss };
      if (reached < playable) out.fails.push(`only ${out.max.pct}% of the map reachable at max size; e.g. ${JSON.stringify(miss)}`);
      if (C.rooms) for (const rm of C.rooms) {           // every named room / yard, on its own floor
        const fl = rm[2] === -1 ? 0 : rm[2], b4 = rm[3], i = Math.floor((b4[0] + b4[2]) / 2 / cs), j = Math.floor((b4[1] + b4[3]) / 2 / cs);
        let hit = false; for (let u = -2; u <= 2 && !hit; u++) for (let v = -2; v <= 2 && !hit; v++) if (F.seen[F.id(i + u, j + v, fl)]) hit = true;
        if (!hit) out.fails.push('room unreachable at max size: ' + rm[1] + ' (floor ' + fl + ')');
      }
      HH.setRingOff && HH.setRingOff(0);
      return out;
    }, n);
    ok = ok && !r.fails.length;
    console.log(`W${r.n} ${r.name}: max hole ${r.max.holeD} cell ${r.max.cell} reachable ${r.max.reached}/${r.max.playable} (${r.max.pct}%) ${r.fails.length ? 'FAIL\n   ' + r.fails.join('\n   ') : 'PASS'}`);
  }
  console.log('errors:', JSON.stringify(errs.slice(0, 5))); await b.close();
  process.exit(ok && !errs.length ? 0 : 1);
})();
