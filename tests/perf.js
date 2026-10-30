// Perf probe: average fps over 10 s in Ch3 downtown at mid size, 1180x820, hole steered in a circle.
// node tests/perf.js   (target >= 50 fps in headless Chromium; prints the number for DECISIONS.md)
const { chromium } = require('playwright');
const URL = process.env.HH_URL || 'http://localhost:8765/index.html';
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const p = await b.newPage({ viewport: { width: 1180, height: 820 } }); const errs = [];
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await p.goto(URL); await p.waitForTimeout(500);
  await p.evaluate(() => { const { G, S } = HH; S.ch[3].u = 1; S.settings.sound = 0; HH.startChapter(3);
    const o = G.auth.find(o => o.label === 'Canada Place'); G.x = o.x; G.y = o.y + 120; G.lvl = 4; G.xp = HH.need(4) / 2;
    G.cam.x = G.x; G.cam.y = G.y; });
  await p.waitForTimeout(1500);
  const r = await p.evaluate(() => new Promise(res => {
    const { G } = HH; let n = 0, t0 = performance.now(), worst = 0, last = t0;
    const f = now => { n++; worst = Math.max(worst, now - last); last = now;
      const a = (now - t0) / 1600; G.ptr = [590 + Math.cos(a) * 260, 410 + Math.sin(a) * 200];   // keep steering in a loop
      if (now - t0 < 10000) requestAnimationFrame(f); else { G.ptr = null; res({ fps: n / ((now - t0) / 1000), worstMs: worst, vis: G.vis.length, lvl: G.lvl, gl: HH.V3.ren.getContext().getParameter(HH.V3.ren.getContext().RENDERER) }); } };
    requestAnimationFrame(f); }));
  console.log(`PERF Ch3 downtown size ${r.lvl}: avg ${r.fps.toFixed(1)} fps over 10 s, worst frame ${r.worstMs.toFixed(0)} ms, ${r.vis} objects near the camera (${r.gl})`);
  console.log(r.fps >= 50 ? 'PASS perf >= 50 fps' : 'BELOW TARGET (< 50 fps)', '; console errors:', errs.length, errs.slice(0, 3));
  await b.close(); process.exit(r.fps >= 50 && !errs.length ? 0 : 1);
})();
