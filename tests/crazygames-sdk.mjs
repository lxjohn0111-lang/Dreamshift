// DREAMSHIFT — CrazyGames build QA: serves ./crazygames locally, swaps the real SDK for a mock, and checks that
// progress + settings go through SDK.data, that the game-module calls happen, and that the build falls back to localStorage
// when the SDK refuses to initialise.   node tests/crazygames-sdk.mjs    (PLAYWRIGHT_PATH=... to override the import)
import { spawn } from 'child_process'; import path from 'path'; import { fileURLToPath } from 'url';
const { chromium } = await import(process.env.PLAYWRIGHT_PATH || 'playwright');
const CG_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'crazygames');
const srv = spawn('python3', ['-m', 'http.server', '8765', '--bind', '127.0.0.1', '--directory', CG_DIR], { stdio: 'ignore' }); await new Promise(r => setTimeout(r, 900));
const MOCK = (fail) => `(() => { const K='__cgmock', S = JSON.parse(sessionStorage.getItem(K) || '{}'), save = () => sessionStorage.setItem(K, JSON.stringify(S)), calls = [];
  window.CrazyGames = { SDK: { environment: 'local', _calls: calls, _store: S, async init() { calls.push('init'); ${fail ? "throw new Error('sdk disabled');" : ''} },
    data: { getItem: (k) => (k in S ? S[k] : null), setItem: (k, v) => { S[k] = String(v); save(); calls.push('setItem:' + k); }, removeItem: (k) => { delete S[k]; save(); calls.push('removeItem:' + k); }, clear: () => { for (const k in S) delete S[k]; save(); } },
    game: { loadingStart: () => calls.push('loadingStart'), loadingStop: () => calls.push('loadingStop'), gameplayStart: () => calls.push('gameplayStart'), gameplayStop: () => calls.push('gameplayStop'), happytime: () => calls.push('happytime'), settings: { muteAudio: false }, addSettingsChangeListener: (f) => { window.__cgSettings = f; } } } }; })();`;
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
let bad = 0; const ck = (n, ok, x = '') => { if (!ok) bad++; console.log((ok ? '  ok   ' : '  FAIL ') + n + (x ? '  ' + x : '')); };
for (const fail of [false, true]) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } }); const page = await ctx.newPage(); const errors = [], ext = [];
  page.on('console', m => { const t = m.text(); if ((m.type() === 'error' || m.type() === 'warning') && !/GPU stall|GL Driver/.test(t)) errors.push(t); }); page.on('pageerror', e => errors.push('[pageerror] ' + e.message));
  page.on('request', r => { const u = r.url(); if (!u.startsWith('http://127.0.0.1:8765') && !u.startsWith('data:') && !u.startsWith('blob:')) ext.push(u); });
  await page.route('https://sdk.crazygames.com/**', r => r.fulfill({ body: MOCK(fail), contentType: 'text/javascript' }));
  await page.goto('http://127.0.0.1:8765/index.html?debug=1&nolock=1&seed=4242&quality=low'); await page.waitForFunction(() => window.__DS && __DS.ready, null, { timeout: 120000 });
  const ev = (f, a) => page.evaluate(f, a); console.log(fail ? '== SDK init fails (not on CrazyGames) → fallback' : '== SDK available');
  ck('only the SDK is requested from outside the folder', ext.every(u => u.startsWith('https://sdk.crazygames.com/')), JSON.stringify([...new Set(ext)]));
  ck('local fonts loaded', await ev(async () => { await document.fonts.ready; return document.fonts.check("300 20px 'Cormorant Garamond'") && document.fonts.check("400 12px Jost"); }));
  ck('three.js came from ./lib', await ev(() => performance.getEntriesByType('resource').some(e => e.name.endsWith('/lib/three.module.min.js'))));
  await ev(() => __DS.manual(true)); await page.click('#m-new'); await page.click('#ng-go'); await ev(() => __DS.step(1 / 30, 240));
  await ev(() => { __DS.lookAt(-0.58, 0.75, 1.98); __DS.step(1 / 30, 2); __DS.use(); __DS.step(1 / 30, 80); __DS.tp(-0.9, 0.02, 0.6); __DS.step(1 / 30, 40); });
  await ev(() => { __DS.manual(false); }); await page.waitForTimeout(1500); await ev(() => __DS.Game.pause()); await page.waitForTimeout(1200);
  const st = await ev(() => ({ calls: window.CrazyGames.SDK._calls, cg: Object.keys(window.CrazyGames.SDK._store), ls: Object.keys(localStorage).filter(k => k.startsWith('dreamshift')), usingData: !!__DS.Portal.data, frags: __DS.info().frags }));
  if (!fail) {
    ck('portal uses SDK.data', st.usingData); ck('save + settings written through SDK.data.setItem', st.cg.includes('dreamshift.save.v1'), JSON.stringify(st.cg)); ck('nothing written to localStorage', st.ls.length === 0, JSON.stringify(st.ls));
    ck('saved progress contains the collected fragment', await ev(() => !!JSON.parse(window.CrazyGames.SDK._store['dreamshift.save.v1']).mem.frags.intro1));
    for (const c of ['init', 'loadingStart', 'loadingStop', 'gameplayStart', 'happytime', 'gameplayStop']) ck('SDK call: ' + c, st.calls.includes(c)); ck('call order init → loadingStart → loadingStop → gameplayStart', st.calls.indexOf('init') < st.calls.indexOf('loadingStart') && st.calls.indexOf('loadingStart') < st.calls.indexOf('loadingStop') && st.calls.indexOf('loadingStop') < st.calls.indexOf('gameplayStart'));
    await ev(() => { __DS.Audio.init(); window.__cgSettings({ muteAudio: true }); }); ck('CrazyGames mute setting is respected', await ev(() => __DS.Portal.muted === true));
    await ev(() => { const s = __DS.Settings; s.d.fov = 80; s.save(); }); ck('settings saved through SDK.data', await ev(() => JSON.parse(window.CrazyGames.SDK._store['dreamshift.settings.v1']).fov === 80));
    await page.reload(); await page.waitForFunction(() => window.__DS && __DS.ready, null, { timeout: 120000 }); await page.waitForTimeout(300);
    ck('after reload: Continue is offered from SDK data', await ev(() => !document.querySelector('#m-continue').disabled)); ck('after reload: settings restored from SDK data', await ev(() => __DS.Settings.d.fov === 80));
    await ev(() => __DS.manual(true)); await page.click('#m-continue'); await ev(() => __DS.step(1 / 30, 60)); ck('continue restores fragments', (await ev(() => __DS.info().frags)).includes('intro1'));
    await ev(() => { __DS.Game.toMenu(); }); await page.click('#m-new'); await page.click('#ng-go'); ck('new game clears the old save via SDK.data.removeItem', (await ev(() => window.CrazyGames.SDK._calls)).includes('removeItem:dreamshift.save.v1'));
  } else { ck('falls back to localStorage', !st.usingData && st.ls.includes('dreamshift.save.v1'), JSON.stringify(st.ls)); ck('game still playable', st.frags.includes('intro1')); }
  ck('no console errors', errors.length === 0, errors.slice(0, 3).join(' | ')); await ctx.close();
}
await browser.close(); srv.kill(); console.log(bad ? bad + ' FAILED' : 'ALL CRAZYGAMES CHECKS PASSED'); process.exit(bad ? 1 : 0);
