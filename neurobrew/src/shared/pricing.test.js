import { describe, it, expect } from 'vitest';
import { CATEGORIES, PRODUCTS, productById, unitPrice, normalizeLine, lineKey } from './catalog.js';
import { quote, shippingCost, FREE_SHIPPING_MIN } from './pricing.js';

describe('catalog', () => {
  it('has several categories, each with products', () => {
    expect(CATEGORIES.length).toBeGreaterThanOrEqual(6);
    CATEGORIES.forEach((c) => expect(PRODUCTS.some((p) => p.category === c.id)).toBe(true));
  });
  it('has unique ids and integer cent prices', () => {
    expect(new Set(PRODUCTS.map((p) => p.id)).size).toBe(PRODUCTS.length);
    PRODUCTS.forEach((p) => { expect(Number.isInteger(p.price)).toBe(true); expect(p.price).toBeGreaterThan(0); });
  });
  it('prices bean sizes up from the 250g base', () => {
    const p = productById('origin');
    expect(unitPrice(p, '250g')).toBe(p.price);
    expect(unitPrice(p, '500g')).toBeGreaterThan(p.price);
    expect(unitPrice(p, '1kg')).toBeGreaterThan(unitPrice(p, '500g'));
  });
  it('normalizes options and rejects unknown ones', () => {
    expect(normalizeLine({ id: 'origin', qty: 1 })).toMatchObject({ id: 'origin', size: '250g', grind: 'whole', qty: 1 });
    expect(normalizeLine({ id: 'origin', size: '9kg', qty: 1 })).toBeNull();
    expect(normalizeLine({ id: 'origin', grind: 'dust', qty: 1 })).toBeNull();
    expect(normalizeLine({ id: 'nope', qty: 1 })).toBeNull();
    expect(normalizeLine({ id: 'glass-cup', size: '1kg', grind: 'espresso', qty: 2 })).toMatchObject({ size: null, grind: null });
    expect(normalizeLine({ id: 'origin', qty: 0 })).toBeNull();
    expect(normalizeLine({ id: 'origin', qty: 2.5 })).toBeNull();
    expect(normalizeLine({ id: 'origin', qty: 99 })).toBeNull();
  });
  it('builds a stable key per product + options', () => {
    expect(lineKey({ id: 'origin', size: '500g', grind: 'espresso' })).toBe('origin|500g|espresso');
  });
});

describe('pricing', () => {
  it('ignores any client-supplied price and uses the catalogue', () => {
    const q = quote([{ id: 'origin', size: '250g', grind: 'whole', qty: 2, price: 1 }], { shipping: 'standard' });
    expect(q.subtotal).toBe(productById('origin').price * 2);
  });
  it('merges duplicate lines', () => {
    const q = quote([{ id: 'origin', qty: 1 }, { id: 'origin', qty: 2 }], { shipping: 'pickup' });
    expect(q.lines).toHaveLength(1);
    expect(q.lines[0].qty).toBe(3);
  });
  it('reports invalid lines instead of pricing them', () => {
    const q = quote([{ id: 'ghost', qty: 1 }], { shipping: 'pickup' });
    expect(q.errors.length).toBe(1);
    expect(q.total).toBe(0);
  });
  it('charges shipping below the free threshold and none above it', () => {
    expect(shippingCost('standard', FREE_SHIPPING_MIN - 1)).toBeGreaterThan(0);
    expect(shippingCost('standard', FREE_SHIPPING_MIN)).toBe(0);
    expect(shippingCost('express', 100000)).toBeGreaterThan(0);
    expect(shippingCost('pickup', 0)).toBe(0);
    expect(shippingCost('teleport', 0)).toBeNull();
  });
  it('applies percent and fixed promos, never below zero', () => {
    const items = [{ id: 'origin', qty: 1 }];
    const base = quote(items, { shipping: 'pickup' });
    const pct = quote(items, { shipping: 'pickup', promo: { type: 'percent', value: 10 } });
    expect(pct.discount).toBe(Math.round(base.subtotal * 0.1));
    const fixed = quote(items, { shipping: 'pickup', promo: { type: 'fixed', value: 500, min: 3000 } });
    expect(fixed.discount).toBe(0); // below minimum
    const huge = quote(items, { shipping: 'pickup', promo: { type: 'fixed', value: 999999 } });
    expect(huge.total).toBe(0);
  });
  it('totals = subtotal - discount + shipping', () => {
    const q = quote([{ id: 'kenya-aa', size: '500g', grind: 'filter', qty: 1 }], { shipping: 'express', promo: { type: 'percent', value: 10 } });
    expect(q.total).toBe(q.subtotal - q.discount + q.shipping);
  });
});
