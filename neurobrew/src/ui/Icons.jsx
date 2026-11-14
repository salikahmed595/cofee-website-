const S = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.5, strokeLinecap: 'round', strokeLinejoin: 'round' };

export const Logo = (p) => (
  <svg viewBox="0 0 40 40" width="30" height="30" aria-hidden="true" {...p}>
    <ellipse cx="20" cy="20" rx="7.5" ry="11" fill="#3a1d0e" stroke="#ff9a52" strokeWidth="1.2" transform="rotate(35 20 20)" />
    <path d="M17 12c4 4-2 10 3 16" stroke="#ff9a52" strokeWidth="1.2" fill="none" transform="rotate(35 20 20)" />
    <ellipse cx="20" cy="20" rx="18" ry="6" fill="none" stroke="#ff7a2e" strokeWidth="1.6" transform="rotate(-20 20 20)" />
  </svg>
);

export const StageIcon = ({ id, size = 20 }) => {
  const p = { width: size, height: size, viewBox: '0 0 24 24', 'aria-hidden': true, ...S };
  switch (id) {
    case 'beans': return <svg {...p}><ellipse cx="12" cy="12" rx="6" ry="8.5" transform="rotate(35 12 12)" /><path d="M9.5 6.5c3 3-1.5 7 2.5 11" /></svg>;
    case 'roast': return <svg {...p}><path d="M12 3c1 3.5 5 5.5 5 10a5 5 0 0 1-10 0c0-2.2 1.2-3.6 2.4-4.6.3 1.6 1 2.6 2.1 3C10.6 8.8 11 5.6 12 3Z" /></svg>;
    case 'machine': return <svg {...p}><circle cx="12" cy="12" r="3" /><path d="M12 3v2.5M12 18.5V21M3 12h2.5M18.5 12H21M5.6 5.6l1.8 1.8M16.6 16.6l1.8 1.8M5.6 18.4l1.8-1.8M16.6 7.4l1.8-1.8" /></svg>;
    case 'brew': return <svg {...p}><path d="M12 3v3M8 4.5v2M16 4.5v2" /><path d="M5 9h14l-1.5 7a3 3 0 0 1-3 2.4h-5A3 3 0 0 1 6.5 16L5 9Z" /><path d="M8 21h8" /></svg>;
    case 'milk': return <svg {...p}><path d="M9 3h6M9.5 3v3L7 9.5V19a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V9.5L14.5 6V3" /><path d="M7 13h10" /></svg>;
    case 'cup': return <svg {...p}><path d="M4 9h13v4a6 6 0 0 1-6 6h-1a6 6 0 0 1-6-6V9Z" /><path d="M17 10h1.5a2.5 2.5 0 0 1 0 5H16.5" /><path d="M8 3.5c.8 1 .8 2 0 3M11.5 3.5c.8 1 .8 2 0 3" /></svg>;
    default: return null;
  }
};

export const Bag = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true" {...S}><path d="M5 8h14l-1.2 11.1a2 2 0 0 1-2 1.9H8.2a2 2 0 0 1-2-1.9L5 8Zm3 0V7a4 4 0 0 1 8 0v1" /></svg>
);
export const Arrow = ({ dir = 'right' }) => (
  <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true" {...S} style={{ transform: dir === 'down' ? 'rotate(90deg)' : dir === 'up' ? 'rotate(-90deg)' : undefined }}><path d="M5 12h14M13 6l6 6-6 6" /></svg>
);
export const Mouse = () => (
  <svg width="18" height="26" viewBox="0 0 18 26" aria-hidden="true" {...S}><rect x="1" y="1" width="16" height="24" rx="8" /><path className="mouse-wheel" d="M9 6v4" /></svg>
);
