# Coffee websites

Two premium, scroll-driven 3D coffee sites.

| Folder | Site | Stack | Run |
|---|---|---|---|
| `/` (root: `index.html`, `css/`, `js/`) | **SalikBuilds** | Static HTML/CSS/JS + Three.js | `python -m http.server 5173` |
| `neurobrew/` | **NEUROBREW** — one continuous cinematic 3D coffee journey | Vite, React, React Three Fiber, GSAP ScrollTrigger | `cd neurobrew && npm install && npm run dev` |

NEUROBREW: `npm test` runs the unit tests, `npm run build` builds to `neurobrew/dist`. QA notes are in `neurobrew/docs/QA.md`.

Product prices are placeholders and checkout is not connected yet.
