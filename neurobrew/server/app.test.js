// Integration tests: real HTTP server + real (in-memory) SQLite. Only Stripe is faked.
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createApp } from './app.js';
import { openDb } from './db.js';
import { productById } from '../src/shared/catalog.js';

const ADMIN = 'test-admin-token-0123456789';
let server, base, db, stripeCalls;

const fakeStripe = {
  async createSession(args) { stripeCalls.push(args); this.lastOrder = args.orderId; return { id: 'cs_test_1', url: 'https://checkout.stripe.test/cs_test_1' }; },
  async retrieveSession(id) { return { id, payment_status: this.paid ? 'paid' : 'unpaid', metadata: { order_id: this.lastOrder } }; },
  lastOrder: null,
  paid: false,
};

async function start(opts = {}) {
  db = openDb(':memory:');
  const app = createApp({ db, adminToken: ADMIN, stripe: opts.noStripe ? null : fakeStripe, publicUrl: 'http://localhost:5174', rateLimit: opts.rateLimit });
  await new Promise((r) => { server = app.listen(0, '127.0.0.1', r); });
  base = `http://127.0.0.1:${server.address().port}`;
}
const post = (path, body, headers = {}) => fetch(base + path, { method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: typeof body === 'string' ? body : JSON.stringify(body) });

const order = (over = {}) => ({
  items: [{ id: 'origin', size: '500g', grind: 'espresso', qty: 2, price: 1 }],
  customer: { name: 'Ada Lovelace', email: 'ada@example.com', phone: '' },
  fulfillment: { method: 'standard', address: { line1: '1 Market St', line2: '', city: 'San Francisco', state: 'CA', zip: '94105' } },
  payment: 'cod',
  notes: '',
  ...over,
});

beforeEach(async () => { stripeCalls = []; await start(); });
afterEach(async () => { await new Promise((r) => server.close(r)); db.close(); });

describe('API', () => {
  it('health and config', async () => {
    expect((await (await fetch(base + '/api/health')).json()).ok).toBe(true);
    const cfg = await (await fetch(base + '/api/config')).json();
    expect(cfg.payments).toEqual(expect.arrayContaining(['cod', 'card']));
  });

  it('sets security headers', async () => {
    const r = await fetch(base + '/api/health');
    expect(r.headers.get('x-content-type-options')).toBe('nosniff');
    expect(r.headers.get('x-powered-by')).toBeNull();
  });

  it('quotes with a valid promo code and rejects an unknown one', async () => {
    const ok = await (await post('/api/quote', { items: order().items, shipping: 'standard', promo: 'neuro10' })).json();
    expect(ok.promo.valid).toBe(true);
    expect(ok.discount).toBeGreaterThan(0);
    const bad = await (await post('/api/quote', { items: order().items, shipping: 'standard', promo: 'FREE100' })).json();
    expect(bad.promo.valid).toBe(false);
    expect(bad.discount).toBe(0);
  });

  it('creates a pay-on-delivery order, priced by the server, and persists it', async () => {
    const r = await post('/api/orders', order());
    expect(r.status).toBe(201);
    const { order: o } = await r.json();
    expect(o.id).toMatch(/^NB-[A-Z0-9]{8}$/);
    expect(o.status).toBe('received');
    const unit = Math.round(productById('origin').price * 1.85);
    expect(o.subtotal).toBe(unit * 2);
    const row = db.getOrder(o.id);
    expect(row.email).toBe('ada@example.com');
    expect(row.total).toBe(o.total);
  });

  it('rejects invalid orders with field errors and stores nothing', async () => {
    const r = await post('/api/orders', order({ customer: { name: '', email: 'x' } }));
    expect(r.status).toBe(400);
    const body = await r.json();
    expect(body.errors.email).toBeTruthy();
    expect(db.listOrders().length).toBe(0);
  });

  it('rejects malformed JSON and oversized bodies', async () => {
    expect((await post('/api/orders', '{bad')).status).toBe(400);
    expect((await post('/api/orders', { ...order(), notes: 'x'.repeat(60000) })).status).toBe(413);
  });

  it('is idempotent for a repeated Idempotency-Key', async () => {
    const h = { 'idempotency-key': 'abc-123-def-456' };
    const a = await (await post('/api/orders', order(), h)).json();
    const b = await (await post('/api/orders', order(), h)).json();
    expect(a.order.id).toBe(b.order.id);
    expect(db.listOrders().length).toBe(1);
  });

  it('card payment creates a Stripe session with server prices, and confirms only when paid', async () => {
    const r = await post('/api/orders', order({ payment: 'card' }));
    expect(r.status).toBe(201);
    const body = await r.json();
    expect(body.checkoutUrl).toContain('checkout.stripe.test');
    expect(body.order.status).toBe('pending_payment');
    expect(stripeCalls[0].lineItems[0].unitAmount).toBe(Math.round(productById('origin').price * 1.85));
    expect(stripeCalls[0].successUrl).toContain('{CHECKOUT_SESSION_ID}');
    const confirm = (sid) => fetch(`${base}/api/orders/${body.order.id}/confirm?session_id=${sid}`);
    fakeStripe.paid = false;
    expect((await (await confirm('cs_test_1')).json()).order.status).toBe('pending_payment');
    // a session id that is not the one issued for this order is refused
    fakeStripe.paid = true;
    expect((await confirm('cs_someone_else')).status).toBe(404);
    // the issued session, but Stripe says it belongs to another order → refused
    fakeStripe.lastOrder = 'NB-OTHER000';
    expect((await confirm('cs_test_1')).status).toBe(400);
    fakeStripe.lastOrder = body.order.id;
    expect((await (await confirm('cs_test_1')).json()).order.status).toBe('paid');
    fakeStripe.paid = false;
  });

  it('refuses card payment when Stripe is not configured', async () => {
    await new Promise((r) => server.close(r)); db.close();
    await start({ noStripe: true });
    const cfg = await (await fetch(base + '/api/config')).json();
    expect(cfg.payments).not.toContain('card');
    expect((await post('/api/orders', order({ payment: 'card' }))).status).toBe(400);
  });

  it('order lookup needs the matching email and does not reveal existence otherwise', async () => {
    const { order: o } = await (await post('/api/orders', order())).json();
    const ok = await post('/api/orders/lookup', { id: o.id, email: 'ADA@example.com' });
    expect(ok.status).toBe(200);
    const pub = (await ok.json()).order;
    expect(pub.lines.length).toBe(1);
    expect(pub.customer).toBeUndefined(); // no PII echoed back beyond what is needed
    const wrong = await post('/api/orders/lookup', { id: o.id, email: 'eve@example.com' });
    const missing = await post('/api/orders/lookup', { id: 'NB-ZZZZZZZZ', email: 'ada@example.com' });
    expect(wrong.status).toBe(404);
    expect(missing.status).toBe(404);
    expect(await wrong.text()).toBe(await missing.text());
  });

  it('admin endpoints require the bearer token', async () => {
    await post('/api/orders', order());
    expect((await fetch(base + '/api/admin/orders')).status).toBe(401);
    expect((await fetch(base + '/api/admin/orders', { headers: { authorization: 'Bearer wrong' } })).status).toBe(401);
    const r = await fetch(base + '/api/admin/orders', { headers: { authorization: `Bearer ${ADMIN}` } });
    expect(r.status).toBe(200);
    const { orders } = await r.json();
    expect(orders[0].customer.email).toBe('ada@example.com');
  });

  it('admin can move an order through valid statuses only', async () => {
    const { order: o } = await (await post('/api/orders', order())).json();
    const patch = (status) => fetch(`${base}/api/admin/orders/${o.id}`, { method: 'PATCH', headers: { 'content-type': 'application/json', authorization: `Bearer ${ADMIN}` }, body: JSON.stringify({ status }) });
    expect((await patch('shipped')).status).toBe(200);
    expect(db.getOrder(o.id).status).toBe('shipped');
    expect((await patch('hacked')).status).toBe(400);
  });

  it('rate-limits order creation per client', async () => {
    await new Promise((r) => server.close(r)); db.close();
    await start({ rateLimit: { orders: 2, windowMs: 60000 } });
    expect((await post('/api/orders', order())).status).toBe(201);
    expect((await post('/api/orders', order())).status).toBe(201);
    expect((await post('/api/orders', order())).status).toBe(429);
  });
});
