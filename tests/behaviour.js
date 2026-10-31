// Scripted behaviour tests. Serve the repo root over http (python3 -m http.server 8765) then: node tests/behaviour.js
const { chromium } = require('playwright');
const URL = process.env.HH_URL || 'http://localhost:8765/index.html';
(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 1180, height: 820 } }); const p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push('PAGEERR ' + e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await p.goto(URL); await p.evaluate(() => localStorage.setItem('family-other-app', 'keep-me')); await p.reload(); await p.waitForTimeout(300);
  const results = [];
  const T = async (name, fn) => { try { const r = await p.evaluate(fn); results.push([name, r.ok, r.info]); } catch (e) { results.push([name, false, e.message]); } };
  const STEP = `const step = n => { for (let i = 0; i < n; i++) { HH.G.now += 33; HH.G.t += 1 / 30; HH.update(1 / 30); } };`;

  await T('fits: tips in, falls, then is eaten', new Function(STEP + `
    const { G } = HH; HH.startChapter(1); step(2);
    const o = G.vis.find(o => o.t === 1 && !o.coin && !o.tile && !o.helper && !o.au); const xp0 = G.xp, L1 = G.lvl;
    const fits = HH.fits(o, HH.holeD());
    G.x = o.x; G.y = o.y; G.vx = G.vy = 0; step(2);
    const falling = !!o.fall && !o.dead; step(20);
    const ate = !!o.dead, xpUp = G.lvl > L1 || G.xp > xp0;
    const L0 = G.lvl; HH.addXP(HH.need(G.lvl) + 1); const grew = G.lvl === L0 + 1;
    return { ok: fits && falling && ate && xpUp && grew, info: { fits, falling, ate, xpUp, grew, xp0, xp1: G.xp, lvlFrom: L0, lvlTo: G.lvl } };`));

  await T('too big: leans toward the hole, never eaten', new Function(STEP + `
    const { G } = HH; HH.restartRun(true); step(1);
    const D = HH.holeD(), bk = Object.keys(G.C.T).find(k => G.C.T[k].t === G.lvl + 2 && k !== 'coin' && !G.C.T[k].mv && !G.C.T[k].nosolid), bed = G.add(bk, G.x + 1.5, G.y);
    G.x = bed.x; G.y = bed.y; G.vx = G.vy = 0; step(1);
    const R = bed.md ? 0.5 * bed.fw * Math.sqrt(bed.md.w * bed.md.d) : bed.fw / 2;
    G.x = bed.x + R; G.vx = G.vy = 0; step(6); const lean = bed.lean || 0;
    for (let i = 0; i < 60; i++) { G.x = bed.x + R * (i % 2 ? 0.9 : 1.1); G.vx = (i % 2 ? -1 : 1) * 400; step(1); }
    return { ok: !HH.fits(bed, D) && !bed.dead && !bed.fall && lean > 0.01 && bed.wob > 0, info: { lvl: G.lvl, type: bed.k, tier: bed.t, ratio: +(D / bed.fw).toFixed(2), lean: +lean.toFixed(3), wobbled: bed.wob > 0 } };`));

  await T('wobble rule: >=85% bumps tip it in, <85% never', new Function(STEP + `
    const { G } = HH; HH.restartRun(true); step(1);
    let side = 1; const mk = () => G.add('rduck', G.x + 0.3 * (side = -side), G.y);   // a tier-above thing right beside the hole
    const a = mk(), D = HH.holeD();
    const run = (o, D) => { for (let i = 0; i < 12; i++) { G.now += 400; HH.bump(o, 0.5, D, D); } step(20); return !!o.dead; };
    const nearD = a.fw * 0.9, farD = a.fw * 0.8;
    const b2 = mk();
    const fell = run(a, nearD);
    const stood = !run(b2, farD);
    return { ok: fell && stood && !HH.fits(a, nearD), info: { type: a.k, fellAt90: fell, stoodAt80: stood } };`));

  await T('tiles are kind: inactive tiles never fall', new Function(STEP + `
    const { G } = HH; HH.startChapter(1); const st = G.st, C = G.C;
    const qi = C.Q.findIndex(q => q.raw === 'q:1-10'); st.act = []; st.board[qi] = 0; st.qi = qi; HH.rollQuests(true); step(1);
    const a = st.act.find(a => a.i === qi), wrong = G.tiles.filter(t => t.owner === a && !t.on)[0];
    const L0 = G.lvl; G.lvl = G.C.N; for (let i = 0; i < 12; i++) { G.now += 400; HH.bump(wrong, 0.3, 1e6, 1e6); }
    G.x = wrong.x; G.y = wrong.y; G.vx = G.vy = 0; step(10); const res = !wrong.dead && !wrong.fall && !HH.canEat(wrong);
    G.lvl = L0; return { ok: res, info: { txt: wrong.txt, dead: !!wrong.dead } };`));

  await T('checklist is a bonus only: ticks, pays, never completes the chapter', new Function(STEP + `
    const { G, S } = HH; HH.startChapter(1); G.lvl = 1; S.ch[2].u = 0; const st = G.st; st.c = 0; st.check = [0, 0, 0];
    const mk = (k, n) => Array.from({ length: n }, (_, i) => G.add(k, G.x + i * 0.01, G.y));
    const w0 = st.w; mk('lego', 12).forEach(HH.eat); mk('sock', 6).forEach(HH.eat); mk('rduck', 3).forEach(HH.eat);
    return { ok: st.check.join('/') === '6/5/3' && st.c === 0 && S.ch[2].u === 0 && st.w > w0, info: { check: st.check.join('/'), completed: st.c, unlocked2: S.ch[2].u, coins: st.w - w0 } };`));

  await T('objective ladder (v5 A1): the hole is capped at the next objective; eating the last one completes the world, unlocks the next, MAIN MENU returns', new Function(STEP + `
    const { G, S } = HH; S.ch[2].u = 0; S.ch[1].c = 0; S.ch[1].beat = 0; HH.startChapter(1); step(2);
    const g0 = G.goal, D0 = HH.holeD(); HH.addXP(HH.need(G.lvl) * 40); step(5);
    const capped = !!g0 && HH.holeD() <= g0.fw * 1.04 + 1e-9 && HH.capD() <= g0.fw * 1.04 + 1e-9;
    S.ch[1].beat = G.C.beats.length - 1; HH.startChapter(1); step(2); const last = G.goal;
    HH.setHoleD(last.fw * 1.03); HH.eat(last);
    const done = S.ch[1].c === 1 && S.ch[2].u === 1;
    return new Promise(res => setTimeout(() => {
      const btn = document.getElementById('c-menu'), shown = !!btn; if (btn) btn.click();
      res({ ok: capped && done && shown && G.mode === 'menu', info: { first: g0 && g0.id, D0: +D0.toFixed(3), capAt: g0 && +(g0.fw * 1.04).toFixed(3), D: +HH.holeD().toFixed(3), capped, last: last && last.id, completed: S.ch[1].c, unlocked2: S.ch[2].u, modal: shown, mode: G.mode } });
    }, 1200));`));

  await T('tiny quest completes, new one rolls in', new Function(STEP + `
    const { G } = HH; HH.startChapter(1); G.lvl = 1; const st = G.st; st.board = st.board.map(() => 0); st.act = []; st.qi = 0; HH.rollQuests(true);
    const a = st.act.find(a => G.C.Q[a.i].raw === 'c:lego:4'); const before = st.act.map(a => a.i).join(',');
    Array.from({ length: 4 }, (_, i) => G.add('lego', G.x + i * 0.01, G.y)).forEach(HH.eat);
    const boardTicked = st.board[a.i] === 1, dropped = st.act.length === 2;
    step(30); const after = st.act.map(a => a.i).join(',');
    return { ok: !!a && boardTicked && dropped && st.act.length === 3 && !st.act.some(x => x.i === a.i), info: { before, after, board: st.board.filter(Boolean).length } };`));

  await T('avoid quest resets, never fails', new Function(STEP + `
    const { G } = HH; HH.startChapter(1); G.lvl = 1; const st = G.st, C = G.C;
    const qi = C.Q.findIndex(q => q.raw === 'a:lego:10'); st.act = []; st.board[qi] = 0; st.qi = qi; HH.rollQuests(true);
    const a = st.act.find(a => a.i === qi), mk = (k, n) => Array.from({ length: n }, (_, i) => G.add(k, G.x + i * 0.01, G.y));
    mk('soldier', 4).forEach(HH.eat); const p1 = a.p;
    HH.eat(mk('lego', 1)[0]); const p2 = a.p, still = st.act.includes(a);
    mk('soldier', 10).forEach(HH.eat); const done = st.board[qi] === 1;
    return { ok: p1 === 4 && p2 === 0 && still && done, info: { p1, p2, stillActive: still, doneAfter10: done } };`));

  await T('floating joystick: only the drag vector counts, release stops', new Function(STEP + `
    const { G } = HH; HH.startChapter(1); G.paused = false; const cv = document.getElementById('cv'), r = cv.getBoundingClientRect(), sc = r.width / 1280;
    const ev = (t, x, y) => cv.dispatchEvent(new PointerEvent(t, { pointerId: 7, clientX: r.left + x * sc, clientY: r.top + y * sc, bubbles: true }));
    const drive = (x0, y0) => { G.x = G.C.start[0]; G.y = G.C.start[1]; G.vx = G.vy = 0; const s0 = [G.x, G.y]; ev('pointerdown', x0, y0); ev('pointermove', x0 + 90, y0); step(20); const d = [G.x - s0[0], G.y - s0[1]]; ev('pointerup', x0 + 90, y0); step(40); return [d, Math.hypot(G.vx, G.vy), G.joy]; };
    const [a, va, ja] = drive(300, 500), [b2, vb] = drive(900, 200);
    const same = Math.hypot(a[0] - b2[0], a[1] - b2[1]) < 0.05 * Math.hypot(a[0], a[1]);   // same push, anywhere on screen
    return { ok: a[0] > 0 && Math.abs(a[1]) < a[0] * 0.05 && same && va < 0.01 && vb < 0.01 && ja === null, info: { moved: a.map(v => +v.toFixed(3)), sameFromAnotherSpot: same, speedAfterRelease: +va.toFixed(4) } };`));

  await T('walls are absolute (v5 A7): even the biggest hole never crosses a wall; doorways stay open', new Function(STEP + `
    const { G, S } = HH; HH.startChapter(1, 'explore'); const C = G.C; G.fl = 0; HH.setHoleD(C.sizes[C.N]); step(1);
    const long = C.walls[0].filter(w => Math.max(w[2], w[3]) > 1.6).slice(0, 8), res = [];
    for (const w of long) {
      const hz = w[2] > w[3], cx = w[0] + w[2] / 2, cy = w[1] + w[3] / 2;
      for (const sd of [-1, 1]) {
        G.fl = 0; G.x = hz ? cx : cx + sd * 0.6; G.y = hz ? cy + sd * 0.6 : cy; G.vx = G.vy = 0; step(1);
        const s0 = hz ? Math.sign(G.y - cy) : Math.sign(G.x - cx);
        for (let i = 0; i < 150; i++) { if (hz) G.y -= sd * 0.01; else G.x -= sd * 0.01; step(1); }
        res.push(G.fl !== 0 || (hz ? Math.sign(G.y - cy) : Math.sign(G.x - cx)) === s0);
      }
    }
    return { ok: long.length >= 6 && res.every(Boolean), info: { walls: long.length, held: res.filter(Boolean).length + '/' + res.length, D: +HH.holeD().toFixed(2) } };`));

  await T('HUD UPGRADES button (orange, labelled): pauses the run, BACK resumes it', new Function(STEP + `
    const { G, S } = HH; HH.startChapter(1); G.paused = false; S.ch[1].w = 500; const bt = document.getElementById('b-up-hud'), cs = getComputedStyle(bt);
    const looks = bt.textContent.trim() === 'UPGRADES' && cs.backgroundColor === 'rgb(255, 140, 26)' && cs.display !== 'none'; const x0 = G.x, y0 = G.y, l0 = G.lvl; bt.click();
    const paused = G.paused, onUp = document.getElementById('s-upgrades').classList.contains('on') || getComputedStyle(document.getElementById('s-upgrades')).display !== 'none';
    document.querySelector('#s-upgrades [data-back]').click();
    return new Promise(res => setTimeout(() => res({ ok: looks && paused && onUp && !G.paused && G.mode === 'play' && G.x === x0 && G.y === y0 && G.lvl === l0, info: { looks, paused, onUp, resumed: !G.paused, mode: G.mode, sameRun: G.x === x0 && G.lvl === l0 } }), 300));`));

  await T('I Spy: five placed targets, win pays the wallet, replay re-rolls new ones, story untouched', new Function(STEP + `
    const { G, S } = HH; S.ch[2].u = 1; HH.startChapter(2); const sx = S.ch[2].x, sl = S.ch[2].lvl; delete S.ispy[2];
    HH.startChapter(2, 'ispy'); const R = G.run, h1 = R.hand.slice(), placed = R.tg.every(t => t.o && t.o.tgt === 1);
    const w0 = S.ch[2].w; R.tg.forEach(t => HH.eat(t.o)); const allDone = R.tg.every(t => t.done);
    return new Promise(res => setTimeout(() => {
      const paid = S.ch[2].w > w0, again = document.getElementById('i-again'); if (again) again.click();
      const h2 = G.run.hand.slice(), fresh = h2.every(i => !h1.includes(i)) && G.run.tg.length === 5;
      res({ ok: h1.length === 5 && placed && allDone && paid && !!again && fresh && S.ch[2].x === sx && S.ch[2].lvl === sl, info: { hand1: h1, hand2: h2, placed, paid: S.ch[2].w - w0, storyKept: S.ch[2].x === sx } });
    }, 1300));`));

  await T('Educational: help arrow stays until eaten; sums spawn only in your own area', new Function(STEP + `
    const { G, S } = HH; S.edu[1] = { set: 0, done: 0 }; HH.startChapter(1, 'edu'); step(2);
    const R = G.run; G.helpOn = HH.MODES.edu.target(); const tgt = G.helpOn;
    for (let i = 0; i < 900; i++) { G.now += 33; G.t += 1 / 30; HH.update(1 / 30); }        // 30 s later the arrow is still there
    const stays = G.compass.length === 1 && G.compass[0].o === tgt; HH.eat(tgt); step(15); const gone = !G.compass.some(c => c.o === tgt);
    const mi = G.C.edu.findIndex(E => E.s.some(x => x[0] === 'm')); S.edu[1] = { set: mi, done: 0 }; HH.startChapter(1, 'edu'); G.x = 22; G.y = 14; step(100);
    const C = G.C, ak = (x, y) => C.areaKey ? C.areaKey(x, y) : C.regionAt ? C.regionAt(x, y) : C.zoneAt(x, y);
    const here = ak(G.x, G.y), tiles = G.tiles.filter(t => !t.dead), local = tiles.every(t => ak(t.x, t.y) === here);
    const right = tiles.find(t => t.ok), lookSame = tiles.every(t => !t.look);
    return { ok: stays && gone && tiles.length >= 2 && local && !!right && lookSame, info: { target: tgt && tgt.k, stays, gone, here, tiles: tiles.length, local, noGlowOnAnswer: lookSame } };`));

  await T('sequence: wrong tiles inactive, right tile advances', new Function(STEP + `
    const { G } = HH; HH.startChapter(1); const st = G.st, C = G.C;
    const qi = C.Q.findIndex(q => q.raw === 'q:1-10'); st.act = []; st.board[qi] = 0; st.qi = qi; HH.rollQuests(true); step(1);
    const a = st.act.find(a => a.i === qi), mine = G.tiles.filter(t => t.owner === a);
    const right = mine.find(t => t.on), wrong = mine.filter(t => !t.on);
    const wrongBlocked = wrong.every(t => !HH.canEat(t)); HH.eat(right); step(1);
    return { ok: mine.length >= 2 && wrongBlocked && a.p === 1 && right.txt === '1', info: { tiles: mine.length, first: right && right.txt, wrongBlocked, p: a.p } };`));

  await T('banker: exactly 60% arrives', new Function(`
    const { S } = HH; S.ch[2].u = 1; S.ch[1].w = 1000; S.ch[2].w = 50;
    const ok1 = HH.bankerTransfer(1, 2, 100); const a = [S.ch[1].w, S.ch[2].w];
    const ok2 = HH.bankerTransfer(1, 2, 333); const b2 = [S.ch[1].w, S.ch[2].w];
    const no = HH.bankerTransfer(1, 2, 99999);
    return { ok: ok1 && a[0] === 900 && a[1] === 110 && ok2 && b2[0] === 567 && b2[1] === 309 && !no && HH.bankerArrive(100) === 60, info: { after100: a, after333: b2, overdraftRefused: !no } };`));

  await T('upgrade buy spends the chapter wallet only', new Function(`
    const { S } = HH; S.ch[1].w = 100; S.ch[2].w = 77; S.ch[1].up[0] = 0;
    const c = HH.upCost(1, 1), ok = HH.buyUpgrade(1, 0);
    return { ok: ok && S.ch[1].w === 100 - c && S.ch[1].up[0] === 1 && S.ch[2].w === 77, info: { cost: c, wallet: S.ch[1].w, lvl: S.ch[1].up[0] } };`));

  await T('per-chapter resume', new Function(STEP + `
    const { G, S } = HH; S.ch[2].u = 1; HH.startChapter(1); G.x = 1500; G.y = 1000; G.lvl = 4; G.xp = 12;
    HH.startChapter(2); const x2 = G.x; G.x += 500; G.lvl = 3;
    HH.startChapter(1); const r1 = [Math.round(G.x), Math.round(G.y), G.lvl, G.xp];
    HH.startChapter(2); const r2 = [Math.round(G.x), G.lvl];
    return { ok: r1.join() === '1500,1000,4,12' && r2[0] === Math.round(x2 + 500) && r2[1] === 3, info: { ch1: r1, ch2: r2 } };`));

  await T('export -> import is byte-equal', new Function(`
    const { S } = HH; HH.persist(); const before = JSON.stringify(S); const code = HH.exportCode();
    const back = HH.parseImport(code), fromJson = HH.parseImport(before);
    const bad = [HH.parseImport('nonsense'), HH.parseImport('{"v":1}'), HH.parseImport('')];
    return { ok: JSON.stringify(back) === before && JSON.stringify(fromJson) === before && bad.every(x => x === null), info: { bytes: before.length, rejectsJunk: bad.every(x => x === null) } };`));

  // save survives reload, other keys untouched
  const before = await p.evaluate(() => { HH.G.mode = 'menu'; HH.persist(); return localStorage.getItem('hungry-hole-data-v1'); });
  await p.reload(); await p.waitForTimeout(400);
  const after = await p.evaluate(() => { HH.persist(); return [localStorage.getItem('hungry-hole-data-v1'), localStorage.getItem('family-other-app'), JSON.stringify(HH.S).length]; });
  results.push(['save survives reload', after[0] === before, { bytes: before.length }]);
  results.push(['other localStorage keys untouched', after[1] === 'keep-me', { otherKey: after[1] }]);

  // a hand-written v2-shaped save (seven chapters, no v3 fields, old checklist counts, a position on the old bigger map) loads and plays.
  // v5 moves old Vancouver (ch3) to World 2 and keeps retired chapters verbatim in S.retired.
  await p.goto(URL.replace(/index\.html.*$/, 'README.md'));   // same origin, but without the game's save-on-unload
  await p.evaluate(() => {
    const ch = {}; for (let n = 1; n <= 7; n++) ch[n] = { u: n <= 4 ? 1 : 0, c: n === 1 ? 1 : 0, x: null, y: null, lvl: 1, xp: 0, pts: 0, pc: 0, w: 0, cf: 0, check: [0, 0, 0], board: Array(40).fill(0), act: [], qi: 0, up: Array(10).fill(0), eaten: {}, bm: 0, exitOk: 0 };
    ch[1] = Object.assign(ch[1], { x: 900, y: 700, lvl: 3, xp: 5, pts: 1234, w: 321, check: [25, 10, 1] });
    ch[3] = Object.assign(ch[3], { x: 9000, y: 6000, lvl: 4, xp: 2, w: 50, check: [3, 0, 0], board: Array(40).fill(0).map((_, i) => i < 5 ? 1 : 0) });
    ch[4] = Object.assign(ch[4], { x: 2000, y: 2000, lvl: 2, check: [40, 3, 0] });
    const save = { v: 1, settings: { sound: 0, voice: 1, learn: 'full', grade: 3 }, last: 3, journey: 0, ch, passport: {}, learn: {} };
    localStorage.setItem('hungry-hole-data-v1', JSON.stringify(save)); return true; });
  await p.goto(URL); await p.waitForTimeout(400);
  const v2r = await p.evaluate(() => { const { G, S } = HH; const out = { w1: S.ch[1].w, pts1: S.ch[1].pts, sound: S.settings.sound, w2: S.ch[2].w, board2: S.ch[2].board.filter(Boolean).length };
    HH.startChapter(2); for (let i = 0; i < 30; i++) { G.now += 33; G.t += 1 / 30; HH.update(1 / 30); }
    out.ch2 = [Math.round(G.x), Math.round(G.y), G.lvl]; out.inMap = G.x >= 0 && G.x <= G.C.W && G.y >= 0 && G.y <= G.C.H; out.vis = G.vis.length;
    out.retired4 = S.retired[4] && S.retired[4].check.join('/'); HH.startChapter(1); out.ch1done = S.ch[1].c; out.worlds = Object.keys(S.ch).join(','); return out; });
  results.push(['v2 save loads and plays (old Vancouver is World 2, retired chapter kept aside)', v2r.w1 === 321 && v2r.pts1 === 1234 && v2r.sound === 0 && v2r.w2 === 50 && v2r.board2 === 5 && v2r.inMap && v2r.vis > 20 && v2r.retired4 === '40/3/0' && v2r.ch1done === 1 && v2r.worlds === '1,2,3,4,5', v2r]);

  // a v3-shaped save: wallets, upgrades, boards, eaten landmarks and completed chapters survive
  await p.goto(URL.replace(/index\.html.*$/, 'README.md'));
  await p.evaluate(() => {
    const ch = {}; for (let n = 1; n <= 7; n++) ch[n] = { u: n <= 3 ? 1 : 0, c: n <= 3 ? 1 : 0, x: 400, y: 300, lvl: 5, xp: 3, pts: 999, pc: 2, w: 700 + n, cf: 0, check: [1, 1, 0], board: Array(40).fill(0).map((_, i) => i % 3 ? 0 : 1), act: [], qi: 4, up: [3, 2, 1, 0, 0, 0, 0, 0, 0, 1], eaten: {}, bm: 0, exitOk: 0, mv: 3, seen: '' };
    ch[3].eaten = { scienceworld: 1 };
    localStorage.setItem('hungry-hole-data-v1', JSON.stringify({ v: 1, settings: { sound: 1, voice: 1, learn: 'full', grade: 2 }, last: 3, journey: 0, ch, passport: { FR: 1 }, learn: { math: 4 } })); });
  await p.goto(URL); await p.waitForTimeout(400);
  const v3r = await p.evaluate(() => { const { G, S } = HH; HH.startChapter(2); const st = S.ch[2];
    return { w: [S.ch[1].w, S.ch[2].w], up: S.ch[1].up.join(''), board: S.ch[2].board.filter(Boolean).length, done: [S.ch[1].c, S.ch[2].c], unlocked3: S.ch[3].u, passport: S.passport.FR, math: S.learn.math,
      sciEatenStays: !G.auth.some(o => o.id === 'scienceworld'), atStart: Math.round(G.x) === Math.round(G.C.start[0]), mv: st.mv, voiceDropped: !('voice' in S.settings) }; });
  results.push(['v3 save migrates (wallets, upgrades, boards, eaten landmarks, completed chapters kept)', v3r.w[0] === 701 && v3r.w[1] === 703 && v3r.up === '3210000001' && v3r.board === 14 && v3r.done.join() === '1,1' && v3r.unlocked3 === 1 && v3r.passport === 1 && v3r.math === 4 && v3r.sciEatenStays && v3r.atStart && v3r.mv === 5 && v3r.voiceDropped, v3r]);

  // v5 ground rule: a v4 save that carries progress in the RETIRED worlds (4 Wilderness, 7 Chaos, plus old 2) loads; the
  // retired data is set aside untouched and ignored, and every wallet, upgrade, quest board, eaten landmark and completion
  // of the kept worlds survives, through a reload too. Other apps' keys on the shared origin are never touched.
  await p.goto(URL.replace(/index\.html.*$/, 'README.md'));
  const v4save = await p.evaluate(() => {
    const ch = {}; for (let n = 1; n <= 7; n++) ch[n] = { u: 1, c: n === 7 ? 0 : 1, x: 100 * n, y: 50 * n, lvl: 2 + n, xp: n, pts: 1000 * n, pc: n, w: 111 * n, cf: n, check: [n, 1, 0],
      board: Array(40).fill(0).map((_, i) => (i + n) % 4 ? 0 : 1), act: [{ i: 3, p: 1 }], qi: n, up: [n, 1, 0, 0, 0, 0, 0, 0, 0, n % 3], eaten: { ['lm' + n]: 1 }, bm: 0, exitOk: 1, beat: 0, mv: 4, seen: 'xyz' + n };
    ch[3].eaten = { scienceworld: 1, canadaplace: 1 }; ch[4].wild = { bears: 9 }; ch[7].chaos = [1, 2, 3];
    const save = { v: 1, settings: { sound: 1, music: 0, learn: 'sometimes', grade: 3 }, last: 7, journey: 1, ch, passport: { FR: 1, JP: 1 }, learn: { math: 7, spelling: 2, science: 1, geography: 5 },
      ispy: { 3: { deck: [4, 1, 0, 2], pos: 2, wins: 6 }, 4: { deck: [9, 9], pos: 1, wins: 2 }, 7: { deck: [1], pos: 0, wins: 4 } }, edu: { 3: { set: 2, done: 3 }, 4: { set: 1, done: 1 }, 7: { set: 5, done: 9 } } };
    localStorage.setItem('hungry-hole-data-v1', JSON.stringify(save)); return save; });
  await p.goto(URL); await p.waitForTimeout(400);
  const chk = () => p.evaluate(() => { const { S } = HH, c = S.ch;
    return { worlds: Object.keys(c).join(','), w: [1, 2, 3, 4, 5].map(n => c[n].w), up: [1, 2, 4, 5].map(n => c[n].up.join('')), board: [1, 2, 4, 5].map(n => c[n].board.filter(Boolean).length),
      done: [1, 2, 4, 5].map(n => c[n].c), u3: c[3].u, eaten2: Object.keys(c[2].eaten).sort().join(','), ispy2: S.ispy[2], edu2: S.edu[2], wins4: S.ispy[4] && S.ispy[4].wins,
      retired: Object.keys(S.retired).sort().join(','), r4: JSON.stringify(S.retired[4]), r7: JSON.stringify(S.retired[7]), passport: Object.keys(S.passport).sort().join(','), learn: S.learn, music: S.settings.music, last: S.last,
      other: localStorage.getItem('family-other-app') }; });
  const m1 = await chk();
  const play = await p.evaluate(() => { const { G, S } = HH, out = {}; for (const n of [1, 2, 3, 4, 5]) { S.ch[n].u = 1; HH.startChapter(n); for (let i = 0; i < 10; i++) { G.now += 33; G.t += 1 / 30; HH.update(1 / 30); } out[n] = G.C.n === n && G.vis.length > 0; } HH.G.mode = 'menu'; HH.persist(); return out; });
  await p.reload(); await p.waitForTimeout(400);
  const m2 = await chk();
  const keep = m1.worlds === '1,2,3,4,5' && m1.w.join() === '111,333,0,666,555' && m1.up.join() === '1100000001,3100000000,6100000000,5100000002' && m1.board.join() === [1, 3, 6, 5].map(n => Array(40).fill(0).filter((_, i) => !((i + n) % 4)).length).join()
    && m1.done.join() === '1,1,1,1' && m1.u3 === 1 && m1.eaten2 === 'canadaplace,scienceworld' && m1.ispy2 && m1.ispy2.wins === 6 && m1.ispy2.pos === 2 && m1.edu2 && m1.edu2.set === 2 && !m1.wins4
    && m1.retired === '2,4,7' && m1.r4 === JSON.stringify(v4save.ch[4]) && m1.r7 === JSON.stringify(v4save.ch[7]) && m1.passport === 'FR,JP' && m1.learn.math === 7 && m1.music === 0 && m1.last === 1 && m1.other === 'keep-me';
  const stable = JSON.stringify(Object.assign({}, m1, { u3: 0, last: 0 })) === JSON.stringify(Object.assign({}, m2, { u3: 0, last: 0 }))   // (playing moved 'last world played');
  results.push(['v4 save with RETIRED-world data (Wilderness, Chaos) migrates: retired data set aside verbatim, kept worlds intact, survives reload', keep && stable && Object.values(play).every(Boolean), { m1: keep ? 'ok' : m1, play, stableAfterReload: stable, changed: Object.keys(m1).filter(k => JSON.stringify(m1[k]) !== JSON.stringify(m2[k])).map(k => [k, m1[k], m2[k]]) }]);

  // Reset Everything (two-tap) keeps other keys
  await p.evaluate(() => HH.UI.settings('main')); await p.waitForTimeout(200);
  const resetBtn = await p.$('#b-rall'); let resetOk = 'no button';
  if (resetBtn) { await resetBtn.click(); await resetBtn.click(); await p.waitForTimeout(200);
    resetOk = await p.evaluate(() => [HH.S.ch[2].u, HH.S.ch[1].w, localStorage.getItem('family-other-app')]); }
  results.push(['reset everything (two taps) keeps other keys', Array.isArray(resetOk) && resetOk[0] === 0 && resetOk[1] === 0 && resetOk[2] === 'keep-me', resetOk]);

  let pass = 0; for (const [n, ok, info] of results) { if (ok) pass++; console.log((ok ? 'PASS ' : 'FAIL ') + n + '  ' + JSON.stringify(info)); }
  console.log(`${pass}/${results.length} passed; console errors: ${errs.length}`, errs.slice(0, 5));
  await b.close(); process.exit(pass === results.length && !errs.length ? 0 : 1);
})();
