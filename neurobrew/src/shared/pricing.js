import { productById, unitPrice, normalizeLine, lineKey, MAX_LINES, MAX_QTY } from './catalog.js';

export const FREE_SHIPPING_MIN = 5000;
export const SHIPPING = [
  { id: 'standard', label: 'Standard', eta: '3–5 business days', price: 599 },
  { id: 'express', label: 'Express', eta: '1–2 business days', price: 1499 },
  { id: 'pickup', label: 'Pickup', eta: 'Ready in 2 hours · Los Angeles lab', price: 0 },
];

/** Shipping cost in cents, or null for an unknown method. Standard is free over the threshold. */
export function shippingCost(method, merchandise) {
  const m = SHIPPING.find((s) => s.id === method);
  if (!m) return null;
  if (m.id === 'standard' && merchandise >= FREE_SHIPPING_MIN) return 0;
  return m.price;
}

/** Discount in cents for a promo definition ({type:'percent'|'fixed', value, min?}). */
function discountFor(promo, subtotal) {
  if (!promo || subtotal <= 0) return 0;
  if (promo.min && subtotal < promo.min) return 0;
  if (promo.type === 'percent') return Math.min(subtotal, Math.round(subtotal * (promo.value / 100)));
  if (promo.type === 'fixed') return Math.min(subtotal, promo.value);
  return 0;
}

/**
 * Price a cart from the catalogue. Client-sent prices are ignored on purpose.
 * Returns { lines, subtotal, discount, shipping, total, errors }.
 */
export function quote(items, { shipping = 'standard', promo = null } = {}) {
  const errors = [];
  const merged = new Map();
  (Array.isArray(items) ? items : []).forEach((raw, i) => {
    const n = normalizeLine(raw);
    if (!n) { errors.push({ index: i, message: 'This item is unavailable or has invalid options.' }); return; }
    const k = lineKey(n);
    const prev = merged.get(k);
    if (prev) prev.qty = Math.min(MAX_QTY, prev.qty + n.qty);
    else merged.set(k, { ...n });
  });
  if (merged.size > MAX_LINES) errors.push({ index: -1, message: `At most ${MAX_LINES} different items per order.` });

  const lines = [...merged.values()].slice(0, MAX_LINES).map((l) => {
    const p = productById(l.id);
    const unit = unitPrice(p, l.size);
    return { key: lineKey(l), id: l.id, name: p.name, size: l.size, grind: l.grind, qty: l.qty, unit, total: unit * l.qty };
  });
  const subtotal = lines.reduce((s, l) => s + l.total, 0);
  const discount = discountFor(promo, subtotal);
  const ship = lines.length ? shippingCost(shipping, subtotal - discount) : 0;
  return { lines, subtotal, discount, shipping: ship ?? 0, total: Math.max(0, subtotal - discount + (ship ?? 0)), errors };
}
