import { productById, optionLabel, lineKey, money, MAX_QTY } from '../shared/catalog.js';
import { quote, FREE_SHIPPING_MIN } from '../shared/pricing.js';
import Dialog from './Dialog.jsx';
import ProductArt from './ProductArt.jsx';

export default function CartDrawer({ open, onClose, cart, dispatch, onCheckout, onShop }) {
  const q = quote(cart, { shipping: 'pickup' });
  const toFree = Math.max(0, FREE_SHIPPING_MIN - q.subtotal);
  return (
    <Dialog open={open} onClose={onClose} label="Your cart" variant="drawer">
      <h2 className="drawer__title">Your cart <span className="mono">({cart.reduce((s, l) => s + l.qty, 0)})</span></h2>
      {cart.length === 0 ? (
        <div className="drawer__empty">
          <p>Your cart is empty.</p>
          <button className="btn btn--outline" data-autofocus onClick={() => { onClose(); onShop(); }}>Browse coffee</button>
        </div>
      ) : (
        <>
          <div className="freebar" aria-live="polite">
            <p>{toFree > 0 ? <>Add <b className="mono">{money(toFree)}</b> for free standard shipping</> : <><b>Free shipping</b> unlocked</>}</p>
            <i style={{ '--v': Math.min(1, q.subtotal / FREE_SHIPPING_MIN) }} />
          </div>
          <ul className="lines">
            {q.lines.map((l) => {
              const p = productById(l.id);
              return (
                <li key={l.key} className="line">
                  <div className="line__art"><ProductArt product={p} size={64} /></div>
                  <div className="line__info">
                    <b>{p.name}</b>
                    <small>{optionLabel(l) || p.notes}</small>
                    <div className="qty qty--sm" role="group" aria-label={`Quantity of ${p.name}`}>
                      <button onClick={() => dispatch({ type: 'qty', key: lineKey(l), qty: l.qty - 1 })} aria-label="Decrease">−</button>
                      <output>{l.qty}</output>
                      <button onClick={() => dispatch({ type: 'qty', key: lineKey(l), qty: l.qty + 1 })} aria-label="Increase" disabled={l.qty >= MAX_QTY}>+</button>
                    </div>
                  </div>
                  <div className="line__end">
                    <b className="mono">{money(l.total)}</b>
                    <button className="link" onClick={() => dispatch({ type: 'remove', key: lineKey(l) })} aria-label={`Remove ${p.name}`}>Remove</button>
                  </div>
                </li>
              );
            })}
          </ul>
          <div className="drawer__foot">
            <div className="sum"><span>Subtotal</span><b className="mono">{money(q.subtotal)}</b></div>
            <p className="fine">Shipping and promo codes are applied at checkout.</p>
            <button className="btn btn--solid btn--block" data-autofocus onClick={onCheckout}>Checkout securely</button>
            <button className="btn btn--ghost btn--block" onClick={onClose}>Keep shopping</button>
          </div>
        </>
      )}
    </Dialog>
  );
}
