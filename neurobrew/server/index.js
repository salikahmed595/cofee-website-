// Production entry: serves the built site from ./dist and the order API on one origin.
import express from 'express';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { existsSync, readFileSync } from 'node:fs';
import { createApp } from './app.js';
import { openDb } from './db.js';
import { createStripe } from './stripe.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

// Load .env if present (no dependency; KEY=value lines only).
const envFile = join(root, '.env');
if (existsSync(envFile)) {
  for (const line of readFileSync(envFile, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}

const env = process.env;
const isProd = env.NODE_ENV === 'production';
const port = Number(env.PORT || 8787);
const adminToken = env.ADMIN_TOKEN || '';
if (adminToken && adminToken.length < 24) { console.error('ADMIN_TOKEN must be at least 24 characters.'); process.exit(1); }
if (!adminToken) console.warn('[warn] ADMIN_TOKEN not set — the admin order dashboard is disabled.');
if (env.STRIPE_SECRET_KEY?.startsWith('sk_live_') && !isProd) console.warn('[warn] Live Stripe key in a non-production environment.');

const db = openDb(env.DATABASE_FILE ? resolve(env.DATABASE_FILE) : join(root, 'data', 'neurobrew.db'));
const stripe = createStripe(env.STRIPE_SECRET_KEY);
console.log(`[boot] card payments ${stripe ? 'ENABLED (Stripe)' : 'disabled — set STRIPE_SECRET_KEY to enable'}`);

const app = createApp({ db, adminToken, stripe, publicUrl: env.PUBLIC_URL || `http://localhost:${port}`, trustProxy: env.TRUST_PROXY === '1' });

const dist = join(root, 'dist');
if (existsSync(dist)) {
  const csp = [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: blob:",
    "connect-src 'self'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self' https://checkout.stripe.com",
  ].join('; ');
  app.use((req, res, next) => { res.set('content-security-policy', csp); if (isProd) res.set('strict-transport-security', 'max-age=31536000; includeSubDomains'); next(); });
  // Hashed assets are immutable. A missing one must 404 (not fall back to index.html), so stale tabs can recover.
  app.use('/assets', express.static(join(dist, 'assets'), { immutable: true, maxAge: '1y', fallthrough: false }));
  app.use(express.static(dist, { index: false, maxAge: '1h' }));
  app.get('*', (req, res) => res.set('cache-control', 'no-cache').sendFile(join(dist, 'index.html')));
} else {
  console.warn('[warn] dist/ not found — run `npm run build` to serve the site. API only.');
}

const server = app.listen(port, () => console.log(`[boot] NEUROBREW on http://localhost:${port}`));
const shutdown = () => { server.close(() => { db.close(); process.exit(0); }); setTimeout(() => process.exit(1), 8000).unref(); };
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
