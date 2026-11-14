import { describe, it, expect } from 'vitest';
import { cartReducer, cartCount, loadCart } from './cart.js';

describe('cart reducer', () => {
  it('adds, merges, updates and removes lines', () => {
    let s = cartReducer([], { type: 'add', line: { id: 'origin', size: '500g', grind: 'espresso', qty: 1 } });
    s = cartReducer(s, { type: 'add', line: { id: 'origin', size: '500g', grind: 'espresso', qty: 2 } });
    expect(s).toHaveLength(1);
    expect(s[0].qty).toBe(3);
    s = cartReducer(s, { type: 'add', line: { id: 'glass-cup', qty: 1 } });
    expect(cartCount(s)).toBe(4);
    s = cartReducer(s, { type: 'qty', key: 'origin|500g|espresso', qty: 5 });
    expect(s[0].qty).toBe(5);
    s = cartReducer(s, { type: 'qty', key: 'origin|500g|espresso', qty: 0 });
    expect(s).toHaveLength(1);
    s = cartReducer(s, { type: 'remove', key: 'glass-cup||' });
    expect(s).toHaveLength(0);
  });
  it('ignores invalid lines and caps quantity', () => {
    expect(cartReducer([], { type: 'add', line: { id: 'ghost', qty: 1 } })).toEqual([]);
    const s = cartReducer([], { type: 'add', line: { id: 'origin', qty: 15 } });
    expect(cartReducer(s, { type: 'add', line: { id: 'origin', qty: 15 } })[0].qty).toBe(20);
  });
  it('clears', () => {
    expect(cartReducer([{ id: 'origin', size: '250g', grind: 'whole', qty: 1 }], { type: 'clear' })).toEqual([]);
  });
  it('loads safely from corrupt storage', () => {
    expect(loadCart({ getItem: () => '{bad json' })).toEqual([]);
    expect(loadCart({ getItem: () => { throw new Error('blocked'); } })).toEqual([]);
    expect(loadCart({ getItem: () => JSON.stringify([{ id: 'origin', qty: 2 }, { id: 'ghost', qty: 1 }]) })).toHaveLength(1);
  });
});
