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
      let solidOn = false;                               // furniture too big to eat blocks like a wall (used by the smallest-size check)
      const move = (x0, y0, fl, x1, y1) => {
        const D = HH.holeD(), r = D / 2, step = Math.max(Math.min(r, C.layered ? .12 : r) * .5, 1e-3);
        G.x = x0; G.y = y0; G.fl = fl; G.okX = x0; G.okY = y0; G.vx = G.vy = 0;
        const d = Math.hypot(x1 - x0, y1 - y0), k = Math.max(1, Math.ceil(d / step));
        for (let i = 1; i <= k; i++) {
          G.x += (x1 - x0) / k; G.y += (y1 - y0) / k;
          if (!C.wrap) { const em = C.edge != null ? Math.min(r * 0.4, C.edge) : r * 0.4; G.x = clamp(G.x, em, C.W - em); G.y = clamp(G.y, em, C.H - em); }
          if (C.collide) C.collide(r * 0.45);
          if (solidOn) HH.solidPush(r);
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
      // v5.1 Part 6: a flat world whose boundary is its map rectangle has no dead ground inside it: every cell is a zone
      if (C.rectPlay) { let dead = 0; const ex = []; for (let j = 0; j < F.ny; j++) for (let i = 0; i < F.nx; i++) { const x = Math.min((i + .5) * cs, C.W), y = Math.min((j + .5) * cs, C.H); if (!C.zoneAt(x, y)) { dead++; if (ex.length < 4) ex.push([Math.round(x), Math.round(y)]); } }
        out.rect = { cells: F.nx * F.ny, dead }; if (dead) out.fails.push(`${dead} cells inside the map rectangle are not playable, e.g. ${JSON.stringify(ex)}`); }
      out.max = { holeD: +Dmax.toFixed(3), cell: +cs.toFixed(2), playable, reached, pct: +(100 * reached / Math.max(1, playable)).toFixed(2), miss };
      if (reached < playable) out.fails.push(`only ${out.max.pct}% of the map reachable at max size; e.g. ${JSON.stringify(miss)}`);
      if (C.rooms) for (const rm of C.rooms) {           // every named room / yard, on its own floor
        const fl = rm[2] === -1 ? 0 : rm[2], b4 = rm[3], i = Math.floor((b4[0] + b4[2]) / 2 / cs), j = Math.floor((b4[1] + b4[3]) / 2 / cs);
        let hit = false; for (let u = -2; u <= 2 && !hit; u++) for (let v = -2; v <= 2 && !hit; v++) if (F.seen[F.id(i + u, j + v, fl)]) hit = true;
        if (!hit) out.fails.push('room unreachable at max size: ' + rm[1] + ' (floor ' + fl + ')');
      }
      // v5.1 Part 9: at the SMALLEST size the hole gets from the deck down the deck stairs into the backyard (the garden beds
      // moved north, clear of the stairs' foot), and every corner of the backyard is reachable from the deck
      if (C.key === 'home' && C.rooms) {
        HH.setHoleD(C.sizes[1]); const vis0 = G.vis; G.vis = G.auth.filter(o => !o.dead && !o.path); solidOn = true;
        const rm = id => C.rooms.find(r => r[0] === id)[3], dk = rm('deck'), bk = rm('back');
        const S = flood(0.2, (dk[0] + dk[2]) / 2, (dk[1] + dk[3]) / 2, 1);
        let tot = 0, hit = 0; const miss2 = [];
        G.fl = 0; const bxs = HH.solidBoxes(HH.holeD() / 2).filter(b => (b[5] || 0) === 0), rr = HH.holeD() / 2 + .2;   // spots under furniture are not ground
        const under = (x, y) => bxs.some(([bx, by, hw, hd, yaw]) => { const c = Math.cos(yaw), sn = Math.sin(yaw), ox = x - bx, oy = y - by, lx = ox * c - oy * sn, lz = ox * sn + oy * c; return Math.abs(lx) < hw + rr && Math.abs(lz) < hd + rr; });
        for (let y = bk[1] + .3; y < bk[3] - .3; y += .4) for (let x = bk[0] + .3; x < bk[2] - .3; x += .4) {
          if (!C.walkable(x, y, 0) || under(x, y)) continue; tot++;
          const i = Math.floor(x / .2), j = Math.floor(y / .2); let ok = false; for (let u = -1; u <= 1 && !ok; u++) for (let v = -1; v <= 1 && !ok; v++) if (S.seen[S.id(i + u, j + v, 0)]) ok = true;
          if (ok) hit++; else if (miss2.length < 5) miss2.push([+x.toFixed(1), +y.toFixed(1)]);
        }
        // v5.2 Part 10: the front path: from the sidewalk through the open gate to the front door at the smallest size, with
        // nothing standing on the path (the fence, bushes, flowers and trampoline all keep off it)
        const fr = rm('front'), wk = rm('walk'), F2 = flood(0.2, 3, (wk[1] + wk[3]) / 2, 0);
        let door = false; for (let u = -1; u <= 1; u++) for (let v = 0; v <= 2; v++) if (F2.seen[F2.id(Math.floor(3 / .2) + u, Math.floor((fr[1] + .1) / .2) + v, 0)]) door = true;
        const onPath = bxs.filter(([bx, by, hw, hd, yaw]) => { const ex = Math.abs(hw * Math.cos(yaw)) + Math.abs(hd * Math.sin(yaw)); return bx + ex > 2.6 && bx - ex < 3.4 && by > fr[1] && by < fr[3]; })
          .map(b => (G.auth.find(o => o.x === b[0] && o.y === b[1]) || { k: '?' }).k);
        if (!door) out.fails.push('front path: the sidewalk does not reach the front door through the gate at the smallest size');
        if (onPath.length) out.fails.push('front path blocked by: ' + onPath.join(','));
        out.front = door && !onPath.length ? 'sidewalk -> gate -> front door clear' : 'BLOCKED';
        solidOn = false; G.vis = vis0;
        // and the foot of the deck stairs is clear: no furniture on the run or within 1 m of its bottom end
        const ds = rm('dstair'), foot = [ds[0] - .3, ds[1] - 1, ds[2] + .3, ds[3]];
        const blockers = bxs.filter(([bx, by, hw, hd, yaw]) => { const ex = Math.abs(hw * Math.cos(yaw)) + Math.abs(hd * Math.sin(yaw)), ey = Math.abs(hw * Math.sin(yaw)) + Math.abs(hd * Math.cos(yaw));
          return bx + ex > foot[0] && bx - ex < foot[2] && by + ey > foot[1] && by - ey < foot[3]; }).map(b => (G.auth.find(o => o.x === b[0] && o.y === b[1]) || { k: '?' }).k);
        if (blockers.length) out.fails.push('deck stairs foot blocked by: ' + blockers.join(','));
        out.front = out.front; out.deck = { holeD: +HH.holeD().toFixed(3), backyard: hit + '/' + tot + (blockers.length ? '' : ', stair foot clear') };
        if (!tot || hit < tot) out.fails.push(`deck -> backyard at the smallest size: ${hit}/${tot} backyard spots reached, e.g. ${JSON.stringify(miss2)}`);
      }
      HH.setRingOff && HH.setRingOff(0);
      return out;
    }, n);
    ok = ok && !r.fails.length;
    console.log(`W${r.n} ${r.name}: max hole ${r.max.holeD} cell ${r.max.cell} reachable ${r.max.reached}/${r.max.playable} (${r.max.pct}%)${r.rect ? ` rectangle ${r.rect.cells - r.rect.dead}/${r.rect.cells} playable` : ''}${r.deck ? ` deck->backyard at ${r.deck.holeD} m: ${r.deck.backyard}` : ''}${r.front ? `; front path: ${r.front}` : ''} ${r.fails.length ? 'FAIL\n   ' + r.fails.join('\n   ') : 'PASS'}`);
  }
  console.log('errors:', JSON.stringify(errs.slice(0, 5))); await b.close();
  process.exit(ok && !errs.length ? 0 : 1);
})();
