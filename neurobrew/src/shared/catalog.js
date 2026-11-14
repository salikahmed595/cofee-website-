/* Single source of truth for products and prices, shared by the browser and the API.
   Prices are integer US cents. The server always re-prices orders from this file. */

export const CATEGORIES = [
  { id: 'espresso', label: 'Espresso blends', blurb: 'Engineered for crema and body.' },
  { id: 'single-origin', label: 'Single origin', blurb: 'One farm, one region, one story.' },
  { id: 'cold-brew', label: 'Cold brew', blurb: 'Slow-steeped, nitro-charged.' },
  { id: 'decaf', label: 'Decaf', blurb: 'All the flavour, Swiss-water decaffeinated.' },
  { id: 'capsules', label: 'Capsules', blurb: 'Precision-dosed, fully compostable.' },
  { id: 'gear', label: 'Brew gear', blurb: 'The tools from the journey, for your counter.' },
];

/** option kinds: 'beans' → size + grind, 'pack' → pack size, 'none' → no options */
export const SIZES = {
  beans: [
    { id: '250g', label: '250 g', mult: 1 },
    { id: '500g', label: '500 g', mult: 1.85 },
    { id: '1kg', label: '1 kg', mult: 3.4 },
  ],
  pack: [
    { id: '10', label: '10 pods', mult: 1 },
    { id: '30', label: '30 pods', mult: 2.8 },
    { id: '50', label: '50 pods', mult: 4.5 },
  ],
};
export const GRINDS = [
  { id: 'whole', label: 'Whole bean' },
  { id: 'espresso', label: 'Espresso' },
  { id: 'filter', label: 'Filter / pour-over' },
  { id: 'french', label: 'French press' },
  { id: 'cold', label: 'Cold brew (coarse)' },
];
export const MAX_QTY = 20;
export const MAX_LINES = 30;

export const PRODUCTS = [
  // espresso
  { id: 'origin', category: 'espresso', name: 'Origin Blend', tag: 'Signature', options: 'beans', price: 2400, roast: 2, notes: 'Cocoa · stone fruit · caramel', desc: 'Our house espresso. Brazil and Ethiopia, roasted for a dense, syrupy shot that loves milk.' },
  { id: 'midnight', category: 'espresso', name: 'Midnight Roast', tag: 'Bold', options: 'beans', price: 2600, roast: 3, notes: 'Dark chocolate · molasses · smoke', desc: 'Deep, low-acid and unapologetically bold. Built for ristretto and long milk drinks.' },
  { id: 'neural-crema', category: 'espresso', name: 'Neural Crema', tag: 'New', options: 'beans', price: 2700, roast: 2, notes: 'Hazelnut · brown sugar · orange zest', desc: 'Profiled by our roast AI for the thickest crema we have ever pulled.' },
  { id: 'copper-core', category: 'espresso', name: 'Copper Core', tag: 'Balanced', options: 'beans', price: 2500, roast: 2, notes: 'Toffee · red apple · almond', desc: 'An everyday espresso that stays sweet across a wide brew window.' },
  // single origin
  { id: 'yirgacheffe', category: 'single-origin', name: 'Ethiopia Yirgacheffe', tag: 'Floral', options: 'beans', price: 2900, roast: 1, notes: 'Jasmine · bergamot · lemon', desc: 'Washed heirloom varieties grown at 2,000 m. Bright, tea-like and aromatic.' },
  { id: 'huila', category: 'single-origin', name: 'Colombia Huila', tag: 'Sweet', options: 'beans', price: 2700, roast: 2, notes: 'Panela · cherry · milk chocolate', desc: 'Smallholder lots from the slopes of Huila. Round, sweet and juicy.' },
  { id: 'antigua', category: 'single-origin', name: 'Guatemala Antigua', tag: 'Volcanic', options: 'beans', price: 2800, roast: 2, notes: 'Cocoa · spice · plum', desc: 'Grown in volcanic soil between three volcanoes. Structured and complex.' },
  { id: 'kenya-aa', category: 'single-origin', name: 'Kenya AA', tag: 'Limited', options: 'beans', price: 3200, roast: 1, notes: 'Blackcurrant · grapefruit · cane sugar', desc: 'Top-grade AA beans with vivid, winey acidity. Small batch.' },
  // cold brew
  { id: 'cold-core', category: 'cold-brew', name: 'Cold Core Concentrate', tag: '1 L', options: 'none', price: 1800, notes: 'Chocolate · cola · vanilla', desc: '18-hour steeped concentrate. Mix 1:1 with milk or water. Keep refrigerated.' },
  { id: 'nitro-cans', category: 'cold-brew', name: 'Nitro Cold Brew · 4 pack', tag: 'Nitro', options: 'none', price: 1600, notes: 'Velvet · cocoa · malt', desc: 'Nitrogen-infused cold brew in 250 ml cans. Pour hard for the cascade.' },
  { id: 'cold-pack', category: 'cold-brew', name: 'Cold Brew Blend', tag: 'DIY', options: 'beans', price: 2300, roast: 2, notes: 'Fudge · cherry · walnut', desc: 'A blend designed for long, cold immersion. Choose the coarse grind.' },
  // decaf
  { id: 'velvet', category: 'decaf', name: 'Velvet Decaf', tag: 'Swiss water', options: 'beans', price: 2200, roast: 2, notes: 'Honey · almond · soft citrus', desc: 'Chemical-free decaf that still tastes like a proper coffee.' },
  { id: 'midnight-decaf', category: 'decaf', name: 'Midnight Decaf', tag: 'Dark', options: 'beans', price: 2400, roast: 3, notes: 'Cocoa · toasted nut · molasses', desc: 'Our bold roast profile, minus the caffeine. Great after dinner.' },
  // capsules
  { id: 'pulse-espresso', category: 'capsules', name: 'Pulse Capsules · Espresso', tag: 'Compostable', options: 'pack', price: 900, notes: 'Intensity 9 · cocoa · caramel', desc: 'Nespresso® Original compatible. Nitrogen-flushed and home-compostable.' },
  { id: 'pulse-lungo', category: 'capsules', name: 'Pulse Capsules · Lungo', tag: 'Compostable', options: 'pack', price: 900, notes: 'Intensity 6 · biscuit · citrus', desc: 'A longer, lighter cup. Nespresso® Original compatible.' },
  // gear
  { id: 'glass-cup', category: 'gear', name: 'Neuro Glass Cup', tag: 'Double wall', options: 'none', price: 3200, notes: '300 ml · borosilicate', desc: 'The cup from the journey. Double-walled so your latte art floats.' },
  { id: 'pitcher', category: 'gear', name: 'Precision Pitcher', tag: 'Steel', options: 'none', price: 3800, notes: '600 ml · etched gauge', desc: 'Weighted stainless pitcher with a sharp spout for clean latte art.' },
  { id: 'grinder-x1', category: 'gear', name: 'Burr Grinder X1', tag: 'Pro', options: 'none', price: 18900, notes: '64 mm flat burrs · 0.5 µm steps', desc: 'The same burr geometry as our flagship machine, for your kitchen.' },
  { id: 'scale', category: 'gear', name: 'Neuro Scale', tag: 'Smart', options: 'none', price: 6900, notes: '0.1 g · flow-rate timer', desc: 'Brew scale with auto-start timer and live flow rate.' },
];

const BY_ID = new Map(PRODUCTS.map((p) => [p.id, p]));
export const productById = (id) => (typeof id === 'string' ? BY_ID.get(id) : undefined) || null;

export function unitPrice(product, size) {
  if (!product) return 0;
  const list = SIZES[product.options];
  if (!list) return product.price;
  const s = list.find((x) => x.id === size) || list[0];
  return Math.round(product.price * s.mult);
}

/** Validate and canonicalize a cart line. Returns null for anything we do not sell. */
export function normalizeLine(line) {
  if (!line || typeof line !== 'object') return null;
  const product = productById(line.id);
  if (!product) return null;
  const qty = line.qty;
  if (!Number.isInteger(qty) || qty < 1 || qty > MAX_QTY) return null;
  let size = null, grind = null;
  if (product.options === 'beans' || product.options === 'pack') {
    const list = SIZES[product.options];
    size = line.size == null ? list[0].id : line.size;
    if (!list.some((s) => s.id === size)) return null;
  }
  if (product.options === 'beans') {
    grind = line.grind == null ? 'whole' : line.grind;
    if (!GRINDS.some((g) => g.id === grind)) return null;
  }
  return { id: product.id, size, grind, qty };
}

export const lineKey = (l) => `${l.id}|${l.size || ''}|${l.grind || ''}`;

export function optionLabel(line) {
  const p = productById(line.id);
  if (!p) return '';
  const parts = [];
  const s = SIZES[p.options]?.find((x) => x.id === line.size);
  if (s) parts.push(s.label);
  const g = GRINDS.find((x) => x.id === line.grind);
  if (g) parts.push(g.label);
  return parts.join(' · ');
}

export const money = (cents) => '$' + (cents / 100).toFixed(2);
