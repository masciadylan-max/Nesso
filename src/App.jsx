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

// Sauvegarde les données utilisateur dans Supabase
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
  const save = () => {
    localStorage.setItem('nesso_api_key', val);
    setApiKey(val);
    onClose();
  };
  return (
    <Modal open={open} onClose={onClose} title="Clé API Anthropic">
      <p style={{ color: '#6B7280', fontSize: 14, lineHeight: 1.7, marginBottom: 20 }}>
        Nécessaire pour activer le vrai Claude dans l'onboarding et le chat. Stockée uniquement dans votre navigateur — jamais envoyée à nos serveurs.
      </p>
      <div style={{ marginBottom: 16 }}>
        <label style={{ color: '#6B7280', fontSize: 13, display: 'block', marginBottom: 7 }}>Votre clé API (sk-ant-...)</label>
        <input type="password" value={val} onChange={e => setVal(e.target.value)} placeholder="sk-ant-api03-..."
          style={{ width: '100%', border: '1px solid #E5E7EB', borderRadius: 8, padding: '10px 14px', fontSize: 14, fontFamily: 'DM Sans, sans-serif' }} />
      </div>
      <button className="btn-navy" onClick={save} style={{ width: '100%' }}>Enregistrer</button>
      <p style={{ color: '#7A7A8C', fontSize: 11, textAlign: 'center', marginTop: 12 }}>
        Obtenez votre clé sur <strong>console.anthropic.com</strong>
      </p>
    </Modal>
  );
}

export default function App() {
  const [authUser, setAuthUser]         = useState(null);   // session Supabase
  const [authLoading, setAuthLoading]   = useState(true);   // vrai chargement initial
  const [view, setView]                 = useState('onboarding');
  const [pov, setPov]                   = useState('user');
  const [actifs, setActifs]             = useState(ACTIFS);
  const [userProfile, setUserProfile]   = useState(null);
  const [showApiKey, setShowApiKey]     = useState(false);
  const [apiKey, setApiKey]             = useState(() => {
    try {
      return localStorage.getItem('nesso_api_key') ||
             import.meta.env.VITE_ANTHROPIC_API_KEY ||
             (window.location.hostname !== 'localhost' ? 'proxy' : '');
    } catch { return 'proxy'; }
  });

  // ── Écoute l'état d'authentification Supabase ──
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setAuthUser(session?.user ?? null);
      if (session?.user) loadUserData(session.user.id);
      else setAuthLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthUser(session?.user ?? null);
      if (session?.user) loadUserData(session.user.id);
      else {
        setView('onboarding');
        setUserProfile(null);
        setActifs(ACTIFS);
        setAuthLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // ── Charge les données depuis Supabase ──
  const loadUserData = async (userId) => {
    const { data, error } = await supabase
      .from('user_data')
      .select('*')
      .eq('id', userId)
      .single();

    if (!error && data) {
      setUserProfile(data.profile_json);
      setActifs(data.actifs_json || ACTIFS);
      setPov(data.pov || 'user');
      setView('dashboard');
    } else {
      // Pas encore de données → onboarding
      setView('onboarding');
    }
    setAuthLoading(false);
  };

  // ── Fin onboarding → sauvegarde ──
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

    // Sauvegarde : Supabase si connecté, localStorage sinon
    if (authUser) {
      await saveToSupabase(authUser.id, { userProfile: newProfile, actifs: userActifs, pov: newPov });
    } else {
      LS.set('nesso_user_profile', newProfile);
      LS.set('nesso_user_actifs', userActifs);
      LS.set('nesso_pov', newPov);
      LS.set('nesso_view', 'dashboard');
    }
  };

  // ── Mise à jour actifs → sauvegarde ──
  const handleSetActifs = async (newActifs) => {
    setActifs(newActifs);
    if (authUser) {
      await saveToSupabase(authUser.id, { userProfile, actifs: newActifs, pov });
    } else {
      LS.set('nesso_user_actifs', newActifs);
    }
  };

  // ── Reset / déconnexion ──
  const handleReset = async () => {
    if (authUser) {
      await supabase.from('user_data').delete().eq('id', authUser.id);
    }
    LS.del('nesso_view', 'nesso_pov', 'nesso_user_profile', 'nesso_user_actifs', 'nesso_messages');
    setUserProfile(null);
    setActifs(ACTIFS);
    setPov('user');
    setView('onboarding');
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  // ── Écran de chargement ──
  if (authLoading) {
    return (
      <div style={{ minHeight: '100vh', background: '#F5F0EA', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span className="font-serif" style={{ color: '#C9A96E', fontSize: 28, fontWeight: 700 }}>Nesso</span>
      </div>
    );
  }

  // ── Pas connecté → Auth ──
  if (!authUser) {
    return (
      <>
        <Auth />
        <ApiKeyModal open={showApiKey} onClose={() => setShowApiKey(false)} apiKey={apiKey} setApiKey={setApiKey} />
      </>
    );
  }

  // ── Onboarding (connecté mais pas encore de profil) ──
  if (view === 'onboarding') {
    return (
      <>
        <Onboarding onComplete={handleComplete} apiKey={apiKey} onApiKey={() => setShowApiKey(true)} />
        <ApiKeyModal open={showApiKey} onClose={() => setShowApiKey(false)} apiKey={apiKey} setApiKey={setApiKey} />
      </>
    );
  }

  // ── App principale ──
  return (
    <div style={{ minHeight: '100vh', background: '#F5F0EA' }}>
      <Navbar
        view={view} setView={setView}
        pov={pov} setPov={setPov}
        onApiKey={() => setShowApiKey(true)}
        onReset={handleReset}
        onLogout={handleLogout}
        userEmail={authUser.email}
      />
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
      <ApiKeyModal open={showApiKey} onClose={() => setShowApiKey(false)} apiKey={apiKey} setApiKey={setApiKey} />
    </div>
  );
}
