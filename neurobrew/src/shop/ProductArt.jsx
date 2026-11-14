// Procedural neon product art (no image downloads). One look per category, tinted per product.
const ACCENT = { espresso: '#ff6a00', 'single-origin': '#ffb13b', 'cold-brew': '#ff8f3a', decaf: '#ffd08a', capsules: '#ff4d1a', gear: '#ffa44f' };

function Bag({ p, a, u }) {
  return (
    <>
      <path d="M62 52h76l8 118a10 10 0 0 1-10 11H64a10 10 0 0 1-10-11Z" fill={`url(#${u}-b)`} stroke={a} strokeWidth="1.4" filter={`url(#${u}-g)`} />
      <path d="M62 52l8-14h60l8 14" fill="#120b07" stroke={a} strokeOpacity=".6" />
      <rect x="74" y="88" width="52" height="54" rx="6" fill="rgba(0,0,0,.45)" stroke={a} strokeOpacity=".45" />
      <ellipse cx="100" cy="106" rx="8" ry="11" transform="rotate(30 100 106)" fill={a} opacity=".9" />
      <text x="100" y="132" textAnchor="middle" fontSize="6.5" letterSpacing="1.4" fill="#fff" opacity=".85">{p.name.split(' ')[0].toUpperCase()}</text>
      {[1, 2, 3].map((i) => <circle key={i} cx={88 + i * 6} cy="152" r="2.2" fill={i <= (p.roast || 0) ? a : 'rgba(255,255,255,.18)'} />)}
    </>
  );
}
function Bottle({ a, can, u }) {
  return can ? (
    <>{[-34, 0, 34].map((x, i) => (
      <g key={x} transform={`translate(${x} ${i === 1 ? -6 : 4})`}>
        <rect x="86" y="62" width="28" height="104" rx="6" fill={`url(#${u}-b)`} stroke={a} strokeWidth="1.2" filter={`url(#${u}-g)`} />
        <rect x="86" y="96" width="28" height="22" fill={a} opacity=".85" />
        <ellipse cx="100" cy="63" rx="14" ry="3" fill="#2a1a10" stroke={a} strokeOpacity=".6" />
      </g>))}</>
  ) : (
    <>
      <path d="M90 40h20v22c14 6 20 16 20 30v72a10 10 0 0 1-10 10H80a10 10 0 0 1-10-10V92c0-14 6-24 20-30Z" fill={`url(#${u}-b)`} stroke={a} strokeWidth="1.4" filter={`url(#${u}-g)`} />
      <rect x="88" y="30" width="24" height="12" rx="3" fill={a} />
      <path d="M72 120h56v30H72z" fill={a} opacity=".85" />
      <path d="M74 100h52" stroke="#fff" strokeOpacity=".15" />
    </>
  );
}
function Capsules({ a, u }) {
  return (<>{[[64, 120], [100, 96], [136, 120], [82, 150], [118, 150]].map(([x, y], i) => (
    <g key={i} filter={`url(#${u}-g)`}>
      <path d={`M${x - 18} ${y - 6}h36l-6 22h-24Z`} fill={`url(#${u}-b)`} stroke={a} strokeWidth="1.2" />
      <ellipse cx={x} cy={y - 6} rx="20" ry="5" fill={a} />
    </g>))}</>);
}
function Gear({ p, a, u }) {
  if (p.id === 'glass-cup') return (<g filter={`url(#${u}-g)`}><path d="M62 70h76v62a26 26 0 0 1-26 26H88a26 26 0 0 1-26-26Z" fill="rgba(255,255,255,.04)" stroke={a} strokeWidth="1.6" /><path d="M66 104h68v28a22 22 0 0 1-22 22H88a22 22 0 0 1-22-22Z" fill="#3a1d0e" /><ellipse cx="100" cy="104" rx="34" ry="5" fill="#c99566" /><path d="M138 84h8a14 14 0 0 1 0 28h-8" fill="none" stroke={a} strokeWidth="1.6" /></g>);
  if (p.id === 'pitcher') return (<g filter={`url(#${u}-g)`}><path d="M70 64h56l-8 12 10 90a8 8 0 0 1-8 8H76a8 8 0 0 1-8-8Z" fill={`url(#${u}-b)`} stroke={a} strokeWidth="1.6" /><path d="M126 64l18-8" stroke={a} strokeWidth="2" /><path d="M118 90h14a12 12 0 0 1 0 24h-10" fill="none" stroke={a} strokeWidth="1.6" /></g>);
  if (p.id === 'scale') return (<g filter={`url(#${u}-g)`}><rect x="46" y="110" width="108" height="40" rx="10" fill={`url(#${u}-b)`} stroke={a} strokeWidth="1.6" /><rect x="60" y="120" width="44" height="18" rx="3" fill="#000" /><text x="82" y="133" textAnchor="middle" fontSize="10" fill={a} fontFamily="monospace">18.0g</text><circle cx="132" cy="129" r="6" fill={a} /></g>);
  return (<g filter={`url(#${u}-g)`}><path d="M78 40h44l-8 30H86Z" fill="rgba(255,255,255,.05)" stroke={a} strokeWidth="1.4" /><rect x="64" y="70" width="72" height="80" rx="10" fill={`url(#${u}-b)`} stroke={a} strokeWidth="1.6" /><circle cx="100" cy="104" r="16" fill="none" stroke={a} strokeWidth="2" /><circle cx="100" cy="104" r="5" fill={a} /><rect x="74" y="150" width="52" height="16" rx="4" fill="#1a110b" stroke={a} strokeOpacity=".5" /></g>);
}

export default function ProductArt({ product, size = 200 }) {
  const a = ACCENT[product.category] || '#ff6a00';
  const id = `g-${product.id}`;
  let inner;
  if (product.category === 'capsules') inner = <Capsules a={a} u={id} />;
  else if (product.category === 'gear') inner = <Gear p={product} a={a} u={id} />;
  else if (product.options === 'none') inner = <Bottle a={a} u={id} can={product.id === 'nitro-cans'} />;
  else inner = <Bag p={product} a={a} u={id} />;
  return (
    <svg className="art" viewBox="0 0 200 200" width={size} height={size} aria-hidden="true" style={{ '--accent': a }}>
      <defs>
        <radialGradient id={`${id}-halo`} cx="50%" cy="55%" r="50%"><stop offset="0" stopColor={a} stopOpacity=".55" /><stop offset="1" stopColor={a} stopOpacity="0" /></radialGradient>
        <linearGradient id={`${id}-b`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#2b1c13" /><stop offset="1" stopColor="#0b0705" /></linearGradient>
        <filter id={`${id}-g`} x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="2.4" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
      </defs>
      <circle cx="100" cy="112" r="92" fill={`url(#${id}-halo)`} />
      <ellipse cx="100" cy="182" rx="66" ry="7" fill="none" stroke={a} strokeOpacity=".7" />
      <ellipse cx="100" cy="182" rx="44" ry="4.5" fill="none" stroke={a} strokeOpacity=".35" />
      {inner}
    </svg>
  );
}
