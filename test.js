#!/usr/bin/env node
// Tests for the ballistic calculator. Extracts the <script> from index.html,
// runs it against a DOM stub, and asserts on the pure functions.
'use strict';
const fs = require('fs');
const path = require('path');
const assert = require('assert');

/* ---- load app script with DOM/localStorage stubs ---- */
const html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
const match = html.match(/<script>([\s\S]*)<\/script>/);
assert(match, 'index.html must contain a <script> block');
let src = match[1].replace("'use strict';", '');

const mkEl = () => ({
  value: '0', classList: { toggle() {} }, dataset: {},
  textContent: '', innerHTML: '', style: {}, addEventListener() {}
});
global.document = { getElementById: () => mkEl(), querySelectorAll: () => [] };
global.localStorage = { getItem: () => null, setItem() {} };

/* ---- test framework (tiny) ---- */
let passed = 0, failed = 0;
function test(name, fn) {
  try { fn(); passed++; console.log('  ok', name); }
  catch (e) { failed++; console.error('  FAIL', name, '\n   ', e.message); }
}
const approx = (a, b, tol, msg) =>
  assert(Math.abs(a - b) <= tol, `${msg || ''} expected ${b}±${tol}, got ${a}`);

/* ---- the tests run inside eval scope (consts don't leak out) ---- */
const suite = `
console.log('unit conversion:');
test('1 MOA at 100 m subtends 2.909 cm', () => approx(unitCm('MOA', 100), 2.908882, 1e-6));
test('1 MRAD at 100 m subtends 10 cm', () => approx(unitCm('MRAD', 100), 10, 1e-9));
test('CM unit is identity', () => approx(unitCm('CM', 737), 1, 1e-9));
test('MRAD->cm at 300 m', () => approx(convertValue(1.3, 'MRAD', 'CM', 300), 39, 0.01));
test('MRAD->MOA is distance independent', () =>
  approx(convertValue(1, 'MRAD', 'MOA', 100), convertValue(1, 'MRAD', 'MOA', 900), 0.01));

console.log('turret math:');
test('4.6 MOA at 300 m = 54 clicks of 0.25cm/100m (README example)', () => {
  const r = solve(4.6, 'MOA', 300, 0.25);
  assert.strictEqual(r.clicks, 54);
  approx(r.offsetCm, 40.14, 0.01);
});
test('clicks for angular drop are distance independent', () => {
  assert.strictEqual(solve(4.6, 'MOA', 100, 0.25).clicks, solve(4.6, 'MOA', 800, 0.25).clicks);
});
test('breakdown 54 clicks / 4 per mark / 36 per turn', () => {
  const b = breakdownClicks(54, 4, 36);
  assert.deepStrictEqual(b, { turns: 0, mark: 13, rem: 2 });
});
test('breakdown with full turns', () => {
  const b = breakdownClicks(150, 4, 36);   // 37 marks -> 1 turn + mark 1, +2 clicks
  assert.deepStrictEqual(b, { turns: 1, mark: 1, rem: 2 });
});
test('solve rejects invalid input', () => {
  assert.strictEqual(solve(1, 'MOA', 0, 0.25), null);
  assert.strictEqual(solve(-1, 'MOA', 100, 0.25), null);
});

console.log('atmosphere:');
test('ICAO-ish air density at 15C/1013hPa/0%', () => approx(airDensity(15, 1013, 0), 1.225, 0.002));
test('humid air is less dense', () => assert(airDensity(30, 1013, 100) < airDensity(30, 1013, 0)));

console.log('drag tables:');
test('G1 exact node', () => approx(interpCd(DRAG_G1, 1.0), 0.4805, 1e-9));
test('G1 interpolates between nodes', () => {
  const cd = interpCd(DRAG_G1, 0.975 + 0.0125);
  assert(cd > 0.4448 && cd < 0.4805);
});
test('clamps below/above table', () => {
  approx(interpCd(DRAG_G7, -1), 0.1198, 1e-9);
  approx(interpCd(DRAG_G7, 99), 0.2003, 1e-9);
});
test('G7 is lower drag than G1 supersonic', () => assert(interpCd(DRAG_G7, 2) < interpCd(DRAG_G1, 2)));

console.log('stability & spin drift:');
test('Miller Sg for 175gr .308 (1.24in) 1:11.25 at 2800fps in plausible band', () => {
  // Berger/Litz-class calculators give ~1.8-2.0 for this bullet & twist.
  const sg = millerSg(175, 0.308, 1.24, 11.25, 2800, 59, 29.92);
  assert(sg > 1.6 && sg < 2.2, 'got ' + sg.toFixed(2));
});
test('faster twist raises Sg', () =>
  assert(millerSg(175, 0.308, 1.29, 10, 2625, 59, 29.92) > millerSg(175, 0.308, 1.29, 12, 2625, 59, 29.92)));
test('spin drift grows with time of flight and flips with twist', () => {
  twistDir = 'R';
  const sg = 1.7;
  assert(spinDriftCm(sg, 2) > spinDriftCm(sg, 1));
  twistDir = 'L';
  assert(spinDriftCm(sg, 1) < 0);
  twistDir = 'R';
});
test('millerSg null on missing inputs', () => assert.strictEqual(millerSg(175, 0, 1.2, 11, 2625, 59, 29.92), null));

console.log('trajectory solver:');
const rho = airDensity(15, 1013, 50);
const sound = 331.3 * Math.sqrt(1 + 15 / 273.15);
const P = { bc: 0.243, mv: 800, rho, sound, sightH: 0.045, zero: 100, table: DRAG_G7, windX: 0, windZ: 0 };

test('zeroed trajectory crosses LOS at zero distance', () => {
  const a = findZeroAngle({ ...P });
  assert(a != null, 'zero angle found');
  const r = simulate({ ...P }, a, [100]);
  approx(r[0].y, 0, 0.005, 'y at zero');
});
test('drop at 300 m for 175gr/.308 G7 in sane band (40-60 cm)', () => {
  const a = findZeroAngle({ ...P });
  const r = simulate({ ...P }, a, [300]);
  const dropCm = -r[0].y * 100;
  assert(dropCm > 40 && dropCm < 60, 'got ' + dropCm.toFixed(1));
});
test('velocity decreases monotonically', () => {
  const a = findZeroAngle({ ...P });
  const rows = simulate({ ...P }, a, [100, 300, 500, 800]);
  for (let i = 1; i < rows.length; i++) assert(rows[i].v < rows[i - 1].v);
});
test('crosswind from 3 oclock drifts left, from 9 drifts right', () => {
  const a = findZeroAngle({ ...P });
  const left = simulate({ ...P, windZ: -4 }, a, [500])[0].z;   // wind from right
  const right = simulate({ ...P, windZ: 4 }, a, [500])[0].z;   // wind from left
  assert(left < 0 && right > 0);
  approx(left, -right, 0.01, 'symmetric');
});
test('headwind increases drop vs tailwind', () => {
  const a = findZeroAngle({ ...P });
  const head = simulate({ ...P, windX: -6 }, a, [800])[0].y;
  const tail = simulate({ ...P, windX: 6 }, a, [800])[0].y;
  assert(head < tail, 'headwind should hit lower');
});
test('unreachable zero returns null', () =>
  assert.strictEqual(findZeroAngle({ ...P, zero: 5000 }), null));
test('unreachable samples are omitted, not faked', () => {
  const a = findZeroAngle({ ...P });
  const rows = simulate({ ...P }, a, [500, 20000]);
  assert.strictEqual(rows.length, 1);
});
test('denser air = more drop', () => {
  const a1 = findZeroAngle({ ...P });
  const thin = simulate({ ...P, rho: rho * 0.8 }, a1, [800])[0];
  const thick = simulate({ ...P, rho: rho * 1.2 }, a1, [800])[0];
  assert(thick.y < thin.y);
});
`;

eval(src + suite);

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
