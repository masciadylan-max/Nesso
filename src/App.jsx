import { useState } from 'react';
import { ACTIFS } from './data.js';
import Navbar from './components/Navbar.jsx';
import Dashboard from './components/Dashboard.jsx';
import Famille from './components/Famille.jsx';
import Actifs from './components/Actifs.jsx';
import Aide from './components/Aide.jsx';
import Onboarding from './components/Onboarding.jsx';
import { Modal } from './components/Shared.jsx';

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
          style={{ width: '100%', border: '1px solid #E5E7EB', borderRadius: 8, padding: '10px 14px', fontSize: 14, fontFamily: 'Inter, sans-serif' }} />
      </div>
      <button className="btn-navy" onClick={save} style={{ width: '100%' }}>Enregistrer</button>
      <p style={{ color: '#9CA3AF', fontSize: 11, textAlign: 'center', marginTop: 12 }}>
        Obtenez votre clé sur <strong>console.anthropic.com</strong>
      </p>
    </Modal>
  );
}

export default function App() {
  const [view, setView]             = useState('onboarding');
  const [userProfile, setUserProfile] = useState(() => {
    try { return JSON.parse(localStorage.getItem('nesso_user_profile')) || null; } catch { return null; }
  });
  const [pov, setPov] = useState(() => localStorage.getItem('nesso_user_profile') ? 'user' : 'lucas');
  const [actifs, setActifs] = useState(() => {
    try {
      const profile = JSON.parse(localStorage.getItem('nesso_user_profile'));
      if (profile?.actifs?.length > 0) {
        const userActifs = profile.actifs.filter(a => a.valeur > 0).map((a, i) => ({
          id: 1000 + i, nom: a.nom, categorie: a.categorie || 'financier',
          valeur: a.valeur, type: a.type || 'Non précisé', pays: a.pays || 'France',
          proprietaires: ['user'], credit: false, note: null, beneficiaire: null,
        }));
        return [...ACTIFS, ...userActifs];
      }
    } catch {}
    return ACTIFS;
  });
  const [showApiKey, setShowApiKey] = useState(false);
  const [apiKey, setApiKey]         = useState(() => localStorage.getItem('nesso_api_key') || import.meta.env.VITE_ANTHROPIC_API_KEY || '');

  const handleComplete = (userData) => {
    if (userData && userData.actifs?.length > 0) {
      setUserProfile(userData);
      localStorage.setItem('nesso_user_profile', JSON.stringify(userData));
      const userActifs = userData.actifs
        .filter(a => a.valeur > 0)
        .map((a, i) => ({
          id: 1000 + i,
          nom: a.nom,
          categorie: a.categorie || 'financier',
          valeur: a.valeur,
          type: a.type || 'Non précisé',
          pays: a.pays || 'France',
          proprietaires: ['user'],
          credit: false,
          note: null,
          beneficiaire: null,
        }));
      setActifs(prev => [...prev.filter(a => !a.proprietaires.includes('user')), ...userActifs]);
      setPov('user');
    }
    setView('dashboard');
  };

  if (view === 'onboarding') {
    return (
      <>
        <Onboarding
          onComplete={handleComplete}
          apiKey={apiKey}
          onApiKey={() => setShowApiKey(true)}
        />
        <ApiKeyModal open={showApiKey} onClose={() => setShowApiKey(false)} apiKey={apiKey} setApiKey={setApiKey} />
      </>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#F5F0EA' }}>
      <Navbar view={view} setView={setView} pov={pov} setPov={setPov} onApiKey={() => setShowApiKey(true)} onReset={() => setView('onboarding')} />
      <main>
        {view === 'dashboard' && <Dashboard pov={pov} actifs={actifs} userProfile={userProfile} />}
        {view === 'famille'   && <Famille   pov={pov} setPov={setPov} actifs={actifs} />}
        {view === 'actifs'    && <Actifs    pov={pov} actifs={actifs} setActifs={setActifs} />}
        {view === 'aide'      && <Aide      pov={pov} apiKey={apiKey} actifs={actifs} />}
      </main>
      <ApiKeyModal open={showApiKey} onClose={() => setShowApiKey(false)} apiKey={apiKey} setApiKey={setApiKey} />
    </div>
  );
}
