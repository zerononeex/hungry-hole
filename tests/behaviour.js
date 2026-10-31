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
    const bed = G.vis.find(o => !o.dead && !o.coin && !o.tile && !o.helper && !o.au && o.t === G.lvl + 2), D = HH.holeD();
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
    const w0 = st.w; mk('lego', 12).forEach(HH.eat); mk('soldier', 6).forEach(HH.eat); HH.eat(mk('bed', 1)[0]);
    return { ok: st.check.join('/') === '12/6/1' && st.c === 0 && S.ch[2].u === 0 && st.w > w0, info: { check: st.check.join('/'), completed: st.c, unlocked2: S.ch[2].u, coins: st.w - w0 } };`));

  await T('size gate: target size completes the chapter, unlocks the next, MAIN MENU returns', new Function(STEP + `
    const { G, S } = HH; HH.startChapter(1); S.ch[2].u = 0; G.st.c = 0; G.lvl = G.C.N - 1; G.xp = 0;
    HH.addXP(HH.need(G.lvl) + 1);
    const done = G.st.c === 1 && S.ch[2].u === 1 && G.lvl === G.C.N;
    return new Promise(res => setTimeout(() => {
      const btn = document.getElementById('c-menu'), shown = !!btn; if (btn) btn.click();
      res({ ok: done && shown && G.mode === 'menu', info: { completed: G.st.c, unlocked2: S.ch[2].u, lvl: G.lvl, N: G.C.N, modal: shown, mode: G.mode } });
    }, 1200));`));

  await T('tiny quest completes, new one rolls in', new Function(STEP + `
    const { G } = HH; HH.startChapter(1); G.lvl = 1; const st = G.st; st.board = st.board.map(() => 0); st.act = []; st.qi = 0; HH.rollQuests(true);
    const a = st.act.find(a => G.C.Q[a.i].raw === 'c:lego:5'); const before = st.act.map(a => a.i).join(',');
    Array.from({ length: 5 }, (_, i) => G.add('lego', G.x + i * 0.01, G.y)).forEach(HH.eat);
    const boardTicked = st.board[a.i] === 1, dropped = st.act.length === 2;
    step(30); const after = st.act.map(a => a.i).join(',');
    return { ok: !!a && boardTicked && dropped && st.act.length === 3 && !st.act.some(x => x.i === a.i), info: { before, after, board: st.board.filter(Boolean).length } };`));

  await T('avoid quest resets, never fails', new Function(STEP + `
    const { G } = HH; HH.startChapter(1); G.lvl = 1; const st = G.st, C = G.C;
    const qi = C.Q.findIndex(q => q.raw === 'a:soldier:10'); st.act = []; st.board[qi] = 0; st.qi = qi; HH.rollQuests(true);
    const a = st.act.find(a => a.i === qi), mk = (k, n) => Array.from({ length: n }, (_, i) => G.add(k, G.x + i * 0.01, G.y));
    mk('lego', 4).forEach(HH.eat); const p1 = a.p;
    HH.eat(mk('soldier', 1)[0]); const p2 = a.p, still = st.act.includes(a);
    mk('lego', 10).forEach(HH.eat); const done = st.board[qi] === 1;
    return { ok: p1 === 4 && p2 === 0 && still && done, info: { p1, p2, stillActive: still, doneAfter10: done } };`));

  await T('floating joystick: only the drag vector counts, release stops', new Function(STEP + `
    const { G } = HH; HH.startChapter(1); G.paused = false; const cv = document.getElementById('cv'), r = cv.getBoundingClientRect(), sc = r.width / 1280;
    const ev = (t, x, y) => cv.dispatchEvent(new PointerEvent(t, { pointerId: 7, clientX: r.left + x * sc, clientY: r.top + y * sc, bubbles: true }));
    const drive = (x0, y0) => { G.x = 14.25; G.y = 3.6; G.vx = G.vy = 0; const s0 = [G.x, G.y]; ev('pointerdown', x0, y0); ev('pointermove', x0 + 90, y0); step(20); const d = [G.x - s0[0], G.y - s0[1]]; ev('pointerup', x0 + 90, y0); step(40); return [d, Math.hypot(G.vx, G.vy), G.joy]; };
    const [a, va, ja] = drive(300, 500), [b2, vb] = drive(900, 200);
    const same = Math.hypot(a[0] - b2[0], a[1] - b2[1]) < 0.05 * Math.hypot(a[0], a[1]);   // same push, anywhere on screen
    return { ok: a[0] > 0 && Math.abs(a[1]) < a[0] * 0.05 && same && va < 0.01 && vb < 0.01 && ja === null, info: { moved: a.map(v => +v.toFixed(3)), sameFromAnotherSpot: same, speedAfterRelease: +va.toFixed(4) } };`));

  await T('doors: tiny slides under, mid-size is stopped kindly, big enough eats the door', new Function(STEP + `
    const { G } = HH; HH.startChapter(1); const C = G.C;
    const d = G.auth.find(o => o.door && !o.dead), hz = d.rect[2] > d.rect[3];
    const cross = (L, xp) => { G.lvl = L; G.xp = xp; const D = HH.holeD(); G.x = hz ? d.x : d.x - 0.6; G.y = hz ? d.y - 0.6 : d.y; G.vx = G.vy = 0;
      for (let i = 0; i < 120; i++) { if (hz) G.y += 0.01; else G.x += 0.01; step(1); }
      return [+D.toFixed(3), hz ? G.y > d.y + 0.2 : G.x > d.x + 0.2, !!(d.dead || d.fall)]; };
    const tiny = cross(1, 0), mid = cross(4, 0);
    G.lvl = 6; G.xp = 0; const big = cross(6, HH.need(6) * 0.9);
    return { ok: tiny[0] <= C.gap && tiny[1] && !tiny[2] && mid[0] > C.gap && !mid[1] && !mid[2] && big[0] >= d.fw && big[2], info: { door: d.fw, gap: C.gap, tiny, mid, big } };`));

  await T('HUD UPGRADES button (orange, labelled): pauses the run, BACK resumes it', new Function(STEP + `
    const { G, S } = HH; HH.startChapter(1); G.paused = false; S.ch[1].w = 500; const bt = document.getElementById('b-up-hud'), cs = getComputedStyle(bt);
    const looks = bt.textContent.trim() === 'UPGRADES' && cs.backgroundColor === 'rgb(255, 140, 26)' && cs.display !== 'none'; const x0 = G.x, y0 = G.y, l0 = G.lvl; bt.click();
    const paused = G.paused, onUp = document.getElementById('s-upgrades').classList.contains('on') || getComputedStyle(document.getElementById('s-upgrades')).display !== 'none';
    document.querySelector('#s-upgrades [data-back]').click();
    return new Promise(res => setTimeout(() => res({ ok: looks && paused && onUp && !G.paused && G.mode === 'play' && G.x === x0 && G.y === y0 && G.lvl === l0, info: { looks, paused, onUp, resumed: !G.paused, mode: G.mode, sameRun: G.x === x0 && G.lvl === l0 } }), 300));`));

  await T('I Spy: five placed targets, win pays the wallet, replay re-rolls new ones, story untouched', new Function(STEP + `
    const { G, S } = HH; HH.startChapter(2); const sx = S.ch[2].x, sl = S.ch[2].lvl; delete S.ispy[2];
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

  // a hand-written v2-shaped save (no v3 fields, old checklist counts, a position on the old bigger map) loads and plays
  await p.goto(URL.replace(/index\.html.*$/, 'README.md'));   // same origin, but without the game's save-on-unload
  const v2 = await p.evaluate(() => {
    const ch = {}; for (let n = 1; n <= 7; n++) ch[n] = { u: n <= 4 ? 1 : 0, c: n === 1 ? 1 : 0, x: null, y: null, lvl: 1, xp: 0, pts: 0, pc: 0, w: 0, cf: 0, check: [0, 0, 0], board: Array(40).fill(0), act: [], qi: 0, up: Array(10).fill(0), eaten: {}, bm: 0, exitOk: 0 };
    ch[1] = Object.assign(ch[1], { x: 900, y: 700, lvl: 3, xp: 5, pts: 1234, w: 321, check: [25, 10, 1] });
    ch[3] = Object.assign(ch[3], { x: 9000, y: 6000, lvl: 4, xp: 2, w: 50, check: [3, 0, 0], board: Array(40).fill(0).map((_, i) => i < 5 ? 1 : 0) });
    ch[4] = Object.assign(ch[4], { x: 2000, y: 2000, lvl: 2, check: [40, 3, 0] });
    const save = { v: 1, settings: { sound: 0, voice: 1, learn: 'full', grade: 3 }, last: 3, journey: 0, ch, passport: {}, learn: {} };
    localStorage.setItem('hungry-hole-data-v1', JSON.stringify(save)); return true; });
  await p.goto(URL); await p.waitForTimeout(400);
  const v2r = await p.evaluate(() => { const { G, S } = HH; const out = { w1: S.ch[1].w, pts1: S.ch[1].pts, sound: S.settings.sound };
    HH.startChapter(3); for (let i = 0; i < 30; i++) { G.now += 33; G.t += 1 / 30; HH.update(1 / 30); }
    out.ch3 = [Math.round(G.x), Math.round(G.y), G.lvl, G.C.W, G.C.H]; out.inMap = G.x >= 0 && G.x <= G.C.W && G.y >= 0 && G.y <= G.C.H; out.vis = G.vis.length;
    HH.startChapter(4); out.ch4check = G.st.check.join('/'); HH.startChapter(1); out.ch1check = G.st.check.join('/'); out.ch1done = S.ch[1].c; return out; });
  results.push(['v2 save loads and plays', v2r.w1 === 321 && v2r.pts1 === 1234 && v2r.sound === 0 && v2r.inMap && v2r.vis > 20 && v2r.ch4check === '15/3/0' && v2r.ch1check === '12/6/1' && v2r.ch1done === 1, v2r]);

  // a v3-shaped save: wallets, upgrades, boards, eaten landmarks and completed chapters survive; positions restart on the v4 maps
  await p.goto(URL.replace(/index\.html.*$/, 'README.md'));
  await p.evaluate(() => {
    const ch = {}; for (let n = 1; n <= 7; n++) ch[n] = { u: n <= 3 ? 1 : 0, c: n <= 2 ? 1 : 0, x: 400, y: 300, lvl: 5, xp: 3, pts: 999, pc: 2, w: 700 + n, cf: 0, check: [1, 1, 0], board: Array(40).fill(0).map((_, i) => i % 3 ? 0 : 1), act: [], qi: 4, up: [3, 2, 1, 0, 0, 0, 0, 0, 0, 1], eaten: {}, bm: 0, exitOk: 0, mv: 3, seen: '' };
    ch[3].eaten = { scienceworld: 1 };
    localStorage.setItem('hungry-hole-data-v1', JSON.stringify({ v: 1, settings: { sound: 1, voice: 1, learn: 'full', grade: 2 }, last: 3, journey: 0, ch, passport: { FR: 1 }, learn: { math: 4 } })); });
  await p.goto(URL); await p.waitForTimeout(400);
  const v3r = await p.evaluate(() => { const { G, S } = HH; HH.startChapter(3); const st = S.ch[3];
    return { w: [S.ch[1].w, S.ch[3].w], up: S.ch[1].up.join(''), board: S.ch[2].board.filter(Boolean).length, done: [S.ch[1].c, S.ch[2].c], unlocked3: S.ch[3].u, passport: S.passport.FR,
      sciEatenStays: !G.auth.some(o => o.id === 'scienceworld'), atStart: Math.round(G.x) === Math.round(G.C.start[0]), mv: st.mv, voiceDropped: !('voice' in S.settings) }; });
  results.push(['v3 save migrates (wallets, upgrades, boards, eaten landmarks, completed chapters kept)', v3r.w[0] === 701 && v3r.w[1] === 703 && v3r.up === '3210000001' && v3r.board === 14 && v3r.done.join() === '1,1' && v3r.unlocked3 === 1 && v3r.passport === 1 && v3r.sciEatenStays && v3r.atStart && v3r.mv === 4 && v3r.voiceDropped, v3r]);

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
