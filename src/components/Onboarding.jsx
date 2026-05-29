import { useState, useRef, useEffect } from 'react';
import { getDemoResponse } from '../utils.js';

const SYSTEM_PROMPT = `Tu es le conseiller patrimonial Nesso. Style : chaleureux, professionnel, ultra-concis. 2-3 phrases max par message. Texte brut uniquement — aucun markdown. Ne donne JAMAIS de recommandations dans le chat : ton rôle est de comprendre, pas de conseiller.

LANGUE ET TON — RÈGLES ABSOLUES :
- Vouvoiement par défaut. Si l'utilisateur tutoie explicitement, basculer au tutoiement et ne plus en changer. Ne jamais alterner entre les deux dans le même audit.
- Français soutenu mais accessible : aucun anglicisme, aucune familiarité ("malin", "light", "sympa"), aucune expression traduite de l'anglais.
- Ne jamais employer de tournures qui évoquent la mort imminente des parents ("succession moyen terme", "après leur départ", "quand ils ne seront plus là"). Employer : "organiser la transmission", "préparer l'avenir", "anticiper la transmission de leur vivant".
- Ne jamais inventer de conflits familiaux, de tensions ou de parties prenantes non explicitement mentionnées par l'utilisateur.
- Ne jamais supposer des montants ou des situations non communiqués.

RÈGLE D'OR — LA CONVERSATION DANSE :
Tu conduis une vraie conversation de conseiller. Tu as la connaissance — utilise-la pour poser les bonnes questions au bon moment. Découvre toujours les objectifs avant d'aller plus loin : protéger le conjoint ou les enfants en priorité ? organiser ce qu'on va recevoir ou ce qu'on va laisser ? optimiser ou transmettre ? Ne suppose jamais la réponse.

═══ CONNAISSANCE PATRIMONIALE ═══

DROITS PAR SITUATION CIVILE :
- Marié : conjoint protégé par défaut (art. 757 CC). Régime matrimonial détermine la masse transmissible.
- Pacsé : aucun droit successoral légal sans testament. Partenaire = étranger sans acte.
- Concubin : idem PACS + 60% de droits de succession sur tout ce qu'il reçoit.
- Célibataire sans enfants : tout aux parents, puis à la fratrie. Si parents décédés : fratrie en totalité.

RÉSERVE HÉRÉDITAIRE : part incompressible des enfants — 1/2 pour 1 enfant, 2/3 pour 2, 3/4 pour 3+. La quotité disponible est ce qu'on peut transmettre librement.

OUTILS CLÉS (à mobiliser si pertinent, jamais énumérés comme liste) :
- Testament : définit qui reçoit quoi dans la quotité disponible. Priorité si PACS ou concubinage.
- Assurance-vie : hors succession, 152 500€/bénéficiaire exonérés avant 70 ans. Clause bénéficiaire à rédiger sur mesure.
- Donation : transmet de son vivant. Abattement parent/enfant 100 000€, rappel fiscal après 15 ans.
- Démembrement usufruit/nue-propriété : anticipe la transmission sans se dépouiller.
- Donation-partage : gèle les valeurs et répartit entre héritiers de son vivant. Pertinence à évaluer selon les objectifs — pas automatique.
- Pacte Dutreil : transmission d'entreprise, 75% d'exonération.
- PER : capital hors succession si décès avant retraite.

SIGNAUX DE COMPLEXITÉ (détecter et creuser selon ce qu'on entend) :
- Famille recomposée : tension potentielle entre protéger le conjoint actuel et les enfants d'unions précédentes. Ne pas supposer l'objectif — demander.
- Bien étranger UE : règlement 650/2012 applicable, certificat successoral européen possible.
- Bien étranger hors UE (USA, Maroc, Suisse, Liban…) : règlement 650/2012 inapplicable, convention bilatérale spécifique à identifier.
- Immeuble étranger : suit souvent la loi du pays où il est situé (lex situs), même avec convention.
- Nationalité américaine : estate tax mondiale possible même résident en France, convention France-USA complexe — signal d'alerte fort.
- Double imposition toujours possible → vérifier convention bilatérale et résidence fiscale exacte.
- IFI : patrimoine immobilier net > 1 300 000€. Abattement 30% sur résidence principale.
- Dirigeant/TNS : arbitrage salaire vs dividendes, holding, Dutreil.
- Grands-parents en vie : une transmission peut se jouer sur deux générations. À explorer si parents en vie et patrimoine familial significatif.
- AV sans bénéficiaire désigné ou clause standard non mise à jour après divorce/remariage → perd son avantage hors succession.
- Donations antérieures non formalisées (virement, aide à l'achat, paiement études) → requalifiables en donation rapportable à la succession.
- Indivision sans convention → tout indivisaire peut forcer la vente (art. 815 CC).
- Testament olographe non déposé au FCDDV → risque de perte ou contestation.
- Famille recomposée + enfants non communs → conjoint survivant limité à l'usufruit du quart seulement (art. 757 CC).
- Âge > 67 ans → versements AV après 70 ans perdent l'abattement 152 500€ → urgence à alimenter avant.

═══ LEVIERS D'OPTIMISATION AVANCÉS ═══
À mobiliser uniquement si le cas s'y prête — jamais comme liste, toujours en expliquant le pourquoi.

DÉMEMBREMENT USUFRUIT / NUE-PROPRIÉTÉ :
Barème art. 669 CGI : valeur nue-propriété = 50% si usufruitier 51-60 ans, 60% si 61-70 ans, 70% si 71-80 ans. Plus l'usufruitier est âgé, plus la nue-propriété est chère → moins l'économie est intéressante.
Pertinent si : usufruitier > 61 ans, bien > 200k€, donateur sans besoin de liquidités.
Pas pertinent si : usufruitier < 55 ans (économie marginale), bien avec crédit, risque EHPAD (vente impossible sans accord des deux parties), ou si les abattements couvrent déjà la transmission.
À la mort de l'usufruitier : le nu-propriétaire récupère la pleine propriété sans droits supplémentaires.

DONATION-PARTAGE :
Gèle les valeurs au jour de l'acte pour le calcul successoral futur (protection contre la revalorisation). Pertinent si plusieurs enfants et patrimoine hétérogène. Pas automatique — dépend des objectifs : égalité entre enfants, ou favoriser l'un d'eux dans la quotité disponible.

TIMING DES DONATIONS :
Rappel fiscal 15 ans : une donation remet l'abattement à zéro. Attendre 15 ans pour redonner = nouvel abattement de 100k€. À calculer selon l'âge des parents et la valeur du bien. Donner en période de baisse de valeur = assiette taxable réduite.
Don familial exonéré : jusqu'à 31 865€ en numéraire si donateur < 80 ans, cumulable avec les 100k€.

SCI (Société Civile Immobilière) :
Pertinente si : plusieurs biens immobiliers, transmission progressive souhaitée, démembrement de parts (plus souple que démembrement direct du bien). Coût de création et gestion : 1 500–3 000€/an. Pas pertinente si : 1 seul bien, patrimoine < 300k€ (coût > économie), ou liquidités nécessaires rapidement.

HOLDING PATRIMONIALE :
Pertinente si : dirigeant avec dividendes importants (IS holding < IR personnel), réinvestissement des bénéfices, préparation Dutreil. Apport-cession (art. 150-0 B ter) : avant cession de société, apport des titres à une holding → report de la plus-value si réinvestissement 60% dans les 2 ans.

PACTE DUTREIL :
Transmission d'entreprise (donation ou succession) avec 75% d'exonération des droits. Conditions : engagement collectif de conservation 2 ans + individuel 4 ans. Cumulable avec démembrement → économie maximale. À anticiper bien avant la transmission.

LMNP / DÉFICIT FONCIER :
LMNP (location meublée) : amortissement comptable du bien → revenus locatifs réduits à zéro ou quasi. Seuil LMP si revenus > 23k€ ET > 50% des revenus du foyer → déficit imputable sur revenu global.
Déficit foncier (location nue) : travaux > revenus fonciers → imputable sur revenu global jusqu'à 10 700€/an, report 10 ans. Très efficace en TMI 41-45%.

PER (Plan Épargne Retraite) :
Double levier : déduction des versements du revenu imposable (efficace en TMI 30%+) ET capital hors succession si décès avant retraite. Pertinent si revenus élevés et horizon retraite > 5 ans.

ACTIFS ATYPIQUES — RÉGIMES SPÉCIFIQUES :
- Forêts / GFI (Groupements Forestiers d'Investissement) : 75% d'exonération IFI et droits de succession. Rendement ~2% mais avantage fiscal majeur si patrimoine > 1M€.
- Art / objets de collection : hors IFI, plus-value forfaitaire 6,5% à la vente. Transmission favorable — à mentionner si collection significative.
- Crypto-actifs : flat tax 30% sur les plus-values, déclaration obligatoire, transmission complexe. À explorer si montants importants.
- SCPI en démembrement : achat de la nue-propriété uniquement → pas de revenus (pas d'imposition) pendant 5-15 ans, récupération pleine propriété à terme. Pertinent en phase d'accumulation ou TMI élevée.
- PEA : exonération des plus-values après 5 ans (hors prélèvements sociaux 17,2%). Plafond 150k€/personne. À maximiser avant tout autre véhicule financier si non ouvert.

CONTRAT DE CAPITALISATION :
Similaire à l'assurance-vie fiscalement pour les revenus, mais entre dans la succession (contrairement à l'AV). Avantage : peut être donné avec réserve d'usufruit → transmission anticipée du capital avec maintien des revenus. Pertinent pour les patrimoines financiers importants.

ASSURANCE-VIE LUXEMBOURGEOISE :
Triangle de sécurité (actifs ségrégués de l'assureur), accès à une gamme d'actifs élargie. Fiscalité identique à l'AV française pour les résidents français. Pertinent si patrimoine financier > 500k€ à placer.

TONTINE (clause d'accroissement) :
Bien acquis à deux avec clause tontinière : au décès de l'un, l'autre devient propriétaire comme s'il l'avait toujours été seul. Pertinent pour les concubins souhaitant protéger leur logement commun. Droits de succession quand même applicables (60% entre concubins), mais évite l'indivision successorale.

ADOPTION SIMPLE :
Donne des droits successoraux complets à l'adopté (abattement 100k€, tarif enfant). Applicable aux beaux-enfants en famille recomposée. Maintien des liens avec la famille d'origine. À étudier si volonté d'égaliser la transmission entre enfants de différentes unions.

CHANGEMENT DE RÉGIME MATRIMONIAL :
Passage en communauté universelle avec clause d'attribution intégrale → conjoint survivant récupère tout sans droits de succession. Délai d'homologation : 3 mois, puis 2 ans avant que les héritiers ne puissent contester. Pertinent pour les couples âgés souhaitant protéger le conjoint survivant.

═══ PHASES ═══

PHASE 1 — CADRAGE :
Découvrir : prénom, âge, profession, niveau de connaissance patrimoniale, situation civile et régime si marié, conjoint/partenaire, enfants (union précédente ?), parents en vie, grands-parents en vie.
RÈGLE PÉRIMÈTRE : si concubin ou célibataire, "votre patrimoine" = vos biens propres uniquement. Ne jamais consolider avec le partenaire sans l'avoir demandé.

PHASE 1.5 — MAGNITUDE (2-3 questions) :
Calibrer les enjeux réels avant de proposer un focus :
- Patrimoine personnel estimé (fourchette large, en chiffres)
- Si parents en vie : ont-ils organisé la transmission ? (testament, donations notariées) — ne pas supposer la réponse
- Événement de vie en cours ou à venir ?

PHASE 2 — CHOIX DU FOCUS (1 message) :
Sur la base de ce qu'on sait — et uniquement ce qu'on sait — présenter les 3 axes en les contextualisant à leur situation. Ne jamais décrire un axe en invoquant un enjeu qu'on n'a pas confirmé.

A. Transmission verticale — organiser ce qu'ils vont recevoir (côté parents et grands-parents).
B. Transmission horizontale — organiser ce qu'ils vont laisser (conjoint, enfants, proches).
C. Optimisation fiscale — réduire les impôts cette année et les suivantes.

Terminer par une question sur leur priorité personnelle — pas sur une contrainte de l'outil.
Ne jamais mentionner tarif ou Nesso+ ici.

PHASE 3 — APPROFONDISSEMENT :
Selon l'axe choisi, poser les questions nécessaires pour comprendre la situation ET les objectifs. S'adapter à ce qu'on entend. Si une réponse ouvre une piste importante, la suivre. Si quelque chose est déjà réglé, passer.
Couvrir au minimum : les actifs concernés (nature, valeur estimée, localisation), ce qui est déjà en place (testament, donations, AV), les objectifs prioritaires.

PHASE 4 — CLÔTURE :
Vérifier s'il reste des éléments importants. Quand l'utilisateur est prêt, dire EXACTEMENT :
"Parfait, je transmets vos données à notre moteur d'analyse. Votre tableau de bord personnalisé sera prêt dans quelques secondes.

Pour aller plus loin sur les autres axes, Nesso+ vous permettra de les approfondir avec un suivi annuel.

⚠ Pour conserver votre audit, créez un compte gratuit depuis le tableau de bord."

Ajouter \`[AUDIT_COMPLET]\` à la toute fin, une seule fois.`;

const EXTRACTION_PROMPT = `Extrais les données patrimoniales en JSON strict. Réponds UNIQUEMENT le JSON, sans markdown, sans texte avant/après.

PRINCIPE : ne JAMAIS renvoyer null/0/vide pour les champs critiques. Si une info manque, ESTIME le plus probable. Un tableau de bord vide est un échec.

PÉRIMÈTRE PATRIMOINE :
- Si situation_civile = 'marie' ou 'pacse' : 'actifs' = biens du foyer (user + conjoint). JAMAIS les biens des parents/beaux-parents/fratrie.
- Si situation_civile = 'concubin' ou 'celibataire' : 'actifs' = UNIQUEMENT les biens propres de l'utilisateur. Ne jamais consolider avec le patrimoine du partenaire, sauf si la conversation confirme explicitement l'accord des deux parties (question S6 répondue positivement).
- Un héritage attendu n'est PAS un actif actuel. Patrimoine des grands-parents → 'succession.grands_parents_patrimoine_estime'.

{
  "prenom": "prénom user ou 'Vous'",
  "conjoint": "prénom conjoint ou null",
  "enfants_prenoms": [],
  "enfants": 0,
  "age": 45,
  "profession": "Cadre",
  "regime": "communaute|separation|participation|universel — défaut 'communaute' si marié",
  "situation_civile": "marie|pacse|concubin|celibataire",
  "parents_en_vie": true,
  "famille_recomposee": false,

  "focus_principal": "Transmission parentale|Protection du partenaire|Transmission en famille recomposée|Protection des proches & transmission|IFI & optimisation immobilière|Optimisation rémunération & structure|Optimisation fiscale annuelle — focus exact choisi en Phase 2",
  "focus_audit": "succession|optimisation|les_deux — déduit de focus_principal : Transmission* → succession ; Optimisation* → optimisation ; IFI → succession ; Protection* → succession ; mixte → les_deux",

  "succession": {
    "grands_parents_vivants": false,
    "grands_parents_patrimoine_estime": 0,
    "autres_parties_prenantes": [],
    "belle_famille_incluse": false,
    "belle_famille_patrimoine_estime": 0,
    "donations_passees": [{"de": "parent|user", "vers": "user|enfant", "montant": 0, "annee": 2020}],
    "testament_existant": false
  },

  "optimisation": {
    "revenus_annuels_foyer": 0,
    "tmi": "0|11|30|41|45",
    "charges_deductibles": [],
    "dispositifs_en_place": [],
    "regime_renumeration_dirigeant": "salaire|dividendes|mixte|na",
    "quotient_familial_situations": []
  },

  "actifs": [
    {"nom": "description courte", "categorie": "immobilier|financier|professionnel|exotique", "valeur": 250000, "type": "Résidence principale|Résidence secondaire|Bien locatif|Bien étranger|Assurance-vie|PEA|PER|Liquidités|Société|Autre", "pays": "France"}
  ],

  "objectifs": "résumé en 1 phrase",
  "score": 60,
  "alertes": []
}

ESTIMATIONS PAR DÉFAUT (si non précisé) :
- RP : 350 000€ ; Résidence secondaire : 250 000€ ; Bien locatif : 200 000€
- AV : 50 000€ ; PEA : 30 000€ ; PER : 20 000€ ; Liquidités : 15 000€ ; Société : 200 000€
- Âge : 45. Profession : 'Cadre' si patrimoine > 500k€, sinon 'Salarié'.
- Au moins 2 actifs dans 'actifs' (sinon dashboard vide)
- enfants_prenoms : "Enfant 1", "Enfant 2"... si nombre connu mais prénoms manquants

ALERTES OBLIGATOIRES si triggers détectés :
- PACS + pas de testament → "pacs_sans_testament"
- Concubinage → "concubinage"
- Bien à l'étranger → "international"
- Patrimoine immobilier net (RP×0.7 + autres biens immo) > 1 300 000€ → "ifi"
- Libéral médical → "carmf"
- Dirigeant/TNS → "dutreil"
- Famille recomposée → "famille_recomposee"

Mieux vaut une estimation imparfaite qu'un champ vide. Tranche toujours.`;

// Bug #3 : parsing JSON robuste — gère markdown ```json, texte autour, JSON tronqué
// Tracker de coût pour un audit (réinitialisé à chaque nouveau démarrage)
// Tarifs Haiku 4.5 (USD / 1M tokens) — à ajuster si les prix Anthropic changent
const PRICE = { input: 1.0, cacheRead: 0.10, cacheWrite: 1.25, output: 5.0 };
let auditCost = { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, usd: 0, calls: 0 };

const resetAuditCost = () => { auditCost = { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, usd: 0, calls: 0 }; };

const trackCost = (usage, label) => {
  if (!usage) return;
  const cacheRead  = usage.cache_read_input_tokens || 0;
  const cacheWrite = usage.cache_creation_input_tokens || 0;
  const inputNew   = Math.max(0, (usage.input_tokens || 0) - cacheRead - cacheWrite);
  const output     = usage.output_tokens || 0;
  const cost =
    inputNew   * PRICE.input      / 1_000_000 +
    cacheWrite * PRICE.cacheWrite / 1_000_000 +
    cacheRead  * PRICE.cacheRead  / 1_000_000 +
    output     * PRICE.output     / 1_000_000;
  auditCost.input      += inputNew;
  auditCost.cacheRead  += cacheRead;
  auditCost.cacheWrite += cacheWrite;
  auditCost.output     += output;
  auditCost.usd        += cost;
  auditCost.calls      += 1;
  console.log(`[Nesso] ${label} #${auditCost.calls} — input:${inputNew} cache:${cacheRead}r/${cacheWrite}w output:${output} → $${cost.toFixed(5)}`);
};

const logAuditTotal = () => {
  const centimesEur = auditCost.usd * 0.92 * 100;
  console.log(
    `%c[Nesso] 📊 AUDIT TERMINÉ\n` +
    `  Appels API : ${auditCost.calls}\n` +
    `  Input neuf : ${auditCost.input} tokens\n` +
    `  Cache hit : ${auditCost.cacheRead} tokens (économisés)\n` +
    `  Cache write : ${auditCost.cacheWrite} tokens\n` +
    `  Output : ${auditCost.output} tokens\n` +
    `  Coût : $${auditCost.usd.toFixed(4)} ≈ ${centimesEur.toFixed(2)} centimes €`,
    'color:#C9A96E;font-weight:bold;'
  );
};

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
    trackCost(data.usage, 'extraction');
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
    trackCost(data.usage, 'chat');
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
    focus_principal: 'Protection des proches & transmission',
    focus_audit: 'les_deux',
    succession: { grands_parents_vivants: false, grands_parents_patrimoine_estime: 0, autres_parties_prenantes: [], belle_famille_incluse: false, belle_famille_patrimoine_estime: 0, donations_passees: [], testament_existant: false },
    optimisation: { revenus_annuels_foyer: 0, tmi: null, charges_deductibles: [], dispositifs_en_place: [], regime_renumeration_dirigeant: 'na', quotient_familial_situations: [] },
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

    // Nouvelle archi phasée : focus_principal + focus_audit (déduit)
    const VALID_FOCUSES = ['Transmission parentale', 'Protection du partenaire', 'Transmission en famille recomposée', 'Protection des proches & transmission', 'IFI & optimisation immobilière', 'Optimisation rémunération & structure', 'Optimisation fiscale annuelle'];
    if (!VALID_FOCUSES.includes(out.focus_principal)) {
      out.focus_principal = PROFIL_VIDE.focus_principal;
    }
    // Déduire focus_audit depuis focus_principal si absent ou invalide
    if (!['succession', 'optimisation', 'les_deux'].includes(out.focus_audit)) {
      const fp = out.focus_principal || '';
      if (fp.startsWith('Optimisation')) out.focus_audit = 'optimisation';
      else out.focus_audit = 'succession';
    }
    out.succession = {
      grands_parents_vivants: false,
      grands_parents_patrimoine_estime: 0,
      autres_parties_prenantes: [],
      belle_famille_incluse: false,
      belle_famille_patrimoine_estime: 0,
      donations_passees: [],
      testament_existant: false,
      ...(out.succession || {}),
    };
    out.optimisation = {
      revenus_annuels_foyer: 0,
      tmi: null,
      charges_deductibles: [],
      dispositifs_en_place: [],
      regime_renumeration_dirigeant: 'na',
      quotient_familial_situations: [],
      ...(out.optimisation || {}),
    };
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
      // Concubin / célibataire : filtrer les actifs mentionnant le prénom du partenaire
      // (sauf si belle_famille_incluse = true = l'user a demandé la consolidation)
      if (['concubin', 'celibataire'].includes(out.situation_civile) && !out.succession?.belle_famille_incluse && out.conjoint) {
        const partnerName = out.conjoint.trim().split(' ')[0].toLowerCase();
        if (partnerName.length > 2) {
          const partnerRegex = new RegExp(`\\b${partnerName}\\b`, 'i');
          out.actifs = out.actifs.filter(a => !partnerRegex.test(a.nom || ''));
        }
      }
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

    // Cohérence des alertes : retirer 'ifi' si le patrimoine immobilier net
    // du foyer ne dépasse pas le seuil légal (1,3M€). Évite que l'alerte reste
    // stale après filtrage des biens de tiers.
    const patrimoineImmoNet = out.actifs
      .filter(a => a.categorie === 'immobilier')
      .reduce((s, a) => s + (a.valeur || 0) * (a.type === 'Résidence principale' ? 0.70 : 1), 0);
    if (patrimoineImmoNet <= 1300000) {
      out.alertes = out.alertes.filter(a => !a.toLowerCase().includes('ifi'));
    }

    return out;
  };

  const complete = (updatedHistory) => {
    setTimeout(async () => {
      if (isDemoMode) { onComplete(null); return; }
      const userData = await extractUserData(updatedHistory);
      logAuditTotal();
      onComplete(sanitizeUserData(userData));
    }, 1200);
  };

  const saveMessages = (msgs) => {
    try { localStorage.setItem('nesso_messages', JSON.stringify(msgs)); } catch {}
  };

  const start = async () => {
    resetAuditCost();
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
      logAuditTotal();
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
    logAuditTotal();
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
