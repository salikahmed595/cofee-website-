# NEUROBREW — QA report (2026-11-14)

## Overall status: **NOT VERIFIED for release**
The core experience works in a dev browser. It is not release-ready: checkout is not connected, prices are placeholders, and nothing has been tested on real devices.

## Commands executed
| Command | Result |
|---|---|
| `npx vitest run` | 22 passed, 0 failed (journey model: stages, camera, bean choreography, brew timing, HUD) |
| `npx vite build` | OK. Initial JS 52 KB gzip, CSS 5 KB gzip. Lazy 3D chunks: three 176 KB + r3f 127 KB + scene 8 KB gzip |
| grep `dist/` for dev hooks (`__nb`, `__gsap`, `__ST`) | 0 matches (hooks are dev-only) |

## Browser checks (built-in browser pane, Vite dev server)
The pane was hidden during testing, so rAF was throttled. Frames were driven manually through dev-only hooks.

| Check | Result |
|---|---|
| 1440×900, high tier, stages 0–5 render | VERIFIED (screenshots) |
| Continuity: the same beans orbit → roast in chamber → fall into grinder → cup → milk → final; the same machine and cup throughout | VERIFIED |
| Each stage is mid-action when the camera rests on it | VERIFIED (unit tests + screenshots) |
| Console errors | None observed |
| 375×812 mobile → `low` tier, bottom rail, compact HUD, no horizontal scroll (scrollWidth = 375) | VERIFIED |
| Lite-mode toggle → static fallback art (no WebGL canvas) and back to 3D | VERIFIED |
| `prefers-reduced-motion` | NOT VERIFIED in browser (the tool can't emulate it). Code path: no damping, no idle spin, CSS transitions off |
| Real GPU frame rate (desktop / iOS Safari / Android Chrome) | NOT VERIFIED |
| Keyboard navigation of rail / nav / CTA | NOT VERIFIED (buttons are native `<button>`s, but not walked through) |
| Load testing | NOT EXECUTED (static site; there is no backend to load test) |

## Fixes made during QA
1. **Actions happened after the camera arrived** (e.g. the cup was empty on the Brew stage and the pitcher was missing on the Milk stage). All roast, grind, espresso and milk timings were recentred on their stage. Covered by new tests.
2. **The final cup looked like an orange lantern.** Its light was moved behind the cup as a rim light, the latte was darkened, and the camera now looks down into the latte art.
3. **The final headline overlapped the step rail.** The rail folds to icons on the final stage.

## Before launch
- Replace the placeholder products and prices. Connect a real checkout (e.g. Shopify / Stripe).
- Run a performance pass on real mid-range phones; tune `detectQuality` thresholds from the results.
- Run Lighthouse and an accessibility audit (contrast of muted text, focus states).
- Add Playwright E2E smoke tests (load → scroll to final → Order now → shop).
