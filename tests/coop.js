// v5.1 two-iPad co-op, v5.3 up to four players, proven with real pages. Serve the repo root (python3 -m http.server 8765)
// then: node tests/coop.js
//
// Each page runs in its OWN browser context, so each has its own save (like separate iPads). The game's test transport
// (?nettest=bc) talks over BroadcastChannel; a BroadcastChannel cannot cross contexts, so this harness installs a
// stand-in BroadcastChannel in every page that forwards each message (JSON, as PeerJS would) to every other page, in
// order, the way a real BroadcastChannel reaches every listener. Everything above the channel is the shipping game code.
// A and B live for the whole run; C and D are opened for the four-player tests and closed after them.
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
  const pages = {}, ctxs = {}, errs = [], results = [];
  const queues = {}, lat = { n: 0, sum: 0, max: 0 }, pend = {}, ids = {};   // ids: a transport id (the 'from' a page signs with) -> that page
  const deliver = (other, ch, json) => {
    if (!pages[other] || pages[other].isClosed()) return;
    const q = pend[other]; q.push([ch, json, Date.now()]);
    if (q.length > 1) return;                         // a flush is already queued and will carry this one
    queues[other] = queues[other].then(() => {
      const batch = q.splice(0), t = Date.now();
      for (const m of batch) { const d = t - m[2]; lat.n++; lat.sum += d; lat.max = Math.max(lat.max, d); }
      return pages[other] && !pages[other].isClosed() ? pages[other].evaluate(list => { for (const [c, j] of list) window.__bcIn && window.__bcIn(c, j); }, batch.map(m => [m[0], m[1]])).catch(() => {}) : null;
    });
  };
  const mk = async (who, name) => {
    const ctx = ctxs[who] = await b.newContext({ viewport: { width: 1180, height: 820 } });
    queues[who] = Promise.resolve(); pend[who] = [];
    await ctx.addInitScript(SHIM);
    // Messages to a page are delivered in order, in batches: whatever piled up while the last delivery ran goes over in ONE
    // evaluate. (v5.1 sent one evaluate per message; at ~25 messages a second each way a busy page fell seconds behind, so
    // tests read stale positions, late coins and late answers. A real data channel streams; so does this now.)
    // v5.3 fix 3: a message addressed to one player goes to that player's page only, the way the shipping transport (one
    // PeerJS data channel per guest) carries it. Until then every page got every page's traffic: with four pages each one
    // parsed three times the messages a real iPad ever sees, the host's page fell seconds behind, and the later guests'
    // join handshakes and heartbeats timed out. Broadcasts (a guest's "join", which names no one yet) still go to all.
    await ctx.exposeFunction('__bcOut', (ch, json) => {
      let to = null, from = null; try { const v = JSON.parse(json); to = v && v.to; from = v && v.from; } catch (e) { /* not ours */ }
      if (typeof from === 'string') ids[from] = who;
      const dest = typeof to === 'string' && ids[to];
      for (const other of Object.keys(pages)) if (other !== who && (!dest || other === dest)) deliver(other, ch, json);
    });
    const p = await ctx.newPage();
    // HH_THROTTLE=4 slows every page's CPU 4x (Chrome DevTools throttling), like a busy machine running four iPads at once
    if (+process.env.HH_THROTTLE > 1) { const cdp = await ctx.newCDPSession(p); await cdp.send('Emulation.setCPUThrottlingRate', { rate: +process.env.HH_THROTTLE }); }
    p.on('pageerror', e => errs.push(who + ' PAGEERR ' + e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(who + ' ' + m.text()); });
    await p.goto(URL); await p.waitForTimeout(400);
    await p.evaluate(nm => { HH.S.settings.name = nm; HH.S.ch[2].u = HH.S.ch[3].u = 1; HH.persist(); localStorage.setItem('family-other-app', 'keep-me'); }, name);
    pages[who] = p; return p;
  };
  const A = await mk('A', 'Ana'), B = await mk('B', 'Ben');   // A hosts, B joins
  const ONLY = process.env.ONLY && new RegExp(process.env.ONLY);
  const T = async (name, fn) => { if (ONLY && !ONLY.test(name)) return; try { const r = await fn(); results.push([name, !!r.ok, r.info]); } catch (e) { results.push([name, false, e.message.split('\n')[0]]); } };
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
    // fresh within 3 s on each side (each hole's own position read on its own iPad, then the partner's view of it)
    const near = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]) < 0.3;
    let gp, hp, seenByHost, seenByGuest;
    for (const t0 = Date.now(); Date.now() - t0 < 3000;) {
      await sleep(200);
      gp = await B.evaluate(() => [HH.G.x, HH.G.y]); hp = await A.evaluate(() => [HH.G.x, HH.G.y]);
      seenByHost = await A.evaluate(() => [HH.G.mate.x, HH.G.mate.y]); seenByGuest = await B.evaluate(() => [HH.G.mate.x, HH.G.mate.y]);
      if (near(gp, seenByHost) && near(hp, seenByGuest)) break;
    }
    if (process.env.HH_SHOTS) { await A.screenshot({ path: process.env.HH_SHOTS + '/coop-host.png' }); await B.screenshot({ path: process.env.HH_SHOTS + '/coop-guest.png' }); }
    if (process.env.HH_SHOTS) {
      for (let i = 0; i < 8; i++) { await B.evaluate(h => { HH.G.x = h[0] + 0.25; HH.G.y = h[1] + 0.12; HH.G.fl = HH.G.mate.fl; HH.G.vx = HH.G.vy = 0; }, hp); await sleep(100); }
      await A.screenshot({ path: process.env.HH_SHOTS + '/coop-near-host.png' }); await B.screenshot({ path: process.env.HH_SHOTS + '/coop-near-guest.png' });
      await B.evaluate(g => { HH.G.x = g[0]; HH.G.y = g[1]; }, gp); await sleep(600);
    }
    return { ok: near(gp, seenByHost) && near(hp, seenByGuest), info: { gp, seenByHost, hp, seenByGuest } };
  });

  // put a hole (host's own, or the guest's) on the current objective with enough size to swallow it
  const feedGoal = async who => {
    const goal = await A.evaluate(() => { const g = HH.G.goal; return g ? { id: g.id, nid: g.nid, x: g.x, y: g.y, fw: g.fw, beat: HH.G.st.beat } : null; });
    if (!goal) return null;
    if (who === 'host') await A.evaluate(g => { const G = HH.G; HH.setHoleD(g.fw * 1.02); G.x = g.x; G.y = g.y; G.vx = G.vy = 0; }, goal);
    else {
      await A.evaluate(g => HH.setHoleD(g.fw * 1.02), goal);      // v5.3 Part 5: Story size is the team's (the host's hole carries it)
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
    const ok = await until(A, playing) && await until(B, playing) && await until(B, () => HH.G.run.tg && HH.G.run.tg.length >= 2 && HH.G.run.tg.every(t => t.o), 4000);
    const [a, bb] = await both(() => HH.G.run.tg.map(t => t.name).join('|'));
    const t0 = await A.evaluate(() => { const t = HH.G.run.tg.find(t => !t.done && !t.o.path && !(t.o.T && t.o.T.mv)) || HH.G.run.tg.find(t => !t.done); HH.asMate(() => HH.setHoleD(t.o.fw * 1.02)); return { x: t.o.x, y: t.o.y, name: t.name }; });
    for (let i = 0; i < 25; i++) { await B.evaluate(t => { HH.G.x = t.x; HH.G.y = t.y; HH.G.vx = HH.G.vy = 0; }, t0); await sleep(100); }
    const found = await until(A, n => HH.G.run.tg.some(t => t.name === n && t.done), 5000, t0.name) && await until(B, n => HH.G.run.tg.some(t => t.name === n && t.done), 3000, t0.name);
    return { ok: ok && a === bb && found, info: { host: a, guest: bb, found: t0.name } };
  });
  await T('I SPY win bonus pays into BOTH wallets', async () => {
    const w = await both(() => HH.S.ch[2].w);
    const bonusSent = await A.evaluate(() => { const g0 = HH.asMate(() => HH.G.st.w); HH.net.win('ispy', 500); return HH.asMate(() => HH.G.st.w) - g0; });
    await until(B, need => HH.S.ch[2].w >= need, 4000, w[1] + bonusSent);
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
    await A.evaluate(() => { HH.G.eatBy = HH.G.mate; try { HH.net.learn(Object.keys(HH.S.learn)[0]); } finally { HH.G.eatBy = null; } });
    await until(B, l0 => JSON.stringify(HH.S.learn) !== l0, 4000, L0[1]); await sleep(300);   // (and the host's own save stays put)
    const L1 = await both(() => JSON.stringify(HH.S.learn));
    const gl0 = JSON.parse(L0[1]), gl1 = JSON.parse(L1[1]);
    const guestUp = Object.keys(gl1).some(k => gl1[k] === gl0[k] + 1), hostSame = L0[0] === L1[0];
    return { ok: ok && Math.abs(sizes.h - sizes.g) < 1e-9 && gset === sizes.set && guestUp && hostSame, info: { sizes, gset, guestUp, hostSame, L0, L1 } };
  });
  await leaveAll();

  await T('EXPLORATION together: both roam, nothing is saved on either iPad', async () => {
    const s0 = await both(() => { HH.persist(); return localStorage.getItem('hungry-hole-data-v1'); });   // (coins the last run's hole earned are saved first)
    await connect(3, 'explore', 'explore');
    const ok = await until(A, playing) && await until(B, playing);
    await A.evaluate(() => { const o = HH.G.vis.find(o => !o.dead && HH.canEat(o)); if (o) { HH.G.x = o.x; HH.G.y = o.y; } });
    await sleep(2000);
    const n = await both(() => HH.G.C.n);
    await leaveAll();
    const s1 = await both(() => localStorage.getItem('hungry-hole-data-v1'));
    const strip = s => { const d = JSON.parse(s); delete d.last; delete d.t; return JSON.stringify(d.ch); };
    const diff = (a, b) => { const x = JSON.parse(a).ch, y = JSON.parse(b).ch, out = []; for (const k in x) for (const f in x[k]) if (JSON.stringify(x[k][f]) !== JSON.stringify(y[k][f])) out.push(k + '.' + f + ':' + JSON.stringify(x[k][f]).slice(0, 40) + '>' + JSON.stringify(y[k][f]).slice(0, 40)); return out; };
    return { ok: ok && n[0] === 3 && n[1] === 3 && strip(s0[0]) === strip(s1[0]) && strip(s0[1]) === strip(s1[1]), info: { n, hostSame: strip(s0[0]) === strip(s1[0]), guestSame: strip(s0[1]) === strip(s1[1]), diff: diff(s0[0], s1[0]) } };
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

  // ---------------- v5.3: up to FOUR players (spec addenda 32-37) ----------------
  const Cp = await mk('C', 'Cai'), Dp = await mk('D', 'Dot');
  const ALL = [A, B, Cp, Dp], GUESTS = [B, Cp, Dp];
  const all = (fn, arg) => Promise.all(ALL.map(p => p.evaluate(fn, arg)));
  const live = () => HH.G.mates.filter(M => !M.gone).length;
  const connect4 = async (n, kind) => {
    await A.evaluate(([n, kind]) => { HH.UI.chapters(kind); HH.UI.coopHost(n, kind); }, [n, kind]);
    await until(A, () => /^[A-Z]{6}$/.test((document.getElementById('coop-code') || {}).textContent || ''), 4000);
    const code = await A.evaluate(() => document.getElementById('coop-code').textContent);
    for (const g of GUESTS) { await g.evaluate(k => { HH.UI.chapters(k); HH.UI.coopJoin(k); }, kind); await g.fill('#j-code', code.toLowerCase()); await g.click('#j-go'); }
    let ok = true; for (const p of ALL) ok = await until(p, playing, 12000) && ok;
    for (const p of ALL) ok = await until(p, n => HH.G.mates.filter(M => !M.gone).length === n, 8000, 3) && ok;
    return { code, ok };
  };
  const leave4 = async () => { for (const g of GUESTS) await g.evaluate(() => { if (HH.net) HH.net.end('left'); HH.UI.show('main'); }); await A.evaluate(() => HH.UI.show('main')); await sleep(600); };
  // one page's hole onto an object (by wire id), held there for up to ms, until it is eaten (as the host reports)
  const feed = async (p, nid, ms = 4000) => {
    const t0 = Date.now();
    while (Date.now() - t0 < ms) {
      const st = await p.evaluate(id => { const o = HH.objByNid(id); if (!o || o.dead) return 'gone'; if (!o.fall) { HH.G.x = o.x; HH.G.y = o.y; HH.G.vx = HH.G.vy = 0; } return 'on'; }, nid);
      if (st === 'gone') return true; await sleep(100);
    }
    return false;
  };
  // the host picks something near (x, y) that every hole can eat now
  const snack = (x, y, skip) => A.evaluate(([x, y, skip]) => { const G = HH.G, D = HH.holeD();
    const os = []; for (const a of G.cells.values()) for (const o of a) os.push(o);
    const o = os.concat(G.vis).filter(o => o.nid && !o.dead && !o.fall && !o.coin && !o.tile && !o.path && !o.pool && !o.tgt && !o.deco && !(o.T && o.T.mv) && o.fw < D * 0.5 && !(skip || []).includes(o.nid) && HH.canEat(o))
      .sort((a, b) => Math.hypot(a.x - x, a.y - y) - Math.hypot(b.x - x, b.y - y))[0];
    return o ? { nid: o.nid, x: o.x, y: o.y } : null; }, [x, y, skip || []]);

  await T('FOUR players (Part 1): three guests join ONE code; every iPad sees the other three, each by name in its own colour; all four holes sync', async () => {
    const { code, ok } = await connect4(2, 'story');
    await all(() => { const N = HH.net, i = N.role === 'host' ? 0 : N.me; HH.G.x += (i - 1.5) * 1.6; HH.G.y += 0.7 * i; HH.G.vx = HH.G.vy = 0; });
    let views, truth, good = false;
    for (const t0 = Date.now(); Date.now() - t0 < 5000 && !good;) {
      await sleep(250);
      truth = await all(() => ({ id: HH.net.role === 'host' ? 0 : HH.net.me, x: HH.G.x, y: HH.G.y, name: HH.S.settings.name }));
      views = await all(() => HH.G.mates.filter(M => !M.gone).map(M => ({ id: M.id, x: M.x, y: M.y, name: M.name })));
      good = views.every((v, i) => v.length === 3 && v.every(m => { const t = truth.find(q => q.id === m.id); return t && t.id !== truth[i].id && Math.hypot(t.x - m.x, t.y - m.y) < 0.5 && t.name === m.name; }));
    }
    if (process.env.HH_SHOTS) {          // v5.3 screenshots: the host and a guest in a four-player game (three partner arrows / name plates, three minimap dots)
      await all(() => { HH.G.cam.x = HH.G.x; HH.G.cam.y = HH.G.y; }); await sleep(800);
      await A.screenshot({ path: process.env.HH_SHOTS + '/82-coop4-host-view.jpg', type: 'jpeg', quality: 82 }); await Cp.screenshot({ path: process.env.HH_SHOTS + '/83-coop4-guest-view.jpg', type: 'jpeg', quality: 82 });
      await A.evaluate(() => HH.UI.pause()); await sleep(500); await A.screenshot({ path: process.env.HH_SHOTS + '/84-coop4-pause-room-code.jpg', type: 'jpeg', quality: 82 }); await Cp.screenshot({ path: process.env.HH_SHOTS + '/85-coop4-paused-by-host.jpg', type: 'jpeg', quality: 82 });
      await A.evaluate(() => HH.UI.resume()); await sleep(500);
    }
    const ids = truth.map(t => t.id).sort().join(''), cols = await A.evaluate(() => HH.G.mates.map(M => HH.pcol(M)));
    return { ok: ok && good && ids === '0123' && new Set(cols).size === 3, info: { code, ids, cols, views: views.map(v => v.map(m => m.name + '#' + m.id).join(' ')) } };
  });
  await T('FOUR players (Part 1): one guest\'s eat of the objective advances the shared ladder on all four iPads', async () => {
    const goal = await A.evaluate(() => { const G = HH.G, g = G.goal; if (!g) return null; HH.setHoleD(g.fw * 1.02); G.x = g.x + g.fw * 30; G.vx = G.vy = 0; return { nid: g.nid, beat: G.st.beat, id: g.id }; });
    if (!goal) return { ok: false, info: 'no goal' };
    for (const p of [B, Dp]) await p.evaluate(g => { HH.G.y -= 40; }, goal);    // only Cai is anywhere near it
    await feed(Cp, goal.nid, 6000);
    let ok = true; for (const p of ALL) ok = await until(p, b => HH.G.st.beat > b, 6000, goal.beat) && ok;
    const beats = await all(() => HH.G.st.beat);
    return { ok: ok && beats.every(b => b === beats[0]), info: { ate: goal.id, beats } };
  });
  await T('team size (Part 5): only the HOST eats, and every guest\'s hole grows by the same steps and parks at the same cap', async () => {
    const hd = await A.evaluate(() => { HH.setHoleD(HH.G.C.sizes[2]); HH.G.paused = true; return HH.holeD(); });      // a small team, under the next objective (held still till all have it)
    for (const g of GUESTS) await until(g, d => Math.abs(HH.holeD() - d) < d * 1e-6, 8000, hd);
    const d0 = await all(() => HH.holeD());
    await A.evaluate(() => { HH.G.paused = false; });
    const ate = await A.evaluate(() => { const G = HH.G, D = HH.holeD(); let n = 0;
      for (const o of G.vis) if (n < 6 && !o.dead && !o.fall && !o.coin && !o.tile && !o.tgt && o.fw < D * 0.6 && HH.canEat(o)) { HH.eat(o); n++; }
      return { n, D: HH.holeD() }; });
    await A.evaluate(() => { HH.G.paused = true; });        // hold the host's world still (its hole would keep eating) while every iPad is read
    await sleep(1200); for (const g of GUESTS) await until(g, d => Math.abs(HH.holeD() - d) < d * 1e-6, 8000, ate.D);
    const grown = await all(() => HH.holeD()), hostSees = await A.evaluate(() => HH.G.mates.map(M => HH.asMate(HH.holeD, M)));
    await A.evaluate(() => { HH.G.paused = false; });
    const same1 = grown.every(d => Math.abs(d - grown[0]) < grown[0] * 1e-6) && hostSees.every(d => Math.abs(d - grown[0]) < grown[0] * 1e-6);
    const hp = await A.evaluate(() => { HH.addXP(1e12); return HH.holeD(); });
    for (const g of GUESTS) await until(g, d => Math.abs(HH.holeD() - d) < d * 1e-6, 8000, hp);   // (wait for the state message, not a fixed 800 ms: a throttled page reads its mail late)
    const parked = await all(() => ({ D: HH.holeD(), cap: HH.capD() }));
    const same2 = parked.every(p => Math.abs(p.D - parked[0].D) < parked[0].D * 1e-6 && p.D <= p.cap * 1.0001) && Math.abs(parked[0].D - parked[0].cap) < parked[0].cap * 1e-3;
    return { ok: ate.n > 0 && grown[0] > d0[0] * 1.0001 && d0.every(d => Math.abs(d - d0[0]) < d0[0] * 1e-6) && same1 && same2, info: { ate, before: d0, grown, hostSees, parked } };
  });
  await T('team size (Part 5), reversed: a GUEST eats and the host (and the other guests) grow with it', async () => {
    const hd = await A.evaluate(() => { HH.setHoleD(HH.G.C.sizes[2]); HH.G.paused = true; return HH.holeD(); });
    for (const g of GUESTS) await until(g, d => Math.abs(HH.holeD() - d) < d * 1e-6, 8000, hd);
    const d0 = await all(() => HH.holeD());
    await A.evaluate(() => { HH.G.paused = false; });
    const bp = await B.evaluate(() => [HH.G.x, HH.G.y]); let n = 0; const skip = [];
    for (let i = 0; i < 4; i++) { const s = await snack(bp[0], bp[1], skip); if (!s) break; skip.push(s.nid); if (await feed(B, s.nid, 6000)) n++; }
    await sleep(800);
    const hd1 = await A.evaluate(() => HH.holeD()); for (const g of GUESTS) await until(g, d => Math.abs(HH.holeD() - d) < d * 1e-6, 8000, hd1);
    const d1 = await all(() => HH.holeD());
    return { ok: n > 0 && d1[0] > d0[0] * 1.0001 && d1.every(d => Math.abs(d - d1[0]) < d1[0] * 1e-6), info: { guestAte: n, before: d0, after: d1 } };
  });
  await T('open world (Part 4): no zone rings for anyone; a guest drives straight out through the solo ring and on to a far corner, fully rendered and populated there', async () => {
    const rings = await all(() => HH.ringNow());
    // the far corner: the small authored thing furthest from the start (so the spot is real ground, not the scenery past the border)
    const r0 = await A.evaluate(() => HH.G.C.rings.filter(Boolean)[0]), far = await A.evaluate(() => { const G = HH.G, s = G.C.storyStart || G.C.start;
      const o = G.auth.filter(o => !o.deco && !o.path && o.fw < 1.5 && !(o.T && o.T.mv)).sort((a, b) => Math.hypot(b.x - s[0], b.y - s[1]) - Math.hypot(a.x - s[0], a.y - s[1]))[0]; return [o.x + o.fw, o.y + o.fw, Math.round(Math.hypot(o.x - s[0], o.y - s[1]))]; });
    // drive (a real joystick, real frames) across the first ring's east edge, where solo Story would stop it
    await B.evaluate(r => { const G = HH.G; G.x = r[2] - HH.holeD() * 2; G.y = (r[1] + r[3]) / 2; G.vx = G.vy = 0; G.joy = { x0: 300, y0: 300, x: 420, y: 300 }; }, r0);
    const crossed = await until(B, r => HH.G.x > r[2] + HH.holeD() * 2, 20000, r0);   // (frames, not seconds, move a hole: a throttled page needs longer)
    await B.evaluate(() => { HH.G.joy = null; });
    // and on to the far corner of the world's playable area
    for (let i = 0; i < 15; i++) { await B.evaluate(f => { HH.G.x = f[0]; HH.G.y = f[1]; HH.G.vx = HH.G.vy = 0; }, far); await sleep(100); }
    await sleep(1500);
    await until(B, f => { const G = HH.G; G.x = f[0]; G.y = f[1]; G.vx = G.vy = 0; return Math.hypot(G.cam.x - G.x, G.cam.y - G.y) < HH.holeD() * 5; }, 10000, far);   // (the camera eases over by frames)
    const there = await B.evaluate(f => { const G = HH.G, rg = HH.V3.reg; const near = G.vis.filter(o => !o.dead && !o.deco && Math.hypot(o.x - G.x, o.y - G.y) < HH.holeD() * 40);
      return { at: Math.hypot(G.x - f[0], G.y - f[1]) < 1, d: Math.hypot(G.x - f[0], G.y - f[1]), things: near.length, ground: !!rg && rg.n === G.C.n && rg.x0 < G.x + HH.holeD() * 25 && rg.x0 + rg.w > G.x - HH.holeD() * 25 && rg.y0 < G.y + HH.holeD() * 25 && rg.y0 + rg.h > G.y - HH.holeD() * 25 && Math.hypot(G.cam.x - G.x, G.cam.y - G.y) < HH.holeD() * 25, D: HH.holeD(), reg: rg && [rg.n, rg.x0, rg.y0, rg.w, rg.h].map(v => +(+v).toFixed(1)), cam: [G.cam.x, G.cam.y] }; }, far);
    const hostSees = await A.evaluate(f => { const M = HH.G.mates.find(M => M.id === 1); return M ? Math.hypot(M.x - f[0], M.y - f[1]) : -1; }, far);
    await B.evaluate(() => { const G = HH.G; G.x = G.C.storyStart ? G.C.storyStart[0] : G.C.start[0]; G.y = G.C.storyStart ? G.C.storyStart[1] : G.C.start[1]; });
    return { ok: rings.every(r => r === null) && crossed && there.at && there.things >= 10 && there.ground && hostSees >= 0 && hostSees < 2, info: { rings, crossed, far, there, hostSees } };
  });
  await T('Upgrades never pause multiplayer (Part 3): a guest on Upgrades leaves the host\'s world running and eating; then the host on Upgrades leaves the guests playing and eating', async () => {
    await A.evaluate(() => HH.setHoleD(HH.G.C.sizes[3])); await sleep(300);
    await B.evaluate(() => document.getElementById('b-up-hud').click());
    const bOn = await B.evaluate(() => ({ up: document.getElementById('s-upgrades').classList.contains('on'), live: !!HH.G.upLive, paused: !!HH.G.paused }));
    await sleep(600);
    const sig = () => ({ t: HH.G.t, mv: HH.G.movers.slice(0, 40).map(o => o.x.toFixed(3) + ',' + o.y.toFixed(3)).join(';'), np: HH.G.netPause });
    const a0 = await A.evaluate(sig); await sleep(1200); const a1 = await A.evaluate(sig);
    const hostRuns = a1.t > a0.t + 0.1 && (a1.mv !== a0.mv || !a0.mv) && !a1.np;      // (G.t steps at most 50 ms a frame: four SwiftShader pages draw slowly)
    const othersRun = (await Promise.all([Cp, Dp].map(p => p.evaluate(() => !HH.G.netPause)))).every(Boolean);
    const ap = await A.evaluate(() => [HH.G.x, HH.G.y]), s1 = await snack(ap[0], ap[1]); const hostAte = s1 ? await feed(A, s1.nid, 8000) : false;
    await B.evaluate(() => document.querySelector('#s-upgrades [data-back]').click());
    await A.evaluate(() => document.getElementById('b-up-hud').click()); await sleep(600);
    const aOn = await A.evaluate(() => ({ up: document.getElementById('s-upgrades').classList.contains('on'), live: !!HH.G.upLive, paused: !!HH.G.paused }));
    const g0 = await Cp.evaluate(sig); await sleep(1200); const g1 = await Cp.evaluate(sig);
    const guestRuns = g1.t > g0.t + 0.1 && !g1.np;
    const cp = await Cp.evaluate(() => [HH.G.x, HH.G.y]), s2 = await snack(cp[0], cp[1]); const guestAte = s2 ? await feed(Cp, s2.nid, 8000) : false;
    await A.evaluate(() => document.querySelector('#s-upgrades [data-back]').click()); await sleep(300);
    const back = await all(() => HH.G.mode === 'play' && !HH.G.paused && !HH.G.netPause);
    return { ok: bOn.up && bOn.live && !bOn.paused && hostRuns && othersRun && hostAte && aOn.up && aOn.live && !aOn.paused && guestRuns && guestAte && back.every(Boolean), info: { bOn, a0: { t: a0.t, np: a0.np, mv: a0.mv.length }, a1: { t: a1.t, np: a1.np, same: a1.mv === a0.mv }, hostRuns, othersRun, hostAte, aOn, guestRuns, guestAte, back } };
  });
  await T('FOUR players (Part 1): one guest drops mid-session; the other three play on together and the one who left keeps their coins', async () => {
    const dSave0 = await Dp.evaluate(() => ({ w: HH.S.ch[2].w, banked: HH.net.banked, beat: JSON.parse(localStorage.getItem('hungry-hole-data-v1')).ch[2].beat }));
    await Dp.evaluate(() => HH.UI.show('main'));
    const hostOn = await until(A, () => HH.net && HH.net.peers.length === 2, 8000);
    let ok = hostOn; for (const p of [A, B, Cp]) ok = await until(p, () => HH.G.mates.filter(M => !M.gone).length === 2, 6000) && ok;
    const dSave1 = await Dp.evaluate(() => ({ net: !!HH.net, w: HH.S.ch[2].w, disk: JSON.parse(localStorage.getItem('hungry-hole-data-v1')).ch[2], other: localStorage.getItem('family-other-app') }));
    const bp = await B.evaluate(() => [HH.G.x, HH.G.y]), s = await snack(bp[0], bp[1]); const ate = s ? await feed(B, s.nid, 8000) : false;
    const h0 = await A.evaluate(() => HH.setHash(HH.net.dead)); for (const p of [B, Cp]) await until(p, h => HH.setHash(HH.net.dead) === h, 4000, h0);
    const hashes = await Promise.all([A, B, Cp].map(p => p.evaluate(() => HH.setHash(HH.net.dead))));
    const kept = !dSave1.net && dSave1.w === dSave0.w && dSave1.disk.w === dSave0.w && dSave1.disk.beat === dSave0.beat && dSave1.other === 'keep-me';
    return { ok: ok && ate && hashes.every(h => h === hashes[0]) && kept, info: { hostOn, ate, hashes, dSave0, dSave1: { net: dSave1.net, w: dSave1.w, beat: dSave1.disk.beat } } };
  });
  await leave4();

  await T('I SPY with four (Parts 2 + 6): one hand, one size for all four holes; a guest who drops early gets no win; the team\'s finish writes the win on EVERY remaining save and pays each wallet once', async () => {
    const w0 = await all(() => ({ wins: (HH.S.ispy[2] && HH.S.ispy[2].wins) || 0, w: HH.S.ch[2].w }));
    const { ok } = await connect4(2, 'ispy');
    await until(Dp, () => HH.G.run.tg && HH.G.run.tg.length > 0 && HH.G.run.tg.every(t => t.o), 4000);
    await sleep(600);
    const sizes = await all(() => HH.holeD()), setD = await A.evaluate(() => HH.G.run.setD), tiers = await A.evaluate(() => HH.G.run.tg.map(t => HH.tierOf(HH.G.C, t.o.fw)));
    const oneSize = sizes.every(d => Math.abs(d - setD) < setD * 1e-6) && tiers.every(t => t === tiers[0]);
    await Dp.evaluate(() => HH.UI.show('main')); await until(A, () => HH.net && HH.net.peers.length === 2, 6000);   // Dot leaves before the finish
    const tg = await A.evaluate(() => HH.G.run.tg.filter(t => !t.done).map(t => t.o.nid));
    const who = [B, Cp, A]; let found = 0;
    for (let i = 0; i < tg.length; i++) if (await feed(who[i % 3], tg[i], 8000)) found++;
    const done = await until(A, () => HH.G.run.tg.every(t => t.done), 4000);
    await sleep(2200); for (const [i, g] of [B, Cp].entries()) await until(g, w => ((HH.S.ispy[2] && HH.S.ispy[2].wins) || 0) > w, 8000, w0[i + 1].wins);   // (the win message, however late it arrives)
    const wins1 = await all(() => ({ wins: (HH.S.ispy[2] && HH.S.ispy[2].wins) || 0, w: HH.S.ch[2].w, disk: (JSON.parse(localStorage.getItem('hungry-hole-data-v1')).ispy[2] || {}).wins || 0 }));
    // the wire repeating the win message changes nothing
    await B.evaluate(() => HH.net && HH.net.recv({ t: 'win', k: 'ispy', bonus: 1, h: [...(HH.net.wonH || [])][0] }));
    await sleep(300); const bAgain = await B.evaluate(() => HH.S.ispy[2].wins);
    const bonus = await A.evaluate(() => Math.round(150 * HH.G.C.cost));
    const each = [0, 1, 2].every(i => wins1[i].wins === w0[i].wins + 1 && wins1[i].disk === wins1[i].wins && wins1[i].w - w0[i].w >= bonus);
    const dot = wins1[3].wins === w0[3].wins;
    await leave4();
    return { ok: ok && oneSize && done && each && dot && bAgain === wins1[1].wins, info: { ok, sizes, setD, tiers, found, of: tg.length, before: w0, after: wins1, bonus, bAgain } };
  });

  await T('EDUCATIONAL with four (Part 7): every hole at the set\'s one size, which never moves', async () => {
    const { ok } = await connect4(2, 'edu');
    await until(Dp, () => HH.G.run.steps && HH.G.run.steps.length > 0, 4000); await sleep(600);
    const s0 = await all(() => HH.holeD()), setD = await A.evaluate(() => HH.G.run.setD);
    await A.evaluate(() => { HH.addXP(1e9); HH.G.mates.forEach(M => HH.asMate(() => HH.addXP(1e9), M)); }); await sleep(600);
    const s1 = await all(() => HH.holeD()), ctl = await all(() => getComputedStyle(document.getElementById('b-bigger')).display === 'none' && getComputedStyle(document.getElementById('b-faster')).display !== 'none');
    await leave4();
    return { ok: ok && s0.every(d => Math.abs(d - setD) < setD * 1e-6) && s1.every(d => Math.abs(d - setD) < setD * 1e-6) && ctl.every(Boolean), info: { ok, setD, s0, s1, ctl } };
  });
  for (const w of ['C', 'D']) { await pages[w].close(); delete pages[w]; await ctxs[w].close(); }

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
  console.log(`wire: ${lat.n} messages, queue wait avg ${(lat.sum / Math.max(1, lat.n)).toFixed(0)} ms, max ${lat.max} ms`);
  await b.close();
  process.exit(pass === results.length && !filt.length ? 0 : 1);
})();
