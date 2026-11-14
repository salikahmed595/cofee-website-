import { lazy, Suspense, useEffect, useRef, useState, useCallback } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { journey, detectQuality } from './lib/store.js';
import { STAGES, LAST, stageOf, hudQ, hudValues, progressFromScroll } from './lib/journey.js';
import { Logo, StageIcon, Bag, Arrow, Mouse } from './ui/Icons.jsx';

gsap.registerPlugin(ScrollTrigger);
if (import.meta.env.DEV) { window.__gsap = gsap; window.__ST = ScrollTrigger; } // dev-only test hooks
const Experience = lazy(() => import('./three/Experience.jsx'));

/* Placeholder catalogue — replace prices and products before launch. */
const PRODUCTS = [
  { id: 'origin', name: 'Origin Blend', notes: 'Cocoa · stone fruit · caramel', price: 2400, tag: 'Signature' },
  { id: 'midnight', name: 'Midnight Roast', notes: 'Dark chocolate · molasses · smoke', price: 2600, tag: 'Bold' },
  { id: 'velvet', name: 'Velvet Decaf', notes: 'Honey · almond · soft citrus', price: 2200, tag: 'Swiss water' },
];
const money = (c) => '$' + (c / 100).toFixed(2);

function sectionHeight() {
  const el = document.querySelector('.stage');
  return el ? el.offsetHeight : window.innerHeight * 1.5;
}
function goToStage(k) {
  window.scrollTo({ top: Math.round(k * sectionHeight()), behavior: journey.reduced ? 'auto' : 'smooth' });
}

export default function App() {
  const [quality, setQuality] = useState(() => detectQuality());
  const [ready, setReady] = useState(quality === 'none');
  const [stage, setStage] = useState(0);
  const [cart, setCart] = useState(0);
  const [toast, setToast] = useState('');
  const toastTimer = useRef();
  const railRef = useRef();

  const notify = useCallback((msg) => {
    setToast(msg);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(''), 2600);
  }, []);
  const addToCart = useCallback((name) => { setCart((c) => c + 1); notify(`Added to cart — ${name}`); }, [notify]);

  // Safety net: never leave the loader up if WebGL is slow to start.
  useEffect(() => { const id = setTimeout(() => setReady(true), 6000); return () => clearTimeout(id); }, []);
  useEffect(() => { document.body.classList.toggle('is-loading', !ready); }, [ready]);
  useEffect(() => { document.documentElement.dataset.quality = quality; }, [quality]);

  // Scroll → progress (GSAP ScrollTrigger), and one ticker that drives HUD + rail without React re-renders.
  useEffect(() => {
    let H = sectionHeight();
    const update = () => { journey.p = progressFromScroll(window.scrollY, H); };
    const st = ScrollTrigger.create({ trigger: '#journey', start: 'top top', end: 'bottom bottom', onUpdate: update, onRefresh: () => { H = sectionHeight(); update(); } });
    update();
    journey.smooth = journey.p;

    const panels = Array.from(document.querySelectorAll('[data-hud-stage]'));
    const fields = panels.map((pnl) => ({
      text: Array.from(pnl.querySelectorAll('[data-hud]')),
      bars: Array.from(pnl.querySelectorAll('[data-hud-bar]')),
    }));
    let last = -1;
    const tick = (time, deltaMs) => {
      const dt = Math.min((deltaMs || 16) / 1000, 0.05);
      const k = journey.reduced ? 1 : 1 - Math.pow(0.002, dt);
      journey.smooth += (journey.p - journey.smooth) * k;
      const p = journey.smooth, s = stageOf(p);
      if (s !== last) { last = s; setStage(s); }
      if (railRef.current) railRef.current.style.setProperty('--fill', String(p / LAST));
      const v = hudValues(s, hudQ(p, s)), f = fields[s];
      if (f) {
        f.text.forEach((el) => { const val = v[el.dataset.hud]; if (val !== undefined && el.textContent !== String(val)) el.textContent = val; });
        f.bars.forEach((el) => el.style.setProperty('--v', String(v[el.dataset.hudBar] ?? 0)));
      }
    };
    gsap.ticker.add(tick);
    return () => { st.kill(); gsap.ticker.remove(tick); };
  }, []);

  // Copy reveal per stage (ScrollTrigger toggles; CSS does the motion so reduced-motion is respected).
  useEffect(() => {
    const triggers = Array.from(document.querySelectorAll('.reveal')).map((el) =>
      ScrollTrigger.create({ trigger: el, start: 'top 82%', end: 'bottom 18%', toggleClass: 'in' }));
    return () => triggers.forEach((t) => t.kill());
  }, []);

  const downgrade = useCallback(() => setQuality((q) => (q === 'high' ? 'low' : q)), []);
  const show3D = quality !== 'none';

  return (
    <>
      <a className="skip" href="#main">Skip to content</a>

      <div className={`loader ${ready ? 'is-done' : ''}`} aria-hidden="true">
        <Logo width="56" height="56" />
        <span>Calibrating the brew</span>
        <i />
      </div>

      <div className="stage-bg" aria-hidden="true">
        {show3D ? (
          <Suspense fallback={null}>
            <Experience quality={quality} onReady={() => setReady(true)} onDowngrade={downgrade} />
          </Suspense>
        ) : (
          <div className={`fallback-art s${stage}`}><StageIcon id={STAGES[stage].id} size={220} /></div>
        )}
        <div className="shade" />
      </div>

      <header className="nav">
        <a className="brand" href="#top" onClick={(e) => { e.preventDefault(); goToStage(0); }} aria-label="NEUROBREW home"><Logo /> <span>NEUROBREW<sup>™</sup></span></a>
        <nav className="nav__links" aria-label="Primary">
          <a href="#stage-beans" className={stage <= 1 ? 'is-active' : ''} onClick={(e) => { e.preventDefault(); goToStage(0); }}>Journey</a>
          <a href="#stage-machine" className={stage >= 2 && stage <= 3 ? 'is-active' : ''} onClick={(e) => { e.preventDefault(); goToStage(2); }}>Technology</a>
          <a href="#stage-milk" className={stage === 4 ? 'is-active' : ''} onClick={(e) => { e.preventDefault(); goToStage(4); }}>Brew Lab</a>
          <a href="#shop">Shop</a>
        </nav>
        <div className="nav__actions">
          <button className="icon-btn" onClick={() => notify(cart ? `${cart} item${cart > 1 ? 's' : ''} in your cart` : 'Your cart is empty')} aria-label={`Cart, ${cart} items`}>
            <Bag />{cart > 0 && <b className="badge">{cart}</b>}
          </button>
          <a className="btn btn--outline btn--sm" href="#shop">Order now <Arrow /></a>
        </div>
      </header>

      <nav className={`rail${stage === LAST ? ' rail--compact' : ''}`} ref={railRef} aria-label="Coffee journey steps">
        <span className="rail__title">The coffee journey</span>
        <ol>
          {STAGES.map((s, i) => (
            <li key={s.id} className={i === stage ? 'is-active' : i < stage ? 'is-done' : ''}>
              <button onClick={() => goToStage(i)} aria-current={i === stage ? 'step' : undefined} aria-label={`Step ${i + 1}: ${s.label}`}>
                <span className="rail__dot"><StageIcon id={s.id} /></span>
                <span className="rail__label"><small>0{i + 1}</small> {s.label}</span>
              </button>
            </li>
          ))}
        </ol>
        <i className="rail__line" />
      </nav>

      <main id="main">
        <div id="journey">
          {/* 01 BEANS */}
          <section className="stage" id="stage-beans" aria-labelledby="h-beans">
            <div className="stage__sticky">
              <div className="copy reveal">
                <p className="eyebrow">The coffee journey <i /></p>
                <h1 id="h-beans" className="title">It begins<br />with <em>beans</em></h1>
                <p className="lede">A global pursuit of the finest coffee beans — rare, rich, and full of potential.</p>
                <button className="btn btn--outline" onClick={() => goToStage(1)}>Start the journey <Arrow /></button>
              </div>
              <div className="scroll-cue"><Mouse /><span>Scroll to roast</span></div>
            </div>
          </section>

          {/* 02 ROAST */}
          <section className="stage" id="stage-roast" aria-labelledby="h-roast">
            <div className="stage__sticky">
              <div className="copy reveal">
                <p className="eyebrow">Step 02 / 06</p>
                <h2 id="h-roast" className="title">From bean<br />to <em>roast</em></h2>
                <p className="lede">Carefully sourced green beans, transformed through precision roasting to unlock their full flavour, aroma and character.</p>
                <div className="tags"><span><i className="sw sw--raw" />Raw beans · green, unroasted</span><span><i className="sw sw--roast" />Roasted · rich, aromatic</span></div>
              </div>
            </div>
          </section>

          {/* 03 MACHINE */}
          <section className="stage" id="stage-machine" aria-labelledby="h-machine">
            <div className="stage__sticky">
              <div className="copy reveal">
                <p className="eyebrow">Step 03 / 06</p>
                <h2 id="h-machine" className="title">The<br /><em>machine</em></h2>
                <p className="lede">Precision engineering that turns perfectly roasted beans into extraordinary coffee — ground to the micron, on demand.</p>
                <button className="btn btn--ghost" onClick={() => goToStage(3)}>To brewing <Arrow /></button>
              </div>
            </div>
          </section>

          {/* 04 BREW */}
          <section className="stage" id="stage-brew" aria-labelledby="h-brew">
            <div className="stage__sticky">
              <div className="copy reveal">
                <p className="eyebrow">Step 04 / 06</p>
                <h2 id="h-brew" className="title">The brew<br />comes <em>alive</em></h2>
                <p className="lede">Hot water meets perfectly ground coffee, extracting rich flavours, oils and aroma in a precise, pressure-driven brew.</p>
                <button className="btn btn--solid" onClick={() => goToStage(4)}>Next: add milk <Arrow /></button>
              </div>
            </div>
          </section>

          {/* 05 MILK */}
          <section className="stage" id="stage-milk" aria-labelledby="h-milk">
            <div className="stage__sticky">
              <div className="copy reveal">
                <p className="eyebrow">Step 05 / 06</p>
                <h2 id="h-milk" className="title">The milk<br /><em>integration</em></h2>
                <p className="lede">Silky, microfoamed milk meets rich espresso, creating a perfect harmony of taste and texture.</p>
                <div className="pager">
                  <button className="btn btn--ghost btn--sm" onClick={() => goToStage(3)}><Arrow dir="up" /> Previous</button>
                  <button className="btn btn--outline btn--sm" onClick={() => goToStage(5)}>Next: the final cup <Arrow /></button>
                </div>
              </div>
            </div>
          </section>

          {/* 06 CUP */}
          <section className="stage stage--final" id="stage-cup" aria-labelledby="h-cup">
            <div className="stage__sticky">
              <div className="final reveal">
                <h2 id="h-cup" className="final__title">Coffee. <em>Reengineered.</em></h2>
                <p className="final__sub">From nature to your cup — a futuristic coffee experience</p>
                <div className="final__cta">
                  <a className="btn btn--solid btn--lg" href="#shop"><Bag /> Order now</a>
                  <button className="btn btn--ghost btn--lg" onClick={() => goToStage(0)}>▸ Explore the journey</button>
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* HUD panels: one per stage, fixed on the right, values driven by scroll */}
        <aside className="hud-wrap" aria-live="off">
          <div className={`hud ${stage === 0 ? 'is-on' : ''}`} data-hud-stage="0">
            <div className="hud__row hud__row--top"><StageIcon id="beans" size={34} /><div><p className="mono"><b>01</b> / 06</p><h3>Beans</h3></div></div>
            <p className="hud__note">Sourced from the world's best coffee regions — Ethiopia, Colombia, Guatemala.</p>
            <div className="dots"><i className="on" /><i /><i /><i /><i /><i /></div>
          </div>

          <div className={`hud ${stage === 1 ? 'is-on' : ''}`} data-hud-stage="1">
            <p className="hud__label">Roasting profile</p>
            <svg className="curve" viewBox="0 0 260 60" aria-hidden="true"><path data-hud-bar="curve" d="M0 50 C40 45 60 20 95 22 S150 48 185 30 S235 8 260 14" /></svg>
            <div className="hud__grid">
              <div><b className="big mono"><span data-hud="temp">24</span>°C</b><small>Current temp</small></div>
              <div><b className="big mono" data-hud="time">00:00</b><small>Roast time</small></div>
            </div>
            <p className="hud__label">Roast level</p>
            <div className="level" data-hud-bar="level"><i /></div>
            <div className="level__labels"><span>Light</span><span>Medium</span><span>Dark</span></div>
          </div>

          <div className={`hud ${stage === 2 ? 'is-on' : ''}`} data-hud-stage="2">
            <ul className="specs">
              <li><StageIcon id="machine" /><div><b>Precision grind</b><span className="mono"><span data-hud="grind">12.5</span> µm (±0.5)</span></div></li>
              <li><StageIcon id="roast" /><div><b>Smart temperature</b><span className="mono">92°C (optimal)</span></div></li>
              <li><StageIcon id="brew" /><div><b>Adaptive pressure</b><span className="mono">9 bar</span></div></li>
              <li><StageIcon id="milk" /><div><b>Burr speed</b><span className="mono"><span data-hud="rpm">0</span> rpm</span></div></li>
            </ul>
            <p className="hud__label">Process</p>
            <div className="segbar" data-hud-bar="progress"><i /></div>
            <div className="level__labels"><span>Roasting ✓</span><span className="hot">Grinding ●</span><span>Brewing ○</span></div>
          </div>

          <div className={`hud ${stage === 3 ? 'is-on' : ''}`} data-hud-stage="3">
            <ul className="readout">
              <li><span>Water temp</span><b className="mono"><span data-hud="water">93</span>°C</b></li>
              <li><span>Pressure</span><b className="mono"><span data-hud="pressure">0.0</span> bar</b></li>
              <li><span>Extraction time</span><b className="mono"><span data-hud="seconds">0</span> s</b></li>
            </ul>
            <ol className="layers">
              <li><b>Hot water</b> evenly saturates the grounds</li>
              <li><b>Coffee grounds</b> release rich flavours and oils</li>
              <li><b>Espresso extract</b> — a bold, aromatic foundation</li>
            </ol>
          </div>

          <div className={`hud ${stage === 4 ? 'is-on' : ''}`} data-hud-stage="4">
            <p className="hud__label">Milk profile</p>
            <div className="wave" aria-hidden="true" />
            <ul className="readout readout--sm">
              <li><span>Temp</span><b className="mono"><span data-hud="temp">4</span>°C</b></li>
              <li><span>Texture</span><b>Microfoam</b></li>
              <li><span>Density</span><b>Velvety</b></li>
            </ul>
            <p className="hud__label">Blend ratio <span className="mono hud__ratio">Espresso : Milk 1 : 3</span></p>
            <div className="level level--fill" data-hud-bar="ratio"><i /></div>
          </div>
        </aside>

        {/* SHOP */}
        <section className="shop" id="shop" aria-labelledby="h-shop">
          <div className="wrap">
            <p className="eyebrow reveal">Our coffee</p>
            <h2 id="h-shop" className="title title--sm reveal">Engineered blends, <em>roasted to order.</em></h2>
            <div className="products">
              {PRODUCTS.map((p) => (
                <article key={p.id} className="product reveal">
                  <span className="product__tag">{p.tag}</span>
                  <div className={`bag bag--${p.id}`} aria-hidden="true"><Logo width="40" height="40" /><span>{p.name}</span></div>
                  <h3>{p.name}</h3>
                  <p>{p.notes}</p>
                  <div className="product__row">
                    <b className="mono">{money(p.price)}</b>
                    <button className="btn btn--solid btn--sm" onClick={() => addToCart(p.name)} aria-label={`Add ${p.name} to cart`}>Add <Arrow /></button>
                  </div>
                </article>
              ))}
            </div>
            <p className="note">Prices are placeholders. Checkout is not connected yet.</p>
          </div>
        </section>
      </main>

      <footer className="footer">
        <div className="wrap footer__inner">
          <a className="brand" href="#top" onClick={(e) => { e.preventDefault(); goToStage(0); }}><Logo /> <span>NEUROBREW<sup>™</sup></span></a>
          <span>© 2026 NEUROBREW. Coffee, reengineered.</span>
          <button className="link" onClick={() => setQuality((q) => (q === 'none' ? detectQuality() || 'low' : 'none'))}>
            {quality === 'none' ? 'Turn on 3D' : 'Lite mode (turn off 3D)'}
          </button>
        </div>
      </footer>

      <div className={`toast ${toast ? 'is-on' : ''}`} role="status" aria-live="polite">{toast}</div>
    </>
  );
}
