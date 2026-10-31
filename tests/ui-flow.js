// Clicks through every screen and button like a player; fails on any console error. node tests/ui-flow.js
// v5: the title is a strip of four modes (STORY / I SPY / EDUCATIONAL / EXPLORATION) + a small SETTINGS button; every mode opens a world pick.
const { chromium } = require('playwright');
const URL = process.env.HH_URL || 'http://localhost:8765/index.html';
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1180, height: 820 } });
  const errs = [], steps = []; p.on('pageerror', e => errs.push('PAGEERR ' + e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await p.goto(URL); await p.waitForTimeout(400);
  const click = async (sel, wait = 250) => { const el = await p.$(sel); if (!el || !(await el.isVisible())) { steps.push('MISSING ' + sel); return false; } try { await el.click({ timeout: 3000 }); } catch (e) { steps.push('BLOCKED ' + sel + ' modal=' + (await p.evaluate(() => document.getElementById('mbox').innerText.slice(0, 60)))); return false; } await p.waitForTimeout(wait); steps.push(sel); return true; };
  const screen = () => p.evaluate(() => [...document.querySelectorAll('.screen')].filter(s => getComputedStyle(s).display !== 'none').map(s => s.id).join(',') || HH.G.mode);
  const title = await p.evaluate(() => ({ modes: [...document.querySelectorAll('#s-main .strip .mbtn')].map(b => b.textContent.trim()).join('/'), noOld: !document.getElementById('b-upgrades') && !document.getElementById('b-chapters') }));
  await click('#b-start', 400); const pickTitle = await p.evaluate(() => document.getElementById('chap-title').textContent + ' x' + document.querySelectorAll('#chap-cards .ccard').length);
  await click('[data-play="1"]', 600); const s1 = await p.evaluate(() => HH.G.mode);
  await p.mouse.move(590, 400); await p.mouse.down(); await p.mouse.move(900, 300, { steps: 20 }); await p.waitForTimeout(600); await p.mouse.up();
  const moved = await p.evaluate(() => Math.round(HH.G.x) !== 420);
  await click('#b-pause'); await click('#p-res'); await click('#b-pause'); await click('#p-board'); await click('#board-back');
  await click('#p-res'); await click('#b-pause'); await click('#p-restart', 100); await click('#p-restart', 500); await click('#b-pause'); await click('#p-snd'); await click('#p-snd'); await click('#p-menu', 400);
  const atMain = await screen();
  // auto-pause when the tab hides
  await click('#b-start', 300); await click('[data-play="1"]', 600); await p.evaluate(() => { Object.defineProperty(document, 'hidden', { value: true, configurable: true }); document.dispatchEvent(new Event('visibilitychange')); });
  const autoPaused = await p.evaluate(() => HH.G.paused); await p.evaluate(() => { delete document.hidden; }); await click('#p-menu', 400);
  await click('#b-start', 300); await click('[data-board="1"]'); await click('#board-back'); await click('#s-chapters [data-back]');
  // every other mode opens a world pick too, with all five worlds playable in I Spy / Educational / Exploration (Story opens them in order)
  const modes = {};
  for (const [btn, kind] of [['#b-ispy', 'ispy'], ['#b-edu', 'edu'], ['#b-explore', 'explore']]) {
    await click(btn, 300); const open = await p.evaluate(() => document.querySelectorAll('#chap-cards [data-play]').length);
    await click('[data-play="' + (kind === 'ispy' ? 1 : 5) + '"]', 700); modes[kind] = [open, await p.evaluate(() => HH.G.run.kind + '@' + HH.G.C.n)];
    await click('#b-pause'); await click('#p-menu', 400);
  }
  // upgrades live on the in-game HUD now (no menu button)
  await click('#b-start', 300); await click('[data-play="1"]', 600); await p.evaluate(() => { HH.S.ch[1].w = 500; HH.S.ch[2].u = 1; }); await click('#b-up-hud', 300);
  await click('[data-up="2"]'); await click('#b-buy'); const bought = await p.evaluate(() => HH.S.ch[1].up[2]);
  await click('#b-banker'); await click('#bk-go', 900); const wallets = await p.evaluate(() => [HH.S.ch[1].w, HH.S.ch[2].w]); await click('#bk-close');
  await p.evaluate(() => HH.UI.main()); await click('#b-settings');
  const nSeg = (await p.$$('#s-settings .seg button')).length;
  for (let i = 0; i < nSeg; i++) { await (await p.$$('#s-settings .seg button'))[i].click(); await p.waitForTimeout(40); }
  const learnReport = await p.evaluate(() => document.getElementById('s-settings').innerText.includes('Math'));
  await click('#b-export'); const code = await p.evaluate(() => (document.querySelector('#t-code') || {}).value || '');
  if (code) { await p.fill('#t-code', code); await click('#b-import'); await click('#m-yes', 300); }
  await click('#b-rch'); await click('#b-rch');
  await p.evaluate(() => HH.UI.main());
  // finale + credits
  await p.evaluate(() => { HH.S.ch[5].u = 1; HH.startChapter(5); const C = HH.G.C; C.finish(true); HH.G.now = performance.now(); });
  await p.waitForTimeout(3000); const credits = await screen(); await p.evaluate(() => document.getElementById('cr-done').click()); await p.waitForTimeout(300);
  const journey = await p.evaluate(() => HH.S.journey);
  console.log(JSON.stringify({ title, pickTitle, modes, startMode: s1, moved, atMain, autoPaused, bought, walletsAfterBanker: wallets, exportCodeLen: code.length, segButtons: nSeg, learnReport, credits, afterCredits: await screen(), journey }));
  console.log('problems:', steps.filter(s => /^(MISSING|BLOCKED)/.test(s)));
  console.log('console errors:', errs.length, errs.slice(0, 5)); await b.close(); process.exit(errs.length ? 1 : 0);
})();
