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
    const { G } = HH; let n = 0, t0 = performance.now(), worst = 0, last = t0; const rp0 = HH.V3.repaints || 0;
    const f = now => { n++; worst = Math.max(worst, now - last); last = now;
      const a = (now - t0) / 1600; G.joy = { id: 1, x0: 640, y0: 360, x: 640 + Math.cos(a) * 120, y: 360 + Math.sin(a) * 120 };   // keep steering in a loop (floating joystick)
      if (now - t0 < 10000) requestAnimationFrame(f); else { G.joy = null; res({ fps: n / ((now - t0) / 1000), worstMs: worst, repaints: (HH.V3.repaints || 0) - rp0, pr: HH.V3.ren.getPixelRatio(), vis: G.vis.length, lvl: G.lvl, gl: HH.V3.ren.getContext().getParameter(HH.V3.ren.getContext().RENDERER) }); } };
    requestAnimationFrame(f); }));
  // the CPU side on its own (game logic + building the frame), without waiting for the GPU
  const cpu = await p.evaluate(() => { const { G } = HH; const t = performance.now(); for (let i = 0; i < 60; i++) { G.now += 33; G.t += 1 / 30; HH.update(1 / 30); HH.render(); } return (performance.now() - t) / 60; });
  console.log(`CPU per frame (update + scene build, no GPU wait): ${cpu.toFixed(1)} ms`);
  console.log(`PERF Ch3 downtown size ${r.lvl}: avg ${r.fps.toFixed(1)} fps over 10 s, worst frame ${r.worstMs.toFixed(0)} ms, ${r.vis} objects near the camera, ${r.repaints} ground repaints, final pixel ratio ${r.pr.toFixed(2)} (${r.gl})`);
  console.log(r.fps >= 50 ? 'PASS perf >= 50 fps' : 'BELOW TARGET (< 50 fps)', '; console errors:', errs.length, errs.slice(0, 3));
  await b.close(); process.exit(r.fps >= 50 && !errs.length ? 0 : 1);
})();
