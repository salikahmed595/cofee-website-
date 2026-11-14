import { useMemo, useState } from 'react';
import { CATEGORIES, PRODUCTS, money } from '../shared/catalog.js';
import ProductArt from './ProductArt.jsx';

const SORTS = [
  { id: 'featured', label: 'Featured' },
  { id: 'price-asc', label: 'Price: low to high' },
  { id: 'price-desc', label: 'Price: high to low' },
  { id: 'name', label: 'Name A–Z' },
];

export default function Shop({ onOpen, onQuickAdd }) {
  const [cat, setCat] = useState('all');
  const [q, setQ] = useState('');
  const [sort, setSort] = useState('featured');

  const list = useMemo(() => {
    const term = q.trim().toLowerCase();
    let r = PRODUCTS.filter((p) => (cat === 'all' || p.category === cat) && (!term || `${p.name} ${p.notes} ${p.tag}`.toLowerCase().includes(term)));
    if (sort === 'price-asc') r = [...r].sort((a, b) => a.price - b.price);
    if (sort === 'price-desc') r = [...r].sort((a, b) => b.price - a.price);
    if (sort === 'name') r = [...r].sort((a, b) => a.name.localeCompare(b.name));
    return r;
  }, [cat, q, sort]);
  const active = CATEGORIES.find((c) => c.id === cat);

  return (
    <section className="shop" id="shop" aria-labelledby="h-shop">
      <div className="wrap">
        <div className="shop__head">
          <div>
            <p className="eyebrow">The NEUROBREW store <i /></p>
            <h2 id="h-shop" className="title title--sm">Engineered coffee, <em>roasted to order.</em></h2>
          </div>
          <p className="shop__perk"><b>Free shipping</b> on orders over $50 · roasted &amp; shipped within 48 h from Los Angeles</p>
        </div>

        <div className="shop__bar">
          <div className="chips" role="tablist" aria-label="Coffee categories">
            {[{ id: 'all', label: 'All' }, ...CATEGORIES].map((c) => (
              <button key={c.id} role="tab" aria-selected={cat === c.id} className={`chip ${cat === c.id ? 'is-on' : ''}`} onClick={() => setCat(c.id)}>
                {c.label}<span className="chip__n">{c.id === 'all' ? PRODUCTS.length : PRODUCTS.filter((p) => p.category === c.id).length}</span>
              </button>
            ))}
          </div>
          <div className="shop__tools">
            <label className="field field--inline"><span className="sr">Search coffee</span>
              <input type="search" placeholder="Search beans, notes, gear…" value={q} onChange={(e) => setQ(e.target.value)} maxLength={60} />
            </label>
            <label className="field field--inline"><span className="sr">Sort</span>
              <select value={sort} onChange={(e) => setSort(e.target.value)}>{SORTS.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}</select>
            </label>
          </div>
        </div>
        {active && <p className="shop__blurb">{active.blurb}</p>}

        {list.length === 0 ? (
          <p className="empty">No products match “{q}”. <button className="link" onClick={() => { setQ(''); setCat('all'); }}>Clear filters</button></p>
        ) : (
          <div className="products">
            {list.map((p) => (
              <article key={p.id} className="product">
                <button className="product__open" onClick={() => onOpen(p)} aria-label={`View ${p.name}`}>
                  <span className="product__tag">{p.tag}</span>
                  <div className="product__art"><ProductArt product={p} size={180} /></div>
                  <h3>{p.name}</h3>
                  <p>{p.notes}</p>
                </button>
                <div className="product__row">
                  <b className="mono">{p.options === 'none' ? '' : 'from '}{money(p.price)}</b>
                  {p.options === 'none'
                    ? <button className="btn btn--solid btn--sm" onClick={() => onQuickAdd(p)} aria-label={`Add ${p.name} to cart`}>Add to cart</button>
                    : <button className="btn btn--outline btn--sm" onClick={() => onOpen(p)} aria-label={`Choose options for ${p.name}`}>Choose</button>}
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
