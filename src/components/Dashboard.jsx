import { useState, useEffect } from 'react';
import { CALCULS, ACTIONS } from '../data.js';
import { euro, getPersonne, getPatrimoine } from '../utils.js';
import { Badge, Skeleton, Modal } from './Shared.jsx';

export default function Dashboard({ pov, actifs }) {
  const [tab, setTab] = useState('succession');
  const [selectedAction, setSelectedAction] = useState(null);
  const [loading, setLoading] = useState(true);

  const person   = getPersonne(pov);
  const calculs  = CALCULS[pov] || CALCULS.lucas;
  const actions  = ACTIONS[pov]  || ACTIONS.lucas;
  const patrimoine = getPatrimoine(pov, actifs);

  useEffect(() => {
    setLoading(true);
    const t = setTimeout(() => setLoading(false), 500);
    return () => clearTimeout(t);
  }, [pov]);

  const scoreColor = calculs.score > 70 ? '#DC2626' : calculs.score > 50 ? '#D97706' : '#16A34A';
  const scoreLabel = calculs.score > 70 ? 'Risque élevé' : calculs.score > 50 ? 'Risque modéré' : 'Risque faible';

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '36px 24px 100px' }} className="fade-in">

      {/* Header */}
      <div style={{ marginBottom: 36 }}>
        <p style={{ color: '#C9A96E', fontSize: 12, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 6 }}>Tableau de bord</p>
        <h1 className="font-serif" style={{ color: '#1B2B4B', fontSize: 34, fontWeight: 700, margin: 0 }}>
          Bonjour, {person?.prenom} <span style={{ color: '#C9A96E' }}>✦</span>
        </h1>
        <p style={{ color: '#9CA3AF', marginTop: 6, fontSize: 14 }}>
          Situation patrimoniale au {new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
      </div>

      {/* 3 cartes du haut */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 18, marginBottom: 24 }}>

        <div className="card" style={{ padding: 24 }}>
          <p style={{ color: '#9CA3AF', fontSize: 12, fontWeight: 500, letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 10 }}>Patrimoine propre</p>
          {loading ? <div style={{ marginBottom: 12 }}><Skeleton h={42} /></div> : (
            <p className="font-serif" style={{ color: '#1B2B4B', fontSize: 38, fontWeight: 700, margin: '0 0 12px' }}>{euro(patrimoine)}</p>
          )}
          <div style={{ borderTop: '1px solid #F5F0EA', paddingTop: 12 }}>
            <p style={{ color: '#9CA3AF', fontSize: 12, marginBottom: 4 }}>Droit successoral estimé</p>
            {loading ? <Skeleton h={24} w="55%" /> : (
              <p style={{ color: '#C9A96E', fontWeight: 700, fontSize: 20, margin: 0 }}>{euro(calculs.successionEstimee)}</p>
            )}
          </div>
        </div>

        <div className="card" style={{ padding: 24 }}>
          <p style={{ color: '#9CA3AF', fontSize: 12, fontWeight: 500, letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 14 }}>Score de risque successoral</p>
          {loading ? <Skeleton h={72} /> : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
              <div style={{ position: 'relative', width: 72, height: 72, flexShrink: 0 }}>
                <svg viewBox="0 0 100 100" style={{ transform: 'rotate(-90deg)', width: '100%', height: '100%' }}>
                  <circle cx="50" cy="50" r="42" fill="none" stroke="#F5F0EA" strokeWidth="12" />
                  <circle cx="50" cy="50" r="42" fill="none" stroke={scoreColor} strokeWidth="12"
                    strokeDasharray={`${calculs.score * 2.638} ${263.8 - calculs.score * 2.638}`} strokeLinecap="round" />
                </svg>
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontSize: 19, fontWeight: 700, color: scoreColor }}>{calculs.score}</span>
                </div>
              </div>
              <div>
                <p style={{ fontWeight: 600, color: '#2C2C2C', fontSize: 16, margin: '0 0 4px' }}>{scoreLabel}</p>
                <p style={{ color: '#9CA3AF', fontSize: 12, lineHeight: 1.5, margin: 0 }}>
                  {calculs.score > 70 ? 'Actions urgentes nécessaires' : calculs.score > 50 ? 'Optimisations identifiées' : 'Situation bien maîtrisée'}
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="card" style={{ padding: 24, borderLeft: '4px solid #C9A96E' }}>
          <p style={{ color: '#9CA3AF', fontSize: 12, fontWeight: 500, letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 10 }}>Économies identifiées</p>
          {loading ? <div style={{ marginBottom: 12 }}><Skeleton h={42} /></div> : (
            <p className="font-serif" style={{ color: '#C9A96E', fontSize: 38, fontWeight: 700, margin: '0 0 12px' }}>{euro(calculs.economieSuccession)}</p>
          )}
          <p style={{ color: '#9CA3AF', fontSize: 13, margin: 0 }}>En appliquant les {actions.length} recommandations</p>
        </div>
      </div>

      {/* Onglets */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div style={{ borderBottom: '1px solid #F5F0EA', display: 'flex', padding: '0 6px' }}>
          {[['succession', '⚖ Succession'], ['optimisation', '📈 Optimisation fiscale']].map(([id, label]) => (
            <button key={id} onClick={() => setTab(id)} style={{
              padding: '14px 24px', fontSize: 14, fontWeight: 500, cursor: 'pointer', border: 'none', background: 'none',
              fontFamily: 'Inter, sans-serif', transition: 'all 0.2s', marginBottom: -1,
              color: tab === id ? '#1B2B4B' : '#9CA3AF',
              borderBottom: tab === id ? '2px solid #C9A96E' : '2px solid transparent',
            }}>
              {label}
            </button>
          ))}
        </div>

        <div style={{ padding: 28 }}>
          {tab === 'succession' && (
            <div className="fade-in">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 28 }}>
                {[
                  { label: 'Droits estimés — statu quo', val: calculs.droits.statusQuo, bg: '#F9FAFB', color: '#1B2B4B', sub: 'Situation actuelle' },
                  { label: 'Droits après optimisation', val: calculs.droits.optimise, bg: '#F0FDF4', color: '#16A34A', sub: 'Scénario optimisé' },
                  { label: 'Économie possible', val: calculs.economieSuccession, bg: '#FFF8F0', color: '#C9A96E', sub: 'Avec les actions recommandées', border: '1px solid #FDE8C8' },
                ].map(({ label, val, bg, color, sub, border }) => (
                  <div key={label} style={{ background: bg, borderRadius: 10, padding: 20, border }}>
                    <p style={{ color: '#9CA3AF', fontSize: 12, marginBottom: 8 }}>{label}</p>
                    {loading ? <Skeleton h={30} /> : <p style={{ color, fontSize: 26, fontWeight: 700, margin: '0 0 4px' }}>{euro(val)}</p>}
                    <p style={{ color: '#9CA3AF', fontSize: 11, margin: 0 }}>{sub}</p>
                  </div>
                ))}
              </div>
              <div>
                <p style={{ color: '#9CA3AF', fontSize: 13, marginBottom: 16, fontWeight: 500 }}>Comparatif visuel</p>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 32, height: 120 }}>
                  {[
                    { label: 'Statu quo', val: calculs.droits.statusQuo, color: '#1B2B4B' },
                    { label: 'Optimisé',  val: calculs.droits.optimise,  color: '#C9A96E' },
                  ].map(({ label, val, color }) => {
                    const max = Math.max(calculs.droits.statusQuo, 1);
                    const pct = Math.max((val / max) * 88, val > 0 ? 6 : 2);
                    return (
                      <div key={label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, minWidth: 80 }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color }}>{euro(val)}</span>
                        <div style={{ width: 56, height: `${pct}%`, background: color, borderRadius: '6px 6px 0 0', transition: 'height 0.6s ease' }} />
                        <span style={{ fontSize: 12, color: '#6B7280' }}>{label}</span>
                      </div>
                    );
                  })}
                  <div style={{ flex: 1, borderBottom: '1px solid #E5E7EB', alignSelf: 'flex-end', marginBottom: 28 }} />
                </div>
              </div>
            </div>
          )}

          {tab === 'optimisation' && (
            <div className="fade-in">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 16, marginBottom: 28 }}>
                {[
                  { label: 'Impôts annuels estimés', val: calculs.impots.total, suffix: '/an', color: '#1B2B4B', bg: '#F9FAFB', sub: 'IR + IFI + Prélèvements sociaux' },
                  { label: 'Économies possibles', val: calculs.economiesAnnuelles, suffix: '/an', color: '#16A34A', bg: '#F0FDF4', sub: 'Gain annuel possible' },
                  { label: 'Gain sur 10 ans', val: calculs.gainDixAns, suffix: '', color: '#C9A96E', bg: '#FFF8F0', sub: 'Projection optimisation', border: '1px solid #FDE8C8' },
                ].map(({ label, val, suffix, color, bg, sub, border }) => (
                  <div key={label} style={{ background: bg, borderRadius: 10, padding: 20, border }}>
                    <p style={{ color: '#9CA3AF', fontSize: 12, marginBottom: 8 }}>{label}</p>
                    {loading ? <Skeleton h={28} /> : <p style={{ color, fontSize: 24, fontWeight: 700, margin: '0 0 4px' }}>{euro(val)}{suffix}</p>}
                    <p style={{ color: '#9CA3AF', fontSize: 11, margin: 0 }}>{sub}</p>
                  </div>
                ))}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div style={{ background: '#F9FAFB', borderRadius: 10, padding: 20 }}>
                  <p style={{ color: '#9CA3AF', fontSize: 12, marginBottom: 14, fontWeight: 500 }}>Répartition fiscale</p>
                  {[['Impôt sur le revenu', calculs.impots.IR, '#1B2B4B'], ['IFI', calculs.impots.IFI, '#C9A96E'], ['Prél. sociaux', calculs.impots.PS, '#6B7280']].map(([label, val, color]) => (
                    <div key={label} style={{ marginBottom: 12 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                        <span style={{ fontSize: 12, color: '#6B7280' }}>{label}</span>
                        <span style={{ fontSize: 12, fontWeight: 600 }}>{euro(val)}</span>
                      </div>
                      <div style={{ height: 5, background: '#E5E7EB', borderRadius: 3, overflow: 'hidden' }}>
                        <div style={{ height: '100%', background: color, width: calculs.impots.total > 0 ? `${(val / calculs.impots.total) * 100}%` : '0%', borderRadius: 3, transition: 'width 0.5s ease' }} />
                      </div>
                    </div>
                  ))}
                </div>
                <div style={{ background: '#F0FDF4', borderRadius: 10, padding: 20, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
                  <p style={{ color: '#9CA3AF', fontSize: 12, marginBottom: 10 }}>Taux effectif estimé</p>
                  <p className="font-serif" style={{ fontSize: 44, fontWeight: 700, color: calculs.impots.total > 15000 ? '#DC2626' : '#16A34A', margin: 0 }}>
                    {patrimoine > 0 ? `${Math.round((calculs.impots.total / Math.max(patrimoine * 0.04, 1)) * 100)}%` : '0%'}
                  </p>
                  <p style={{ color: '#9CA3AF', fontSize: 11, marginTop: 6 }}>sur revenus estimés</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="card" style={{ padding: 28 }}>
        <div style={{ marginBottom: 24 }}>
          <h2 className="font-serif" style={{ color: '#1B2B4B', fontSize: 24, margin: '0 0 4px' }}>Actions prioritaires</h2>
          <p style={{ color: '#9CA3AF', fontSize: 13, margin: 0 }}>Pour {person?.prenom}, triées par urgence</p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {actions.map((action, i) => (
            <div key={i} style={{ border: '1px solid #F0EBE4', borderRadius: 10, padding: 20, transition: 'box-shadow 0.2s' }}
              onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 18px rgba(27,43,75,0.09)'}
              onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 200 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10, flexWrap: 'wrap' }}>
                    <Badge urgence={action.urgence} />
                    <span style={{ fontWeight: 600, color: '#1B2B4B', fontSize: 15 }}>{action.titre}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
                    <span style={{ color: '#16A34A', fontSize: 13 }}>✓ {action.economieLabel}</span>
                    <span style={{ color: '#6B7280', fontSize: 13 }}>Coût : {action.coutLabel}</span>
                    <span style={{ color: '#9CA3AF', fontSize: 13 }}>⏱ {action.delai}</span>
                  </div>
                </div>
                <button className="btn-navy" onClick={() => setSelectedAction(action)} style={{ fontSize: 13, padding: '9px 18px', whiteSpace: 'nowrap' }}>
                  En savoir plus →
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <Modal open={!!selectedAction} onClose={() => setSelectedAction(null)} title={selectedAction?.titre}>
        {selectedAction && (
          <>
            <div style={{ marginBottom: 16 }}><Badge urgence={selectedAction.urgence} /></div>
            <p style={{ color: '#4B5563', lineHeight: 1.75, fontSize: 14, marginBottom: 20 }}>{selectedAction.description}</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
              <div style={{ background: '#F0FDF4', borderRadius: 9, padding: 16 }}>
                <p style={{ color: '#9CA3AF', fontSize: 12, marginBottom: 4 }}>Économie potentielle</p>
                <p style={{ color: '#16A34A', fontWeight: 700, fontSize: 17, margin: 0 }}>{selectedAction.economieLabel}</p>
              </div>
              <div style={{ background: '#F9FAFB', borderRadius: 9, padding: 16 }}>
                <p style={{ color: '#9CA3AF', fontSize: 12, marginBottom: 4 }}>Coût de l'action</p>
                <p style={{ color: '#1B2B4B', fontWeight: 700, fontSize: 17, margin: 0 }}>{selectedAction.coutLabel}</p>
              </div>
            </div>
            <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 8, padding: 14 }}>
              <p style={{ color: '#92400E', fontSize: 13, fontWeight: 500, margin: 0 }}>⏱ Délai recommandé : {selectedAction.delai}</p>
            </div>
          </>
        )}
      </Modal>
    </div>
  );
}
