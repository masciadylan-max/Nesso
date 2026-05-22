# Nesso — Documentation Technique V1

> Plateforme française de clarté patrimoniale familiale.  
> Stack : React 18 + Vite, déployé sur Vercel (0€/mois hors tokens LLM).  
> Rédigé pour permettre à un développeur de reprendre, comprendre et migrer le projet.

---

## 1. Architecture générale

```
Navigateur (React SPA)
    │
    ├── /anthropic/v1/messages  ──→  Vercel Serverless Function (/api/anthropic.js)
    │                                        │
    │                                        └──→  API Anthropic (claude-sonnet-4-6)
    │
    └── localStorage  (persistance état utilisateur)
```

**Flux principal :**
1. L'utilisateur arrive sur l'Onboarding (chat conversationnel)
2. Claude pose des questions sur son patrimoine (famille, actifs, objectifs)
3. À la fin, un token `[AUDIT_COMPLET]` dans la réponse Claude déclenche l'extraction
4. Un second appel Claude extrait les données en JSON structuré
5. Le Dashboard se génère à partir de ces données — ou des données démo si l'utilisateur clique "Voir l'exemple"

---

## 2. Stack technique

| Élément | Choix | Pourquoi |
|---|---|---|
| Framework | React 18 + Vite | Rapide à bootstrapper, HMR efficace |
| CSS | Inline styles (pas de Tailwind en runtime) | Contrôle total, pas de purge CSS à gérer |
| LLM | `claude-sonnet-4-6` (Anthropic) | Qualité de raisonnement patrimonial |
| Déploiement | Vercel (plan Hobby, gratuit) | Serverless functions incluses, CI/CD Git auto |
| Persistance | `localStorage` navigateur | Pas de base de données, données privées côté client |
| Proxy API | Vercel Serverless Function | Évite d'exposer la clé API dans le bundle JS |

---

## 3. Structure des fichiers

```
nesso/
├── api/
│   └── anthropic.js          # Proxy Vercel → Anthropic API (serveur)
├── src/
│   ├── App.jsx               # Routeur principal + état global
│   ├── data.js               # Données démo (famille fictive, actifs, actions, calculs)
│   ├── utils.js              # Fonctions utilitaires (euro, getPatrimoine, etc.)
│   ├── index.css             # Styles globaux (font, .card, .btn-navy, animations)
│   └── components/
│       ├── Onboarding.jsx    # Chat d'audit + extraction JSON + transition dashboard
│       ├── Dashboard.jsx     # Tableau de bord (calculs, onglets, actions)
│       ├── Famille.jsx       # Arbre généalogique (démo ou user)
│       ├── Actifs.jsx        # Liste + ajout d'actifs
│       ├── Aide.jsx          # Chat libre avec contexte patrimonial
│       ├── Navbar.jsx        # Navigation desktop + mobile
│       └── Shared.jsx        # Composants réutilisables (Badge, Skeleton, Modal)
├── vercel.json               # Config Vercel (build, outputDir, rewrites)
└── .env                      # VITE_ANTHROPIC_API_KEY (local seulement, jamais committé)
```

---

## 4. Fichier par fichier

---

### `api/anthropic.js` — Proxy serveur

**Rôle :** Reçoit les requêtes POST du navigateur sur `/anthropic/v1/messages` et les retransmet à `https://api.anthropic.com/v1/messages` en injectant la clé API depuis les variables d'environnement Vercel.

**⚠️ Faille connue :** Le `req.body` est transmis tel quel sans validation. N'importe qui connaissant l'URL peut appeler l'API avec la clé du serveur. À corriger avant passage à l'échelle.

```js
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: { message: 'Clé API non configurée.' } });
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify(req.body),
  });
  const data = await response.json();
  res.status(response.status).json(data);
}
```

**Variable d'environnement Vercel à configurer :**
```
ANTHROPIC_API_KEY=sk-ant-...
```

---

### `vercel.json`

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "rewrites": [
    { "source": "/anthropic/v1/messages", "destination": "/api/anthropic" }
  ]
}
```

La règle `rewrites` est critique : elle redirige tous les appels `/anthropic/v1/messages` (fetch côté navigateur) vers la serverless function. Sans elle, les appels partent directement vers Anthropic et sont bloqués par CORS.

---

### `App.jsx` — État global + routeur

**État géré :**
- `view` : `'onboarding' | 'dashboard' | 'famille' | 'actifs' | 'aide'`
- `pov` : point de vue actif (`'lucas' | 'mere' | 'user' | ...`)
- `actifs` : tableau des actifs patrimoniaux (démo ou user)
- `userProfile` : données extraites de la conversation (`null` si mode démo)
- `apiKey` : `'proxy'` en production (le proxy Vercel est utilisé), clé réelle si saisie manuellement

**Logique de persistance localStorage :**
```js
const LS = {
  get: (k, fallback) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : fallback; } catch { return fallback; } },
  set: (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
  del: (...keys) => { try { keys.forEach(k => localStorage.removeItem(k)); } catch {} },
};
```

Clés sauvegardées :
| Clé localStorage | Contenu |
|---|---|
| `nesso_view` | Vue active au moment de quitter |
| `nesso_pov` | Point de vue actif |
| `nesso_user_profile` | Objet JSON du profil extrait |
| `nesso_user_actifs` | Tableau des actifs utilisateur |
| `nesso_messages` | Historique de la conversation (pour "Reprendre") |
| `nesso_api_key` | Clé API si saisie manuellement |

**`handleComplete(userData)` — transition onboarding → dashboard :**
```js
const handleComplete = (userData) => {
  if (userData) {
    // Mode user : remplace TOUTES les données démo par les données utilisateur
    setUserProfile(userData);
    LS.set('nesso_user_profile', userData);
    const userActifs = (userData.actifs || [])
      .filter(a => a.valeur > 0)
      .map((a, i) => ({ id: 1000 + i, ...a, proprietaires: ['user'], credit: false, note: null, beneficiaire: null }));
    setActifs(userActifs);
    LS.set('nesso_user_actifs', userActifs);
    setPov('user');
    LS.set('nesso_pov', 'user');
  }
  // Si userData est null → mode démo, ACTIFS statiques restent
  setView('dashboard');
  LS.set('nesso_view', 'dashboard');
};
```

**`handleReset()` :**  
Efface tout le localStorage (sauf `nesso_api_key`), remet `actifs = ACTIFS` (démo), `pov = 'lucas'`, `view = 'onboarding'`.

---

### `Onboarding.jsx` — Chat d'audit

**Rôle :** Composant central. Gère la conversation avec Claude, détecte la fin de l'audit, extrait les données JSON, déclenche la transition.

#### Prompt système

Le prompt est concis (~260 tokens) et contient :
- L'ordre des 8 questions à poser
- La règle de relance si l'utilisateur ne sait pas
- L'approfondissement obligatoire par thème (bien étranger, AV, objectifs)
- Les alertes ⚠️ à déclencher selon la situation
- L'instruction d'ajouter `[AUDIT_COMPLET]` à la fin du message de conclusion

```
SIGNAL DE FIN : quand tu envoies ton message de conclusion finale, ajoute exactement 
`[AUDIT_COMPLET]` à la toute fin de ton message.
```

#### Détection fin d'audit

```js
const rawReply = await getReply(history, newCount);
const auditTermine = rawReply.includes('[AUDIT_COMPLET]');
const reply = rawReply.replace('[AUDIT_COMPLET]', '').trim(); // retiré avant affichage
```

#### Extraction JSON (`extractUserData`)

Appel Claude séparé avec prompt d'extraction. Retourne :
```json
{
  "prenom": "Dylan",
  "conjoint": "Marie",
  "enfants_prenoms": ["Emma", "Théo"],
  "age": 38,
  "profession": "Consultant",
  "regime": "Séparation de biens",
  "enfants": 2,
  "actifs": [
    { "nom": "Appartement Paris", "categorie": "immobilier", "valeur": 400000, "type": "Résidence principale", "pays": "France" }
  ],
  "objectifs": "Optimiser la transmission à mes enfants",
  "score": 65,
  "alertes": ["Bien étranger détecté"]
}
```

**Catégories d'actifs :** `immobilier | financier | professionnel | exotique`

**Fallback si extraction échoue :**
```js
const PROFIL_VIDE = { prenom: 'Vous', conjoint: null, enfants_prenoms: [], actifs: [], alertes: [], score: 60, objectifs: null };
onComplete(userData || PROFIL_VIDE);
```
→ Garantit qu'on bascule toujours en mode user après une vraie conversation, même sans données extraites.

#### Bouton de génération visible

Apparaît après 6 échanges :
```jsx
{msgCount >= 6 && !updating && !loading && (
  <button onClick={handleMettreAJour}>✦ Générer mon tableau de bord →</button>
)}
```

#### Reprise de conversation

Si `localStorage.nesso_messages` contient >4 messages, un bouton "Reprendre ma dernière conversation" apparaît sur l'écran d'accueil. Il déclenche directement l'extraction sans relancer la conversation.

---

### `Dashboard.jsx` — Tableau de bord

**Mode démo vs mode user :**
```js
const isUserPov = pov === 'user' && userProfile;
const calculs = isUserPov ? computeUserCalculs(patrimoine, userProfile) : CALCULS[pov];
const actions = isUserPov ? generateUserActions(userProfile, patrimoine) : ACTIONS[pov];
```

#### `computeUserCalculs(patrimoine, userProfile)`

Calcul simplifié (non conforme au barème légal exact — **⚠️ à corriger en V2**) :
```js
const abattement = 200000;
const taxable = Math.max(0, patrimoine - abattement);
const taux = taxable < 50000 ? 0.08 : taxable < 200000 ? 0.18 : taxable < 500000 ? 0.25 : 0.30;
const droitsStatusQuo = Math.round(taxable * taux);
const droitsOptimise = Math.round(droitsStatusQuo * 0.15); // ⚠️ arbitraire
```

#### `generateUserActions(userProfile, patrimoine)`

Génère 1 à 3 actions selon le profil :
- Patrimoine >1.3M€ → bilan IFI (rouge)
- Bien étranger détecté → fiscalité internationale (rouge)
- Régime matrimonial absent → clarification (orange)
- Patrimoine >0 → ouvrir AV (vert)
- Objectifs renseignés → notaire (vert)

Chaque action contient un **partenaire fictif** pour anticiper la monétisation :
```js
partenaire: { nom: 'Altus Patrimoine', type: 'CGP partenaire', disponibilite: 'Disponible immédiatement' }
```

#### Structure d'une action
```js
{
  urgence: 'rouge' | 'orange' | 'vert',
  titre: string,
  description: string,
  economieLabel: string,
  economie: number,       // 0 si non chiffrable
  coutLabel: string,
  cout: number,
  delai: string,
  partenaire: { nom, type, disponibilite } | null
}
```

#### Onglets

- **Succession** : droits statu quo vs optimisé, économie possible, détail par levier, comparatif visuel
- **Optimisation fiscale** : impôts annuels (IR + IFI + PS), économies, gain 10 ans, répartition fiscale, taux effectif

---

### `Famille.jsx` — Arbre généalogique

**Mode démo :** Affiche l'arbre codé en dur de la famille Martin (3 générations).

**Mode user (`pov === 'user' && userProfile`) :** Affiche un arbre dynamique :
- Utilisateur + conjoint (si `userProfile.conjoint` renseigné)
- Enfants (si `userProfile.enfants_prenoms` non vide)
- Actifs de l'utilisateur listés en dessous

```jsx
if (pov === 'user' && userProfile) {
  // Rendu simplifié avec les données extraites de la conversation
  return <UserFamilyTree userProfile={userProfile} actifs={actifs} />;
}
```

---

### `Actifs.jsx` — Gestion des actifs

Affiche tous les actifs filtrables par catégorie. Permet d'en ajouter manuellement.

**⚠️ Bug connu :** Les actifs ajoutés manuellement ne sont pas sauvegardés en `localStorage`. Un refresh les efface. À corriger :
```js
// Après setActifs dans addActif() :
LS.set('nesso_user_actifs', [...actifs, newActif]);
```

**⚠️ Bug connu :** `parseInt(form.valeur)` tronque les centimes et échoue sur `"150 000"` (espace). Utiliser `Number(form.valeur.replace(/\s/g, ''))`.

---

### `Aide.jsx` — Chat libre

Chat contextuel qui reçoit en prompt système la situation patrimoniale complète du membre sélectionné (pov). Inclut les règles fiscales françaises clés (abattements, AV, communauté universelle, etc.).

**⚠️ Bug connu :** L'historique n'est pas limité — coût tokens croissant à chaque message. Implémenter une fenêtre glissante de N derniers messages.

---

### `data.js` — Données démo

Contient :
- `FAMILLE` : 7 membres de la famille Martin fictive
- `ACTIFS` : 11 actifs (immobilier France/étranger, financier, exotique)
- `ACTIONS` : actions recommandées pour `lucas`, `mere`, `tante` — chacune avec un partenaire fictif
- `CALCULS` : chiffres succession/optimisation pour chaque membre
- `DEMO_SCRIPT` : réponses scriptées pour le mode démo (sans clé API)

---

### `utils.js` — Fonctions utilitaires

```js
euro(n)                          // Formate en euros FR
getPersonne(id)                  // Trouve un membre de FAMILLE par id
getPatrimoine(id, actifs)        // Somme les actifs d'un membre (quote-part)
getActifsByOwner(id, actifs)     // Filtre les actifs d'un membre
getProprietaireLabel(ids)        // "Lucas + Sophie"
getAlerts(id)                    // ⚠️ Utilise ACTIFS statiques, pas le state actuel
```

---

### `Shared.jsx` — Composants réutilisables

- `Badge` : étiquette urgence (rouge/orange/vert)
- `Skeleton` : placeholder de chargement
- `Modal` : modale accessible avec backdrop blur

---

## 5. Modèle de données

### Actif
```ts
{
  id: number,
  nom: string,
  categorie: 'immobilier' | 'financier' | 'professionnel' | 'exotique',
  valeur: number,           // En euros entiers
  type: string,             // "Résidence principale", "Assurance-vie", etc.
  pays: string,             // "France", "Italie", etc.
  proprietaires: string[],  // ["lucas"] ou ["lucas", "mere"]
  credit: boolean,
  note: string | null,
  beneficiaire: string | null
}
```

### Membre de famille (FAMILLE)
```ts
{
  id: string,           // 'lucas', 'mere', 'gp', 'user', etc.
  prenom: string,
  age: number,
  role: string,
  profession: string | null,
  regime: string | null, // Régime matrimonial
  generation: 0 | 1 | 2,
  handicap: boolean
}
```

### Profil utilisateur extrait (userProfile)
```ts
{
  prenom: string,
  conjoint: string | null,
  enfants_prenoms: string[],
  age: number | null,
  profession: string | null,
  regime: string | null,
  enfants: number,
  actifs: ActifExtrait[],
  objectifs: string | null,
  score: number,           // 30 (faible risque) → 90 (risque élevé)
  alertes: string[]
}
```

---

## 6. Failles et limites connues (audit V1)

| # | Fichier | Problème | Gravité |
|---|---|---|---|
| 1 | `api/anthropic.js` | Body non filtré — abus possible de la clé API | **Critique** |
| 2 | `api/anthropic.js` | Endpoint public sans auth ni rate limiting | **Critique** |
| 3 | `App.jsx` | `VITE_ANTHROPIC_API_KEY` exposé dans le bundle si défini | **Critique** |
| 4 | `Dashboard.jsx` | Barème de droits de succession inexact | Modérée |
| 5 | `Dashboard.jsx` | "Droits optimisés = 15% des droits bruts" arbitraire | Modérée |
| 6 | `Actifs.jsx` | Actifs manuels non persistés en localStorage | Modérée |
| 7 | `Actifs.jsx` | `parseInt` sur valeur monétaire (espace = bug) | Modérée |
| 8 | `utils.js` | `getAlerts` utilise ACTIFS statiques, pas le state | Modérée |
| 9 | `Aide.jsx` | Historique illimité → coût tokens croissant | Modérée |
| 10 | `Navbar.jsx` | Sélecteur POV toujours avec famille démo pour user réel | Mineure |

---

## 7. Migration vers un LLM open source (ex. Mistral)

### Ce qui change

Tout le code React reste identique. Seul le proxy serveur (`api/anthropic.js`) et les appels fetch changent.

### Étape 1 — Remplacer le proxy

```js
// api/llm.js (remplace api/anthropic.js)
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const apiKey = process.env.MISTRAL_API_KEY;

  const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: req.body.model || 'mistral-large-latest',
      messages: [
        { role: 'system', content: req.body.system },
        ...req.body.messages
      ],
      max_tokens: req.body.max_tokens || 500,
    }),
  });

  const data = await response.json();
  // Adapter la réponse au format Anthropic attendu par le front
  res.status(response.status).json({
    content: [{ text: data.choices?.[0]?.message?.content || '' }]
  });
}
```

### Étape 2 — Mettre à jour vercel.json

```json
{
  "rewrites": [
    { "source": "/anthropic/v1/messages", "destination": "/api/llm" }
  ]
}
```

Le front continue d'appeler `/anthropic/v1/messages` — aucun changement dans le code React.

### Étape 3 — Choisir le modèle Mistral

| Modèle | Usage recommandé | Coût |
|---|---|---|
| `mistral-small-latest` | Onboarding conversationnel | ~0.1€/1M tokens |
| `mistral-large-latest` | Extraction JSON, Aide patrimoniale | ~2€/1M tokens |
| `open-mistral-7b` | Auto-hébergé (HuggingFace/Ollama) | Coût infrastructure |

### Étape 4 — Adapter le prompt système si nécessaire

Le prompt Nesso est en français et générique. Mistral comprend très bien le français. Le token `[AUDIT_COMPLET]` fonctionne avec n'importe quel LLM instruct. Aucune adaptation majeure n'est requise.

### Alternative : Ollama (auto-hébergé, gratuit)

```js
// Remplacement du fetch dans le proxy :
const response = await fetch('http://localhost:11434/api/chat', {
  method: 'POST',
  body: JSON.stringify({
    model: 'mistral',
    messages: [{ role: 'system', content: req.body.system }, ...req.body.messages],
    stream: false,
  }),
});
const data = await response.json();
res.json({ content: [{ text: data.message.content }] });
```

Nécessite Ollama installé sur le serveur. Coût marginal nul, latence variable.

---

## 8. Palette de design

| Token | Valeur | Usage |
|---|---|---|
| Navy | `#1B2B4B` | Fond navbar, textes principaux, boutons primaires |
| Gold | `#C9A96E` | Accents, chiffres clés, logo |
| Cream | `#F5F0EA` | Fond page |
| White card | `white` + `box-shadow` | Cartes |
| Success | `#16A34A` | Économies, status positif |
| Warning | `#D97706` | Alertes orange |
| Danger | `#DC2626` | Alertes rouges |

**Typographie :**
- Titres : `Playfair Display` (serif, classe `.font-serif`)
- Corps : `Inter` (sans-serif)

---

*Document généré le 22 mai 2026 — Nesso V1*
