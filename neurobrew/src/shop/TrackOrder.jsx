import { useEffect, useState } from 'react';
import { api } from './api.js';
import Dialog from './Dialog.jsx';
import OrderView from './OrderView.jsx';

/** Track an order with order number + email. Also handles the return from Stripe (?order=&session_id=). */
export default function TrackOrder({ open, onClose, stripeReturn, onPaid }) {
  const [id, setId] = useState('');
  const [email, setEmail] = useState('');
  const [order, setOrder] = useState(null);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open || !stripeReturn) return;
    setBusy(true); setErr('');
    api.confirm(stripeReturn.order, stripeReturn.session)
      .then((r) => { setOrder(r.order); if (r.order.status === 'paid') onPaid(r.order); })
      .catch((e) => setErr(e.message))
      .finally(() => setBusy(false));
  }, [open, stripeReturn]); // eslint-disable-line react-hooks/exhaustive-deps

  async function submit(e) {
    e.preventDefault();
    setErr(''); setBusy(true);
    try { setOrder((await api.lookup(id.trim(), email.trim())).order); }
    catch (x) { setOrder(null); setErr(x.message); }
    finally { setBusy(false); }
  }
  const close = () => { setOrder(null); setErr(''); onClose(); };

  return (
    <Dialog open={open} onClose={close} label="Track your order" className="track">
      <p className="eyebrow">{stripeReturn ? 'Payment' : 'Order status'}</p>
      <h2 className="title title--sm">{stripeReturn ? (order?.status === 'paid' ? <>Payment <em>received.</em></> : <>Checking <em>payment…</em></>) : <>Track your <em>order.</em></>}</h2>
      {!stripeReturn && (
        <form className="track__form" onSubmit={submit}>
          <label className="field"><span>Order number</span><input data-autofocus value={id} onChange={(e) => setId(e.target.value.toUpperCase())} placeholder="NB-XXXXXXXX" maxLength={11} required autoComplete="off" /></label>
          <label className="field"><span>Email used at checkout</span><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" maxLength={120} /></label>
          <button className="btn btn--solid" type="submit" disabled={busy}>{busy ? 'Looking…' : 'Find order'}</button>
        </form>
      )}
      {busy && stripeReturn && <p className="fine">Confirming with Stripe…</p>}
      {err && <p className="alert" role="alert">{err}</p>}
      {order && <OrderView order={order} />}
      {stripeReturn && order?.status === 'pending_payment' && <p className="fine">Your payment has not been confirmed yet. If you completed it, refresh in a minute; otherwise you can try checkout again.</p>}
    </Dialog>
  );
}
