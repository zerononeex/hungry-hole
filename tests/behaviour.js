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

  await T('eat + grow', new Function(STEP + `
    const { G } = HH; HH.startChapter(1); G.ptr = null; step(2);
    const o = G.vis.find(o => o.t === 1 && !o.coin && !o.tile && !o.helper); const xp0 = G.xp;
    G.x = o.x; G.y = o.y; G.vx = G.vy = 0; step(2);
    const ate = !!o.dead, xpUp = G.xp > xp0;
    const L0 = G.lvl; HH.addXP(HH.need(G.lvl) + 1); const grew = G.lvl === L0 + 1;
    return { ok: ate && xpUp && grew, info: { ate, xp0, xp1: G.xp, lvlFrom: L0, lvlTo: G.lvl } };`));

  await T('too big bumps, not eaten', new Function(STEP + `
    const { G } = HH; HH.restartRun(true); step(1);
    const bed = G.auth.find(o => o.k === 'bed' && !o.dead); G.x = bed.x; G.y = bed.y; G.vx = G.vy = 0; step(3);
    return { ok: !bed.dead && bed.wob > 0 && G.lvl < bed.t, info: { lvl: G.lvl, bedTier: bed.t, wob: !!bed.wob } };`));

  await T('checklist ticks + unlocks next chapter', new Function(STEP + `
    const { G, S } = HH; HH.startChapter(1); S.ch[2].u = 0;
    const all = HH.gather(0, 0, G.C.W, G.C.H, 1);
    const legos = all.filter(o => o.k === 'lego' && !o.dead).slice(0, 25), sold = all.filter(o => o.k === 'soldier' && !o.dead).slice(0, 10);
    legos.forEach(HH.eat); sold.forEach(HH.eat); const mid = G.st.check.join('/'), unl0 = S.ch[2].u;
    HH.eat(G.auth.find(o => o.k === 'bed' && !o.dead));
    return { ok: mid === '25/10/0' && !unl0 && G.st.check.join('/') === '25/10/1' && G.st.c === 1 && S.ch[2].u === 1, info: { legos: legos.length, soldiers: sold.length, mid, after: G.st.check.join('/'), unlocked2: S.ch[2].u } };`));

  await T('tiny quest completes, new one rolls in', new Function(STEP + `
    const { G } = HH; HH.startChapter(1); const st = G.st; st.board = st.board.map(() => 0); st.act = []; st.qi = 0; HH.rollQuests(true);
    const a = st.act.find(a => G.C.Q[a.i].raw === 'c:lego:5'); const before = st.act.map(a => a.i).join(',');
    const legos = HH.gather(0, 0, G.C.W, G.C.H, 1).filter(o => o.k === 'lego' && !o.dead).slice(0, 5); legos.forEach(HH.eat);
    const boardTicked = st.board[a.i] === 1, dropped = st.act.length === 2;
    step(30); const after = st.act.map(a => a.i).join(',');
    return { ok: !!a && boardTicked && dropped && st.act.length === 3 && !st.act.some(x => x.i === a.i), info: { before, after, board: st.board.filter(Boolean).length } };`));

  await T('avoid quest resets, never fails', new Function(STEP + `
    const { G } = HH; HH.startChapter(1); const st = G.st, C = G.C;
    const qi = C.Q.findIndex(q => q.raw === 'a:soldier:10'); st.act = []; st.board[qi] = 0; st.qi = qi; HH.rollQuests(true);
    const a = st.act.find(a => a.i === qi); const all = HH.gather(0, 0, C.W, C.H, 1);
    all.filter(o => o.k === 'lego' && !o.dead).slice(0, 4).forEach(HH.eat); const p1 = a.p;
    HH.eat(all.find(o => o.k === 'soldier' && !o.dead)); const p2 = a.p, still = st.act.includes(a);
    all.filter(o => o.k === 'lego' && !o.dead).slice(0, 10).forEach(HH.eat); const done = st.board[qi] === 1;
    return { ok: p1 === 4 && p2 === 0 && still && done, info: { p1, p2, stillActive: still, doneAfter10: done } };`));

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
