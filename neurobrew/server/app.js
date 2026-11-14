import express from 'express';
import { randomInt, timingSafeEqual, createHash } from 'node:crypto';
import { quote } from '../src/shared/pricing.js';
import { validateCheckout } from '../src/shared/validate.js';
import { STATUSES } from './db.js';

/* Promo codes live only on the server so they cannot be read from the browser bundle. */
const PROMOS = {
  NEURO10: { type: 'percent', value: 10, label: '10% off your order' },
  WELCOME5: { type: 'fixed', value: 500, min: 3000, label: '$5 off orders over $30' },
};
const promoFor = (code) => {
  const c = typeof code === 'string' ? code.trim().toUpperCase().slice(0, 24) : '';
  return c ? { code: c, def: PROMOS[c] || null } : null;
};

const ID_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const newOrderId = () => 'NB-' + Array.from({ length: 8 }, () => ID_ALPHABET[randomInt(ID_ALPHABET.length)]).join('');
const ORDER_ID = /^NB-[A-Z0-9]{8}$/;
const IDEMPOTENCY = /^[A-Za-z0-9_-]{8,64}$/;

/** What a customer may see about their order: no address, phone or email echoed back. */
const publicOrder = (o) => ({
  id: o.id, status: o.status, createdAt: o.createdAt, payment: o.payment,
  lines: o.lines, subtotal: o.subtotal, discount: o.discount, shipping: o.shipping, total: o.total,
  fulfillment: { method: o.fulfillment.method }, firstName: (o.customer.name || '').split(' ')[0],
});

/** Fixed-window in-memory limiter. Good for one instance; use Redis or the edge for several. */
function limiter(max, windowMs) {
  const hits = new Map();
  return (req, res, next) => {
    const now = Date.now();
    const k = req.ip || 'unknown';
    const h = hits.get(k);
    if (!h || now - h.start > windowMs) { hits.set(k, { start: now, n: 1 }); return next(); }
    if (h.n >= max) { res.set('retry-after', String(Math.ceil((h.start + windowMs - now) / 1000))); return res.status(429).json({ error: 'Too many requests. Please try again shortly.' }); }
    h.n += 1;
    if (hits.size > 10000) hits.clear(); // bound memory
    next();
  };
}

const sha = (s) => createHash('sha256').update(String(s)).digest();
const tokenOk = (given, expected) => Boolean(expected) && typeof given === 'string' && timingSafeEqual(sha(given), sha(expected));

export function createApp({ db, adminToken, stripe = null, publicUrl = 'http://localhost:5174', rateLimit = {}, logger = console, trustProxy = false }) {
  const app = express();
  app.disable('x-powered-by');
  if (trustProxy) app.set('trust proxy', 1);

  app.use((req, res, next) => {
    res.set({
      'x-content-type-options': 'nosniff',
      'x-frame-options': 'DENY',
      'referrer-policy': 'strict-origin-when-cross-origin',
      'permissions-policy': 'camera=(), microphone=(), geolocation=()',
    });
    if (req.path.startsWith('/api/')) res.set('cache-control', 'no-store');
    next();
  });
  app.use('/api', express.json({ limit: '20kb', strict: true }));

  const ordersLimit = limiter(rateLimit.orders ?? 20, rateLimit.windowMs ?? 10 * 60 * 1000);
  const lookupLimit = limiter(rateLimit.lookups ?? 40, rateLimit.windowMs ?? 10 * 60 * 1000);

  app.get('/api/health', (req, res) => res.json({ ok: true }));
  app.get('/api/config', (req, res) => res.json({ payments: stripe ? ['card', 'cod'] : ['cod'], pickup: 'NEUROBREW Lab · 1200 Sunset Blvd, Los Angeles, CA' }));

  app.post('/api/quote', lookupLimit, (req, res) => {
    const b = req.body || {};
    const promo = promoFor(b.promo);
    const q = quote(b.items, { shipping: typeof b.shipping === 'string' ? b.shipping : 'standard', promo: promo?.def });
    res.json({ ...q, promo: promo ? { code: promo.code, valid: Boolean(promo.def), label: promo.def?.label || 'This code is not valid.' } : null });
  });

  app.post('/api/orders', ordersLimit, async (req, res, next) => {
    try {
      const key = req.get('idempotency-key');
      if (key && IDEMPOTENCY.test(key)) {
        const existing = db.getByIdempotencyKey(key);
        if (existing) return res.status(200).json({ order: publicOrder(existing), checkoutUrl: existing.status === 'pending_payment' ? existing.checkoutUrl : undefined });
      }
      const v = validateCheckout(req.body);
      if (!v.ok) return res.status(400).json({ error: 'Please check the highlighted fields.', errors: v.errors });
      const { items, customer, fulfillment, payment, notes } = v.value;
      if (payment === 'card' && !stripe) return res.status(400).json({ error: 'Card payment is not available right now.', errors: { payment: 'Card payment is not available right now.' } });

      const promo = promoFor(v.value.promo);
      const q = quote(items, { shipping: fulfillment.method, promo: promo?.def });
      if (q.errors.length || q.lines.length === 0) return res.status(400).json({ error: 'Some items in your cart are no longer available.', errors: { items: q.errors.map((e) => e.message).join(' ') || 'Your cart is empty.' } });

      const order = {
        id: newOrderId(),
        status: payment === 'card' ? 'pending_payment' : 'received',
        customer, fulfillment, payment, notes,
        promo: promo?.def ? promo.code : null,
        lines: q.lines, subtotal: q.subtotal, discount: q.discount, shipping: q.shipping, total: q.total,
      };
      const saved = db.insertOrder(order, key && IDEMPOTENCY.test(key) ? key : null);
      logger.info?.(`[order] ${saved.id} ${saved.status} ${saved.total}c ${saved.payment}`);

      if (payment === 'card') {
        const session = await stripe.createSession({
          orderId: saved.id,
          email: customer.email,
          lineItems: q.lines.map((l) => ({ name: l.name, unitAmount: l.unit, quantity: l.qty })),
          shipping: q.shipping,
          discount: q.discount,
          successUrl: `${publicUrl}/?order=${saved.id}&session_id={CHECKOUT_SESSION_ID}#confirmation`,
          cancelUrl: `${publicUrl}/#checkout`,
        });
        db.setSession(saved.id, session.id, session.url);
        return res.status(201).json({ order: publicOrder(saved), checkoutUrl: session.url });
      }
      return res.status(201).json({ order: publicOrder(saved) });
    } catch (e) { next(e); }
  });

  // Called by the confirmation page after Stripe redirects back. Trusts Stripe, not the browser.
  app.get('/api/orders/:id/confirm', lookupLimit, async (req, res, next) => {
    try {
      const { id } = req.params;
      const sid = String(req.query.session_id || '');
      const o = ORDER_ID.test(id) ? db.getOrder(id) : null;
      if (!o || !o.stripeSession || !tokenOk(sid, o.stripeSession)) return res.status(404).json({ error: 'Order not found.' });
      if (o.status === 'pending_payment' && stripe) {
        const s = await stripe.retrieveSession(o.stripeSession);
        if (s?.metadata?.order_id !== o.id) return res.status(400).json({ error: 'Payment does not match this order.' });
        if (s.payment_status === 'paid') return res.json({ order: publicOrder(db.setStatus(o.id, 'paid')) });
      }
      return res.json({ order: publicOrder(o) });
    } catch (e) { next(e); }
  });

  app.post('/api/orders/lookup', lookupLimit, (req, res) => {
    const id = String(req.body?.id || '').trim().toUpperCase();
    const email = String(req.body?.email || '').trim().toLowerCase();
    const o = ORDER_ID.test(id) ? db.getOrder(id) : null;
    // Same response for "no such order" and "wrong email" so order ids cannot be probed.
    if (!o || !tokenOk(email, o.email)) return res.status(404).json({ error: 'We could not find an order with those details.' });
    res.json({ order: publicOrder(o) });
  });

  // ---- admin ----
  const admin = (req, res, next) => {
    const h = req.get('authorization') || '';
    const token = h.startsWith('Bearer ') ? h.slice(7) : '';
    if (!tokenOk(token, adminToken)) return res.status(401).json({ error: 'Unauthorized.' });
    next();
  };
  app.get('/api/admin/orders', lookupLimit, admin, (req, res) => res.json({ orders: db.listOrders(200), statuses: STATUSES }));
  app.patch('/api/admin/orders/:id', admin, (req, res) => {
    const status = req.body?.status;
    if (!STATUSES.includes(status)) return res.status(400).json({ error: 'Unknown status.' });
    const o = ORDER_ID.test(req.params.id) ? db.getOrder(req.params.id) : null;
    if (!o) return res.status(404).json({ error: 'Order not found.' });
    res.json({ order: db.setStatus(o.id, status) });
  });

  app.use('/api', (req, res) => res.status(404).json({ error: 'Not found.' }));

  // JSON errors; never leak stack traces.
  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    if (err?.type === 'entity.too.large') return res.status(413).json({ error: 'Request too large.' });
    if (err?.type === 'entity.parse.failed') return res.status(400).json({ error: 'Malformed JSON.' });
    logger.error?.('[error]', err?.message || err);
    res.status(500).json({ error: 'Something went wrong. Please try again.' });
  });

  return app;
}
