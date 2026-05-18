import { useState, useRef, useEffect } from 'react';
import { getDemoResponse } from '../utils.js';

const SYSTEM_PROMPT = `Tu es le conseiller patrimonial de Nesso, une plateforme française de clarté patrimoniale familiale.
Tu aides des familles à comprendre et optimiser leur patrimoine.

ORDRE DES QUESTIONS :
1. Niveau de connaissance (novice / intermédiaire / expert)
2. Position dans la famille
3. Situation civile et régime matrimonial
4. Enfants, situation familiale complète
5. Patrimoine immobilier (France + étranger)
6. Patrimoine financier (AV, PEA, PER, liquidités)
7. Situation professionnelle
8. Objectifs principaux

RÈGLES :
- Maximum 1 question à la fois, ton conversationnel
- Sauter si l'info est déjà donnée
- Signaler les alertes avec ⚠️
- Après 8-10 échanges, proposer le tableau de bord

ALERTES :
- Âge > 67 ans → ⚠️ Fenêtre AV bientôt fermée
- Communauté universelle + enfants → ⚠️ Clause attribution intégrale à vérifier
- Bien étranger → ⚠️ Fiscalité internationale à anticiper
- Patrimoine > 1,3M€ → ⚠️ IFI potentiel
- Famille recomposée → ⚠️ Réserve héréditaire à protéger

Commence par te présenter et poser la première question sur le niveau de connaissance.`;

const extractUserData = async (history) => {
  if (history.length < 3) return null;
  try {
    const res = await fetch('/anthropic/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 700,
        system: 'Tu es un extracteur de données JSON. Réponds UNIQUEMENT avec le JSON demandé, sans markdown ni explication.',
        messages: [
          ...history,
          { role: 'user', content: `Extrais les informations patrimoniales mentionnées dans notre conversation en JSON strict :
{
  "prenom": "prénom si mentionné sinon Utilisateur",
  "age": null,
  "profession": null,
  "regime": null,
  "enfants": 0,
  "actifs": [
    {"nom": "nom", "categorie": "immobilier|financier|professionnel|exotique", "valeur": 0, "type": "Résidence principale|Assurance-vie|Liquidités|Société|etc", "pays": "France"}
  ],
  "objectifs": "résumé en 1 phrase ou null",
  "score": 60,
  "alertes": []
}
- valeur = 0 si non mentionnée
- score entre 30 (peu de risques) et 90 (risques élevés)
- inclure UNIQUEMENT les actifs réellement mentionnés` }
        ]
      })
    });
    if (!res.ok) return null;
    const data = await res.json();
    const text = data.content[0].text.trim();
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) return JSON.parse(jsonMatch[0]);
  } catch (e) { console.error('Extraction error:', e); }
  return null;
};

export default function Onboarding({ onComplete, apiKey, onApiKey }) {
  const [started, setStarted]   = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput]       = useState('');
  const [loading, setLoading]   = useState(false);
  const [updating, setUpdating] = useState(false);
  const [msgCount, setMsgCount] = useState(0);
  const endRef = useRef(null);

  // Restaurer la conversation depuis localStorage au montage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('nesso_messages');
      if (saved) {
        const msgs = JSON.parse(saved);
        if (msgs.length > 1) {
          setMessages(msgs);
          setStarted(true);
          setMsgCount(msgs.filter(m => m.role === 'user').length);
        }
      }
    } catch {}
  }, []);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const isDemoMode = !apiKey;

  const callApi = async (history) => {
    const res = await fetch('/anthropic/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'claude-sonnet-4-6', max_tokens: 500, system: SYSTEM_PROMPT, messages: history.map(m => ({ role: m.role, content: m.content })) }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || `Erreur ${res.status}`);
    }
    const data = await res.json();
    return data.content[0].text;
  };

  const getReply = async (history, count) => {
    if (isDemoMode) {
      await new Promise(r => setTimeout(r, 700 + Math.random() * 400));
      return getDemoResponse(history[history.length - 1].content, count);
    }
    return callApi(history);
  };

  const complete = (updatedHistory) => {
    setTimeout(async () => {
      if (isDemoMode) {
        onComplete(null);
        return;
      }
      const userData = await extractUserData(updatedHistory);
      onComplete(userData);
    }, 1800);
  };

  const start = async () => {
    setStarted(true);
    setLoading(true);
    const init = [{ role: 'user', content: 'Bonjour, je voudrais faire le point sur mon patrimoine familial.' }];
    try {
      const reply = await getReply(init, 0);
      setMessages([...init, { role: 'assistant', content: reply }]);
      setMsgCount(1);
    } catch {
      setMessages([{ role: 'assistant', content: 'Bonjour ! Je suis votre conseiller Nesso.\n\nPour bien vous accompagner, comment évalueriez-vous votre niveau de connaissance en matière de patrimoine et de fiscalité ?\n\n— **Novice** : je connais peu le sujet\n— **Intermédiaire** : je comprends les bases\n— **Expert** : je maîtrise les mécanismes' }]);
    } finally { setLoading(false); }
  };

  const send = async (overrideText) => {
    const text = overrideText ?? input.trim();
    if (!text || loading) return;
    const userMsg = { role: 'user', content: text };
    const history = [...messages, userMsg];
    setMessages(history);
    setInput('');
    setLoading(true);
    const newCount = msgCount + 1;
    setMsgCount(newCount);
    try {
      const reply = await getReply(history, newCount);
      const updatedHistory = [...history, { role: 'assistant', content: reply }];
      setMessages(updatedHistory);
      localStorage.setItem('nesso_messages', JSON.stringify(updatedHistory));
      if (reply.includes('tableau de bord') || reply.includes('profil est prêt') || reply.includes('bilan est prêt')) {
        complete(updatedHistory);
      }
    } catch (e) {
      console.error('Nesso API error:', e);
      setMessages(prev => [...prev, { role: 'assistant', content: `Erreur : ${e.message}. Réessayez ou passez directement à la démo.` }]);
    } finally { setLoading(false); }
  };

  const handleSkip = async () => {
    await send('Je ne sais pas, je passerai cette question');
  };

  const handleMettreAJour = async () => {
    if (updating || loading) return;
    setUpdating(true);
    const userData = isDemoMode ? null : await extractUserData(messages);
    onComplete(userData);
    setUpdating(false);
  };

  const handleNouvelleConversation = () => {
    localStorage.removeItem('nesso_messages');
    setMessages([]);
    setMsgCount(0);
    setStarted(false);
  };

  return (
    <div style={{ minHeight: '100vh', background: '#F5F0EA', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ maxWidth: 620, width: '100%' }}>

        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <h1 className="font-serif" style={{ color: '#C9A96E', fontSize: 42, fontWeight: 700, margin: '0 0 8px' }}>Nesso</h1>
          <p style={{ color: '#1B2B4B', fontSize: 17, margin: 0 }}>Clarté patrimoniale familiale</p>
        </div>

        {!started ? (
          <div className="card" style={{ padding: 40, textAlign: 'center' }}>
            <div style={{ width: 60, height: 60, borderRadius: '50%', background: '#1B2B4B', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 22px', color: '#C9A96E', fontSize: 26 }}>✦</div>
            <h2 className="font-serif" style={{ color: '#1B2B4B', fontSize: 26, margin: '0 0 12px' }}>Votre audit patrimonial</h2>
            <p style={{ color: '#6B7280', lineHeight: 1.75, marginBottom: 28, fontSize: 15 }}>
              Répondez à quelques questions pour que nous construisions votre tableau de bord personnalisé. La conversation dure environ <strong>5 minutes</strong>.
            </p>

            {isDemoMode && (
              <div style={{ background: '#F0F4FF', border: '1px solid #C7D7FD', borderRadius: 9, padding: 16, marginBottom: 24, textAlign: 'left' }}>
                <p style={{ color: '#1D4ED8', fontSize: 13, fontWeight: 600, margin: '0 0 4px' }}>Mode démo activé</p>
                <p style={{ color: '#3B5BDB', fontSize: 12, margin: '0 0 10px' }}>Le conseiller utilise des réponses simulées. Pour activer le vrai Claude :</p>
                <button onClick={onApiKey} className="btn-navy" style={{ fontSize: 12, padding: '6px 14px' }}>Ajouter ma clé API Anthropic →</button>
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <button className="btn-navy" onClick={start} style={{ width: '100%', padding: '14px', fontSize: 15 }}>
                {isDemoMode ? 'Démarrer la démo →' : 'Commencer l\'audit →'}
              </button>
              <button onClick={handlePasserDashboard} style={{ background: 'none', border: 'none', color: '#9CA3AF', cursor: 'pointer', fontSize: 13, padding: 8, fontFamily: 'Inter, sans-serif' }}>
                Voir l'exemple sans remplir →
              </button>
              <p style={{ color: '#C9B89A', fontSize: 11, margin: 0, lineHeight: 1.5 }}>
                Vous pouvez explorer le tableau de bord avec une famille fictive, sans répondre aux questions.
              </p>
            </div>
          </div>
        ) : (
          <div className="card" style={{ display: 'flex', flexDirection: 'column', height: 540 }}>
            <div style={{ padding: '14px 20px', borderBottom: '1px solid #F5F0EA', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 34, height: 34, borderRadius: '50%', background: '#C9A96E', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: 14 }}>N</div>
                <div>
                  <p style={{ fontWeight: 600, color: '#1B2B4B', fontSize: 14, margin: 0 }}>Conseiller Nesso</p>
                  <p style={{ color: '#16A34A', fontSize: 11, margin: 0 }}>● {isDemoMode ? 'Mode démo' : 'En ligne'}</p>
                </div>
              </div>
              {isDemoMode && (
                <button onClick={onApiKey} style={{ background: '#F0F4FF', border: '1px solid #C7D7FD', color: '#1D4ED8', borderRadius: 7, padding: '5px 11px', fontSize: 11, cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
                  Activer le vrai Claude
                </button>
              )}
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
              {messages.map((m, i) => (
                <div key={i} className="fade-in" style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start', gap: 8 }}>
                  {m.role === 'assistant' && (
                    <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#C9A96E', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: 12, flexShrink: 0, marginTop: 2 }}>N</div>
                  )}
                  <div style={{ maxWidth: '80%', background: m.role === 'user' ? '#1B2B4B' : '#F9FAFB', color: m.role === 'user' ? 'white' : '#2C2C2C', padding: '11px 15px', borderRadius: m.role === 'user' ? '12px 12px 3px 12px' : '3px 12px 12px 12px', fontSize: 14, lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
                    {m.content}
                  </div>
                </div>
              ))}
              {loading && (
                <div style={{ display: 'flex', gap: 8 }}>
                  <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#C9A96E', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: 12 }}>N</div>
                  <div style={{ background: '#F9FAFB', padding: '10px 14px', borderRadius: '3px 12px 12px 12px', display: 'flex', gap: 5 }}>
                    {[0,1,2].map(i => <div key={i} style={{ width: 7, height: 7, borderRadius: '50%', background: '#C9A96E', animation: `bounce 0.8s ${i*0.15}s infinite` }} />)}
                  </div>
                </div>
              )}
              <div ref={endRef} />
            </div>

            {messages.length > 1 && !loading && (
              <div style={{ paddingLeft: 14, paddingRight: 14, paddingTop: 8, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                <button onClick={handleSkip} style={{ background: 'none', border: '1px solid #E5E7EB', color: '#9CA3AF', borderRadius: 20, padding: '5px 12px', fontSize: 12, cursor: 'pointer', fontFamily: 'Inter, sans-serif', transition: 'all 0.15s' }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = '#C9A96E'; e.currentTarget.style.color = '#C9A96E'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = '#E5E7EB'; e.currentTarget.style.color = '#9CA3AF'; }}>
                  Je ne sais pas / passer pour l'instant
                </button>
              </div>
            )}

            <div style={{ borderTop: '1px solid #F5F0EA', padding: 14, display: 'flex', gap: 9 }}>
              <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && send()}
                placeholder="Répondez ici..." style={{ flex: 1, border: '1px solid #E5E7EB', borderRadius: 9, padding: '10px 14px', fontSize: 14, fontFamily: 'Inter, sans-serif' }} />
              <button className="btn-navy" onClick={() => send()} disabled={loading || !input.trim()} style={{ padding: '10px 18px' }}>→</button>
            </div>
            <div style={{ textAlign: 'center', paddingBottom: 12, display: 'flex', justifyContent: 'center', gap: 16 }}>
              <button onClick={handleMettreAJour} disabled={updating || loading} style={{ background: 'none', border: 'none', color: updating ? '#C9A96E' : '#1B2B4B', cursor: 'pointer', fontSize: 12, fontFamily: 'Inter, sans-serif', fontWeight: 600 }}>
                {updating ? '⏳ Mise à jour...' : '📊 Mettre à jour mon tableau →'}
              </button>
              <button onClick={handleNouvelleConversation} style={{ background: 'none', border: 'none', color: '#9CA3AF', cursor: 'pointer', fontSize: 12, fontFamily: 'Inter, sans-serif' }}>Nouvelle conversation</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
