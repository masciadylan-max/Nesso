// ── MOTEUR DE CALCUL PATRIMONIAL — Nesso ─────────────────────────────────────
// Fonctions pures, sans dépendances React.
// Références légales : art. 777 CGI (succession), art. 977 CGI (IFI),
//                      art. 965 CGI (parts SCI), art. 669 CGI (nue-propriété).

// ── Barème progressif succession ligne directe (art. 777 CGI) ──────────────
export const calcDroitsBareme = (taxable) => {
  if (taxable <= 0) return 0;
  const tranches = [
    { plafond: 8072,     taux: 0.05 },
    { plafond: 12109,    taux: 0.10 },
    { plafond: 15932,    taux: 0.15 },
    { plafond: 552324,   taux: 0.20 },
    { plafond: 902838,   taux: 0.30 },
    { plafond: Infinity, taux: 0.45 },
  ];
  let droits = 0, base = 0;
  for (const { plafond, taux } of tranches) {
    const tranche = Math.min(taxable - base, plafond - base);
    if (tranche <= 0) break;
    droits += tranche * taux;
    base = plafond;
    if (base >= taxable) break;
  }
  return Math.round(droits);
};

// ── Barème IFI progressif (art. 977 CGI) ────────────────────────────────────
export const calcIFI = (net) => {
  if (net < 1300000) return 0;
  const tranches = [
    { debut: 800000,   fin: 1300000,  taux: 0.005  },
    { debut: 1300000,  fin: 2570000,  taux: 0.007  },
    { debut: 2570000,  fin: 5000000,  taux: 0.010  },
    { debut: 5000000,  fin: 10000000, taux: 0.0125 },
    { debut: 10000000, fin: Infinity, taux: 0.015  },
  ];
  let ifi = 0;
  for (const { debut, fin, taux } of tranches) {
    const tranche = Math.min(net, fin) - debut;
    if (tranche <= 0) continue;
    ifi += tranche * taux;
  }
  return Math.round(ifi);
};

// ── Base IFI — immo direct + parts de SCI à prépondérance immobilière ────────
// Art. 965 CGI : les parts de SCI sont taxables à l'IFI proportionnellement
// à la fraction immobilière de l'actif net de la SCI.
export const calcBaseIFI = (actifs) => (actifs || []).reduce((sum, a) => {
  if (a.categorie === 'immobilier') {
    const abattRP = a.type === 'Résidence principale' ? 0.30 : 0;
    return sum + (a.valeur || 0) * (1 - abattRP);
  }
  if (a.categorie === 'sci') {
    const ratio = typeof a.sci_immo_ratio === 'number' ? a.sci_immo_ratio : 0.9;
    return sum + (a.valeur || 0) * ratio;
  }
  return sum;
}, 0);

// ── Base de succession — applique la décote d'illiquidité sur les parts de SCI
// Le fisc accepte 10–15% de décote (illiquidité + contraintes statutaires).
// On retient 15% par prudence (conservative côté client = avantage réel).
export const calcBaseSuccession = (patrimoine, actifs) => {
  const sciDecote = (actifs || [])
    .filter(a => a.categorie === 'sci')
    .reduce((sum, a) => sum + Math.round((a.valeur || 0) * 0.15), 0);
  return Math.max(0, patrimoine - sciDecote);
};

// ── Barème nue-propriété art. 669 CGI ────────────────────────────────────────
// Retourne la fraction de la valeur vénale correspondant à la nue-propriété,
// selon l'âge de l'usufruitier (le parent qui garde l'usufruit).
export const calcTauxNuePropriete = (ageUsufruitier) => {
  if (!ageUsufruitier || ageUsufruitier < 21) return 0.10;
  if (ageUsufruitier <= 30) return 0.20;
  if (ageUsufruitier <= 40) return 0.30;
  if (ageUsufruitier <= 50) return 0.40;
  if (ageUsufruitier <= 60) return 0.50;
  if (ageUsufruitier <= 70) return 0.60;
  if (ageUsufruitier <= 80) return 0.70;
  if (ageUsufruitier <= 90) return 0.80;
  return 0.90;
};

// ── Score de risque successoral — calculé sur les vrais signaux ─────────────
export const computeScore = (userProfile, { patrimoine = 0, droitsStatusQuo = 0 } = {}) => {
  let score = 15; // baseline : toute situation non suivie comporte un risque résiduel
  const alertes    = (userProfile?.alertes || []).map(a => a.toLowerCase());
  const situation  = userProfile?.situation_civile || '';
  const regime     = userProfile?.regime || '';
  const testamentExistant = userProfile?.succession?.testament_existant;
  const hasAV      = (userProfile?.actifs || []).some(a => a.type === 'Assurance-vie');
  const userAge    = userProfile?.age || 45;
  const tmiNum     = parseInt(userProfile?.optimisation?.tmi) || 0;
  const revenus    = userProfile?.optimisation?.revenus_annuels_foyer || 0;
  const dispositifs = userProfile?.optimisation?.dispositifs_en_place || [];
  const perOuvert  = dispositifs.some(d => d.toLowerCase().includes('per'));
  const nbEnfants  = userProfile?.enfants || 0;

  // Risques critiques
  if ((situation === 'pacse' && !testamentExistant) || alertes.some(a => a.includes('pacs'))) score += 35;
  if (alertes.some(a => a.includes('concubinage'))) score += 35;
  if (alertes.some(a => a.includes('famille_recompos'))) score += 20;
  if (alertes.some(a => a.includes('international'))) score += 15;
  if (alertes.some(a => a.includes('ifi'))) score += 10;

  // Risques structurels
  if (situation === 'marie' && nbEnfants > 0 && !testamentExistant) score += 10;
  if (!hasAV && (userProfile?.actifs?.length || 0) > 0) score += 10;

  // Communauté universelle avec enfants : clause d'attribution intégrale à vérifier
  // (peut priver les enfants de leur réserve héréditaire)
  if (regime === 'universel' && nbEnfants > 0) score += 10;

  // Fenêtre fiscale AV qui se ferme (avant 70 ans)
  if (!hasAV && userAge >= 65) score += 15;  // < 5 ans pour agir
  if (!hasAV && userAge >= 68) score += 10;  // urgence critique

  // PER absent à TMI fort = levier majeur manqué
  if (!perOuvert && tmiNum >= 41 && revenus > 0) score += 10;

  // Droits successoraux élevés vs patrimoine (sous-assurance successorale)
  if (patrimoine > 0 && droitsStatusQuo > patrimoine * 0.20) score += 15;

  return Math.min(100, score);
};

// ── Calculs du tableau de bord — barèmes réels ──────────────────────────────
export const computeUserCalculs = (patrimoine, userProfile) => {
  const nbEnfants = userProfile?.enfants || 0;
  const situation  = userProfile?.situation_civile || '';

  // Base de succession après décote SCI (parts de SCI taxées sur 85% de leur valeur)
  const baseSuccession = calcBaseSuccession(patrimoine, userProfile?.actifs);

  // Droits de succession — ligne directe (art. 779 + 777 CGI)
  let droitsStatusQuo = 0;
  let droitsOptimise  = 0;

  if (nbEnfants > 0) {
    // Abattement 100 000€ par enfant — parts égales entre héritiers
    const partParEnfant      = Math.round(baseSuccession / nbEnfants);
    const taxableParEnfant   = Math.max(0, partParEnfant - 100000);
    droitsStatusQuo          = calcDroitsBareme(taxableParEnfant) * nbEnfants;

    // Optimisé : assurance-vie hors succession (152 500€/bénéficiaire) réduit la masse taxable
    const avHorsSuccession   = Math.min(baseSuccession * 0.35, 152500 * nbEnfants);
    const masseApresAV       = Math.max(0, baseSuccession - avHorsSuccession);
    const partOptimisee      = Math.round(masseApresAV / nbEnfants);
    const taxableOptimise    = Math.max(0, partOptimisee - 100000);
    droitsOptimise           = calcDroitsBareme(taxableOptimise) * nbEnfants;

  } else if (situation === 'marie' || situation === 'pacse') {
    // Conjoint/partenaire (avec testament) : exonéré → droits nuls
    // Sans testament pour PACS : succession aux parents (abattement 100k chacun, ligne directe)
    const parentsEnVie = userProfile?.parents_en_vie;
    if (situation === 'pacse' && !userProfile?.succession?.testament_existant && parentsEnVie) {
      const partParParent = Math.round(baseSuccession / 2);
      droitsStatusQuo     = calcDroitsBareme(Math.max(0, partParParent - 100000)) * 2;
      droitsOptimise      = Math.round(droitsStatusQuo * 0.5);
    }
    // Marié + pas d'enfants : conjoint exonéré, droits nuls
  } else {
    // Célibataire / concubin sans enfants
    const parentsEnVie = userProfile?.parents_en_vie;
    if (parentsEnVie) {
      // Succession aux parents : ligne directe ascendante, abattement 100k/parent
      const partParParent = Math.round(baseSuccession / 2);
      droitsStatusQuo     = calcDroitsBareme(Math.max(0, partParParent - 100000)) * 2;
    } else {
      // Fratrie : abattement 15 932€, taux 35-45%
      const fratrie       = Math.max(1, (userProfile?.famille?.fratrie || []).length);
      const partFratrie   = Math.round(baseSuccession / fratrie);
      const taxFratrie    = Math.max(0, partFratrie - 15932);
      const droitFratrie  = taxFratrie <= 24430
        ? Math.round(taxFratrie * 0.35)
        : Math.round(24430 * 0.35 + (taxFratrie - 24430) * 0.45);
      droitsStatusQuo     = droitFratrie * fratrie;
    }
    droitsOptimise = Math.round(droitsStatusQuo * 0.5); // AV + testament peuvent couvrir ~50%
  }

  // IFI — barème progressif (immo direct + SCI à prépondérance immobilière)
  const patrimoineImmoNet = calcBaseIFI(userProfile?.actifs);
  const ifi = calcIFI(patrimoineImmoNet);

  // IR estimé — TMI extrait par Haiku ou barème IR 2024
  const tmiStr  = userProfile?.optimisation?.tmi;
  const tmiNum  = parseInt(tmiStr) || 0;
  const revenus = userProfile?.optimisation?.revenus_annuels_foyer || 0;
  let ir = 0;
  if (revenus > 0) {
    if (tmiNum > 0) {
      // Taux effectif ≈ TMI × 0,55 (intègre les tranches inférieures et les abattements courants)
      ir = Math.round(revenus * (tmiNum / 100) * 0.55);
    } else {
      // Barème IR 2024 (une part) — approximation foyer monoactif
      const baremeIR = [
        { plafond: 11294,    taux: 0 },
        { plafond: 28797,    taux: 0.11 },
        { plafond: 82341,    taux: 0.30 },
        { plafond: 177106,   taux: 0.41 },
        { plafond: Infinity, taux: 0.45 },
      ];
      let irBrut = 0, prev = 0;
      for (const { plafond, taux } of baremeIR) {
        const tranche = Math.min(revenus - prev, plafond - prev);
        if (tranche <= 0) break;
        irBrut += tranche * taux;
        prev = plafond;
      }
      ir = Math.round(irBrut * 0.85); // -15% pour abattements et crédits courants
    }
  }

  // Prélèvements sociaux sur revenus financiers (17,2% sur rendement estimé 2%)
  const capitalFinancier = (userProfile?.actifs || [])
    .filter(a => a.categorie === 'financier')
    .reduce((s, a) => s + (a.valeur || 0), 0);
  const ps = Math.round(capitalFinancier * 0.02 * 0.172);

  const totalImpots = ir + ifi + ps;

  // Économie PER — plafond réel 2024 : 10% du revenu, min 4 114€, max 35 194€
  const dispositifs = userProfile?.optimisation?.dispositifs_en_place || [];
  const perOuvert   = dispositifs.some(d => d.toLowerCase().includes('per'));
  const plafondPER  = revenus > 0 ? Math.min(Math.max(revenus * 0.10, 4114), 35194) : 0;
  const economiePER = (!perOuvert && tmiNum >= 30 && revenus > 0)
    ? Math.round(plafondPER * (tmiNum / 100))
    : 0;

  return {
    droits: { statusQuo: droitsStatusQuo, optimise: droitsOptimise },
    economieSuccession: Math.max(0, droitsStatusQuo - droitsOptimise),
    impots: { IR: ir, IFI: ifi, PS: ps, total: totalImpots },
    economiesAnnuelles: economiePER,
    gainDixAns: economiePER * 10,
    score: computeScore(userProfile, { patrimoine, droitsStatusQuo }),
    successionEstimee: droitsStatusQuo,
  };
};

// ── Calcul droits GP → parents de l'utilisateur (maillon "au-dessus") ────────
// Répond à : "Que paient mes parents quand mes grands-parents décèdent ?"
// Hypothèse : 2 héritiers directs des GP (les 2 parents de l'user — 1 côté maternel + 1 côté paternel)
export const computeGPToParentsCalculs = (userProfile) => {
  const patrimoineGP = userProfile?.famille?.patrimoine_gp_estime || 0;
  if (!patrimoineGP) return null;

  const nbHeritiers   = 2; // estimation conservative — chaque branche reçoit 50%
  const partParParent = Math.round(patrimoineGP / nbHeritiers);
  const abattement    = 100000; // ligne directe GP → enfant (art. 779 CGI)

  const taxableStatuQuo = Math.max(0, partParParent - abattement);
  const droitsStatusQuo = calcDroitsBareme(taxableStatuQuo) * nbHeritiers;

  // Optimisé : AV des GP (avant 70 ans) + donation de leur vivant
  const avGPEstimee   = Math.min(patrimoineGP * 0.25, 152500 * nbHeritiers);
  const masseApresAV  = Math.max(0, patrimoineGP - avGPEstimee);
  const taxableOpt    = Math.max(0, Math.round(masseApresAV / nbHeritiers) - abattement);
  const droitsOptimise = calcDroitsBareme(taxableOpt) * nbHeritiers;

  return {
    droits: { statusQuo: droitsStatusQuo, optimise: droitsOptimise },
    economieSuccession: Math.max(0, droitsStatusQuo - droitsOptimise),
    impots: { IR: 0, IFI: 0, PS: 0, total: 0 },
    economiesAnnuelles: 0,
    gainDixAns: 0,
    score: computeScore(userProfile, { patrimoine: patrimoineGP, droitsStatusQuo }),
    successionEstimee: droitsStatusQuo,
    focusGP: { patrimoineGP, partParParent, nbHeritiers, abattement },
  };
};

// ── Calcul succession montante — Focus A (ce que l'user va recevoir) ─────────
// Raisonne sur le patrimoine des PARENTS (et des GP si présents),
// pas sur le patrimoine propre de l'utilisateur.
export const computeFocusACalculs = (userProfile) => {
  const patrimoineParents = userProfile?.famille?.patrimoine_parents_estime || 0;
  const patrimoineGP      = userProfile?.famille?.patrimoine_gp_estime || 0;
  const fratrie           = userProfile?.famille?.fratrie || [];
  const nbHeritiers       = Math.max(1, fratrie.length + 1); // user + fratrie

  // Abattement par héritier : 100 000€ × nb parents en vie
  // (chaque parent a son abattement propre, indépendant et renouvelable tous les 15 ans)
  // BUG FIX : Math.max(1, 0) donnait 1 quand nb_parents_en_vie = 0 → abattement incorrect.
  // Si aucun parent en vie → abattement 0 (succession déjà réglée ou hors focus A).
  const nbParentsEnVie  = userProfile?.famille?.nb_parents_en_vie ?? 1;
  const abattementTotal = nbParentsEnVie > 0 ? 100000 * nbParentsEnVie : 0;

  // Part de l'utilisateur dans la succession parentale (parts égales)
  const partUser = patrimoineParents > 0 ? Math.round(patrimoineParents / nbHeritiers) : 0;

  // Droits statu quo : part reçue − abattement(s) disponibles
  const taxableStatuQuo  = Math.max(0, partUser - abattementTotal);
  const droitsStatusQuo  = calcDroitsBareme(taxableStatuQuo);

  // Droits optimisés :
  //  • AV des parents (152 500€/bénéficiaire hors succession si versé avant 70 ans)
  //  • Donation de leur vivant (consomme l'abattement de 100k mais sur valeur actuelle)
  // Approximation : jusqu'à 30% du patrimoine parents peut passer via AV hors succession
  const avParentsEstimee = Math.min(patrimoineParents * 0.30, 152500);
  const masseApresAV     = Math.max(0, patrimoineParents - avParentsEstimee);
  const partOptimisee    = masseApresAV > 0 ? Math.round(masseApresAV / nbHeritiers) : 0;
  const taxableOptimise  = Math.max(0, partOptimisee - abattementTotal);
  const droitsOptimise   = calcDroitsBareme(taxableOptimise);

  // GP : si patrimoine GP connu, calculer les droits du saut de génération potentiel
  const gpVivants = userProfile?.famille?.gp_maternels_vivants || userProfile?.famille?.gp_paternels_vivants;
  const abattementGP     = 31786; // abattement GP→petit-enfant (art. 779 CGI)
  const taxableGP        = patrimoineGP > 0 ? Math.max(0, Math.round(patrimoineGP / nbHeritiers) - abattementGP) : 0;
  const droitsGPSiSaut   = patrimoineGP > 0 ? calcDroitsBareme(taxableGP) : 0;

  return {
    droits: { statusQuo: droitsStatusQuo, optimise: droitsOptimise },
    economieSuccession: Math.max(0, droitsStatusQuo - droitsOptimise),
    impots: { IR: 0, IFI: 0, PS: 0, total: 0 },
    economiesAnnuelles: 0,
    gainDixAns: 0,
    score: computeScore(userProfile, { patrimoine: patrimoineParents, droitsStatusQuo }),
    successionEstimee: droitsStatusQuo,
    // Métadonnées Focus A exposées à l'UI
    focusA: {
      patrimoineParents, partUser, nbHeritiers, nbParentsEnVie, abattementTotal,
      patrimoineGP, gpVivants, droitsGPSiSaut,
    },
  };
};
