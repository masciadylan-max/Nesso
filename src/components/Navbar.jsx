import { useState, useRef, useEffect } from 'react';
import { FAMILLE } from '../data.js';

const NAV_ITEMS_BASE = [
  { id: 'dashboard', label: 'Tableau de bord', icon: '◈' },
  { id: 'famille',   label: 'Ma famille',      icon: '◉' },
  { id: 'actifs',    label: 'Mes actifs',      icon: '◎' },
  { id: 'aide',      label: 'Aide',            icon: '◇' },
];

// Construit la liste des "points de vue" disponibles dans le sélecteur :
// - Si l'user a fait l'audit → sa vraie famille structurée
// - Sinon → famille démo (Lucas, Pierre, etc.)
//
// Structure pour l'user :
//   MOI          → actifs où l'user est propriétaire (seul ou joint), valeur totale
//   MOI + Foyer  → tous les actifs du ménage
//   [Conjoint]   → actifs du conjoint
//   [Enfants]    → un POV par enfant
//   [🔒 Parents / GP] → Nesso+ (placeholder, verrouillé)
const buildPovOptions = (userProfile) => {
  if (!userProfile) return FAMILLE.map(p => ({ id: p.id, prenom: p.prenom }));

  const prenom = userProfile.prenom || 'Vous';
  const list = [
    { id: 'user',  prenom },
  ];
  if (userProfile.conjoint) {
    list.push({ id: 'foyer',    prenom: `${prenom} + ${userProfile.conjoint}` });
    list.push({ id: 'conjoint', prenom: userProfile.conjoint });
  }
  (userProfile.enfants_prenoms || []).forEach((p, i) =>
    list.push({ id: `enfant_${i}`, prenom: p })
  );
  // Nesso+ : POV parents / grands-parents (verrouillés, affichés en teaser)
  // parents_en_vie peut être true/false (extraction) ou 'les_deux'/'pere'/'mere'/'non' (nouveau formulaire)
  const parentsVivants = userProfile.parents_en_vie === true || (userProfile.parents_en_vie && userProfile.parents_en_vie !== 'non' && userProfile.parents_en_vie !== false);
  if (parentsVivants) {
    list.push({ id: 'parents', prenom: '🔒 Mes parents', locked: true });
  }
  if (userProfile.succession?.grands_parents_vivants) {
    list.push({ id: 'grands_parents', prenom: '🔒 Grands-parents', locked: true });
  }
  return list;
};

export default function Navbar({ view, setView, pov, setPov, onReset, onLogout, userEmail, userProfile }) {
  // 'Mon compte' uniquement si connecté
  const NAV_ITEMS = userEmail
    ? [...NAV_ITEMS_BASE, { id: 'compte', label: 'Mon compte', icon: '◐' }]
    : NAV_ITEMS_BASE;
  const povOptions = buildPovOptions(userProfile);

  // Dropdown menu utilisateur
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);
  useEffect(() => {
    const handler = (e) => { if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setDropdownOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);
  return (
    <>
      {/* Desktop */}
      <nav style={{ background: '#1A201C', position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 62 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 28 }}>
            <button onClick={onReset} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }} title="Retour à l'accueil">
              <span className="font-serif" style={{ color: '#1F6B4A', fontSize: 22, fontWeight: 700, letterSpacing: '0.03em' }}>Nesso</span>
            </button>
            <div style={{ display: 'flex', gap: 2 }}>
              {NAV_ITEMS.map(item => (
                <button key={item.id} onClick={() => setView(item.id)} style={{
                  padding: '8px 16px', borderRadius: 8, fontSize: 14, fontWeight: 500, cursor: 'pointer', border: 'none',
                  fontFamily: 'DM Sans, sans-serif', transition: 'all 0.2s',
                  background: view === item.id ? 'rgba(31,107,74,0.12)' : 'transparent',
                  color: view === item.id ? '#1F6B4A' : 'rgba(255,255,255,0.65)',
                  borderBottom: view === item.id ? '2px solid #1F6B4A' : '2px solid transparent',
                }}>
                  {item.label}
                </button>
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>Point de vue</span>
            <select value={pov} onChange={e => { if (!povOptions.find(o => o.id === e.target.value)?.locked) setPov(e.target.value); }}
              style={{ background: 'rgba(255,255,255,0.08)', color: 'white', border: '1px solid rgba(31,107,74,0.35)', borderRadius: 8, padding: '6px 12px', fontSize: 13, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>
              {povOptions.map(p => (
                <option key={p.id} value={p.id} disabled={p.locked} style={{ background: '#1A201C', color: p.locked ? 'rgba(255,255,255,0.35)' : 'white' }}>
                  {p.prenom}
                </option>
              ))}
            </select>
            {userEmail && (
              <div ref={dropdownRef} style={{ position: 'relative' }}>
                <button onClick={() => setDropdownOpen(o => !o)}
                  style={{ display: 'flex', alignItems: 'center', gap: 7, background: dropdownOpen ? 'rgba(31,107,74,0.18)' : 'rgba(255,255,255,0.07)', border: '1px solid rgba(31,107,74,0.25)', color: '#1F6B4A', borderRadius: 20, padding: '5px 10px 5px 5px', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>
                  <span style={{ width: 24, height: 24, borderRadius: '50%', background: '#1F6B4A', color: 'white', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {userEmail[0].toUpperCase()}
                  </span>
                  <span style={{ fontSize: 12, maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{userEmail}</span>
                  <span style={{ fontSize: 9, opacity: 0.7, marginLeft: 2 }}>{dropdownOpen ? '▲' : '▼'}</span>
                </button>
                {dropdownOpen && (
                  <div style={{ position: 'absolute', top: 'calc(100% + 8px)', right: 0, background: 'white', borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.12)', border: '1px solid #DDD8C9', minWidth: 180, overflow: 'hidden', zIndex: 200 }}>
                    <button onClick={() => { setView('compte'); setDropdownOpen(false); }}
                      style={{ width: '100%', padding: '12px 16px', background: 'none', border: 'none', textAlign: 'left', fontSize: 14, color: '#1A201C', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontSize: 15 }}>◐</span> Mon compte
                    </button>
                    <div style={{ height: 1, background: '#F6F4ED', margin: '0 12px' }} />
                    <button onClick={() => { setDropdownOpen(false); onLogout?.(); }}
                      style={{ width: '100%', padding: '12px 16px', background: 'none', border: 'none', textAlign: 'left', fontSize: 14, color: '#C2502F', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontSize: 15 }}>→</span> Se déconnecter
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* Mobile bottom */}
      <nav style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: '#1A201C', zIndex: 100, borderTop: '1px solid rgba(31,107,74,0.18)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-around', padding: '10px 0 12px', maxWidth: 600, margin: '0 auto' }}>
          {NAV_ITEMS.map(item => (
            <button key={item.id} onClick={() => setView(item.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, fontFamily: 'DM Sans, sans-serif', color: view === item.id ? '#1F6B4A' : 'rgba(255,255,255,0.45)' }}>
              <span style={{ fontSize: 17 }}>{item.icon}</span>
              <span style={{ fontSize: 10, fontWeight: view === item.id ? 600 : 400 }}>{item.label.split(' ')[0]}</span>
            </button>
          ))}
          <select value={pov} onChange={e => { if (!povOptions.find(o => o.id === e.target.value)?.locked) setPov(e.target.value); }}
            style={{ background: 'transparent', color: 'rgba(255,255,255,0.55)', border: 'none', fontSize: 10, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>
            {povOptions.map(p => (
              <option key={p.id} value={p.id} disabled={p.locked} style={{ background: '#1A201C' }}>{p.prenom}</option>
            ))}
          </select>
        </div>
      </nav>
    </>
  );
}
