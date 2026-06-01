import { useState } from 'react';
import { supabase } from '../lib/supabase.js';

export default function Compte({ authUser, userProfile, onLogout, onView }) {
  const [section, setSection] = useState('infos');
  const [newPassword, setNewPassword] = useState('');
  const [pwdLoading, setPwdLoading] = useState(false);
  const [pwdMsg, setPwdMsg] = useState({ type: '', text: '' });

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setPwdMsg({ type: '', text: '' });
    if (newPassword.length < 6) {
      setPwdMsg({ type: 'error', text: 'Le mot de passe doit faire au moins 6 caractères.' });
      return;
    }
    setPwdLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      setPwdMsg({ type: 'success', text: 'Mot de passe mis à jour.' });
      setNewPassword('');
    } catch (err) {
      setPwdMsg({ type: 'error', text: err.message || 'Erreur lors de la mise à jour.' });
    } finally {
      setPwdLoading(false);
    }
  };

  const sections = [
    { id: 'infos',           label: 'Informations',       icon: '◉' },
    { id: 'confidentialite', label: 'Confidentialité',    icon: '◇' },
    { id: 'password',        label: 'Mot de passe',       icon: '◎' },
    { id: 'nessoplus',       label: 'Statut Nesso+',      icon: '✦' },
    { id: 'paiement',        label: 'Moyens de paiement', icon: '◈' },
  ];

  return (
    <div style={{ maxWidth: 960, margin: '0 auto', padding: '36px 24px 100px' }} className="fade-in">

      <div style={{ marginBottom: 32 }}>
        <p style={{ color: '#C9A96E', fontSize: 12, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 6 }}>Mon compte</p>
        <h1 className="font-serif" style={{ color: '#1B2B4B', fontSize: 34, margin: 0 }}>{userProfile?.prenom || authUser?.email?.split('@')[0]}</h1>
        <p style={{ color: '#7A7A8C', marginTop: 6, fontSize: 14 }}>Connecté avec <strong>{authUser?.email}</strong></p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(220px, 260px) 1fr', gap: 22, alignItems: 'start' }}>

        {/* Sidebar */}
        <div className="card" style={{ padding: 12 }}>
          {sections.map(s => (
            <button key={s.id} onClick={() => setSection(s.id)}
              style={{
                width: '100%', textAlign: 'left', padding: '11px 14px', border: 'none', borderRadius: 8,
                background: section === s.id ? '#F5F0EA' : 'transparent',
                color: section === s.id ? '#1B2B4B' : '#6B7280',
                fontWeight: section === s.id ? 600 : 500,
                fontSize: 14, fontFamily: 'DM Sans, sans-serif', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 10, marginBottom: 2,
              }}>
              <span style={{ color: '#C9A96E', fontSize: 13 }}>{s.icon}</span>
              {s.label}
            </button>
          ))}
          <div style={{ borderTop: '1px solid #F0EBE4', marginTop: 8, paddingTop: 8 }}>
            <button onClick={onLogout} style={{
              width: '100%', textAlign: 'left', padding: '11px 14px', border: 'none', borderRadius: 8,
              background: 'transparent', color: '#E24B4A', fontWeight: 500, fontSize: 14,
              fontFamily: 'DM Sans, sans-serif', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 10,
            }}>
              <span style={{ fontSize: 13 }}>↪</span>
              Se déconnecter
            </button>
          </div>
        </div>

        {/* Contenu */}
        <div className="card" style={{ padding: 32 }}>

          {section === 'infos' && (
            <div>
              <h2 style={{ color: '#1B2B4B', fontSize: 20, fontWeight: 600, margin: '0 0 18px' }}>Informations personnelles</h2>
              <Field label="Email" value={authUser?.email} />
              <Field label="Prénom" value={userProfile?.prenom || '—'} />
              <Field label="Âge" value={userProfile?.age ? `${userProfile.age} ans` : '—'} />
              <Field label="Profession" value={userProfile?.profession || '—'} />
              <Field label="Situation civile" value={userProfile?.situation_civile || '—'} />
              <p style={{ color: '#7A7A8C', fontSize: 12, marginTop: 18, lineHeight: 1.6 }}>
                Pour modifier ces informations, éditez vos actifs depuis l'onglet dédié.
              </p>
            </div>
          )}

          {section === 'confidentialite' && (
            <div>
              <h2 style={{ color: '#1B2B4B', fontSize: 20, fontWeight: 600, margin: '0 0 14px' }}>Confidentialité de vos données</h2>
              <p style={{ color: '#4B5563', fontSize: 14, lineHeight: 1.7, margin: '0 0 18px' }}>
                Vos données patrimoniales sont stockées de manière chiffrée chez Supabase (Irlande, conforme RGPD). Anthropic reçoit les messages de l'audit pour générer les réponses, sans accès à votre identité.
              </p>
              <button onClick={() => onView('confidentialite')} className="btn-navy" style={{ fontSize: 14, padding: '10px 18px' }}>
                Lire la politique complète →
              </button>
              <div style={{ marginTop: 22, padding: 16, background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 9 }}>
                <p style={{ color: '#991B1B', fontWeight: 600, fontSize: 13, margin: '0 0 6px' }}>Supprimer mon compte</p>
                <p style={{ color: '#7F1D1D', fontSize: 12, lineHeight: 1.6, margin: '0 0 10px' }}>
                  Pour exercer votre droit à l'effacement, écrivez à <strong>contact@nesso.fr</strong>. Toutes vos données seront supprimées sous 30 jours.
                </p>
              </div>
            </div>
          )}

          {section === 'password' && (
            <div>
              <h2 style={{ color: '#1B2B4B', fontSize: 20, fontWeight: 600, margin: '0 0 18px' }}>Changer mon mot de passe</h2>
              <form onSubmit={handlePasswordChange} style={{ maxWidth: 360 }}>
                <label style={{ color: '#6B7280', fontSize: 13, display: 'block', marginBottom: 6 }}>Nouveau mot de passe</label>
                <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)}
                  placeholder="Minimum 6 caractères" autoComplete="new-password"
                  style={{ width: '100%', border: '1px solid #E5E7EB', borderRadius: 8, padding: '10px 14px', fontSize: 14, fontFamily: 'DM Sans, sans-serif', boxSizing: 'border-box', marginBottom: 14 }} />
                {pwdMsg.text && (
                  <p style={{ color: pwdMsg.type === 'success' ? '#10B981' : '#E24B4A', fontSize: 13, margin: '0 0 12px' }}>
                    {pwdMsg.type === 'success' ? '✓' : '⚠'} {pwdMsg.text}
                  </p>
                )}
                <button type="submit" className="btn-navy" disabled={pwdLoading}
                  style={{ padding: '10px 22px', fontSize: 14, opacity: pwdLoading ? 0.7 : 1, cursor: pwdLoading ? 'wait' : 'pointer' }}>
                  {pwdLoading ? '...' : 'Mettre à jour'}
                </button>
              </form>
            </div>
          )}

          {section === 'nessoplus' && (
            <div>
              <h2 style={{ color: '#1B2B4B', fontSize: 20, fontWeight: 600, margin: '0 0 12px' }}>Statut Nesso+</h2>
              <div style={{ display: 'inline-block', background: '#F5F0EA', color: '#7A7A8C', fontSize: 12, fontWeight: 600, padding: '4px 10px', borderRadius: 14, marginBottom: 18 }}>
                Compte gratuit
              </div>
              <p style={{ color: '#4B5563', fontSize: 14, lineHeight: 1.7, margin: '0 0 20px' }}>
                Vous bénéficiez actuellement de l'audit patrimonial et du tableau de bord en accès libre. <strong>Nesso+</strong> débloquera prochainement : recommandations détaillées chiffrées, simulations de scénarios, accompagnement par nos partenaires (notaires, fiscalistes, CGP).
              </p>
              <div style={{ background: 'linear-gradient(135deg, #FFFDF9 0%, #FFF8EE 100%)', border: '1px solid #FDE8C8', borderRadius: 10, padding: 18 }}>
                <p style={{ color: '#C9A96E', fontSize: 12, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', margin: '0 0 6px' }}>✦ À venir</p>
                <p style={{ color: '#1B2B4B', fontSize: 14, fontWeight: 500, margin: 0 }}>Nesso+ — Lancement courant 2026</p>
              </div>
            </div>
          )}

          {section === 'paiement' && (
            <div>
              <h2 style={{ color: '#1B2B4B', fontSize: 20, fontWeight: 600, margin: '0 0 12px' }}>Moyens de paiement</h2>
              <p style={{ color: '#4B5563', fontSize: 14, lineHeight: 1.7, margin: '0 0 20px' }}>
                Aucun moyen de paiement n'est requis pour utiliser Nesso aujourd'hui. La gestion des moyens de paiement sera disponible avec le lancement de Nesso+.
              </p>
              <div style={{ border: '1px dashed #E5E7EB', borderRadius: 10, padding: 22, textAlign: 'center' }}>
                <p style={{ color: '#7A7A8C', fontSize: 13, margin: 0 }}>Aucun moyen de paiement enregistré</p>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

function Field({ label, value }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '12px 0', borderBottom: '1px solid #F5F0EA' }}>
      <span style={{ color: '#7A7A8C', fontSize: 13 }}>{label}</span>
      <span style={{ color: '#1B2B4B', fontSize: 14, fontWeight: 500 }}>{value}</span>
    </div>
  );
}
