import { describe, it, expect } from 'vitest';
import { validateCheckout } from './validate.js';

const good = {
  items: [{ id: 'origin', size: '250g', grind: 'whole', qty: 1 }],
  customer: { name: 'Ada Lovelace', email: 'ADA@example.com ', phone: '+1 (415) 555-0100' },
  fulfillment: { method: 'standard', address: { line1: '1 Market St', line2: '', city: 'San Francisco', state: 'ca', zip: '94105' } },
  payment: 'cod',
  notes: '',
};

describe('validateCheckout', () => {
  it('accepts a valid order and normalizes fields', () => {
    const r = validateCheckout(good);
    expect(r.ok).toBe(true);
    expect(r.value.customer.email).toBe('ada@example.com');
    expect(r.value.fulfillment.address.state).toBe('CA');
  });
  it('does not require an address for pickup', () => {
    const r = validateCheckout({ ...good, fulfillment: { method: 'pickup' } });
    expect(r.ok).toBe(true);
    expect(r.value.fulfillment.address).toBeNull();
  });
  it('rejects missing and malformed fields with per-field errors', () => {
    const r = validateCheckout({ ...good, customer: { name: '', email: 'nope' }, fulfillment: { method: 'standard', address: { line1: '', city: 'X', state: 'California', zip: '12' } } });
    expect(r.ok).toBe(false);
    expect(Object.keys(r.errors)).toEqual(expect.arrayContaining(['name', 'email', 'line1', 'city', 'state', 'zip']));
  });
  it('rejects empty carts, unknown payment and shipping methods', () => {
    expect(validateCheckout({ ...good, items: [] }).errors.items).toBeTruthy();
    expect(validateCheckout({ ...good, payment: 'bitcoin' }).errors.payment).toBeTruthy();
    expect(validateCheckout({ ...good, fulfillment: { method: 'drone' } }).errors.method).toBeTruthy();
  });
  it('rejects non-object input safely', () => {
    expect(validateCheckout(null).ok).toBe(false);
    expect(validateCheckout('x').ok).toBe(false);
    expect(validateCheckout({ ...good, customer: 'x' }).ok).toBe(false);
  });
  it('strips control characters and enforces lengths', () => {
    const r = validateCheckout({ ...good, customer: { ...good.customer, name: 'Ada\u0000 <b>L</b>' }, notes: 'x'.repeat(301) });
    expect(r.errors.notes).toBeTruthy();
    const r2 = validateCheckout({ ...good, customer: { ...good.customer, name: 'Ada\u0000 Lovelace' } });
    expect(r2.value.customer.name).toBe('Ada Lovelace');
  });
});
