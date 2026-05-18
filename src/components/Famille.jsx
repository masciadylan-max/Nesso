import { useState } from 'react';
import { FAMILLE, ACTIONS } from '../data.js';
import { euro, getPersonne, getPatrimoine, getActifsByOwner, getAlerts } from '../utils.js';
import { Badge } from './Shared.jsx';

export default function Famille({ pov, setPov, actifs }) {
  const [selected, setSelected] = useState(null);
  const toggle = (id) => setSelected(selected === id ? null : id);

  const gen = [0, 1, 2].map(g => FAMILLE.filter(p => p.generation === g));

  const MemberCard = ({ p }) => {
    const patrimoine = getPatrimoine(p.id, actifs);
    const alerts = getAlerts(p.id);
    const isPov = p.id === pov;
    const isSel = p.id === selected;
    return (
      <div onClick={() => toggle(p.id)} style={{
        border: `2px solid ${isPov ? '#C9A96E' : isSel ? '#1B2B4B' : '#E5E7EB'}`,
        borderRadius: 12, padding: 16, cursor: 'pointer', transition: 'all 0.22s',
        background: isPov ? '#FFFBF5' : isSel ? '#F0F4FF' : 'white',
        minWidth: 130, textAlign: 'center', position: 'relative',
      }}
        onMouseEnter={e => { if (!isPov && !isSel) e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(27,43,75,0.1)'; }}
        onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none'; }}>
        {alerts.length > 0 && (
          <div title={alerts.join(' | ')} style={{ position: 'absolute', top: 8, right: 8, width: 9, height: 9, borderRadius: '50%', background: '#DC2626', animation: 'pulse 2s infinite' }} />
        )}
        <div style={{ width: 42, height: 42, borderRadius: '50%', background: isPov ? '#C9A96E' : '#1B2B4B', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: 17, margin: '0 auto 10px' }}>
          {p.prenom[0]}
        </div>
        <p style={{ fontWeight: 600, color: '#1B2B4B', fontSize: 14, margin: '0 0 3px' }}>{p.prenom}</p>
        <p style={{ color: '#9CA3AF', fontSize: 11, margin: '0 0 6px' }}>{p.age} ans</p>
        {patrimoine > 0 && <p style={{ color: '#C9A96E', fontWeight: 700, fontSize: 13, margin: 0 }}>{euro(patrimoine)}</p>}
        {ACTIONS[p.id] && <p style={{ color: '#9CA3AF', fontSize: 11, marginTop: 3 }}>{ACTIONS[p.id].length} action(s)</p>}
      </div>
    );
  };

  const selectedPerson  = selected ? getPersonne(selected) : null;
  const selectedActifs  = selected ? getActifsByOwner(selected, actifs) : [];
  const selectedActions = selected ? (ACTIONS[selected] || []) : [];
  const selectedAlerts  = selected ? getAlerts(selected) : [];

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '36px 24px 100px' }} className="fade-in">
      <div style={{ marginBottom: 32 }}>
        <p style={{ color: '#C9A96E', fontSize: 12, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 6 }}>Ma famille</p>
        <h1 className="font-serif" style={{ color: '#1B2B4B', fontSize: 34, margin: 0 }}>Arbre généalogique</h1>
        <p style={{ color: '#9CA3AF', marginTop: 6, fontSize: 14 }}>Cliquez sur un membre pour voir sa fiche · ⬤ rouge = alerte active</p>
      </div>

      {/* Arbre */}
      <div className="card" style={{ padding: 32, marginBottom: 22, overflowX: 'auto' }}>
        <div style={{ minWidth: 560, position: 'relative' }}>
          {/* Gen 0 */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: 16, position: 'relative', paddingBottom: 0 }}>
            <div style={{ position: 'absolute', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: 2, height: 36, background: '#C9A96E' }} />
            <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 80, height: 2, background: '#C9A96E' }} />
            {gen[0].map(p => <MemberCard key={p.id} p={p} />)}
          </div>
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <div style={{ width: 2, height: 36, background: '#C9A96E' }} />
          </div>
          {/* Gen 1 */}
          <div style={{ position: 'relative', display: 'flex', justifyContent: 'center', gap: 16 }}>
            <div style={{ position: 'absolute', top: '50%', left: '16%', right: '10%', height: 2, background: '#E5E7EB' }} />
            {gen[1].map(p => (
              <div key={p.id} style={{ position: 'relative', zIndex: 1 }}>
                {p.id === 'mere' && <div style={{ position: 'absolute', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: 2, height: 36, background: '#C9A96E' }} />}
                <MemberCard p={p} />
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <div style={{ width: 2, height: 36, background: '#C9A96E' }} />
          </div>
          {/* Gen 2 */}
          <div style={{ position: 'relative', display: 'flex', justifyContent: 'center', gap: 16 }}>
            <div style={{ position: 'absolute', top: '50%', left: '38%', right: '38%', height: 2, background: '#E5E7EB' }} />
            {gen[2].map(p => <div key={p.id} style={{ zIndex: 1 }}><MemberCard p={p} /></div>)}
          </div>
        </div>
      </div>

      {/* Fiche */}
      {selectedPerson && (
        <div className="card fade-in" style={{ padding: 28 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ width: 56, height: 56, borderRadius: '50%', background: selected === pov ? '#C9A96E' : '#1B2B4B', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: 22, flexShrink: 0 }}>
                {selectedPerson.prenom[0]}
              </div>
              <div>
                <h2 className="font-serif" style={{ color: '#1B2B4B', fontSize: 26, margin: '0 0 4px' }}>{selectedPerson.prenom}</h2>
                <p style={{ color: '#6B7280', margin: 0, fontSize: 14 }}>{selectedPerson.role} · {selectedPerson.age} ans</p>
                {selectedPerson.profession && <p style={{ color: '#9CA3AF', margin: '2px 0 0', fontSize: 13 }}>{selectedPerson.profession}</p>}
                {selectedPerson.handicap && <span style={{ display: 'inline-block', marginTop: 6, background: '#EFF6FF', color: '#1D4ED8', fontSize: 11, padding: '2px 9px', borderRadius: 6, fontWeight: 500 }}>✓ Abattement handicap 159 325€</span>}
              </div>
            </div>
            {selected !== pov && (
              <button className="btn-navy" style={{ fontSize: 13, padding: '9px 18px' }} onClick={() => { setPov(selected); setSelected(null); }}>
                Voir depuis son point de vue →
              </button>
            )}
          </div>

          {selectedAlerts.length > 0 && (
            <div style={{ background: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: 10, padding: 16, marginBottom: 20 }}>
              <p style={{ color: '#991B1B', fontWeight: 600, fontSize: 14, marginBottom: 8 }}>⚠ Alertes pour {selectedPerson.prenom}</p>
              {selectedAlerts.map((a, i) => <p key={i} style={{ color: '#DC2626', fontSize: 13, margin: '0 0 4px' }}>• {a}</p>)}
            </div>
          )}

          {selectedActifs.length > 0 && (
            <div style={{ marginBottom: 22 }}>
              <h3 style={{ fontWeight: 600, color: '#1B2B4B', fontSize: 16, marginBottom: 14 }}>Ses actifs</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))', gap: 12 }}>
                {selectedActifs.map(a => (
                  <div key={a.id} style={{ background: '#F9FAFB', borderRadius: 9, padding: 14 }}>
                    <p style={{ fontWeight: 500, fontSize: 14, color: '#2C2C2C', margin: '0 0 4px' }}>{a.nom}</p>
                    <p style={{ color: '#C9A96E', fontWeight: 700, fontSize: 17, margin: '0 0 4px' }}>{euro(a.valeur / a.proprietaires.length)}</p>
                    <p style={{ color: '#9CA3AF', fontSize: 11, margin: 0 }}>{a.type}{a.pays ? ` · ${a.pays}` : ''}</p>
                    {a.note && <p style={{ color: '#D97706', fontSize: 11, marginTop: 4 }}>ℹ {a.note}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {selectedActions.length > 0 && (
            <div>
              <h3 style={{ fontWeight: 600, color: '#1B2B4B', fontSize: 16, marginBottom: 14 }}>Actions recommandées</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {selectedActions.map((action, i) => (
                  <div key={i} style={{ background: '#F9FAFB', borderRadius: 9, padding: 14, display: 'flex', alignItems: 'center', gap: 12 }}>
                    <Badge urgence={action.urgence} />
                    <div>
                      <p style={{ fontWeight: 500, fontSize: 13, color: '#2C2C2C', margin: '0 0 2px' }}>{action.titre}</p>
                      <p style={{ color: '#9CA3AF', fontSize: 12, margin: 0 }}>{action.economieLabel} · Délai {action.delai}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {selectedActifs.length === 0 && selectedActions.length === 0 && (
            <p style={{ color: '#9CA3AF', textAlign: 'center', padding: '16px 0', fontSize: 14 }}>Données patrimoniales non renseignées pour ce membre</p>
          )}
        </div>
      )}
    </div>
  );
}
