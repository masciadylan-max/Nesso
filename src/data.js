// Famille fictive pour la démo — Famille Martin
export const FAMILLE = [
  { id: 'gp',    prenom: 'Henri',    age: 84, role: 'Grand-père maternel',   profession: null,                  regime: 'Communauté universelle', generation: 0, handicap: false },
  { id: 'gm',    prenom: 'Suzanne',  age: 80, role: 'Grand-mère maternelle', profession: null,                  regime: 'Communauté universelle', generation: 0, handicap: false },
  { id: 'mere',  prenom: 'Claire',   age: 57, role: 'Mère de Lucas',         profession: 'Femme au foyer',      regime: null,                    generation: 1, handicap: false },
  { id: 'tante', prenom: 'Sophie',   age: 52, role: 'Tante de Lucas',        profession: 'Fonctionnaire',       regime: null,                    generation: 1, handicap: true  },
  { id: 'pere',  prenom: 'Michel',   age: 60, role: 'Père de Lucas',         profession: 'Retraité 2 400€/mois', regime: null,                   generation: 1, handicap: false },
  { id: 'lucas', prenom: 'Lucas',    age: 34, role: 'Utilisateur principal', profession: 'Consultant indépendant', regime: null,                 generation: 2, handicap: false, isUser: true },
  { id: 'soeur', prenom: 'Camille',  age: 31, role: 'Sœur de Lucas',         profession: null,                  regime: 'Sans contrat (mariée)', generation: 2, handicap: false },
];

export const ACTIFS = [
  { id: 1, nom: 'Résidence principale Versailles', categorie: 'immobilier',    valeur: 520000, proprietaires: ['gp','gm'],     type: 'Résidence principale', pays: 'France',  credit: false, note: null,             beneficiaire: null },
  { id: 2, nom: 'Villa Porto Vecchio (2 lots)',    categorie: 'immobilier',    valeur: 65000,  proprietaires: ['gp','gm'],     type: 'Bien étranger',        pays: 'Italie',  credit: false, note: 'Non cadastré ⚠',  beneficiaire: null },
  { id: 3, nom: 'Maison Biarritz',                categorie: 'immobilier',    valeur: 240000, proprietaires: ['pere','mere'],  type: 'Résidence secondaire', pays: 'France',  credit: false, note: 'Payée',           beneficiaire: null },
  { id: 4, nom: 'Appartement Bordeaux',           categorie: 'immobilier',    valeur: 135000, proprietaires: ['tante'],       type: 'Résidence principale', pays: 'France',  credit: true,  note: 'Crédit en cours', beneficiaire: null },
  { id: 5, nom: 'Assurance-vie Grand-père',       categorie: 'financier',     valeur: 28000,  proprietaires: ['gp'],          type: 'Assurance-vie',        pays: null,      credit: false, note: null,              beneficiaire: 'Grand-mère (conjoint)' },
  { id: 6, nom: 'Assurance-vie Parents',          categorie: 'financier',     valeur: 35000,  proprietaires: ['pere','mere'], type: 'Assurance-vie',        pays: null,      credit: false, note: null,              beneficiaire: 'Conjoint survivant' },
  { id: 7, nom: 'Livrets & liquidités Parents',   categorie: 'financier',     valeur: 55000,  proprietaires: ['pere','mere'], type: 'Liquidités',           pays: null,      credit: false, note: null,              beneficiaire: null },
  { id: 8, nom: 'Épargne & liquidités Lucas',     categorie: 'financier',     valeur: 110000, proprietaires: ['lucas'],       type: 'Liquidités',           pays: null,      credit: false, note: null,              beneficiaire: null },
  { id: 9, nom: 'Société Lucas Conseil (SASU)',   categorie: 'professionnel', valeur: 22000,  proprietaires: ['lucas'],       type: 'Société',              pays: 'France',  credit: false, note: null,              beneficiaire: null },
  { id: 10, nom: 'Collection montres (Rolex x2)', categorie: 'exotique',     valeur: 28000,  proprietaires: ['lucas'],       type: 'Montre',               pays: 'France',  credit: false, note: 'Estimation 2024',  beneficiaire: null },
  { id: 11, nom: 'Or physique (lingots 500g)',    categorie: 'exotique',     valeur: 35000,  proprietaires: ['gp','gm'],     type: 'Métal précieux',       pays: 'France',  credit: false, note: 'Coffre-fort BNP',  beneficiaire: null },
];

export const ACTIONS = {
  lucas: [
    {
      urgence: 'rouge',
      titreGenerique: 'Donation internationale',
      titre: 'Donation Villa Porto Vecchio GP → Lucas',
      description: 'Les 2 lots en Italie (65 000€) ne sont pas cadastrés et restent dans une zone grise successorale. Une donation directe de votre grand-père à vous sécurise cet actif, l\'intègre à votre patrimoine et évite une double imposition franco-italienne. Votre grand-père a 84 ans — la fenêtre est courte.',
      economieLabel: 'Sécurise 65 000€ d\'actif',
      economie: 65000,
      coutLabel: '~2 000€ (notaire IT)',
      cout: 2000,
      delai: '< 3 mois',
      partenaire: { nom: 'Maison Droit & Patrimoine International', type: 'Avocat fiscaliste international partenaire', disponibilite: 'Sur rendez-vous' },
    },
    {
      urgence: 'orange',
      titreGenerique: 'Reconnaissance de dette',
      titre: 'Reconnaissance de dette Parents → Lucas',
      description: 'Les investissements réalisés par vos parents pour vous (formation, soutien à la création de votre société, apports divers) peuvent être formalisés en reconnaissance de dette. Cela protège 20 à 30 000€ en cas de partage successoral et évite toute requalification en donation rapportable.',
      economieLabel: 'Protège 20–30 000€',
      economie: 25000,
      coutLabel: '125€ (enregistrement fiscal)',
      cout: 125,
      delai: '< 6 mois',
      partenaire: { nom: 'Étude Lefebvre & Associés', type: 'Notaire patrimonial partenaire', disponibilite: 'Sous 1 semaine' },
    },
    {
      urgence: 'vert',
      titreGenerique: 'Estimation immobilière',
      titre: 'Estimation officielle RP Versailles',
      description: 'La résidence principale est valorisée à 520 000€ sur estimation informelle. Une estimation récente par un agent immobilier (gratuite) ou un notaire permettrait d\'affiner tous les calculs de droits de succession. Si la valeur réelle est inférieure, les économies peuvent dépasser 5 000€.',
      economieLabel: 'Affine tous les calculs',
      economie: 5000,
      coutLabel: 'Gratuit (agent immobilier)',
      cout: 0,
      delai: '6–12 mois',
      partenaire: { nom: 'Altus Patrimoine', type: 'Conseiller en gestion de patrimoine partenaire', disponibilite: 'Disponible immédiatement' },
    },
  ],
  mere: [
    {
      urgence: 'rouge',
      titreGenerique: 'Clause matrimoniale',
      titre: 'Vérifier clause attribution intégrale (GP/GM)',
      description: 'Vos parents ont un régime de communauté universelle. Si la clause d\'attribution intégrale est présente dans leur contrat de mariage, le premier décès ne génère aucun droit de succession — la totalité revient au survivant. À vérifier impérativement chez le notaire.',
      economieLabel: 'Économise ~12 000€ de droits',
      economie: 12000,
      coutLabel: 'Gratuit (vérification acte)',
      cout: 0,
      delai: '< 3 mois',
      partenaire: { nom: 'Office Notarial Beaumont', type: 'Notaire partenaire', disponibilite: 'Sous 1 semaine' },
    },
    {
      urgence: 'orange',
      titreGenerique: 'Testament / donation conjugale',
      titre: 'Testament ou donation entre époux',
      description: 'À 57 ans et sans revenus propres, il est important de formaliser vos droits sur le patrimoine conjugal (Biarritz, liquidités). Sans testament, vos droits légaux sont limités par la réserve héréditaire de vos enfants.',
      economieLabel: 'Protège vos droits sur Biarritz (120 000€)',
      economie: 50000,
      coutLabel: '~300€ (notaire)',
      cout: 300,
      delai: '< 6 mois',
      partenaire: { nom: 'Étude Lefebvre & Associés', type: 'Notaire patrimonial partenaire', disponibilite: 'Sous 1 semaine' },
    },
    {
      urgence: 'vert',
      titreGenerique: 'Assurance-vie',
      titre: 'Assurance-vie au nom du Père avant 70 ans',
      description: 'Votre mari (60 ans) peut encore effectuer des versements sur une assurance-vie avec abattement de 152 500€ par bénéficiaire hors succession. La fenêtre avant 70 ans se ferme dans 10 ans — anticiper permet d\'optimiser la transmission.',
      economieLabel: 'Optimise jusqu\'à 30 000€ de transmission',
      economie: 30000,
      coutLabel: 'Dépend des versements',
      cout: 0,
      delai: '< 2 ans',
      partenaire: { nom: 'Altus Patrimoine', type: 'Conseiller en gestion de patrimoine partenaire', disponibilite: 'Disponible immédiatement' },
    },
  ],
  tante: [
    {
      urgence: 'rouge',
      titreGenerique: 'Testament',
      titre: 'Rédiger un testament (appartement Bordeaux)',
      description: 'Sans enfants, votre appartement de Bordeaux (135 000€) ira à vos parents puis à vos neveux par défaut. Si vous souhaitez orienter cet héritage différemment (Lucas, Camille, association), un testament est indispensable.',
      economieLabel: 'Maîtrise la destination de 135 000€',
      economie: 0,
      coutLabel: '~300€ (notaire)',
      cout: 300,
      delai: '< 3 mois',
      partenaire: { nom: 'Office Notarial Beaumont', type: 'Notaire partenaire', disponibilite: 'Sous 1 semaine' },
    },
    {
      urgence: 'orange',
      titreGenerique: 'Renégociation de crédit',
      titre: 'Renégociation du crédit Bordeaux',
      description: 'Avec les taux actuels et votre statut de fonctionnaire (revenus stables), une renégociation du crédit ou un remboursement anticipé partiel peut réduire votre charge mensuelle et améliorer votre reste à vivre.',
      economieLabel: 'Jusqu\'à 5 000€ d\'économies',
      economie: 5000,
      coutLabel: 'Variable selon conditions',
      cout: 0,
      delai: '< 6 mois',
      partenaire: { nom: 'Cabinet Montaigne Fiscal', type: 'Fiscaliste partenaire', disponibilite: 'Sous 72h' },
    },
    {
      urgence: 'vert',
      titreGenerique: 'Assurance-vie',
      titre: 'Assurance-vie complémentaire (avant 70 ans)',
      description: 'Fonctionnaire avec droits à pension assurés, vous pouvez optimiser votre transmission via des versements sur assurance-vie. L\'abattement de 152 500€ par bénéficiaire est particulièrement avantageux pour transmettre à Lucas ou Camille.',
      economieLabel: 'Jusqu\'à 20 000€ optimisés',
      economie: 20000,
      coutLabel: 'Dépend des versements',
      cout: 0,
      delai: '6–12 mois',
      partenaire: { nom: 'Altus Patrimoine', type: 'Conseiller en gestion de patrimoine partenaire', disponibilite: 'Disponible immédiatement' },
    },
  ],
};

export const CALCULS = {
  lucas: {
    droits: { statusQuo: 12500, optimise: 2000 },
    economieSuccession: 10500,
    impots: { IR: 9200, IFI: 0, PS: 1800, total: 11000 },
    economiesAnnuelles: 2600,
    gainDixAns: 26000,
    score: 62,
    successionEstimee: 218000,
  },
  mere: {
    droits: { statusQuo: 12500, optimise: 0 },
    economieSuccession: 12500,
    impots: { IR: 0, IFI: 0, PS: 0, total: 0 },
    economiesAnnuelles: 0,
    gainDixAns: 0,
    score: 74,
    successionEstimee: 295000,
  },
  tante: {
    droits: { statusQuo: 0, optimise: 0 },
    economieSuccession: 0,
    impots: { IR: 22000, IFI: 0, PS: 0, total: 22000 },
    economiesAnnuelles: 2800,
    gainDixAns: 28000,
    score: 48,
    successionEstimee: 130000,
  },
  gp: { droits: { statusQuo: 0, optimise: 0 }, economieSuccession: 0, impots: { IR: 0, IFI: 0, PS: 0, total: 0 }, economiesAnnuelles: 0, gainDixAns: 0, score: 85, successionEstimee: 0 },
  gm: { droits: { statusQuo: 0, optimise: 0 }, economieSuccession: 0, impots: { IR: 0, IFI: 0, PS: 0, total: 0 }, economiesAnnuelles: 0, gainDixAns: 0, score: 85, successionEstimee: 0 },
  pere: { droits: { statusQuo: 12500, optimise: 2000 }, economieSuccession: 10500, impots: { IR: 13000, IFI: 0, PS: 3200, total: 16200 }, economiesAnnuelles: 3800, gainDixAns: 38000, score: 55, successionEstimee: 175000 },
  soeur: { droits: { statusQuo: 12500, optimise: 2000 }, economieSuccession: 10500, impots: { IR: 5500, IFI: 0, PS: 0, total: 5500 }, economiesAnnuelles: 1100, gainDixAns: 11000, score: 58, successionEstimee: 218000 },
};

// Réponses scriptées pour la démo (sans clé API)
export const DEMO_SCRIPT = [
  {
    trigger: 'default',
    response: `Bonjour ! Je suis votre conseiller patrimonial Nesso. Je suis là pour vous aider à comprendre et optimiser le patrimoine familial.

Pour commencer, pourriez-vous me dire votre niveau de connaissance en matière de patrimoine et de fiscalité ?

— **Novice** : je connais peu le sujet
— **Intermédiaire** : je comprends les bases
— **Expert** : je maîtrise les mécanismes fiscaux`,
  },
  {
    trigger: ['novice', 'débutant', 'pas grand chose', 'peu'],
    response: `Parfait, je vais adapter mes explications pour que tout soit clair et accessible — pas de jargon complexe.

Pour vous situer dans votre famille : êtes-vous plutôt dans la position d'un enfant qui anticipe la succession de ses parents, ou d'un parent qui souhaite organiser sa transmission ?`,
  },
  {
    trigger: ['intermédiaire', 'bases', 'un peu'],
    response: `Très bien. Je pourrai utiliser quelques termes techniques en les contextualisant.

Quelle est votre position dans la famille ? Êtes-vous l'enfant qui anticipe la succession, ou le parent qui organise sa transmission ?`,
  },
  {
    trigger: ['expert', 'maîtrise', 'fiscaliste', 'notaire', 'avocat'],
    response: `Excellent. On peut aller directement dans le détail — abattements, réserve héréditaire, régimes matrimoniaux, fiscalité internationale.

Quelle est votre position dans la chaîne successorale familiale ?`,
  },
  {
    trigger: ['enfant', 'fils', 'fille', 'hériter', 'succession parents'],
    response: `Bien compris.

Êtes-vous marié(e) ? Si oui, sous quel régime matrimonial ? Et avez-vous des enfants ?

⚠️ Ces éléments sont déterminants pour la réserve héréditaire et vos propres droits successoraux.`,
  },
  {
    trigger: ['immobilier', 'maison', 'appartement', 'résidence'],
    response: `Je note la présence de biens immobiliers.

Avez-vous des biens à l'étranger ? Si oui, dans quel pays ?

⚠️ **Alerte** : Un bien situé hors de France est soumis au règlement européen sur les successions (UE 650/2012) et peut entraîner une double imposition — c'est une priorité à anticiper.`,
  },
  {
    trigger: ['étranger', 'italie', 'espagne', 'portugal', 'international'],
    response: `⚠️ **Alerte fiscalité internationale détectée**

Un bien à l'étranger dans une succession franco-étrangère peut être taxé deux fois : en France ET dans le pays étranger. Il existe des conventions fiscales bilatérales pour l'éviter — mais elles doivent être anticipées.

Avez-vous des assurances-vie ? C'est souvent le levier d'optimisation le plus puissant.`,
  },
  {
    trigger: ['assurance', 'av ', 'assurance-vie', 'assurance vie'],
    response: `L'assurance-vie est le couteau suisse de la transmission patrimoniale en France.

Avant 70 ans : chaque bénéficiaire bénéficie d'un abattement de **152 500€** hors succession.
Après 70 ans : l'abattement global tombe à **30 500€** — toute la différence se joue avant cet âge.

Quel est votre objectif principal : optimiser votre succession, réduire vos impôts annuels, ou financer un projet ?`,
  },
  {
    trigger: ['succession', 'objectif', 'projet', 'optimiser', 'réduire'],
    response: `Votre profil commence à se dessiner clairement.

Laissez-moi vous préparer votre tableau de bord patrimonial avec les premières recommandations. Vous y retrouverez vos droits successoraux estimés, les économies possibles et vos actions prioritaires.

✦ Votre tableau de bord est prêt — cliquez sur "Voir mon tableau de bord" pour le découvrir.`,
  },
];
