// ── SCÉNARIOS & CALENDRIER PATRIMONIAL — Nesso ───────────────────────────────
// Génère les scénarios comparatifs et le calendrier fiscal time-sensitive.

import { euro } from '../utils.js';
import { calcDroitsBareme, calcBaseSuccession, calcTauxNuePropriete, asArray } from './calculs.js';

// ── Scénarios comparatifs ────────────────────────────────────────────────────
// 3 scénarios nommés avec calculs réels : statu quo, AV seule, AV + don familial
export const generateScenarios = (userProfile, patrimoine, isFocusA) => {
  const nbEnfants      = userProfile?.enfants || 0;
  const fratrie        = asArray(userProfile?.famille?.fratrie);
  const nbHeritiers    = Math.max(1, fratrie.length + 1); // user + fratrie
  // BUG FIX : nb_parents_en_vie = 0 → abattement 0 (Math.max(1, 0) était incorrect)
  const nbParentsEnVie = userProfile?.famille?.nb_parents_en_vie ?? 1;
  const now            = new Date().getFullYear();

  if (isFocusA) {
    const patrimoineParents = userProfile?.famille?.patrimoine_parents_estime || 0;
    if (patrimoineParents === 0) return null;

    // ── Abattement résiduel : déduire les donations récentes (< 15 ans) ───────
    // "de": "parent", "vers": "user", montant connu → consomme l'abattement
    const donationsParentsVersUser = asArray(userProfile?.succession?.donations_passees)
      .filter(d => d && d.de === 'parent' && d.vers === 'user' && d.annee && (now - d.annee) < 15 && d.montant > 0);
    const montantConsomme  = donationsParentsVersUser.reduce((s, d) => s + (d.montant || 0), 0);
    const abattementBrut   = nbParentsEnVie > 0 ? 100000 * nbParentsEnVie : 0;
    const abattement       = Math.max(0, abattementBrut - montantConsomme);
    const abattementReduit = montantConsomme > 0;

    const partUser = Math.round(patrimoineParents / nbHeritiers);

    // Scénario 1 — Statu quo
    const droits1 = calcDroitsBareme(Math.max(0, partUser - abattement));

    // Scénario 2 — AV des parents (152 500€/bénéficiaire hors succession avant 70 ans)
    const avParents = Math.min(patrimoineParents * 0.30, 152500);
    const part2     = Math.round(Math.max(0, patrimoineParents - avParents) / nbHeritiers);
    const droits2   = calcDroitsBareme(Math.max(0, part2 - abattement));

    // Scénario 3 — Démembrement (si âge parent favorable) OU AV + don familial
    const pereAge  = userProfile?.famille?.pere_age;
    const mereAge  = userProfile?.famille?.mere_age;
    // Prendre l'âge du parent le plus jeune comme usufruitier potentiel
    const ageUsufr = (pereAge && mereAge) ? Math.min(pereAge, mereAge) : (pereAge || mereAge || null);
    const tauxNP   = ageUsufr ? calcTauxNuePropriete(ageUsufr) : null;
    const useDemembrement = tauxNP !== null && ageUsufr > 50 && ageUsufr <= 80 && patrimoineParents > 200000;

    let scenario3;
    if (useDemembrement) {
      // Démembrement : droits calculés sur la valeur de la nue-propriété uniquement
      const valeurNP  = Math.round(partUser * tauxNP);
      const droits3   = calcDroitsBareme(Math.max(0, valeurNP - abattement));
      scenario3 = {
        nom: 'Donation en nue-propriété',
        droits: droits3,
        economie: Math.max(0, droits1 - droits3),
        description: `À ${ageUsufr} ans, la nue-propriété vaut ${Math.round(tauxNP * 100)}% de la valeur vénale (art. 669 CGI). Vos parents gardent l'usufruit (revenus, usage), vous recevez la NP — droits sur ${euro(valeurNP)} seulement. À leur décès : pleine propriété sans droits supplémentaires.`,
        leviers: [`NP = ${Math.round(tauxNP * 100)}% (parent ${ageUsufr} ans)`, 'Pleine propriété sans droits au décès'],
        highlight: true,
        noteDemembrement: true,
      };
    } else {
      // AV + don familial (levier par défaut)
      const donFamilial = nbParentsEnVie > 0 ? 31865 * nbParentsEnVie : 0;
      const part3  = Math.round(Math.max(0, patrimoineParents - avParents - donFamilial) / nbHeritiers);
      const droits3 = calcDroitsBareme(Math.max(0, part3 - abattement));
      scenario3 = {
        nom: 'AV + don familial',
        droits: droits3,
        economie: Math.max(0, droits1 - droits3),
        description: `AV + don familial en numéraire (${euro(31865)} par donateur si < 80 ans, cumulable avec les 100 000€ d'abattement).${abattementReduit ? ` ⚠ Abattement réduit à ${euro(abattement)} (donation antérieure prise en compte).` : ''}`,
        leviers: ['Assurance-vie', `Don familial ${euro(31865)}/donateur`],
        highlight: true,
      };
    }

    return [
      {
        nom: 'Statu quo',
        droits: droits1,
        economie: 0,
        description: `Aucune action. Votre part : ${euro(partUser)}. Abattement : ${euro(abattement)}${abattementReduit ? ` (réduit — donation antérieure de ${euro(montantConsomme)} < 15 ans)` : nbParentsEnVie > 0 ? ` (${nbParentsEnVie} parent${nbParentsEnVie > 1 ? 's' : ''} × 100 000€)` : ' (aucun parent en vie)' }.`,
        leviers: [],
        highlight: false,
      },
      {
        nom: 'Assurance-vie des parents',
        droits: droits2,
        economie: Math.max(0, droits1 - droits2),
        description: `Vos parents alimentent leur AV avant 70 ans — ${euro(avParents)} sortent hors succession (152 500€ exonérés par bénéficiaire désigné).`,
        leviers: ['AV des parents avant 70 ans'],
        highlight: false,
      },
      scenario3,
    ];

  } else {
    // Focus B / standard — succession de l'user vers ses enfants/héritiers
    const baseSuccession = calcBaseSuccession(patrimoine, userProfile?.actifs);
    if (baseSuccession === 0 || nbEnfants === 0) return null;

    // ── Abattement résiduel — donations de l'user vers ses enfants < 15 ans ──
    const donationsUserVersEnfants = asArray(userProfile?.succession?.donations_passees)
      .filter(d => d && d.de === 'user' && d.annee && (now - d.annee) < 15 && d.montant > 0);
    const montantConsomme  = donationsUserVersEnfants.reduce((s, d) => s + (d.montant || 0), 0) / Math.max(nbEnfants, 1);
    const abattementResiduel = Math.max(0, 100000 - montantConsomme);
    const abattementReduit = montantConsomme > 0;

    const partParEnfant = Math.round(baseSuccession / nbEnfants);

    // Scénario 1 — Statu quo
    const droits1 = calcDroitsBareme(Math.max(0, partParEnfant - abattementResiduel)) * nbEnfants;

    // Scénario 2 — Avec AV (152 500€/bénéficiaire hors succession)
    const avCapacite = Math.min(baseSuccession * 0.35, 152500 * nbEnfants);
    const masse2     = Math.max(0, baseSuccession - avCapacite);
    const part2      = Math.round(masse2 / nbEnfants);
    const droits2    = calcDroitsBareme(Math.max(0, part2 - abattementResiduel)) * nbEnfants;

    // Scénario 3 — AV + don familial (31 865€/enfant si user < 80 ans)
    const userAge     = userProfile?.age || 45;
    const donFamilial = userAge < 80 ? 31865 * nbEnfants : 0;
    const masse3  = Math.max(0, baseSuccession - avCapacite - donFamilial);
    const part3   = Math.round(masse3 / nbEnfants);
    const droits3 = calcDroitsBareme(Math.max(0, part3 - abattementResiduel)) * nbEnfants;

    return [
      {
        nom: 'Statu quo',
        droits: droits1,
        economie: 0,
        description: `${nbEnfants} enfant${nbEnfants > 1 ? 's' : ''}, abattement ${euro(abattementResiduel)}/enfant${abattementReduit ? ' (réduit — donation antérieure prise en compte)' : ''}. Base taxable par enfant : ${euro(Math.max(0, partParEnfant - abattementResiduel))}.`,
        leviers: [],
        highlight: false,
      },
      {
        nom: 'Avec assurance-vie',
        droits: droits2,
        economie: Math.max(0, droits1 - droits2),
        description: `152 500€ par bénéficiaire passent hors succession. La base taxable est réduite de ${euro(avCapacite)}.`,
        leviers: [`AV — 152 500€ × ${nbEnfants} enfant${nbEnfants > 1 ? 's' : ''}`],
        highlight: false,
      },
      {
        nom: userAge < 80 ? 'AV + don familial' : 'AV seule (don familial indisponible)',
        droits: droits3,
        economie: Math.max(0, droits1 - droits3),
        description: userAge < 80
          ? `AV + don familial (${euro(31865)}/enfant), cumulable avec les ${euro(abattementResiduel)} d'abattement disponible.`
          : `Le don familial n'est plus disponible après 80 ans. L'assurance-vie reste le levier principal.`,
        leviers: userAge < 80
          ? ['Assurance-vie', `Don familial ${euro(31865)}/enfant`]
          : ['Assurance-vie'],
        highlight: true,
      },
    ];
  }
};

// ── Calendrier patrimonial ───────────────────────────────────────────────────
// Actions time-sensitive avec deadlines réelles (AV avant 70, don familial avant 80,
// PER avant 31/12, renouvellement abattement 15 ans)
export const generateTimeline = (userProfile) => {
  const items  = [];
  const now    = new Date().getFullYear();
  const userAge  = userProfile?.age || 45;
  const pereAge         = userProfile?.famille?.pere_age || null;
  const mereAge         = userProfile?.famille?.mere_age || null;
  const gpMaternelsAge  = userProfile?.famille?.gp_maternels_age || null;
  const gpPaternelsAge  = userProfile?.famille?.gp_paternels_age || null;
  const tmiNum   = parseInt(userProfile?.optimisation?.tmi) || 0;
  const revenus  = userProfile?.optimisation?.revenus_annuels_foyer || 0;
  const dispositifs = asArray(userProfile?.optimisation?.dispositifs_en_place);
  const perOuvert   = dispositifs.some(d => typeof d === 'string' && d.toLowerCase().includes('per'));
  const hasAV       = (userProfile?.actifs || []).some(a => a.type === 'Assurance-vie');
  const donationsPassees = asArray(userProfile?.succession?.donations_passees);

  // 1. AV de l'utilisateur — alimenter avant 70 ans
  const anneeAV70User = now + Math.max(0, 70 - userAge);
  if (userAge < 70) {
    const restant = 70 - userAge;
    items.push({
      annee: anneeAV70User,
      label: `Avant ${anneeAV70User}`,
      urgence: restant <= 3 ? 'rouge' : restant <= 8 ? 'orange' : 'vert',
      titre: hasAV ? 'Alimenter votre assurance-vie avant 70 ans' : 'Ouvrir et alimenter une assurance-vie avant 70 ans',
      description: `Avant 70 ans : 152 500€ exonérés par bénéficiaire. Après 70 ans : abattement global réduit à 30 500€ pour tous bénéficiaires confondus. ${restant <= 3 ? '⚠ Fenêtre fiscale très proche.' : `Il vous reste ${restant} ans.`}`,
      type: 'deadline_fiscale',
    });
  }

  // 2. PER — avant 31 décembre de l'année en cours
  if (!perOuvert && tmiNum >= 30 && revenus > 0) {
    const economiePER = Math.round(Math.min(revenus * 0.10, 10000) * (tmiNum / 100));
    items.push({
      annee: now,
      label: `31 décembre ${now}`,
      urgence: 'orange',
      titre: `Ouvrir et alimenter un PER — ${euro(economiePER)} d'impôt en moins`,
      description: `Les versements sont déductibles du revenu imposable de l'année en cours. À ${tmiNum}% de TMI, 10 000€ versés = ${euro(economiePER)} d'économies sur votre prochaine déclaration. Délai strict : 31 décembre.`,
      type: 'deadline_fiscale',
    });
  }

  // 3. AV des parents — alimenter avant 70 ans (chaque parent)
  [['père', pereAge], ['mère', mereAge]].forEach(([parent, age]) => {
    if (!age || age >= 70) return;
    const restant = 70 - age;
    const annee = now + restant;
    items.push({
      annee,
      label: `Avant ${annee} (${parent} actuellement ${age} ans)`,
      urgence: restant <= 3 ? 'rouge' : restant <= 7 ? 'orange' : 'vert',
      titre: `Assurance-vie de votre ${parent} — alimenter avant ses 70 ans`,
      description: `Les primes versées par votre ${parent} avant 70 ans bénéficient de l'abattement de 152 500€ par bénéficiaire désigné. C'est l'un des leviers les plus puissants pour une transmission hors succession. ${restant <= 3 ? `⚠ Urgence : ${restant} an${restant > 1 ? 's' : ''} seulement.` : `Il reste ${restant} ans.`}`,
      type: 'deadline_fiscale',
    });
  });

  // 4. Don familial — avant 80 ans du donateur
  [['père', pereAge], ['mère', mereAge]].forEach(([parent, age]) => {
    if (!age || age >= 80) return;
    const restant = 80 - age;
    const annee = now + restant;
    items.push({
      annee,
      label: `Avant ${annee} (${parent} actuellement ${age} ans)`,
      urgence: restant <= 3 ? 'rouge' : restant <= 7 ? 'orange' : 'vert',
      titre: `Don familial de votre ${parent} — avant ses 80 ans`,
      description: `Votre ${parent} peut donner 31 865€ en numéraire, sans droits, cumulable avec les 100 000€ d'abattement standard. Après 80 ans, ce mécanisme n'est plus disponible. ${restant <= 3 ? `⚠ Urgence : ${restant} an${restant > 1 ? 's' : ''} seulement.` : ''}`,
      type: 'deadline_fiscale',
    });
  });

  // 5. GP — AV avant 70 ans + don familial avant 80 ans
  [['maternels', gpMaternelsAge], ['paternels', gpPaternelsAge]].forEach(([cote, age]) => {
    if (!age) return;
    if (age < 70) {
      const restant = 70 - age;
      items.push({
        annee: now + restant,
        label: `Avant ${now + restant} (GP ${cote} ~ ${age} ans)`,
        urgence: restant <= 3 ? 'rouge' : restant <= 7 ? 'orange' : 'vert',
        titre: `Assurance-vie de vos grands-parents ${cote} — alimenter avant 70 ans`,
        description: `Les primes versées avant 70 ans bénéficient de l'abattement de 152 500€ par bénéficiaire désigné. Après 70 ans, l'avantage fiscal est considérablement réduit. ${restant <= 3 ? `⚠ Seulement ${restant} an${restant > 1 ? 's' : ''}.` : ''}`,
        type: 'deadline_fiscale',
      });
    }
    if (age < 80) {
      const restant = 80 - age;
      items.push({
        annee: now + restant,
        label: `Avant ${now + restant} (GP ${cote} ~ ${age} ans)`,
        urgence: restant <= 3 ? 'rouge' : restant <= 7 ? 'orange' : 'vert',
        titre: `Don familial de vos grands-parents ${cote} — avant leurs 80 ans`,
        description: `Vos grands-parents ${cote} peuvent donner 31 865€ en numéraire sans droits, cumulable avec l'abattement de 31 786€ GP→petit-enfant. Ce mécanisme expire à 80 ans.`,
        type: 'deadline_fiscale',
      });
    }
  });

  // 6. Renouvellement abattement 15 ans (donations passées)
  donationsPassees.forEach(d => {
    if (!d.annee) return;
    const anneeRenouvellement = d.annee + 15;
    if (anneeRenouvellement < now || anneeRenouvellement > now + 12) return;
    const ans = anneeRenouvellement - now;
    items.push({
      annee: anneeRenouvellement,
      label: `${anneeRenouvellement}${ans > 0 ? ` (dans ${ans} an${ans > 1 ? 's' : ''})` : ' (cette année)'}`,
      urgence: ans <= 1 ? 'orange' : 'vert',
      titre: `Abattement de 100 000€ renouvelé — fenêtre fiscale en ${anneeRenouvellement}`,
      description: `La donation reçue en ${d.annee} a consommé votre abattement de 100 000€. Il se renouvelle intégralement en ${anneeRenouvellement}. Une nouvelle donation sans droits sera de nouveau possible — à anticiper avec le donateur.`,
      type: 'renouvellement',
    });
  });

  // Tri : urgence d'abord, puis chronologique
  const ordreUrgence = { rouge: 0, orange: 1, vert: 2 };
  items.sort((a, b) => {
    const du = (ordreUrgence[a.urgence] ?? 3) - (ordreUrgence[b.urgence] ?? 3);
    return du !== 0 ? du : a.annee - b.annee;
  });

  return items;
};
