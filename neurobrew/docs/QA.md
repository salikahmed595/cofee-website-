# NEUROBREW — QA report (2026-11-14, shop + checkout release)

## Overall status: **NOT VERIFIED for live sales**
The full order flow (browse → cart → checkout → order stored → tracking → staff status update) works end to end on the production build with pay on delivery.

Live card payments have **not** been tested: no Stripe keys were available. Products and prices are placeholders. Nothing has been tested on real phones.

## Commands executed
| Command | Result |
|---|---|
| `npx vitest run` | **56 passed**, 0 failed, 5 files |
| `npx vite build` | OK. Initial JS 66 KB gzip, CSS 8 KB gzip. Lazy chunks: three 176 KB, r3f 127 KB, scene 8 KB, admin 1.6 KB gzip |
| grep `dist/` for dev hooks (`__nb`, `__gsap`, `__ST`) | 0 files |
| `npm audit --omit=dev` | 2 moderate (`uuid` via `@react-three/drei`; buffer bounds check when a `buf` argument is passed — not used by this app). Express was upgraded to 4.22.3 to clear high-severity advisories |

### Test breakdown
- **Unit (RED first, then GREEN):**
  - `src/shared/pricing.test.js`: totals, sizes, promos, shipping, free-shipping threshold, invalid lines
  - `src/shared/validate.test.js`: required fields, email, ZIP, state, pickup without address, control-character stripping, length limits
  - `src/shop/cart.test.js`: add/merge, quantity cap, remove, clear, corrupt storage
  - `src/lib/journey.test.js`: 22 existing 3D journey tests
- **Integration:** `server/app.test.js`, 13 tests against a real HTTP server on a random port with in-memory SQLite. Covers:
  - health, config and security headers
  - server-side pricing, ignoring client prices
  - invalid input returns 400 and nothing is stored
  - malformed JSON returns 400; an oversized body returns 413
  - idempotent retries
  - Stripe session creation and confirmation, including a wrong session (404) and a mismatched order (400); Stripe is faked in tests
  - card refused when Stripe is off
  - lookup privacy: the same 404 for a wrong email and an unknown order
  - admin 401/200
  - status validation
  - rate limit 429

## End-to-end checks (production build via `node server/index.js`, built-in browser)
| Journey | Result |
|---|---|
| Shop renders 19 products / 7 category chips. Filter, search and sort work | VERIFIED |
| Product modal: 500 g + espresso grind + qty 2 → $88.80 | VERIFIED |
| Quick add. Cart survives a reload (badge 3). Drawer shows "Free shipping unlocked" | VERIFIED |
| Empty checkout submit → 5 field errors, focus on the first. Errors clear as fields are fixed | VERIFIED |
| Express + `NEURO10`: server quote subtotal $120.80, −$12.08, shipping $14.99, total $123.71 | VERIFIED |
| Place a pay-on-delivery order → "Order confirmed", cart cleared, order row in SQLite | VERIFIED |
| Track order: wrong email → generic "not found"; right email (any case) → timeline + lines | VERIFIED |
| Staff dashboard `/#admin`: wrong token → "Wrong admin token."; right token → KPIs + order table | VERIFIED (on a throwaway test server and token) |
| Staff changes status → persisted (admin API) and visible to the customer's tracking lookup | VERIFIED |
| Admin API via curl: no token or wrong token → 401 | VERIFIED |
| CSP and security headers on the production server; no CSP console errors | VERIFIED |
| Missing `/assets/*.js` → 404 (not index.html), so a stale tab reloads once instead of breaking | VERIFIED (curl) |
| 375×812: shop grid 2 columns, chip row scrolls sideways, page scrollWidth = 375; checkout sheet single column, no overflow | VERIFIED |
| Card payment via Stripe Checkout (redirect, pay, return, marked paid) | **NOT VERIFIED** (no Stripe keys; covered only by integration tests with a fake Stripe) |
| Real phones (iOS Safari, Android Chrome), GPU frame rate | NOT VERIFIED |
| `prefers-reduced-motion` in a browser | NOT VERIFIED (the tool can't emulate it) |
| Screen-reader pass | NOT VERIFIED. Dialogs have role, label, focus trap and Esc; fields have labels and `aria-invalid` |
| Load testing | **NOT EXECUTED.** No staging target was authorized. No capacity numbers are claimed |

## Fixes made during this QA round
1. **Admin page failed to load after a rebuild.** A missing hashed chunk fell through to `index.html`, which the browser rejected as a script with the wrong MIME type. Now `/assets` returns 404 for missing files, and lazy imports reload the page once to pick up the new build.
2. **WebGL context loss** (seen once in the hidden test pane) would leave a blank stage. The app now switches to the static Lite art.
3. The step rail and HUD overlapped the shop after a fast scroll past the journey. A scroll check now hides them.
4. Dialog focus jumped on every parent render. Fixed.
5. SVG gradient IDs collided across product cards. They are now unique per product.
6. The checkout error banner stayed after the fields were fixed. It is now cleared.
7. The order-confirmation endpoint now requires the Stripe session ID stored for that order, and Stripe's `metadata.order_id` must match.
8. The cart button label read "1 items". Fixed.

## Known limits / risks
| Priority | Item | Action |
|---|---|---|
| P1 | Stripe never run against real Stripe | Add `sk_test_` key, buy with 4242 card, confirm order → paid; then add a `checkout.session.completed` webhook |
| P1 | Placeholder catalogue, prices, no sales tax, no terms/privacy/refund pages | Business content and legal review before launch |
| P2 | No order emails | Add transactional email (e.g. Resend/Postmark) on order + status change |
| P2 | Rate limiter is in memory and the database is SQLite | Run a single instance on a persistent disk with backups. Use Redis + Postgres to scale out |
| P2 | Admin auth is one shared token | Fine for a small team. Move to per-user logins if staff grows |
| P3 | `uuid` moderate advisory via drei | Update drei when a fixed release is available |
