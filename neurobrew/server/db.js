// Order storage on SQLite (built into Node >= 22.5). One file, transactional, no native build step.
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

const require = createRequire(import.meta.url);

export const STATUSES = ['pending_payment', 'received', 'paid', 'preparing', 'shipped', 'delivered', 'cancelled'];

export function openDb(file) {
  // Silence the one-time "SQLite is experimental" warning; the API is stable in Node 22 LTS.
  const emit = process.emitWarning;
  process.emitWarning = (w, ...rest) => (String(w).includes('SQLite') ? undefined : emit.call(process, w, ...rest));
  const { DatabaseSync } = require('node:sqlite');
  process.emitWarning = emit;

  if (file !== ':memory:') mkdirSync(dirname(file), { recursive: true });
  const db = new DatabaseSync(file);
  db.exec(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      status TEXT NOT NULL,
      email TEXT NOT NULL,
      payment TEXT NOT NULL,
      total INTEGER NOT NULL,
      idempotency_key TEXT UNIQUE,
      stripe_session TEXT,
      checkout_url TEXT,
      data TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS orders_created ON orders(created_at DESC);
  `);

  const q = {
    insert: db.prepare(`INSERT INTO orders (id, created_at, updated_at, status, email, payment, total, idempotency_key, stripe_session, data)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`),
    get: db.prepare('SELECT * FROM orders WHERE id = ?'),
    byKey: db.prepare('SELECT * FROM orders WHERE idempotency_key = ?'),
    list: db.prepare('SELECT * FROM orders ORDER BY created_at DESC LIMIT ?'),
    status: db.prepare('UPDATE orders SET status = ?, updated_at = ? WHERE id = ?'),
    session: db.prepare('UPDATE orders SET stripe_session = ?, checkout_url = ?, updated_at = ? WHERE id = ?'),
  };
  const hydrate = (row) => (row ? { ...JSON.parse(row.data), id: row.id, status: row.status, createdAt: row.created_at, updatedAt: row.updated_at, email: row.email, total: row.total, stripeSession: row.stripe_session, checkoutUrl: row.checkout_url } : null);

  return {
    insertOrder(o, idempotencyKey = null) {
      const now = new Date().toISOString();
      q.insert.run(o.id, now, now, o.status, o.customer.email, o.payment, o.total, idempotencyKey, null, JSON.stringify(o));
      return this.getOrder(o.id);
    },
    getOrder: (id) => hydrate(q.get.get(id)),
    getByIdempotencyKey: (k) => hydrate(q.byKey.get(k)),
    listOrders: (limit = 200) => q.list.all(limit).map(hydrate),
    setStatus(id, status) {
      if (!STATUSES.includes(status)) throw new Error('bad status');
      q.status.run(status, new Date().toISOString(), id);
      return this.getOrder(id);
    },
    setSession: (id, sessionId, url) => q.session.run(sessionId, url, new Date().toISOString(), id),
    close: () => db.close(),
  };
}
