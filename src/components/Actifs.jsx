import { useState } from 'react';
import { euro, getPersonne, getProprietaireLabel } from '../utils.js';
import { Modal } from './Shared.jsx';

const CAT_ICONS  = { immobilier: '🏠', financier: '💰', professionnel: '🏢', exotique: '💎' };
const CAT_COLORS = { immobilier: '#1B2B4B', financier: '#C9A96E', professionnel: '#6B7280', exotique: '#9333EA' };

export default function Actifs({ pov, actifs, setActifs }) {
  const [filter, setFilter]   = useState('tous');
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm]       = useState({ nom: '', categorie: 'immobilier', valeur: '', type: 'Résidence principale', pays: 'France', note: '' });

  const displayed = filter === 'tous' ? actifs : actifs.filter(a => a.categorie === filter);
  const byCategorie = displayed.reduce((acc, a) => { (acc[a.categorie] = acc[a.categorie] || []).push(a); return acc; }, {});

  const totals = ['immobilier', 'financier', 'professionnel', 'exotique'].reduce((acc, cat) => {
    acc[cat] = actifs.filter(a => a.categorie === cat).reduce((s, a) => s + a.valeur, 0);
    return acc;
  }, { total: actifs.reduce((s, a) => s + a.valeur, 0) });

  const addActif = () => {
    if (!form.nom.trim() || !form.valeur) return;
    setActifs(prev => [...prev, { id: Date.now(), ...form, valeur: parseInt(form.valeur), proprietaires: [pov], credit: false, beneficiaire: null }]);
    setForm({ nom: '', categorie: 'immobilier', valeur: '', type: 'Résidence principale', pays: 'France', note: '' });
    setShowAdd(false);
  };

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '36px 24px 100px' }} className="fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <p style={{ color: '#C9A96E', fontSize: 12, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 6 }}>Mes actifs</p>
          <h1 className="font-serif" style={{ color: '#1B2B4B', fontSize: 34, margin: 0 }}>Patrimoine familial</h1>
          <p style={{ color: '#9CA3AF', marginTop: 6, fontSize: 14 }}>Total estimé : <strong style={{ color: '#1B2B4B' }}>{euro(totals.total)}</strong></p>
        </div>
        <button className="btn-gold" onClick={() => setShowAdd(true)}>+ Ajouter un actif</button>
      </div>

      {/* Résumé par catégorie */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 16, marginBottom: 28 }}>
        {['immobilier', 'financier', 'professionnel', 'exotique'].map(cat => (
          <div key={cat} className="card" onClick={() => setFilter(filter === cat ? 'tous' : cat)}
            style={{ padding: 20, cursor: 'pointer', borderLeft: `4px solid ${CAT_COLORS[cat]}` }}>
            <span style={{ fontSize: 22 }}>{CAT_ICONS[cat]}</span>
            <p style={{ color: '#9CA3AF', fontSize: 12, marginTop: 8, textTransform: 'capitalize' }}>{cat}</p>
            <p style={{ fontWeight: 700, color: '#1B2B4B', fontSize: 21, margin: '2px 0' }}>{euro(totals[cat])}</p>
            <p style={{ color: '#9CA3AF', fontSize: 11, margin: 0 }}>{actifs.filter(a => a.categorie === cat).length} actif(s)</p>
          </div>
        ))}
      </div>

      {/* Filtres */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
        {[['tous', 'Tous'], ['immobilier', '🏠 Immobilier'], ['financier', '💰 Financier'], ['professionnel', '🏢 Professionnel'], ['exotique', '💎 Exotique']].map(([id, label]) => (
          <button key={id} onClick={() => setFilter(id)} style={{ padding: '8px 16px', borderRadius: 20, fontSize: 13, cursor: 'pointer', border: 'none', fontFamily: 'Inter, sans-serif', transition: 'all 0.2s', background: filter === id ? '#1B2B4B' : 'white', color: filter === id ? 'white' : '#6B7280', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
            {label}
          </button>
        ))}
      </div>

      {/* Liste */}
      {Object.entries(byCategorie).map(([cat, list]) => (
        <div key={cat} style={{ marginBottom: 32 }}>
          <h2 className="font-serif" style={{ color: '#1B2B4B', fontSize: 22, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
            {CAT_ICONS[cat]} {cat.charAt(0).toUpperCase() + cat.slice(1)}
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(310px, 1fr))', gap: 16 }}>
            {list.map(actif => (
              <div key={actif.id} className="card" style={{ padding: 24, borderLeft: `4px solid ${CAT_COLORS[actif.categorie]}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                  <h3 style={{ fontWeight: 600, color: '#1B2B4B', fontSize: 15, margin: 0, lineHeight: 1.3 }}>{actif.nom}</h3>
                  <span style={{ background: '#F5F0EA', color: '#6B7280', fontSize: 11, padding: '3px 9px', borderRadius: 6, whiteSpace: 'nowrap', marginLeft: 8 }}>{actif.type}</span>
                </div>
                <p className="font-serif" style={{ color: '#C9A96E', fontSize: 28, fontWeight: 700, margin: '0 0 14px' }}>{euro(actif.valeur)}</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                  {[
                    ['Propriétaire(s)', getProprietaireLabel(actif.proprietaires), null],
                    actif.proprietaires.length > 1 ? ['Quote-part / pers.', euro(actif.valeur / actif.proprietaires.length), null] : null,
                    actif.pays ? ['Pays', actif.pays, actif.pays !== 'France' ? '#D97706' : null] : null,
                    actif.beneficiaire ? ['Bénéficiaire', actif.beneficiaire, null] : null,
                  ].filter(Boolean).map(([label, val, color]) => (
                    <div key={label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                      <span style={{ color: '#9CA3AF' }}>{label}</span>
                      <span style={{ color: color || '#2C2C2C', fontWeight: 500 }}>{color ? `⚠ ${val}` : val}</span>
                    </div>
                  ))}
                  {actif.credit && (
                    <div style={{ marginTop: 6, background: '#FEF2F2', borderRadius: 6, padding: '6px 10px' }}>
                      <span style={{ color: '#DC2626', fontSize: 12 }}>⚠ Crédit en cours</span>
                    </div>
                  )}
                  {actif.note && (
                    <div style={{ marginTop: 6, background: '#FFFBEB', borderRadius: 6, padding: '6px 10px' }}>
                      <span style={{ color: '#D97706', fontSize: 12 }}>ℹ {actif.note}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Ajouter un actif">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {[
            { label: 'Nom de l\'actif *', key: 'nom', type: 'text', placeholder: 'Ex: Appartement Lyon' },
            { label: 'Valeur estimée (€) *', key: 'valeur', type: 'number', placeholder: '150000' },
            { label: 'Notes', key: 'note', type: 'text', placeholder: 'Ex: Crédit restant 80k€' },
          ].map(f => (
            <div key={f.key}>
              <label style={{ color: '#6B7280', fontSize: 13, display: 'block', marginBottom: 6 }}>{f.label}</label>
              <input type={f.type} value={form[f.key]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))} placeholder={f.placeholder}
                style={{ width: '100%', border: '1px solid #E5E7EB', borderRadius: 8, padding: '10px 14px', fontSize: 14, fontFamily: 'Inter, sans-serif' }} />
            </div>
          ))}
          {[
            { label: 'Catégorie', key: 'categorie', options: [['immobilier', 'Immobilier'], ['financier', 'Financier'], ['professionnel', 'Professionnel'], ['exotique', '💎 Exotique (montres, or, art, voitures...)']] },
            { label: 'Pays', key: 'pays', options: [['France', 'France'], ['Italie', 'Italie'], ['Espagne', 'Espagne'], ['Autre', 'Autre']] },
          ].map(({ label, key, options }) => (
            <div key={key}>
              <label style={{ color: '#6B7280', fontSize: 13, display: 'block', marginBottom: 6 }}>{label}</label>
              <select value={form[key]} onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))}
                style={{ width: '100%', border: '1px solid #E5E7EB', borderRadius: 8, padding: '10px 14px', fontSize: 14, fontFamily: 'Inter, sans-serif' }}>
                {options.map(([val, lbl]) => <option key={val} value={val}>{lbl}</option>)}
              </select>
            </div>
          ))}
          <p style={{ color: '#9CA3AF', fontSize: 12, margin: 0 }}>Attribué à {getPersonne(pov)?.prenom} (point de vue actuel)</p>
          <button className="btn-navy" onClick={addActif}>Ajouter l'actif</button>
        </div>
      </Modal>
    </div>
  );
}
