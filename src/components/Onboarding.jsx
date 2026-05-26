import { useState, useRef, useEffect } from 'react';
import { getDemoResponse } from '../utils.js';

const SYSTEM_PROMPT = `Tu es le conseiller patrimonial Nesso. Style : chaleureux, ultra-concis. 2-3 phrases max par message. Texte brut uniquement — aucun markdown (pas de **, pas de #, pas de tirets listes). Ne donne JAMAIS de recommandations dans le chat : ton rôle est uniquement de collecter des informations.

QUESTIONS dans l'ordre (1 seule à la fois) :
1. Niveau de connaissance : novice / intermédiaire / expert
2. Âge, situation civile (marié/pacsé/concubin/célibataire), régime matrimonial si marié
3. Prénom, prénom conjoint, prénoms et âges des enfants, parents encore en vie ?
4. Famille recomposée ? Enfants de plusieurs unions ? Demi-frères/sœurs ?
5. Testament ou donation existants ? (Si non : passer immédiatement, ne pas approfondir)
6. Immobilier : chaque bien — type, valeur, crédit, location, France ou étranger, en nom propre ou SCI
7. Financier : vos assurances-vie (montant, bénéficiaires à jour ?), PEA, PER, liquidités
8. Retraite : régime(s), réversion prévue ?
9. Situation pro : salarié / TNS / libéral / dirigeant / retraité — si société : valeur estimée ?
10. Donations passées ? Montant et date ? (abattement rechargeable tous les 15 ans)
11. Objectifs prioritaires + attendez-vous un héritage de vos parents ?

RÈGLE : si l'utilisateur répond "non", "aucun", "pas de X" — passer à la question suivante sans relancer.

ALERTES à signaler en 1 phrase simple si détecté :
- PACS sans testament : le partenaire hérite de 0€ légalement
- Concubinage : droits de succession à 60%
- Famille recomposée + enfants non communs : conjoint limité à usufruit du quart (art.757)
- Demi-frères/sœurs : règle de la fente successorale (art.733)
- Bien étranger UE : Règlement européen 650/2012
- Bien étranger hors UE : convention bilatérale spécifique à vérifier
- Nationalité américaine : estate tax mondiale possible
- Patrimoine immobilier net du foyer >1,3M€ : IFI potentiel
- AV avec bénéficiaire non mis à jour après changement familial : risque
- Donations informelles non enregistrées : rapportables à la succession
- Profession libérale médicale : retraite CARMF, prévoyance spécifique
- TNS/dirigeant : Pacte Dutreil (abattement 75% succession)
- PER : capital hors succession si décès avant retraite

AVANT DE CONCLURE : demander "Y a-t-il d'autres éléments à ajouter ? Êtes-vous prêt à générer votre tableau de bord ?"
CONCLUSION : quand l'utilisateur confirme, dire uniquement : "Je transmets vos données à notre moteur d'analyse. Votre tableau de bord personnalisé est prêt."
SIGNAL DE FIN : ajouter exactement \`[AUDIT_COMPLET]\` à la toute fin du message de conclusion, une seule fois.`;

const EXTRACTION_PROMPT = `Extrais les données de cette conversation patrimoniale en JSON strict. Réponds UNIQUEMENT avec le JSON, sans markdown.
{
  "prenom": "prénom utilisateur ou Utilisateur",
  "conjoint": "prénom conjoint ou null",
  "enfants_prenoms": [],
  "enfants": 0,
  "age": null,
  "profession": null,
  "regime": "communaute|separation|participation|universel ou null si non mentionné",
  "situation_civile": "marie|pacse|concubin|celibataire ou null",
  "parents_en_vie": null,
  "famille_recomposee": false,
  "actifs": [
    {"nom": "description courte", "categorie": "immobilier|financier|professionnel|exotique", "valeur": 0, "type": "Résidence principale|Résidence secondaire|Bien locatif|Bien étranger|Assurance-vie|PEA|PER|Liquidités|Société|Autre", "pays": "France"}
  ],
  "objectifs": "résumé en 1 phrase ou null",
  "score": 60,
  "alertes": []
}
Règles :
- valeur = 0 si non précisée
- score : 30 (peu de risques) à 90 (risques élevés) — évaluer objectivement
- alertes : liste de mots-clés parmi : ifi, international, famille_recomposee, pacs_sans_testament, concubinage, av_sans_beneficiaire, donations_informelles, dutreil, lmnp, carmf, indivision, demembrement
- inclure TOUS les actifs mentionnés avec leurs vraies valeurs`;

const extractUserData = async (history) => {
  if (history.length < 3) return null;
  try {
    const res = await fetch('/anthropic/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-haiku-4-5',
        max_tokens: 800,
        system: 'Tu es un extracteur de données JSON. Réponds UNIQUEMENT avec le JSON demandé, sans markdown.',
        messages: [
          ...history.slice(-20), // Limiter l'historique envoyé
          { role: 'user', content: EXTRACTION_PROMPT }
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

// Rendu markdown minimal : **gras** → <strong>
const renderText = (text) => {
  const parts = text.split(/(\*\*[^*\n]+\*\*)/g);
  return parts.map((part, i) =>
    part.startsWith('**') && part.endsWith('**')
      ? <strong key={i}>{part.slice(2, -2)}</strong>
      : part
  );
};

export default function Onboarding({ onComplete, apiKey, onApiKey }) {
  const [started, setStarted]   = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput]       = useState('');
  const [loading, setLoading]   = useState(false);
  const [updating, setUpdating] = useState(false);
  const [msgCount, setMsgCount] = useState(0);
  const endRef = useRef(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const isDemoMode = !apiKey;

  const callApi = async (history) => {
    const res = await fetch('/anthropic/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 350,
        system: [{ type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } }],
        messages: history.slice(-18).map(m => ({ role: m.role, content: m.content }))
      }),
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
      await new Promise(r => setTimeout(r, 500 + Math.random() * 300));
      return getDemoResponse(history[history.length - 1].content, count);
    }
    return callApi(history);
  };

  const PROFIL_VIDE = { prenom: 'Vous', conjoint: null, enfants_prenoms: [], actifs: [], alertes: [], score: 60, objectifs: null };

  const complete = (updatedHistory) => {
    setTimeout(async () => {
      if (isDemoMode) { onComplete(null); return; }
      const userData = await extractUserData(updatedHistory);
      onComplete(userData || PROFIL_VIDE);
    }, 1200);
  };

  const saveMessages = (msgs) => {
    try { localStorage.setItem('nesso_messages', JSON.stringify(msgs)); } catch {}
  };

  const start = async () => {
    setStarted(true);
    setLoading(true);
    const init = [{ role: 'user', content: 'Bonjour, je voudrais faire le point sur mon patrimoine familial.' }];
    try {
      const reply = await getReply(init, 0);
      const msgs = [...init, { role: 'assistant', content: reply }];
      setMessages(msgs);
      saveMessages(msgs);
      setMsgCount(1);
    } catch {
      const msgs = [{ role: 'assistant', content: 'Bonjour ! Je suis votre conseiller Nesso. Pour commencer, comment évalueriez-vous votre niveau de connaissance en patrimoine et fiscalité ? Novice, intermédiaire ou expert ?' }];
      setMessages(msgs);
      saveMessages(msgs);
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
      const rawReply = await getReply(history, newCount);
      const auditTermine = rawReply.includes('[AUDIT_COMPLET]');
      const reply = rawReply.replace('[AUDIT_COMPLET]', '').trim();
      const updatedHistory = [...history, { role: 'assistant', content: reply }];
      setMessages(updatedHistory);
      saveMessages(updatedHistory);
      if (auditTermine) complete(updatedHistory);
    } catch (e) {
      setMessages(prev => [...prev, { role: 'assistant', content: `Une erreur est survenue. Réessayez ou passez à la démo.` }]);
    } finally { setLoading(false); }
  };

  const handleMettreAJour = async () => {
    if (updating || loading) return;
    setUpdating(true);
    if (isDemoMode) { onComplete(null); }
    else {
      const userData = await extractUserData(messages);
      onComplete(userData || PROFIL_VIDE);
    }
    setUpdating(false);
  };

  const handleNouvelleConversation = () => {
    localStorage.removeItem('nesso_messages');
    setMessages([]);
    setMsgCount(0);
    setStarted(false);
  };

  const handlePasserDashboard = () => { onComplete(null); };

  // Charger la conversation sauvegardée dans le chat
  const handleContinuerConversation = () => {
    const saved = getSavedMessages();
    if (saved) {
      setMessages(saved);
      setMsgCount(saved.filter(m => m.role === 'user').length);
      setStarted(true);
    }
  };

  // Générer le tableau depuis la conversation sauvegardée
  const handleReprendreConversation = async () => {
    const saved = getSavedMessages();
    if (!saved) return;
    setLoading(true);
    const userData = await extractUserData(saved);
    onComplete(userData || PROFIL_VIDE);
    setLoading(false);
  };

  const getSavedMessages = () => {
    try { const m = localStorage.getItem('nesso_messages'); return m ? JSON.parse(m) : null; } catch { return null; }
  };
  const savedMessages = getSavedMessages();
  const hasSavedConversation = savedMessages && savedMessages.length > 4;

  return (
    <div style={{ minHeight: '100vh', background: '#F5F0EA', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ maxWidth: 660, width: '100%' }}>

        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <h1 className="font-serif" style={{ color: '#C9A96E', fontSize: 42, fontWeight: 700, margin: '0 0 8px' }}>Nesso</h1>
          <p style={{ color: '#1B2B4B', fontSize: 17, margin: 0 }}>Clarté patrimoniale familiale</p>
        </div>

        {!started ? (
          <div className="card" style={{ padding: 40, textAlign: 'center' }}>
            <div style={{ width: 60, height: 60, borderRadius: '50%', background: '#1B2B4B', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 22px', color: '#C9A96E', fontSize: 26 }}>✦</div>
            <h2 className="font-serif" style={{ color: '#1B2B4B', fontSize: 26, margin: '0 0 12px' }}>Votre audit patrimonial</h2>
            <p style={{ color: '#6B7280', lineHeight: 1.75, marginBottom: 28, fontSize: 15 }}>
              Quelques questions pour construire votre tableau de bord personnalisé. <strong>5 minutes</strong> environ.
            </p>

            {isDemoMode && (
              <div style={{ background: '#F0F4FF', border: '1px solid #C7D7FD', borderRadius: 9, padding: 16, marginBottom: 24, textAlign: 'left' }}>
                <p style={{ color: '#1D4ED8', fontSize: 13, fontWeight: 600, margin: '0 0 4px' }}>Mode démo activé</p>
                <p style={{ color: '#3B5BDB', fontSize: 12, margin: '0 0 10px' }}>Réponses simulées. Pour activer le vrai Claude :</p>
                <button onClick={onApiKey} className="btn-navy" style={{ fontSize: 12, padding: '6px 14px' }}>Ajouter ma clé API →</button>
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {hasSavedConversation && !isDemoMode && (
                <>
                  <button onClick={handleContinuerConversation} disabled={loading}
                    style={{ width: '100%', padding: '14px', fontSize: 15, background: '#C9A96E', color: 'white', border: 'none', borderRadius: 10, cursor: loading ? 'wait' : 'pointer', fontFamily: 'DM Sans, sans-serif', fontWeight: 600 }}>
                    ✦ Continuer ma conversation →
                  </button>
                  <button onClick={handleReprendreConversation} disabled={loading}
                    style={{ width: '100%', padding: '11px', fontSize: 14, background: 'white', color: '#1B2B4B', border: '1px solid #E5E7EB', borderRadius: 10, cursor: loading ? 'wait' : 'pointer', fontFamily: 'DM Sans, sans-serif' }}>
                    {loading ? '⏳ Génération...' : '📊 Générer mon tableau depuis la dernière conversation'}
                  </button>
                </>
              )}
              <button className="btn-navy" onClick={start} style={{ width: '100%', padding: '14px', fontSize: 15 }}>
                {isDemoMode ? 'Démarrer la démo →' : hasSavedConversation ? 'Recommencer un nouvel audit →' : 'Commencer l\'audit →'}
              </button>
              <button onClick={handlePasserDashboard} style={{ background: 'none', border: 'none', color: '#7A7A8C', cursor: 'pointer', fontSize: 13, padding: 8, fontFamily: 'DM Sans, sans-serif' }}>
                Voir l'exemple sans remplir →
              </button>
            </div>
          </div>
        ) : (
          <div className="card" style={{ display: 'flex', flexDirection: 'column', height: 640 }}>
            <div style={{ padding: '14px 20px', borderBottom: '1px solid #F5F0EA', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 34, height: 34, borderRadius: '50%', background: '#C9A96E', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: 14 }}>N</div>
                <div>
                  <p style={{ fontWeight: 600, color: '#1B2B4B', fontSize: 14, margin: 0 }}>Conseiller Nesso</p>
                  <p style={{ color: '#10B981', fontSize: 11, margin: 0 }}>● {isDemoMode ? 'Mode démo' : 'En ligne'}</p>
                </div>
              </div>
              {isDemoMode && (
                <button onClick={onApiKey} style={{ background: '#F0F4FF', border: '1px solid #C7D7FD', color: '#1D4ED8', borderRadius: 7, padding: '5px 11px', fontSize: 11, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>
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
                  <div style={{ maxWidth: '80%', background: m.role === 'user' ? '#1B2B4B' : '#F9FAFB', color: m.role === 'user' ? 'white' : '#1A1A2E', padding: '11px 15px', borderRadius: m.role === 'user' ? '12px 12px 3px 12px' : '3px 12px 12px 12px', fontSize: 14, lineHeight: 1.75, whiteSpace: 'pre-wrap' }}>
                    {renderText(m.content)}
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
                <button onClick={() => send('Je ne sais pas, passons à la suite')}
                  style={{ background: 'none', border: '1px solid #E5E7EB', color: '#7A7A8C', borderRadius: 20, padding: '5px 12px', fontSize: 12, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>
                  Passer cette question
                </button>
              </div>
            )}

            <div style={{ borderTop: '1px solid #F5F0EA', padding: 14, display: 'flex', gap: 9 }}>
              <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()}
                placeholder="Répondez ici..." style={{ flex: 1, border: '1px solid #E5E7EB', borderRadius: 9, padding: '10px 14px', fontSize: 14, fontFamily: 'DM Sans, sans-serif' }} />
              <button className="btn-navy" onClick={() => send()} disabled={loading || !input.trim()} style={{ padding: '10px 18px' }}>→</button>
            </div>

            {msgCount >= 6 && !updating && !loading && (
              <div style={{ padding: '0 14px 10px' }}>
                <button onClick={handleMettreAJour} style={{ width: '100%', padding: '12px', fontSize: 14, fontWeight: 600, background: '#1B2B4B', color: '#C9A96E', border: 'none', borderRadius: 9, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>
                  {updating ? '⏳ Génération...' : '✦ Générer mon tableau de bord →'}
                </button>
              </div>
            )}

            <div style={{ textAlign: 'center', paddingBottom: 12 }}>
              <button onClick={handleNouvelleConversation} style={{ background: 'none', border: 'none', color: '#7A7A8C', cursor: 'pointer', fontSize: 12, fontFamily: 'DM Sans, sans-serif' }}>
                Nouvelle conversation
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
