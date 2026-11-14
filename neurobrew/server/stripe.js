// Minimal Stripe Checkout client over the REST API (no SDK). Only created when STRIPE_SECRET_KEY is set.
const API = 'https://api.stripe.com/v1';

function form(obj, prefix = '', out = new URLSearchParams()) {
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}[${k}]` : k;
    if (v === undefined || v === null) continue;
    if (typeof v === 'object') form(v, key, out);
    else out.append(key, String(v));
  }
  return out;
}

export function createStripe(secretKey) {
  if (!secretKey) return null;
  const call = async (method, path, body) => {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 15000);
    try {
      const res = await fetch(API + path, {
        method,
        headers: { authorization: `Bearer ${secretKey}`, 'content-type': 'application/x-www-form-urlencoded' },
        body: body ? form(body) : undefined,
        signal: ctrl.signal,
      });
      const json = await res.json();
      if (!res.ok) throw new Error(`Stripe ${res.status}: ${json?.error?.message || 'request failed'}`);
      return json;
    } finally { clearTimeout(t); }
  };

  return {
    /** lineItems: [{ name, unitAmount (cents), quantity }] — amounts come from the server's own quote. */
    async createSession({ orderId, email, lineItems, shipping, discount, successUrl, cancelUrl }) {
      const items = lineItems.map((l) => ({ price_data: { currency: 'usd', unit_amount: l.unitAmount, product_data: { name: l.name } }, quantity: l.quantity }));
      if (shipping > 0) items.push({ price_data: { currency: 'usd', unit_amount: shipping, product_data: { name: 'Shipping' } }, quantity: 1 });
      const body = {
        mode: 'payment',
        customer_email: email,
        client_reference_id: orderId,
        success_url: successUrl,
        cancel_url: cancelUrl,
        metadata: { order_id: orderId },
        line_items: Object.fromEntries(items.map((it, i) => [i, it])),
      };
      if (discount > 0) {
        const coupon = await call('POST', '/coupons', { amount_off: discount, currency: 'usd', duration: 'once', name: 'Promo' });
        body.discounts = { 0: { coupon: coupon.id } };
      }
      const s = await call('POST', '/checkout/sessions', body);
      return { id: s.id, url: s.url };
    },
    retrieveSession: (id) => call('GET', `/checkout/sessions/${encodeURIComponent(id)}`),
  };
}
