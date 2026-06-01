import { useState } from 'react';
import { FAMILLE, ACTIONS } from '../data.js';
import { euro, getPersonne, getPatrimoine, getActifsByOwner, getAlerts } from '../utils.js';
import { Badge } from './Shared.jsx';

export default function Famille({ pov, setPov, actifs, userProfile }) {
  const [selected, setSelected] = useState(null);
  const toggle = (id) => setSelected(selected === id ? null : id);

  const gen = [0, 1, 2].map(g => FAMILLE.filter(p => p.generation === g));

  // Vue personnalisée quand l'utilisateur a fait l'onboarding
  // (s'applique aussi quand on regarde depuis le POV d'un membre de la famille
  // de l'user, car la même arbre est pertinent)
  const isFamilyContext = userProfile && (pov === 'user' || pov === 'conjoint' || pov.startsWith?.('enfant_'));
  if (isFamilyContext) {
    const userActifs = getActifsByOwner('user', actifs);
    const userPatrimoine = getPatrimoine('user', actifs);
    const hasFamily = userProfile.conjoint || (userProfile.enfants_prenoms?.length > 0);
    return (
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '36px 24px 100px' }} className="fade-in">
        <div style={{ marginBottom: 32 }}>
          <p style={{ color: '#C9A96E', fontSize: 12, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 6 }}>Ma famille</p>
          <h1 className="font-serif" style={{ color: '#1B2B4B', fontSize: 34, margin: 0 }}>Votre situation familiale</h1>
          <p style={{ color: '#7A7A8C', marginTop: 6, fontSize: 14 }}>Basé sur vos réponses lors de l'audit</p>
        </div>
        <div className="card" style={{ padding: 32, marginBottom: 22 }}>
          {/* Grands-parents */}
          {(userProfile.famille?.gp_maternels_vivants || userProfile.famille?.gp_paternels_vivants || userProfile.succession?.grands_parents_vivants) && (
            <>
              <p style={{ textAlign: 'center', color: '#A8A8B8', fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 12 }}>Grands-parents</p>
              <div style={{ display: 'flex', justifyContent: 'center', gap: 12, marginBottom: 4, flexWrap: 'wrap' }}>
                {userProfile.famille?.gp_maternels_vivants && (
                  <div style={{ textAlign: 'center', minWidth: 90 }}>
                    <div style={{ width: 38, height: 38, borderRadius: '50%', background: '#F5F0EA', border: '2px solid #E8DDD0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#1B2B4B', fontWeight: 700, fontSize: 15, margin: '0 auto 6px' }}>GM</div>
                    <p style={{ fontWeight: 600, color: '#1B2B4B', fontSize: 12, margin: '0 0 2px' }}>GP maternels</p>
                    <p style={{ color: '#7A7A8C', fontSize: 10, margin: 0 }}>En vie</p>
                    {userProfile.famille?.patrimoine_gp_estime > 0 && <p style={{ color: '#C9A96E', fontWeight: 700, fontSize: 12, marginTop: 4 }}>{euro(userProfile.famille.patrimoine_gp_estime)}</p>}
                  </div>
                )}
                {userProfile.famille?.gp_paternels_vivants && (
                  <div style={{ textAlign: 'center', minWidth: 90 }}>
                    <div style={{ width: 38, height: 38, borderRadius: '50%', background: '#F5F0EA', border: '2px solid #E8DDD0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#1B2B4B', fontWeight: 700, fontSize: 15, margin: '0 auto 6px' }}>GP</div>
                    <p style={{ fontWeight: 600, color: '#1B2B4B', fontSize: 12, margin: '0 0 2px' }}>GP paternels</p>
                    <p style={{ color: '#7A7A8C', fontSize: 10, margin: 0 }}>En vie</p>
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 4 }}>
                <div style={{ width: 2, height: 28, background: '#E8DDD0' }} />
              </div>
            </>
          )}
          {/* Parents */}
          {userProfile.parents_en_vie && userProfile.parents_en_vie !== 'non' && (
            <>
              <p style={{ textAlign: 'center', color: '#A8A8B8', fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 12 }}>Parents</p>
              <div style={{ display: 'flex', justifyContent: 'center', gap: 20, marginBottom: 4, flexWrap: 'wrap' }}>
                {(userProfile.parents_en_vie === 'les_deux' || userProfile.parents_en_vie === 'pere' || userProfile.parents_en_vie === true) && (
                  <div style={{ textAlign: 'center', minWidth: 110 }}>
                    <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#F5F0EA', border: '2px solid #E8DDD0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#1B2B4B', fontWeight: 700, fontSize: 18, margin: '0 auto 8px' }}>
                      {(userProfile.famille?.pere_prenom || 'P')[0].toUpperCase()}
                    </div>
                    <p style={{ fontWeight: 600, color: '#1B2B4B', fontSize: 13, margin: '0 0 2px' }}>{userProfile.famille?.pere_prenom || 'Père'}</p>
                    <p style={{ color: '#7A7A8C', fontSize: 11, margin: 0 }}>En vie</p>
                    {/* Patrimoine individuel — seulement si père seul en vie */}
                    {(userProfile.parents_en_vie === 'pere') && userProfile.famille?.patrimoine_parents_estime > 0 && (
                      <p style={{ color: '#C9A96E', fontWeight: 700, fontSize: 12, marginTop: 4 }}>{euro(userProfile.famille.patrimoine_parents_estime)}</p>
                    )}
                  </div>
                )}
                {(userProfile.parents_en_vie === 'les_deux' || userProfile.parents_en_vie === 'mere' || userProfile.parents_en_vie === true) && (
                  <div style={{ textAlign: 'center', minWidth: 110 }}>
                    <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#F5F0EA', border: '2px solid #E8DDD0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#1B2B4B', fontWeight: 700, fontSize: 18, margin: '0 auto 8px' }}>
                      {(userProfile.famille?.mere_prenom || 'M')[0].toUpperCase()}
                    </div>
                    <p style={{ fontWeight: 600, color: '#1B2B4B', fontSize: 13, margin: '0 0 2px' }}>{userProfile.famille?.mere_prenom || 'Mère'}</p>
                    <p style={{ color: '#7A7A8C', fontSize: 11, margin: 0 }}>En vie</p>
                    {/* Patrimoine individuel — seulement si mère seule en vie */}
                    {(userProfile.parents_en_vie === 'mere') && userProfile.famille?.patrimoine_parents_estime > 0 && (
                      <p style={{ color: '#C9A96E', fontWeight: 700, fontSize: 12, marginTop: 4 }}>{euro(userProfile.famille.patrimoine_parents_estime)}</p>
                    )}
                  </div>
                )}
              </div>
              {/* Patrimoine commun — centré entre père et mère quand les deux sont en vie */}
              {(userProfile.parents_en_vie === 'les_deux' || userProfile.parents_en_vie === true) && userProfile.famille?.patrimoine_parents_estime > 0 && (
                <p style={{ textAlign: 'center', color: '#C9A96E', fontWeight: 700, fontSize: 12, margin: '6px 0 4px', letterSpacing: '0.02em' }}>
                  Patrimoine commun estimé : {euro(userProfile.famille.patrimoine_parents_estime)}
                </p>
              )}
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
                <div style={{ width: 2, height: 32, background: '#C9A96E' }} />
              </div>
            </>
          )}
          {/* User + conjoint */}
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 24, flexWrap: 'wrap' }}>
            <div style={{ textAlign: 'center', minWidth: 130 }}>
              <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#C9A96E', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: 22, margin: '0 auto 12px' }}>
                {(userProfile.prenom || 'V')[0].toUpperCase()}
              </div>
              <p style={{ fontWeight: 700, color: '#1B2B4B', fontSize: 16, margin: '0 0 3px' }}>{userProfile.prenom || 'Vous'}</p>
              <p style={{ color: '#C9A96E', fontSize: 12, margin: '0 0 4px', fontWeight: 500 }}>Vous</p>
              {userProfile.age && <p style={{ color: '#7A7A8C', fontSize: 12, margin: '0 0 2px' }}>{userProfile.age} ans</p>}
              {userProfile.profession && <p style={{ color: '#7A7A8C', fontSize: 12, margin: 0 }}>{userProfile.profession}</p>}
              {userPatrimoine > 0 && <p style={{ color: '#C9A96E', fontWeight: 700, fontSize: 14, marginTop: 8 }}>{euro(userPatrimoine)}</p>}
            </div>
            {userProfile.conjoint && (
              <>
                <div style={{ color: '#C9A96E', fontSize: 28, fontWeight: 300 }}>⸺</div>
                <div style={{ textAlign: 'center', minWidth: 130 }}>
                  <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#1B2B4B', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: 22, margin: '0 auto 12px' }}>
                    {userProfile.conjoint[0].toUpperCase()}
                  </div>
                  <p style={{ fontWeight: 700, color: '#1B2B4B', fontSize: 16, margin: '0 0 3px' }}>{userProfile.conjoint}</p>
                  <p style={{ color: '#7A7A8C', fontSize: 12, margin: 0 }}>Conjoint(e)</p>
                  {userProfile.regime && <p style={{ color: '#7A7A8C', fontSize: 11, marginTop: 4 }}>{userProfile.regime}</p>}
                </div>
              </>
            )}
          </div>
          {/* Enfants */}
          {userProfile.enfants_prenoms?.length > 0 && (
            <>
              <div style={{ display: 'flex', justifyContent: 'center', margin: '24px 0 0' }}>
                <div style={{ width: 2, height: 32, background: '#C9A96E' }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'center', gap: 20, flexWrap: 'wrap' }}>
                {userProfile.enfants_prenoms.map((prenom, i) => (
                  <div key={i} style={{ textAlign: 'center', minWidth: 100 }}>
                    <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#F5F0EA', border: '2px solid #E8DDD0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#1B2B4B', fontWeight: 700, fontSize: 18, margin: '0 auto 8px' }}>
                      {prenom[0].toUpperCase()}
                    </div>
                    <p style={{ fontWeight: 600, color: '#1B2B4B', fontSize: 13, margin: '0 0 2px' }}>{prenom}</p>
                    <p style={{ color: '#7A7A8C', fontSize: 11, margin: 0 }}>Enfant</p>
                  </div>
                ))}
              </div>
            </>
          )}
          {/* Fratrie */}
          {userProfile.famille?.fratrie?.length > 0 && (
            <div style={{ borderTop: '1px dashed #EDE8E3', marginTop: 28, paddingTop: 20 }}>
              <p style={{ textAlign: 'center', color: '#A8A8B8', fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 14 }}>Fratrie</p>
              <div style={{ display: 'flex', justifyContent: 'center', gap: 16, flexWrap: 'wrap' }}>
                {userProfile.famille.fratrie.map((f, i) => (
                  <div key={i} style={{ textAlign: 'center', minWidth: 90 }}>
                    <div style={{ width: 38, height: 38, borderRadius: '50%', background: '#F5F0EA', border: '2px solid #E8DDD0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#1B2B4B', fontWeight: 700, fontSize: 15, margin: '0 auto 6px' }}>
                      {(f.prenom || (f.lien === 'sœur' ? 'S' : 'F'))[0].toUpperCase()}
                    </div>
                    <p style={{ fontWeight: 600, color: '#1B2B4B', fontSize: 12, margin: '0 0 2px' }}>{f.prenom || (f.lien === 'sœur' ? 'Sœur' : 'Frère')}</p>
                    <p style={{ color: '#7A7A8C', fontSize: 10, margin: 0 }}>{f.lien}</p>
                    {f.handicap && <p style={{ color: '#1D4ED8', fontSize: 10, marginTop: 3, fontWeight: 500 }}>Abatt. handicap</p>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Autres proches — tantes, oncles, cousins */}
          {userProfile.famille?.autres?.length > 0 && (
            <div style={{ borderTop: '1px dashed #EDE8E3', marginTop: 20, paddingTop: 20 }}>
              <p style={{ textAlign: 'center', color: '#A8A8B8', fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 14 }}>Autres proches</p>
              <div style={{ display: 'flex', justifyContent: 'center', gap: 14, flexWrap: 'wrap' }}>
                {userProfile.famille.autres.map((a, i) => (
                  <div key={i} style={{ textAlign: 'center', minWidth: 80 }}>
                    <div style={{ width: 34, height: 34, borderRadius: '50%', background: '#F9F8F6', border: '1px solid #E8DDD0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#7A7A8C', fontWeight: 700, fontSize: 13, margin: '0 auto 6px' }}>
                      {(a.prenom || a.lien || '?')[0].toUpperCase()}
                    </div>
                    <p style={{ fontWeight: 500, color: '#374151', fontSize: 12, margin: '0 0 2px' }}>{a.prenom || a.lien}</p>
                    <p style={{ color: '#A8A8B8', fontSize: 10, margin: 0 }}>{a.lien}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {!hasFamily && (
            <p style={{ textAlign: 'center', color: '#7A7A8C', fontSize: 13, marginTop: 20, fontStyle: 'italic' }}>
              Refaites l'audit et mentionnez les prénoms de vos proches pour enrichir cet arbre.
            </p>
          )}
        </div>
        {userActifs.length > 0 && (
          <div className="card" style={{ padding: 28 }}>
            <h3 style={{ fontWeight: 600, color: '#1B2B4B', fontSize: 18, marginBottom: 16 }}>Vos actifs déclarés</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))', gap: 12 }}>
              {userActifs.map(a => (
                <div key={a.id} style={{ background: '#F9FAFB', borderRadius: 9, padding: 14 }}>
                  <p style={{ fontWeight: 500, fontSize: 14, color: '#1A1A2E', margin: '0 0 4px' }}>{a.nom}</p>
                  <p style={{ color: '#C9A96E', fontWeight: 700, fontSize: 17, margin: '0 0 4px' }}>{euro(a.valeur)}</p>
                  <p style={{ color: '#7A7A8C', fontSize: 11, margin: 0 }}>{a.type}{a.pays ? ` · ${a.pays}` : ''}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  const MemberCard = ({ p }) => {
    const patrimoine = getPatrimoine(p.id, actifs);
    const alerts = getAlerts(p.id);
    const isPov = p.id === pov;
    const isSel = p.id === selected;
    return (
      <div onClick={() => toggle(p.id)} style={{
        border: `2px solid ${isPov ? '#C9A96E' : isSel ? '#1B2B4B' : '#E5E7EB'}`,
        borderRadius: 12, padding: 16, cursor: 'pointer', transition: 'all 0.22s',
        background: isPov ? '#FFFBF5' : isSel ? '#F0F4FF' : 'white',
        minWidth: 130, textAlign: 'center', position: 'relative',
      }}
        onMouseEnter={e => { if (!isPov && !isSel) e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(27,43,75,0.1)'; }}
        onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none'; }}>
        {alerts.length > 0 && (
          <div title={alerts.join(' | ')} style={{ position: 'absolute', top: 8, right: 8, width: 9, height: 9, borderRadius: '50%', background: '#E24B4A', animation: 'pulse 2s infinite' }} />
        )}
        <div style={{ width: 42, height: 42, borderRadius: '50%', background: isPov ? '#C9A96E' : '#1B2B4B', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: 17, margin: '0 auto 10px' }}>
          {p.prenom[0]}
        </div>
        <p style={{ fontWeight: 600, color: '#1B2B4B', fontSize: 14, margin: '0 0 3px' }}>{p.prenom}</p>
        <p style={{ color: '#7A7A8C', fontSize: 11, margin: '0 0 6px' }}>{p.age} ans</p>
        {patrimoine > 0 && <p style={{ color: '#C9A96E', fontWeight: 700, fontSize: 13, margin: 0 }}>{euro(patrimoine)}</p>}
        {ACTIONS[p.id] && <p style={{ color: '#7A7A8C', fontSize: 11, marginTop: 3 }}>{ACTIONS[p.id].length} action(s)</p>}
      </div>
    );
  };

  const selectedPerson  = selected ? getPersonne(selected) : null;
  const selectedActifs  = selected ? getActifsByOwner(selected, actifs) : [];
  const selectedActions = selected ? (ACTIONS[selected] || []) : [];
  const selectedAlerts  = selected ? getAlerts(selected) : [];

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '36px 24px 100px' }} className="fade-in">
      <div style={{ marginBottom: 32 }}>
        <p style={{ color: '#C9A96E', fontSize: 12, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 6 }}>Ma famille</p>
        <h1 className="font-serif" style={{ color: '#1B2B4B', fontSize: 34, margin: 0 }}>Arbre généalogique</h1>
        <p style={{ color: '#7A7A8C', marginTop: 6, fontSize: 14 }}>Cliquez sur un membre pour voir sa fiche · ⬤ rouge = alerte active</p>
      </div>

      {/* Arbre */}
      <div className="card" style={{ padding: 32, marginBottom: 22, overflowX: 'auto' }}>
        <div style={{ minWidth: 560, position: 'relative' }}>
          {/* Gen 0 */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: 16, position: 'relative', paddingBottom: 0 }}>
            <div style={{ position: 'absolute', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: 2, height: 36, background: '#C9A96E' }} />
            <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 80, height: 2, background: '#C9A96E' }} />
            {gen[0].map(p => <MemberCard key={p.id} p={p} />)}
          </div>
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <div style={{ width: 2, height: 36, background: '#C9A96E' }} />
          </div>
          {/* Gen 1 */}
          <div style={{ position: 'relative', display: 'flex', justifyContent: 'center', gap: 16 }}>
            <div style={{ position: 'absolute', top: '50%', left: '16%', right: '10%', height: 2, background: '#E5E7EB' }} />
            {gen[1].map(p => (
              <div key={p.id} style={{ position: 'relative', zIndex: 1 }}>
                {p.id === 'mere' && <div style={{ position: 'absolute', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: 2, height: 36, background: '#C9A96E' }} />}
                <MemberCard p={p} />
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <div style={{ width: 2, height: 36, background: '#C9A96E' }} />
          </div>
          {/* Gen 2 */}
          <div style={{ position: 'relative', display: 'flex', justifyContent: 'center', gap: 16 }}>
            <div style={{ position: 'absolute', top: '50%', left: '38%', right: '38%', height: 2, background: '#E5E7EB' }} />
            {gen[2].map(p => <div key={p.id} style={{ zIndex: 1 }}><MemberCard p={p} /></div>)}
          </div>
        </div>
      </div>

      {/* Fiche */}
      {selectedPerson && (
        <div className="card fade-in" style={{ padding: 28 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ width: 56, height: 56, borderRadius: '50%', background: selected === pov ? '#C9A96E' : '#1B2B4B', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: 22, flexShrink: 0 }}>
                {selectedPerson.prenom[0]}
              </div>
              <div>
                <h2 className="font-serif" style={{ color: '#1B2B4B', fontSize: 26, margin: '0 0 4px' }}>{selectedPerson.prenom}</h2>
                <p style={{ color: '#6B7280', margin: 0, fontSize: 14 }}>{selectedPerson.role} · {selectedPerson.age} ans</p>
                {selectedPerson.profession && <p style={{ color: '#7A7A8C', margin: '2px 0 0', fontSize: 13 }}>{selectedPerson.profession}</p>}
                {selectedPerson.handicap && <span style={{ display: 'inline-block', marginTop: 6, background: '#EFF6FF', color: '#1D4ED8', fontSize: 11, padding: '2px 9px', borderRadius: 6, fontWeight: 500 }}>✓ Abattement handicap 159 325€</span>}
              </div>
            </div>
            {selected !== pov && (
              <button className="btn-navy" style={{ fontSize: 13, padding: '9px 18px' }} onClick={() => { setPov(selected); setSelected(null); }}>
                Voir depuis son point de vue →
              </button>
            )}
          </div>

          {selectedAlerts.length > 0 && (
            <div style={{ background: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: 10, padding: 16, marginBottom: 20 }}>
              <p style={{ color: '#991B1B', fontWeight: 600, fontSize: 14, marginBottom: 8 }}>⚠ Alertes pour {selectedPerson.prenom}</p>
              {selectedAlerts.map((a, i) => <p key={i} style={{ color: '#E24B4A', fontSize: 13, margin: '0 0 4px' }}>• {a}</p>)}
            </div>
          )}

          {selectedActifs.length > 0 && (
            <div style={{ marginBottom: 22 }}>
              <h3 style={{ fontWeight: 600, color: '#1B2B4B', fontSize: 16, marginBottom: 14 }}>Ses actifs</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))', gap: 12 }}>
                {selectedActifs.map(a => (
                  <div key={a.id} style={{ background: '#F9FAFB', borderRadius: 9, padding: 14 }}>
                    <p style={{ fontWeight: 500, fontSize: 14, color: '#1A1A2E', margin: '0 0 4px' }}>{a.nom}</p>
                    <p style={{ color: '#C9A96E', fontWeight: 700, fontSize: 17, margin: '0 0 4px' }}>{euro(a.valeur / a.proprietaires.length)}</p>
                    <p style={{ color: '#7A7A8C', fontSize: 11, margin: 0 }}>{a.type}{a.pays ? ` · ${a.pays}` : ''}</p>
                    {a.note && <p style={{ color: '#F59E0B', fontSize: 11, marginTop: 4 }}>ℹ {a.note}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {selectedActions.length > 0 && (
            <div>
              <h3 style={{ fontWeight: 600, color: '#1B2B4B', fontSize: 16, marginBottom: 14 }}>Actions recommandées</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {selectedActions.map((action, i) => (
                  <div key={i} style={{ background: '#F9FAFB', borderRadius: 9, padding: 14, display: 'flex', alignItems: 'center', gap: 12 }}>
                    <Badge urgence={action.urgence} />
                    <div>
                      <p style={{ fontWeight: 500, fontSize: 13, color: '#1A1A2E', margin: '0 0 2px' }}>{action.titre}</p>
                      <p style={{ color: '#7A7A8C', fontSize: 12, margin: 0 }}>{action.economieLabel} · Délai {action.delai}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {selectedActifs.length === 0 && selectedActions.length === 0 && (
            <p style={{ color: '#7A7A8C', textAlign: 'center', padding: '16px 0', fontSize: 14 }}>Données patrimoniales non renseignées pour ce membre</p>
          )}
        </div>
      )}
    </div>
  );
}
