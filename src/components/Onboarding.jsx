import { useState, useRef, useEffect } from 'react';
import { SYSTEM_PROMPT } from '../prompts/system.js';
import { EXTRACTION_PROMPT } from '../prompts/extraction.js';

// ─── FORMULAIRE DE CADRAGE ───────────────────────────────────────────────────
const FORM_INIT = {
  prenom: '', age: '', profession: 'salarié', niveau: 'intermediaire',
  situation_civile: '', regime: 'communaute', conjoint_prenom: '', conjoint_age: '',
  enfants: '0', enfants_data: [], famille_recomposee: false,
  parents_en_vie: '',      // 'les_deux' | 'pere' | 'mere' | 'non'
  pere_age: '', mere_age: '', parents_orga: '',
  gp_maternels: '',        // 'les_deux' | 'un' | 'non'
  gp_maternels_age: '', gp_maternels_age2: '',
  gp_paternels: '',        // 'les_deux' | 'un' | 'non'
  gp_paternels_age: '', gp_paternels_age2: '',
  patrimoine: '', patrimoine_detail: {}, evenement: '', focus: '',
  // Focus A
  parents_patrimoine: '', parents_compo: [], gp_patrimoine: '', gp_compo: [], donations_recues: '',
  oncles_tantes_maternels: '', oncles_tantes_paternels: '',
  fratrie: '',
  // Focus B
  testament: '', av_existante: '', actifs_type: [],
  // Focus C + global
  statut_pro: '', revenus_foyer: '', revenus_user: '', revenus_conjoint: '', revenus_brut_net: 'net', per_ouvert: '', pea_ouvert: '',
};

const buildContextMessage = (f) => {
  const niveauLabel = { debutant: 'Débutant', intermediaire: 'Intermédiaire', avance: 'Expert' }[f.niveau] || '';
  const situLabel   = { celibataire: 'Célibataire', marie: 'Marié(e)', pacse: 'Pacsé(e)', concubin: 'En couple (concubinage)' }[f.situation_civile] || '';
  const regimeLabel = { communaute: 'communauté légale réduite aux acquêts', separation: 'séparation de biens', universel: 'communauté universelle', participation: 'participation aux acquêts' }[f.regime] || '';
  const hasConjoint = f.situation_civile && f.situation_civile !== 'celibataire' && f.conjoint_prenom;
  const ASSET_LABELS_CTX = {
    rp: 'Résidence principale', locatif: 'Immobilier locatif', av: 'Assurance-vie',
    pea: 'PEA', per: 'PER', liquidites: 'Livrets / Liquidités', financier: 'Autres placements',
    entreprise: 'Entreprise / Parts sociales', exotique: 'Actifs atypiques', etranger: "Bien à l'étranger",
  };
  const focusLabel  = { A: 'A — Ce que je vais recevoir (transmission parentale / grands-parents)', B: 'B — Ce que je vais laisser (protection conjoint et enfants)', C: 'C — Réduire ma fiscalité (optimisation)' }[f.focus] || '';
  const orgaLabel   = { oui: 'Oui', en_partie: 'En partie', non: 'Non', sais_pas: 'Je ne sais pas' }[f.parents_orga] || '';
  const nbEnfants   = parseInt(f.enfants) || 0;

  // Enfants : liste prénoms + âges si renseignés
  const enfantsDetail = (f.enfants_data || []).filter(e => e.prenom || e.age);
  const enfantsDesc = enfantsDetail.length > 0
    ? enfantsDetail.map((e, i) => `${e.prenom || `Enfant ${i+1}`}${e.age ? ` (${e.age} ans)` : ''}`).join(', ')
    : null;

  const lines = [
    'DONNÉES DE CADRAGE — FORMULAIRE NESSO',
    f.prenom
      ? `Prénom : ${f.prenom}${f.age ? `, ${f.age} ans` : ''}${f.profession ? `, ${f.profession}` : ''}`
      : null,
    niveauLabel ? `Niveau de connaissance patrimoniale : ${niveauLabel}` : null,
    situLabel
      ? `Situation civile : ${situLabel}${f.situation_civile === 'marie' && regimeLabel ? ` — régime ${regimeLabel}` : ''}`
      : null,
    f.situation_civile && f.situation_civile !== 'celibataire' && f.conjoint_prenom
      ? `Conjoint(e) / partenaire : ${f.conjoint_prenom}${f.conjoint_age ? `, ${f.conjoint_age} ans` : ''}` : null,
    nbEnfants === 0
      ? 'Enfants : Aucun'
      : `Enfants : ${nbEnfants}${f.famille_recomposee ? ' — famille recomposée' : ''}${enfantsDesc ? ` — ${enfantsDesc}` : ''}`,
    f.parents_en_vie
      ? `Parents en vie : ${{ les_deux: 'Les deux', pere: 'Père uniquement', mere: 'Mère uniquement', non: 'Aucun' }[f.parents_en_vie] || f.parents_en_vie}${f.parents_en_vie !== 'non' && (f.pere_age || f.mere_age) ? ` — ${[f.parents_en_vie !== 'mere' && f.pere_age ? `père ${f.pere_age} ans` : null, f.parents_en_vie !== 'pere' && f.mere_age ? `mère ${f.mere_age} ans` : null].filter(Boolean).join(', ')}` : ''}${f.parents_en_vie !== 'non' && orgaLabel ? ` — transmission organisée : ${orgaLabel}` : ''}`
      : null,
    f.gp_maternels
      ? `Grands-parents maternels : ${{ les_deux: 'Les deux en vie', un: "L'un d'eux en vie", non: 'Aucun' }[f.gp_maternels]}${f.gp_maternels !== 'non' && f.gp_maternels_age ? ` — ${f.gp_maternels_age} ans${f.gp_maternels === 'les_deux' && f.gp_maternels_age2 ? ` / ${f.gp_maternels_age2} ans` : ''}` : ''}`
      : null,
    f.gp_paternels
      ? `Grands-parents paternels : ${{ les_deux: 'Les deux en vie', un: "L'un d'eux en vie", non: 'Aucun' }[f.gp_paternels]}${f.gp_paternels !== 'non' && f.gp_paternels_age ? ` — ${f.gp_paternels_age} ans${f.gp_paternels === 'les_deux' && f.gp_paternels_age2 ? ` / ${f.gp_paternels_age2} ans` : ''}` : ''}`
      : null,
    ...(Object.keys(f.patrimoine_detail || {}).length > 0 ? [
      hasConjoint ? 'Actifs personnels (avec propriété) :' : 'Actifs personnels :',
      ...Object.entries(f.patrimoine_detail || {}).flatMap(([key, items]) =>
        (items || []).map((item, idx) => {
          const valStr = item?.valeur ? `${parseInt(item.valeur).toLocaleString('fr-FR')} €` : 'montant à préciser';
          const propStr = hasConjoint && item?.proprio
            ? (item.proprio === 'user'      ? ' — à vous seul(e)'
               : item.proprio === 'conjoint' ? ` — à ${f.conjoint_prenom} uniquement`
               : ' — aux deux en commun')
            : '';
          const suffix = items.length > 1 ? ` (${idx + 1})` : '';
          const nomStr = key === 'exotique' && item?.nom ? ` "${item.nom}"` : '';
          return `  → ${ASSET_LABELS_CTX[key] || key}${suffix}${nomStr} : ${valStr}${propStr}`;
        })
      ),
    ] : []),
    (f.revenus_user || f.revenus_conjoint) ? (() => {
      const brutNet = f.revenus_brut_net || 'net';
      const u = parseInt(f.revenus_user) || 0;
      const c = parseInt(f.revenus_conjoint) || 0;
      const total = u + c;
      const detail = u && c
        ? ` (vous : ${u.toLocaleString('fr-FR')} €${f.conjoint_prenom ? `, ${f.conjoint_prenom} : ${c.toLocaleString('fr-FR')} €` : `, conjoint : ${c.toLocaleString('fr-FR')} €`})`
        : '';
      return `Revenus annuels du foyer (${brutNet}) : ${total.toLocaleString('fr-FR')} €${detail}`;
    })() : f.revenus_foyer ? `Revenus annuels du foyer : ${parseInt(f.revenus_foyer).toLocaleString('fr-FR')} €` : null,
    f.evenement?.trim() ? `Événement de vie : ${f.evenement}` : null,
    focusLabel ? `Focus choisi : ${focusLabel}` : null,
    // Focus A
    f.focus === 'A' && f.parents_patrimoine ? `Patrimoine parents estimé : ${parseInt(f.parents_patrimoine).toLocaleString('fr-FR')} €` : null,
    f.focus === 'A' && f.parents_compo?.length > 0 ? `Composition patrimoine parents : ${f.parents_compo.map(c => ({ rp: 'Résidence principale', locatif: 'Immobilier locatif', financier: 'Épargne / Placements', entreprise: 'Entreprise', etranger: "Bien à l'étranger" })[c] || c).join(', ')}` : null,
    f.focus === 'A' && f.gp_patrimoine ? `Patrimoine grands-parents estimé : ${parseInt(f.gp_patrimoine).toLocaleString('fr-FR')} €` : null,
    f.focus === 'A' && f.gp_compo?.length > 0 ? `Composition patrimoine grands-parents : ${f.gp_compo.map(c => ({ rp: 'Résidence principale', locatif: 'Immobilier locatif', financier: 'Épargne / Placements', entreprise: 'Entreprise', etranger: "Bien à l'étranger" })[c] || c).join(', ')}` : null,
    f.focus === 'A' && f.donations_recues ? `Donations déjà reçues : ${{ oui: 'Oui', non: 'Non', sais_pas: 'Je ne sais pas' }[f.donations_recues] || f.donations_recues}` : null,
    f.focus === 'A' && f.oncles_tantes_maternels ? `Oncles/tantes côté maternel : ${f.oncles_tantes_maternels}` : null,
    f.focus === 'A' && f.oncles_tantes_paternels ? `Oncles/tantes côté paternel : ${f.oncles_tantes_paternels}` : null,
    f.focus === 'A' && f.fratrie !== '' ? `Frères et sœurs de l'utilisateur : ${f.fratrie === '0' ? 'Aucun' : f.fratrie}` : null,
    // Focus B
    f.focus === 'B' && f.testament ? `Testament existant : ${{ oui: 'Oui', non: 'Non', sais_pas: 'Je ne sais pas' }[f.testament] || f.testament}` : null,
    f.focus === 'B' && f.av_existante ? `Assurance-vie : ${{ oui: 'Oui — bénéficiaires à jour', oui_maj: 'Oui — à mettre à jour', non: 'Non' }[f.av_existante] || f.av_existante}` : null,
    f.focus === 'B' && f.actifs_type?.length > 0 ? `Types d'actifs principaux : ${f.actifs_type.map(t => ({ rp: 'Résidence principale', locatif: 'Immobilier locatif', av: 'Assurance-vie', pea: 'PEA', per: 'PER', liquidites: 'Liquidités / Épargne', entreprise: 'Entreprise', etranger: "Bien à l'étranger" })[t] || t).join(', ')}` : null,
    // Focus C
    f.focus === 'C' && f.statut_pro ? `Statut professionnel : ${{ salarie: 'Salarié', tns: 'TNS / indépendant', dirigeant: 'Dirigeant de société', retraite: 'Retraité' }[f.statut_pro] || f.statut_pro}` : null,
    f.focus === 'C' && f.per_ouvert ? `PER ouvert : ${{ oui: 'Oui', non: 'Non' }[f.per_ouvert]}` : null,
    f.focus === 'C' && f.pea_ouvert ? `PEA ouvert : ${{ oui: 'Oui', non: 'Non' }[f.pea_ouvert]}` : null,
  ].filter(Boolean);

  return lines.join('\n');
};
// ─────────────────────────────────────────────────────────────────────────────

// Bug #3 : parsing JSON robuste — gère markdown ```json, texte autour, JSON tronqué
// Tracker de coût pour un audit (réinitialisé à chaque nouveau démarrage)
// Tarifs Sonnet 4.5 (USD / 1M tokens) — conversation + extraction
const PRICE = { input: 3.0, cacheRead: 0.30, cacheWrite: 3.75, output: 15.0 };
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
          // Strip les propriétés internes (hidden, etc.) — l'API n'accepte que role + content
          ...history.slice(-20).map(m => ({ role: m.role, content: m.content })),
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

export default function Onboarding({ onComplete, onLogin, onRetourDashboard }) {
  // auditPhase : 'landing' | 'form' | 'chat'
  const [auditPhase, setAuditPhase] = useState('landing');
  const [form, setForm]             = useState(FORM_INIT);
  const [formStep, setFormStep]     = useState(1);
  const [messages, setMessages]     = useState([]);
  const [input, setInput]           = useState('');
  const [loading, setLoading]       = useState(false);
  const [updating, setUpdating]     = useState(false);
  const [msgCount, setMsgCount]     = useState(0);
  const endRef = useRef(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const callApi = async (history) => {
    const res = await fetch('/anthropic/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5',
        max_tokens: 1024,
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

  const getReply = async (history) => callApi(history);

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
    // Normaliser : trim + correspondance insensible à la casse avant de valider
    const trimmedFocus = (out.focus_principal || '').trim();
    const matchedFocus = VALID_FOCUSES.find(f => f.toLowerCase() === trimmedFocus.toLowerCase());
    if (matchedFocus) {
      out.focus_principal = matchedFocus; // normalise la casse/espaces
    } else {
      out.focus_principal = PROFIL_VIDE.focus_principal;
    }
    // Déduire focus_audit depuis focus_principal si absent ou invalide
    if (!['succession', 'optimisation', 'les_deux'].includes(out.focus_audit)) {
      const fp = out.focus_principal || '';
      if (fp.startsWith('Optimisation')) out.focus_audit = 'optimisation';
      else out.focus_audit = 'succession';
    }
    out.famille = {
      mere_prenom: null,
      pere_prenom: null,
      parents_en_vie: out.parents_en_vie ?? true,
      nb_parents_en_vie: 1,
      pere_age: null,
      mere_age: null,
      gp_maternels_vivants: false,
      gp_maternels_age: null,
      gp_paternels_vivants: false,
      gp_paternels_age: null,
      fratrie: [],
      autres: [],
      patrimoine_parents_estime: 0,
      patrimoine_gp_estime: 0,
      gp_transmission_organisee: false,
      gp_leviers_identifies: [],
      ...(out.famille || {}),
    };
    // Dériver nb_parents_en_vie si Haiku n'a pas rempli le champ
    // IMPORTANT : utiliser == null (pas !) pour ne pas écraser la valeur 0 (deux parents décédés)
    if (out.famille.nb_parents_en_vie == null) {
      const hasMere = !!out.famille.mere_prenom;
      const hasPere = !!out.famille.pere_prenom;
      out.famille.nb_parents_en_vie = (hasMere && hasPere) ? 2 : (hasMere || hasPere || out.parents_en_vie) ? 1 : 0;
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
        // sci_immo_ratio : défaut 0.9 si SCI sans ratio précisé (quasi-exclusivement immobilière)
        sci_immo_ratio: a.categorie === 'sci'
          ? (typeof a.sci_immo_ratio === 'number' ? a.sci_immo_ratio : 0.9)
          : undefined,
        // Clause bénéficiaire AV — uniquement pour les contrats AV
        av_clause: a.type === 'Assurance-vie'
          ? (a.av_clause || 'inconnue')
          : undefined,
        // Garantit que chaque actif a un tableau proprietaires valide
        // Défaut : ['user'] (l'extraction peut ne pas toujours fournir ce champ)
        proprietaires: Array.isArray(a.proprietaires) && a.proprietaires.length > 0
          ? a.proprietaires
          : ['user'],
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
    setAuditPhase('chat');
    setLoading(true);
    const init = [{ role: 'user', content: 'Bonjour, je voudrais faire le point sur mon patrimoine familial.' }];
    try {
      const reply = await getReply(init);
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

  // Démarre le chat après remplissage du formulaire
  // Le message de contexte est injecté en "hidden" : présent dans l'historique API mais pas affiché dans l'UI
  const startWithForm = async (f) => {
    resetAuditCost();
    const contextMsg = buildContextMessage(f);
    const hiddenMsg  = { role: 'user', content: contextMsg, hidden: true };
    setAuditPhase('chat');
    setLoading(true);
    try {
      const reply = await getReply([hiddenMsg]);
      const msgs = [hiddenMsg, { role: 'assistant', content: reply }];
      setMessages(msgs);
      saveMessages(msgs);
      setMsgCount(1);
    } catch {
      const greeting = f.prenom ? `Bonjour ${f.prenom} !` : 'Bonjour !';
      const msgs = [hiddenMsg, { role: 'assistant', content: `${greeting} Merci pour ces informations. Commençons directement.` }];
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
      const rawReply = await getReply(history);
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
    const userData = await extractUserData(messages);
    logAuditTotal();
    onComplete(sanitizeUserData(userData));
    setUpdating(false);
  };

  const handleNouvelleConversation = () => {
    localStorage.removeItem('nesso_messages');
    setMessages([]);
    setMsgCount(0);
    setForm(FORM_INIT);
    setFormStep(1);
    setAuditPhase('landing');
  };

  const handlePasserDashboard = () => { onComplete(null); };

  // Charger la conversation sauvegardée dans le chat
  const handleContinuerConversation = () => {
    const saved = getSavedMessages();
    if (saved) {
      setMessages(saved);
      setMsgCount(saved.filter(m => m.role === 'user').length);
      setAuditPhase('chat');
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

  // Helpers formulaire
  const totalSteps = 6; // étape 4 = actifs, étape 6 = sous-formulaire par focus
  const stepTitles = ['Vous', 'Votre famille', 'Votre situation', 'Vos actifs', 'Votre priorité', { A: 'La transmission à recevoir', B: 'Ce que vous transmettrez', C: 'Votre situation fiscale' }[form.focus] || 'Précisions'];
  const canAdvance = () => {
    if (formStep === 1) return form.prenom.trim().length > 0;
    if (formStep === 2) return form.situation_civile !== '';
    if (formStep === 5) return form.focus !== '';
    return true;
  };

  return (
    <div style={{ minHeight: '100vh', background: '#F5F0EA', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: auditPhase === 'chat' ? 'center' : 'flex-start', padding: auditPhase === 'chat' ? 24 : '60px 24px' }}>
      <div style={{ maxWidth: 720, width: '100%' }}>

        {auditPhase !== 'chat' && (
          <div style={{ textAlign: 'center', marginBottom: 36 }}>
            <h1 className="font-serif" style={{ color: '#C9A96E', fontSize: 42, fontWeight: 700, margin: '0 0 8px' }}>Nesso</h1>
            <p style={{ color: '#1B2B4B', fontSize: 17, margin: 0, lineHeight: 1.5 }}>La solution IA pour gérer le patrimoine et la succession de ta famille</p>
          </div>
        )}

        {/* ── BRANCHE 1 : LANDING ── */}
        {auditPhase === 'landing' && (
          <>
          <div className="card" style={{ padding: 40, textAlign: 'center' }}>
            <div style={{ width: 60, height: 60, borderRadius: '50%', background: '#1B2B4B', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 22px', color: '#C9A96E', fontSize: 26 }}>✦</div>
            <h2 className="font-serif" style={{ color: '#1B2B4B', fontSize: 26, margin: '0 0 12px' }}>Votre audit patrimonial</h2>
            <p style={{ color: '#6B7280', lineHeight: 1.75, marginBottom: 28, fontSize: 15 }}>
              Quelques questions pour construire votre tableau de bord personnalisé. <strong>5 à 15 minutes</strong> selon votre situation.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>

              {hasSavedConversation && (
                <>
                  <button onClick={handleContinuerConversation} disabled={loading}
                    style={{ width: '100%', padding: '13px', fontSize: 14, background: '#C9A96E', color: 'white', border: 'none', borderRadius: 10, cursor: loading ? 'wait' : 'pointer', fontFamily: 'DM Sans, sans-serif', fontWeight: 600 }}>
                    ↺ Continuer ma conversation en cours →
                  </button>
                  <button onClick={handleReprendreConversation} disabled={loading}
                    style={{ width: '100%', padding: '11px', fontSize: 13, background: 'white', color: '#1B2B4B', border: '1px solid #E5E7EB', borderRadius: 10, cursor: loading ? 'wait' : 'pointer', fontFamily: 'DM Sans, sans-serif' }}>
                    {loading ? '⏳ Génération...' : '📊 Générer mon tableau depuis la dernière conversation'}
                  </button>
                </>
              )}
              <button className="btn-navy" onClick={() => { setForm(FORM_INIT); setFormStep(1); setAuditPhase('form'); }} style={{ width: '100%', padding: '14px', fontSize: 15 }}>
                {hasSavedConversation ? 'Recommencer un nouvel audit →' : 'Commencer l\'audit →'}
              </button>
              {/* ── Reprendre le tableau existant (user authentifié avec données sauvegardées) ── */}
              {onRetourDashboard && (
                <button onClick={onRetourDashboard} disabled={loading}
                  style={{ width: '100%', padding: '13px', fontSize: 14, background: 'white', color: '#1B2B4B', border: '1px solid #E5E7EB', borderRadius: 10, cursor: loading ? 'wait' : 'pointer', fontFamily: 'DM Sans, sans-serif', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                  {loading ? '⏳ Chargement…' : '✦ Reprendre mon tableau de bord →'}
                </button>
              )}
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
        )}

        {/* ── BRANCHE 2 : FORMULAIRE ── */}
        {auditPhase === 'form' && (
          <div className="card" style={{ padding: '36px 32px' }}>
            {/* En-tête + barre de progression */}
            <div style={{ marginBottom: 28 }}>
              <p style={{ color: '#C9A96E', fontSize: 11, fontWeight: 600, letterSpacing: '0.15em', textTransform: 'uppercase', margin: '0 0 5px' }}>
                Étape {formStep} sur {totalSteps}
              </p>
              <h2 className="font-serif" style={{ color: '#1B2B4B', fontSize: 24, margin: '0 0 14px' }}>
                {stepTitles[formStep - 1]}
              </h2>
              <div style={{ display: 'flex', gap: 4 }}>
                {Array.from({ length: totalSteps }).map((_, i) => (
                  <div key={i} style={{ flex: 1, height: 3, borderRadius: 2, background: i < formStep ? '#C9A96E' : '#E5E7EB', transition: 'background 0.3s' }} />
                ))}
              </div>
            </div>

            {/* ── Étape 1 : Vous ── */}
            {formStep === 1 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                <div>
                  <label style={{ color: '#6B7280', fontSize: 13, display: 'block', marginBottom: 6 }}>Votre prénom *</label>
                  <input type="text" value={form.prenom} autoFocus
                    onChange={e => setForm(p => ({ ...p, prenom: e.target.value }))}
                    placeholder="Thomas"
                    style={{ width: '100%', border: '1px solid #E5E7EB', borderRadius: 8, padding: '10px 14px', fontSize: 14, fontFamily: 'DM Sans, sans-serif', boxSizing: 'border-box' }} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={{ color: '#6B7280', fontSize: 13, display: 'block', marginBottom: 6 }}>Votre âge</label>
                    <input type="number" value={form.age} min="18" max="100"
                      onChange={e => setForm(p => ({ ...p, age: e.target.value }))}
                      placeholder="38"
                      style={{ width: '100%', border: '1px solid #E5E7EB', borderRadius: 8, padding: '10px 14px', fontSize: 14, fontFamily: 'DM Sans, sans-serif', boxSizing: 'border-box' }} />
                  </div>
                  <div>
                    <label style={{ color: '#6B7280', fontSize: 13, display: 'block', marginBottom: 6 }}>Votre statut</label>
                    <select value={form.profession} onChange={e => setForm(p => ({ ...p, profession: e.target.value }))}
                      style={{ width: '100%', border: '1px solid #E5E7EB', borderRadius: 8, padding: '10px 14px', fontSize: 14, fontFamily: 'DM Sans, sans-serif', boxSizing: 'border-box' }}>
                      <option value="salarié">Salarié(e)</option>
                      <option value="cadre">Cadre</option>
                      <option value="dirigeant">Dirigeant / TNS</option>
                      <option value="libéral">Profession libérale</option>
                      <option value="retraité">Retraité(e)</option>
                      <option value="autre">Autre</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label style={{ color: '#6B7280', fontSize: 13, display: 'block', marginBottom: 10 }}>Niveau de connaissance patrimoniale</label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {[['debutant', 'Débutant'], ['intermediaire', 'Intermédiaire'], ['avance', 'Expert']].map(([val, lbl]) => (
                      <button key={val} onClick={() => setForm(p => ({ ...p, niveau: val }))}
                        style={{ flex: 1, padding: '10px 6px', border: `2px solid ${form.niveau === val ? '#C9A96E' : '#E5E7EB'}`, borderRadius: 8, background: form.niveau === val ? '#FDF8F0' : 'white', color: form.niveau === val ? '#C9A96E' : '#6B7280', cursor: 'pointer', fontSize: 13, fontWeight: form.niveau === val ? 600 : 400, fontFamily: 'DM Sans, sans-serif', transition: 'all 0.15s' }}>
                        {lbl}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ── Étape 2 : Famille ── */}
            {formStep === 2 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                <div>
                  <label style={{ color: '#6B7280', fontSize: 13, display: 'block', marginBottom: 10 }}>Situation civile *</label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    {[['celibataire', 'Célibataire', '◯'], ['marie', 'Marié(e)', '◎'], ['pacse', 'Pacsé(e)', '◑'], ['concubin', 'En couple', '◐']].map(([val, lbl, ico]) => (
                      <button key={val} onClick={() => setForm(p => ({ ...p, situation_civile: val }))}
                        style={{ padding: '12px 8px', border: `2px solid ${form.situation_civile === val ? '#1B2B4B' : '#E5E7EB'}`, borderRadius: 10, background: form.situation_civile === val ? '#F0F4FF' : 'white', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', transition: 'all 0.15s' }}>
                        <div style={{ fontSize: 18, marginBottom: 4, color: '#1B2B4B' }}>{ico}</div>
                        <div style={{ fontSize: 13, fontWeight: form.situation_civile === val ? 600 : 400, color: form.situation_civile === val ? '#1B2B4B' : '#6B7280' }}>{lbl}</div>
                      </button>
                    ))}
                  </div>
                </div>
                {form.situation_civile === 'marie' && (
                  <div>
                    <label style={{ color: '#6B7280', fontSize: 13, display: 'block', marginBottom: 6 }}>Régime matrimonial</label>
                    <select value={form.regime} onChange={e => setForm(p => ({ ...p, regime: e.target.value }))}
                      style={{ width: '100%', border: '1px solid #E5E7EB', borderRadius: 8, padding: '10px 14px', fontSize: 14, fontFamily: 'DM Sans, sans-serif', boxSizing: 'border-box' }}>
                      <option value="communaute">Communauté légale (par défaut)</option>
                      <option value="separation">Séparation de biens</option>
                      <option value="universel">Communauté universelle</option>
                      <option value="participation">Participation aux acquêts</option>
                    </select>
                  </div>
                )}
                {form.situation_civile && form.situation_civile !== 'celibataire' && (
                  <div>
                    <label style={{ color: '#6B7280', fontSize: 13, display: 'block', marginBottom: 6 }}>
                      {form.situation_civile === 'marie' ? 'Conjoint(e)' : form.situation_civile === 'pacse' ? 'Partenaire' : 'Compagnon / Compagne'}
                    </label>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <input type="text" value={form.conjoint_prenom}
                        onChange={e => setForm(p => ({ ...p, conjoint_prenom: e.target.value }))}
                        placeholder="Prénom"
                        style={{ flex: 2, border: '1px solid #E5E7EB', borderRadius: 8, padding: '10px 14px', fontSize: 14, fontFamily: 'DM Sans, sans-serif' }} />
                      <input type="number" value={form.conjoint_age || ''} min="18" max="100"
                        onChange={e => setForm(p => ({ ...p, conjoint_age: e.target.value }))}
                        placeholder="Âge"
                        style={{ flex: 1, border: '1px solid #E5E7EB', borderRadius: 8, padding: '10px 14px', fontSize: 14, fontFamily: 'DM Sans, sans-serif' }} />
                    </div>
                  </div>
                )}
                <div>
                  <label style={{ color: '#6B7280', fontSize: 13, display: 'block', marginBottom: 10 }}>Enfants</label>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {['0','1','2','3','4+'].map(n => (
                      <button key={n} onClick={() => setForm(p => ({ ...p, enfants: n }))}
                        style={{ flex: 1, padding: '10px 4px', border: `2px solid ${form.enfants === n ? '#C9A96E' : '#E5E7EB'}`, borderRadius: 8, background: form.enfants === n ? '#FDF8F0' : 'white', color: form.enfants === n ? '#C9A96E' : '#6B7280', cursor: 'pointer', fontSize: 14, fontWeight: form.enfants === n ? 700 : 400, fontFamily: 'DM Sans, sans-serif', transition: 'all 0.15s' }}>
                        {n}
                      </button>
                    ))}
                  </div>
                </div>
                {parseInt(form.enfants) > 0 && (
                  <div>
                    <label style={{ color: '#6B7280', fontSize: 13, display: 'block', marginBottom: 8 }}>Prénoms et âges des enfants <span style={{ color: '#A8A8B8' }}>(optionnel)</span></label>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {Array.from({ length: Math.min(form.enfants === '4+' ? 4 : parseInt(form.enfants), 4) }).map((_, i) => (
                        <div key={i} style={{ display: 'flex', gap: 8 }}>
                          <input type="text" placeholder={`Enfant ${i + 1} — prénom`} value={form.enfants_data[i]?.prenom || ''}
                            onChange={e => { const d = [...(form.enfants_data || [])]; d[i] = { ...(d[i] || {}), prenom: e.target.value }; setForm(p => ({ ...p, enfants_data: d })); }}
                            style={{ flex: 2, border: '1px solid #E5E7EB', borderRadius: 8, padding: '9px 12px', fontSize: 13, fontFamily: 'DM Sans, sans-serif' }} />
                          <input type="number" placeholder="Âge" min="0" max="60" value={form.enfants_data[i]?.age || ''}
                            onChange={e => { const d = [...(form.enfants_data || [])]; d[i] = { ...(d[i] || {}), age: e.target.value }; setForm(p => ({ ...p, enfants_data: d })); }}
                            style={{ flex: 1, border: '1px solid #E5E7EB', borderRadius: 8, padding: '9px 12px', fontSize: 13, fontFamily: 'DM Sans, sans-serif' }} />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {parseInt(form.enfants) > 0 && form.situation_civile && form.situation_civile !== 'celibataire' && (
                  <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                    <input type="checkbox" checked={form.famille_recomposee}
                      onChange={e => setForm(p => ({ ...p, famille_recomposee: e.target.checked }))}
                      style={{ width: 16, height: 16, accentColor: '#1B2B4B' }} />
                    <span style={{ color: '#6B7280', fontSize: 13 }}>Famille recomposée (enfants d'une union précédente)</span>
                  </label>
                )}
              </div>
            )}

            {/* ── Étape 3 : Situation ── */}
            {formStep === 3 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                {/* Parents */}
                <div>
                  <label style={{ color: '#6B7280', fontSize: 13, display: 'block', marginBottom: 10 }}>Vos parents</label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    {[['les_deux','Les deux en vie'],['pere','Père uniquement'],['mere','Mère uniquement'],['non','Aucun']].map(([val, lbl]) => (
                      <button key={val} onClick={() => setForm(p => ({ ...p, parents_en_vie: val }))}
                        style={{ padding: '11px 8px', border: `2px solid ${form.parents_en_vie === val ? '#1B2B4B' : '#E5E7EB'}`, borderRadius: 8, background: form.parents_en_vie === val ? '#F0F4FF' : 'white', color: form.parents_en_vie === val ? '#1B2B4B' : '#6B7280', cursor: 'pointer', fontSize: 13, fontWeight: form.parents_en_vie === val ? 600 : 400, fontFamily: 'DM Sans, sans-serif', transition: 'all 0.15s' }}>
                        {lbl}
                      </button>
                    ))}
                  </div>
                </div>
                {form.parents_en_vie && form.parents_en_vie !== 'non' && (
                  <>
                    <div style={{ display: 'flex', gap: 10 }}>
                      {(form.parents_en_vie === 'les_deux' || form.parents_en_vie === 'pere') && (
                        <div style={{ flex: 1 }}>
                          <label style={{ color: '#A8A8B8', fontSize: 12, display: 'block', marginBottom: 6 }}>Âge du père</label>
                          <input type="number" min="40" max="110" placeholder="ex. 72"
                            value={form.pere_age}
                            onChange={e => setForm(p => ({ ...p, pere_age: e.target.value }))}
                            style={{ width: '100%', border: '1px solid #E5E7EB', borderRadius: 8, padding: '9px 12px', fontSize: 14, fontFamily: 'DM Sans, sans-serif', boxSizing: 'border-box' }} />
                        </div>
                      )}
                      {(form.parents_en_vie === 'les_deux' || form.parents_en_vie === 'mere') && (
                        <div style={{ flex: 1 }}>
                          <label style={{ color: '#A8A8B8', fontSize: 12, display: 'block', marginBottom: 6 }}>Âge de la mère</label>
                          <input type="number" min="40" max="110" placeholder="ex. 68"
                            value={form.mere_age}
                            onChange={e => setForm(p => ({ ...p, mere_age: e.target.value }))}
                            style={{ width: '100%', border: '1px solid #E5E7EB', borderRadius: 8, padding: '9px 12px', fontSize: 14, fontFamily: 'DM Sans, sans-serif', boxSizing: 'border-box' }} />
                        </div>
                      )}
                    </div>
                    <div>
                      <label style={{ color: '#6B7280', fontSize: 13, display: 'block', marginBottom: 8 }}>Ont-ils organisé leur transmission ?</label>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                        {[['oui','Oui'],['en_partie','En partie'],['non','Non'],['sais_pas','Je ne sais pas']].map(([val, lbl]) => (
                          <button key={val} onClick={() => setForm(p => ({ ...p, parents_orga: val }))}
                            style={{ padding: '10px', border: `2px solid ${form.parents_orga === val ? '#C9A96E' : '#E5E7EB'}`, borderRadius: 8, background: form.parents_orga === val ? '#FDF8F0' : 'white', color: form.parents_orga === val ? '#C9A96E' : '#6B7280', cursor: 'pointer', fontSize: 13, fontWeight: form.parents_orga === val ? 600 : 400, fontFamily: 'DM Sans, sans-serif', transition: 'all 0.15s' }}>
                            {lbl}
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                )}
                {/* Grands-parents — deux lignes séparées */}
                {[
                  ['gp_maternels','gp_maternels_age','gp_maternels_age2','Grands-parents maternels'],
                  ['gp_paternels','gp_paternels_age','gp_paternels_age2','Grands-parents paternels'],
                ].map(([field, age1Field, age2Field, label]) => (
                  <div key={field}>
                    <label style={{ color: '#6B7280', fontSize: 13, display: 'block', marginBottom: 8 }}>{label}</label>
                    <div style={{ display: 'flex', gap: 8, marginBottom: form[field] && form[field] !== 'non' ? 10 : 0 }}>
                      {[['les_deux','Les deux'],['un',"L'un d'eux"],['non','Aucun']].map(([val, lbl]) => (
                        <button key={val} onClick={() => setForm(p => ({ ...p, [field]: val }))}
                          style={{ flex: 1, padding: '10px 4px', border: `2px solid ${form[field] === val ? '#1B2B4B' : '#E5E7EB'}`, borderRadius: 8, background: form[field] === val ? '#F0F4FF' : 'white', color: form[field] === val ? '#1B2B4B' : '#6B7280', cursor: 'pointer', fontSize: 13, fontWeight: form[field] === val ? 600 : 400, fontFamily: 'DM Sans, sans-serif', transition: 'all 0.15s' }}>
                          {lbl}
                        </button>
                      ))}
                    </div>
                    {form[field] && form[field] !== 'non' && (
                      <div style={{ display: 'flex', gap: 10 }}>
                        <div style={{ flex: 1 }}>
                          <label style={{ color: '#A8A8B8', fontSize: 12, display: 'block', marginBottom: 4 }}>
                            {form[field] === 'les_deux' ? '1er grand-parent' : 'Âge'}
                          </label>
                          <input type="number" min="50" max="115" placeholder="ex. 78"
                            value={form[age1Field]}
                            onChange={e => setForm(p => ({ ...p, [age1Field]: e.target.value }))}
                            style={{ width: '100%', border: '1px solid #E5E7EB', borderRadius: 8, padding: '9px 12px', fontSize: 14, fontFamily: 'DM Sans, sans-serif', boxSizing: 'border-box' }} />
                        </div>
                        {form[field] === 'les_deux' && (
                          <div style={{ flex: 1 }}>
                            <label style={{ color: '#A8A8B8', fontSize: 12, display: 'block', marginBottom: 4 }}>2e grand-parent</label>
                            <input type="number" min="50" max="115" placeholder="ex. 75"
                              value={form[age2Field]}
                              onChange={e => setForm(p => ({ ...p, [age2Field]: e.target.value }))}
                              style={{ width: '100%', border: '1px solid #E5E7EB', borderRadius: 8, padding: '9px 12px', fontSize: 14, fontFamily: 'DM Sans, sans-serif', boxSizing: 'border-box' }} />
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
                {/* Événement */}
                <div>
                  <label style={{ color: '#6B7280', fontSize: 13, display: 'block', marginBottom: 6 }}>
                    Un événement de vie en cours ou à venir ? <span style={{ color: '#A8A8B8' }}>(optionnel)</span>
                  </label>
                  <input type="text" value={form.evenement}
                    onChange={e => setForm(p => ({ ...p, evenement: e.target.value }))}
                    placeholder="Retraite, héritage, vente, achat, divorce, naissance…"
                    style={{ width: '100%', border: '1px solid #E5E7EB', borderRadius: 8, padding: '10px 14px', fontSize: 14, fontFamily: 'DM Sans, sans-serif', boxSizing: 'border-box' }} />
                </div>
              </div>
            )}

            {/* ── Étape 4 : Vos actifs ── */}
            {formStep === 4 && (() => {
              const hasConj = form.situation_civile && form.situation_civile !== 'celibataire' && form.conjoint_prenom;
              const ASSET_TYPES = [
                { key: 'rp',         label: '🏠 Résidence principale',                                              placeholder: 'ex : 350 000', single: true },
                { key: 'locatif',    label: '🏢 Immobilier locatif',                                                placeholder: 'ex : 200 000' },
                { key: 'av',         label: '💼 Assurance-vie',                                                     placeholder: 'ex : 80 000' },
                { key: 'pea',        label: '📈 PEA',                                                               placeholder: 'ex : 30 000' },
                { key: 'per',        label: '🏦 PER (Plan Épargne Retraite)',                                        placeholder: 'ex : 20 000' },
                { key: 'liquidites', label: '💵 Livrets / Liquidités',                                              placeholder: 'ex : 15 000' },
                { key: 'financier',  label: '📊 Autres placements (CTO, SCPI…)',                                    placeholder: 'ex : 50 000' },
                { key: 'entreprise', label: '⚙ Entreprise / Parts sociales',                                        placeholder: 'ex : 200 000' },
                { key: 'exotique',   label: '💎 Actifs atypiques (art, montres, crypto, cartes, objets de valeur…)', placeholder: 'ex : 10 000' },
                { key: 'etranger',   label: "🌍 Bien à l'étranger",                                                 placeholder: 'ex : 150 000' },
              ];
              const ASSET_ADD_LABEL = {
                locatif: 'un bien locatif', av: 'une assurance-vie', pea: 'un PEA',
                per: 'un PER', liquidites: 'un livret / compte', financier: 'un placement',
                entreprise: 'une société / participation', exotique: 'un actif atypique',
                etranger: "un bien à l'étranger",
              };
              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <p style={{ color: '#7A7A8C', fontSize: 14, margin: 0, lineHeight: 1.6 }}>
                    Sélectionnez vos actifs et renseignez un montant estimé. Tout est optionnel — même une approximation aide à calibrer votre tableau de bord.
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {ASSET_TYPES.map(({ key, label, placeholder, single }) => {
                      const items = (form.patrimoine_detail || {})[key] || [];
                      const active = items.length > 0;
                      return (
                        <div key={key}>
                          <button onClick={() => setForm(p => {
                            const d = { ...(p.patrimoine_detail || {}) };
                            if (d[key] && d[key].length > 0) delete d[key];
                            else d[key] = [{ valeur: '', proprio: '' }];
                            return { ...p, patrimoine_detail: d };
                          })} style={{ width: '100%', padding: '10px 14px', border: `2px solid ${active ? '#1B2B4B' : '#E5E7EB'}`, borderRadius: active ? '8px 8px 0 0' : 8, background: active ? '#F0F4FF' : 'white', color: active ? '#1B2B4B' : '#6B7280', cursor: 'pointer', fontSize: 13, fontWeight: active ? 600 : 400, fontFamily: 'DM Sans, sans-serif', textAlign: 'left', transition: 'all 0.15s', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            {label} {active && <span style={{ color: '#C9A96E' }}>✓</span>}
                          </button>
                          {active && (
                            <div style={{ border: '2px solid #1B2B4B', borderTop: 'none', borderRadius: '0 0 8px 8px', padding: '10px 12px', background: '#F8FAFF', display: 'flex', flexDirection: 'column', gap: 10 }}>
                              {items.map((item, idx) => (
                                <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: 6, paddingTop: idx > 0 ? 8 : 0, borderTop: idx > 0 ? '1px solid #E5E7EB' : 'none' }}>
                                  {items.length > 1 && (
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                      <span style={{ color: '#A8A8B8', fontSize: 12 }}>N° {idx + 1}</span>
                                      <button onClick={() => setForm(p => {
                                        const d = { ...(p.patrimoine_detail || {}) };
                                        const newItems = d[key].filter((_, i) => i !== idx);
                                        if (newItems.length === 0) delete d[key]; else d[key] = newItems;
                                        return { ...p, patrimoine_detail: d };
                                      })} style={{ background: 'none', border: 'none', color: '#E24B4A', cursor: 'pointer', fontSize: 12, padding: '2px 4px', fontFamily: 'DM Sans, sans-serif' }}>
                                        × supprimer
                                      </button>
                                    </div>
                                  )}
                                  {key === 'exotique' && (
                                    <input type="text" placeholder="Nom de l'actif (ex : Montre Rolex, Tableau, Crypto…)" value={item.nom || ''}
                                      onChange={e => setForm(p => {
                                        const d = { ...(p.patrimoine_detail || {}) };
                                        d[key] = d[key].map((it, i) => i === idx ? { ...it, nom: e.target.value } : it);
                                        return { ...p, patrimoine_detail: d };
                                      })}
                                      style={{ width: '100%', border: '1px solid #E5E7EB', borderRadius: 6, padding: '8px 12px', fontSize: 13, fontFamily: 'DM Sans, sans-serif', boxSizing: 'border-box' }} />
                                  )}
                                  <input type="number" placeholder={`Montant estimé (€) — ${placeholder}`} value={item.valeur || ''}
                                    onChange={e => setForm(p => {
                                      const d = { ...(p.patrimoine_detail || {}) };
                                      d[key] = d[key].map((it, i) => i === idx ? { ...it, valeur: e.target.value } : it);
                                      return { ...p, patrimoine_detail: d };
                                    })}
                                    style={{ width: '100%', border: '1px solid #E5E7EB', borderRadius: 6, padding: '8px 12px', fontSize: 13, fontFamily: 'DM Sans, sans-serif', boxSizing: 'border-box' }} />
                                  {hasConj && (
                                    <div>
                                      <p style={{ color: '#6B7280', fontSize: 12, margin: '0 0 6px' }}>Appartient à :</p>
                                      <div style={{ display: 'flex', gap: 6 }}>
                                        {[['user', 'À moi seul(e)'], ['conjoint', `À ${form.conjoint_prenom}`], ['both', 'Aux deux']].map(([val, lbl]) => (
                                          <button key={val} onClick={() => setForm(p => {
                                            const d = { ...(p.patrimoine_detail || {}) };
                                            d[key] = d[key].map((it, i) => i === idx ? { ...it, proprio: val } : it);
                                            return { ...p, patrimoine_detail: d };
                                          })}
                                            style={{ flex: 1, padding: '7px 4px', border: `2px solid ${item.proprio === val ? '#C9A96E' : '#E5E7EB'}`, borderRadius: 7, background: item.proprio === val ? '#FDF8F0' : 'white', color: item.proprio === val ? '#C9A96E' : '#6B7280', cursor: 'pointer', fontSize: 12, fontWeight: item.proprio === val ? 600 : 400, fontFamily: 'DM Sans, sans-serif', transition: 'all 0.15s' }}>
                                            {lbl}
                                          </button>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              ))}
                              {!single && (
                                <button onClick={() => setForm(p => {
                                  const d = { ...(p.patrimoine_detail || {}) };
                                  d[key] = [...(d[key] || []), { valeur: '', proprio: '' }];
                                  return { ...p, patrimoine_detail: d };
                                })} style={{ padding: '7px 12px', border: '1px dashed #C9A96E', borderRadius: 7, background: 'none', color: '#C9A96E', cursor: 'pointer', fontSize: 12, fontFamily: 'DM Sans, sans-serif', textAlign: 'left', alignSelf: 'flex-start' }}>
                                  + Ajouter {ASSET_ADD_LABEL[key] || 'un autre'}
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  {/* Revenus du foyer — partagés tous focus */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <label style={{ color: '#6B7280', fontSize: 13 }}>
                        Revenus annuels <span style={{ color: '#A8A8B8' }}>(optionnel — même estimés)</span>
                      </label>
                      <div style={{ display: 'flex', gap: 4 }}>
                        {[['net', 'Net'], ['brut', 'Brut']].map(([val, lbl]) => (
                          <button key={val} onClick={() => setForm(p => ({ ...p, revenus_brut_net: val }))}
                            style={{ padding: '4px 10px', border: `1px solid ${form.revenus_brut_net === val ? '#1B2B4B' : '#E5E7EB'}`, borderRadius: 6, background: form.revenus_brut_net === val ? '#1B2B4B' : 'white', color: form.revenus_brut_net === val ? 'white' : '#6B7280', cursor: 'pointer', fontSize: 12, fontFamily: 'DM Sans, sans-serif' }}>
                            {lbl}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: hasConj ? '1fr 1fr' : '1fr', gap: 8 }}>
                      <div>
                        {hasConj && <label style={{ color: '#A8A8B8', fontSize: 12, display: 'block', marginBottom: 4 }}>Vos revenus</label>}
                        <input type="number" value={form.revenus_user || ''} min="0"
                          onChange={e => setForm(p => ({ ...p, revenus_user: e.target.value }))}
                          placeholder="ex : 60 000"
                          style={{ width: '100%', border: '1px solid #E5E7EB', borderRadius: 8, padding: '10px 14px', fontSize: 14, fontFamily: 'DM Sans, sans-serif', boxSizing: 'border-box' }} />
                      </div>
                      {hasConj && (
                        <div>
                          <label style={{ color: '#A8A8B8', fontSize: 12, display: 'block', marginBottom: 4 }}>Revenus de {form.conjoint_prenom}</label>
                          <input type="number" value={form.revenus_conjoint || ''} min="0"
                            onChange={e => setForm(p => ({ ...p, revenus_conjoint: e.target.value }))}
                            placeholder="ex : 40 000"
                            style={{ width: '100%', border: '1px solid #E5E7EB', borderRadius: 8, padding: '10px 14px', fontSize: 14, fontFamily: 'DM Sans, sans-serif', boxSizing: 'border-box' }} />
                        </div>
                      )}
                    </div>
                    <p style={{ color: '#A8A8B8', fontSize: 12, margin: 0, lineHeight: 1.5 }}>
                      Permet de calibrer les recommandations fiscales dans votre tableau de bord.
                    </p>
                  </div>
                </div>
              );
            })()}

            {/* ── Étape 5 : Focus ── */}
            {formStep === 5 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <p style={{ color: '#7A7A8C', fontSize: 14, margin: '0 0 8px', lineHeight: 1.6 }}>
                  Pour un audit approfondi et pertinent, Nesso se concentre sur <strong style={{ color: '#1B2B4B' }}>un axe à la fois</strong>. Quelle est votre priorité ?
                </p>
                {[
                  { val: 'A', icon: '↑', label: 'Ce que je vais recevoir', desc: 'Comprendre et organiser la transmission de mes parents et grands-parents de mon vivant.', show: form.parents_en_vie !== 'non' },
                  { val: 'B', icon: '↓', label: 'Ce que je vais laisser', desc: form.situation_civile === 'celibataire' ? 'Organiser ma succession et protéger mes proches.' : 'Protéger mon conjoint et mes enfants en cas de décès ou d\'incapacité.', show: true },
                  { val: 'C', icon: '◎', label: 'Réduire ma fiscalité', desc: 'Optimiser mes impôts cette année et structurer mon patrimoine sur le long terme.', show: true },
                ].filter(o => o.show).map(({ val, icon, label, desc }) => (
                  <div key={val} onClick={() => setForm(p => ({ ...p, focus: val }))}
                    style={{ display: 'flex', gap: 16, alignItems: 'flex-start', border: `2px solid ${form.focus === val ? '#C9A96E' : '#E5E7EB'}`, borderRadius: 12, padding: '18px 20px', cursor: 'pointer', background: form.focus === val ? '#FDF8F0' : 'white', transition: 'all 0.15s' }}>
                    <span style={{ fontSize: 22, color: '#C9A96E', flexShrink: 0, marginTop: 2 }}>{icon}</span>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontWeight: 600, color: '#1B2B4B', fontSize: 15, margin: '0 0 5px' }}>{label}</p>
                      <p style={{ color: '#7A7A8C', fontSize: 13, margin: 0, lineHeight: 1.5 }}>{desc}</p>
                    </div>
                    {form.focus === val && <span style={{ color: '#C9A96E', fontSize: 20, flexShrink: 0, marginTop: 2 }}>✓</span>}
                  </div>
                ))}
                <p style={{ color: '#A8A8B8', fontSize: 12, margin: '4px 0 0' }}>Vous pourrez explorer les autres axes avec Nesso+.</p>
              </div>
            )}

            {/* ── Étape 6 : Sous-formulaire focus ── */}
            {formStep === 6 && form.focus === 'A' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                <p style={{ color: '#7A7A8C', fontSize: 14, margin: 0, lineHeight: 1.6 }}>Quelques précisions pour calibrer l'audit sur ce que vous allez recevoir.</p>
                {/* Patrimoine parents */}
                <div>
                  <label style={{ color: '#6B7280', fontSize: 13, display: 'block', marginBottom: 6 }}>Patrimoine estimé de vos parents <span style={{ color: '#A8A8B8' }}>(même approximatif)</span></label>
                  <input type="number" value={form.parents_patrimoine || ''} min="0"
                    onChange={e => setForm(p => ({ ...p, parents_patrimoine: e.target.value }))}
                    placeholder="ex : 600 000"
                    style={{ width: '100%', border: '1px solid #E5E7EB', borderRadius: 8, padding: '10px 14px', fontSize: 14, fontFamily: 'DM Sans, sans-serif', boxSizing: 'border-box' }} />
                </div>
                {/* Composition patrimoine parents */}
                <div>
                  <label style={{ color: '#6B7280', fontSize: 13, display: 'block', marginBottom: 8 }}>Composition <span style={{ color: '#A8A8B8' }}>(plusieurs choix possibles)</span></label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {[['Immobilier','🏠'],['Épargne / financier','💰'],['Entreprise','🏢'],['Bien étranger','🌍'],['Autre','◇']].map(([lbl, ico]) => {
                      const sel = (form.parents_compo || []).includes(lbl);
                      return (
                        <button key={lbl} onClick={() => setForm(p => ({ ...p, parents_compo: sel ? p.parents_compo.filter(x => x !== lbl) : [...(p.parents_compo||[]), lbl] }))}
                          style={{ padding: '8px 14px', border: `2px solid ${sel ? '#1B2B4B' : '#E5E7EB'}`, borderRadius: 20, background: sel ? '#F0F4FF' : 'white', color: sel ? '#1B2B4B' : '#6B7280', cursor: 'pointer', fontSize: 13, fontWeight: sel ? 600 : 400, fontFamily: 'DM Sans, sans-serif', transition: 'all 0.15s' }}>
                          {ico} {lbl}
                        </button>
                      );
                    })}
                  </div>
                </div>
                {/* Patrimoine GP si en vie */}
                {((form.gp_maternels && form.gp_maternels !== 'non') || (form.gp_paternels && form.gp_paternels !== 'non')) && (
                  <>
                    <div>
                      <label style={{ color: '#6B7280', fontSize: 13, display: 'block', marginBottom: 6 }}>Patrimoine estimé de vos grands-parents <span style={{ color: '#A8A8B8' }}>(même approximatif)</span></label>
                      <input type="number" value={form.gp_patrimoine || ''} min="0"
                        onChange={e => setForm(p => ({ ...p, gp_patrimoine: e.target.value }))}
                        placeholder="ex : 400 000"
                        style={{ width: '100%', border: '1px solid #E5E7EB', borderRadius: 8, padding: '10px 14px', fontSize: 14, fontFamily: 'DM Sans, sans-serif', boxSizing: 'border-box' }} />
                    </div>
                    {form.gp_patrimoine && (
                      <div>
                        <label style={{ color: '#6B7280', fontSize: 13, display: 'block', marginBottom: 8 }}>Composition <span style={{ color: '#A8A8B8' }}>(si vous le savez)</span></label>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                          {[['Immobilier','🏠'],['Épargne / financier','💰'],['Entreprise','🏢'],['Bien étranger','🌍'],['Autre','◇']].map(([lbl, ico]) => {
                            const sel = (form.gp_compo || []).includes(lbl);
                            return (
                              <button key={lbl} onClick={() => setForm(p => ({ ...p, gp_compo: sel ? p.gp_compo.filter(x => x !== lbl) : [...(p.gp_compo||[]), lbl] }))}
                                style={{ padding: '8px 14px', border: `2px solid ${sel ? '#1B2B4B' : '#E5E7EB'}`, borderRadius: 20, background: sel ? '#F0F4FF' : 'white', color: sel ? '#1B2B4B' : '#6B7280', cursor: 'pointer', fontSize: 13, fontWeight: sel ? 600 : 400, fontFamily: 'DM Sans, sans-serif', transition: 'all 0.15s' }}>
                                {ico} {lbl}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </>
                )}
                {/* Oncles / tantes — si GP en vie */}
                {(form.gp_maternels === 'les_deux' || form.gp_maternels === 'un' || form.gp_paternels === 'les_deux' || form.gp_paternels === 'un') && (
                  <div>
                    <label style={{ color: '#6B7280', fontSize: 13, display: 'block', marginBottom: 8 }}>Oncles et tantes <span style={{ color: '#A8A8B8' }}>(enfants de vos grands-parents, hors vos parents)</span></label>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                      {form.gp_maternels !== 'non' && form.gp_maternels && (
                        <div>
                          <label style={{ color: '#A8A8B8', fontSize: 12, display: 'block', marginBottom: 6 }}>Côté maternel</label>
                          <div style={{ display: 'flex', gap: 6 }}>
                            {['0','1','2','3','4+'].map(n => (
                              <button key={n} onClick={() => setForm(p => ({ ...p, oncles_tantes_maternels: n }))}
                                style={{ flex: 1, padding: '8px 4px', border: `2px solid ${form.oncles_tantes_maternels === n ? '#1B2B4B' : '#E5E7EB'}`, borderRadius: 8, background: form.oncles_tantes_maternels === n ? '#F0F4FF' : 'white', color: form.oncles_tantes_maternels === n ? '#1B2B4B' : '#6B7280', cursor: 'pointer', fontSize: 13, fontWeight: form.oncles_tantes_maternels === n ? 600 : 400, fontFamily: 'DM Sans, sans-serif', transition: 'all 0.15s' }}>
                                {n}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                      {form.gp_paternels !== 'non' && form.gp_paternels && (
                        <div>
                          <label style={{ color: '#A8A8B8', fontSize: 12, display: 'block', marginBottom: 6 }}>Côté paternel</label>
                          <div style={{ display: 'flex', gap: 6 }}>
                            {['0','1','2','3','4+'].map(n => (
                              <button key={n} onClick={() => setForm(p => ({ ...p, oncles_tantes_paternels: n }))}
                                style={{ flex: 1, padding: '8px 4px', border: `2px solid ${form.oncles_tantes_paternels === n ? '#1B2B4B' : '#E5E7EB'}`, borderRadius: 8, background: form.oncles_tantes_paternels === n ? '#F0F4FF' : 'white', color: form.oncles_tantes_paternels === n ? '#1B2B4B' : '#6B7280', cursor: 'pointer', fontSize: 13, fontWeight: form.oncles_tantes_paternels === n ? 600 : 400, fontFamily: 'DM Sans, sans-serif', transition: 'all 0.15s' }}>
                                {n}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
                {/* Fratrie */}
                <div>
                  <label style={{ color: '#6B7280', fontSize: 13, display: 'block', marginBottom: 8 }}>Vos frères et sœurs <span style={{ color: '#A8A8B8' }}>(pour calculer le partage entre héritiers)</span></label>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {['0','1','2','3','4+'].map(n => (
                      <button key={n} onClick={() => setForm(p => ({ ...p, fratrie: n }))}
                        style={{ flex: 1, padding: '9px 4px', border: `2px solid ${form.fratrie === n ? '#1B2B4B' : '#E5E7EB'}`, borderRadius: 8, background: form.fratrie === n ? '#F0F4FF' : 'white', color: form.fratrie === n ? '#1B2B4B' : '#6B7280', cursor: 'pointer', fontSize: 13, fontWeight: form.fratrie === n ? 600 : 400, fontFamily: 'DM Sans, sans-serif', transition: 'all 0.15s' }}>
                        {n}
                      </button>
                    ))}
                  </div>
                </div>
                {/* Donations reçues */}
                <div>
                  <label style={{ color: '#6B7280', fontSize: 13, display: 'block', marginBottom: 8 }}>Avez-vous déjà reçu des donations de vos parents ou grands-parents ?</label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {[['oui','Oui'],['non','Non'],['sais_pas','Je ne sais pas']].map(([val, lbl]) => (
                      <button key={val} onClick={() => setForm(p => ({ ...p, donations_recues: val }))}
                        style={{ flex: 1, padding: '10px', border: `2px solid ${form.donations_recues === val ? '#1B2B4B' : '#E5E7EB'}`, borderRadius: 8, background: form.donations_recues === val ? '#F0F4FF' : 'white', color: form.donations_recues === val ? '#1B2B4B' : '#6B7280', cursor: 'pointer', fontSize: 13, fontWeight: form.donations_recues === val ? 600 : 400, fontFamily: 'DM Sans, sans-serif', transition: 'all 0.15s' }}>
                        {lbl}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {formStep === 6 && form.focus === 'B' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                <p style={{ color: '#7A7A8C', fontSize: 14, margin: 0, lineHeight: 1.6 }}>Pour cibler l'audit sur votre transmission et la protection de vos proches.</p>
                {/* Testament */}
                <div>
                  <label style={{ color: '#6B7280', fontSize: 13, display: 'block', marginBottom: 8 }}>Avez-vous un testament ?</label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {[['oui','Oui'],['non','Non'],['sais_pas','Je ne sais pas']].map(([val, lbl]) => (
                      <button key={val} onClick={() => setForm(p => ({ ...p, testament: val }))}
                        style={{ flex: 1, padding: '10px', border: `2px solid ${form.testament === val ? '#1B2B4B' : '#E5E7EB'}`, borderRadius: 8, background: form.testament === val ? '#F0F4FF' : 'white', color: form.testament === val ? '#1B2B4B' : '#6B7280', cursor: 'pointer', fontSize: 13, fontWeight: form.testament === val ? 600 : 400, fontFamily: 'DM Sans, sans-serif', transition: 'all 0.15s' }}>
                        {lbl}
                      </button>
                    ))}
                  </div>
                </div>
                {/* Assurance-vie */}
                <div>
                  <label style={{ color: '#6B7280', fontSize: 13, display: 'block', marginBottom: 8 }}>Avez-vous une ou plusieurs assurances-vie ?</label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {[['oui','Oui — bénéficiaires à jour'],['oui_maj','Oui — à mettre à jour / je ne sais pas'],['non','Non']].map(([val, lbl]) => (
                      <button key={val} onClick={() => setForm(p => ({ ...p, av_existante: val }))}
                        style={{ padding: '10px 16px', border: `2px solid ${form.av_existante === val ? '#C9A96E' : '#E5E7EB'}`, borderRadius: 8, background: form.av_existante === val ? '#FDF8F0' : 'white', color: form.av_existante === val ? '#C9A96E' : '#6B7280', cursor: 'pointer', fontSize: 13, fontWeight: form.av_existante === val ? 600 : 400, fontFamily: 'DM Sans, sans-serif', textAlign: 'left', transition: 'all 0.15s' }}>
                        {lbl}
                      </button>
                    ))}
                  </div>
                </div>
                {/* Types actifs */}
                <div>
                  <label style={{ color: '#6B7280', fontSize: 13, display: 'block', marginBottom: 8 }}>Vos actifs principaux <span style={{ color: '#A8A8B8' }}>(plusieurs choix)</span></label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {[['Résidence principale','🏠'],['Immobilier locatif','🏢'],['Épargne / financier','💰'],['Entreprise','⚙'],['Bien étranger','🌍']].map(([lbl, ico]) => {
                      const sel = (form.actifs_type || []).includes(lbl);
                      return (
                        <button key={lbl} onClick={() => setForm(p => ({ ...p, actifs_type: sel ? p.actifs_type.filter(x => x !== lbl) : [...(p.actifs_type||[]), lbl] }))}
                          style={{ padding: '8px 14px', border: `2px solid ${sel ? '#1B2B4B' : '#E5E7EB'}`, borderRadius: 20, background: sel ? '#F0F4FF' : 'white', color: sel ? '#1B2B4B' : '#6B7280', cursor: 'pointer', fontSize: 13, fontWeight: sel ? 600 : 400, fontFamily: 'DM Sans, sans-serif', transition: 'all 0.15s' }}>
                          {ico} {lbl}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {formStep === 6 && form.focus === 'C' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                <p style={{ color: '#7A7A8C', fontSize: 14, margin: 0, lineHeight: 1.6 }}>Pour calibrer l'audit sur votre situation fiscale personnelle.</p>
                {/* Statut pro */}
                <div>
                  <label style={{ color: '#6B7280', fontSize: 13, display: 'block', marginBottom: 8 }}>Votre statut professionnel</label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    {[['salarie','Salarié'],['tns','TNS / indépendant'],['dirigeant','Dirigeant de société'],['retraite','Retraité']].map(([val, lbl]) => (
                      <button key={val} onClick={() => setForm(p => ({ ...p, statut_pro: val }))}
                        style={{ padding: '11px', border: `2px solid ${form.statut_pro === val ? '#1B2B4B' : '#E5E7EB'}`, borderRadius: 8, background: form.statut_pro === val ? '#F0F4FF' : 'white', color: form.statut_pro === val ? '#1B2B4B' : '#6B7280', cursor: 'pointer', fontSize: 13, fontWeight: form.statut_pro === val ? 600 : 400, fontFamily: 'DM Sans, sans-serif', transition: 'all 0.15s' }}>
                        {lbl}
                      </button>
                    ))}
                  </div>
                </div>
                {/* PER / PEA */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div>
                    <label style={{ color: '#6B7280', fontSize: 13, display: 'block', marginBottom: 8 }}>PER ouvert ?</label>
                    <div style={{ display: 'flex', gap: 6 }}>
                      {[['oui','Oui'],['non','Non']].map(([val, lbl]) => (
                        <button key={val} onClick={() => setForm(p => ({ ...p, per_ouvert: val }))}
                          style={{ flex: 1, padding: '9px', border: `2px solid ${form.per_ouvert === val ? '#1B2B4B' : '#E5E7EB'}`, borderRadius: 8, background: form.per_ouvert === val ? '#F0F4FF' : 'white', color: form.per_ouvert === val ? '#1B2B4B' : '#6B7280', cursor: 'pointer', fontSize: 13, fontWeight: form.per_ouvert === val ? 600 : 400, fontFamily: 'DM Sans, sans-serif', transition: 'all 0.15s' }}>
                          {lbl}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label style={{ color: '#6B7280', fontSize: 13, display: 'block', marginBottom: 8 }}>PEA ouvert ?</label>
                    <div style={{ display: 'flex', gap: 6 }}>
                      {[['oui','Oui'],['non','Non']].map(([val, lbl]) => (
                        <button key={val} onClick={() => setForm(p => ({ ...p, pea_ouvert: val }))}
                          style={{ flex: 1, padding: '9px', border: `2px solid ${form.pea_ouvert === val ? '#1B2B4B' : '#E5E7EB'}`, borderRadius: 8, background: form.pea_ouvert === val ? '#F0F4FF' : 'white', color: form.pea_ouvert === val ? '#1B2B4B' : '#6B7280', cursor: 'pointer', fontSize: 13, fontWeight: form.pea_ouvert === val ? 600 : 400, fontFamily: 'DM Sans, sans-serif', transition: 'all 0.15s' }}>
                          {lbl}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Navigation */}
            <div style={{ display: 'flex', gap: 10, marginTop: 28, alignItems: 'center' }}>
              {formStep > 1 && (
                <button onClick={() => setFormStep(s => s - 1)}
                  style={{ padding: '11px 18px', border: '1px solid #E5E7EB', borderRadius: 9, background: 'white', color: '#6B7280', cursor: 'pointer', fontSize: 14, fontFamily: 'DM Sans, sans-serif' }}>
                  ← Retour
                </button>
              )}
              {formStep < totalSteps ? (
                <button onClick={() => canAdvance() && setFormStep(s => s + 1)} disabled={!canAdvance()}
                  style={{ flex: 1, padding: '12px', border: 'none', borderRadius: 9, background: canAdvance() ? '#1B2B4B' : '#E5E7EB', color: canAdvance() ? 'white' : '#A8A8B8', cursor: canAdvance() ? 'pointer' : 'default', fontSize: 15, fontWeight: 600, fontFamily: 'DM Sans, sans-serif' }}>
                  Suivant →
                </button>
              ) : (
                <button onClick={() => startWithForm(form)} disabled={loading}
                  style={{ flex: 1, padding: '12px', border: 'none', borderRadius: 9, background: !loading ? '#C9A96E' : '#E5E7EB', color: !loading ? 'white' : '#A8A8B8', cursor: !loading ? 'pointer' : 'default', fontSize: 15, fontWeight: 600, fontFamily: 'DM Sans, sans-serif' }}>
                  {loading ? '⏳ Démarrage…' : 'Lancer mon audit →'}
                </button>
              )}
            </div>

          </div>
        )}

        {/* ── BRANCHE 3 : CHAT ── */}
        {auditPhase === 'chat' && (
          <div className="card" style={{ display: 'flex', flexDirection: 'column', height: 640 }}>
            <div style={{ padding: '14px 20px', borderBottom: '1px solid #F5F0EA', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 34, height: 34, borderRadius: '50%', background: '#C9A96E', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: 14 }}>N</div>
                <div>
                  <p style={{ fontWeight: 600, color: '#1B2B4B', fontSize: 14, margin: 0 }}>Conseiller Nesso</p>
                  <p style={{ color: '#10B981', fontSize: 11, margin: 0 }}>● En ligne</p>
                </div>
              </div>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
              {messages.filter(m => !m.hidden).map((m, i) => (
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
