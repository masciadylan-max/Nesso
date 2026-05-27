import { useState, useEffect } from 'react';
import { CALCULS, ACTIONS } from '../data.js';
import { euro, getPersonne, getPatrimoine } from '../utils.js';
import { Badge, Skeleton, Modal } from './Shared.jsx';

const computeUserCalculs = (patrimoine, userProfile) => {
  const abattement = 200000;
  const taxable = Math.max(0, patrimoine - abattement);
  const taux = taxable < 50000 ? 0.08 : taxable < 200000 ? 0.18 : taxable < 500000 ? 0.25 : 0.30;
  const droitsStatusQuo = Math.round(taxable * taux);
  const droitsOptimise = Math.round(droitsStatusQuo * 0.15);
  const totalImpots = Math.round(patrimoine * 0.012);

  // IFI : uniquement patrimoine immobilier net, abattement 30% sur résidence principale
  const immoActifs = (userProfile?.actifs || []).filter(a => a.categorie === 'immobilier');
  const patrimoineImmoNet = immoActifs.reduce((sum, a) => {
    const abattRP = a.type === 'Résidence principale' ? 0.30 : 0;
    return sum + (a.valeur || 0) * (1 - abattRP);
  }, 0);
  const ifi = patrimoineImmoNet > 1300000 ? Math.round((patrimoineImmoNet - 800000) * 0.005) : 0;

  return {
    droits: { statusQuo: droitsStatusQuo, optimise: droitsOptimise },
    economieSuccession: Math.max(0, droitsStatusQuo - droitsOptimise),
    impots: { IR: Math.round(totalImpots * 0.65), IFI: ifi, PS: Math.round(totalImpots * 0.35), total: totalImpots },
    economiesAnnuelles: Math.round(totalImpots * 0.18),
    gainDixAns: Math.round(totalImpots * 1.8),
    score: userProfile?.score || 60,
    successionEstimee: Math.round(patrimoine * 0.65),
  };
};

const generateUserActions = (userProfile, patrimoine) => {
  const actions = [];
  const alertes = userProfile?.alertes || [];

  const patrimoineImmoNet = (userProfile?.actifs || [])
    .filter(a => a.categorie === 'immobilier')
    .reduce((sum, a) => sum + (a.valeur || 0) * (a.type === 'Résidence principale' ? 0.70 : 1), 0);
  // IFI : on se fie UNIQUEMENT au calcul mathématique sur les actifs réels du foyer
  // (et non à l'alerte 'ifi' générée par Haiku, qui peut rester stale si les biens
  // ont été nettoyés a posteriori). Source de vérité : le patrimoine immobilier net.
  if (patrimoineImmoNet > 1300000) {
    actions.push({ urgence: 'rouge', titreGenerique: 'Fiscalité IFI', titre: 'Bilan IFI obligatoire', description: 'Votre patrimoine dépasse 1,3M€ — vous êtes potentiellement soumis à l\'IFI. Un bilan précis avec un fiscaliste est indispensable pour évaluer votre base taxable et identifier les actifs exonérés (parts de résidence principale, bois et forêts, biens professionnels).', economieLabel: 'Variable selon situation', economie: 0, coutLabel: '~500€ (fiscaliste)', cout: 500, delai: '< 3 mois', etapes: ['Lister tous vos actifs immobiliers et financiers', 'Identifier les actifs exonérés (biens pro, forêts, résidence principale à 30%)', 'Calculer le passif déductible (dettes, emprunts)', 'Mandater un fiscaliste pour sécuriser la déclaration IFI'], partenaire: { nom: 'Cabinet Montaigne Fiscal', type: 'Fiscaliste partenaire', disponibilite: 'Sous 72h' } });
  }
  if (alertes.some(a => a.toLowerCase().includes('étranger') || a.toLowerCase().includes('international'))) {
    actions.push({ urgence: 'rouge', titreGenerique: 'Fiscalité internationale', titre: 'Anticiper la fiscalité internationale', description: 'Un bien étranger dans une succession franco-étrangère peut être taxé deux fois. Le règlement UE 650/2012 et les conventions bilatérales peuvent éviter cette double imposition — à anticiper avant tout décès. Une structuration préventive peut réduire drastiquement la facture.', economieLabel: 'Évite la double imposition', economie: 0, coutLabel: '~800€ (notaire + fiscaliste)', cout: 800, delai: '< 6 mois', etapes: ['Identifier la loi applicable selon UE 650/2012', 'Vérifier l\'existence d\'une convention bilatérale avec le pays concerné', 'Évaluer une structuration préventive (SCI, holding, trust)', 'Rédiger un certificat successoral européen si besoin'], partenaire: { nom: 'Maison Droit & Patrimoine International', type: 'Avocat fiscaliste international partenaire', disponibilite: 'Sur rendez-vous' } });
  }
  // PACS sans testament : partenaire hérite de 0€
  if (alertes.some(a => a.toLowerCase().includes('pacs'))) {
    actions.push({ urgence: 'rouge', titreGenerique: 'Testament PACS', titre: 'Rédiger un testament d\'urgence', description: 'En l\'absence de testament, votre partenaire de PACS n\'hérite légalement de rien — tous vos biens iraient à vos héritiers légaux (parents, fratrie). Un testament olographe peut être rédigé immédiatement, gratuitement. C\'est la priorité absolue pour protéger votre partenaire.', economieLabel: '100% du patrimoine protégé', economie: 0, coutLabel: 'Gratuit (olographe) ou ~150€ (notarié)', cout: 0, delai: 'Cette semaine', etapes: ['Rédiger un testament olographe (manuscrit, daté, signé) immédiatement', 'Le déposer chez un notaire pour sécurisation (FCDDV)', 'Envisager un testament authentique pour les patrimoines importants', 'Revoir la clause bénéficiaire de vos assurances-vie en parallèle'], partenaire: { nom: 'Étude Lefebvre & Associés', type: 'Notaire partenaire', disponibilite: 'Sous 1 semaine' } });
  }
  // Concubinage : 60% de droits de succession
  if (alertes.some(a => a.toLowerCase().includes('concubinage'))) {
    actions.push({ urgence: 'rouge', titreGenerique: 'Protection concubin', titre: 'Protéger votre concubin(e)', description: 'En concubinage, votre partenaire est fiscalement un étranger : 60% de droits de succession sur tout ce qu\'il/elle reçoit. Un testament est indispensable mais ne suffit pas — l\'assurance-vie est le seul outil permettant de transmettre hors succession avec une fiscalité réduite.', economieLabel: 'Évite 60% de droits de succession', economie: 0, coutLabel: '~200€ (notaire + AV)', cout: 200, delai: '< 1 mois', etapes: ['Rédiger un testament pour léguer vos biens au concubin', 'Ouvrir une assurance-vie avec le concubin comme bénéficiaire (152 500€ exonérés)', 'Envisager une SCI ou donation avec réserve d\'usufruit pour l\'immobilier', 'Étudier l\'opportunité du PACS (droits successoraux améliorés)'], partenaire: { nom: 'Étude Lefebvre & Associés', type: 'Notaire partenaire', disponibilite: 'Sous 1 semaine' } });
  }
  // Famille recomposée
  if (alertes.some(a => a.toLowerCase().includes('famille_recomposee') || a.toLowerCase().includes('recompos'))) {
    actions.push({ urgence: 'rouge', titreGenerique: 'Famille recomposée', titre: 'Sécuriser la famille recomposée', description: 'En famille recomposée, sans testament, votre conjoint n\'hérite que de l\'usufruit d\'un quart de vos biens (art. 757 CC) — le reste va à vos enfants, y compris d\'une union précédente. Un testament et une clause de préciput peuvent éviter que le conjoint survivant soit en indivision forcée avec vos enfants.', economieLabel: 'Protège le conjoint survivant', economie: 0, coutLabel: '~400€ (notaire)', cout: 400, delai: '< 3 mois', etapes: ['Dresser l\'inventaire complet avec tous les enfants de chaque union', 'Consulter un notaire spécialisé en familles recomposées', 'Rédiger un testament en faveur du conjoint survivant', 'Étudier un contrat de mariage avec clause de préciput si non marié'], partenaire: { nom: 'Étude Lefebvre & Associés', type: 'Notaire partenaire', disponibilite: 'Sous 1 semaine' } });
  }
  if (!userProfile?.regime && userProfile?.situation_civile === 'marie') {
    actions.push({ urgence: 'orange', titreGenerique: 'Régime matrimonial', titre: 'Clarifier votre régime matrimonial', description: 'Le régime matrimonial conditionne toute la transmission patrimoniale. Sans contrat de mariage, vous êtes en communauté légale réduite aux acquêts — ce qui peut créer des situations défavorables pour le conjoint survivant ou les enfants selon votre situation.', economieLabel: 'Protège le conjoint survivant', economie: 0, coutLabel: '~300€ (notaire)', cout: 300, delai: '< 6 mois', etapes: ['Faire un bilan patrimonial pour identifier les risques', 'Consulter un notaire pour comparer les régimes (communauté, séparation, participation aux acquêts)', 'Signer un contrat de mariage ou un avenant', 'Homologuer si nécessaire au tribunal judiciaire'], partenaire: { nom: 'Office Notarial Beaumont', type: 'Notaire partenaire', disponibilite: 'Sous 1 semaine' } });
  }
  if (patrimoine > 0) {
    actions.push({ urgence: 'vert', titreGenerique: 'Assurance-vie', titre: 'Ouvrir ou alimenter une assurance-vie', description: 'L\'assurance-vie est le levier d\'optimisation successorale le plus puissant en France : 152 500€ par bénéficiaire hors succession avant 70 ans. La clause bénéficiaire, rédigée sur mesure, peut démultiplier cet avantage. Plus tôt vous commencez, plus l\'abattement est exploitable.', economieLabel: `Jusqu'à 152 500€ par bénéficiaire hors succession`, economie: 152500, coutLabel: 'Gratuit (ouverture)', cout: 0, delai: '< 3 mois', etapes: ['Ouvrir un contrat multisupport chez un assureur sérieux', 'Rédiger une clause bénéficiaire sur mesure (pas la clause standard)', 'Alimenter avant 70 ans pour bénéficier des abattements maximaux', 'Réviser la clause à chaque changement de situation familiale'], partenaire: { nom: 'Altus Patrimoine', type: 'Conseiller en gestion de patrimoine partenaire', disponibilite: 'Disponible immédiatement' } });
  }
  if (userProfile?.objectifs) {
    actions.push({ urgence: 'vert', titreGenerique: 'Stratégie notariale', titre: 'Formaliser votre stratégie avec un notaire', description: `Sur la base de vos objectifs (${userProfile.objectifs}), un notaire patrimonial peut formaliser une stratégie complète : donations avec réserve d'usufruit, testament sur mesure, mandat de protection future. Le coût de la consultation est souvent récupéré dès la première optimisation réalisée.`, economieLabel: 'Stratégie patrimoniale sur mesure', economie: 0, coutLabel: '~500€ (consultation initiale)', cout: 500, delai: '6–12 mois', etapes: ['Rassembler l\'inventaire complet du patrimoine familial', 'Consulter un notaire patrimonial pour un bilan successoral', 'Mettre en place les actes adaptés (donation, testament, mandat de protection future)', 'Planifier les donations progressives dans le temps'], partenaire: { nom: 'Étude Lefebvre & Associés', type: 'Notaire patrimonial partenaire', disponibilite: 'Sous 1 semaine' } });
  }
  if (actions.length === 0) {
    actions.push({ urgence: 'vert', titreGenerique: 'Audit patrimonial', titre: 'Affiner votre profil patrimonial', description: 'Pour des recommandations personnalisées et des calculs précis, complétez votre profil en répondant à davantage de questions lors de l\'onboarding. Plus votre situation est détaillée, plus le plan d\'action sera ciblé et actionnable.', economieLabel: 'Recommandations sur mesure', economie: 0, coutLabel: 'Gratuit', cout: 0, delai: 'Dès maintenant', etapes: null, partenaire: null });
  }
  // Bug #5 : trier par urgence avant de slicer — rouge > orange > vert
  // pour ne jamais couper une alerte critique au profit d'une action mineure
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

  const isUserPov = pov === 'user' && userProfile;
  // Détecte les POV "famille de l'user" extraits de l'audit (conjoint, enfant_0, enfant_1...)
  // On a peu d'infos sur eux : on affichera une vue limitée + CTA Nesso+ / espace dédié.
  const isFamilyMemberPov = userProfile && (pov === 'conjoint' || pov.startsWith?.('enfant_'));

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

  const person = isUserPov
    ? { prenom: userProfile.prenom || 'Vous', age: userProfile.age, role: 'Utilisateur', profession: userProfile.profession }
    : (getPersonne(pov) || { prenom: 'Inconnu', age: null, role: '—', profession: null });
  const patrimoine = getPatrimoine(pov, actifs);
  const calculs = isUserPov ? computeUserCalculs(patrimoine, userProfile) : (CALCULS[pov] || CALCULS.lucas);
  const actions = isUserPov ? generateUserActions(userProfile, patrimoine) : (ACTIONS[pov] || ACTIONS.lucas);

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
          <p style={{ color: '#C9A96E', fontSize: 12, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 6 }}>Tableau de bord</p>
          <h1 className="font-serif" style={{ color: '#1B2B4B', fontSize: 34, fontWeight: 700, margin: 0 }}>
            Bonjour, {person?.prenom} <span style={{ color: '#C9A96E' }}>✦</span>
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
          <p style={{ color: '#7A7A8C', fontSize: 12, fontWeight: 500, letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 10 }}>Patrimoine propre</p>
          {loading ? <div style={{ marginBottom: 12 }}><Skeleton h={42} /></div> : patrimoine > 0 ? (
            <p className="font-serif" style={{ color: '#1B2B4B', fontSize: 38, fontWeight: 700, margin: '0 0 12px' }}>{euro(patrimoine)}</p>
          ) : (
            <p style={{ color: '#7A7A8C', fontSize: 14, fontStyle: 'italic', margin: '0 0 12px', lineHeight: 1.5 }}>Montants non précisés —<br/>les recommandations restent valides</p>
          )}
          <div style={{ borderTop: '1px solid #F5F0EA', paddingTop: 12 }}>
            <p style={{ color: '#7A7A8C', fontSize: 12, marginBottom: 4 }}>Droit successoral estimé</p>
            {loading ? <Skeleton h={24} w="55%" /> : patrimoine > 0 ? (
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
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 20 }}>
                {[
                  { label: 'Droits estimés — statu quo', val: calculs.droits.statusQuo, bg: '#F9FAFB', color: '#1B2B4B', sub: 'Situation actuelle sans action' },
                  { label: 'Droits après optimisation', val: calculs.droits.optimise, bg: '#F0FDF4', color: '#10B981', sub: 'Scénario optimisé' },
                  { label: 'Économie possible', val: calculs.economieSuccession, bg: '#FFF8F0', color: '#C9A96E', sub: 'Avec les actions recommandées', border: '1px solid #FDE8C8' },
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
