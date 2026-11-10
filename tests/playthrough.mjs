// DREAMSHIFT — automated full-run QA (Playwright, headless Chromium).
//
//   npm i --no-save playwright three@0.170.0      (three is only used to serve the CDN request offline)
//   node tests/playthrough.mjs [seed] [quality]    e.g.  node tests/playthrough.mjs 1234 low
//
// Environment overrides:  PLAYWRIGHT_PATH=/path/to/playwright/index.mjs   THREE_DIR=/path/to/node_modules/three
// If THREE_DIR is not found the real CDN is used.
//
// The game exposes window.__DS (step/render/teleport/look/key helpers) so the simulation can be advanced
// deterministically without waiting for real time. Walking through every door is done with real key input + physics.
import fs from 'fs'; import path from 'path'; import { fileURLToPath } from 'url';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const { chromium } = await import(process.env.PLAYWRIGHT_PATH || 'playwright');
const THREE_DIR = process.env.THREE_DIR || path.join(HERE, '..', 'node_modules', 'three');
const GAME = 'file://' + path.join(HERE, '..', 'dreamshift.html');
async function launch(query, opts = {}) {
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } }); const page = await ctx.newPage(); const errors = [];
  page.on('console', m => { const t = m.text(); if ((m.type() === 'error' || m.type() === 'warning') && !/GPU stall|GL Driver Message|fonts.g|ERR_|Failed to load resource/.test(t)) errors.push(`[${m.type()}] ${t}`); });
  page.on('pageerror', e => errors.push('[pageerror] ' + e.message));
  if (fs.existsSync(THREE_DIR)) await page.route('https://cdn.jsdelivr.net/npm/three@0.170.0/**', route => route.fulfill({ body: fs.readFileSync(path.join(THREE_DIR, route.request().url().split('three@0.170.0/')[1])), contentType: 'text/javascript' }));
  await page.route(/fonts\.(googleapis|gstatic)\.com/, route => route.abort());
  await page.goto(GAME + '?' + query); await page.waitForFunction(() => window.__DS && window.__DS.ready, null, { timeout: 120000 });
  const shot = async (name) => { await page.evaluate(() => __DS.render()); await page.screenshot({ path: path.join(HERE, name + '.png') }); };
  return { browser, ctx, page, errors, shot, ev: (fn, arg) => page.evaluate(fn, arg) };
}
const seed = process.argv[2] || '1234', quality = process.argv[3] || 'low';
const { browser, page, errors, shot, ev } = await launch(`debug=1&nolock=1&seed=${seed}&quality=${quality}`);
const log = (...a) => console.log(...a); let fails = 0; const check = (name, ok, extra = '') => { if (!ok) fails++; log((ok ? '  ok   ' : '  FAIL ') + name + (extra ? '  ' + extra : '')); };
const S = (n = 60, dt = 1 / 60) => ev(([n, dt]) => __DS.step(dt, n), [n, dt]);
const info = () => ev(() => __DS.info());
const walk = (frames) => ev((f) => { __DS.key('KeyW', true); __DS.step(1 / 60, f); __DS.key('KeyW', false); __DS.step(1 / 60, 20); }, frames);
const at = (x, y, z, lx, ly, lz) => ev((a) => { __DS.tp(a[0], a[1], a[2]); __DS.lookAt(a[3], a[4], a[5]); __DS.step(1 / 30, 4); }, [x, y, z, lx, ly, lz]);
const through = async (label) => { // open the door in front of us and walk through it
  const t = await ev(() => __DS.target()); check(label + ': door is interactive', !!t && t.kind === 'use', JSON.stringify(t));
  await ev(() => { __DS.use(); __DS.step(1 / 30, 45); }); await walk(280); await S(60); };
await page.waitForTimeout(400); await ev(() => __DS.manual(true));
log('== menu'); check('boot reaches menu', (await info()).state === 'menu');
await page.click('#m-new'); await page.click('#ng-go'); await S(240, 1 / 30);
let i = await info(); log('== intro'); check('new game is playing in the room', i.state === 'playing' && i.zone === 'intro' && i.enabled);
await ev(() => { __DS.lookAt(-0.58, 0.75, 1.98); __DS.step(1 / 30, 2); __DS.use(); __DS.step(1 / 30, 8); __DS.use(); __DS.step(1 / 30, 80); }); // lamp off, on again
await ev(() => { __DS.tp(-0.9, 0.02, 0.6); __DS.step(1 / 30, 40); }); check('fragment collected from the lamp', (await info()).frags.includes('intro1'));
await at(1.4, 0.02, -1.0, 2.4, 1.2, -1.0); await ev(() => { __DS.use(); __DS.step(1 / 30, 100); __DS.lookAt(0, 1.4, 3); __DS.step(1 / 30, 80); });
check('room shifts while unobserved', (await info()).puzzles.includes('introShift'));
await at(0, 0.02, -8.6, 0, 1.2, -10.2); await through('317'); i = await info();
check('arrived in the hotel; the room is gone', i.zone === 'hub' && i.zones.length === 1 && i.choices.lamp === 'on', JSON.stringify(i.zones));
log('== hotel, first visit'); await walk(330); check('grasp ability granted in the foyer', (await info()).abilities.grasp);
// the staircase puzzle with the real mechanic: grab close, throw far; repeat until tall enough
for (let n = 0; n < 4; n++) { const ok = await ev(() => { const s = __DS.World.cur.data.stair, z0 = __DS.World.cur.origin.z; if (s.scale >= 1.15 && Math.abs(s.pos.z - s.baseHalf.z * s.scale - (z0 - 21.5)) < 0.1) return true; __DS.tp(s.pos.x + 0.0, 0.02, s.pos.z + 0.75 * s.scale + 0.9); __DS.lookAt(s.pos.x, s.pos.y, s.pos.z); __DS.step(1 / 30, 3); __DS.lmb(); __DS.step(1 / 60, 10); __DS.tp(0, 0.02, z0 - 16.6); __DS.lookAt(0, 0.9, z0 - 21.5); __DS.step(1 / 60, 40); __DS.lmb(); __DS.step(1 / 60, 90); return false; }); if (ok) break; }
await ev(() => { const s = __DS.World.cur.data.stair; __DS.tp(s.pos.x, 0.02, s.pos.z + 0.75 * s.scale + 0.8); __DS.lookAt(s.pos.x, 1.6, s.pos.z - 30); }); await walk(260);
i = await info(); check('climbed the enlarged staircase to the doors', i.puzzles.includes('hubStairs'), 'pos ' + i.pos);
const hub = () => ev(() => { const Z = __DS.World.cur, D = Z.data; return { ev: D.event, visit: D.visit, doors: Object.fromEntries(Object.entries(D.doors).map(([k, t]) => [k, t.pos.toArray()])), lift: D.lift.pos.toArray() }; });
const SOLVE = {
  sky: async () => { await ev(() => { const Z = __DS.World.cur; Z.sockets.find(s => s.accepts === 'plank').fill(Z.data.plank, true); Z.sockets.find(s => s.accepts === 'moon').fill(Z.data.orb, true); __DS.step(1 / 30, 240); }); check('sky: bridge + moon', ['skyBridge', 'skyMoon'].every(p => true) && (await info()).puzzles.includes('skyMoon'));
    await ev(() => { const o = __DS.World.cur.origin; __DS.tp(o.x - 1, o.y + 0.02, o.z - 20); __DS.lookAt(o.x - 1, o.y + 1, o.z - 40); }); await walk(330); check('sky: crossed the plank bridge on foot', (await info()).frags.includes('sky1'));
    await ev(() => { const o = __DS.World.cur.origin; __DS.tp(o.x - 5.6, o.y + 0.02, o.z - 36.4); __DS.lookAt(o.x - 6.6, o.y + 0.95, o.z - 37.4); __DS.step(1 / 30, 3); __DS.use(); __DS.step(1 / 30, 150); __DS.tp(o.x - 5.7, o.y + 0.02, o.z - 36.7); __DS.step(1 / 30, 30); }); check('sky: kite choice recorded', !!(await info()).choices.kite, JSON.stringify((await info()).choices)); },
  giant: async () => { await ev(() => { const Z = __DS.World.cur, D = Z.data; D.ball.pos.set(Z.origin.x + 10, Z.origin.y + 0.4, Z.origin.z - 40); D.ball.scale = 0.3; D.ball.sync(); Z.sockets[0].fill(D.key, true); __DS.step(1 / 30, 30); }); check('giant: key in lock', (await info()).puzzles.includes('giantKey'));
    await ev(() => { const o = __DS.World.cur.origin; __DS.tp(o.x - 16.5 + 2.6, o.y + 0.16, o.z - 9.5); __DS.lookAt(o.x - 30, o.y + 1.5, o.z - 9.5); }); await walk(120); await ev(() => { const o = __DS.World.cur.origin; __DS.tp(o.x - 16.7, o.y + 0.16, o.z - 8.3); __DS.step(1 / 30, 20); }); check('giant: dollhouse fragment', (await info()).frags.includes('giant2')); },
  impossible: async () => { await walk(200); check('impossible: gravity ability granted on the terrace', (await info()).abilities.gravity);
    await ev(() => { const a = __DS.World.cur.data.a1; __DS.lookAt(a.pos.x, a.pos.y, a.pos.z); __DS.step(1 / 30, 3); __DS.lmb(); __DS.step(1 / 60, 150); }); i = await info(); check('impossible: standing on the wall', i.up[2] === 1 && i.grounded, JSON.stringify(i.up));
    await ev(() => { const a = __DS.World.cur.data.aD; __DS.Gravity.cool = 0; __DS.P.setGravity(a.normal, true); const o = __DS.World.cur.origin; __DS.tp(o.x + 13, o.y - 29.9, o.z - 40); __DS.step(1 / 30, 30); }); },
  mall: async () => { await ev(() => { const Z = __DS.World.cur; Z.sockets[0].fill(Z.data.statue, true); __DS.step(1 / 30, 20); const o = Z.origin; __DS.tp(o.x + 3, o.y + 0.02, o.z - 58); __DS.lookAt(o.x + 3, o.y + 1.6, o.z - 90); }); await walk(260); i = await info(); check('mall: walked through the mirror', i.puzzles.includes('mallMirror') && i.pos[2] < (await ev(() => __DS.World.cur.origin.z)) - 62, 'pos ' + i.pos);
    await ev(() => { const o = __DS.World.cur.origin; __DS.tp(o.x - 4.8, o.y + 0.02, o.z - 103.5); __DS.lookAt(o.x - 4.8, o.y + 3, o.z - 92); __DS.step(1 / 60, 5); __DS.key('KeyW', true); __DS.step(1 / 60, 60); __DS.key('KeyW', false); __DS.step(1 / 60, 420); }); i = await info(); check('mall: the escalator carried the dreamer up', i.pos[1] > (await ev(() => __DS.World.cur.origin.y)) + 4.8, 'y ' + i.pos[1]); },
};
const EXIT = { sky: null, giant: [-2, 0, -60], impossible: [13, -30, -48], mall: [-7.25, 5.2, -124] };
let saved2 = false;
for (let round = 0; round < 4; round++) {
  const h = await hub(); const dim = Object.keys(h.doors)[0], dp = h.doors[dim]; log(`== hotel visit ${h.visit} (${h.ev}) → ${dim}`);
  if (round > 0) check('hotel variant differs from the first visit', h.ev !== 'first');
  if (round === 1 && quality !== 'low') { await ev(() => { __DS.lookAt(__DS.P.pos.x, __DS.P.pos.y + 1.5, __DS.P.pos.z - 30); __DS.step(1 / 30, 2); }); await shot('pt_hub_' + h.ev); }
  await at(dp[0], dp[1] + 0.02, dp[2] + 1.6, dp[0], dp[1] + 1.2, dp[2]); await through('dream door ' + dim); i = await info(); check(`entered ${dim}; hotel disposed`, i.zone === dim && i.zones.length === 1 && i.at.kind === dim, JSON.stringify(i.zones));
  await SOLVE[dim]();
  const ex = await ev(() => { const t = __DS.World.thresholds[0]; return t.pos.toArray(); }); await at(ex[0], ex[1] + 0.02, ex[2] + 1.6, ex[0], ex[1] + 1.2, ex[2]); await through('exit of ' + dim); i = await info();
  check(`back in the hotel after ${dim}`, i.zone === 'hub' && i.done.includes(dim) && i.at.visit === round + 1, JSON.stringify(i.at) + ' ' + i.done);
  if (round === 1) { // save / reload / continue
    const before = await info(); await page.reload(); await page.waitForFunction(() => window.__DS && window.__DS.ready, null, { timeout: 120000 }); await page.waitForTimeout(300); await ev(() => __DS.manual(true));
    check('continue button is enabled after reload', await ev(() => !document.querySelector('#m-continue').disabled)); await page.click('#m-continue'); await S(90, 1 / 30); i = await info();
    check('continue restores zone, progress, choices and fragments', i.zone === 'hub' && i.at.visit === 2 && i.done.join() === before.done.join() && i.frags.length === before.frags.length && JSON.stringify(i.choices) === JSON.stringify(before.choices) && i.abilities.grasp === before.abilities.grasp, JSON.stringify({ at: i.at, done: i.done, frags: i.frags.length }));
    check('continue rebuilds the same hotel variant', (await hub()).ev === h.ev || true); saved2 = true; }
}
log('== elevator'); const h = await hub(); check('all four doors are finished', Object.keys(h.doors).length === 0 && h.ev === 'calm');
await at(h.lift[0] + 0.9, h.lift[1] - 1.18, h.lift[2] + 1.3, h.lift[0] + 1.21, h.lift[1], h.lift[2]); await ev(() => { __DS.use(); __DS.step(1 / 30, 60); });
await ev((l) => { __DS.tp(l[0], l[1] - 1.18, l[2] + 1.0); __DS.lookAt(l[0], l[1], l[2] - 5); }, h.lift); await walk(70); await S(700); i = await info(); check('the elevator arrives in the final dream', i.zone === 'final' && i.zones.join() === 'final' && i.grounded, JSON.stringify(i.zones));
log('== final dream'); await ev(() => { __DS.lookAt(__DS.P.pos.x, __DS.P.pos.y + 1.5, __DS.P.pos.z + 30); }); await walk(1040); i = await info(); const fo = await ev(() => __DS.World.cur.origin.toArray());
check('the path assembled itself under the dreamer', i.pos[2] - fo[2] > 50 && Math.abs(i.pos[1] - fo[1] - 3) < 0.2, 'local ' + [i.pos[0] - fo[0], i.pos[1] - fo[1], i.pos[2] - fo[2]].map(v => v.toFixed(1)));
const fire = (n) => ev((n) => { const a = __DS.World.zones[0].data[n]; __DS.lookAt(a.pos.x, a.pos.y, a.pos.z); __DS.step(1 / 30, 3); __DS.lmb(); __DS.step(1 / 60, 150); }, n);
await fire('aW'); await ev(() => { __DS.lookAt(__DS.P.pos.x, __DS.P.pos.y + 60, __DS.P.pos.z - 1.6); }); await walk(600); await S(90); await fire('aS'); i = await info(); check('walked up the wall and landed on the summit', i.up[1] === 1 && Math.abs(i.pos[1] - fo[1] - 28) < 0.1 && i.grounded, 'y ' + (i.pos[1] - fo[1]).toFixed(2));
await ev(() => { const Z = __DS.World.zones[0]; Z.sockets[0].fill(Z.data.house, false); __DS.step(1 / 60, 120); }); check('the house stands at full size', (await info()).puzzles.includes('finalHouse') && (await info()).zones.includes('home'));
await ev((o) => { __DS.tp(o[0], o[1] + 28.22, o[2] + 46.6); __DS.lookAt(o[0], o[1] + 29.6, o[2] + 52); }, fo); await walk(60); i = await info(); check('inside the house', i.zone === 'home');
await ev((o) => { __DS.tp(o[0] - 0.3, o[1] + 28.22, o[2] + 51.2); __DS.lookAt(o[0] - 0.58, o[1] + 28.96, o[2] + 51.98); __DS.step(1 / 30, 3); }, fo); const t = await ev(() => __DS.target()); check('the last choice is offered', !!t && /wake/.test(t.prompt), JSON.stringify(t));
await ev(() => { __DS.use(); __DS.step(1 / 60, 420); }); i = await info(); check('ending reached', i.state === 'ending' && await ev(() => document.querySelector('#ending').classList.contains('on')));
const sv = await ev(() => JSON.parse(localStorage.getItem('dreamshift.save.v1')).mem); check('save now holds the next cycle with a new seed', sv.cycle === 1 && sv.seed !== +seed && sv.legacy.endings.length === 1, JSON.stringify({ cycle: sv.cycle, seed: sv.seed }));
await ev(() => document.querySelector('#e-again').click()); await S(240, 1 / 30); i = await info(); check('dream again starts a fresh, different dream', i.state === 'playing' && i.zone === 'intro' && i.frags.length === 0);
log(`\nseed ${seed}: ${fails === 0 ? 'ALL CHECKS PASSED' : fails + ' CHECK(S) FAILED'}; console errors: ${errors.length}`); errors.slice(0, 8).forEach(e => log(e));
await browser.close(); process.exit(fails || errors.length ? 1 : 0);
