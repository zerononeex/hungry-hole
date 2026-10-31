// v5.1 two-iPad co-op, proven with two real pages. Serve the repo root (python3 -m http.server 8765) then: node tests/coop.js
//
// Each page runs in its OWN browser context, so each has its own save (like two iPads). The game's test transport
// (?nettest=bc) talks over BroadcastChannel; a BroadcastChannel cannot cross contexts, so this harness installs a
// stand-in BroadcastChannel in both pages that forwards each message (JSON, as PeerJS would) to the other page, in order.
// Everything above the channel is the shipping game code.
const { chromium } = require('playwright');
const BASE = process.env.HH_URL || 'http://localhost:8765/index.html';
const URL = BASE + '?nettest=bc';
const sleep = ms => new Promise(r => setTimeout(r, ms));

const SHIM = () => {
  const chans = new Map();
  class BC {
    constructor(name) { this.name = String(name); this.onmessage = null; this.closed = false; if (!chans.has(this.name)) chans.set(this.name, new Set()); chans.get(this.name).add(this); }
    postMessage(d) { if (!this.closed) window.__bcOut(this.name, JSON.stringify(d)); }
    close() { this.closed = true; const s = chans.get(this.name); if (s) s.delete(this); }
    addEventListener() {} removeEventListener() {}
  }
  window.BroadcastChannel = BC;
  window.__bcIn = (name, json) => { const s = chans.get(name); if (!s) return; const data = JSON.parse(json); for (const c of [...s]) if (!c.closed && c.onmessage) c.onmessage({ data }); };
};

(async () => {
  const b = await chromium.launch();
  const pages = {}, errs = [], results = [];
  const queues = { A: Promise.resolve(), B: Promise.resolve() };
  const mk = async (who, other, name) => {
    const ctx = await b.newContext({ viewport: { width: 1180, height: 820 } });
    await ctx.addInitScript(SHIM);
    await ctx.exposeFunction('__bcOut', (ch, json) => {
      queues[other] = queues[other].then(() => pages[other] && !pages[other].isClosed() ? pages[other].evaluate(([c, j]) => window.__bcIn && window.__bcIn(c, j), [ch, json]).catch(() => {}) : null);
    });
    const p = await ctx.newPage();
    p.on('pageerror', e => errs.push(who + ' PAGEERR ' + e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(who + ' ' + m.text()); });
    await p.goto(URL); await p.waitForTimeout(400);
    await p.evaluate(nm => { HH.S.settings.name = nm; HH.S.ch[2].u = HH.S.ch[3].u = 1; HH.persist(); localStorage.setItem('family-other-app', 'keep-me'); }, name);
    pages[who] = p; return p;
  };
  const A = await mk('A', 'B', 'Ana'), B = await mk('B', 'A', 'Ben');   // A hosts, B joins
  const T = async (name, fn) => { try { const r = await fn(); results.push([name, !!r.ok, r.info]); } catch (e) { results.push([name, false, e.message.split('\n')[0]]); } };
  const until = async (p, fn, ms = 8000, arg) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await p.evaluate(fn, arg)) return true; await sleep(100); } return false; };

  // ---- connect: A hosts n/kind from the picker, B joins with the code ----
  const connect = async (n, kind, fromKind) => {
    await A.evaluate(([n, kind]) => { HH.UI.chapters(kind); HH.UI.coopHost(n, kind); }, [n, kind]);
    await until(A, () => /^[A-Z]{6}$/.test((document.getElementById('coop-code') || {}).textContent || ''), 4000);
    const code = await A.evaluate(() => document.getElementById('coop-code').textContent);
    await B.evaluate(k => { if (k) HH.UI.chapters(k); HH.UI.coopJoin(k || null); }, fromKind === undefined ? null : fromKind);
    await B.fill('#j-code', code.toLowerCase()); await B.click('#j-go');
    return code;
  };
  const both = fn => Promise.all([A.evaluate(fn), B.evaluate(fn)]);
  const playing = () => HH.net && HH.net.on && HH.G.mode === 'play';

  await T('host + join + HELLO: a 6-letter code, both iPads in the same world and mode, names exchanged', async () => {
    const code = await connect(1, 'story');
    const ok = await until(A, playing) && await until(B, playing);
    const [a, bb] = await both(() => ({ n: HH.G.C.n, kind: HH.G.run.kind, role: HH.net.role, mate: HH.net.mate, hasMate: !!HH.G.mate }));
    const codeOk = /^[A-HJ-NP-Z]{6}$/.test(code);
    return { ok: ok && codeOk && a.n === 1 && bb.n === 1 && a.kind === 'story' && bb.kind === 'story' && a.role === 'host' && bb.role === 'guest' && a.mate === 'Ben' && bb.mate === 'Ana' && a.hasMate && bb.hasMate, info: { code, a, b: bb } };
  });

  await T('position sync both ways (guest -> host at ~10 Hz, host -> guest in the state message)', async () => {
    await B.evaluate(() => { const G = HH.G; G.x += 3; G.y += 2; G.vx = G.vy = 0; });
    await A.evaluate(() => { const G = HH.G; G.x -= 2; G.vx = G.vy = 0; });
    await sleep(1000);
    const gp = await B.evaluate(() => [HH.G.x, HH.G.y]), hp = await A.evaluate(() => [HH.G.x, HH.G.y]);
    const seenByHost = await A.evaluate(() => [HH.G.mate.x, HH.G.mate.y]);
    const seenByGuest = await B.evaluate(() => [HH.G.mate.x, HH.G.mate.y]);
    if (process.env.HH_SHOTS) { await A.screenshot({ path: process.env.HH_SHOTS + '/coop-host.png' }); await B.screenshot({ path: process.env.HH_SHOTS + '/coop-guest.png' }); }
    if (process.env.HH_SHOTS) {
      for (let i = 0; i < 8; i++) { await B.evaluate(h => { HH.G.x = h[0] + 0.25; HH.G.y = h[1] + 0.12; HH.G.fl = HH.G.mate.fl; HH.G.vx = HH.G.vy = 0; }, hp); await sleep(100); }
      await A.screenshot({ path: process.env.HH_SHOTS + '/coop-near-host.png' }); await B.screenshot({ path: process.env.HH_SHOTS + '/coop-near-guest.png' });
      await B.evaluate(g => { HH.G.x = g[0]; HH.G.y = g[1]; }, gp); await sleep(600);
    }
    const near = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]) < 0.3;
    return { ok: near(gp, seenByHost) && near(hp, seenByGuest), info: { gp, seenByHost, hp, seenByGuest } };
  });

  // put a hole (host's own, or the guest's) on the current objective with enough size to swallow it
  const feedGoal = async who => {
    const goal = await A.evaluate(() => { const g = HH.G.goal; return g ? { id: g.id, nid: g.nid, x: g.x, y: g.y, fw: g.fw, beat: HH.G.st.beat } : null; });
    if (!goal) return null;
    if (who === 'host') await A.evaluate(g => { const G = HH.G; HH.setHoleD(g.fw * 1.02); G.x = g.x; G.y = g.y; G.vx = G.vy = 0; }, goal);
    else {
      await A.evaluate(g => HH.asMate(() => HH.setHoleD(g.fw * 1.02)), goal);
      for (let i = 0; i < 30; i++) { await B.evaluate(g => { const G = HH.G; G.x = g.x; G.y = g.y; G.vx = G.vy = 0; }, goal); await sleep(100); }
    }
    return goal;
  };
  await T('an eat by the GUEST advances the ladder on both iPads', async () => {
    const g = await feedGoal('guest'); if (!g) return { ok: false, info: 'no goal' };
    const ok = await until(A, b => HH.G.st.beat > b, 6000, g.beat) && await until(B, b => HH.G.st.beat > b, 3000, g.beat);
    const [a, bb] = await both(() => ({ beat: HH.G.st.beat, goal: HH.G.goal && HH.G.goal.id }));
    const deadOnGuest = await until(B, id => { const o = HH.objByNid(id); return !!(o && o.dead); }, 4000, g.nid);
    return { ok: ok && a.beat === bb.beat && a.goal === bb.goal && deadOnGuest, info: { ate: g.id, a, b: bb, deadOnGuest } };
  });
  await T('an eat by the HOST advances the ladder on both iPads', async () => {
    const g = await feedGoal('host'); if (!g) return { ok: false, info: 'no goal' };
    const ok = await until(A, b => HH.G.st.beat > b, 6000, g.beat) && await until(B, b => HH.G.st.beat > b, 3000, g.beat);
    const [a, bb] = await both(() => ({ beat: HH.G.st.beat, goal: HH.G.goal && HH.G.goal.id }));
    return { ok: ok && a.beat === bb.beat && a.goal === bb.goal, info: { ate: g.id, a, b: bb } };
  });

  await T('the size cap (next objective) holds for BOTH holes', async () => {
    const r = await A.evaluate(() => {
      HH.addXP(1e9); HH.asMate(() => HH.addXP(1e9));
      const cap = HH.capD(), h = HH.holeD(), g = HH.asMate(HH.holeD);
      return { cap, h, g };
    });
    await sleep(500);
    const gv = await B.evaluate(() => ({ own: HH.holeD(), cap: HH.capD() }));
    const ok = r.h <= r.cap * 1.0001 && r.g <= r.cap * 1.0001 && gv.own <= r.cap * 1.0001 && r.g > 0;
    return { ok, info: { ...r, guestSees: gv } };
  });

  await T('a snapshot resync repairs a corrupted guest (wrong eaten set + wrong objective)', async () => {
    const before = await A.evaluate(() => HH.setHash(HH.net.dead));
    await B.evaluate(() => {
      const N = HH.net, G = HH.G; let n = 0;
      for (const o of G.auth) if (!o.dead && o.nid && n < 25) { o.dead = 1; N.dead.add(o.nid); n++; }   // pretend 25 things vanished
      for (const id of [...N.dead].slice(0, 3)) N.dead.delete(id);                                        // and 3 eaten things came back
      G.st.beat = 0; HH.syncBeat();
    });
    const broken = await B.evaluate(() => HH.setHash(HH.net.dead));
    await A.evaluate(() => { HH.net.snapT = 0; });            // the next 5-second check is due now
    const ok = await until(B, h => HH.setHash(HH.net.dead) === h, 6000, before);
    const [a, bb] = await both(() => ({ hash: HH.setHash(HH.net.dead), beat: HH.G.st.beat, resyncs: HH.net.resyncs || 0, revived: HH.G.auth.filter(o => o.nid && o.dead && !HH.net.dead.has(o.nid)).length }));
    return { ok: ok && a.hash === bb.hash && a.beat === bb.beat && bb.resyncs >= 1 && bb.revived === 0, info: { before, broken, a, b: bb } };
  });

  await T('the guest earns coins as it eats; they bank into the guest\'s own World 1 wallet exactly once', async () => {
    const [w0, b0] = await B.evaluate(() => [JSON.parse(localStorage.getItem('hungry-hole-data-v1')).ch[1].w, HH.net.banked]);
    await A.evaluate(() => HH.asMate(() => HH.G.st.w += 37));     // the host's tally of the guest's coins
    await sleep(800);
    const r = await B.evaluate(() => ({ banked: HH.net.banked, mem: HH.S.ch[1].w, disk: JSON.parse(localStorage.getItem('hungry-hole-data-v1')).ch[1].w }));
    await sleep(600);
    const again = await B.evaluate(() => HH.S.ch[1].w);
    return { ok: r.banked - b0 >= 37 && r.disk === w0 + r.banked - b0 && again === r.mem, info: { w0, b0, ...r, again } };
  });

  await T('shared pause: the host pauses, the guest sees "paused by Ana"', async () => {
    await A.evaluate(() => { HH.G.paused = true; });
    const seen = await until(B, () => HH.G.netPause === 'Ana', 3000);
    await A.evaluate(() => { HH.G.paused = false; });
    const cleared = await until(B, () => !HH.G.netPause, 3000);
    return { ok: seen && cleared, info: { seen, cleared } };
  });

  await T('guest disconnect: host carries on solo, guest keeps its banked coins, its own progression unchanged', async () => {
    const save0 = await B.evaluate(() => { const s = JSON.parse(localStorage.getItem('hungry-hole-data-v1')); return { beat: s.ch[1].beat, eaten: Object.keys(s.ch[1].eaten || {}).length, w: s.ch[1].w, lvl: s.ch[1].lvl }; });
    const banked = await B.evaluate(() => HH.net.banked);
    await B.evaluate(() => HH.UI.show('main'));              // LEAVE & MAIN MENU
    const solo = await until(A, () => !HH.net && HH.G.mode === 'play' && HH.G.mate && HH.G.mate.gone, 8000);
    await sleep(300);
    const host = await A.evaluate(() => ({ mode: HH.G.mode, net: !!HH.net, beat: HH.G.st.beat }));
    const save1 = await B.evaluate(() => { const s = JSON.parse(localStorage.getItem('hungry-hole-data-v1')); return { beat: s.ch[1].beat, eaten: Object.keys(s.ch[1].eaten || {}).length, w: s.ch[1].w, lvl: s.ch[1].lvl, other: localStorage.getItem('family-other-app') }; });
    const g = await B.evaluate(() => ({ net: !!HH.net, mode: HH.G.mode }));
    // the host keeps playing alone: its own hole still eats
    const soloEat = await A.evaluate(async () => {
      const G = HH.G, rg = HH.ringNow(), inR = o => !rg || (o.x > rg[0] && o.x < rg[2] && o.y > rg[1] && o.y < rg[3]);
      const o = G.vis.filter(o => !o.dead && !o.fall && !o.coin && !o.tile && !o.path && (o.fl === undefined || o.fl === G.fl) && HH.canEat(o) && inR(o))
        .sort((a, b) => Math.hypot(a.x - G.x, a.y - G.y) - Math.hypot(b.x - G.x, b.y - G.y))[0];
      if (!o) return 'none';
      for (let i = 0; i < 15 && !o.dead; i++) { if (!o.fall) { G.x = o.x; G.y = o.y; G.vx = G.vy = 0; } await new Promise(r => setTimeout(r, 100)); }
      return o.dead ? true : o.k; });
    const ok = solo && host.mode === 'play' && !g.net && save1.beat === save0.beat && save1.eaten === save0.eaten && save1.w === save0.w && banked > 0 && save1.other === 'keep-me' && soloEat === true;
    return { ok, info: { solo, host, guest: g, banked, save0, save1, soloEat } };
  });

  // ---- the other three modes ----
  const leaveAll = async () => { await B.evaluate(() => HH.UI.show('main')); await A.evaluate(() => HH.UI.show('main')); await sleep(500); };
  await T('I SPY together: one hand of 5 from the host\'s deck on both iPads; a guest find counts for both', async () => {
    await A.evaluate(() => HH.UI.show('main')); await sleep(300);
    await connect(2, 'ispy', 'ispy');
    const ok = await until(A, playing) && await until(B, playing) && await until(B, () => HH.G.run.tg && HH.G.run.tg.length === 5 && HH.G.run.tg.every(t => t.o), 4000);
    const [a, bb] = await both(() => HH.G.run.tg.map(t => t.name).join('|'));
    const t0 = await A.evaluate(() => { const t = HH.G.run.tg.find(t => !t.done && !t.o.path && !(t.o.T && t.o.T.mv)) || HH.G.run.tg.find(t => !t.done); HH.asMate(() => HH.setHoleD(t.o.fw * 1.02)); return { x: t.o.x, y: t.o.y, name: t.name }; });
    for (let i = 0; i < 25; i++) { await B.evaluate(t => { HH.G.x = t.x; HH.G.y = t.y; HH.G.vx = HH.G.vy = 0; }, t0); await sleep(100); }
    const found = await until(A, n => HH.G.run.tg.some(t => t.name === n && t.done), 5000, t0.name) && await until(B, n => HH.G.run.tg.some(t => t.name === n && t.done), 3000, t0.name);
    return { ok: ok && a === bb && found, info: { host: a, guest: bb, found: t0.name } };
  });
  await T('I SPY win bonus pays into BOTH wallets', async () => {
    const w = await both(() => HH.S.ch[2].w);
    const bonusSent = await A.evaluate(() => { const g0 = HH.asMate(() => HH.G.st.w); HH.net.win('ispy', 500); return HH.asMate(() => HH.G.st.w) - g0; });
    await sleep(1000);
    const w2 = await both(() => HH.S.ch[2].w);
    return { ok: w2[1] - w[1] >= bonusSent && bonusSent > 0, info: { before: w, after: w2, bonusSent } };
  });
  await leaveAll();

  await T('EDUCATIONAL together: same set and size on both holes; each player\'s correct answers go on their own save', async () => {
    await connect(1, 'edu', 'edu');
    const ok = await until(A, playing) && await until(B, playing) && await until(B, () => HH.G.run.steps && HH.G.run.steps.length > 0, 4000);
    const sizes = await A.evaluate(() => ({ h: HH.holeD(), g: HH.asMate(HH.holeD), set: HH.G.run.set }));
    const gset = await B.evaluate(() => HH.G.run.set);
    const L0 = await both(() => JSON.stringify(HH.S.learn));
    await A.evaluate(() => { HH.G.eatBy = 'g'; try { HH.net.learn(Object.keys(HH.S.learn)[0]); } finally { HH.G.eatBy = null; } });
    await sleep(600);
    const L1 = await both(() => JSON.stringify(HH.S.learn));
    const gl0 = JSON.parse(L0[1]), gl1 = JSON.parse(L1[1]);
    const guestUp = Object.keys(gl1).some(k => gl1[k] === gl0[k] + 1), hostSame = L0[0] === L1[0];
    return { ok: ok && Math.abs(sizes.h - sizes.g) < 1e-9 && gset === sizes.set && guestUp && hostSame, info: { sizes, gset, guestUp, hostSame, L0, L1 } };
  });
  await leaveAll();

  await T('EXPLORATION together: both roam, nothing is saved on either iPad', async () => {
    const s0 = await both(() => localStorage.getItem('hungry-hole-data-v1'));
    await connect(3, 'explore', 'explore');
    const ok = await until(A, playing) && await until(B, playing);
    await A.evaluate(() => { const o = HH.G.vis.find(o => !o.dead && HH.canEat(o)); if (o) { HH.G.x = o.x; HH.G.y = o.y; } });
    await sleep(2000);
    const n = await both(() => HH.G.C.n);
    await leaveAll();
    const s1 = await both(() => localStorage.getItem('hungry-hole-data-v1'));
    const strip = s => { const d = JSON.parse(s); delete d.last; delete d.t; return JSON.stringify(d.ch); };
    return { ok: ok && n[0] === 3 && n[1] === 3 && strip(s0[0]) === strip(s1[0]) && strip(s0[1]) === strip(s1[1]), info: { n, hostSame: strip(s0[0]) === strip(s1[0]), guestSame: strip(s0[1]) === strip(s1[1]) } };
  });

  for (const key of ['globe', 'space']) await T(`${key.toUpperCase()} together (story): links, syncs both holes and shares an eat`, async () => {
    const n = await A.evaluate(k => HH.CH.findIndex(c => c && c.key === k), key);
    await both(new Function(`HH.S.ch[${n}].u = 1;`));
    await connect(n, 'story');
    const ok = await until(A, playing) && await until(B, playing);
    const g = await A.evaluate(() => { const G = HH.G, o = G.vis.filter(o => !o.dead && !o.fall && !o.coin && !o.tile && !o.path && !o.pool && o.nid && HH.canEat(o)).sort((a, b) => Math.hypot(a.x - G.x, a.y - G.y) - Math.hypot(b.x - G.x, b.y - G.y))[0]; return o ? { nid: o.nid, x: o.x, y: o.y } : null; });
    if (!g) return { ok: false, info: 'nothing to eat' };
    for (let i = 0; i < 25; i++) { await B.evaluate(t => { const G = HH.G, o = HH.objByNid(t.nid); if (o && !o.fall && !o.dead) { G.x = t.x; G.y = t.y; G.vx = G.vy = 0; } }, g); await sleep(100); }
    const eaten = await until(A, id => { const o = HH.objByNid(id); return !o || o.dead; }, 3000, g.nid) && await until(B, id => { const o = HH.objByNid(id); return !o || o.dead; }, 3000, g.nid);
    const h0 = await A.evaluate(() => HH.setHash(HH.net.dead)); await until(B, h => HH.setHash(HH.net.dead) === h, 3000, h0);   // in-flight eats settle
    const [a, bb] = await both(() => ({ n: HH.G.C.n, hash: HH.setHash(HH.net.dead), mate: [+HH.G.mate.x.toFixed(1), +HH.G.mate.y.toFixed(1)], me: [+HH.G.x.toFixed(1), +HH.G.y.toFixed(1)] }));
    await leaveAll();
    return { ok: ok && eaten && a.n === n && bb.n === n && a.hash === bb.hash, info: { key, n, eaten, a, b: bb } };
  });

  await T('HELLO mismatch: a guest on the I SPY picker joining a STORY host gets a kind message and nobody is linked', async () => {
    await connect(1, 'story', 'ispy');
    await sleep(1500);
    const g = await B.evaluate(() => ({ net: !!HH.net, note: document.getElementById('note').textContent, mode: HH.G.mode }));
    const h = await until(A, () => !HH.net || HH.net.phase !== 'play', 3000);
    await A.evaluate(() => { if (HH.net) HH.net.end('cancel'); HH.UI.closeModal(); HH.UI.show('main'); });
    return { ok: !g.net && /STORY/.test(g.note) && /I SPY/.test(g.note) && g.mode !== 'play' && h, info: g };
  });

  await T('the wire is never trusted: junk messages are dropped without breaking the game', async () => {
    await connect(1, 'story');
    await until(A, playing) && await until(B, playing);
    const r = await B.evaluate(() => {
      const N = HH.net, before = HH.G.st.beat;
      for (const m of [null, 5, 'x', { t: 'st' }, { t: 'st', h: { x: 'NaN' }, g: { L: 999, w: -5 } }, { t: 'cap', id: '<script>' }, { t: 'add', id: 'a9999999', k: 'nope', x: 0, y: 0 },
        { t: 'start', n: 99 }, { t: 'full', dead: 'all' }, { t: 'learn', s: 'hacking' }, { t: 'win', k: 'ispy', bonus: 1e99 }, { t: '__proto__' }, { t: 'constructor' }]) N.recv(m);
      return { alive: !!HH.net && HH.G.mode === 'play', beat: HH.G.st.beat === before, w: HH.S.ch[1].w };
    });
    const r2 = await A.evaluate(() => { const N = HH.net, M = HH.G.mate, x0 = M.tx; for (const m of [{ t: 'pos', x: Infinity, y: 0 }, { t: 'pos', x: 'a' }, { t: 'ups', ups: [99] }, { t: 'sz', k: 1e9 }, { t: 'hello', v: '9' }]) N.recv(m); return { alive: !!HH.net, x: M.tx === x0, ups: HH.G.mate.st.up.every(v => v <= 10) }; });
    await sleep(500);
    const stillLinked = await both(() => !!HH.net && HH.net.on);
    await leaveAll();
    return { ok: r.alive && r.beat && r2.alive && r2.x && r2.ups && stillLinked.every(Boolean), info: { r, r2, stillLinked } };
  });

  await T('closing the guest iPad (no goodbye) is noticed by the host within the heartbeat timeout', async () => {
    await connect(1, 'story');
    await until(A, playing) && await until(B, playing);
    await B.evaluate(() => { HH.net.link.send = () => {}; HH.net.tick = () => {}; });   // the guest goes silent, as if the iPad slept
    const solo = await until(A, () => !HH.net && HH.G.mode === 'play' && HH.G.mate && HH.G.mate.gone, 10000);
    await B.evaluate(() => { if (HH.net) HH.net.end('left'); HH.UI.show('main'); });
    return { ok: solo, info: { solo } };
  });

  await T('PeerJS blocked (no ?nettest): the game boots and plays solo with zero errors; only the co-op buttons say "can\'t connect"', async () => {
    const ctx = await b.newContext({ viewport: { width: 1180, height: 820 } });
    let blocked = 0; await ctx.route(/peerjs|jsdelivr|unpkg|peerjs\.com/, r => { blocked++; r.abort(); });
    const p = await ctx.newPage(), e2 = [];
    p.on('pageerror', e => e2.push('PAGEERR ' + e.message)); p.on('console', m => { if (m.type() === 'error') e2.push(m.text()); });
    await p.goto(BASE); await p.waitForTimeout(600);
    const bootErrs = e2.length;
    await p.click('#b-start').catch(() => {});
    const solo = await p.evaluate(async () => {
      HH.startChapter(1); const G = HH.G; await new Promise(r => setTimeout(r, 300));
      const o = G.vis.filter(o => !o.dead && !o.coin && !o.tile && !o.path && (o.fl === undefined || o.fl === G.fl) && HH.canEat(o)).sort((a, b) => Math.hypot(a.x - G.x, a.y - G.y) - Math.hypot(b.x - G.x, b.y - G.y))[0];
      for (let i = 0; i < 15 && !o.dead; i++) { if (!o.fall) { G.x = o.x; G.y = o.y; G.vx = G.vy = 0; } await new Promise(r => setTimeout(r, 100)); }
      return { ate: !!o.dead, mode: G.mode, net: !!HH.net, peer: typeof window.Peer };
    });
    const soloErrs = e2.length;
    await p.evaluate(() => { HH.S.settings.name = 'Ana'; HH.UI.chapters('story'); });
    await p.click('[data-coop]');
    await p.waitForTimeout(400);
    const n1 = await p.evaluate(() => ({ note: document.getElementById('note').textContent, on: document.getElementById('note').classList.contains('on'), net: !!HH.net }));
    await p.evaluate(() => { document.getElementById('note').classList.remove('on'); HH.UI.main(); });
    await p.click('#b-join');
    await p.waitForTimeout(400);
    const n2 = await p.evaluate(() => ({ note: document.getElementById('note').textContent, on: document.getElementById('note').classList.contains('on'), net: !!HH.net }));
    await ctx.close();
    const ok = bootErrs === 0 && soloErrs === 0 && solo.ate && solo.peer === 'undefined' && /Can't connect/.test(n1.note) && n1.on && !n1.net && /Can't connect/.test(n2.note) && n2.on && !n2.net;
    return { ok, info: { bootErrs, soloErrs, solo, blocked, n1, n2, later: e2.slice(soloErrs) } };
  });

  const filt = errs.filter(e => !/Failed to load resource/.test(e));
  for (const [n, ok, info] of results) console.log((ok ? 'PASS ' : 'FAIL ') + n + '  ' + JSON.stringify(info));
  const pass = results.filter(r => r[1]).length;
  console.log(`${pass}/${results.length} passed; console errors: ${filt.length}`, filt.slice(0, 8));
  await b.close();
  process.exit(pass === results.length && !filt.length ? 0 : 1);
})();
