// Browser → API calls with timeouts and friendly errors.
async function request(path, { method = 'GET', body, headers = {}, token } = {}) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 15000);
  try {
    const res = await fetch(path, {
      method,
      headers: { ...(body ? { 'content-type': 'application/json' } : {}), ...(token ? { authorization: `Bearer ${token}` } : {}), ...headers },
      body: body ? JSON.stringify(body) : undefined,
      signal: ctrl.signal,
    });
    let data = null;
    try { data = await res.json(); } catch { /* non-JSON */ }
    if (!res.ok) {
      const err = new Error(data?.error || (res.status === 429 ? 'Too many requests — please wait a moment.' : 'Something went wrong. Please try again.'));
      err.status = res.status; err.fields = data?.errors || {};
      throw err;
    }
    return data;
  } catch (e) {
    if (e.name === 'AbortError') throw Object.assign(new Error('The server took too long to respond. Please try again.'), { fields: {} });
    if (e instanceof TypeError) throw Object.assign(new Error('Cannot reach the NEUROBREW server. Check your connection and try again.'), { fields: {} });
    throw e;
  } finally { clearTimeout(timer); }
}

export const api = {
  config: () => request('/api/config'),
  quote: (items, shipping, promo) => request('/api/quote', { method: 'POST', body: { items, shipping, promo } }),
  placeOrder: (payload, idempotencyKey) => request('/api/orders', { method: 'POST', body: payload, headers: { 'idempotency-key': idempotencyKey } }),
  confirm: (id, sessionId) => request(`/api/orders/${encodeURIComponent(id)}/confirm?session_id=${encodeURIComponent(sessionId)}`),
  lookup: (id, email) => request('/api/orders/lookup', { method: 'POST', body: { id, email } }),
  adminOrders: (token) => request('/api/admin/orders', { token }),
  adminSetStatus: (token, id, status) => request(`/api/admin/orders/${encodeURIComponent(id)}`, { method: 'PATCH', body: { status }, token }),
};

export const newIdempotencyKey = () => (crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2) + Date.now().toString(36));
