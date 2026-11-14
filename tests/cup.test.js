// Unit tests for the "Build your cup" configurator rules.
// Run: node --test tests/
const test = require('node:test');
const assert = require('node:assert/strict');
const Cup = require('../js/cup.js');

test('defaults produce a valid 12 oz medium hot cup', () => {
  const c = Cup.normalize({});
  assert.deepEqual(c, { size: 12, roast: 'medium', milk: 'whole', shots: 1, temp: 'hot', sweet: 30 });
  assert.equal(Cup.priceCents(c), 525);
});

test('size changes base price', () => {
  assert.equal(Cup.priceCents({ size: 8, milk: 'none' }), 450);
  assert.equal(Cup.priceCents({ size: 16, milk: 'none' }), 600);
});

test('oat milk, extra shots and iced add their surcharges', () => {
  // 12oz 525 + oat 75 + 2 extra shots 200 + iced 50
  assert.equal(Cup.priceCents({ size: 12, milk: 'oat', shots: 3, temp: 'iced' }), 850);
});

test('invalid and malicious input falls back to safe defaults', () => {
  const c = Cup.normalize({ size: 99, roast: '<script>', milk: null, shots: -4, temp: 'lava', sweet: 900 });
  assert.equal(c.size, 12);
  assert.equal(c.roast, 'medium');
  assert.equal(c.milk, 'whole');
  assert.equal(c.shots, 1);
  assert.equal(c.temp, 'hot');
  assert.equal(c.sweet, 100);
  assert.equal(Cup.normalize({ shots: 9 }).shots, 3);
  assert.equal(Cup.normalize({ sweet: 'abc' }).sweet, 30);
  assert.equal(Cup.normalize(undefined).size, 12);
});

test('numeric strings from range inputs are accepted', () => {
  const c = Cup.normalize({ size: '16', shots: '2', sweet: '55' });
  assert.equal(c.size, 16);
  assert.equal(c.shots, 2);
  assert.equal(c.sweet, 55);
});

test('formatPrice renders dollars without float drift', () => {
  assert.equal(Cup.formatPrice(525), '$5.25');
  assert.equal(Cup.formatPrice(1000), '$10.00');
  assert.equal(Cup.formatPrice(5), '$0.05');
});

test('describe gives a readable summary', () => {
  assert.equal(Cup.describe({ size: 16, roast: 'dark', milk: 'oat', shots: 2, temp: 'iced' }),
    '16 oz · Dark roast · Oat milk · 2 shots · Iced');
  assert.equal(Cup.describe({ milk: 'none', shots: 1 }), '12 oz · Medium roast · Black · 1 shot · Hot');
});

test('visual params map roast and milk to scene values', () => {
  const light = Cup.visual({ roast: 'light', milk: 'none' });
  const dark = Cup.visual({ roast: 'dark', milk: 'oat' });
  assert.match(light.coffee, /^#[0-9a-f]{6}$/);
  assert.notEqual(light.coffee, dark.coffee);
  assert.equal(light.foam, 0);
  assert.ok(dark.foam > 0.5);
  assert.equal(Cup.visual({ temp: 'iced' }).steam, 0);
  assert.equal(Cup.visual({ temp: 'hot' }).steam, 1);
  assert.ok(Cup.visual({ size: 16 }).scale > Cup.visual({ size: 8 }).scale);
});
