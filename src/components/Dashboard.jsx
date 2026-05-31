import { useState, useEffect } from 'react';
import { CALCULS, ACTIONS } from '../data.js';
import { euro, getPersonne, getPatrimoine, filterActifsByPov } from '../utils.js';
import { Badge, Skeleton, Modal } from './Shared.jsx';

// ── Barème progressif succession ligne directe (art. 777 CGI) ──────────────
const calcDroitsBareme = (taxable) => {
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
const calcIFI = (net) => {
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
const calcBaseIFI = (actifs) => (actifs || []).reduce((sum, a) => {
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
const calcBaseSuccession = (patrimoine, actifs) => {
  const sciDecote = (actifs || [])
    .filter(a => a.categorie === 'sci')
    .reduce((sum, a) => sum + Math.round((a.valeur || 0) * 0.15), 0);
  return Math.max(0, patrimoine - sciDecote);
};

// ── Score de risque successoral — calculé sur les vrais signaux ─────────────
const computeScore = (userProfile) => {
  let score = 15; // baseline : toute situation non suivie comporte un risque résiduel
  const alertes = (userProfile?.alertes || []).map(a => a.toLowerCase());
  const situation = userProfile?.situation_civile || '';
  const testamentExistant = userProfile?.succession?.testament_existant;
  const hasAV = (userProfile?.actifs || []).some(a => a.type === 'Assurance-vie');

  // Risques critiques
  if ((situation === 'pacse' && !testamentExistant) || alertes.some(a => a.includes('pacs'))) score += 35;
  if (alertes.some(a => a.includes('concubinage'))) score += 35;
  if (alertes.some(a => a.includes('famille_recompos'))) score += 20;
  if (alertes.some(a => a.includes('international'))) score += 15;
  if (alertes.some(a => a.includes('ifi'))) score += 10;

  // Risques structurels
  if (situation === 'marie' && (userProfile?.enfants || 0) > 0 && !testamentExistant) score += 10;
  if (!hasAV && (userProfile?.actifs?.length || 0) > 0) score += 10;

  return Math.min(100, score);
};

// ── Calculs du tableau de bord — barèmes réels ──────────────────────────────
const computeUserCalculs = (patrimoine, userProfile) => {
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
        { plafond: 11294,   taux: 0 },
        { plafond: 28797,   taux: 0.11 },
        { plafond: 82341,   taux: 0.30 },
        { plafond: 177106,  taux: 0.41 },
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

  // Économie PER potentielle (si TMI ≥ 30% et PER non ouvert)
  const dispositifs = userProfile?.optimisation?.dispositifs_en_place || [];
  const perOuvert   = dispositifs.some(d => d.toLowerCase().includes('per'));
  const economiePER = (!perOuvert && tmiNum >= 30 && revenus > 0)
    ? Math.round(Math.min(revenus * 0.10, 10000) * (tmiNum / 100))
    : 0;

  return {
    droits: { statusQuo: droitsStatusQuo, optimise: droitsOptimise },
    economieSuccession: Math.max(0, droitsStatusQuo - droitsOptimise),
    impots: { IR: ir, IFI: ifi, PS: ps, total: totalImpots },
    economiesAnnuelles: economiePER,
    gainDixAns: economiePER * 10,
    score: computeScore(userProfile),
    successionEstimee: droitsStatusQuo,
  };
};

// ── Calcul succession montante — Focus A (ce que l'user va recevoir) ─────────
// Raisonne sur le patrimoine des PARENTS (et des GP si présents),
// pas sur le patrimoine propre de l'utilisateur.
const computeFocusACalculs = (userProfile) => {
  const patrimoineParents = userProfile?.famille?.patrimoine_parents_estime || 0;
  const patrimoineGP      = userProfile?.famille?.patrimoine_gp_estime || 0;
  const fratrie           = userProfile?.famille?.fratrie || [];
  const nbHeritiers       = Math.max(1, fratrie.length + 1); // user + fratrie

  // Abattement par héritier : 100 000€ × nb parents en vie
  // (chaque parent a son abattement propre, indépendant et renouvelable tous les 15 ans)
  const nbParentsEnVie  = Math.max(1, userProfile?.famille?.nb_parents_en_vie ?? 1);
  const abattementTotal = 100000 * nbParentsEnVie; // 100k si 1 parent, 200k si 2

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
    score: computeScore(userProfile),
    successionEstimee: droitsStatusQuo,
    // Métadonnées Focus A exposées à l'UI
    focusA: {
      patrimoineParents, partUser, nbHeritiers, nbParentsEnVie, abattementTotal,
      patrimoineGP, gpVivants, droitsGPSiSaut,
    },
  };
};

// ── Actions prioritaires — orientées par focus et alertes réelles ────────────
const generateUserActions = (userProfile, patrimoine) => {
  const actions   = [];
  const alertes   = (userProfile?.alertes || []).map(a => a.toLowerCase());
  const focus     = userProfile?.focus_audit || 'les_deux';
  const situation = userProfile?.situation_civile || '';
  const nbEnfants = userProfile?.enfants || 0;
  const testamentExistant = userProfile?.succession?.testament_existant;
  const tmiNum    = parseInt(userProfile?.optimisation?.tmi) || 0;
  const revenus   = userProfile?.optimisation?.revenus_annuels_foyer || 0;
  const dispositifs = userProfile?.optimisation?.dispositifs_en_place || [];
  const perOuvert = dispositifs.some(d => d.toLowerCase().includes('per'));
  const peaOuvert = dispositifs.some(d => d.toLowerCase().includes('pea'));
  const hasAV     = (userProfile?.actifs || []).some(a => a.type === 'Assurance-vie');
  const hasLocatif = (userProfile?.actifs || []).some(a => a.type === 'Bien locatif');
  const parentsEnVie   = userProfile?.parents_en_vie;
  const patrimoineParents = userProfile?.famille?.patrimoine_parents_estime || 0;
  const patrimoineGP   = userProfile?.famille?.patrimoine_gp_estime || 0;
  const gpVivants = userProfile?.famille?.gp_maternels_vivants || userProfile?.famille?.gp_paternels_vivants || userProfile?.succession?.grands_parents_vivants;
  // IFI : immo direct + SCI à prépondérance immobilière (source de vérité : calcBaseIFI)
  const patrimoineImmoNet = calcBaseIFI(userProfile?.actifs);

  // ── ALERTES CRITIQUES — rouge, toujours prioritaires ─────────────────────
  // IFI : source de vérité = calcul sur actifs réels (pas l'alerte Haiku qui peut être stale)
  if (patrimoineImmoNet > 1300000) {
    actions.push({ urgence: 'rouge', titreGenerique: 'Fiscalité IFI', titre: 'Bilan IFI obligatoire', description: "Votre patrimoine immobilier net dépasse 1,3M€ — vous êtes soumis à l'IFI (barème progressif de 0,5% à 1,5%). Un bilan précis avec un fiscaliste est indispensable pour évaluer votre base taxable et identifier les actifs exonérés (résidence principale à 30%, bois et forêts, biens professionnels).", economieLabel: 'Variable selon situation', economie: 0, coutLabel: '~500€ (fiscaliste)', cout: 500, delai: '< 3 mois', etapes: ["Lister tous vos actifs immobiliers et calculer le patrimoine net (hors dettes)", "Identifier les actifs exonérés (résidence principale -30%, biens pro, forêts)", "Calculer le passif déductible (emprunts, dettes liées aux actifs imposables)", "Mandater un fiscaliste pour sécuriser la déclaration IFI"], partenaire: { nom: 'Cabinet Montaigne Fiscal', type: 'Fiscaliste partenaire', disponibilite: 'Sous 72h' } });
  }
  if (alertes.some(a => a.includes('international'))) {
    actions.push({ urgence: 'rouge', titreGenerique: 'Fiscalité internationale', titre: 'Anticiper la fiscalité internationale', description: "Un bien à l'étranger dans une succession franco-étrangère peut être taxé deux fois. Le règlement UE 650/2012 et les conventions bilatérales peuvent éviter cette double imposition — à anticiper avant tout décès. Sans structuration préventive, la facture peut être considérable.", economieLabel: 'Évite la double imposition', economie: 0, coutLabel: '~800€ (notaire + fiscaliste)', cout: 800, delai: '< 6 mois', etapes: ["Identifier la loi applicable selon le règlement UE 650/2012", "Vérifier la convention bilatérale avec le pays concerné", "Évaluer une structuration préventive (SCI, trust, holding)", "Rédiger un certificat successoral européen si nécessaire"], partenaire: { nom: 'Maison Droit & Patrimoine International', type: 'Avocat fiscaliste international partenaire', disponibilite: 'Sur rendez-vous' } });
  }
  if ((situation === 'pacse' && !testamentExistant) || alertes.some(a => a.includes('pacs'))) {
    actions.push({ urgence: 'rouge', titreGenerique: 'Testament PACS', titre: 'Rédiger un testament — urgence absolue', description: "Sans testament, votre partenaire de PACS n'hérite légalement de rien. Tous vos biens iraient à vos héritiers légaux (parents, fratrie). Un testament olographe peut être rédigé cette semaine, gratuitement — c'est la priorité absolue.", economieLabel: '100% du patrimoine protégé', economie: 0, coutLabel: 'Gratuit (olographe) ou ~150€ (notarié)', cout: 0, delai: 'Cette semaine', etapes: ["Rédiger un testament olographe (entièrement manuscrit, daté, signé)", "Le déposer chez un notaire pour enregistrement au FCDDV", "Revoir simultanément la clause bénéficiaire de vos assurances-vie", "Envisager un testament authentique si patrimoine > 200k€"], partenaire: { nom: 'Étude Lefebvre & Associés', type: 'Notaire partenaire', disponibilite: 'Sous 1 semaine' } });
  }
  if (alertes.some(a => a.includes('concubinage'))) {
    actions.push({ urgence: 'rouge', titreGenerique: 'Protection concubin', titre: 'Protéger votre concubin(e) — 60% de droits de succession', description: "En concubinage, votre partenaire est fiscalement un étranger : abattement de 1 594€ seulement et 60% de droits de succession sur tout ce qu'il reçoit. Testament + assurance-vie sont les deux seuls leviers pour transmettre sans détruire le capital.", economieLabel: 'Évite 60% de droits de succession', economie: 0, coutLabel: '~200€ (notaire + AV)', cout: 200, delai: '< 1 mois', etapes: ["Rédiger un testament pour léguer vos biens à votre concubin", "Ouvrir une assurance-vie avec votre concubin comme bénéficiaire (152 500€ exonérés)", "Étudier l'opportunité du PACS (droits successoraux considérablement améliorés)", "Considérer une clause tontinière sur le bien immobilier commun"], partenaire: { nom: 'Étude Lefebvre & Associés', type: 'Notaire partenaire', disponibilite: 'Sous 1 semaine' } });
  }
  if (alertes.some(a => a.includes('famille_recompos') || a.includes('recompos'))) {
    actions.push({ urgence: 'rouge', titreGenerique: 'Famille recomposée', titre: 'Sécuriser la transmission en famille recomposée', description: "Sans testament, votre conjoint n'hérite que de l'usufruit d'un quart de vos biens (art. 757 CC) — le reste va à vos enfants, y compris d'une union précédente. Ce mécanisme peut créer une indivision forcée entre votre conjoint et vos enfants.", economieLabel: 'Protège le conjoint survivant', economie: 0, coutLabel: '~400€ (notaire)', cout: 400, delai: '< 3 mois', etapes: ["Dresser l'inventaire complet avec tous les enfants de chaque union", "Consulter un notaire spécialisé en familles recomposées", "Rédiger un testament avec clause de préciput en faveur du conjoint", "Étudier l'adoption simple des beaux-enfants si égalité de traitement souhaitée"], partenaire: { nom: 'Étude Lefebvre & Associés', type: 'Notaire partenaire', disponibilite: 'Sous 1 semaine' } });
  }

  // ── FOCUS A — Transmission parentale (ce qu'ils vont recevoir) ────────────
  if (focus === 'succession' || focus === 'les_deux') {
    // Saut de génération si GP vivants avec patrimoine significatif
    if (gpVivants && patrimoineGP > 100000) {
      const fratrie = (userProfile?.famille?.fratrie || []).length;
      const nbPetitsEnfants = 1 + fratrie; // utilisateur + fratrie
      actions.push({
        urgence: 'orange', titreGenerique: 'Saut de génération',
        titre: 'Étudier le saut de génération avec vos grands-parents',
        description: `Vos grands-parents ont un patrimoine estimé à ${euro(patrimoineGP)}. Si ce patrimoine transite GP → parents → vous, il sera taxé deux fois. Une donation directe GP → petits-enfants (abattement propre de 31 786€/petit-enfant, tous les 15 ans) évite cette double imposition sur un même actif.`,
        economieLabel: 'Évite la double imposition sur la même valeur', economie: 0, coutLabel: '~300€ (notaire)', cout: 300, delai: '< 6 mois',
        etapes: [
          `Calculer les droits avec double transmission (GP→parent : ${nbPetitsEnfants > 1 ? `abattement partagé entre ${nbPetitsEnfants} petits-enfants` : 'abattement 31 786€'}) vs donation directe`,
          "Identifier le bien le plus adapté au saut de génération (hors bien avec affect fort pour les parents)",
          "Vérifier l'accord des parents — ils renoncent à une partie de leur héritage",
          "Formaliser par acte de donation notarié"
        ],
        partenaire: { nom: 'Étude Lefebvre & Associés', type: 'Notaire patrimonial partenaire', disponibilite: 'Sous 1 semaine' }
      });
    }
    // Anticiper la transmission des parents si patrimoine significatif et non organisé
    if (parentsEnVie && patrimoineParents > 150000) {
      actions.push({
        urgence: 'orange', titreGenerique: 'Transmission parentale',
        titre: 'Anticiper la transmission du patrimoine de vos parents',
        description: `Le patrimoine de vos parents (estimé à ${euro(patrimoineParents)}) peut être optimisé dès maintenant. Chaque parent peut donner 100 000€ par enfant tous les 15 ans, sans droits. Une donation organisée avec un notaire, faite aujourd'hui, réduit la base taxable future — et gèle les valeurs si c'est une donation-partage.`,
        economieLabel: "Jusqu'à 100 000€ par parent, par enfant exonérés", economie: 0, coutLabel: '~400–800€ (notaire)', cout: 600, delai: '< 12 mois',
        etapes: [
          "Inventorier les actifs transmissibles des parents (immo, AV, financier)",
          "Vérifier le rappel fiscal : donations < 15 ans à déduire de l'abattement",
          "Étudier une donation avec réserve d'usufruit pour les actifs immobiliers (parents gardent les revenus)",
          "Envisager une donation-partage pour geler les valeurs et éviter les conflits entre héritiers"
        ],
        partenaire: { nom: 'Étude Lefebvre & Associés', type: 'Notaire patrimonial partenaire', disponibilite: 'Sous 1 semaine' }
      });
    }
    // Rappel fiscal : donations passées approchant les 15 ans
    const now = new Date().getFullYear();
    const donationsAnciennetes = (userProfile?.succession?.donations_passees || [])
      .filter(d => d.annee && (now - d.annee) >= 10);
    if (donationsAnciennetes.length > 0) {
      const annee = donationsAnciennetes[0].annee;
      actions.push({
        urgence: 'orange', titreGenerique: 'Rappel fiscal donations',
        titre: `Fenêtre fiscale — votre abattement se renouvelle vers ${annee + 15}`,
        description: `Une donation reçue en ${annee} consomme votre abattement de 100 000€ jusqu'en ${annee + 15}. Si vos parents ou grands-parents ont d'autres actifs à transmettre, la fenêtre se rouvre dans ${(annee + 15) - now} an${(annee + 15) - now > 1 ? 's' : ''}. À anticiper pour optimiser le timing.`,
        economieLabel: 'Optimise le timing des transmissions futures', economie: 0, coutLabel: 'Gratuit (consultation)', cout: 0, delai: `Avant ${annee + 15}`,
        etapes: [
          "Lister toutes les donations reçues et leurs dates d'enregistrement",
          "Calculer la date exacte de renouvellement de l'abattement par donateur",
          "Anticiper la prochaine donation pour profiter du plein abattement",
          "Vérifier si le don familial en numéraire (31 865€) est encore disponible"
        ],
        partenaire: { nom: 'Étude Lefebvre & Associés', type: 'Notaire partenaire', disponibilite: 'Sous 1 semaine' }
      });
    }
  }

  // ── FOCUS C — Optimisation fiscale ───────────────────────────────────────
  if (focus === 'optimisation' || focus === 'les_deux') {
    // PER si TMI ≥ 30% et non ouvert
    if (!perOuvert && tmiNum >= 30 && revenus > 0) {
      const economie = Math.round(Math.min(revenus * 0.10, 10000) * (tmiNum / 100));
      actions.push({
        urgence: 'orange', titreGenerique: 'PER',
        titre: `Ouvrir un PER — ${euro(economie)}/an d'impôt en moins`,
        description: `À ${tmiNum}% de TMI, chaque euro versé sur un PER réduit votre impôt de ${tmiNum} centimes. Sur 10 000€ versés cette année : ${euro(Math.round(10000 * tmiNum / 100))} d'économies immédiates. Le capital sort à la retraite, souvent à un TMI plus faible — et reste hors succession si décès avant retraite.`,
        economieLabel: `${euro(economie)} d'impôt économisé/an`, economie, coutLabel: 'Gratuit (ouverture)', cout: 0, delai: '< 1 mois',
        etapes: [
          "Trouver votre plafond épargne retraite disponible (ligne 6QS de votre avis d'imposition)",
          "Ouvrir un PER individuel (Linxea Spirit, Nalo, Boursorama Retraite...)",
          "Verser avant le 31 décembre pour déduire sur l'année fiscale en cours",
          "Calculer l'arbitrage PER vs assurance-vie selon votre horizon de retraite"
        ],
        partenaire: { nom: 'Altus Patrimoine', type: 'Conseiller en gestion de patrimoine partenaire', disponibilite: 'Disponible immédiatement' }
      });
    }
    // Dirigeant : Dutreil
    if (alertes.some(a => a.includes('dutreil'))) {
      actions.push({
        urgence: 'orange', titreGenerique: 'Pacte Dutreil',
        titre: "Anticiper la transmission d'entreprise — Pacte Dutreil",
        description: "Le Pacte Dutreil permet de transmettre votre entreprise avec 75% d'exonération de droits. Mais l'engagement collectif de conservation doit durer 2 ans minimum avant la transmission. Plus vous attendez, plus vous perdez en flexibilité sur le timing.",
        economieLabel: "75% d'exonération sur la valeur de l'entreprise", economie: 0, coutLabel: '~1 000€ (avocat + notaire)', cout: 1000, delai: '< 6 mois',
        etapes: [
          "Faire évaluer la société par un expert-comptable ou commissaire aux comptes",
          "Identifier les associés éligibles pour l'engagement collectif (2 ans minimum)",
          "Préparer la transmission via donation ou cession aux héritiers",
          "Formaliser avec un avocat fiscaliste spécialisé Dutreil"
        ],
        partenaire: { nom: 'Cabinet Montaigne Fiscal', type: 'Fiscaliste partenaire', disponibilite: 'Sous 72h' }
      });
    }
    // Immo locatif + TMI ≥ 30% : LMNP ou déficit foncier
    if (hasLocatif && tmiNum >= 30) {
      actions.push({
        urgence: 'orange', titreGenerique: 'Optimisation locatif',
        titre: 'Optimiser la fiscalité de votre bien locatif',
        description: `En location nue, vos revenus fonciers sont taxés à ${tmiNum}% + 17,2% de prélèvements sociaux. Le passage en LMNP (location meublée) permet d'amortir le bien comptablement et de ramener vos revenus locatifs imposables à zéro — sans changer vos loyers réels.`,
        economieLabel: 'Revenus locatifs défiscalisés', economie: 0, coutLabel: '~500€ (expert-comptable)', cout: 500, delai: '< 6 mois',
        etapes: [
          "Vérifier la faisabilité du passage en meublé (bail, règlement de copropriété)",
          "Mandater un expert-comptable pour établir un tableau d'amortissement",
          "Calculer le déficit foncier reportable si location nue maintenue (imputable 10 700€/an sur revenus globaux)",
          "Arbitrer LMNP amortissement vs déficit foncier selon votre TMI et votre horizon de détention"
        ],
        partenaire: { nom: 'Cabinet Montaigne Fiscal', type: 'Fiscaliste partenaire', disponibilite: 'Sous 72h' }
      });
    }
    // PEA si non ouvert — démarrer l'horloge fiscale
    if (!peaOuvert && patrimoine > 0) {
      actions.push({
        urgence: 'vert', titreGenerique: 'PEA',
        titre: 'Ouvrir un PEA — déclencher l\'horloge fiscale maintenant',
        description: "Après 5 ans, les plus-values de votre PEA sont exonérées d'impôt (hors prélèvements sociaux 17,2%). Plafond : 150 000€/personne. L'horloge fiscale commence à la date d'ouverture — un versement symbolique aujourd'hui vous met en avance sur la fiscalité de demain.",
        economieLabel: 'Plus-values exonérées après 5 ans', economie: 0, coutLabel: 'Gratuit (ouverture)', cout: 0, delai: '< 1 mois',
        etapes: [
          "Ouvrir un PEA en ligne (Fortuneo, Boursorama, Bourse Direct — 0€ de frais d'ouverture)",
          "Verser même un montant symbolique (1€ suffit) pour démarrer l'horloge fiscale",
          "Investir progressivement en ETF World pour optimiser le couple risque/rendement",
          "Maximiser avant 150 000€ avant tout autre véhicule d'investissement boursier"
        ],
        partenaire: { nom: 'Altus Patrimoine', type: 'Conseiller en gestion de patrimoine partenaire', disponibilite: 'Disponible immédiatement' }
      });
    }
  }

  // ── AV — levier universel si non ouvert ──────────────────────────────────
  if (!hasAV && patrimoine > 0) {
    actions.push({
      urgence: 'vert', titreGenerique: 'Assurance-vie',
      titre: 'Ouvrir une assurance-vie — 152 500€ hors succession par bénéficiaire',
      description: "L'assurance-vie est le levier successoral le plus puissant en France. Les sommes versées avant 70 ans sortent hors succession : 152 500€ exonérés par bénéficiaire désigné. La clause bénéficiaire, rédigée sur mesure, peut protéger un concubin, équilibrer entre enfants, ou favoriser un proche.",
      economieLabel: "152 500€/bénéficiaire transmissibles hors succession", economie: 0, coutLabel: 'Gratuit (ouverture)', cout: 0, delai: '< 3 mois',
      etapes: [
        "Ouvrir un contrat multisupport chez un assureur sérieux (Linxea, Boursorama Vie, Suravenir)",
        "Rédiger une clause bénéficiaire sur mesure — éviter la clause standard 'mon conjoint, à défaut mes enfants'",
        "Alimenter avant 70 ans pour bénéficier du plein abattement de 152 500€",
        "Réviser la clause à chaque changement de situation familiale (mariage, divorce, naissance)"
      ],
      partenaire: { nom: 'Altus Patrimoine', type: 'Conseiller en gestion de patrimoine partenaire', disponibilite: 'Disponible immédiatement' }
    });
  }

  // ── Fallback si aucune action spécifique ─────────────────────────────────
  if (actions.length === 0) {
    actions.push({
      urgence: 'vert', titreGenerique: 'Bilan patrimonial',
      titre: 'Planifier un bilan patrimonial annuel',
      description: "Votre situation ne présente pas de signal d'alerte immédiat. Un bilan patrimonial annuel avec un conseiller permet d'anticiper les évolutions législatives, les changements de situation familiale ou professionnelle, et d'adapter votre stratégie en continu.",
      economieLabel: 'Stratégie patrimoniale proactive', economie: 0, coutLabel: '~500€/an (CGP)', cout: 500, delai: '< 6 mois',
      etapes: null, partenaire: { nom: 'Altus Patrimoine', type: 'Conseiller en gestion de patrimoine partenaire', disponibilite: 'Disponible immédiatement' }
    });
  }

  const ordre = { rouge: 0, orange: 1, vert: 2 };
  actions.sort((a, b) => (ordre[a.urgence] ?? 3) - (ordre[b.urgence] ?? 3));
  return actions.slice(0, 3);
};

export default function Dashboard({ pov, actifs, userProfile, onRefairAudit }) {
  // Ouvre le bon onglet selon le focus choisi par l'user en Phase 2 de l'audit
  const initialTab = userProfile?.focus_audit === 'optimisation' ? 'optimisation' : 'succession';
  const [tab, setTab] = useState(initialTab);
  // Re-synchroniser si l'user fait un nouvel audit (focus_audit peut changer)
  useEffect(() => {
    if (userProfile?.focus_audit === 'optimisation') setTab('optimisation');
    else if (userProfile?.focus_audit === 'succession') setTab('succession');
  }, [userProfile?.focus_audit]);
  const [selectedAction, setSelectedAction] = useState(null);
  const [showNessoPlus, setShowNessoPlus] = useState(false);
  const [loading, setLoading] = useState(true);

  // POV 'foyer' = vue consolidée du ménage (user + conjoint)
  const isFoyerPov  = pov === 'foyer' && userProfile;
  const isUserPov   = (pov === 'user' || isFoyerPov) && userProfile;
  // Détecte les POV "famille de l'user" extraits de l'audit (conjoint, enfant_0, enfant_1...)
  // On a peu d'infos sur eux : on affichera une vue limitée + CTA Nesso+ / espace dédié.
  const isFamilyMemberPov = userProfile && (pov === 'conjoint' || pov.startsWith?.('enfant_'));
  // POV Nesso+ verrouillés
  const isLockedPov = pov === 'parents' || pov === 'grands_parents';

  // Vue Nesso+ verrouillée (parents / grands-parents)
  if (isLockedPov) {
    const lockedLabel = pov === 'parents' ? 'Mes parents' : 'Mes grands-parents';
    return (
      <div style={{ maxWidth: 960, margin: '0 auto', padding: '36px 24px 100px' }} className="fade-in">
        <div className="card" style={{ padding: 40, textAlign: 'center', background: 'linear-gradient(135deg, #FFFDF9 0%, #FFF8EE 100%)', border: '1px solid #FDE8C8' }}>
          <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#1B2B4B', color: '#C9A96E', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, margin: '0 auto 18px' }}>🔒</div>
          <h2 className="font-serif" style={{ color: '#1B2B4B', fontSize: 26, margin: '0 0 12px' }}>{lockedLabel}</h2>
          <p style={{ color: '#6B7280', fontSize: 14, lineHeight: 1.7, maxWidth: 500, margin: '0 auto 24px' }}>
            L'analyse du patrimoine de vos {lockedLabel.toLowerCase()} et la simulation de la transmission sur deux générations sont disponibles avec <strong>Nesso+</strong>.
          </p>
          <div style={{ display: 'inline-block', background: '#1B2B4B', color: '#C9A96E', padding: '10px 24px', borderRadius: 20, fontSize: 13, fontWeight: 600, letterSpacing: '0.05em' }}>
            ✦ Disponible avec Nesso+
          </div>
        </div>
      </div>
    );
  }

  // Vue limitée pour conjoint / enfants (peu de données disponibles)
  if (isFamilyMemberPov) {
    const memberName = pov === 'conjoint'
      ? (userProfile.conjoint || 'Conjoint(e)')
      : (userProfile.enfants_prenoms?.[parseInt(pov.split('_')[1], 10)] || 'Enfant');
    const memberRole = pov === 'conjoint' ? 'Conjoint(e)' : 'Enfant';

    return (
      <div style={{ maxWidth: 960, margin: '0 auto', padding: '36px 24px 100px' }} className="fade-in">
        <div style={{ marginBottom: 32 }}>
          <p style={{ color: '#C9A96E', fontSize: 12, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 6 }}>Tableau de bord — Vue limitée</p>
          <h1 className="font-serif" style={{ color: '#1B2B4B', fontSize: 34, fontWeight: 700, margin: 0 }}>
            {memberName} <span style={{ color: '#C9A96E' }}>✦</span>
          </h1>
          <p style={{ color: '#7A7A8C', marginTop: 6, fontSize: 14 }}>{memberRole} · Profil non détaillé</p>
        </div>

        <div className="card" style={{ padding: 36, textAlign: 'center', background: 'linear-gradient(135deg, #FFFDF9 0%, #FFF8EE 100%)', border: '1px solid #FDE8C8' }}>
          <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#1B2B4B', color: '#C9A96E', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, margin: '0 auto 18px' }}>🔒</div>
          <h2 className="font-serif" style={{ color: '#1B2B4B', fontSize: 24, margin: '0 0 12px' }}>Profil non détaillé</h2>
          <p style={{ color: '#6B7280', fontSize: 14, lineHeight: 1.7, maxWidth: 520, margin: '0 auto 24px' }}>
            Vous avez mentionné <strong>{memberName}</strong> lors de votre audit, mais nous n'avons pas encore les informations nécessaires pour générer un tableau personnalisé à son point de vue (revenus, actifs propres, objectifs, donations reçues...).
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14, maxWidth: 560, margin: '0 auto 24px' }}>
            <div style={{ background: 'white', borderRadius: 10, padding: 18, border: '1px solid #FDE8C8' }}>
              <p style={{ color: '#C9A96E', fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', margin: '0 0 8px' }}>✦ Nesso+</p>
              <p style={{ color: '#1B2B4B', fontSize: 13, fontWeight: 600, margin: '0 0 4px' }}>Détailler depuis votre compte</p>
              <p style={{ color: '#7A7A8C', fontSize: 12, lineHeight: 1.55, margin: 0 }}>Étendez l'audit aux profils de votre famille (sous votre supervision).</p>
            </div>
            <div style={{ background: 'white', borderRadius: 10, padding: 18, border: '1px solid #E5E7EB' }}>
              <p style={{ color: '#7A7A8C', fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', margin: '0 0 8px' }}>◐ Espace dédié</p>
              <p style={{ color: '#1B2B4B', fontSize: 13, fontWeight: 600, margin: '0 0 4px' }}>Inviter {memberName} sur Nesso</p>
              <p style={{ color: '#7A7A8C', fontSize: 12, lineHeight: 1.55, margin: 0 }}>{memberName} crée son propre compte et fait son propre audit.</p>
            </div>
          </div>

          <p style={{ color: '#A8A8B8', fontSize: 12, fontStyle: 'italic', margin: 0 }}>
            Ces deux options seront disponibles dans une prochaine version.
          </p>
        </div>
      </div>
    );
  }

  // Actifs filtrés pour ce POV (évite la fusion des patrimoines)
  const povActifs = filterActifsByPov(actifs, pov);

  const person = isUserPov
    ? {
        prenom: isFoyerPov
          ? `${userProfile.prenom || 'Vous'}${userProfile.conjoint ? ` + ${userProfile.conjoint}` : ''}`
          : (userProfile.prenom || 'Vous'),
        age: userProfile.age, role: isFoyerPov ? 'Foyer' : 'Utilisateur', profession: userProfile.profession,
      }
    : (getPersonne(pov) || { prenom: 'Inconnu', age: null, role: '—', profession: null });

  // Calcul du patrimoine sur les actifs filtrés du POV
  const patrimoine = getPatrimoine(pov, povActifs);
  // computeUserCalculs a besoin du userProfile avec les actifs filtrés pour IFI
  const userProfileForPov = isUserPov ? { ...userProfile, actifs: povActifs } : null;

  // Focus A (Transmission parentale) → calcul sur le patrimoine des parents, pas de l'user
  const isFocusA = isUserPov
    && userProfile?.focus_principal === 'Transmission parentale'
    && (userProfile?.famille?.patrimoine_parents_estime || 0) > 0;

  const calculs = isUserPov
    ? (isFocusA ? computeFocusACalculs(userProfileForPov) : computeUserCalculs(patrimoine, userProfileForPov))
    : (CALCULS[pov] || CALCULS.lucas);
  const actions = isUserPov ? generateUserActions(userProfileForPov, patrimoine) : (ACTIONS[pov] || ACTIONS.lucas);

  // Total toutes économies identifiées (succession + actions chiffrées)
  const totalEconomiesActions = actions.reduce((sum, a) => sum + (a.economie > 0 ? a.economie : 0), 0);
  const totalEconomies = Math.max(calculs.economieSuccession, totalEconomiesActions);

  // Freemium — hardcodé false en V1, à connecter au vrai état d'abonnement
  const isNessoPlus = false;
  const NessoBadge = () => (
    <span style={{ background: '#1B2B4B', color: '#C9A96E', fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 4, letterSpacing: '0.06em', verticalAlign: 'middle', marginLeft: 6 }}>NESSO+</span>
  );

  useEffect(() => {
    setLoading(true);
    const t = setTimeout(() => setLoading(false), 500);
    return () => clearTimeout(t);
  }, [pov]);

  const scoreColor = calculs.score > 70 ? '#E24B4A' : calculs.score > 50 ? '#F59E0B' : '#10B981';
  const scoreLabel = calculs.score > 70 ? 'Risque élevé' : calculs.score > 50 ? 'Risque modéré' : 'Risque faible';

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '36px 24px 100px' }} className="fade-in">

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 36, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <p style={{ color: '#C9A96E', fontSize: 12, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 6 }}>
            {isFoyerPov ? 'Vue consolidée du foyer' : 'Tableau de bord'}
          </p>
          <h1 className="font-serif" style={{ color: '#1B2B4B', fontSize: 34, fontWeight: 700, margin: 0 }}>
            {isFoyerPov ? person?.prenom : `Bonjour, ${person?.prenom}`} <span style={{ color: '#C9A96E' }}>✦</span>
          </h1>
          <p style={{ color: '#7A7A8C', marginTop: 6, fontSize: 14 }}>
            Situation patrimoniale au {new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
        {onRefairAudit && (
          <button onClick={onRefairAudit}
            style={{ background: 'white', border: '1px solid #E5E7EB', color: '#6B7280', borderRadius: 9, padding: '9px 18px', fontSize: 13, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', display: 'flex', alignItems: 'center', gap: 7, whiteSpace: 'nowrap', flexShrink: 0 }}>
            ↺ Refaire mon audit
          </button>
        )}
      </div>

      {/* 3 cartes du haut */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 18, marginBottom: 24 }}>

        <div className="card" style={{ padding: 24 }}>
          <p style={{ color: '#7A7A8C', fontSize: 12, fontWeight: 500, letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 10 }}>
            {isFoyerPov ? 'Patrimoine du foyer' : 'Patrimoine'}
          </p>
          {loading ? <div style={{ marginBottom: 12 }}><Skeleton h={42} /></div> : patrimoine > 0 ? (
            <p className="font-serif" style={{ color: '#1B2B4B', fontSize: 38, fontWeight: 700, margin: '0 0 12px' }}>{euro(patrimoine)}</p>
          ) : (
            <p style={{ color: '#7A7A8C', fontSize: 14, fontStyle: 'italic', margin: '0 0 12px', lineHeight: 1.5 }}>Montants non précisés —<br/>les recommandations restent valides</p>
          )}
          <div style={{ borderTop: '1px solid #F5F0EA', paddingTop: 12 }}>
            <p style={{ color: '#7A7A8C', fontSize: 12, marginBottom: 4 }}>
              {isFocusA ? 'Droits à régler — succession parentale' : 'Droit successoral estimé'}
            </p>
            {loading ? <Skeleton h={24} w="55%" /> : calculs.successionEstimee > 0 ? (
              <p style={{ color: '#C9A96E', fontWeight: 700, fontSize: 20, margin: 0 }}>{euro(calculs.successionEstimee)}</p>
            ) : (
              <p style={{ color: '#D1C4B0', fontSize: 13, margin: 0 }}>À préciser</p>
            )}
          </div>
        </div>

        <div className="card" style={{ padding: 24 }}>
          <p style={{ color: '#7A7A8C', fontSize: 12, fontWeight: 500, letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 14 }}>Score de risque successoral</p>
          {loading ? <Skeleton h={72} /> : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
              <div style={{ position: 'relative', width: 72, height: 72, flexShrink: 0 }}>
                <svg viewBox="0 0 100 100" style={{ transform: 'rotate(-90deg)', width: '100%', height: '100%' }}>
                  <circle cx="50" cy="50" r="42" fill="none" stroke="#F5F0EA" strokeWidth="12" />
                  <circle cx="50" cy="50" r="42" fill="none" stroke={scoreColor} strokeWidth="12"
                    strokeDasharray={`${calculs.score * 2.638} ${263.8 - calculs.score * 2.638}`} strokeLinecap="round" />
                </svg>
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontSize: 19, fontWeight: 700, color: scoreColor }}>{calculs.score}</span>
                </div>
              </div>
              <div>
                <p style={{ fontWeight: 600, color: '#1A1A2E', fontSize: 16, margin: '0 0 4px' }}>{scoreLabel}</p>
                <p style={{ color: '#7A7A8C', fontSize: 12, lineHeight: 1.5, margin: 0 }}>
                  {calculs.score > 70 ? 'Actions urgentes nécessaires' : calculs.score > 50 ? 'Optimisations identifiées' : 'Situation bien maîtrisée'}
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="card" style={{ padding: 24, borderLeft: '4px solid #C9A96E', background: 'linear-gradient(135deg, #FFFDF9 0%, #FFF8EE 100%)' }}>
          <p style={{ color: '#C9A96E', fontSize: 12, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 10 }}>✦ Économies identifiées</p>
          {loading ? <div style={{ marginBottom: 12 }}><Skeleton h={42} /></div> : totalEconomies > 0 ? (
            <p className="font-serif" style={{ color: '#C9A96E', fontSize: 38, fontWeight: 700, margin: '0 0 6px' }}>{euro(totalEconomies)}</p>
          ) : (
            <p style={{ color: '#7A7A8C', fontSize: 14, fontStyle: 'italic', margin: '0 0 6px', lineHeight: 1.5 }}>Calculées selon votre situation</p>
          )}
          <p style={{ color: '#7A7A8C', fontSize: 12, margin: '0 0 10px' }}>
            {actions.length} recommandation{actions.length > 1 ? 's' : ''} personnalisée{actions.length > 1 ? 's' : ''}
          </p>
          <div style={{ borderTop: '1px solid #FDE8C8', paddingTop: 10 }}>
            <button onClick={() => setShowNessoPlus(true)} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', color: '#B8895A', fontSize: 12, fontWeight: 500 }}>
              Voir le détail → <span style={{ color: '#C9A96E', fontWeight: 700 }}>Nesso+</span>
            </button>
          </div>
        </div>
      </div>

      {/* Onglets */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div style={{ borderBottom: '1px solid #F5F0EA', display: 'flex', padding: '0 6px' }}>
          {[['succession', '⚖ Succession'], ['optimisation', '📈 Optimisation fiscale']].map(([id, label]) => (
            <button key={id} onClick={() => setTab(id)} style={{
              padding: '14px 24px', fontSize: 14, fontWeight: 500, cursor: 'pointer', border: 'none', background: 'none',
              fontFamily: 'DM Sans, sans-serif', transition: 'all 0.2s', marginBottom: -1,
              color: tab === id ? '#1B2B4B' : '#7A7A8C',
              borderBottom: tab === id ? '2px solid #C9A96E' : '2px solid transparent',
            }}>
              {label}
            </button>
          ))}
        </div>

        <div style={{ padding: 28 }}>
          {tab === 'succession' && (
            <div className="fade-in">

              {/* Bandeau contextuel Focus A */}
              {isFocusA && calculs.focusA && (
                <div style={{ background: 'linear-gradient(135deg, #FFFDF9 0%, #FFF8EE 100%)', border: '1px solid #FDE8C8', borderRadius: 10, padding: '12px 16px', marginBottom: 16, display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'center' }}>
                  <span style={{ color: '#C9A96E', fontSize: 13, fontWeight: 600 }}>⚖ Succession de vos parents</span>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
                    {[
                      { label: 'Patrimoine parents estimé', val: euro(calculs.focusA.patrimoineParents) },
                      { label: 'Votre part', val: `${euro(calculs.focusA.partUser)} (1/${calculs.focusA.nbHeritiers} héritier${calculs.focusA.nbHeritiers > 1 ? 's' : ''})` },
                      { label: 'Abattement disponible', val: `${euro(calculs.focusA.abattementTotal)} (${calculs.focusA.nbParentsEnVie} parent${calculs.focusA.nbParentsEnVie > 1 ? 's' : ''} × 100 000€)` },
                    ].map(({ label, val }) => (
                      <span key={label} style={{ color: '#7A7A8C', fontSize: 12 }}>
                        <span style={{ color: '#1B2B4B', fontWeight: 600 }}>{val}</span> {label}
                      </span>
                    ))}
                  </div>
                  {calculs.focusA.gpVivants && calculs.focusA.patrimoineGP > 0 && (
                    <span style={{ color: '#7A7A8C', fontSize: 12, borderTop: '1px dashed #FDE8C8', paddingTop: 8, width: '100%' }}>
                      Grands-parents : patrimoine estimé <strong>{euro(calculs.focusA.patrimoineGP)}</strong> — droits si saut de génération direct : <strong style={{ color: '#C9A96E' }}>{euro(calculs.focusA.droitsGPSiSaut)}</strong> (abattement 31 786€/petit-enfant)
                    </span>
                  )}
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 20 }}>
                {[
                  {
                    label: isFocusA ? 'Droits à régler — statu quo' : 'Droits estimés — statu quo',
                    val: calculs.droits.statusQuo,
                    bg: '#F9FAFB', color: '#1B2B4B',
                    sub: isFocusA ? 'Sans optimisation de la transmission parentale' : 'Situation actuelle sans action',
                  },
                  {
                    label: 'Droits après optimisation',
                    val: calculs.droits.optimise,
                    bg: '#F0FDF4', color: '#10B981',
                    sub: isFocusA ? 'Avec AV des parents et donations organisées' : 'Scénario optimisé',
                  },
                  {
                    label: 'Économie possible',
                    val: calculs.economieSuccession,
                    bg: '#FFF8F0', color: '#C9A96E',
                    sub: 'Avec les actions recommandées', border: '1px solid #FDE8C8',
                  },
                ].map(({ label, val, bg, color, sub, border }) => (
                  <div key={label} style={{ background: bg, borderRadius: 10, padding: 20, border }}>
                    <p style={{ color: '#7A7A8C', fontSize: 12, marginBottom: 8 }}>{label}</p>
                    {loading ? <Skeleton h={30} /> : <p style={{ color, fontSize: 26, fontWeight: 700, margin: '0 0 4px' }}>{euro(val)}</p>}
                    <p style={{ color: '#7A7A8C', fontSize: 11, margin: 0 }}>{sub}</p>
                  </div>
                ))}
              </div>

              {/* Détail par levier */}
              <div style={{ background: '#FAFAF9', border: '1px solid #F0EBE4', borderRadius: 10, padding: 18, marginBottom: 24 }}>
                <p style={{ color: '#7A7A8C', fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 12 }}>Comment on y arrive — détail par levier</p>
                {actions.map((a, i) => {
                  const urgenceColor = a.urgence === 'rouge' ? '#E24B4A' : a.urgence === 'orange' ? '#F59E0B' : '#10B981';
                  return (
                    <div key={i} style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, paddingBottom: i < actions.length - 1 ? 10 : 0, marginBottom: i < actions.length - 1 ? 10 : 0, borderBottom: i < actions.length - 1 ? '1px dashed #EDE8E3' : 'none' }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, flex: 1 }}>
                        <span style={{ color: urgenceColor, fontSize: 16, lineHeight: 1, flexShrink: 0, marginTop: 1 }}>●</span>
                        <span style={{ color: '#374151', fontSize: 13 }}>{a.titre}</span>
                      </div>
                      <span style={{ color: a.economie > 0 ? '#C9A96E' : '#7A7A8C', fontWeight: a.economie > 0 ? 700 : 400, fontSize: 13, whiteSpace: 'nowrap', flexShrink: 0 }}>
                        {a.economie > 0 ? euro(a.economie) : a.economieLabel}
                      </span>
                    </div>
                  );
                })}
              </div>

              <div>
                <p style={{ color: '#7A7A8C', fontSize: 13, marginBottom: 16, fontWeight: 500 }}>Comparatif visuel</p>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 32, height: 120 }}>
                  {[
                    { label: 'Statu quo', val: calculs.droits.statusQuo, color: '#1B2B4B' },
                    { label: 'Optimisé',  val: calculs.droits.optimise,  color: '#C9A96E' },
                  ].map(({ label, val, color }) => {
                    const max = Math.max(calculs.droits.statusQuo, 1);
                    const pct = Math.max((val / max) * 88, val > 0 ? 6 : 2);
                    return (
                      <div key={label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, minWidth: 80 }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color }}>{euro(val)}</span>
                        <div style={{ width: 56, height: `${pct}%`, background: color, borderRadius: '6px 6px 0 0', transition: 'height 0.6s ease' }} />
                        <span style={{ fontSize: 12, color: '#6B7280' }}>{label}</span>
                      </div>
                    );
                  })}
                  <div style={{ flex: 1, borderBottom: '1px solid #E5E7EB', alignSelf: 'flex-end', marginBottom: 28 }} />
                </div>
              </div>
            </div>
          )}

          {tab === 'optimisation' && (
            <div className="fade-in">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 16, marginBottom: 20 }}>
                {[
                  { label: 'Impôts annuels estimés', val: calculs.impots.total, suffix: '/an', color: '#1B2B4B', bg: '#F9FAFB', sub: 'IR + IFI + Prélèvements sociaux' },
                  { label: 'Économies possibles', val: calculs.economiesAnnuelles, suffix: '/an', color: '#10B981', bg: '#F0FDF4', sub: 'Gain annuel possible' },
                  { label: 'Gain sur 10 ans', val: calculs.gainDixAns, suffix: '', color: '#C9A96E', bg: '#FFF8F0', sub: 'Projection optimisation', border: '1px solid #FDE8C8' },
                ].map(({ label, val, suffix, color, bg, sub, border }) => (
                  <div key={label} style={{ background: bg, borderRadius: 10, padding: 20, border }}>
                    <p style={{ color: '#7A7A8C', fontSize: 12, marginBottom: 8 }}>{label}</p>
                    {loading ? <Skeleton h={28} /> : <p style={{ color, fontSize: 24, fontWeight: 700, margin: '0 0 4px' }}>{euro(val)}{suffix}</p>}
                    <p style={{ color: '#7A7A8C', fontSize: 11, margin: 0 }}>{sub}</p>
                  </div>
                ))}
              </div>
              {/* Détail par levier — optimisation */}
              <div style={{ background: '#FAFAF9', border: '1px solid #F0EBE4', borderRadius: 10, padding: 18, marginBottom: 20 }}>
                <p style={{ color: '#7A7A8C', fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 12 }}>Économies possibles — détail par action</p>
                {actions.map((a, i) => {
                  const urgenceColor = a.urgence === 'rouge' ? '#E24B4A' : a.urgence === 'orange' ? '#F59E0B' : '#10B981';
                  return (
                    <div key={i} style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, paddingBottom: i < actions.length - 1 ? 10 : 0, marginBottom: i < actions.length - 1 ? 10 : 0, borderBottom: i < actions.length - 1 ? '1px dashed #EDE8E3' : 'none' }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, flex: 1 }}>
                        <span style={{ color: urgenceColor, fontSize: 16, lineHeight: 1, flexShrink: 0, marginTop: 1 }}>●</span>
                        <div>
                          <span style={{ color: '#374151', fontSize: 13 }}>{a.titre}</span>
                        </div>
                      </div>
                      <span style={{ color: a.economie > 0 ? '#10B981' : '#7A7A8C', fontWeight: a.economie > 0 ? 700 : 400, fontSize: 13, whiteSpace: 'nowrap', flexShrink: 0 }}>
                        {a.economie > 0 ? `+ ${euro(a.economie)}` : a.economieLabel}
                      </span>
                    </div>
                  );
                })}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div style={{ background: '#F9FAFB', borderRadius: 10, padding: 20 }}>
                  <p style={{ color: '#7A7A8C', fontSize: 12, marginBottom: 14, fontWeight: 500 }}>Répartition fiscale</p>
                  {[['Impôt sur le revenu', calculs.impots.IR, '#1B2B4B'], ['IFI', calculs.impots.IFI, '#C9A96E'], ['Prél. sociaux', calculs.impots.PS, '#6B7280']].map(([label, val, color]) => (
                    <div key={label} style={{ marginBottom: 12 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                        <span style={{ fontSize: 12, color: '#6B7280' }}>{label}</span>
                        <span style={{ fontSize: 12, fontWeight: 600 }}>{euro(val)}</span>
                      </div>
                      <div style={{ height: 5, background: '#E5E7EB', borderRadius: 3, overflow: 'hidden' }}>
                        <div style={{ height: '100%', background: color, width: calculs.impots.total > 0 ? `${(val / calculs.impots.total) * 100}%` : '0%', borderRadius: 3, transition: 'width 0.5s ease' }} />
                      </div>
                    </div>
                  ))}
                </div>
                <div style={{ background: '#F0FDF4', borderRadius: 10, padding: 20, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
                  <p style={{ color: '#7A7A8C', fontSize: 12, marginBottom: 10 }}>Taux effectif estimé</p>
                  <p className="font-serif" style={{ fontSize: 44, fontWeight: 700, color: calculs.impots.total > 15000 ? '#E24B4A' : '#10B981', margin: 0 }}>
                    {patrimoine > 0 ? `${Math.round((calculs.impots.total / Math.max(patrimoine * 0.04, 1)) * 100)}%` : '0%'}
                  </p>
                  <p style={{ color: '#7A7A8C', fontSize: 11, marginTop: 6 }}>sur revenus estimés</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="card" style={{ padding: 28 }}>
        <div style={{ marginBottom: 24 }}>
          <h2 className="font-serif" style={{ color: '#1B2B4B', fontSize: 24, margin: '0 0 4px' }}>Actions prioritaires</h2>
          <p style={{ color: '#7A7A8C', fontSize: 13, margin: 0 }}>Pour {person?.prenom}, triées par urgence</p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {actions.map((action, i) => (
            <div key={i} style={{ border: '1px solid #F0EBE4', borderRadius: 10, padding: 20, transition: 'box-shadow 0.2s' }}
              onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 18px rgba(27,43,75,0.09)'}
              onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 200 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, flexWrap: 'wrap' }}>
                    <Badge urgence={action.urgence} />
                    <span style={{ fontWeight: 600, color: '#1B2B4B', fontSize: 15 }}>{action.titre}</span>
                  </div>
                  <p style={{ color: '#7A7A8C', fontSize: 13, lineHeight: 1.5, margin: '0 0 10px', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {action.description}
                  </p>
                  <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center' }}>
                    {action.economie > 0 ? (
                      <span style={{ color: '#10B981', fontWeight: 600, fontSize: 14 }}>
                        ✓ {euro(action.economie)} d'économies identifiées
                      </span>
                    ) : (
                      <span style={{ color: '#7A7A8C', fontSize: 13 }}>{action.economieLabel}</span>
                    )}
                  </div>
                </div>
                <button className="btn-navy" onClick={() => setSelectedAction(action)} style={{ fontSize: 13, padding: '9px 18px', whiteSpace: 'nowrap' }}>
                  En savoir plus →
                </button>
              </div>
              {/* Partenaire contextuel */}
              {action.partenaire && (
                <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px dashed #EDE8E3' }}>
                  {isNessoPlus ? (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 15 }}>🤝</span>
                        <div>
                          <span style={{ color: '#1B2B4B', fontSize: 13, fontWeight: 600 }}>{action.partenaire.nom}</span>
                          <span style={{ color: '#7A7A8C', fontSize: 12, marginLeft: 8 }}>{action.partenaire.type}</span>
                        </div>
                      </div>
                      <button className="btn-gold" style={{ fontSize: 12, padding: '6px 14px' }}>Prendre rendez-vous →</button>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 15 }}>🤝</span>
                        <span style={{ color: '#7A7A8C', fontSize: 13 }}>Un partenaire Nesso est disponible pour cette action</span>
                        <NessoBadge />
                      </div>
                      <button onClick={() => setShowNessoPlus(true)} style={{ background: 'none', border: '1px solid #E5E7EB', borderRadius: 6, padding: '5px 12px', fontSize: 12, color: '#6B7280', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>
                        Débloquer →
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ── Modal Nesso+ ── */}
      <Modal open={showNessoPlus} onClose={() => setShowNessoPlus(false)} title="">
        <div style={{ textAlign: 'center', paddingBottom: 8 }}>
          <div style={{ background: '#1B2B4B', borderRadius: 12, padding: '28px 24px 24px', marginBottom: 24 }}>
            <p style={{ color: '#C9A96E', fontSize: 13, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 8 }}>✦ Nesso+</p>
            <p className="font-serif" style={{ color: 'white', fontSize: 30, fontWeight: 700, margin: '0 0 6px' }}>79€</p>
            <p style={{ color: '#7A7A8C', fontSize: 13, margin: 0 }}>Paiement unique · Accès à vie · Sans abonnement</p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 24, textAlign: 'left' }}>
            {[
              {
                icon: '🔄',
                titre: 'Recalcul automatique',
                desc: 'Vos recommandations se mettent à jour chaque fois que vous ajoutez un actif ou un membre à votre famille. Votre plan reste toujours à jour.',
              },
              {
                icon: '🔔',
                titre: 'Alertes législatives personnalisées',
                desc: 'Nesso vous prévient si une loi change et impacte votre situation spécifique — pas une newsletter généraliste, une alerte ciblée sur votre patrimoine.',
              },
              {
                icon: '📄',
                titre: 'Rapport PDF structuré',
                desc: 'Un document complet, prêt à apporter à votre notaire ou CGP : patrimoine, recommandations, étapes, chiffres clés.',
              },
            ].map(({ icon, titre, desc }) => (
              <div key={titre} style={{ display: 'flex', gap: 14, background: '#F9F8F6', borderRadius: 10, padding: 16 }}>
                <span style={{ fontSize: 22, flexShrink: 0 }}>{icon}</span>
                <div>
                  <p style={{ color: '#1B2B4B', fontWeight: 600, fontSize: 14, margin: '0 0 4px' }}>{titre}</p>
                  <p style={{ color: '#6B7280', fontSize: 13, lineHeight: 1.55, margin: 0 }}>{desc}</p>
                </div>
              </div>
            ))}
          </div>

          <button className="btn-gold" style={{ width: '100%', padding: '14px', fontSize: 15, fontWeight: 700, borderRadius: 10 }}>
            Accéder à Nesso+ — 79€ →
          </button>
          <p style={{ color: '#7A7A8C', fontSize: 11, marginTop: 12 }}>
            Vous débloquez immédiatement le détail de toutes vos recommandations.
          </p>
        </div>
      </Modal>

      <Modal open={!!selectedAction} onClose={() => setSelectedAction(null)} title={selectedAction?.titre}>
        {selectedAction && (
          <>
            {/* Toujours visible : badge + description */}
            <div style={{ marginBottom: 12 }}><Badge urgence={selectedAction.urgence} /></div>
            <p style={{ color: '#4B5563', lineHeight: 1.75, fontSize: 14, marginBottom: 20 }}>{selectedAction.description}</p>

            {isNessoPlus ? (
              /* ── ÉTAT NESSO+ : tout débloqué ── */
              <>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                  <div style={{ background: '#F0FDF4', borderRadius: 9, padding: 16 }}>
                    <p style={{ color: '#7A7A8C', fontSize: 12, marginBottom: 4 }}>Économie potentielle</p>
                    <p style={{ color: '#10B981', fontWeight: 700, fontSize: 17, margin: 0 }}>{selectedAction.economieLabel}</p>
                  </div>
                  <div style={{ background: '#F9FAFB', borderRadius: 9, padding: 16 }}>
                    <p style={{ color: '#7A7A8C', fontSize: 12, marginBottom: 4 }}>Coût estimé</p>
                    <p style={{ color: '#1B2B4B', fontWeight: 700, fontSize: 17, margin: 0 }}>{selectedAction.coutLabel}</p>
                  </div>
                </div>
                <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 8, padding: 12, marginBottom: 12 }}>
                  <p style={{ color: '#92400E', fontSize: 13, fontWeight: 500, margin: 0 }}>⏱ À faire avant : {selectedAction.delai}</p>
                </div>
                {selectedAction.etapes && (
                  <div style={{ background: '#F9FAFB', border: '1px solid #F0EBE4', borderRadius: 9, padding: 16, marginBottom: 12 }}>
                    <p style={{ color: '#7A7A8C', fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 12 }}>Plan d'action — étapes</p>
                    {selectedAction.etapes.map((e, i) => (
                      <div key={i} style={{ display: 'flex', gap: 10, marginBottom: i < selectedAction.etapes.length - 1 ? 10 : 0 }}>
                        <span style={{ background: '#1B2B4B', color: '#C9A96E', fontSize: 11, fontWeight: 700, width: 20, height: 20, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>{i + 1}</span>
                        <span style={{ color: '#374151', fontSize: 13, lineHeight: 1.5 }}>{e}</span>
                      </div>
                    ))}
                  </div>
                )}
                {selectedAction.partenaire && (
                  <div style={{ background: '#F5F0EA', border: '1px solid #E8DDD0', borderRadius: 8, padding: 16 }}>
                    <p style={{ color: '#7A7A8C', fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', margin: '0 0 8px' }}>Partenaire recommandé par Nesso</p>
                    <p style={{ color: '#1B2B4B', fontWeight: 700, fontSize: 15, margin: '0 0 2px' }}>{selectedAction.partenaire.nom}</p>
                    <p style={{ color: '#6B7280', fontSize: 12, margin: '0 0 10px' }}>{selectedAction.partenaire.type}</p>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                      <span style={{ color: '#10B981', fontSize: 12 }}>● {selectedAction.partenaire.disponibilite}</span>
                      <button className="btn-navy" style={{ fontSize: 12, padding: '7px 14px' }}>Prendre rendez-vous →</button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              /* ── ÉTAT FREE : titre + description + montant visibles, "comment faire" verrouillé ── */
              <>
                {/* Montant visible */}
                {selectedAction.economie > 0 && (
                  <div style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 10, padding: 16, marginBottom: 14, textAlign: 'center' }}>
                    <p style={{ color: '#7A7A8C', fontSize: 12, marginBottom: 4 }}>Économies identifiées</p>
                    <p style={{ color: '#10B981', fontWeight: 700, fontSize: 28, margin: 0, fontFamily: 'DM Serif Display, serif' }}>{euro(selectedAction.economie)}</p>
                  </div>
                )}
                {/* Bloc "Comment faire" verrouillé */}
                <div style={{ border: '1px solid #E8DDD0', borderRadius: 10, overflow: 'hidden' }}>
                  <div style={{ padding: 16, background: '#FAFAF9', borderBottom: '1px solid #F0EBE4', pointerEvents: 'none' }}>
                    <p style={{ color: '#7A7A8C', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10 }}>Comment faire</p>
                    {/* Délai + coût floutés */}
                    <div style={{ display: 'flex', gap: 10, marginBottom: selectedAction.etapes ? 12 : 0 }}>
                      <div style={{ background: '#FFFBEB', borderRadius: 7, padding: '8px 12px', flex: 1, filter: 'blur(4px)', userSelect: 'none' }}>
                        <p style={{ color: '#92400E', fontSize: 12, margin: 0 }}>⏱ {selectedAction.delai}</p>
                      </div>
                      <div style={{ background: '#F9FAFB', borderRadius: 7, padding: '8px 12px', flex: 1, filter: 'blur(4px)', userSelect: 'none' }}>
                        <p style={{ color: '#1B2B4B', fontSize: 12, margin: 0 }}>💸 {selectedAction.coutLabel}</p>
                      </div>
                    </div>
                    {/* Étapes floutées */}
                    {selectedAction.etapes && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {selectedAction.etapes.slice(0, 3).map((e, i) => (
                          <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', filter: 'blur(3px)', userSelect: 'none' }}>
                            <span style={{ background: '#E5E7EB', color: '#7A7A8C', fontSize: 10, fontWeight: 700, width: 18, height: 18, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{i + 1}</span>
                            <span style={{ color: '#374151', fontSize: 12 }}>{e}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div style={{ background: '#1B2B4B', padding: 16, textAlign: 'center' }}>
                    <p style={{ color: '#C9A96E', fontWeight: 700, fontSize: 14, margin: '0 0 4px' }}>✦ Nesso+</p>
                    <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, margin: '0 0 12px' }}>
                      Étapes · Délais · Coûts · Partenaire recommandé
                    </p>
                    <button className="btn-gold" onClick={() => setShowNessoPlus(true)} style={{ fontSize: 13, padding: '10px 24px', fontWeight: 700 }}>
                      Débloquer — 79€ →
                    </button>
                  </div>
                </div>
              </>
            )}
          </>
        )}
      </Modal>
    </div>
  );
}
