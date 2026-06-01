# Architecture Nesso — Documentation technique

> Dernière mise à jour : juin 2026  
> Stack : React 19 + Vite 8 · Supabase (auth + PostgreSQL) · Claude Sonnet 4.5 (chat) · Claude Haiku 4.5 (extraction) · Vercel (proxy API)

---

## 1. Vue d'ensemble — Règle TANGO

Le projet suit une séparation stricte des responsabilités :

| Couche | Outil | Rôle |
|--------|-------|------|
| **Chat** | Claude Sonnet 4.5 | Conversation naturelle, collecte d'informations |
| **Extraction** | Claude Haiku 4.5 | Transformation JSON du contenu de la conversation |
| **Engine** | `src/engine/` | Calculs fiscaux chiffrés, barèmes exacts (art. 777 CGI, etc.) |
| **Dashboard** | `src/components/Dashboard.jsx` | Affichage des résultats — consomme l'engine, jamais l'IA directement |

**Règle absolue** : le Dashboard ne fait jamais appel à l'IA. Les recommandations sont produites par l'engine (calculs déterministes) à partir du profil JSON extrait.

---

## 2. Flow de données — bout en bout

```
Formulaire cadrage (5 étapes)
        │
        ▼
buildContextMessage()          → string "DONNÉES DE CADRAGE — FORMULAIRE NESSO"
        │                         injectée comme 1er message système dans l'historique
        ▼
Chat Sonnet 4.5                → /api/anthropic → Anthropic API
  SYSTEM_PROMPT (cached)         history.slice(-18) + nouveau message user
  max_tokens: 1024
        │
        ▼  (trigger [AUDIT_COMPLET] ou bouton explicite)
extractUserData()
  Haiku 4.5                    → /api/anthropic → Anthropic API
  EXTRACTION_PROMPT              history.slice(-20) + prompt JSON
  max_tokens: 1200
        │
        ▼
parseJsonRobust()              → extrait le plus grand bloc {} valide
        │                         gère les fences markdown, double-parse
        ▼
sanitizeUserData()             → normalise, applique défauts, valide focus_principal
        │                         fusionne famille{} avec défauts (spread)
        ▼
onComplete(userData)           → App.jsx handleComplete()
        │
        ▼
handleComplete()
  - filtre actifs : valeur > 0
  - préserve proprietaires[]
  - setUserProfile / setActifs / setPov('user') / setView('dashboard')
  - sauvegarde : Supabase (si connecté) OU localStorage
        │
        ▼
Dashboard                      ← reçoit {pov, actifs, userProfile, onRefairAudit}
  filterActifsByPov()          → povActifs
  getPatrimoine()              → patrimoine (chiffre brut)
  computeUserCalculs() / computeFocusACalculs()  → calculs (KPIs)
  generateUserActions()        → actions (recommandations)
  generateScenarios()          → scénarios comparatifs
  generateTimeline()           → calendrier fiscal
```

---

## 3. Structure JSON produite par Haiku (EXTRACTION_PROMPT)

```json
{
  "prenom": "string",
  "conjoint": "string | null",
  "enfants_prenoms": ["string"],
  "enfants": 0,
  "age": 45,
  "profession": "string",
  "regime": "communaute|separation|participation|universel",
  "situation_civile": "marie|pacse|concubin|celibataire",
  "parents_en_vie": true,
  "famille_recomposee": false,

  "famille": {
    "mere_prenom": null,
    "pere_prenom": null,
    "parents_en_vie": true,
    "nb_parents_en_vie": 2,
    "pere_age": null,
    "mere_age": null,
    "gp_maternels_vivants": false,
    "gp_maternels_age": null,
    "gp_paternels_vivants": false,
    "gp_paternels_age": null,
    "fratrie": [{ "prenom": "string", "lien": "frère|sœur", "handicap": false }],
    "autres": [{ "prenom": "string", "lien": "tante|oncle|cousin" }],
    "patrimoine_parents_estime": 0,
    "patrimoine_gp_estime": 0,
    "gp_transmission_organisee": false,
    "gp_leviers_identifies": []
  },

  "focus_principal": "Transmission parentale|Protection du partenaire|Transmission en famille recomposée|Protection des proches & transmission|IFI & optimisation immobilière|Optimisation rémunération & structure|Optimisation fiscale annuelle",
  "focus_audit": "succession|optimisation|les_deux",

  "succession": {
    "grands_parents_vivants": false,
    "grands_parents_patrimoine_estime": 0,
    "autres_parties_prenantes": [],
    "belle_famille_incluse": false,
    "belle_famille_patrimoine_estime": 0,
    "donations_passees": [{ "de": "parent|user", "vers": "user|enfant", "montant": 0, "annee": 2020 }],
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
    {
      "nom": "string",
      "categorie": "immobilier|financier|professionnel|sci|exotique",
      "valeur": 250000,
      "type": "Résidence principale|Résidence secondaire|Bien locatif|Bien étranger|SCI|Assurance-vie|PEA|PER|Liquidités|Société|Autre",
      "sci_immo_ratio": null,
      "av_clause": "standard|sur_mesure|inconnue|null",
      "pays": "France",
      "proprietaires": ["user"]
    }
  ],

  "objectifs": "string",
  "score": 60,
  "alertes": ["pacs_sans_testament|concubinage|international|ifi|carmf|dutreil|famille_recomposee"]
}
```

### Règle `proprietaires` (critique pour le filtrage POV)
- `["user"]` → bien personnel de l'utilisateur
- `["conjoint"]` → bien personnel du conjoint — **exclu du POV 'user'**
- `["user","conjoint"]` → bien co-détenu — comptabilisé à 50% pour chaque POV individuel
- `["enfant_0"]`, `["enfant_1"]`... → biens des enfants

### Estimations par défaut (Haiku si non précisé)
- RP : 350 000€ · RS : 250 000€ · Bien locatif : 200 000€
- AV : 50 000€ · PEA : 30 000€ · PER : 20 000€ · Liquidités : 15 000€
- Au moins 2 actifs garantis (sinon dashboard vide)

---

## 4. Ce que chaque composant du dashboard consomme

### `Dashboard.jsx`
**Props reçues** : `{ pov, actifs, userProfile, onRefairAudit }`

| Donnée | Source | Champs utilisés |
|--------|--------|-----------------|
| Patrimoine brut | `getPatrimoine(pov, povActifs)` | `actifs[].valeur`, `actifs[].proprietaires` |
| KPIs financiers | `computeUserCalculs(patrimoine, userProfileForPov)` | `age`, `actifs[]`, `succession.donations_passees` |
| KPIs Focus A | `computeFocusACalculs(userProfileForPov)` | `famille.patrimoine_parents_estime`, `famille.nb_parents_en_vie`, `famille.fratrie` |
| Score de risque | `computeScore(userProfile, {patrimoine, droitsStatusQuo})` | `alertes[]`, `situation_civile`, `age`, `actifs[]` |
| Recommandations | `generateUserActions(userProfileForPov, patrimoine)` | `focus_audit`, `actifs[]`, `optimisation`, `alertes[]`, `succession` |
| Scénarios | `generateScenarios(userProfileForPov, patrimoine, isFocusA)` | `enfants`, `famille.fratrie`, `famille.nb_parents_en_vie`, `famille.pere_age`, `famille.mere_age`, `succession.donations_passees` |
| Calendrier | `generateTimeline(userProfileForPov)` | `age`, `famille.pere_age`, `famille.mere_age`, `famille.gp_*_age`, `optimisation.tmi`, `succession.donations_passees` |
| Onglet initial | Dérivé de `focus_audit` | `focus_audit` |
| POV selector | `Navbar.jsx` → `buildPovOptions(userProfile)` | `prenom`, `conjoint`, `enfants_prenoms`, `parents_en_vie`, `succession.grands_parents_vivants` |

**Condition `isFocusA`** (détermine quel engine utiliser) :
```
isFocusA = isUserPov
  && famille.patrimoine_parents_estime > 0
  && (
       focus_principal === 'Transmission parentale'
    || (patrimoine === 0 && famille.patrimoine_parents_estime > 50000)
  )
```

### `Famille.jsx`
**Props reçues** : `{ pov, setPov, actifs, userProfile }`

| Section | Champs utilisés |
|---------|-----------------|
| Arbre générations | `prenom`, `conjoint`, `enfants_prenoms`, `famille.mere_prenom`, `famille.pere_prenom`, `famille.gp_*_vivants` |
| Patrimoine parents | `famille.patrimoine_parents_estime`, `parents_en_vie` |
| Patrimoine GP | `famille.patrimoine_gp_estime` |
| Fratrie | `famille.fratrie[]` → prenom, lien, handicap |
| Autres proches | `famille.autres[]` → prenom, lien |
| Actifs par POV | `filterActifsByPov(actifs, pov)` |

### `Actifs.jsx`
**Props reçues** : `{ pov, actifs, setActifs, userProfile }`

| Section | Champs utilisés |
|---------|-----------------|
| Filtre POV | `filterActifsByPov(actifs, pov)` → `actifs[].proprietaires` |
| Affichage | `nom`, `categorie`, `valeur`, `type`, `pays`, `credit`, `note` |
| Propriétaires | `getProprietaireLabel(actifs[].proprietaires, userProfile)` |

### `Navbar.jsx`
**Props reçues** : `{ view, setView, pov, setPov, userProfile, userEmail, ... }`

| Element | Champs utilisés |
|---------|-----------------|
| POV selector | `prenom`, `conjoint`, `enfants_prenoms`, `parents_en_vie`, `succession.grands_parents_vivants` |

---

## 5. Points de passage critiques — où les données peuvent se perdre

### P1 — `history.slice(-18)` et `history.slice(-20)`
**Fichier** : `Onboarding.jsx` → `callApi()` et `extractUserData()`  
**Risque** : Si la conversation dépasse 18/20 messages, le contexte cadrage (données du formulaire injectées au début) peut être perdu.  
**Impact** : Extraction Haiku incomplète → champs manquants → dashboard 0.  
**Mitigation** : Le message cadrage devrait être systématiquement inclus, pas seulement dans `slice(-18)`.

### P2 — `sanitizeUserData()` écrase `focus_principal`
**Fichier** : `Onboarding.jsx` lignes 271–273  
**Code** :
```js
if (!VALID_FOCUSES.includes(out.focus_principal)) {
  out.focus_principal = PROFIL_VIDE.focus_principal; // = 'Protection des proches & transmission'
}
```
**Risque** : Si Haiku retourne une valeur légèrement différente (ex: "Transmission parentale " avec espace, ou variante), elle est remplacée.  
**Impact** : `isFocusA` ne se déclenche plus → dashboard 0 pour les profils "succession montante".

### P3 — `nb_parents_en_vie = 0` écrasé par la dérivation
**Fichier** : `Onboarding.jsx` lignes 300–304  
**Code** :
```js
if (!out.famille.nb_parents_en_vie) {  // !0 === true → bug si nb = 0
  out.famille.nb_parents_en_vie = (hasMere && hasPere) ? 2 : (hasMere || hasPere || out.parents_en_vie) ? 1 : 0;
}
```
**Risque** : `!0 === true` en JS → si Haiku extrait `nb_parents_en_vie: 0` (deux parents décédés), la condition `!0` est vraie et la valeur est recalculée, potentiellement incorrectement.  
**Impact** : Abattements succession calculés sur un parent fictif.

### P4 — `handleSetActifs` supprime `proprietaires` dans `userProfile.actifs`
**Fichier** : `App.jsx` lignes 244–248  
**Code** :
```js
actifs: newActifs.map(a => ({
  nom: a.nom, categorie: a.categorie, valeur: a.valeur, type: a.type, pays: a.pays,
  // proprietaires ABSENT
}))
```
**Risque** : `userProfile.actifs` (copie dans le profil) perd les proprietaires si l'user édite ses actifs manuellement.  
**Impact limité** : Le Dashboard utilise `userProfileForPov = { ...userProfile, actifs: povActifs }` → remplace `actifs` par les actifs filtrés depuis le state App, pas depuis `userProfile.actifs`. Impact réel : `calcBaseSuccession` dans l'engine si jamais appelé avec `userProfile.actifs` directement.

### P5 — `handleComplete` filtre `valeur > 0`
**Fichier** : `App.jsx` ligne 212  
**Code** :
```js
.filter(a => a.valeur > 0)
```
**Risque** : Actifs à valeur nulle (ex: "à estimer") sont silencieusement supprimés.  
**Impact** : Si Haiku extrait des actifs sans valeur (non estimés), dashboard peut être vide.  
**Mitigation** : EXTRACTION_PROMPT impose des estimations par défaut.

### P6 — `getPatrimoine` pour POV 'user' avec biens exclusivement conjoint
**Fichier** : `utils.js` → `filterActifsByPov` + `getPatrimoine`  
**Cas** : RP appartient à `["conjoint"]` uniquement → `filterActifsByPov(actifs, 'user')` retourne `[]` → `patrimoine = 0`.  
**Impact** : 
- Si `famille.patrimoine_parents_estime = 0` → `isFocusA = false` → `computeUserCalculs(0, ...)` → tous les KPIs à 0.
- L'onglet 'foyer' montrerait le patrimoine correct, mais le POV par défaut est 'user'.

### P7 — localStorage : clé `nesso_user_profile` (pas `nesso_profile`)
**Fichier** : `App.jsx` — clés exactes : `nesso_user_profile`, `nesso_user_actifs`, `nesso_messages`  
**Risque** : Tout patch console ou code externe utilisant `nesso_profile` (clé incorrecte) n'aura aucun effet.

---

## 6. Proxy API Vercel

**Fichier** : `api/anthropic.js`  
Passe `req.body` directement à `https://api.anthropic.com/v1/messages`.  
Ajoute les headers : `anthropic-beta: 'prompt-caching-2024-07-31'`, `anthropic-version: '2023-06-01'`.  
La clé API est dans `process.env.ANTHROPIC_API_KEY` (secret Vercel, jamais exposée au client).

**Prompt caching** : `SYSTEM_PROMPT` envoyé avec `cache_control: { type: 'ephemeral' }` → TTL 5 min. Économise ~90% du coût des tokens input sur les messages suivants d'une même session.

---

## 7. Persistence des données

### Flux de sauvegarde
```
Audit terminé → handleComplete()
  ├─ authUser présent  → Supabase upsert (user_data)
  └─ non connecté      → localStorage (nesso_user_profile + nesso_user_actifs)

Actifs édités manuellement → handleSetActifs()
  ├─ authUser présent  → Supabase upsert
  └─ non connecté      → localStorage

Connexion après audit → SIGNED_IN event
  ├─ compte existant   → loadUserData() depuis Supabase → écrase localStorage
  └─ nouveau compte    → migration localStorage → Supabase
```

### Table Supabase `user_data`
| Colonne | Type | Contenu |
|---------|------|---------|
| `id` | uuid (FK auth.users) | ID Supabase de l'utilisateur |
| `profile_json` | jsonb | Objet `userProfile` complet (sanitizeUserData output) |
| `actifs_json` | jsonb | Array `actifs[]` avec proprietaires |
| `pov` | text | POV courant ('user' par défaut) |
| `updated_at` | timestamptz | Date de dernière mise à jour |

### Clés localStorage
| Clé | Contenu |
|-----|---------|
| `nesso_user_profile` | Objet userProfile JSON |
| `nesso_user_actifs` | Array actifs JSON |
| `nesso_messages` | Historique conversation chat |

---

## 8. Engine — fonctions clés

### `engine/calculs.js`
- `calcDroitsBareme(taxable)` — Barème art. 777 CGI (5 tranches, en ligne droite)
- `calcIFI(net)` — Barème art. 977 CGI (seuil 1,3M€)
- `calcBaseIFI(actifs)` — Sélectionne immo + SCI×ratio, applique abattement RP 30%
- `computeUserCalculs(patrimoine, userProfile)` — KPIs dashboard pour patrimoine propre
- `computeFocusACalculs(userProfile)` — KPIs pour "succession montante" (Focus A)
- `computeScore(userProfile, {patrimoine, droitsStatusQuo})` — Score risque 0–100
- `calcBaseSuccession(patrimoine, actifs)` — Exclut RP (abattement 30%)
- `calcTauxNuePropriete(age)` — Barème art. 669 CGI

### `engine/actions.js`
- `generateUserActions(userProfile, patrimoine)` — Recommandations personnalisées
- Chaque action a : `titreGenerique`, `titre`, `description`, `economie`, `priorite`, `categorie`, `scenario` ('A' si economie > 0, 'B' sinon)

### `engine/scenarios.js`
- `generateScenarios(userProfile, patrimoine, isFocusA)` — 3 scénarios comparatifs
  - Focus A : statu quo / AV parents avant 70 ans / démembrement ou AV+don familial
  - Focus B : statu quo / avec AV / AV+don familial
- `generateTimeline(userProfile)` — Deadlines fiscales (AV avant 70, don avant 80, renouvellement abattement 15 ans)

---

## 9. Routing A/B par recommandation

Chaque recommandation générée par `generateUserActions()` reçoit :
```js
action.scenario = action.economie > 0 ? 'A' : 'B'
```

Dans le Dashboard :
- **Scénario A** (`economie > 0`) → CTA "Être mis en relation →" via `buildMailto(action)` (mailto pré-rempli vers partenaires@nesso.fr)
- **Scénario B** (`economie = 0`) → CTA "Explorer avec Nesso+ →" → modal Nesso+

---

*Ce document reflète l'état du code au 01/06/2026. Toute modification structurelle doit être répercutée ici.*
