import { SHIPPING } from './pricing.js';

export const PAYMENTS = [
  { id: 'card', label: 'Card (Stripe secure checkout)' },
  { id: 'cod', label: 'Pay on delivery / at pickup' },
];
export const US_STATES = 'AL AK AZ AR CA CO CT DE DC FL GA HI ID IL IN IA KS KY LA ME MD MA MI MN MS MO MT NE NV NH NJ NM NY NC ND OH OK OR PA RI SC SD TN TX UT VT VA WA WV WI WY'.split(' ');

const EMAIL = /^[^\s@<>()[\],;:"]{1,64}@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)+$/;
const ZIP = /^\d{5}(-\d{4})?$/;
const PHONE = /^[+()\-.\s\d]{7,20}$/;

// Remove control characters and collapse whitespace. Output is always rendered as text, never HTML.
const clean = (v) => (typeof v === 'string' ? v.replace(/[\u0000-\u001f\u007f]/g, '').replace(/\s+/g, ' ').trim() : '');
const obj = (v) => (v && typeof v === 'object' && !Array.isArray(v) ? v : null);

/** Validate checkout input. Returns { ok, value, errors } where errors is keyed by field. */
export function validateCheckout(body) {
  const errors = {};
  const b = obj(body);
  if (!b) return { ok: false, errors: { form: 'Invalid request.' }, value: null };

  const c = obj(b.customer) || {};
  if (!obj(b.customer)) errors.form = 'Customer details are required.';
  const name = clean(c.name);
  const email = clean(c.email).toLowerCase();
  const phone = clean(c.phone);
  if (name.length < 2 || name.length > 80) errors.name = 'Enter your full name.';
  if (!EMAIL.test(email) || email.length > 120) errors.email = 'Enter a valid email address.';
  if (phone && !PHONE.test(phone)) errors.phone = 'Enter a valid phone number.';

  const f = obj(b.fulfillment) || {};
  const method = clean(f.method);
  if (!SHIPPING.some((s) => s.id === method)) errors.method = 'Choose a delivery option.';
  let address = null;
  if (method && method !== 'pickup') {
    const a = obj(f.address) || {};
    address = { line1: clean(a.line1), line2: clean(a.line2), city: clean(a.city), state: clean(a.state).toUpperCase(), zip: clean(a.zip), country: 'US' };
    if (address.line1.length < 3 || address.line1.length > 120) errors.line1 = 'Enter a street address.';
    if (address.line2.length > 120) errors.line2 = 'Too long.';
    if (address.city.length < 2 || address.city.length > 60) errors.city = 'Enter a city.';
    if (!US_STATES.includes(address.state)) errors.state = 'Use a 2-letter US state, e.g. CA.';
    if (!ZIP.test(address.zip)) errors.zip = 'Enter a 5-digit ZIP code.';
  }

  const payment = clean(b.payment);
  if (!PAYMENTS.some((p) => p.id === payment)) errors.payment = 'Choose a payment method.';

  const notes = clean(b.notes);
  if (notes.length > 300) errors.notes = 'Keep notes under 300 characters.';

  if (!Array.isArray(b.items) || b.items.length === 0) errors.items = 'Your cart is empty.';

  const promo = clean(b.promo).toUpperCase().slice(0, 24);

  const ok = Object.keys(errors).length === 0;
  return {
    ok,
    errors,
    value: ok ? { items: b.items, customer: { name, email, phone }, fulfillment: { method, address }, payment, notes, promo } : null,
  };
}
