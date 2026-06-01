export const EXTRACTION_PROMPT = `Extrais les données patrimoniales en JSON strict. Réponds UNIQUEMENT le JSON, sans markdown, sans texte avant/après.

PRINCIPE : ne JAMAIS renvoyer null/0/vide pour les champs critiques. Si une info manque, ESTIME le plus probable. Un tableau de bord vide est un échec.

RÈGLE ABSOLUE — PROPRIÉTÉ DES ACTIFS :
Le champ 'actifs' ne contient QUE les biens personnels de l'UTILISATEUR (la personne qui conduit cet audit).
Si la conversation a abordé les biens des parents, grands-parents, tante, oncle, frère ou sœur — même pour les optimiser — ces biens N'appartiennent PAS à l'utilisateur.
Mettre le patrimoine des ascendants dans 'famille.patrimoine_parents' et 'famille.patrimoine_gp'.
Compagne/concubin = conjoint si la conversation le confirme, mais ses actifs propres restent hors 'actifs' sauf si concubinage consolidé explicitement confirmé.

PÉRIMÈTRE PATRIMOINE :
- Si situation_civile = 'marie' ou 'pacse' : 'actifs' = biens du foyer (user + conjoint). JAMAIS les biens des parents/beaux-parents/fratrie.
- Si situation_civile = 'concubin' ou 'celibataire' : 'actifs' = UNIQUEMENT les biens propres de l'utilisateur.
- Un héritage attendu n'est PAS un actif actuel.

{
  "prenom": "prénom user ou 'Vous'",
  "conjoint": "prénom conjoint/compagne/partenaire ou null",
  "enfants_prenoms": [],
  "enfants": 0,
  "age": 45,
  "profession": "Cadre",
  "regime": "communaute|separation|participation|universel — défaut 'communaute' si marié",
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
    "fratrie": [{"prenom": "Marie", "lien": "sœur|frère", "handicap": false}],
    "autres": [{"prenom": "Claire", "lien": "tante|oncle|cousin"}],
    "patrimoine_parents_estime": 0,
    "patrimoine_gp_estime": 0,
    "gp_transmission_organisee": false,
    "gp_leviers_identifies": []
  },

RÈGLE nb_parents_en_vie : compter uniquement les parents BIOLOGIQUES/LÉGAUX en vie au moment de l'audit. Si les deux sont en vie → 2. Si seulement père ou seulement mère → 1. Si aucun → 0. Défaut si non précisé : 1.
RÈGLE pere_age / mere_age : extraire l'âge du père et de la mère s'il est mentionné dans la conversation (formulaire ou échange). Valeur entière. null si non précisé. Ces âges sont critiques pour les deadlines fiscales (AV avant 70 ans, don familial avant 80 ans).
RÈGLE gp_maternels_age / gp_paternels_age : âge du grand-parent vivant (ou âge moyen si deux vivants) de chaque côté. Valeur entière. null si non précisé ou aucun vivant de ce côté.
RÈGLE fratrie — OBLIGATOIRE : tout frère, sœur, demi-frère ou demi-sœur mentionné DOIT figurer dans fratrie (prénom ou 'Frère'/'Sœur' si inconnu, lien = 'frère'|'sœur'). NE PAS laisser fratrie à [] si des frères/sœurs ont été évoqués — même implicitement ("mes deux sœurs", "j'ai un frère"). Le nombre de membres dans fratrie détermine les parts héréditaires.

  "focus_principal": "Transmission parentale|Protection du partenaire|Transmission en famille recomposée|Protection des proches & transmission|IFI & optimisation immobilière|Optimisation rémunération & structure|Optimisation fiscale annuelle",
  "focus_audit": "succession|optimisation|les_deux",

  "succession": {
    "grands_parents_vivants": false,
    "grands_parents_patrimoine_estime": 0,
    "autres_parties_prenantes": [],
    "belle_famille_incluse": false,
    "belle_famille_patrimoine_estime": 0,
    "donations_passees": [{"de": "parent|user", "vers": "user|enfant", "montant": 0, "annee": 2020}],
    "testament_existant": false
  },

RÈGLE donations_passees — OBLIGATOIRE : toute mention de donation, virement important, aide à l'achat, paiement d'études ou avance sur héritage DOIT être inscrite. 'de' = 'parent' si reçue des parents, 'user' si donnée par l'utilisateur. montant = réel si précisé, 0 si inconnu. annee = exacte ou estimation. NE JAMAIS laisser à [] si une donation a été évoquée — le montant et la date impactent les abattements disponibles.

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
      "nom": "description courte",
      "categorie": "immobilier|financier|professionnel|sci|exotique",
      "valeur": 250000,
      "type": "Résidence principale|Résidence secondaire|Bien locatif|Bien étranger|SCI|Assurance-vie|PEA|PER|Liquidités|Société|Autre",
      "sci_immo_ratio": null,
      "av_clause": null,
      "pays": "France",
      "proprietaires": ["user"]
    }
  ],

RÈGLE av_clause : uniquement pour les actifs de type 'Assurance-vie'. 'standard' si clause générique ("mon conjoint à défaut mes enfants"), 'sur_mesure' si clause personnalisée mentionnée, 'inconnue' si non précisé (défaut). Null pour tout autre type d'actif.
RÈGLE SCI : si un actif est une SCI, utiliser categorie = 'sci' ET type = 'SCI'. sci_immo_ratio = fraction (0 à 1) de l'actif net de la SCI qui est immobilier. Si composition non connue → estimer 0.9 (SCI typiquement quasi-exclusivement immobilière). Exemple : SCI avec 500k€ d'immo + 50k€ de trésorerie → sci_immo_ratio = 0.91.

RÈGLE PROPRIETAIRES — obligatoire sur chaque actif :
- ["user"] si l'actif appartient uniquement à l'utilisateur
- ["conjoint"] si l'actif appartient uniquement au conjoint/partenaire
- ["user","conjoint"] si l'actif est détenu en commun (résidence principale d'un couple, compte joint…)
- ["enfant_0"], ["enfant_1"]… si l'actif appartient à un enfant
- Par défaut si inconnu : ["user"]

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
