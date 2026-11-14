/* NEUROBREW â€” the journey model. Pure functions only (no DOM, no three.js),
   so the whole choreography is deterministic and unit-tested.
   Progress `p` runs 0 â†’ 5: p = k means the camera is exactly on stage k. */

export const STAGES = [
  { id: 'beans', label: 'Beans' },
  { id: 'roast', label: 'Roast' },
  { id: 'machine', label: 'Machine' },
  { id: 'brew', label: 'Brew' },
  { id: 'milk', label: 'Milk' },
  { id: 'cup', label: 'Cup' },
];
export const LAST = STAGES.length - 1;

/* World layout of the single machine (y is up). Shared by scene + choreography. */
export const RIG = {
  chamber: { y: 5.2, r: 0.8, h: 1.3 },
  hopper: { top: 3.85, bottom: 3.25 },
  burrY: 3.0,
  grinder: { y: 2.35 },
  basket: { y: 1.3 },
  spoutY: 1.02,
  cup: { base: -0.9, h: 0.78, r: 0.5, inner: 0.455 },
  tableY: -0.97,
};

export const clamp01 = (v) => (v > 0 ? (v < 1 ? v : 1) : 0); // NaN -> 0
export const smooth = (t) => { const x = clamp01(t); return x * x * (3 - 2 * x); };
export const window01 = (v, a, b) => (b > a ? clamp01((v - a) / (b - a)) : 0);
const lerp = (a, b, t) => a + (b - a) * t;
const lerp3 = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];

export const stageOf = (p) => Math.min(LAST, Math.max(0, Math.round(Number.isFinite(p) ? p : 0)));
export const localOf = (p, k) => clamp01(p - k);
/** HUD progress for stage k: runs while that stage enters and is pinned. */
export const hudQ = (p, k) => clamp01((p - k + 0.6) / 0.9);

export function progressFromScroll(scrollY, sectionHeight) {
  if (!(sectionHeight > 0)) return 0;
  return Math.min(LAST, Math.max(0, scrollY / sectionHeight));
}

/* ---------------- camera ---------------- */
// One camera, six keyframes. Desktop framing leaves room for copy on the left.
const CAM = [
  { pos: [0.2, 5.6, 7.4], target: [-1.45, 5.35, 0] }, // beans
  { pos: [1.4, 5.7, 4.7], target: [-1.25, 5.05, 0] }, // roast
  { pos: [2.4, 3.4, 5.8], target: [-1.15, 2.55, 0] }, // machine
  { pos: [1.1, 0.7, 4.5], target: [-0.95, 0.2, 0] }, // brew
  { pos: [-1.3, 0.85, 4.1], target: [-0.8, -0.05, 0] }, // milk
  { pos: [0, 0.6, 3.7], target: [0, -0.95, 0] }, // cup: looks down into the latte art
];

function catmull(p0, p1, p2, p3, t) {
  const t2 = t * t, t3 = t2 * t;
  return 0.5 * (2 * p1 + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3);
}

export function cameraAt(p, portrait) {
  const P = Math.min(LAST, Math.max(0, Number.isFinite(p) ? p : 0));
  const i = Math.min(LAST - 1, Math.floor(P));
  const t = P - i;
  const k = (j) => CAM[Math.min(LAST, Math.max(0, j))];
  const pick = (key) => [0, 1, 2].map((c) => catmull(k(i - 1)[key][c], k(i)[key][c], k(i + 1)[key][c], k(i + 2)[key][c], t));
  const position = pick('pos');
  const target = pick('target');
  if (portrait) {
    // Phones: centre the subject, pull back, push it into the upper half of the screen.
    target[0] = 0;
    position[0] *= 0.5;
    position[2] *= 1.55;
    target[1] -= 0.55;
  }
  return { position, target };
}

/* ---------------- beans ---------------- */
const rnd = (i, k) => { const s = Math.sin(i * 12.9898 + k * 78.233) * 43758.5453; return s - Math.floor(s); };
export const DECOR = 8;

/** Where bean i of n is at progress p and time t (seconds). */
export function beanState(i, n, p, t) {
  const d = rnd(i, 1);
  const base = 0.12 + rnd(i, 9) * 0.05;

  // 1. orbit (hero): loose cloud around the hero bean, kept off the copy column
  const dir = rnd(i, 3) < 0.5 ? -1 : 1;
  const a = rnd(i, 2) * Math.PI * 2 + t * (0.06 + rnd(i, 3) * 0.08) * dir;
  const R = 1.3 + rnd(i, 4) * 3.1;
  const ca = Math.cos(a);
  const orbit = [0.9 + ca * R * (ca < 0 ? 0.55 : 1), 5.4 + (rnd(i, 5) - 0.5) * 3.4 + Math.sin(t * 0.6 + i) * 0.12, 0.2 + Math.sin(a) * R * 0.7];

  // 2. tumbling inside the roasting chamber
  const heat = smooth((p - 0.65) / 0.35);
  const th = rnd(i, 6) * Math.PI * 2 + t * (0.5 + 1.6 * heat);
  const rr = 0.12 + rnd(i, 7) * 0.52;
  const bounce = Math.abs(Math.sin(t * (2 + rnd(i, 8) * 2) + i)) * 0.42 * heat;
  const chamber = [Math.cos(th) * rr, RIG.chamber.y - 0.58 + rnd(i, 8) * 0.32 + bounce, Math.sin(th) * rr];

  // 3. drop into the grinder hopper, 4. consumed by the burrs
  const th2 = rnd(i, 10) * Math.PI * 2;
  const rr2 = 0.06 + rnd(i, 11) * 0.3;
  const hopper = [Math.cos(th2) * rr2, RIG.hopper.bottom + 0.1 + rnd(i, 12) * 0.35, Math.sin(th2) * rr2];

  const u = smooth((p - 0.25 - d * 0.3) / 0.4);
  const v = clamp01((p - 1.45 - d * 0.3) / 0.3);
  const w = clamp01((p - 1.7 - d * 0.5) / 0.3);
  const roast = smooth((p - 0.6 - d * 0.2) / 0.6);
  const spin = [rnd(i, 13) * 6 + t * (rnd(i, 14) - 0.5) * (0.8 + heat * 3), rnd(i, 15) * 6 + t * (rnd(i, 16) - 0.5) * 0.9, rnd(i, 17) * 6];

  // 5. a few roasted beans come back as table decor for the final cup
  if (i < DECOR) {
    const f = smooth((p - 4.4) / 0.4);
    if (f > 0) {
      const ang = (i / (DECOR - 1) - 0.5) * 2.7;
      const r = 1.05 + rnd(i, 18) * 0.9;
      return { phase: 'decor', pos: [Math.sin(ang) * r, RIG.tableY + 0.05, Math.cos(ang) * r * 0.75 + 0.15], scale: 0.13 * f, roast: 1, rot: [1.57, rnd(i, 19) * 6, 0] };
    }
  }

  let pos, phase;
  if (w > 0) { pos = lerp3(hopper, [0, RIG.burrY, 0], w); phase = 'grind'; }
  else if (v > 0) { pos = lerp3(chamber, hopper, v * v); phase = 'drop'; }
  else if (u >= 1) { pos = chamber; phase = 'chamber'; }
  else if (u > 0) { pos = lerp3(orbit, chamber, u); pos[1] += Math.sin(Math.PI * u) * 0.8; phase = 'enter'; }
  else { pos = orbit; phase = 'orbit'; }

  return { phase, pos, scale: w >= 1 ? 0 : base * (1 - w), roast, rot: spin };
}

/* ---------------- process state (cup, streams, machine) ---------------- */
export function brewState(p) {
  const espLevel = smooth((p - 2.7) / 0.75) * 0.5;
  const milk = smooth((p - 3.75) / 0.6);
  const final = smooth((p - 4.35) / 0.5);
  return {
    heroBean: smooth((p - 0.25) / 0.55),
    reveal: smooth((p - 0.4) / 0.6),
    heat: Math.max(smooth((p - 0.6) / 0.4) * (1 - smooth((p - 1.6) / 0.4)), 0.12 * smooth((p - 0.6) / 0.4)),
    grind: window01(p, 1.55, 1.7) * (1 - window01(p, 2.5, 2.65)),
    grounds: window01(p, 1.7, 1.8) * (1 - window01(p, 2.5, 2.6)),
    mound: smooth((p - 1.75) / 0.7),
    water: window01(p, 2.5, 2.65) * (1 - window01(p, 3.4, 3.5)),
    espresso: window01(p, 2.6, 2.75) * (1 - window01(p, 3.45, 3.55)),
    level: espLevel + milk * 0.38,
    milk,
    milkStream: window01(p, 3.75, 3.85) * (1 - window01(p, 4.35, 4.45)),
    art: smooth((p - 3.85) / 0.5),
    pitcherIn: smooth((p - 3.35) / 0.35) * (1 - smooth((p - 4.45) / 0.3)),
    pitcherTilt: smooth((p - 3.65) / 0.2) * (1 - smooth((p - 4.4) / 0.2)),
    steam: clamp01((p - 3.1) / 0.3) * (0.45 + 0.55 * final),
    final,
  };
}

/* ---------------- HUD ---------------- */
export function formatClock(seconds) {
  const s = Math.max(0, Math.round(seconds));
  return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0');
}

export function hudValues(stage, q) {
  const x = clamp01(q);
  switch (stage) {
    case 0: return { dot: x };
    case 1: return { temp: Math.round(24 + (198 - 24) * x), time: formatClock(x * 750), level: 0.1 + x * 0.52, curve: x };
    case 2: return { grind: (12.5 + (1 - x) * 30).toFixed(1), progress: 0.34 + x * 0.33, rpm: Math.round(x * 1400) };
    case 3: return { water: 93, pressure: (x * 9).toFixed(1), seconds: Math.round(x * 28) };
    case 4: return { temp: Math.round(4 + 61 * x), ratio: x * 0.75 };
    case 5: return { done: x };
    default: return {};
  }
}
