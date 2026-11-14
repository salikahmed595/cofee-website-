import { useEffect, useState } from 'react';
import { SIZES, GRINDS, CATEGORIES, MAX_QTY, unitPrice, money } from '../shared/catalog.js';
import Dialog from './Dialog.jsx';
import ProductArt from './ProductArt.jsx';

export default function ProductModal({ product, onClose, onAdd }) {
  const sizes = product ? SIZES[product.options] : null;
  const [size, setSize] = useState(null);
  const [grind, setGrind] = useState('whole');
  const [qty, setQty] = useState(1);
  useEffect(() => { if (product) { setSize(sizes ? sizes[0].id : null); setGrind(product.category === 'cold-brew' ? 'cold' : 'whole'); setQty(1); } }, [product]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!product) return null;
  const unit = unitPrice(product, size);
  const cat = CATEGORIES.find((c) => c.id === product.category);
  return (
    <Dialog open={Boolean(product)} onClose={onClose} label={product.name} className="pm">
      <div className="pm__art"><ProductArt product={product} size={320} /></div>
      <div className="pm__body">
        <p className="eyebrow">{cat?.label} · {product.tag}</p>
        <h2 className="pm__title">{product.name}</h2>
        <p className="pm__notes mono">{product.notes}</p>
        <p className="pm__desc">{product.desc}</p>

        {sizes && (
          <fieldset className="opt">
            <legend>{product.options === 'pack' ? 'Pack size' : 'Bag size'}</legend>
            <div className="seg">
              {sizes.map((s) => (
                <label key={s.id} className={`seg__item ${size === s.id ? 'is-on' : ''}`}>
                  <input type="radio" name="size" value={s.id} checked={size === s.id} onChange={() => setSize(s.id)} />
                  <span>{s.label}</span><small className="mono">{money(unitPrice(product, s.id))}</small>
                </label>
              ))}
            </div>
          </fieldset>
        )}
        {product.options === 'beans' && (
          <label className="field"><span>Grind</span>
            <select value={grind} onChange={(e) => setGrind(e.target.value)}>{GRINDS.map((g) => <option key={g.id} value={g.id}>{g.label}</option>)}</select>
          </label>
        )}

        <div className="pm__buy">
          <div className="qty" role="group" aria-label="Quantity">
            <button onClick={() => setQty((q) => Math.max(1, q - 1))} aria-label="Decrease quantity" disabled={qty <= 1}>−</button>
            <output aria-live="polite">{qty}</output>
            <button onClick={() => setQty((q) => Math.min(MAX_QTY, q + 1))} aria-label="Increase quantity" disabled={qty >= MAX_QTY}>+</button>
          </div>
          <button className="btn btn--solid" data-autofocus onClick={() => { onAdd({ id: product.id, size, grind: product.options === 'beans' ? grind : null, qty }); onClose(); }}>
            Add to cart · <span className="mono">{money(unit * qty)}</span>
          </button>
        </div>
        <p className="pm__fine">Roasted to order · ships in 48 h · free shipping over $50</p>
      </div>
    </Dialog>
  );
}
