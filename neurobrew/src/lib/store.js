/* Shared, mutable, non-React state so scroll updates never re-render React.
   `p` is the raw scroll progress (0..5); `smooth` is the damped value the 3D scene uses. */
export const journey = {
  p: 0,
  smooth: 0,
  reduced: typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
};

/** Pick a rendering tier once at startup. */
export function detectQuality() {
  if (typeof window === 'undefined') return 'none';
  try {
    const c = document.createElement('canvas');
    const gl = c.getContext('webgl2') || c.getContext('webgl');
    if (!gl) return 'none';
  } catch { return 'none'; }
  const conn = navigator.connection;
  if (conn && conn.saveData) return 'none';
  const small = Math.min(window.innerWidth, window.innerHeight) < 700;
  const weak = (navigator.hardwareConcurrency || 8) <= 4 || (navigator.deviceMemory || 8) <= 4;
  return small || weak ? 'low' : 'high';
}
