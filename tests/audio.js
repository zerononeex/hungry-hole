// Audio wiring check: every file in audio/manifest.js is served, decodes, and plays in its slot
// (menu + each chapter's loop + the 5 SFX), with zero console errors. node tests/audio.js
const { chromium } = require('playwright');
const URL = process.env.HH_URL || 'http://localhost:8765/index.html';
(async () => {
  const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] }); const p = await b.newPage({ viewport: { width: 1180, height: 820 } });
  const errs = [], got = new Map(); p.on('pageerror', e => errs.push('PAGEERR ' + e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  p.on('response', r => { const m = r.url().match(/audio\/([\w-]+\.mp3)/); if (m) got.set(m[1], r.status()); });
  await p.goto(URL); await p.waitForTimeout(400); await p.mouse.click(600, 400); await p.waitForTimeout(300);
  const list = await p.evaluate(() => window.HH_AUDIO.slice());
  const res = [];
  const music = async (name, fn) => { await p.evaluate(fn); await p.waitForTimeout(1500);
    const r = await p.evaluate(() => { const M = HH.MUSIC; return [M.name, !!M.el && !M.el.paused, M.el ? M.el.readyState : -1, M.el ? +M.el.duration.toFixed(1) : 0]; }); res.push([name, ...r]); };
  await music('menu.mp3', () => { HH.G.gestured = true; HH.S.settings.music = 1; HH.UI.main(); });
  for (let n = 1; n <= 7; n++) await music('ch' + n + '.mp3', `(() => { for (let i = 1; i <= 7; i++) HH.S.ch[i].u = 1; HH.startChapter(${n}); })()`);
  // decode every SFX in the page (proves the files are real audio the browser accepts)
  const sfx = await p.evaluate(async (list) => { const out = {}; for (const f of list.filter(f => f.startsWith('sfx-'))) { const a = new Audio('audio/' + f); try { await a.play(); out[f] = +a.duration.toFixed(2); a.pause(); } catch (e) { out[f] = 'ERR ' + e.message; } } return out; }, list);
  await p.evaluate(() => { const s = HH.SFX2; s.found(); s.win(); s.correct(); s.ping(); s.sized(); }); await p.waitForTimeout(800);
  let ok = true;
  for (const [want, name, playing, ready, dur] of res) { const pass = name === want && playing && ready >= 2 && dur > 60; ok = ok && pass; console.log(`${pass ? 'PASS' : 'FAIL'} music ${want}: playing=${playing} duration=${dur}s`); }
  for (const [f, d] of Object.entries(sfx)) { const pass = typeof d === 'number' && d > 0.2 && d < 6; ok = ok && pass; console.log(`${pass ? 'PASS' : 'FAIL'} sfx ${f}: ${d}s`); }
  const bad = list.filter(f => got.has(f) && got.get(f) >= 400), unrequested = list.filter(f => !got.has(f));
  if (bad.length) { ok = false; console.log('HTTP errors:', bad); } if (unrequested.length) console.log('never requested:', unrequested);
  console.log(`manifest ${list.length} files; console errors: ${errs.length}`, errs.slice(0, 3)); ok = ok && !errs.length;
  await b.close(); process.exit(ok ? 0 : 1);
})();
