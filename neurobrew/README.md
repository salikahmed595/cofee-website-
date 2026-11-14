# NEUROBREW

A scroll-driven 3D coffee site with a working shop: catalogue, cart, checkout, order tracking and a staff dashboard.

- **Front end:** Vite, React 18, three.js / React Three Fiber, GSAP ScrollTrigger
- **Back end:** Express 4 and SQLite (Node's built-in `node:sqlite`). No database server is needed.
- **Payments:** pay on delivery or pickup is always available. Card payments use Stripe Checkout once you add a key.

## Requirements
Node **22.12 or newer**, which provides the built-in `node:sqlite`.

## Run locally
```bash
npm install
```
```bash
cp .env.example .env
```
Edit `.env` and set `ADMIN_TOKEN` to a long random string of at least 24 characters, for example from `node -e "console.log(require('crypto').randomBytes(24).toString('base64url'))"`.

```bash
npm run dev
```
`npm run dev` starts the API on :8787 and Vite on :5173, which proxies `/api` to the API.

## Run in production mode
```bash
npm run build
```
```bash
npm start
```
`npm start` serves the built site and the API on one port (`PORT`, default 8787).

## Environment variables
| Name | Required | Purpose |
|---|---|---|
| `PORT` | no | HTTP port (default 8787) |
| `PUBLIC_URL` | yes in production | Public origin, used for Stripe return links, e.g. `https://neurobrew.com` |
| `ADMIN_TOKEN` | to use the dashboard | Staff dashboard token, at least 24 characters. If it is missing, the dashboard is off. |
| `STRIPE_SECRET_KEY` | for card payments | `sk_test_…` while testing, `sk_live_…` in production. If it is missing, card payments are shown as "Coming soon". |
| `DATABASE_FILE` | no | SQLite file path (default `data/neurobrew.db`). It must be on a **persistent disk**. |
| `TRUST_PROXY` | behind a proxy | Set `1` behind nginx, Render or Cloudflare so rate limits see the real client IP |
| `NODE_ENV` | production | `production` turns on HSTS |

Never commit `.env`. It is git-ignored.

## How it works
- **Shop:** 19 products in 6 categories (espresso blends, single origin, cold brew, decaf, capsules, gear), with search, sort, sizes and grind options.
- **Cart:** saved in the browser and synced across tabs.
- **Checkout:** contact, delivery (standard, express or LA pickup), payment and promo code. The **server recalculates every price**; prices sent by the browser are ignored.
- **Promo codes:** `NEURO10` (10% off), `WELCOME5` ($5 off orders of $30 or more). They are defined in `src/shared/pricing.js`.
- **Shipping:** standard $5.99, free from $50 after discount. Express $14.99. Pickup is free.
- **Track order:** `/#track` asks for the order number and email. The page never shows the address or phone number.
- **Staff dashboard:** `/#admin`. Enter `ADMIN_TOKEN` to list orders, see revenue and change order status. Customers see status changes when they track their order.
- **Duplicate protection:** each checkout sends an `Idempotency-Key`, so a double click or retry creates only one order.

### Card payments (Stripe)
1. Put `STRIPE_SECRET_KEY=sk_test_…` in `.env` and restart.
2. At checkout, "Card" redirects to Stripe. After paying, the customer returns to `/#confirmation`. The server then checks the session with Stripe before marking the order **paid**.
3. Test with Stripe's test card `4242 4242 4242 4242`.

Optional hardening: add a Stripe webhook (`checkout.session.completed`) so orders are marked paid even if the customer closes the tab before returning.

## Tests
```bash
npm test
```
56 tests: pricing, validation, cart, and the 3D journey model, plus HTTP integration tests against a real server with an in-memory database.

## Deploying
Any Node 22 host with a persistent disk works, for example Render (web service plus disk), Fly.io (with a volume) or a VPS.
1. Build command: `npm ci && npm run build`. Start command: `npm start`.
2. Set `NODE_ENV=production`, `PUBLIC_URL`, `ADMIN_TOKEN`, `TRUST_PROXY=1` and (optionally) `STRIPE_SECRET_KEY`.
3. Point `DATABASE_FILE` at the mounted disk and back it up regularly.
4. Run **one instance**. The rate limiter is in memory and SQLite is a single file. To scale out, move to Postgres and Redis.

Serverless static hosts (Vercel or Netlify static) won't run the order API as is.

## Before taking real orders
- Replace the placeholder products, prices, photos and copy with real ones. Check sales tax for California.
- Add terms, privacy and refund pages. The checkout currently only refers to "our terms".
- Add order emails (confirmation and status changes). There are none yet.
- Connect Stripe with test keys, run a full test purchase, then switch to live keys.
- See [docs/QA.md](docs/QA.md) for what has been verified and what has not.
