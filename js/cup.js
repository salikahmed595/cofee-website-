/* SalikBuilds — "Build your cup" rules. Pure, framework-free, works in browser and Node.
   Prices are PLACEHOLDERS — replace with your real menu pricing. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.SBCup = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var SIZES = { 8: 450, 12: 525, 16: 600 };            // base price in cents
  var ROASTS = { light: '#8a5a32', medium: '#5a3520', dark: '#2e1a10' };
  var MILKS = { none: { cents: 0, foam: 0, label: 'Black' },
                whole: { cents: 0, foam: 0.85, label: 'Whole milk' },
                oat: { cents: 75, foam: 0.8, label: 'Oat milk' },
                almond: { cents: 75, foam: 0.65, label: 'Almond milk' } };
  var TEMPS = { hot: 0, iced: 50 };
  var SHOT_CENTS = 100;                                 // per shot beyond the first
  var DEFAULTS = { size: 12, roast: 'medium', milk: 'whole', shots: 1, temp: 'hot', sweet: 30 };

  function own(obj, key) { return key != null && Object.prototype.hasOwnProperty.call(obj, String(key)); }
  function int(v) { var n = typeof v === 'number' ? v : parseInt(v, 10); return Number.isFinite(n) ? Math.round(n) : null; }
  function clamp(n, lo, hi) { return Math.min(hi, Math.max(lo, n)); }

  function normalize(input) {
    var c = input && typeof input === 'object' ? input : {};
    var size = int(c.size), shots = int(c.shots), sweet = int(c.sweet);
    return {
      size: own(SIZES, size) ? size : DEFAULTS.size,
      roast: own(ROASTS, c.roast) ? c.roast : DEFAULTS.roast,
      milk: own(MILKS, c.milk) ? c.milk : DEFAULTS.milk,
      shots: shots === null ? DEFAULTS.shots : clamp(shots, 1, 3),
      temp: own(TEMPS, c.temp) ? c.temp : DEFAULTS.temp,
      sweet: sweet === null ? DEFAULTS.sweet : clamp(sweet, 0, 100)
    };
  }

  function priceCents(input) {
    var c = normalize(input);
    return SIZES[c.size] + MILKS[c.milk].cents + (c.shots - 1) * SHOT_CENTS + TEMPS[c.temp];
  }

  function formatPrice(cents) {
    var n = Math.max(0, Math.round(cents));
    return '$' + Math.floor(n / 100) + '.' + String(n % 100).padStart(2, '0');
  }

  function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

  function describe(input) {
    var c = normalize(input);
    return [c.size + ' oz', cap(c.roast) + ' roast', MILKS[c.milk].label,
      c.shots + (c.shots === 1 ? ' shot' : ' shots'), cap(c.temp)].join(' · ');
  }

  /* Values the 3D scene consumes. */
  function visual(input) {
    var c = normalize(input);
    return {
      coffee: ROASTS[c.roast],
      foam: MILKS[c.milk].foam,
      steam: c.temp === 'hot' ? 1 : 0,
      ice: c.temp === 'iced' ? 1 : 0,
      scale: { 8: 0.9, 12: 1, 16: 1.1 }[c.size]
    };
  }

  return { DEFAULTS: DEFAULTS, normalize: normalize, priceCents: priceCents,
    formatPrice: formatPrice, describe: describe, visual: visual };
});
