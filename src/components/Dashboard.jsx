import { useState, useEffect } from 'react';
import { CALCULS, ACTIONS } from '../data.js';
import { euro, getPersonne, getPatrimoine, filterActifsByPov } from '../utils.js';
import { Badge, Skeleton, Modal, urgenceColor } from './Shared.jsx';
import { computeUserCalculs, computeFocusACalculs, calcBaseIFI, calcTauxNuePropriete } from '../engine/calculs.js';
import { generateUserActions } from '../engine/actions.js';
import { generateScenarios, generateTimeline } from '../engine/scenarios.js';

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

  // Scénarios comparatifs + calendrier (uniquement POV user, si données suffisantes)
  const scenarios  = isUserPov ? generateScenarios(userProfileForPov, patrimoine, isFocusA) : null;
  const timeline   = isUserPov ? generateTimeline(userProfileForPov) : [];

  // Freemium — hardcodé false en V1 (TODO : connecter à l'état d'abonnement Supabase)
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

  // ── Composant interne : liste des leviers d'une action ─────────────────────
  // Dédupliqué : utilisé identiquement dans l'onglet succession et optimisation
  const LeviersList = ({ list }) => (
    <div style={{ background: '#FAFAF9', border: '1px solid #F0EBE4', borderRadius: 10, padding: 18, marginBottom: 20 }}>
      <p style={{ color: '#7A7A8C', fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 12 }}>
        Économies possibles — détail par action
      </p>
      {list.map((a, i) => {
        const uColor = urgenceColor(a.urgence);
        return (
          <div key={i} style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, paddingBottom: i < list.length - 1 ? 10 : 0, marginBottom: i < list.length - 1 ? 10 : 0, borderBottom: i < list.length - 1 ? '1px dashed #EDE8E3' : 'none' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, flex: 1 }}>
              <span style={{ color: uColor, fontSize: 16, lineHeight: 1, flexShrink: 0, marginTop: 1 }}>●</span>
              <span style={{ color: '#374151', fontSize: 13 }}>{a.titre}</span>
            </div>
            <span style={{ color: a.economie > 0 ? '#C9A96E' : '#7A7A8C', fontWeight: a.economie > 0 ? 700 : 400, fontSize: 13, whiteSpace: 'nowrap', flexShrink: 0 }}>
              {a.economie > 0 ? euro(a.economie) : a.economieLabel}
            </span>
          </div>
        );
      })}
    </div>
  );

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
                      { label: 'Abattement disponible', val: calculs.focusA.nbParentsEnVie > 0 ? `${euro(calculs.focusA.abattementTotal)} (${calculs.focusA.nbParentsEnVie} parent${calculs.focusA.nbParentsEnVie > 1 ? 's' : ''} × 100 000€)` : 'Aucun (aucun parent en vie)' },
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

              {/* Détail par levier — succession */}
              <LeviersList list={actions} />

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

              {/* Détail par levier — optimisation (même composant) */}
              <LeviersList list={actions} />

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

      {/* ── Scénarios comparatifs ── */}
      {scenarios && scenarios.length === 3 && (
        <div className="card" style={{ padding: 28, marginTop: 24 }}>
          <div style={{ marginBottom: 20 }}>
            <h2 className="font-serif" style={{ color: '#1B2B4B', fontSize: 24, margin: '0 0 4px' }}>Scénarios comparatifs</h2>
            <p style={{ color: '#7A7A8C', fontSize: 13, margin: 0 }}>
              {isFocusA ? "Droits à régler selon le niveau d'organisation de vos parents" : 'Droits de succession selon vos actions'}
            </p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
            {scenarios.map((s, i) => {
              const isHighlight = s.highlight;
              const economieRelative = i === 0 ? null : Math.max(0, scenarios[0].droits - s.droits);
              return (
                <div key={s.nom} style={{
                  background: isHighlight ? 'linear-gradient(135deg, #FFFDF9 0%, #FFF8EE 100%)' : '#F9FAFB',
                  border: isHighlight ? '1px solid #FDE8C8' : '1px solid #F0EBE4',
                  borderRadius: 12, padding: 22, position: 'relative',
                  boxShadow: isHighlight ? '0 2px 12px rgba(201,169,110,0.12)' : 'none',
                }}>
                  {isHighlight && (
                    <span style={{ position: 'absolute', top: -10, right: 14, background: '#C9A96E', color: 'white', fontSize: 10, fontWeight: 700, padding: '2px 10px', borderRadius: 20, letterSpacing: '0.06em' }}>
                      OPTIMISÉ
                    </span>
                  )}
                  <p style={{ color: isHighlight ? '#B8895A' : '#7A7A8C', fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', margin: '0 0 10px' }}>
                    Scénario {i + 1}
                  </p>
                  <p style={{ color: '#1B2B4B', fontSize: 16, fontWeight: 700, margin: '0 0 4px' }}>{s.nom}</p>
                  {loading ? <Skeleton h={32} /> : (
                    <p className="font-serif" style={{ color: i === 0 ? '#E24B4A' : '#10B981', fontSize: 30, fontWeight: 700, margin: '0 0 6px' }}>
                      {euro(s.droits)}
                    </p>
                  )}
                  {economieRelative !== null && economieRelative > 0 && (
                    <p style={{ color: '#C9A96E', fontSize: 13, fontWeight: 600, margin: '0 0 10px' }}>
                      − {euro(economieRelative)} vs statu quo
                    </p>
                  )}
                  {economieRelative === null && (
                    <p style={{ color: '#7A7A8C', fontSize: 12, margin: '0 0 10px' }}>Référence</p>
                  )}
                  <p style={{ color: '#6B7280', fontSize: 12, lineHeight: 1.55, margin: '0 0 12px' }}>{s.description}</p>
                  {s.leviers.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      {s.leviers.map(l => (
                        <span key={l} style={{ color: '#10B981', fontSize: 11, fontWeight: 500 }}>✓ {l}</span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Calendrier patrimonial ── */}
      {timeline.length > 0 && (
        <div className="card" style={{ padding: 28, marginTop: 24 }}>
          <div style={{ marginBottom: 20 }}>
            <h2 className="font-serif" style={{ color: '#1B2B4B', fontSize: 24, margin: '0 0 4px' }}>Calendrier patrimonial</h2>
            <p style={{ color: '#7A7A8C', fontSize: 13, margin: 0 }}>
              Actions time-sensitive — les opportunités fiscales ont des dates d'expiration
            </p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {timeline.map((item, i) => {
              const uColor  = urgenceColor(item.urgence);
              const urgenceBg     = item.urgence === 'rouge' ? '#FEF2F2' : item.urgence === 'orange' ? '#FFFBEB' : '#F0FDF4';
              const urgenceLabel  = item.urgence === 'rouge' ? 'Urgent' : item.urgence === 'orange' ? 'À planifier' : 'Fenêtre ouverte';
              const typeIcon      = item.type === 'renouvellement' ? '🔄' : '📅';
              const isLast        = i === timeline.length - 1;
              return (
                <div key={i} style={{ display: 'flex', gap: 16, paddingBottom: isLast ? 0 : 20 }}>
                  {/* Ligne verticale + point */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0, width: 20 }}>
                    <div style={{ width: 14, height: 14, borderRadius: '50%', background: uColor, flexShrink: 0, marginTop: 3 }} />
                    {!isLast && <div style={{ width: 2, flex: 1, background: '#F0EBE4', marginTop: 4, borderRadius: 1 }} />}
                  </div>
                  {/* Contenu */}
                  <div style={{ flex: 1, paddingBottom: isLast ? 0 : 4 }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, flexWrap: 'wrap', marginBottom: 6 }}>
                      <span style={{ fontSize: 15 }}>{typeIcon}</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 3 }}>
                          <span style={{ fontWeight: 600, color: '#1B2B4B', fontSize: 14 }}>{item.titre}</span>
                          <span style={{ background: urgenceBg, color: uColor, fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20, letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>
                            {urgenceLabel}
                          </span>
                        </div>
                        <p style={{ color: '#C9A96E', fontSize: 11, fontWeight: 600, margin: '0 0 4px', letterSpacing: '0.04em' }}>
                          ⏱ {item.label}
                        </p>
                        <p style={{ color: '#6B7280', fontSize: 13, lineHeight: 1.55, margin: 0 }}>{item.description}</p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

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
              { icon: '🔄', titre: 'Recalcul automatique', desc: 'Vos recommandations se mettent à jour chaque fois que vous ajoutez un actif ou un membre à votre famille. Votre plan reste toujours à jour.' },
              { icon: '🔔', titre: 'Alertes législatives personnalisées', desc: 'Nesso vous prévient si une loi change et impacte votre situation spécifique — pas une newsletter généraliste, une alerte ciblée sur votre patrimoine.' },
              { icon: '📄', titre: 'Rapport PDF structuré', desc: 'Un document complet, prêt à apporter à votre notaire ou CGP : patrimoine, recommandations, étapes, chiffres clés.' },
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
