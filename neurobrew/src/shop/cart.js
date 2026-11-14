import { normalizeLine, lineKey, MAX_QTY, MAX_LINES } from '../shared/catalog.js';

export const CART_KEY = 'nb-cart-v1';

export function cartReducer(state, action) {
  switch (action.type) {
    case 'add': {
      const n = normalizeLine({ ...action.line, qty: Math.min(MAX_QTY, action.line?.qty ?? 1) });
      if (!n) return state;
      const k = lineKey(n);
      const i = state.findIndex((l) => lineKey(l) === k);
      if (i >= 0) return state.map((l, j) => (j === i ? { ...l, qty: Math.min(MAX_QTY, l.qty + n.qty) } : l));
      if (state.length >= MAX_LINES) return state;
      return [...state, n];
    }
    case 'qty': {
      const q = Math.max(0, Math.min(MAX_QTY, Math.floor(Number(action.qty) || 0)));
      if (q === 0) return state.filter((l) => lineKey(l) !== action.key);
      return state.map((l) => (lineKey(l) === action.key ? { ...l, qty: q } : l));
    }
    case 'remove': return state.filter((l) => lineKey(l) !== action.key);
    case 'clear': return [];
    default: return state;
  }
}

export const cartCount = (cart) => cart.reduce((s, l) => s + l.qty, 0);

/** Read the cart from storage, dropping anything invalid. Never throws. */
export function loadCart(storage) {
  try {
    const raw = JSON.parse(storage.getItem(CART_KEY) || '[]');
    if (!Array.isArray(raw)) return [];
    return raw.reduce((s, l) => cartReducer(s, { type: 'add', line: l }), []);
  } catch {
    return [];
  }
}

export function saveCart(storage, cart) {
  try { storage.setItem(CART_KEY, JSON.stringify(cart)); } catch { /* storage blocked — cart stays in memory */ }
}
