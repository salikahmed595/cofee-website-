import { useEffect, useMemo, useRef, useState } from 'react';
import { optionLabel, productById, money } from '../shared/catalog.js';
import { quote as localQuote, SHIPPING, FREE_SHIPPING_MIN } from '../shared/pricing.js';
import { validateCheckout, PAYMENTS, US_STATES } from '../shared/validate.js';
import { api, newIdempotencyKey } from './api.js';
import Dialog from './Dialog.jsx';
import OrderView from './OrderView.jsx';

const EMPTY = { name: '', email: '', phone: '', method: 'standard', line1: '', line2: '', city: '', state: 'CA', zip: '', payment: 'cod', notes: '', promo: '' };
const DRAFT_KEY = 'nb-checkout-draft';

const isStripeUrl = (u) => { try { const x = new URL(u); return x.protocol === 'https:' && (x.hostname === 'checkout.stripe.com' || x.hostname.endsWith('.stripe.com')); } catch { return false; } };

export default function Checkout({ open, onClose, cart, onPlaced }) {
  const [f, setF] = useState(() => {
    try { return { ...EMPTY, ...JSON.parse(sessionStorage.getItem(DRAFT_KEY) || '{}'), promo: '' }; } catch { return EMPTY; }
  });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);
  const [config, setConfig] = useState({ payments: ['cod'], pickup: '' });
  const [server, setServer] = useState(null);       // server quote (authoritative)
  const [promoInput, setPromoInput] = useState('');
  const [placed, setPlaced] = useState(null);
  const keyRef = useRef(newIdempotencyKey());

  useEffect(() => { if (open) api.config().then(setConfig).catch(() => {}); }, [open]);
  useEffect(() => { if (!config.payments.includes(f.payment)) setF((s) => ({ ...s, payment: config.payments[0] })); }, [config]); // eslint-disable-line react-hooks/exhaustive-deps
  // Persist the draft (minus promo) for this tab only so a refresh does not lose typing.
  useEffect(() => { try { const { promo, ...rest } = f; sessionStorage.setItem(DRAFT_KEY, JSON.stringify(rest)); } catch { /* ignore */ } }, [f]);

  // Ask the server for the real total whenever cart, shipping or promo change.
  useEffect(() => {
    if (!open || cart.length === 0) return undefined;
    let live = true;
    const t = setTimeout(() => {
      api.quote(cart, f.method, f.promo).then((q) => { if (live) setServer(q); }).catch(() => { if (live) setServer(null); });
    }, 200);
    return () => { live = false; clearTimeout(t); };
  }, [open, cart, f.method, f.promo]);

  const local = useMemo(() => localQuote(cart, { shipping: f.method }), [cart, f.method]);
  const q = server || local;
  const set = (k) => (e) => {
    const v = e.target.value;
    setF((s) => ({ ...s, [k]: v }));
    setErrors((er) => { const next = { ...er, [k]: undefined }; if (!Object.values(next).some(Boolean)) setFormError(''); return next; });
  };

  const payload = () => ({
    items: cart,
    customer: { name: f.name, email: f.email, phone: f.phone },
    fulfillment: { method: f.method, address: f.method === 'pickup' ? null : { line1: f.line1, line2: f.line2, city: f.city, state: f.state, zip: f.zip } },
    payment: f.payment, notes: f.notes, promo: f.promo,
  });

  async function submit(e) {
    e.preventDefault();
    setFormError('');
    const v = validateCheckout(payload());
    if (!v.ok) { setErrors(v.errors); setFormError('Please check the highlighted fields.'); focusFirstError(v.errors); return; }
    setBusy(true);
    try {
      const res = await api.placeOrder(payload(), keyRef.current);
      if (res.checkoutUrl) {
        if (!isStripeUrl(res.checkoutUrl)) throw new Error('Unexpected payment link. Please contact support.');
        window.location.assign(res.checkoutUrl);
        return;
      }
      setPlaced(res.order);
      keyRef.current = newIdempotencyKey();
      try { sessionStorage.removeItem(DRAFT_KEY); } catch { /* ignore */ }
      onPlaced(res.order);
    } catch (err) {
      setErrors(err.fields || {});
      setFormError(err.message);
      focusFirstError(err.fields || {});
    } finally { setBusy(false); }
  }
  function focusFirstError(errs) {
    const k = Object.keys(errs)[0];
    if (k) requestAnimationFrame(() => document.querySelector(`[data-field="${k}"]`)?.focus());
  }
  const close = () => { onClose(); if (placed) { setPlaced(null); setServer(null); } };

  const field = (k, label, props = {}) => (
    <label className={`field ${errors[k] ? 'has-error' : ''} ${props.wide ? 'field--wide' : ''}`}>
      <span>{label}{props.optional && <em> (optional)</em>}</span>
      <input data-field={k} aria-label={label} value={f[k]} onChange={set(k)} aria-invalid={Boolean(errors[k])} aria-describedby={errors[k] ? `err-${k}` : undefined} autoComplete={props.ac} type={props.type || 'text'} inputMode={props.im} maxLength={props.max || 120} required={!props.optional} />
      {errors[k] && <small id={`err-${k}`} className="err" role="alert">{errors[k]}</small>}
    </label>
  );

  return (
    <Dialog open={open} onClose={close} label={placed ? 'Order confirmed' : 'Checkout'} variant="sheet" className="co">
      {placed ? (
        <div className="co__done">
          <p className="eyebrow">Thank you{placed.firstName ? `, ${placed.firstName}` : ''}</p>
          <h2 className="title title--sm">Order <em>confirmed.</em></h2>
          <p className="lede">We have started roasting. Save your order number — you can track it any time with your email.</p>
          <OrderView order={placed} />
          <button className="btn btn--solid" data-autofocus onClick={close}>Back to NEUROBREW</button>
        </div>
      ) : cart.length === 0 ? (
        <div className="co__done"><h2 className="title title--sm">Your cart is <em>empty.</em></h2><button className="btn btn--outline" onClick={close}>Browse coffee</button></div>
      ) : (
        <form className="co__grid" onSubmit={submit} noValidate>
          <div className="co__form">
            <h2 className="co__title">Checkout</h2>
            {formError && <p className="alert" role="alert">{formError}</p>}

            <fieldset className="co__sec"><legend><b>01</b> Contact</legend>
              <div className="grid2">
                {field('name', 'Full name', { ac: 'name', max: 80, wide: true })}
                {field('email', 'Email', { ac: 'email', type: 'email', im: 'email' })}
                {field('phone', 'Phone', { ac: 'tel', type: 'tel', im: 'tel', optional: true, max: 20 })}
              </div>
            </fieldset>

            <fieldset className="co__sec"><legend><b>02</b> Delivery</legend>
              <div className="choices" data-field="method" tabIndex={-1}>
                {SHIPPING.map((s) => (
                  <label key={s.id} className={`choice ${f.method === s.id ? 'is-on' : ''}`}>
                    <input type="radio" name="method" value={s.id} checked={f.method === s.id} onChange={set('method')} />
                    <span><b>{s.label}</b><small>{s.id === 'pickup' && config.pickup ? config.pickup : s.eta}</small></span>
                    <em className="mono">{s.id === 'standard' && q.subtotal - q.discount >= FREE_SHIPPING_MIN ? 'Free' : s.price ? money(s.price) : 'Free'}</em>
                  </label>
                ))}
              </div>
              {errors.method && <small className="err" role="alert">{errors.method}</small>}
              {f.method !== 'pickup' && (
                <div className="grid2">
                  {field('line1', 'Street address', { ac: 'address-line1', wide: true })}
                  {field('line2', 'Apt, suite', { ac: 'address-line2', optional: true, wide: true })}
                  {field('city', 'City', { ac: 'address-level2', max: 60 })}
                  <label className={`field ${errors.state ? 'has-error' : ''}`}><span>State</span>
                    <select data-field="state" value={f.state} onChange={set('state')} autoComplete="address-level1">{US_STATES.map((s) => <option key={s}>{s}</option>)}</select>
                    {errors.state && <small className="err" role="alert">{errors.state}</small>}
                  </label>
                  {field('zip', 'ZIP code', { ac: 'postal-code', im: 'numeric', max: 10 })}
                </div>
              )}
              <p className="fine">We currently ship within the United States.</p>
            </fieldset>

            <fieldset className="co__sec"><legend><b>03</b> Payment</legend>
              <div className="choices" data-field="payment" tabIndex={-1}>
                {PAYMENTS.map((p) => {
                  const enabled = config.payments.includes(p.id);
                  return (
                    <label key={p.id} className={`choice ${f.payment === p.id ? 'is-on' : ''} ${enabled ? '' : 'is-off'}`}>
                      <input type="radio" name="payment" value={p.id} checked={f.payment === p.id} onChange={set('payment')} disabled={!enabled} />
                      <span><b>{p.id === 'cod' && f.method === 'pickup' ? 'Pay at pickup' : p.label}</b><small>{p.id === 'card' ? (enabled ? 'Visa, Mastercard, Amex, Apple Pay, Google Pay' : 'Coming soon') : 'Card or cash when you receive your order'}</small></span>
                    </label>
                  );
                })}
              </div>
              {errors.payment && <small className="err" role="alert">{errors.payment}</small>}
              <label className="field field--wide"><span>Order notes <em>(optional)</em></span>
                <textarea data-field="notes" value={f.notes} onChange={set('notes')} maxLength={300} rows={2} placeholder="Gate code, gift message…" />
                {errors.notes && <small className="err" role="alert">{errors.notes}</small>}
              </label>
            </fieldset>
          </div>

          <aside className="co__summary" aria-label="Order summary">
            <h3>Order summary</h3>
            <ul className="ov__lines">
              {q.lines.map((l) => <li key={l.key}><span>{l.qty} × {productById(l.id)?.name} <small>{optionLabel(l)}</small></span><b className="mono">{money(l.total)}</b></li>)}
            </ul>
            <div className="promo">
              <label className="field field--inline"><span className="sr">Promo code</span>
                <input value={promoInput} onChange={(e) => setPromoInput(e.target.value.toUpperCase())} placeholder="Promo code" maxLength={24} />
              </label>
              <button type="button" className="btn btn--ghost btn--sm" onClick={() => setF((s) => ({ ...s, promo: promoInput.trim() }))} disabled={!promoInput.trim()}>Apply</button>
            </div>
            {server?.promo && <p className={`promo__msg ${server.promo.valid ? 'ok' : 'bad'}`} role="status">{server.promo.valid ? `✓ ${server.promo.code}: ${server.promo.label}` : server.promo.label}</p>}
            <div className="totals">
              <div><span>Subtotal</span><span className="mono">{money(q.subtotal)}</span></div>
              {q.discount > 0 && <div><span>Discount</span><span className="mono">−{money(q.discount)}</span></div>}
              <div><span>{f.method === 'pickup' ? 'Pickup' : 'Shipping'}</span><span className="mono">{q.shipping ? money(q.shipping) : 'Free'}</span></div>
              <div className="totals__grand"><span>Total</span><b className="mono">{money(q.total)}</b></div>
            </div>
            {!server && <p className="fine">Final total is confirmed by our server when you place the order.</p>}
            <button className="btn btn--solid btn--block" type="submit" disabled={busy} aria-busy={busy}>
              {busy ? 'Placing order…' : f.payment === 'card' ? `Pay ${money(q.total)} securely` : `Place order · ${money(q.total)}`}
            </button>
            <p className="fine">By placing your order you agree to our terms. Your details are used only to fulfil this order.</p>
          </aside>
        </form>
      )}
    </Dialog>
  );
}
