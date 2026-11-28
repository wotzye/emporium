const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader'] });
  const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
  p.on('pageerror', (e) => console.log('ERR', e.message));
  await p.addInitScript(() => localStorage.setItem('cosepreziose.save.v1', JSON.stringify({ v: 1, lang: 'it', location: 'map', flags: { metMerchant: true, fledButcher: true, hasTorch: true }, inventory: [], notebook: [], diary: [], hintsUsed: {}, settings: { quality: 'medium', reducedScares: true, sensors: false, markers: true, volume: 0 } })));
  await p.goto('http://localhost:4174/'); await p.waitForTimeout(2500);
  await p.click('[data-a="continue"]');
  await p.waitForFunction(() => window.__game?.loc?.id === 'map', null, { timeout: 90000 });
  await p.evaluate(() => { const g = window.__game; setInterval(() => { for (const el of [g.ui.dialog, g.ui.card]) if (el.classList.contains('on')) el.dispatchEvent(new PointerEvent('pointerup', { bubbles: true })); }, 200); });
  const loc = process.argv[2] || 'emporio';
  p.evaluate((l) => window.__game.go(l), loc); await p.waitForFunction((l) => window.__game.loc?.id === l, loc, { timeout: 60000 }); await p.waitForTimeout(5000);
  await p.screenshot({ path: `/home/claude/shots/${loc}_main.png` });
  for (const v of (process.argv[3]||'').split(',').filter(Boolean)) { await p.evaluate((v) => window.__game.view(v), v); await p.waitForTimeout(2500); await p.screenshot({ path: `/home/claude/shots/${loc}_${v}.png` }); }
  await b.close();
})();
