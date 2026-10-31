// Perf probe (v5): average fps over 6 s in the heaviest spot of each big world at 1180x820, hole steered in a circle:
// Vancouver downtown by Canada Place, Stanley Park's West End streets, and the Globe's Vancouver street start.
// node tests/perf.js   (target >= 50 fps in headless Chromium; prints the numbers for DECISIONS.md)
const { chromium } = require('playwright');
const URL = process.env.HH_URL || 'http://localhost:8765/index.html';
const SPOTS = [
  ['W2 Vancouver downtown', `const { G, S } = HH; S.ch[2].u = 1; HH.startChapter(2, 'explore'); const o = G.auth.find(o => o.id === 'canadaplace'); G.x = o.x; G.y = o.y + 120; HH.setHoleD(6);`],
  ['W3 Stanley Park West End', `const { G, S } = HH; S.ch[3].u = 1; HH.startChapter(3, 'explore'); const p = G.C.P(-123.1395, 49.2885); G.x = p[0]; G.y = p[1]; HH.setHoleD(4);`],
  ['W5 Globe street start', `const { G, S } = HH; S.ch[5].u = 1; HH.startChapter(5, 'explore'); G.x = G.C.start[0]; G.y = G.C.start[1]; HH.setHoleD(.05);`],
];
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const p = await b.newPage({ viewport: { width: 1180, height: 820 } }); const errs = [];
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await p.goto(URL); await p.waitForTimeout(500);
  let ok = true;
  for (const [name, setup] of SPOTS) {
    await p.evaluate(new Function(`HH.S.settings.sound = 0; ${setup} HH.G.cam.x = HH.G.x; HH.G.cam.y = HH.G.y;`));
    await p.waitForTimeout(5000);                     // first visit builds the world's map caches; let it settle
    const r = await p.evaluate(() => new Promise(res => {
      const { G } = HH; let n = 0, t0 = performance.now(), worst = 0, last = t0; const rp0 = HH.V3.repaints || 0;
      const f = now => { n++; worst = Math.max(worst, now - last); last = now;
        const a = (now - t0) / 1600; G.joy = { id: 1, x0: 640, y0: 360, x: 640 + Math.cos(a) * 120, y: 360 + Math.sin(a) * 120 };   // keep steering in a loop (floating joystick)
        if (now - t0 < 6000) requestAnimationFrame(f); else { G.joy = null; res({ fps: n / ((now - t0) / 1000), worstMs: worst, repaints: (HH.V3.repaints || 0) - rp0, pr: HH.V3.ren.getPixelRatio(), vis: G.vis.length }); } };
      requestAnimationFrame(f); }));
    // the CPU side on its own (game logic + building the frame), without waiting for the GPU
    const cpu = await p.evaluate(() => { const { G } = HH; const t = performance.now(); for (let i = 0; i < 60; i++) { G.now += 33; G.t += 1 / 30; HH.update(1 / 30); HH.render(); } return (performance.now() - t) / 60; });
    console.log(`PERF ${name}: avg ${r.fps.toFixed(1)} fps, worst frame ${r.worstMs.toFixed(0)} ms, CPU ${cpu.toFixed(1)} ms/frame, ${r.vis} objects near the camera, ${r.repaints} ground repaints, pixel ratio ${r.pr.toFixed(2)}`);
    if (r.fps < 50) ok = false;
  }
  console.log(ok ? 'PASS perf >= 50 fps everywhere' : 'BELOW TARGET (< 50 fps somewhere)', '; console errors:', errs.length, errs.slice(0, 3));
  await b.close(); process.exit(ok && !errs.length ? 0 : 1);
})();
