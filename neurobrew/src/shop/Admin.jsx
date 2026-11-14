import { useCallback, useEffect, useState } from 'react';
import { optionLabel, money } from '../shared/catalog.js';
import { api } from './api.js';
import Dialog from './Dialog.jsx';
import { statusText } from './OrderView.jsx';

const TOKEN_KEY = 'nb-admin-token';

/** Staff dashboard at /#admin. The token lives in this tab's sessionStorage only. */
export default function Admin({ open, onClose }) {
  const [token, setToken] = useState(() => { try { return sessionStorage.getItem(TOKEN_KEY) || ''; } catch { return ''; } });
  const [input, setInput] = useState('');
  const [orders, setOrders] = useState(null);
  const [statuses, setStatuses] = useState([]);
  const [err, setErr] = useState('');
  const [filter, setFilter] = useState('all');

  const load = useCallback(async (t = token) => {
    if (!t) return;
    setErr('');
    try {
      const r = await api.adminOrders(t);
      setOrders(r.orders); setStatuses(r.statuses);
      try { sessionStorage.setItem(TOKEN_KEY, t); } catch { /* ignore */ }
    } catch (e) {
      setOrders(null);
      setErr(e.status === 401 ? 'Wrong admin token.' : e.message);
      if (e.status === 401) { setToken(''); try { sessionStorage.removeItem(TOKEN_KEY); } catch { /* ignore */ } }
    }
  }, [token]);
  useEffect(() => { if (open && token) load(); }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  async function setStatus(id, status) {
    try { const r = await api.adminSetStatus(token, id, status); setOrders((os) => os.map((o) => (o.id === id ? r.order : o))); }
    catch (e) { setErr(e.message); }
  }
  const signOut = () => { setToken(''); setOrders(null); try { sessionStorage.removeItem(TOKEN_KEY); } catch { /* ignore */ } };

  const shown = (orders || []).filter((o) => filter === 'all' || o.status === filter);
  const revenue = (orders || []).filter((o) => o.status !== 'cancelled' && o.status !== 'pending_payment').reduce((s, o) => s + o.total, 0);

  return (
    <Dialog open={open} onClose={onClose} label="Orders dashboard" variant="sheet" className="admin">
      <h2 className="co__title">Orders dashboard</h2>
      {!orders ? (
        <form className="track__form" onSubmit={(e) => { e.preventDefault(); setToken(input); load(input); }}>
          <label className="field"><span>Admin token</span><input data-autofocus type="password" value={input} onChange={(e) => setInput(e.target.value)} autoComplete="current-password" required /></label>
          <button className="btn btn--solid" type="submit">Sign in</button>
          {err && <p className="alert" role="alert">{err}</p>}
          <p className="fine">Set <code>ADMIN_TOKEN</code> on the server to enable this dashboard.</p>
        </form>
      ) : (
        <>
          <div className="admin__bar">
            <div className="kpis">
              <div><small>Orders</small><b className="mono">{orders.length}</b></div>
              <div><small>Revenue</small><b className="mono">{money(revenue)}</b></div>
              <div><small>To fulfil</small><b className="mono">{orders.filter((o) => ['received', 'paid', 'preparing'].includes(o.status)).length}</b></div>
            </div>
            <div className="admin__tools">
              <select value={filter} onChange={(e) => setFilter(e.target.value)} aria-label="Filter by status">
                <option value="all">All statuses</option>{statuses.map((s) => <option key={s} value={s}>{statusText(s)}</option>)}
              </select>
              <button className="btn btn--ghost btn--sm" onClick={() => load()}>Refresh</button>
              <button className="btn btn--ghost btn--sm" onClick={signOut}>Sign out</button>
            </div>
          </div>
          {err && <p className="alert" role="alert">{err}</p>}
          {shown.length === 0 ? <p className="empty">No orders yet.</p> : (
            <div className="table-wrap">
              <table className="table">
                <thead><tr><th>Order</th><th>Customer</th><th>Items</th><th>Delivery</th><th>Total</th><th>Status</th></tr></thead>
                <tbody>
                  {shown.map((o) => (
                    <tr key={o.id}>
                      <td><b className="mono">{o.id}</b><small>{new Date(o.createdAt).toLocaleString()}</small></td>
                      <td>{o.customer.name}<small>{o.customer.email}{o.customer.phone ? ` · ${o.customer.phone}` : ''}</small></td>
                      <td>{o.lines.map((l) => <small key={l.key}>{l.qty} × {l.name} {optionLabel(l) && `(${optionLabel(l)})`}</small>)}{o.notes && <small className="note-line">“{o.notes}”</small>}</td>
                      <td>{o.fulfillment.method}{o.fulfillment.address && <small>{o.fulfillment.address.line1}{o.fulfillment.address.line2 ? `, ${o.fulfillment.address.line2}` : ''}, {o.fulfillment.address.city}, {o.fulfillment.address.state} {o.fulfillment.address.zip}</small>}</td>
                      <td><b className="mono">{money(o.total)}</b><small>{o.payment === 'card' ? 'Card' : 'On delivery'}{o.promo ? ` · ${o.promo}` : ''}</small></td>
                      <td>
                        <select value={o.status} onChange={(e) => setStatus(o.id, e.target.value)} aria-label={`Status of ${o.id}`}>
                          {statuses.map((s) => <option key={s} value={s}>{statusText(s)}</option>)}
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </Dialog>
  );
}
