import { FAMILLE } from '../data.js';

const NAV_ITEMS_BASE = [
  { id: 'dashboard', label: 'Tableau de bord', icon: '◈' },
  { id: 'famille',   label: 'Ma famille',      icon: '◉' },
  { id: 'actifs',    label: 'Mes actifs',      icon: '◎' },
  { id: 'aide',      label: 'Aide',            icon: '◇' },
];

// Construit la liste des "points de vue" disponibles dans le selecteur :
// - Si l'user a fait l'audit → sa vraie famille (Vous + conjoint + enfants)
// - Sinon → famille démo (Lucas, Pierre, etc.)
const buildPovOptions = (userProfile) => {
  if (!userProfile) return FAMILLE.map(p => ({ id: p.id, prenom: p.prenom }));
  const list = [{ id: 'user', prenom: userProfile.prenom || 'Vous' }];
  if (userProfile.conjoint) list.push({ id: 'conjoint', prenom: userProfile.conjoint });
  (userProfile.enfants_prenoms || []).forEach((prenom, i) =>
    list.push({ id: `enfant_${i}`, prenom })
  );
  return list;
};

export default function Navbar({ view, setView, pov, setPov, onApiKey, onReset, onLogout, userEmail, userProfile }) {
  // 'Mon compte' uniquement si connecté
  const NAV_ITEMS = userEmail
    ? [...NAV_ITEMS_BASE, { id: 'compte', label: 'Mon compte', icon: '◐' }]
    : NAV_ITEMS_BASE;
  const povOptions = buildPovOptions(userProfile);
  return (
    <>
      {/* Desktop */}
      <nav style={{ background: '#1B2B4B', position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 62 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 28 }}>
            <button onClick={onReset} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }} title="Retour à l'accueil">
              <span className="font-serif" style={{ color: '#C9A96E', fontSize: 22, fontWeight: 700, letterSpacing: '0.03em' }}>Nesso</span>
            </button>
            <div style={{ display: 'flex', gap: 2 }}>
              {NAV_ITEMS.map(item => (
                <button key={item.id} onClick={() => setView(item.id)} style={{
                  padding: '8px 16px', borderRadius: 8, fontSize: 14, fontWeight: 500, cursor: 'pointer', border: 'none',
                  fontFamily: 'DM Sans, sans-serif', transition: 'all 0.2s',
                  background: view === item.id ? 'rgba(201,169,110,0.12)' : 'transparent',
                  color: view === item.id ? '#C9A96E' : 'rgba(255,255,255,0.65)',
                  borderBottom: view === item.id ? '2px solid #C9A96E' : '2px solid transparent',
                }}>
                  {item.label}
                </button>
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>Point de vue</span>
            <select value={pov} onChange={e => setPov(e.target.value)} style={{ background: 'rgba(255,255,255,0.08)', color: 'white', border: '1px solid rgba(201,169,110,0.35)', borderRadius: 8, padding: '6px 12px', fontSize: 13, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>
              {povOptions.map(p => <option key={p.id} value={p.id} style={{ background: '#1B2B4B' }}>{p.prenom}</option>)}
            </select>
<button onClick={onApiKey} title="Configurer la clé API" style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.55)', borderRadius: 8, padding: '6px 11px', cursor: 'pointer', fontSize: 13, fontFamily: 'DM Sans, sans-serif' }}>⚙</button>
            {userEmail && (
              <button onClick={() => setView('compte')} title="Mon compte"
                style={{ display: 'flex', alignItems: 'center', gap: 7, background: view === 'compte' ? 'rgba(201,169,110,0.18)' : 'rgba(255,255,255,0.07)', border: '1px solid rgba(201,169,110,0.25)', color: '#C9A96E', borderRadius: 20, padding: '5px 12px 5px 5px', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', borderLeft: '1px solid rgba(255,255,255,0.1)' }}>
                <span style={{ width: 24, height: 24, borderRadius: '50%', background: '#C9A96E', color: 'white', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {userEmail[0].toUpperCase()}
                </span>
                <span style={{ fontSize: 12, maxWidth: 130, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{userEmail}</span>
              </button>
            )}
          </div>
        </div>
      </nav>

      {/* Mobile bottom */}
      <nav style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: '#1B2B4B', zIndex: 100, borderTop: '1px solid rgba(201,169,110,0.18)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-around', padding: '10px 0 12px', maxWidth: 600, margin: '0 auto' }}>
          {NAV_ITEMS.map(item => (
            <button key={item.id} onClick={() => setView(item.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, fontFamily: 'DM Sans, sans-serif', color: view === item.id ? '#C9A96E' : 'rgba(255,255,255,0.45)' }}>
              <span style={{ fontSize: 17 }}>{item.icon}</span>
              <span style={{ fontSize: 10, fontWeight: view === item.id ? 600 : 400 }}>{item.label.split(' ')[0]}</span>
            </button>
          ))}
          <select value={pov} onChange={e => setPov(e.target.value)} style={{ background: 'transparent', color: 'rgba(255,255,255,0.55)', border: 'none', fontSize: 10, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>
            {FAMILLE.map(p => <option key={p.id} value={p.id} style={{ background: '#1B2B4B' }}>{p.prenom}</option>)}
          </select>
        </div>
      </nav>
    </>
  );
}
