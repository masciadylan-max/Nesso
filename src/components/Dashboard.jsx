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
  return {
    droits: { statusQuo: droitsStatusQuo, optimise: droitsOptimise },
    economieSuccession: Math.max(0, droitsStatusQuo - droitsOptimise),
    impots: { IR: Math.round(totalImpots * 0.65), IFI: patrimoine > 1300000 ? Math.round((patrimoine - 800000) * 0.005) : 0, PS: Math.round(totalImpots * 0.35), total: totalImpots },
    economiesAnnuelles: Math.round(totalImpots * 0.18),
    gainDixAns: Math.round(totalImpots * 1.8),
    score: userProfile?.score || 60,
    successionEstimee: Math.round(patrimoine * 0.65),
  };
};

const generateUserActions = (userProfile, patrimoine) => {
  const actions = [];
  const alertes = userProfile?.alertes || [];

  if (alertes.some(a => a.toLowerCase().includes('ifi')) || patrimoine > 1300000) {
    actions.push({ urgence: 'rouge', titre: 'Bilan IFI obligatoire', description: 'Votre patrimoine dépasse 1,3M€ — vous êtes potentiellement soumis à l\'IFI. Un bilan précis avec un fiscaliste est indispensable pour évaluer votre base taxable et identifier les actifs exonérés (parts de résidence principale, bois et forêts, biens professionnels).', economieLabel: 'Variable selon situation', economie: 0, coutLabel: '~500€ (fiscaliste)', cout: 500, delai: '< 3 mois', partenaire: { nom: 'Cabinet Montaigne Fiscal', type: 'Fiscaliste partenaire', disponibilite: 'Sous 72h' } });
  }
  if (alertes.some(a => a.toLowerCase().includes('étranger') || a.toLowerCase().includes('international'))) {
    actions.push({ urgence: 'rouge', titre: 'Anticiper la fiscalité internationale', description: 'Un bien étranger dans une succession franco-étrangère peut être taxé deux fois. Le règlement UE 650/2012 et les conventions bilatérales peuvent éviter cette double imposition — à anticiper avant tout décès. Une structuration préventive peut réduire drastiquement la facture.', economieLabel: 'Évite la double imposition', economie: 0, coutLabel: '~800€ (notaire + fiscaliste)', cout: 800, delai: '< 6 mois', partenaire: { nom: 'Maison Droit & Patrimoine International', type: 'Avocat fiscaliste international partenaire', disponibilite: 'Sur rendez-vous' } });
  }
  if (!userProfile?.regime) {
    actions.push({ urgence: 'orange', titre: 'Clarifier votre régime matrimonial', description: 'Le régime matrimonial conditionne toute la transmission patrimoniale. Sans contrat de mariage, vous êtes en communauté légale réduite aux acquêts — ce qui peut créer des situations défavorables pour le conjoint survivant ou les enfants selon votre situation.', economieLabel: 'Protège le conjoint survivant', economie: 0, coutLabel: '~300€ (notaire)', cout: 300, delai: '< 6 mois', partenaire: { nom: 'Office Notarial Beaumont', type: 'Notaire partenaire', disponibilite: 'Sous 1 semaine' } });
  }
  if (patrimoine > 0) {
    actions.push({ urgence: 'vert', titre: 'Ouvrir ou alimenter une assurance-vie', description: 'L\'assurance-vie est le levier d\'optimisation successorale le plus puissant en France : 152 500€ par bénéficiaire hors succession avant 70 ans. La clause bénéficiaire, rédigée sur mesure, peut démultiplier cet avantage. Plus tôt vous commencez, plus l\'abattement est exploitable.', economieLabel: `Jusqu'à 152 500€ par bénéficiaire hors succession`, economie: 152500, coutLabel: 'Gratuit (ouverture)', cout: 0, delai: '< 3 mois', partenaire: { nom: 'Altus Patrimoine', type: 'Conseiller en gestion de patrimoine partenaire', disponibilite: 'Disponible immédiatement' } });
  }
  if (userProfile?.objectifs) {
    actions.push({ urgence: 'vert', titre: 'Formaliser votre stratégie avec un notaire', description: `Sur la base de vos objectifs (${userProfile.objectifs}), un notaire patrimonial peut formaliser une stratégie complète : donations avec réserve d'usufruit, testament sur mesure, mandat de protection future. Le coût de la consultation est souvent récupéré dès la première optimisation réalisée.`, economieLabel: 'Stratégie patrimoniale sur mesure', economie: 0, coutLabel: '~500€ (consultation initiale)', cout: 500, delai: '6–12 mois', partenaire: { nom: 'Étude Lefebvre & Associés', type: 'Notaire patrimonial partenaire', disponibilite: 'Sous 1 semaine' } });
  }
  if (actions.length === 0) {
    actions.push({ urgence: 'vert', titre: 'Affiner votre profil patrimonial', description: 'Pour des recommandations personnalisées et des calculs précis, complétez votre profil en répondant à davantage de questions lors de l\'onboarding. Plus votre situation est détaillée, plus le plan d\'action sera ciblé et actionnable.', economieLabel: 'Recommandations sur mesure', economie: 0, coutLabel: 'Gratuit', cout: 0, delai: 'Dès maintenant', partenaire: null });
  }
  return actions.slice(0, 3);
};

export default function Dashboard({ pov, actifs, userProfile }) {
  const [tab, setTab] = useState('succession');
  const [selectedAction, setSelectedAction] = useState(null);
  const [loading, setLoading] = useState(true);

  const isUserPov = pov === 'user' && userProfile;
  const person = isUserPov
    ? { prenom: userProfile.prenom || 'Vous', age: userProfile.age, role: 'Utilisateur', profession: userProfile.profession }
    : getPersonne(pov);
  const patrimoine = getPatrimoine(pov, actifs);
  const calculs = isUserPov ? computeUserCalculs(patrimoine, userProfile) : (CALCULS[pov] || CALCULS.lucas);
  const actions = isUserPov ? generateUserActions(userProfile, patrimoine) : (ACTIONS[pov] || ACTIONS.lucas);

  useEffect(() => {
    setLoading(true);
    const t = setTimeout(() => setLoading(false), 500);
    return () => clearTimeout(t);
  }, [pov]);

  const scoreColor = calculs.score > 70 ? '#DC2626' : calculs.score > 50 ? '#D97706' : '#16A34A';
  const scoreLabel = calculs.score > 70 ? 'Risque élevé' : calculs.score > 50 ? 'Risque modéré' : 'Risque faible';

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '36px 24px 100px' }} className="fade-in">

      {/* Header */}
      <div style={{ marginBottom: 36 }}>
        <p style={{ color: '#C9A96E', fontSize: 12, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 6 }}>Tableau de bord</p>
        <h1 className="font-serif" style={{ color: '#1B2B4B', fontSize: 34, fontWeight: 700, margin: 0 }}>
          Bonjour, {person?.prenom} <span style={{ color: '#C9A96E' }}>✦</span>
        </h1>
        <p style={{ color: '#9CA3AF', marginTop: 6, fontSize: 14 }}>
          Situation patrimoniale au {new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
      </div>

      {/* 3 cartes du haut */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 18, marginBottom: 24 }}>

        <div className="card" style={{ padding: 24 }}>
          <p style={{ color: '#9CA3AF', fontSize: 12, fontWeight: 500, letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 10 }}>Patrimoine propre</p>
          {loading ? <div style={{ marginBottom: 12 }}><Skeleton h={42} /></div> : (
            <p className="font-serif" style={{ color: '#1B2B4B', fontSize: 38, fontWeight: 700, margin: '0 0 12px' }}>{euro(patrimoine)}</p>
          )}
          <div style={{ borderTop: '1px solid #F5F0EA', paddingTop: 12 }}>
            <p style={{ color: '#9CA3AF', fontSize: 12, marginBottom: 4 }}>Droit successoral estimé</p>
            {loading ? <Skeleton h={24} w="55%" /> : (
              <p style={{ color: '#C9A96E', fontWeight: 700, fontSize: 20, margin: 0 }}>{euro(calculs.successionEstimee)}</p>
            )}
          </div>
        </div>

        <div className="card" style={{ padding: 24 }}>
          <p style={{ color: '#9CA3AF', fontSize: 12, fontWeight: 500, letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 14 }}>Score de risque successoral</p>
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
                <p style={{ fontWeight: 600, color: '#2C2C2C', fontSize: 16, margin: '0 0 4px' }}>{scoreLabel}</p>
                <p style={{ color: '#9CA3AF', fontSize: 12, lineHeight: 1.5, margin: 0 }}>
                  {calculs.score > 70 ? 'Actions urgentes nécessaires' : calculs.score > 50 ? 'Optimisations identifiées' : 'Situation bien maîtrisée'}
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="card" style={{ padding: 24, borderLeft: '4px solid #C9A96E' }}>
          <p style={{ color: '#9CA3AF', fontSize: 12, fontWeight: 500, letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 10 }}>Économies identifiées</p>
          {loading ? <div style={{ marginBottom: 12 }}><Skeleton h={42} /></div> : (
            <p className="font-serif" style={{ color: '#C9A96E', fontSize: 38, fontWeight: 700, margin: '0 0 12px' }}>{euro(calculs.economieSuccession)}</p>
          )}
          <p style={{ color: '#9CA3AF', fontSize: 13, margin: 0 }}>En appliquant les {actions.length} recommandations</p>
        </div>
      </div>

      {/* Onglets */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div style={{ borderBottom: '1px solid #F5F0EA', display: 'flex', padding: '0 6px' }}>
          {[['succession', '⚖ Succession'], ['optimisation', '📈 Optimisation fiscale']].map(([id, label]) => (
            <button key={id} onClick={() => setTab(id)} style={{
              padding: '14px 24px', fontSize: 14, fontWeight: 500, cursor: 'pointer', border: 'none', background: 'none',
              fontFamily: 'Inter, sans-serif', transition: 'all 0.2s', marginBottom: -1,
              color: tab === id ? '#1B2B4B' : '#9CA3AF',
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
                  { label: 'Droits après optimisation', val: calculs.droits.optimise, bg: '#F0FDF4', color: '#16A34A', sub: 'Scénario optimisé' },
                  { label: 'Économie possible', val: calculs.economieSuccession, bg: '#FFF8F0', color: '#C9A96E', sub: 'Avec les actions recommandées', border: '1px solid #FDE8C8' },
                ].map(({ label, val, bg, color, sub, border }) => (
                  <div key={label} style={{ background: bg, borderRadius: 10, padding: 20, border }}>
                    <p style={{ color: '#9CA3AF', fontSize: 12, marginBottom: 8 }}>{label}</p>
                    {loading ? <Skeleton h={30} /> : <p style={{ color, fontSize: 26, fontWeight: 700, margin: '0 0 4px' }}>{euro(val)}</p>}
                    <p style={{ color: '#9CA3AF', fontSize: 11, margin: 0 }}>{sub}</p>
                  </div>
                ))}
              </div>

              {/* Détail par levier */}
              <div style={{ background: '#FAFAF9', border: '1px solid #F0EBE4', borderRadius: 10, padding: 18, marginBottom: 24 }}>
                <p style={{ color: '#9CA3AF', fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 12 }}>Comment on y arrive — détail par levier</p>
                {actions.map((a, i) => {
                  const urgenceColor = a.urgence === 'rouge' ? '#DC2626' : a.urgence === 'orange' ? '#D97706' : '#16A34A';
                  return (
                    <div key={i} style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, paddingBottom: i < actions.length - 1 ? 10 : 0, marginBottom: i < actions.length - 1 ? 10 : 0, borderBottom: i < actions.length - 1 ? '1px dashed #EDE8E3' : 'none' }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, flex: 1 }}>
                        <span style={{ color: urgenceColor, fontSize: 16, lineHeight: 1, flexShrink: 0, marginTop: 1 }}>●</span>
                        <span style={{ color: '#374151', fontSize: 13 }}>{a.titre}</span>
                      </div>
                      <span style={{ color: a.economie > 0 ? '#C9A96E' : '#9CA3AF', fontWeight: a.economie > 0 ? 700 : 400, fontSize: 13, whiteSpace: 'nowrap', flexShrink: 0 }}>
                        {a.economie > 0 ? euro(a.economie) : a.economieLabel}
                      </span>
                    </div>
                  );
                })}
              </div>

              <div>
                <p style={{ color: '#9CA3AF', fontSize: 13, marginBottom: 16, fontWeight: 500 }}>Comparatif visuel</p>
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
                  { label: 'Économies possibles', val: calculs.economiesAnnuelles, suffix: '/an', color: '#16A34A', bg: '#F0FDF4', sub: 'Gain annuel possible' },
                  { label: 'Gain sur 10 ans', val: calculs.gainDixAns, suffix: '', color: '#C9A96E', bg: '#FFF8F0', sub: 'Projection optimisation', border: '1px solid #FDE8C8' },
                ].map(({ label, val, suffix, color, bg, sub, border }) => (
                  <div key={label} style={{ background: bg, borderRadius: 10, padding: 20, border }}>
                    <p style={{ color: '#9CA3AF', fontSize: 12, marginBottom: 8 }}>{label}</p>
                    {loading ? <Skeleton h={28} /> : <p style={{ color, fontSize: 24, fontWeight: 700, margin: '0 0 4px' }}>{euro(val)}{suffix}</p>}
                    <p style={{ color: '#9CA3AF', fontSize: 11, margin: 0 }}>{sub}</p>
                  </div>
                ))}
              </div>
              {/* Détail par levier — optimisation */}
              <div style={{ background: '#FAFAF9', border: '1px solid #F0EBE4', borderRadius: 10, padding: 18, marginBottom: 20 }}>
                <p style={{ color: '#9CA3AF', fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 12 }}>Économies possibles — détail par action</p>
                {actions.map((a, i) => {
                  const urgenceColor = a.urgence === 'rouge' ? '#DC2626' : a.urgence === 'orange' ? '#D97706' : '#16A34A';
                  return (
                    <div key={i} style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, paddingBottom: i < actions.length - 1 ? 10 : 0, marginBottom: i < actions.length - 1 ? 10 : 0, borderBottom: i < actions.length - 1 ? '1px dashed #EDE8E3' : 'none' }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, flex: 1 }}>
                        <span style={{ color: urgenceColor, fontSize: 16, lineHeight: 1, flexShrink: 0, marginTop: 1 }}>●</span>
                        <div>
                          <span style={{ color: '#374151', fontSize: 13 }}>{a.titre}</span>
                          <span style={{ color: '#9CA3AF', fontSize: 12, marginLeft: 8 }}>· coût {a.coutLabel}</span>
                        </div>
                      </div>
                      <span style={{ color: a.economie > 0 ? '#16A34A' : '#9CA3AF', fontWeight: a.economie > 0 ? 700 : 400, fontSize: 13, whiteSpace: 'nowrap', flexShrink: 0 }}>
                        {a.economie > 0 ? `+ ${euro(a.economie)}` : a.economieLabel}
                      </span>
                    </div>
                  );
                })}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div style={{ background: '#F9FAFB', borderRadius: 10, padding: 20 }}>
                  <p style={{ color: '#9CA3AF', fontSize: 12, marginBottom: 14, fontWeight: 500 }}>Répartition fiscale</p>
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
                  <p style={{ color: '#9CA3AF', fontSize: 12, marginBottom: 10 }}>Taux effectif estimé</p>
                  <p className="font-serif" style={{ fontSize: 44, fontWeight: 700, color: calculs.impots.total > 15000 ? '#DC2626' : '#16A34A', margin: 0 }}>
                    {patrimoine > 0 ? `${Math.round((calculs.impots.total / Math.max(patrimoine * 0.04, 1)) * 100)}%` : '0%'}
                  </p>
                  <p style={{ color: '#9CA3AF', fontSize: 11, marginTop: 6 }}>sur revenus estimés</p>
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
          <p style={{ color: '#9CA3AF', fontSize: 13, margin: 0 }}>Pour {person?.prenom}, triées par urgence</p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {actions.map((action, i) => (
            <div key={i} style={{ border: '1px solid #F0EBE4', borderRadius: 10, padding: 20, transition: 'box-shadow 0.2s' }}
              onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 18px rgba(27,43,75,0.09)'}
              onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 200 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10, flexWrap: 'wrap' }}>
                    <Badge urgence={action.urgence} />
                    <span style={{ fontWeight: 600, color: '#1B2B4B', fontSize: 15 }}>{action.titre}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
                    <span style={{ color: '#16A34A', fontSize: 13 }}>✓ {action.economieLabel}</span>
                    <span style={{ color: '#6B7280', fontSize: 13 }}>Coût : {action.coutLabel}</span>
                    <span style={{ color: '#9CA3AF', fontSize: 13 }}>⏱ {action.delai}</span>
                  </div>
                </div>
                <button className="btn-navy" onClick={() => setSelectedAction(action)} style={{ fontSize: 13, padding: '9px 18px', whiteSpace: 'nowrap' }}>
                  En savoir plus →
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <Modal open={!!selectedAction} onClose={() => setSelectedAction(null)} title={selectedAction?.titre}>
        {selectedAction && (
          <>
            <div style={{ marginBottom: 16 }}><Badge urgence={selectedAction.urgence} /></div>
            <p style={{ color: '#4B5563', lineHeight: 1.75, fontSize: 14, marginBottom: 20 }}>{selectedAction.description}</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
              <div style={{ background: '#F0FDF4', borderRadius: 9, padding: 16 }}>
                <p style={{ color: '#9CA3AF', fontSize: 12, marginBottom: 4 }}>Économie potentielle</p>
                <p style={{ color: '#16A34A', fontWeight: 700, fontSize: 17, margin: 0 }}>{selectedAction.economieLabel}</p>
              </div>
              <div style={{ background: '#F9FAFB', borderRadius: 9, padding: 16 }}>
                <p style={{ color: '#9CA3AF', fontSize: 12, marginBottom: 4 }}>Coût de l'action</p>
                <p style={{ color: '#1B2B4B', fontWeight: 700, fontSize: 17, margin: 0 }}>{selectedAction.coutLabel}</p>
              </div>
            </div>
            <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 8, padding: 14, marginBottom: selectedAction.partenaire ? 12 : 0 }}>
              <p style={{ color: '#92400E', fontSize: 13, fontWeight: 500, margin: 0 }}>⏱ Délai recommandé : {selectedAction.delai}</p>
            </div>
            {selectedAction.partenaire && (
              <div style={{ background: '#F5F0EA', border: '1px solid #E8DDD0', borderRadius: 8, padding: 16 }}>
                <p style={{ color: '#9CA3AF', fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', margin: '0 0 8px' }}>Partenaire recommandé par Nesso</p>
                <p style={{ color: '#1B2B4B', fontWeight: 700, fontSize: 15, margin: '0 0 2px' }}>{selectedAction.partenaire.nom}</p>
                <p style={{ color: '#6B7280', fontSize: 12, margin: '0 0 10px' }}>{selectedAction.partenaire.type}</p>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                  <span style={{ color: '#16A34A', fontSize: 12 }}>● {selectedAction.partenaire.disponibilite}</span>
                  <button className="btn-navy" style={{ fontSize: 12, padding: '7px 14px' }}>Prendre rendez-vous →</button>
                </div>
              </div>
            )}
          </>
        )}
      </Modal>
    </div>
  );
}
