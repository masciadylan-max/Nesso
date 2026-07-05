// ── ACTIONS PRIORITAIRES — Nesso ─────────────────────────────────────────────
// Génère max 3 actions triées par urgence selon le profil utilisateur.

import { euro } from '../utils.js';
import { calcBaseIFI, calcTauxNuePropriete, calcDroitsBareme, computeFocusACalculs } from './calculs.js';

// ── Actions prioritaires — orientées par focus et alertes réelles ────────────
export const generateUserActions = (userProfile, patrimoine) => {
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
  const fratrie   = userProfile?.famille?.fratrie || [];
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
      const nbPetitsEnfants = 1 + fratrie.length;
      // Économie = droits que les parents auraient payés sur l'héritage GP (double imposition)
      //            moins droits de l'user en recevant directement des GP (abattement 31 786€/PE)
      const droitsSansSaut = calcDroitsBareme(Math.max(0, Math.round(patrimoineGP / 2) - 100000)) * 2;
      const droitsAvecSaut = calcDroitsBareme(Math.max(0, Math.round(patrimoineGP / nbPetitsEnfants) - 31786));
      const economieSaut   = Math.max(0, droitsSansSaut - droitsAvecSaut);
      actions.push({
        urgence: 'orange', titreGenerique: 'Saut de génération',
        titre: 'Étudier le saut de génération avec vos grands-parents',
        description: `Vos grands-parents ont un patrimoine estimé à ${euro(patrimoineGP)}. Si ce patrimoine transite GP → parents → vous, il sera taxé deux fois. Une donation directe GP → petits-enfants (abattement propre de 31 786€/petit-enfant, tous les 15 ans) évite cette double imposition sur un même actif.`,
        economieLabel: 'Évite la double imposition sur la même valeur', economie: economieSaut, coutLabel: '~300€ (notaire)', cout: 300, delai: '< 6 mois',
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
      const focusA = computeFocusACalculs(userProfile);
      actions.push({
        urgence: 'orange', titreGenerique: 'Transmission parentale',
        titre: 'Anticiper la transmission du patrimoine de vos parents',
        description: `Le patrimoine de vos parents (estimé à ${euro(patrimoineParents)}) peut être optimisé dès maintenant. Chaque parent peut donner 100 000€ par enfant tous les 15 ans, sans droits. Une donation organisée avec un notaire, faite aujourd'hui, réduit la base taxable future — et gèle les valeurs si c'est une donation-partage.`,
        economieLabel: "Jusqu'à 100 000€ par parent, par enfant exonérés", economie: focusA.economieSuccession, coutLabel: '~400–800€ (notaire)', cout: 600, delai: '< 12 mois',
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

    // Abattement handicap d'un membre de la fratrie — signal informationnel
    const hasFrereHandicap = fratrie.some(f => f.handicap);
    if (hasFrereHandicap) {
      actions.push({
        urgence: 'vert', titreGenerique: 'Abattement handicap',
        titre: 'Abattement handicap applicable à la fratrie',
        description: "Un membre de votre fratrie en situation de handicap bénéficie d'un abattement supplémentaire de 159 325€ (cumulable avec l'abattement standard de 100 000€ — total : 259 325€ exonérés). Cet abattement s'applique sur chaque transmission (donation ou succession) et peut neutraliser totalement les droits selon le patrimoine transmis.",
        economieLabel: 'Jusqu\'à 259 325€ exonérés par transmission',
        economie: 0, coutLabel: 'Gratuit (vérification)', cout: 0, delai: '< 3 mois',
        etapes: [
          "Vérifier que le membre handicapé répond aux critères légaux (art. 779 II CGI)",
          "Intégrer l'abattement dans le calcul des droits à régler à la succession",
          "Envisager une donation directe aux bénéficiaires en tenant compte de cet abattement majoré",
          "Documenter la situation auprès du notaire dès l'organisation de la succession"
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
        titre: "Ouvrir un PEA — déclencher l'horloge fiscale maintenant",
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

  // ── Clause bénéficiaire AV — révision si standard ou inconnue ────────────
  if (hasAV) {
    const avAssets = (userProfile?.actifs || []).filter(a => a.type === 'Assurance-vie');
    const hasClauseStandard = avAssets.some(a => a.av_clause === 'standard');
    // Signal si clause standard ET situation complexe (mariage, famille recomposée, PACS)
    const situationComplexe = ['marie', 'pacse'].includes(situation) || userProfile?.famille_recomposee;
    if (hasClauseStandard && situationComplexe) {
      actions.push({
        urgence: 'orange', titreGenerique: 'Clause bénéficiaire AV',
        titre: 'Réviser la clause bénéficiaire de votre assurance-vie',
        description: "La clause standard 'mon conjoint à défaut mes enfants à parts égales' peut devenir inadaptée après un mariage, une naissance ou un remariage. Une clause sur mesure protège précisément les bonnes personnes — et peut intégrer un démembrement (usufruit conjoint / nue-propriété enfants) pour optimiser la transmission.",
        economieLabel: 'Protection des bénéficiaires', economie: 0, coutLabel: '~150€ (notaire) ou gratuit (assureur)', cout: 0, delai: '< 1 mois',
        etapes: [
          "Demander à l'assureur le texte exact de votre clause bénéficiaire actuelle",
          "Vérifier l'adéquation avec votre situation familiale (mariage, enfants, remariage)",
          "Rédiger une clause sur mesure — envisager le démembrement de clause pour famille recomposée",
          "Réviser à chaque changement de situation (naissance, divorce, remariage)"
        ],
        partenaire: { nom: 'Étude Lefebvre & Associés', type: 'Notaire partenaire', disponibilite: 'Sous 1 semaine' }
      });
    }
  }

  // ── Démembrement usufruit/nue-propriété — Focus B, si conditions réunies ──
  if ((focus === 'succession' || focus === 'les_deux') && nbEnfants > 0) {
    const userAge  = userProfile?.age || 45;
    const hasImmoHorsRP = (userProfile?.actifs || []).some(
      a => a.categorie === 'immobilier' && a.type !== 'Résidence principale'
    );
    if (userAge >= 51 && userAge <= 80 && hasImmoHorsRP) {
      const tauxNP     = calcTauxNuePropriete(userAge);
      const immoHorsRP = (userProfile?.actifs || [])
        .filter(a => a.categorie === 'immobilier' && a.type !== 'Résidence principale')
        .reduce((s, a) => s + (a.valeur || 0), 0);
      if (immoHorsRP > 150000) {
        const partParEnfant = Math.round(immoHorsRP / nbEnfants);
        const droitsSansAction = calcDroitsBareme(Math.max(0, partParEnfant - 100000)) * nbEnfants;
        const valeurNPParEnfant = Math.round(partParEnfant * tauxNP);
        const droitsDemembrement = calcDroitsBareme(Math.max(0, valeurNPParEnfant - 100000)) * nbEnfants;
        const economie = Math.max(0, droitsSansAction - droitsDemembrement);
        actions.push({
          urgence: 'orange', titreGenerique: 'Démembrement',
          titre: `Donation en nue-propriété — droits sur ${Math.round(tauxNP * 100)}% de la valeur`,
          description: `À ${userAge} ans, la nue-propriété de vos biens immo locatifs vaut ${Math.round(tauxNP * 100)}% de leur valeur (art. 669 CGI). En donnant la NP maintenant (vous gardez l'usufruit = les loyers), les droits ne portent que sur cette valeur réduite. À votre décès, vos enfants récupèrent la pleine propriété sans droits supplémentaires.`,
          economieLabel: economie > 0 ? `${euro(economie)} vs donation pleine propriété` : `Droits sur ${Math.round(tauxNP * 100)}% de la valeur`,
          economie, coutLabel: '~600–1 000€ (notaire)', cout: 800, delai: '< 12 mois',
          etapes: [
            "Identifier les biens transmissibles en NP (locatif prioritairement — gardez la jouissance de la RP)",
            `Valoriser la NP : ${Math.round(tauxNP * 100)}% de la valeur vénale (votre âge : ${userAge} ans)`,
            "Abattement de 100 000€ par enfant s'applique sur la valeur de la NP (pas sur la valeur pleine)",
            "Anticiper avant une revalorisation du bien — geler la valeur d'assiette aujourd'hui"
          ],
          partenaire: { nom: 'Étude Lefebvre & Associés', type: 'Notaire patrimonial partenaire', disponibilite: 'Sous 1 semaine' }
        });
      }
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

  // Routing : A = économie chiffrée → mise en relation gratuite ; B = potentiel identifié → Nesso+
  actions.forEach(a => { a.scenario = a.economie > 0 ? 'A' : 'B'; });

  const ordre = { rouge: 0, orange: 1, vert: 2 };
  actions.sort((a, b) => (ordre[a.urgence] ?? 3) - (ordre[b.urgence] ?? 3));
  return actions.slice(0, 3);
};
