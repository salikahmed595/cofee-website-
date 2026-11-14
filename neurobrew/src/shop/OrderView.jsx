import { productById, optionLabel, money } from '../shared/catalog.js';

const STEPS = [
  { id: 'received', label: 'Order received' },
  { id: 'preparing', label: 'Roasting & packing' },
  { id: 'shipped', label: 'On the way' },
  { id: 'delivered', label: 'Delivered' },
];
const RANK = { pending_payment: -1, received: 0, paid: 0, preparing: 1, shipped: 2, delivered: 3 };
const STATUS_TEXT = {
  pending_payment: 'Waiting for payment', received: 'Received', paid: 'Paid', preparing: 'Roasting & packing',
  shipped: 'Shipped', delivered: 'Delivered', cancelled: 'Cancelled',
};
export const statusText = (s) => STATUS_TEXT[s] || s;

export default function OrderView({ order }) {
  const rank = RANK[order.status] ?? -1;
  const pickup = order.fulfillment?.method === 'pickup';
  return (
    <div className="ov">
      <div className="ov__head">
        <div><small>Order number</small><b className="mono ov__id">{order.id}</b></div>
        <span className={`pill pill--${order.status}`}>{statusText(order.status)}</span>
      </div>
      {order.status === 'cancelled' ? <p className="ov__note">This order was cancelled. Contact us if this is unexpected.</p> : (
        <ol className="timeline" aria-label="Order progress">
          {STEPS.map((s, i) => (
            <li key={s.id} className={i <= rank ? 'is-done' : ''} aria-current={i === rank ? 'step' : undefined}>
              <i /><span>{pickup && s.id === 'shipped' ? 'Ready for pickup' : pickup && s.id === 'delivered' ? 'Picked up' : s.label}</span>
            </li>
          ))}
        </ol>
      )}
      <ul className="ov__lines">
        {order.lines.map((l) => (
          <li key={l.key}><span>{l.qty} × {productById(l.id)?.name || l.name} <small>{optionLabel(l)}</small></span><b className="mono">{money(l.total)}</b></li>
        ))}
      </ul>
      <div className="totals">
        <div><span>Subtotal</span><span className="mono">{money(order.subtotal)}</span></div>
        {order.discount > 0 && <div><span>Discount</span><span className="mono">−{money(order.discount)}</span></div>}
        <div><span>{pickup ? 'Pickup' : 'Shipping'}</span><span className="mono">{order.shipping ? money(order.shipping) : 'Free'}</span></div>
        <div className="totals__grand"><span>Total</span><b className="mono">{money(order.total)}</b></div>
      </div>
      <p className="ov__note">{order.payment === 'card' ? 'Paid by card via Stripe.' : pickup ? 'Pay at pickup.' : 'Pay on delivery.'} Placed {new Date(order.createdAt).toLocaleString()}.</p>
    </div>
  );
}
