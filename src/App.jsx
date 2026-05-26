import { useState, useEffect } from 'react';
import { ACTIFS } from './data.js';
import { supabase } from './lib/supabase.js';
import Navbar from './components/Navbar.jsx';
import Dashboard from './components/Dashboard.jsx';
import Famille from './components/Famille.jsx';
import Actifs from './components/Actifs.jsx';
import Aide from './components/Aide.jsx';
import Onboarding from './components/Onboarding.jsx';
import Auth from './components/Auth.jsx';
import Confidentialite from './components/Confidentialite.jsx';
import { Modal } from './components/Shared.jsx';

const LS = {
  get: (k, fallback) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : fallback; } catch { return fallback; } },
  set: (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
  del: (...keys) => { try { keys.forEach(k => localStorage.removeItem(k)); } catch {} },
};

const saveToSupabase = async (userId, { userProfile, actifs, pov }) => {
  await supabase.from('user_data').upsert({
    id: userId,
    profile_json: userProfile,
    actifs_json: actifs,
    pov,
    updated_at: new Date().toISOString(),
  });
};

function ApiKeyModal({ open, onClose, apiKey, setApiKey }) {
  const [val, setVal] = useState(apiKey || '');
  const save = () => { localStorage.setItem('nesso_api_key', val); setApiKey(val); onClose(); };
  return (
    <Modal open={open} onClose={onClose} title="Clé API Anthropic">
      <p style={{ color: '#6B7280', fontSize: 14, lineHeight: 1.7, marginBottom: 20 }}>
        Nécessaire pour activer le vrai Claude dans l'onboarding et le chat. Stockée uniquement dans votre navigateur.
      </p>
      <div style={{ marginBottom: 16 }}>
        <label style={{ color: '#6B7280', fontSize: 13, display: 'block', marginBottom: 7 }}>Votre clé API (sk-ant-...)</label>
        <input type="password" value={val} onChange={e => setVal(e.target.value)} placeholder="sk-ant-api03-..."
          style={{ width: '100%', border: '1px solid #E5E7EB', borderRadius: 8, padding: '10px 14px', fontSize: 14, fontFamily: 'DM Sans, sans-serif' }} />
      </div>
      <button className="btn-navy" onClick={save} style={{ width: '100%' }}>Enregistrer</button>
      <p style={{ color: '#7A7A8C', fontSize: 11, textAlign: 'center', marginTop: 12 }}>Obtenez votre clé sur <strong>console.anthropic.com</strong></p>
    </Modal>
  );
}

// Bannière "Sauvegardez votre audit" pour les utilisateurs non connectés
function SaveBanner({ onSave }) {
  return (
    <div style={{ background: 'linear-gradient(135deg, #1B2B4B 0%, #243656 100%)', padding: '14px 24px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, flexWrap: 'wrap' }}>
      <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: 13, margin: 0 }}>
        ✦ <strong style={{ color: '#C9A96E' }}>Votre analyse n'est pas sauvegardée</strong> — créez un compte gratuit pour y accéder depuis n'importe quel appareil.
      </p>
      <button onClick={onSave} className="btn-gold" style={{ fontSize: 13, padding: '7px 18px', whiteSpace: 'nowrap' }}>
        Sauvegarder mon audit →
      </button>
    </div>
  );
}

export default function App() {
  const [authUser, setAuthUser]       = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [view, setView]               = useState('onboarding');
  const [pov, setPov]                 = useState('user');
  const [actifs, setActifs]           = useState(ACTIFS);
  const [userProfile, setUserProfile] = useState(null);
  const [showAuth, setShowAuth]       = useState(false);
  const [showApiKey, setShowApiKey]   = useState(false);
  const [migrationError, setMigrationError] = useState(null);
  const [apiKey, setApiKey]           = useState(() => {
    try {
      return localStorage.getItem('nesso_api_key') ||
             import.meta.env.VITE_ANTHROPIC_API_KEY ||
             (window.location.hostname !== 'localhost' ? 'proxy' : '');
    } catch { return 'proxy'; }
  });

  useEffect(() => {
    // Bug #7 fix : guard pour empêcher double-call concurrent de loadUserData
    let sessionHandled = false;

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (sessionHandled) return; // si onAuthStateChange a déjà traité, on skip
      sessionHandled = true;
      setAuthUser(session?.user ?? null);
      if (session?.user) loadUserData(session.user.id);
      else {
        // Pas connecté → charger depuis localStorage si dispo
        const savedProfile = LS.get('nesso_user_profile', null);
        const savedActifs  = LS.get('nesso_user_actifs', null);
        if (savedProfile) {
          setUserProfile(savedProfile);
          setActifs(savedActifs || ACTIFS);
          setPov('user');
          setView('dashboard');
        }
        setAuthLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      // Bug #7 : ignorer l'event INITIAL_SESSION si getSession l'a déjà traité
      if (event === 'INITIAL_SESSION' && sessionHandled) return;
      sessionHandled = true;

      setAuthUser(session?.user ?? null);
      if (session?.user) {
        setShowAuth(false);
        // Vérifie si données existantes dans Supabase
        const { data, error: fetchErr } = await supabase.from('user_data').select('*').eq('id', session.user.id).single();
        if (data) {
          // Compte existant → charger ses données
          setUserProfile(data.profile_json);
          setActifs(data.actifs_json || ACTIFS);
          setPov(data.pov || 'user');
          setView('dashboard');
        } else {
          // Nouveau compte → migrer depuis localStorage avec gestion d'erreur (bug #6)
          const savedProfile = LS.get('nesso_user_profile', null);
          const savedActifs  = LS.get('nesso_user_actifs', null);
          if (savedProfile) {
            try {
              const { error: upsertErr } = await supabase.from('user_data').upsert({
                id: session.user.id,
                profile_json: savedProfile,
                actifs_json: savedActifs || ACTIFS,
                pov: 'user',
                updated_at: new Date().toISOString(),
              });
              if (upsertErr) throw upsertErr;
              setMigrationError(null);
            } catch (e) {
              console.error('Migration localStorage → Supabase échouée :', e);
              setMigrationError('Vos données n\'ont pas pu être sauvegardées sur nos serveurs (problème réseau). Elles restent disponibles localement. Réessayez de vous reconnecter dans quelques minutes.');
            }
            setUserProfile(savedProfile);
            setActifs(savedActifs || ACTIFS);
            setPov('user');
            setView('dashboard');
          }
        }
        setAuthLoading(false);
      } else if (event === 'SIGNED_OUT') {
        setView('onboarding');
        setUserProfile(null);
        setActifs(ACTIFS);
        LS.del('nesso_view', 'nesso_pov', 'nesso_user_profile', 'nesso_user_actifs');
        setAuthLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const loadUserData = async (userId) => {
    const { data, error } = await supabase.from('user_data').select('*').eq('id', userId).single();
    if (!error && data) {
      setUserProfile(data.profile_json);
      setActifs(data.actifs_json || ACTIFS);
      setPov(data.pov || 'user');
      setView('dashboard');
    } else {
      setView('onboarding');
    }
    setAuthLoading(false);
  };

  const handleComplete = async (userData) => {
    const userActifs = userData
      ? (userData.actifs || []).filter(a => a.valeur > 0).map((a, i) => ({
          id: 1000 + i, nom: a.nom, categorie: a.categorie || 'financier',
          valeur: a.valeur, type: a.type || 'Non précisé', pays: a.pays || 'France',
          proprietaires: ['user'], credit: false, note: null, beneficiaire: null,
        }))
      : ACTIFS;
    const newProfile = userData || null;
    const newPov     = userData ? 'user' : 'lucas';

    setUserProfile(newProfile);
    setActifs(userActifs);
    setPov(newPov);
    setView('dashboard');

    if (authUser) {
      await saveToSupabase(authUser.id, { userProfile: newProfile, actifs: userActifs, pov: newPov });
    } else {
      LS.set('nesso_user_profile', newProfile);
      LS.set('nesso_user_actifs', userActifs);
      LS.set('nesso_pov', newPov);
    }
  };

  const handleSetActifs = async (newActifs) => {
    setActifs(newActifs);
    // Bug #1 fix : synchroniser userProfile.actifs avec les actifs édités
    // (sinon les calculs IFI / score dans Dashboard restent sur les anciennes valeurs)
    let updatedProfile = userProfile;
    if (userProfile) {
      updatedProfile = {
        ...userProfile,
        actifs: newActifs.map(a => ({
          nom: a.nom, categorie: a.categorie, valeur: a.valeur, type: a.type, pays: a.pays,
        })),
      };
      setUserProfile(updatedProfile);
    }
    if (authUser) {
      await saveToSupabase(authUser.id, { userProfile: updatedProfile, actifs: newActifs, pov });
    } else {
      LS.set('nesso_user_actifs', newActifs);
      if (updatedProfile) LS.set('nesso_user_profile', updatedProfile);
    }
  };

  const handleReset = async () => {
    if (authUser) await supabase.from('user_data').delete().eq('id', authUser.id);
    LS.del('nesso_view', 'nesso_pov', 'nesso_user_profile', 'nesso_user_actifs', 'nesso_messages');
    setUserProfile(null);
    setActifs(ACTIFS);
    setPov('user');
    setView('onboarding');
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  if (authLoading) {
    return (
      <div style={{ minHeight: '100vh', background: '#F5F0EA', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span className="font-serif" style={{ color: '#C9A96E', fontSize: 28, fontWeight: 700 }}>Nesso</span>
      </div>
    );
  }

  if (view === 'onboarding') {
    return (
      <>
        <Onboarding onComplete={handleComplete} apiKey={apiKey} onApiKey={() => setShowApiKey(true)} />
        <ApiKeyModal open={showApiKey} onClose={() => setShowApiKey(false)} apiKey={apiKey} setApiKey={setApiKey} />
      </>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#F5F0EA' }}>
      <Navbar
        view={view} setView={setView}
        pov={pov} setPov={setPov}
        onApiKey={() => setShowApiKey(true)}
        onReset={handleReset}
        onLogout={authUser ? handleLogout : null}
        userEmail={authUser?.email}
      />

      {/* Bug #6 : message d'erreur si la migration localStorage → Supabase a échoué */}
      {migrationError && (
        <div style={{ background: '#FEF2F2', borderBottom: '1px solid #FECACA', padding: '12px 24px', textAlign: 'center' }}>
          <p style={{ color: '#991B1B', fontSize: 13, margin: 0 }}>
            ⚠ {migrationError}{' '}
            <button onClick={() => setMigrationError(null)} style={{ background: 'none', border: 'none', color: '#991B1B', textDecoration: 'underline', cursor: 'pointer', fontSize: 13 }}>Fermer</button>
          </p>
        </div>
      )}

      {/* Bannière sauvegarde si non connecté et audit terminé */}
      {!authUser && userProfile && (
        <SaveBanner onSave={() => setShowAuth(true)} />
      )}

      <main>
        {view === 'dashboard'       && <Dashboard    pov={pov} actifs={actifs} userProfile={userProfile} />}
        {view === 'famille'         && <Famille      pov={pov} setPov={setPov} actifs={actifs} userProfile={userProfile} />}
        {view === 'actifs'          && <Actifs       pov={pov} actifs={actifs} setActifs={handleSetActifs} />}
        {view === 'aide'            && <Aide         pov={pov} apiKey={apiKey} actifs={actifs} />}
        {view === 'confidentialite' && <Confidentialite />}
      </main>

      <footer style={{ textAlign: 'center', padding: '16px 24px 80px', borderTop: '1px solid rgba(27,43,75,0.08)' }}>
        <button onClick={() => setView('confidentialite')} style={{ background: 'none', border: 'none', color: '#7A7A8C', fontSize: 12, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', textDecoration: 'underline' }}>
          Politique de confidentialité
        </button>
        <span style={{ color: '#D1C4B0', margin: '0 10px' }}>·</span>
        <span style={{ color: '#7A7A8C', fontSize: 12 }}>© 2026 Nesso — Estimations à titre indicatif</span>
      </footer>

      {/* Modal Auth (sauvegarde post-audit) */}
      {showAuth && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
          onClick={e => { if (e.target === e.currentTarget) setShowAuth(false); }}>
          <div style={{ width: '100%', maxWidth: 440, maxHeight: '90vh', overflowY: 'auto', borderRadius: 16 }}>
            <Auth embedded onClose={() => setShowAuth(false)} />
          </div>
        </div>
      )}

      <ApiKeyModal open={showApiKey} onClose={() => setShowApiKey(false)} apiKey={apiKey} setApiKey={setApiKey} />
    </div>
  );
}
