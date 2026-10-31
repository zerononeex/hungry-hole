// Audio suite (v4.1; v5: five worlds, every mode opens a world pick first). Chromium is launched with NO autoplay-policy flags, so the browser blocks sound until a real tap,
// the same rule the owner's iPhone applies. Checks: music starts from the first tap and really plays (WebAudio, via
// HH.debugAudio), switches with chapter/menu, the MUSIC toggle drives the gain; every SFX file decodes; and the game
// never speaks (zero speechSynthesis use across scripted Story, I Spy and Educational runs). node tests/audio.js
const { chromium } = require('playwright');
const URL = process.env.HH_URL || 'http://localhost:8765/index.html';
(async () => {
  const b = await chromium.launch();                                   // no --autoplay-policy bypass on purpose
  const p = await b.newPage({ viewport: { width: 1180, height: 820 } });
  const errs = []; p.on('pageerror', e => errs.push('PAGEERR ' + e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  // count every way the page could reach text-to-speech
  await p.addInitScript(() => {
    const n = window.__speech = { speak: 0, utter: 0, touch: 0 };
    const ss = window.speechSynthesis;
    if (ss) { ss.speak = () => { n.speak++; }; Object.defineProperty(window, 'speechSynthesis', { configurable: true, get() { n.touch++; return ss; } }); }
    const U = window.SpeechSynthesisUtterance; window.SpeechSynthesisUtterance = function (...a) { n.utter++; return U ? new U(...a) : {}; };
  });
  await p.goto(URL); await p.waitForTimeout(500);
  const results = [], dbg = () => p.evaluate(() => HH.debugAudio());
  const waitTrack = async (want, ms = 8000) => { let d; for (let t = 0; t < ms; t += 200) { d = await dbg(); if (d.track === want && d.playing && d.level > 0) return d; await p.waitForTimeout(200); } return d; };

  const before = await dbg();
  results.push(['silent before the first tap (no gesture yet)', !before.playing && before.track === null, before]);

  await p.click('#b-start');                                           // the real tap: STORY opens the world pick (menu music)
  const pick = await waitTrack('menu.mp3');
  await p.click('[data-play="1"]');                                    // second real tap: World 1
  const story = await waitTrack('ch1.mp3');
  results.push(['first tap starts music (world pick: menu.mp3), World 1 tap: ch1.mp3 through WebAudio, context running', pick.track === 'menu.mp3' && pick.playing && story.track === 'ch1.mp3' && story.playing && story.ctxState === 'running' && Math.abs(story.gainValue - 0.55) < 1e-6 && story.level > 0, story]);

  await p.evaluate(() => HH.UI.main());
  const menu = await waitTrack('menu.mp3');
  results.push(['back on the menu: menu.mp3 plays', menu.track === 'menu.mp3' && menu.playing && menu.level > 0, menu]);

  // v5 music per world (DECISIONS.md): the files stay as-is; ch2.mp3 and ch7.mp3 belonged to the retired worlds
  const MUS = { 1: 'ch1.mp3', 2: 'ch3.mp3', 3: 'ch4.mp3', 4: 'ch6.mp3', 5: 'ch5.mp3' }, chs = {};
  for (let n = 1; n <= 5; n++) { await p.evaluate(n => { HH.S.ch[n].u = 1; HH.startChapter(n); }, n); const d = await waitTrack(MUS[n]); chs[n] = d.track === MUS[n] && d.playing && d.level > 0; }
  results.push(['world changes: each of the five worlds plays its own track', Object.values(chs).every(Boolean), chs]);

  await p.evaluate(() => { HH.S.settings.music = 0; HH.syncMusic && HH.syncMusic(); }); await p.waitForTimeout(400);
  const off = await dbg();
  await p.evaluate(() => { HH.S.settings.music = 1; }); await p.waitForTimeout(400);
  const on = await dbg();
  results.push(['MUSIC toggle drives the gain (0 off, 0.55 on)', off.gainValue === 0 && Math.abs(on.gainValue - 0.55) < 1e-6 && on.playing, { off: off.gainValue, on: on.gainValue }]);

  const sfx = await p.evaluate(async () => { for (let i = 0; i < 40 && !HH.debugAudio().sfx; i++) await new Promise(r => setTimeout(r, 200)); return HH.debugAudio(); });
  results.push(['every listed sfx file decodes into a buffer', sfx.sfx >= sfx.sfxListed && sfx.sfxListed > 0 && !sfx.bad.length, { decoded: sfx.sfx, listed: sfx.sfxListed, bad: sfx.bad }]);

  // scripted runs: Story eats and quests, I Spy all five targets, Educational every step of several sets (sums included)
  const runs = await p.evaluate(async () => {
    const { G, S } = HH, wait = ms => new Promise(r => setTimeout(r, ms)), out = {};
    const step = k => { for (let i = 0; i < k; i++) { G.now += 33; G.t += 1 / 30; HH.update(1 / 30); } };
    for (let n = 1; n <= 5; n++) S.ch[n].u = 1;
    HH.startChapter(1); G.lvl = 4; step(5); let e = 0; for (const o of G.vis.slice()) if (!o.dead && HH.canEat(o) && e < 40) { HH.eat(o); e++; } step(30); out.storyEaten = e;
    for (const n of [2, 4]) { HH.startChapter(n, 'ispy'); G.run.tg.forEach(t => t.o && HH.eat(t.o)); await wait(1300); HH.UI.closeModal && HH.UI.closeModal(); }
    out.ispy = 'ch2+ch4';
    let steps = 0;
    for (const n of [1, 5]) for (let s = 0; s < 3; s++) {
      S.edu[n] = { set: s, done: 0 }; HH.startChapter(n, 'edu'); step(2); const R = G.run;
      for (let g = 0; g < 12 && R.si < R.steps.length; g++) {
        const st = R.steps[R.si], si = R.si;
        if (st.k === 'm') { const right = G.tiles.find(t => t.owner === st.owner && t.ok && !t.dead); if (right) HH.eat(right); }
        else st.t.forEach(t => t.o && !t.done && HH.eat(t.o));
        steps++; await wait(1000); if (R.si === si) break;
      }
      await wait(800); HH.UI.closeModal && HH.UI.closeModal();
    }
    out.eduSteps = steps; return out;
  });
  const speech = await p.evaluate(() => window.__speech);
  results.push(['scripted Story + I Spy + Educational runs: ZERO speechSynthesis calls', speech.speak === 0 && speech.utter === 0 && speech.touch === 0 && runs.eduSteps >= 6, { speech, runs }]);

  await p.evaluate(() => HH.UI.settings('main')); await p.waitForTimeout(300);
  const settingsTxt = await p.evaluate(() => document.getElementById('s-settings').innerText);
  results.push(['Settings has no Voice option', !/voice/i.test(settingsTxt) && /music/i.test(settingsTxt), settingsTxt.replace(/\s+/g, ' ').slice(0, 120)]);

  let pass = 0; for (const [n, ok, info] of results) { if (ok) pass++; console.log((ok ? 'PASS ' : 'FAIL ') + n + '  ' + JSON.stringify(info)); }
  console.log(`${pass}/${results.length} passed; console errors: ${errs.length}`, errs.slice(0, 5));
  await b.close(); process.exit(pass === results.length && !errs.length ? 0 : 1);
})();
