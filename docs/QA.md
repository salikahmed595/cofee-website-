# SalikBuilds website — QA report (2026-11-14)

## How to run
```
python -m http.server 5173     # then open http://localhost:5173
node --test tests/cup.test.js  # unit tests
```

## Executed checks
| Check | Result |
|---|---|
| Unit tests `node --test tests/cup.test.js` (configurator pricing, validation, malicious input, visuals) | 8/8 pass |
| `node --check` on js/cup.js, js/scene.js, js/main.js | pass |
| Browser: console errors on load (desktop 1440×900, mobile 375×812) | none |
| Browser: every section rendered and screenshotted (hero, origin, craft, menu, build, visit) | pass |
| E2E: Build-your-cup — Dark + Oat + 16 oz + Iced + 3 shots → $9.25, ice in 3D, steam off, cart = 1, toast | pass |
| E2E: newsletter rejects invalid email (aria-invalid), accepts valid | pass |
| E2E: mobile menu open / Escape closes | pass |
| Mobile: no horizontal overflow at 375px | pass |
| CDN scripts pinned with SRI hashes | done |

Note: the first "RED" run used a wrong test path, so the expected-failure step was not captured cleanly; tests were written before `js/cup.js`.

## Not verified
- Real-device GPU performance (only tested in an embedded, throttled browser pane).
- Safari / Firefox, screen readers.
- Load testing: NOT EXECUTED (static site; host on a CDN).

## Before launch (must fix)
| Priority | Item |
|---|---|
| P1 | Newsletter shows "you're on the list" but sends nothing — connect an email provider in `js/main.js` (TODO marked). |
| P1 | "Add to order" is a front-end demo cart only — connect real ordering/checkout (e.g. Square, Toast, Shopify). |
| P2 | Prices, locations, hours, stats, rating are placeholders — replace with real data. |
| P3 | Self-host fonts and scripts for privacy and speed; add a real OG share image. |
