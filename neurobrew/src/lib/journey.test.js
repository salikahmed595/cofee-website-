import { describe, it, expect } from 'vitest';
import {
  STAGES, clamp01, smooth, window01, stageOf, localOf, progressFromScroll,
  cameraAt, beanState, hudValues, brewState, formatClock,
} from './journey.js';

describe('stage model', () => {
  it('has the six steps in story order', () => {
    expect(STAGES.map((s) => s.id)).toEqual(['beans', 'roast', 'machine', 'brew', 'milk', 'cup']);
  });
  it('clamps and eases', () => {
    expect(clamp01(-2)).toBe(0);
    expect(clamp01(9)).toBe(1);
    expect(clamp01(NaN)).toBe(0);
    expect(smooth(0)).toBe(0);
    expect(smooth(1)).toBe(1);
    expect(smooth(0.5)).toBeCloseTo(0.5);
    expect(window01(5, 4, 6)).toBe(0.5);
    expect(window01(1, 2, 2)).toBe(0); // zero-width window is safe
  });
  it('maps progress to stage index and local progress', () => {
    expect(stageOf(0)).toBe(0);
    expect(stageOf(2.4)).toBe(2);
    expect(stageOf(2.6)).toBe(3); // nearest stage
    expect(stageOf(99)).toBe(5);
    expect(stageOf(-3)).toBe(0);
    expect(localOf(2.25, 2)).toBeCloseTo(0.25);
    expect(localOf(1, 2)).toBe(0);
    expect(localOf(9, 2)).toBe(1);
  });
  it('converts scroll to progress 0..5', () => {
    expect(progressFromScroll(0, 1000)).toBe(0);
    expect(progressFromScroll(2500, 1000)).toBe(2.5);
    expect(progressFromScroll(99999, 1000)).toBe(5);
    expect(progressFromScroll(500, 0)).toBe(0); // no layout yet
  });
});

describe('camera rig', () => {
  it('hits each stage keyframe exactly and stays finite in between', () => {
    for (let k = 0; k <= 5; k++) {
      const c = cameraAt(k, false);
      expect(c.position).toHaveLength(3);
      c.position.concat(c.target).forEach((v) => expect(Number.isFinite(v)).toBe(true));
    }
    const a = cameraAt(1, false), b = cameraAt(1.5, false), d = cameraAt(2, false);
    expect(b.position).not.toEqual(a.position);
    expect(b.position).not.toEqual(d.position);
  });
  it('descends the machine from roaster to cup', () => {
    const ys = [0, 1, 2, 3, 4, 5].map((k) => cameraAt(k, false).target[1]);
    expect(ys[1]).toBeGreaterThan(ys[3]);
    expect(ys[3]).toBeGreaterThan(ys[5] - 0.6);
  });
  it('centres the subject and pulls back on portrait screens', () => {
    const wide = cameraAt(2, false), tall = cameraAt(2, true);
    expect(Math.abs(tall.target[0])).toBeLessThan(Math.abs(wide.target[0]) + 1e-9);
    expect(tall.position[2]).toBeGreaterThan(wide.position[2]);
  });
});

describe('bean choreography', () => {
  const n = 60;
  it('beans start raw and orbiting, visible', () => {
    const s = beanState(10, n, 0, 0);
    expect(s.scale).toBeGreaterThan(0);
    expect(s.roast).toBe(0);
    expect(s.phase).toBe('orbit');
  });
  it('when resting on the roast stage, every bean is in the chamber mid-roast', () => {
    for (let i = 0; i < n; i++) {
      const s = beanState(i, n, 1, 2);
      expect(s.phase).toBe('chamber');
      expect(s.roast).toBeGreaterThan(0.15);
      expect(s.roast).toBeLessThan(0.95);
    }
  });
  it('when resting on the machine stage, beans are visibly flowing into the grinder', () => {
    const phases = Array.from({ length: n }, (_, i) => beanState(i, n, 2, 0).phase);
    expect(phases.filter((p) => p === 'drop' || p === 'grind').length).toBeGreaterThan(n * 0.4);
  });
  it('beans are inside the roaster and roasted by late stage 2', () => {
    const s = beanState(10, n, 1.3, 2);
    expect(s.phase).toBe('chamber');
    expect(s.roast).toBeGreaterThan(0.5);
    expect(s.pos[1]).toBeGreaterThan(4.4);
    expect(Math.hypot(s.pos[0], s.pos[2])).toBeLessThan(1.0);
  });
  it('beans are fully roasted then consumed by the grinder', () => {
    expect(beanState(10, n, 2.2, 0).roast).toBe(1);
    const gone = beanState(10, n, 3.4, 0);
    expect(gone.scale).toBe(0);
  });
  it('a few roasted beans return as decor for the final cup', () => {
    const decor = beanState(2, n, 5, 0);
    expect(decor.phase).toBe('decor');
    expect(decor.scale).toBeGreaterThan(0);
    expect(decor.pos[1]).toBeLessThan(-0.5);
    expect(beanState(40, n, 5, 0).scale).toBe(0);
  });
  it('is deterministic and finite for every bean and progress', () => {
    for (let i = 0; i < n; i++) {
      for (let p = 0; p <= 5; p += 0.25) {
        const s = beanState(i, n, p, 1.3);
        s.pos.forEach((v) => expect(Number.isFinite(v)).toBe(true));
        expect(s).toEqual(beanState(i, n, p, 1.3));
      }
    }
  });
});

describe('brew state', () => {
  it('each stage is mid-action when the camera rests on it', () => {
    expect(brewState(2).grind).toBe(1);
    const brew = brewState(3);
    expect(brew.espresso).toBe(1);
    expect(brew.level).toBeGreaterThan(0.1);
    expect(brew.level).toBeLessThan(0.5);
    const milk = brewState(4);
    expect(milk.milkStream).toBe(1);
    expect(milk.pitcherTilt).toBeGreaterThan(0.9);
    expect(milk.espresso).toBe(0);
    expect(milk.art).toBeGreaterThan(0);
    expect(milk.art).toBeLessThan(1);
    const cup = brewState(5);
    expect(cup.pitcherIn).toBe(0);
    expect(cup.milkStream).toBe(0);
  });
  it('fills the cup with espresso then milk', () => {
    expect(brewState(0).level).toBe(0);
    const brewed = brewState(3.6);
    expect(brewed.level).toBeGreaterThan(0.45);
    expect(brewed.milk).toBe(0);
    const latte = brewState(5);
    expect(latte.level).toBeGreaterThan(brewed.level);
    expect(latte.art).toBe(1);
    expect(latte.milk).toBe(1);
  });
  it('only streams espresso during brew and milk during milk', () => {
    expect(brewState(3.2).espresso).toBeGreaterThan(0);
    expect(brewState(1).espresso).toBe(0);
    expect(brewState(4.2).milkStream).toBeGreaterThan(0);
    expect(brewState(3.3).milkStream).toBe(0);
  });
});

describe('HUD values', () => {
  it('roast numbers climb with progress', () => {
    const a = hudValues(1, 0), b = hudValues(1, 1);
    expect(a.temp).toBeLessThan(b.temp);
    expect(b.temp).toBe(198);
    expect(b.time).toBe('12:30');
  });
  it('brew reaches 9 bar and 28 s', () => {
    const v = hudValues(3, 1);
    expect(v.pressure).toBe('9.0');
    expect(v.seconds).toBe(28);
    expect(v.water).toBe(93);
  });
  it('milk hits 65°C and a 1:3 ratio', () => {
    const v = hudValues(4, 1);
    expect(v.temp).toBe(65);
    expect(v.ratio).toBeCloseTo(0.75);
  });
  it('clamps out-of-range input', () => {
    expect(hudValues(1, 7).temp).toBe(198);
    expect(hudValues(1, -1).temp).toBe(24);
    expect(hudValues(99, 0.5)).toEqual({});
  });
  it('formats clocks', () => {
    expect(formatClock(0)).toBe('00:00');
    expect(formatClock(750)).toBe('12:30');
    expect(formatClock(-5)).toBe('00:00');
  });
});
