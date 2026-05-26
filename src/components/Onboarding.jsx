import { useState, useRef, useEffect } from 'react';
import { getDemoResponse } from '../utils.js';

const SYSTEM_PROMPT = `Tu es le conseiller patrimonial Nesso. Style : chaleureux, ultra-concis. 2-3 phrases max par message. Texte brut uniquement — aucun markdown (pas de **, pas de #, pas de tirets listes). Ne donne JAMAIS de recommandations dans le chat : ton rôle est uniquement de collecter des informations.

QUESTIONS dans l'ordre (1 seule à la fois) :
1. Niveau de connaissance patrimoniale : novice / intermédiaire / expert
2. Vous : prénom, âge, profession, situation civile (marié/pacsé/concubin/célibataire), régime matrimonial si marié
3. Conjoint (si applicable) : prénom, âge, profession
4. Enfants : prénoms et âges (et précise s'ils sont d'une union précédente)
5. Parents encore en vie ? Si oui âges approximatifs
6. Famille recomposée ? Demi-frères/sœurs ?
7. Testament ou donation existants ? (Si non : passer immédiatement, ne pas approfondir)
8. Immobilier APPARTENANT au foyer (vous + conjoint uniquement) : chaque bien — type, valeur, crédit, location, France ou étranger, en nom propre ou SCI. NE PAS demander les biens des parents/beaux-parents/fratrie.
9. Financier DU FOYER : vos assurances-vie (montant, bénéficiaires à jour ?), PEA, PER, liquidités
10. Retraite : régime(s), réversion prévue ? — si société : valeur estimée ?
11. Donations passées ? Montant et date ? (abattement rechargeable tous les 15 ans)
12. Objectifs prioritaires + attendez-vous un héritage de vos parents/beaux-parents ? (information à titre indicatif uniquement, NE PAS comptabiliser comme votre patrimoine actuel)

RÈGLE CRITIQUE PATRIMOINE : "votre patrimoine" = exclusivement les biens dont vous et/ou votre conjoint êtes propriétaires aujourd'hui. Les biens des parents, beaux-parents, fratrie, amis → JAMAIS dans votre patrimoine, même si vous en hériterez un jour.

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
CONCLUSION : quand l'utilisateur confirme, dire EXACTEMENT : "Parfait, je transmets vos données à notre moteur d'analyse. Votre tableau de bord personnalisé sera prêt dans quelques secondes. ⚠ Important : pour conserver votre audit, pensez à créer un compte gratuit depuis le tableau de bord — sinon vos données seront perdues si vous quittez la page."
SIGNAL DE FIN : ajouter exactement \`[AUDIT_COMPLET]\` à la toute fin du message de conclusion, une seule fois.`;

const EXTRACTION_PROMPT = `Extrais les données patrimoniales de cette conversation en JSON strict. Réponds UNIQUEMENT avec le JSON, sans markdown.

PRINCIPE FONDAMENTAL : ne JAMAIS renvoyer null/0/vide pour les champs critiques. Si une info est manquante, ESTIME le plus probable d'après le contexte (âge, profession, ville, situation familiale). Un tableau de bord vide est un échec — toujours fournir des valeurs plausibles.

RÈGLE CRITIQUE — PÉRIMÈTRE DU PATRIMOINE : Le champ "actifs" doit contenir EXCLUSIVEMENT les biens appartenant au foyer fiscal (user + conjoint). NE JAMAIS inclure les biens des parents, beaux-parents, fratrie, amis, enfants majeurs autonomes, même si l'utilisateur les mentionne. Un héritage attendu n'est PAS un actif actuel.

Exemples :
- "Mes beaux-parents ont un appartement à Paris à 800 000€" → NE PAS l'ajouter aux actifs
- "Mon père a une maison de 500k qui me reviendra" → NE PAS l'ajouter (mais peut alimenter "objectifs" sous forme d'héritage anticipé)
- "Nous avons acheté une RP avec mon mari, 600 000€" → AJOUTER aux actifs (c'est bien le patrimoine du foyer)

{
  "prenom": "prénom utilisateur (sinon 'Vous')",
  "conjoint": "prénom conjoint ou null si célibataire",
  "enfants_prenoms": ["prénoms des enfants — si l'user dit 'j'ai 2 enfants' sans prénom, utiliser 'Enfant 1', 'Enfant 2'"],
  "enfants": 0,
  "age": 40,
  "profession": "ESTIMER si non dit (ex: 'cadre' par défaut pour un patrimoine important)",
  "regime": "communaute|separation|participation|universel — si marié sans précision : 'communaute' (défaut légal France)",
  "situation_civile": "marie|pacse|concubin|celibataire — déduire du contexte si non explicite",
  "parents_en_vie": true,
  "famille_recomposee": false,
  "actifs": [
    {"nom": "description courte", "categorie": "immobilier|financier|professionnel|exotique", "valeur": 250000, "type": "Résidence principale|Résidence secondaire|Bien locatif|Bien étranger|Assurance-vie|PEA|PER|Liquidités|Société|Autre", "pays": "France"}
  ],
  "objectifs": "résumé en 1 phrase (par défaut : 'Optimiser la transmission patrimoniale et réduire la fiscalité')",
  "score": 60,
  "alertes": []
}

RÈGLES D'ESTIMATION (utilise-les sans hésiter quand l'info manque) :
- Valeur d'un bien immobilier non précisée : estimer selon contexte (Paris ~10k€/m², province ~3k€/m², appart standard 80m², maison 130m²). Par défaut Résidence principale = 350 000€, Résidence secondaire = 250 000€, Bien locatif = 200 000€.
- Assurance-vie sans montant : estimer 50 000€ (médiane française pour épargnant moyen 40 ans)
- PEA sans montant : 30 000€ ; PER : 20 000€ ; Liquidités : 15 000€
- Société/parts pro sans valeur : 200 000€ (PME médiane)
- Si l'user dit "j'ai un peu d'épargne" sans préciser : créer un actif "Liquidités" à 20 000€
- Si l'user mentionne un bien sans préciser le type : choisir "Résidence principale" par défaut
- Âge non donné : 45 ans (cible patrimoniale moyenne)
- Profession non donnée mais patrimoine >500k€ : "Cadre" ; sinon "Salarié"

LOGIQUE DE TRANCHAGE :
- Toujours inclure AU MOINS 2 actifs dans le tableau (sinon dashboard vide). Si l'user n'a vraiment rien dit : ajouter une résidence principale estimée + liquidités estimées.
- enfants_prenoms ne doit JAMAIS être vide si enfants > 0 — générer "Enfant 1", "Enfant 2" si pas de prénom
- Score : 30 (peu de risques) à 90 (risques élevés). Par défaut 60.
- Alertes : tirer parmi { ifi, international, famille_recomposee, pacs_sans_testament, concubinage, av_sans_beneficiaire, donations_informelles, dutreil, lmnp, carmf, indivision, demembrement }
  → Si PACS détecté ET aucun testament mentionné : OBLIGATOIRE ajouter "pacs_sans_testament"
  → Si concubin détecté : OBLIGATOIRE ajouter "concubinage"
  → Si bien à l'étranger : OBLIGATOIRE ajouter "international"
  → Si patrimoine immobilier net (RP × 0.7 + autres) > 1 300 000€ : OBLIGATOIRE ajouter "ifi"
  → Si profession libérale médicale (médecin, dentiste, kiné...) : ajouter "carmf"
  → Si TNS/dirigeant avec société : ajouter "dutreil"

Mieux vaut une estimation imparfaite qu'un champ vide. Tranche toujours.`;

// Bug #3 : parsing JSON robuste — gère markdown ```json, texte autour, JSON tronqué
const parseJsonRobust = (text) => {
  if (!text) return null;
  // Strip code fences ```json ... ``` ou ``` ... ```
  let cleaned = text.replace(/```(?:json)?\s*/gi, '').replace(/```/g, '').trim();
  // Premier essai : parser le texte nettoyé directement
  try { return JSON.parse(cleaned); } catch {}
  // Deuxième essai : extraire le plus grand bloc { ... } équilibré
  const start = cleaned.indexOf('{');
  if (start === -1) return null;
  let depth = 0, end = -1;
  for (let i = start; i < cleaned.length; i++) {
    if (cleaned[i] === '{') depth++;
    else if (cleaned[i] === '}') { depth--; if (depth === 0) { end = i; break; } }
  }
  if (end === -1) return null;
  try { return JSON.parse(cleaned.slice(start, end + 1)); } catch (e) {
    console.error('parseJsonRobust failed:', e, 'on:', cleaned.slice(start, end + 1).slice(0, 200));
    return null;
  }
};

const extractUserData = async (history) => {
  if (history.length < 3) return null;
  // Bug #8 : timeout de 20s sur l'extraction (au lieu d'attendre indéfiniment)
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);
  try {
    const res = await fetch('/anthropic/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        model: 'claude-haiku-4-5',
        max_tokens: 1200, // Augmenté pour éviter les troncatures du JSON
        system: 'Tu es un extracteur de données JSON. Réponds UNIQUEMENT avec le JSON demandé, sans markdown, sans texte avant ou après.',
        messages: [
          ...history.slice(-20),
          { role: 'user', content: EXTRACTION_PROMPT }
        ]
      })
    });
    clearTimeout(timeout);
    if (!res.ok) return null;
    const data = await res.json();
    const text = data.content?.[0]?.text || '';
    return parseJsonRobust(text);
  } catch (e) {
    clearTimeout(timeout);
    if (e.name === 'AbortError') console.error('Extraction timeout (20s)');
    else console.error('Extraction error:', e);
    return null;
  }
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

export default function Onboarding({ onComplete, apiKey, onApiKey, onLogin }) {
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
        model: 'claude-haiku-4-5',
        max_tokens: 500,
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

  // Profil de secours : valeurs plausibles pour ne JAMAIS afficher un tableau vide
  const PROFIL_VIDE = {
    prenom: 'Vous', conjoint: null, enfants_prenoms: [], age: 45, profession: 'Cadre',
    regime: 'communaute', situation_civile: 'celibataire', parents_en_vie: true, famille_recomposee: false,
    actifs: [
      { nom: 'Résidence principale (estimée)', categorie: 'immobilier', valeur: 350000, type: 'Résidence principale', pays: 'France' },
      { nom: 'Épargne (estimée)', categorie: 'financier', valeur: 30000, type: 'Liquidités', pays: 'France' },
    ],
    alertes: [], score: 60,
    objectifs: 'Optimiser la transmission patrimoniale et réduire la fiscalité',
  };

  // Garantit qu'aucun champ critique n'est vide/nul après extraction
  const sanitizeUserData = (data) => {
    if (!data) return PROFIL_VIDE;
    const out = { ...data };
    if (!out.prenom || out.prenom === 'Utilisateur') out.prenom = 'Vous';
    if (!out.age) out.age = 45;
    if (!out.profession) out.profession = 'Cadre';
    if (!out.regime && out.situation_civile === 'marie') out.regime = 'communaute';
    if (out.parents_en_vie == null) out.parents_en_vie = true;
    if (!out.objectifs) out.objectifs = 'Optimiser la transmission patrimoniale et réduire la fiscalité';
    if (!out.score) out.score = 60;
    if (!Array.isArray(out.alertes)) out.alertes = [];
    if (!Array.isArray(out.enfants_prenoms)) out.enfants_prenoms = [];
    // Si nombre d'enfants > 0 mais pas de prénoms, en générer
    if (out.enfants > 0 && out.enfants_prenoms.length === 0) {
      out.enfants_prenoms = Array.from({ length: out.enfants }, (_, i) => `Enfant ${i + 1}`);
    }
    // Au moins 2 actifs pour éviter un dashboard vide
    if (!Array.isArray(out.actifs) || out.actifs.length === 0) {
      out.actifs = PROFIL_VIDE.actifs;
    } else {
      // Filet de sécurité : exclure les actifs qui semblent appartenir à des tiers
      // (mots-clés dans le nom évoquant parents/beaux-parents/fratrie)
      const TIERS_REGEX = /\b(parent|beau|belle|père|mère|m[èe]re|p[èa]re|fr[èe]re|s(œ|oe)ur|grand[\s-]?(parent|p[èe]re|m[èe]re)|oncle|tante|cousin|cousine|ami|amie)s?\b/i;
      out.actifs = out.actifs.filter(a => !TIERS_REGEX.test(a.nom || ''));
      // Si on a tout filtré → revenir aux defaults pour ne pas afficher un dashboard vide
      if (out.actifs.length === 0) out.actifs = PROFIL_VIDE.actifs;

      // Forcer valeurs >0 sur les actifs (estimations par défaut si manquantes)
      const defauts = {
        'Résidence principale': 350000, 'Résidence secondaire': 250000, 'Bien locatif': 200000,
        'Assurance-vie': 50000, 'PEA': 30000, 'PER': 20000, 'Liquidités': 15000, 'Société': 200000,
      };
      out.actifs = out.actifs.map(a => ({
        ...a,
        valeur: a.valeur > 0 ? a.valeur : (defauts[a.type] || 50000),
        categorie: a.categorie || 'financier',
        type: a.type || 'Autre',
        pays: a.pays || 'France',
      }));
    }
    return out;
  };

  const complete = (updatedHistory) => {
    setTimeout(async () => {
      if (isDemoMode) { onComplete(null); return; }
      const userData = await extractUserData(updatedHistory);
      onComplete(sanitizeUserData(userData));
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
      // Bug #2 : détection robuste du signal de fin (tolère variantes : majuscules, espaces, accents, markdown)
      const SIGNAL_REGEX = /\[?\s*audit[\s_-]*complet[\s_-]*\]?/i;
      const auditTermine = SIGNAL_REGEX.test(rawReply);
      const reply = rawReply.replace(/\[?\s*audit[\s_-]*complet[\s_-]*\]?/gi, '').trim();
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
      onComplete(sanitizeUserData(userData));
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
    onComplete(sanitizeUserData(userData));
    setLoading(false);
  };

  const getSavedMessages = () => {
    try { const m = localStorage.getItem('nesso_messages'); return m ? JSON.parse(m) : null; } catch { return null; }
  };
  const savedMessages = getSavedMessages();
  const hasSavedConversation = savedMessages && savedMessages.length > 4;

  return (
    <div style={{ minHeight: '100vh', background: '#F5F0EA', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: started ? 'center' : 'flex-start', padding: started ? 24 : '60px 24px' }}>
      <div style={{ maxWidth: 720, width: '100%' }}>

        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <h1 className="font-serif" style={{ color: '#C9A96E', fontSize: 42, fontWeight: 700, margin: '0 0 8px' }}>Nesso</h1>
          <p style={{ color: '#1B2B4B', fontSize: 17, margin: 0, lineHeight: 1.5 }}>La solution IA pour gérer le patrimoine et la succession de ta famille</p>
        </div>

        {!started ? (
          <>
          <div className="card" style={{ padding: 40, textAlign: 'center' }}>
            <div style={{ width: 60, height: 60, borderRadius: '50%', background: '#1B2B4B', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 22px', color: '#C9A96E', fontSize: 26 }}>✦</div>
            <h2 className="font-serif" style={{ color: '#1B2B4B', fontSize: 26, margin: '0 0 12px' }}>Votre audit patrimonial</h2>
            <p style={{ color: '#6B7280', lineHeight: 1.75, marginBottom: 28, fontSize: 15 }}>
              Quelques questions pour construire votre tableau de bord personnalisé. <strong>5 à 15 minutes</strong> selon votre situation.
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

            {/* Connexion pour utilisateurs existants */}
            {onLogin && (
              <div style={{ marginTop: 22, paddingTop: 18, borderTop: '1px solid #F0EBE4' }}>
                <p style={{ color: '#7A7A8C', fontSize: 13, margin: 0 }}>
                  Vous avez déjà un compte ?{' '}
                  <button onClick={onLogin} style={{ background: 'none', border: 'none', color: '#C9A96E', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', padding: 0, textDecoration: 'underline' }}>
                    Se connecter →
                  </button>
                </p>
              </div>
            )}
          </div>

          {/* Manifeste / Qui sommes-nous */}
          <div style={{ marginTop: 64, padding: '0 8px' }}>

            {/* Ornement décoratif d'ouverture */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14, marginBottom: 24 }}>
              <div style={{ flex: '0 0 60px', height: 1, background: '#D1C4B0' }} />
              <span style={{ color: '#C9A96E', fontSize: 14 }}>✦</span>
              <div style={{ flex: '0 0 60px', height: 1, background: '#D1C4B0' }} />
            </div>

            <p style={{ color: '#C9A96E', fontSize: 11, fontWeight: 600, letterSpacing: '0.22em', textTransform: 'uppercase', textAlign: 'center', margin: '0 0 16px' }}>Notre manifeste</p>
            <h2 className="font-serif" style={{ color: '#1B2B4B', fontSize: 30, fontWeight: 700, textAlign: 'center', margin: '0 0 18px', lineHeight: 1.25, letterSpacing: '-0.01em' }}>
              La clarté patrimoniale n'est plus réservée aux familles aisées.
            </h2>
            <p style={{ color: '#6B7280', fontSize: 15, lineHeight: 1.75, textAlign: 'center', maxWidth: 560, margin: '0 auto 40px', fontStyle: 'italic' }}>
              Une succession bien préparée peut représenter <strong style={{ color: '#1B2B4B', fontStyle: 'normal' }}>des dizaines de milliers d'euros</strong> conservés par votre famille. Jusqu'ici, ce savoir-faire restait inaccessible à la plupart des foyers.
            </p>

            {/* Tableau de constats — style éditorial */}
            <div style={{ background: 'white', borderRadius: 14, overflow: 'hidden', border: '1px solid rgba(27,43,75,0.08)', marginBottom: 36, boxShadow: '0 4px 24px rgba(27,43,75,0.04)' }}>
              <div style={{ background: '#F5F0EA', padding: '12px 24px', borderBottom: '1px solid rgba(27,43,75,0.08)' }}>
                <p style={{ color: '#1B2B4B', fontSize: 11, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', margin: 0 }}>Le constat — 15 dernières années</p>
              </div>

              {[
                {
                  icon: '↑',
                  chiffre: '× 3',
                  titre: 'Les recettes de l\'État sur les successions',
                  desc: 'De 7 milliards € en 2011 à 21,2 milliards € en 2025 : les droits de succession ont triplé en moins de 15 ans.',
                  source: 'Source : DGFiP',
                  ton: 'rouge',
                },
                {
                  icon: '=',
                  chiffre: '100 k€',
                  titre: 'L\'abattement parent-enfant, inchangé depuis 2012',
                  desc: 'Le seuil d\'exonération n\'a pas bougé depuis 13 ans. Pendant ce temps, le prix moyen de l\'immobilier en France a augmenté de plus de 30 %. La fiscalité réelle progresse en silence.',
                  source: 'Source : article 779 du CGI',
                  ton: 'orange',
                },
                {
                  icon: '◐',
                  chiffre: 'Une minorité',
                  titre: 'Les familles vraiment équipées',
                  desc: 'Seules les familles qui pouvaient s\'offrir notaire de famille, fiscaliste, gestionnaire de patrimoine ou family office optimisaient réellement leur transmission.',
                  ton: 'navy',
                },
              ].map((c, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 22, padding: '22px 24px', borderTop: i > 0 ? '1px solid #F5F0EA' : 'none' }}>
                  <div style={{ flex: '0 0 56px', textAlign: 'center' }}>
                    <div style={{ width: 38, height: 38, borderRadius: '50%', background: c.ton === 'rouge' ? '#FEF2F2' : c.ton === 'orange' ? '#FFF8F0' : '#F0F4FF', color: c.ton === 'rouge' ? '#E24B4A' : c.ton === 'orange' ? '#C9A96E' : '#1B2B4B', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 700, margin: '0 auto' }}>
                      {c.icon}
                    </div>
                  </div>
                  <div style={{ flex: '0 0 110px', display: 'flex', alignItems: 'center' }}>
                    <p className="font-serif" style={{ color: '#C9A96E', fontSize: c.chiffre.length > 4 ? 19 : 28, fontWeight: 700, margin: 0, lineHeight: 1.05 }}>{c.chiffre}</p>
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ color: '#1B2B4B', fontSize: 14, fontWeight: 600, margin: '0 0 4px' }}>{c.titre}</p>
                    <p style={{ color: '#7A7A8C', fontSize: 13, lineHeight: 1.65, margin: '0 0 6px' }}>{c.desc}</p>
                    {c.source && (
                      <p style={{ color: '#A8A8B8', fontSize: 11, fontStyle: 'italic', margin: 0 }}>{c.source}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Bloc Mission — style citation éditoriale */}
            <div style={{ position: 'relative', background: 'linear-gradient(135deg, #1B2B4B 0%, #243656 100%)', borderRadius: 16, padding: '40px 36px 32px', color: 'white', overflow: 'hidden' }}>
              {/* Guillemet décoratif */}
              <span className="font-serif" style={{ position: 'absolute', top: 4, left: 22, fontSize: 110, color: 'rgba(201,169,110,0.18)', lineHeight: 1, pointerEvents: 'none' }}>“</span>

              <div style={{ position: 'relative' }}>
                <p style={{ color: '#C9A96E', fontSize: 11, fontWeight: 600, letterSpacing: '0.22em', textTransform: 'uppercase', margin: '0 0 16px' }}>Notre conviction</p>

                <p className="font-serif" style={{ fontSize: 22, lineHeight: 1.5, margin: '0 0 18px', color: 'white', fontWeight: 400 }}>
                  Aujourd'hui, l'IA permet à chacun de prendre en main son patrimoine et d'anticiper sa succession <span style={{ color: '#C9A96E' }}>à un coût quasi nul</span>.
                </p>

                <p style={{ fontSize: 15, lineHeight: 1.75, margin: '0 0 28px', color: 'rgba(255,255,255,0.78)' }}>
                  C'est la mission de <strong style={{ color: '#C9A96E' }}>Nesso</strong> : apporter cette connaissance et cette clarté à tous les foyers, et casser l'inégalité d'accès au conseil patrimonial.
                </p>

                {/* Signature */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 10, paddingTop: 18, borderTop: '1px solid rgba(201,169,110,0.2)' }}>
                  <div style={{ width: 40, height: 1, background: 'rgba(201,169,110,0.45)' }} />
                  <p className="font-serif" style={{ fontStyle: 'italic', color: '#C9A96E', fontSize: 16, margin: 0, fontWeight: 400 }}>
                    L'équipe Nesso
                  </p>
                </div>
              </div>
            </div>

            {/* Ornement décoratif de fermeture */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14, marginTop: 32 }}>
              <div style={{ flex: '0 0 60px', height: 1, background: '#D1C4B0' }} />
              <span style={{ color: '#C9A96E', fontSize: 10 }}>◆</span>
              <div style={{ flex: '0 0 60px', height: 1, background: '#D1C4B0' }} />
            </div>
          </div>
          </>
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
