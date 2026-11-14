import { useEffect, useRef } from 'react';

let locks = 0;
/** Accessible overlay: Esc closes, focus moves in and is trapped, then restored; page scroll locked. */
export default function Dialog({ open, onClose, label, className = '', variant = 'modal', children }) {
  const ref = useRef();
  // Keep the latest onClose without re-running the focus effect on every parent render.
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    if (!open) return undefined;
    const prev = document.activeElement;
    locks += 1; document.documentElement.classList.add('is-locked');
    const el = ref.current;
    const focusables = () => Array.from(el.querySelectorAll('button:not([disabled]), [href], input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])'));
    requestAnimationFrame(() => (el.querySelector('[data-autofocus]') || focusables()[0] || el).focus());
    const onKey = (e) => {
      if (e.key === 'Escape') { e.stopPropagation(); closeRef.current(); }
      if (e.key === 'Tab') {
        const f = focusables(); if (!f.length) return;
        const first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };
    el.addEventListener('keydown', onKey);
    return () => {
      el.removeEventListener('keydown', onKey);
      locks -= 1; if (locks <= 0) { locks = 0; document.documentElement.classList.remove('is-locked'); }
      if (prev && prev.focus) prev.focus();
    };
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!open) return null;
  return (
    <div className={`overlay overlay--${variant}`} onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div ref={ref} className={`panel panel--${variant} ${className}`} role="dialog" aria-modal="true" aria-label={label} tabIndex={-1}>
        <button className="panel__close" onClick={onClose} aria-label="Close">×</button>
        {children}
      </div>
    </div>
  );
}
