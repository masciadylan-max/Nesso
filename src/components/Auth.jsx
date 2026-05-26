import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase.js';

// Parse les tokens depuis le hash de l'URL (#access_token=...&refresh_token=...)
const parseHashTokens = () => {
  if (typeof window === 'undefined') return null;
  const hash = window.location.hash.replace(/^#/, '');
  if (!hash) return null;
  const params = new URLSearchParams(hash);
  const access_token = params.get('access_token');
  const refresh_token = params.get('refresh_token');
  if (access_token && refresh_token) return { access_token, refresh_token };
  return null;
};

// Wrapper avec timeout pour éviter qu'une promesse Supabase hange à l'infini
const withTimeout = (promise, ms, errorMsg = 'Délai dépassé') =>
  Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error(errorMsg)), ms)),
  ]);

export default function Auth({ embedded = false, onClose, recoveryMode = false }) {
  // Si l'user arrive depuis le lien de reset email → mode 'newpassword'
  const [mode, setMode]         = useState(recoveryMode ? 'newpassword' : 'login'); // 'login' | 'register' | 'reset' | 'newpassword'
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [prenom, setPrenom]     = useState('');
  const [consent, setConsent]   = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const [success, setSuccess]   = useState('');
  const [sessionReady, setSessionReady] = useState(!recoveryMode); // En mode normal: prêt direct. En recovery: attend setSession.

  // En mode recovery : établir la session depuis les tokens de l'URL
  // pour garantir que updateUser() ait bien un auth header valide.
  useEffect(() => {
    if (!recoveryMode) return;
    const tokens = parseHashTokens();
    if (!tokens) {
      setError('Lien de réinitialisation invalide ou expiré. Demandez un nouveau lien.');
      setSessionReady(true); // débloque l'UI même si erreur
      return;
    }
    (async () => {
      try {
        await withTimeout(
          supabase.auth.setSession(tokens),
          8000,
          'Session expirée. Demandez un nouveau lien de réinitialisation.'
        );
        setSessionReady(true);
      } catch (e) {
        console.error('setSession error:', e);
        setError(e.message || 'Erreur lors de l\'établissement de la session.');
        setSessionReady(true);
      }
    })();
  }, [recoveryMode]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;

      } else if (mode === 'register') {
        if (!prenom.trim()) { setError('Veuillez entrer votre prénom.'); setLoading(false); return; }
        if (!consent) { setError('Veuillez accepter la politique de confidentialité pour continuer.'); setLoading(false); return; }
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { prenom } },
        });
        if (error) throw error;
        setSuccess('Compte créé ! Vérifiez votre email pour confirmer votre inscription.');

      } else if (mode === 'reset') {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: window.location.origin,
        });
        if (error) throw error;
        setSuccess('Email de réinitialisation envoyé. Vérifiez votre boîte mail (et vos spams).');

      } else if (mode === 'newpassword') {
        if (password.length < 6) { setError('Le mot de passe doit faire au moins 6 caractères.'); setLoading(false); return; }
        if (!sessionReady) { setError('Session pas encore prête, patientez 1 seconde puis réessayez.'); setLoading(false); return; }
        // Timeout 10s sur updateUser pour ne pas hanger à l'infini
        const { error } = await withTimeout(
          supabase.auth.updateUser({ password }),
          10000,
          'Le serveur ne répond pas. Réessayez ou demandez un nouveau lien.'
        );
        if (error) throw error;
        setSuccess('Mot de passe mis à jour ! Vous êtes maintenant connecté.');
        // Nettoyer l'URL (Supabase laisse le token dans le hash)
        if (window.location.hash) window.history.replaceState(null, '', window.location.pathname);
        setTimeout(() => { if (onClose) onClose(); }, 1500);
      }
    } catch (err) {
      const msgs = {
        'Invalid login credentials': 'Email ou mot de passe incorrect.',
        'Email not confirmed': 'Confirmez votre email avant de vous connecter.',
        'User already registered': 'Un compte existe déjà avec cet email.',
        'Password should be at least 6 characters': 'Le mot de passe doit faire au moins 6 caractères.',
        'New password should be different from the old password.': 'Le nouveau mot de passe doit être différent de l\'ancien.',
      };
      setError(msgs[err.message] || err.message);
    } finally {
      setLoading(false);
    }
  };

  const titles = {
    login: 'Connexion',
    register: 'Créer un compte',
    reset: 'Mot de passe oublié',
    newpassword: 'Définir un nouveau mot de passe',
  };

  return (
    <div style={{ minHeight: embedded ? 'auto' : '100vh', background: embedded ? 'transparent' : '#F5F0EA', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: embedded ? 0 : '24px' }}>

      {/* Logo — seulement hors modal */}
      {!embedded && (
        <div style={{ marginBottom: 32, textAlign: 'center' }}>
          <span className="font-serif" style={{ color: '#1B2B4B', fontSize: 36, fontWeight: 700, letterSpacing: '0.03em' }}>Nesso</span>
          <p style={{ color: '#7A7A8C', fontSize: 14, marginTop: 6 }}>Votre conseiller patrimonial familial</p>
        </div>
      )}

      {/* Card */}
      <div className="card" style={{ width: '100%', maxWidth: 420, padding: '36px 32px' }}>
        <h2 className="font-serif" style={{ color: '#1B2B4B', fontSize: 24, fontWeight: 700, margin: '0 0 24px', textAlign: 'center' }}>
          {titles[mode]}
        </h2>

        {error && (
          <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, padding: '12px 14px', marginBottom: 16 }}>
            <p style={{ color: '#E24B4A', fontSize: 13, margin: 0 }}>⚠ {error}</p>
          </div>
        )}
        {success && (
          <div style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 8, padding: '12px 14px', marginBottom: 16 }}>
            <p style={{ color: '#10B981', fontSize: 13, margin: 0 }}>✓ {success}</p>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {mode === 'register' && (
            <div style={{ marginBottom: 14 }}>
              <label style={{ color: '#6B7280', fontSize: 13, display: 'block', marginBottom: 6 }}>Prénom</label>
              <input
                type="text" value={prenom} onChange={e => setPrenom(e.target.value)}
                placeholder="Votre prénom" required autoComplete="given-name"
                style={{ width: '100%', border: '1px solid #E5E7EB', borderRadius: 8, padding: '10px 14px', fontSize: 14, fontFamily: 'DM Sans, sans-serif', boxSizing: 'border-box' }}
              />
            </div>
          )}

          {/* Email caché en mode 'newpassword' : la session de récupération est déjà active */}
          {mode !== 'newpassword' && (
            <div style={{ marginBottom: 14 }}>
              <label style={{ color: '#6B7280', fontSize: 13, display: 'block', marginBottom: 6 }}>Email</label>
              <input
                type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="votre@email.fr" required autoComplete="email"
                style={{ width: '100%', border: '1px solid #E5E7EB', borderRadius: 8, padding: '10px 14px', fontSize: 14, fontFamily: 'DM Sans, sans-serif', boxSizing: 'border-box' }}
              />
            </div>
          )}

          {mode === 'newpassword' && (
            <p style={{ color: '#6B7280', fontSize: 13, lineHeight: 1.6, marginBottom: 14 }}>
              Choisissez un nouveau mot de passe sécurisé (minimum 6 caractères).
            </p>
          )}

          {mode !== 'reset' && (
            <div style={{ marginBottom: mode === 'register' ? 14 : 20 }}>
              <label style={{ color: '#6B7280', fontSize: 13, display: 'block', marginBottom: 6 }}>
                {mode === 'newpassword' ? 'Nouveau mot de passe' : 'Mot de passe'}
              </label>
              <input
                type="password" value={password} onChange={e => setPassword(e.target.value)}
                placeholder={mode === 'register' || mode === 'newpassword' ? 'Minimum 6 caractères' : '••••••••'} required autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                style={{ width: '100%', border: '1px solid #E5E7EB', borderRadius: 8, padding: '10px 14px', fontSize: 14, fontFamily: 'DM Sans, sans-serif', boxSizing: 'border-box' }}
              />
            </div>
          )}

          {mode === 'register' && (
            <div style={{ marginBottom: 20, display: 'flex', alignItems: 'flex-start', gap: 10 }}>
              <input
                type="checkbox" id="consent" checked={consent} onChange={e => setConsent(e.target.checked)}
                style={{ marginTop: 2, flexShrink: 0, accentColor: '#1B2B4B', width: 16, height: 16, cursor: 'pointer' }}
              />
              <label htmlFor="consent" style={{ color: '#6B7280', fontSize: 13, lineHeight: 1.5, cursor: 'pointer' }}>
                J'ai lu et j'accepte la{' '}
                <a href="#confidentialite" onClick={e => { e.preventDefault(); window.open('/confidentialite', '_blank'); }}
                  style={{ color: '#C9A96E', fontWeight: 600, textDecoration: 'underline' }}>
                  politique de confidentialité
                </a>
                , notamment le stockage de mes données patrimoniales et leur traitement par l'IA Claude (Anthropic).
              </label>
            </div>
          )}

          <button type="submit" className="btn-navy" disabled={loading}
            style={{ width: '100%', padding: '12px', fontSize: 15, opacity: loading ? 0.7 : 1, cursor: loading ? 'wait' : 'pointer' }}>
            {loading ? '...' : mode === 'login' ? 'Se connecter' : mode === 'register' ? 'Créer mon compte' : mode === 'newpassword' ? 'Mettre à jour mon mot de passe' : 'Envoyer le lien'}
          </button>
        </form>

        {/* Liens secondaires */}
        <div style={{ marginTop: 20, textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {mode === 'login' && (
            <>
              <button onClick={() => { setMode('reset'); setError(''); setSuccess(''); }}
                style={{ background: 'none', border: 'none', color: '#7A7A8C', fontSize: 13, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>
                Mot de passe oublié ?
              </button>
              <div style={{ borderTop: '1px solid #F0EBE4', paddingTop: 16 }}>
                <span style={{ color: '#7A7A8C', fontSize: 13 }}>Pas encore de compte ? </span>
                <button onClick={() => { setMode('register'); setError(''); setSuccess(''); }}
                  style={{ background: 'none', border: 'none', color: '#C9A96E', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>
                  S'inscrire →
                </button>
              </div>
            </>
          )}
          {(mode === 'register' || mode === 'reset') && (
            <button onClick={() => { setMode('login'); setError(''); setSuccess(''); }}
              style={{ background: 'none', border: 'none', color: '#7A7A8C', fontSize: 13, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>
              ← Retour à la connexion
            </button>
          )}
        </div>
      </div>

      <p style={{ color: '#7A7A8C', fontSize: 11, marginTop: 24, textAlign: 'center' }}>
        Vos données sont chiffrées et sécurisées · <span style={{ textDecoration: 'underline', cursor: 'pointer' }}>Politique de confidentialité</span>
      </p>
    </div>
  );
}
