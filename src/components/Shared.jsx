export const Badge = ({ urgence }) => {
  const cfg = {
    rouge:  { emoji: '🔴', label: 'URGENT',      bg: '#FEF2F2', color: '#991B1B', border: '#FCA5A5' },
    orange: { emoji: '🟡', label: 'IMPORTANT',   bg: '#FFFBEB', color: '#92400E', border: '#FCD34D' },
    vert:   { emoji: '🟢', label: 'À PLANIFIER', bg: '#F0FDF4', color: '#166534', border: '#86EFAC' },
  }[urgence];
  return (
    <span style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`, padding: '2px 9px', borderRadius: 6, fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap' }}>
      {cfg.emoji} {cfg.label}
    </span>
  );
};

export const Skeleton = ({ h = 20, w = '100%' }) => (
  <div className="skeleton" style={{ height: h, width: w }} />
);

export const Modal = ({ open, onClose, title, children }) => {
  if (!open) return null;
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(27,43,75,0.45)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div className="card fade-in" onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 520, padding: 28, maxHeight: '85vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
          <h3 className="font-serif" style={{ color: '#1B2B4B', fontSize: 20, margin: 0, lineHeight: 1.3 }}>{title}</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 22, color: '#9CA3AF', cursor: 'pointer', lineHeight: 1, marginLeft: 12, flexShrink: 0 }}>×</button>
        </div>
        {children}
      </div>
    </div>
  );
};
