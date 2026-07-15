import { FAMILLE, ACTIFS } from './data.js';

export const euro = (n) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n || 0);

export const getPersonne = (id) => FAMILLE.find(p => p.id === id);

// Filtre les actifs selon le point de vue :
//   'foyer'     → tous les actifs du ménage
//   'user'      → actifs où l'user est propriétaire (seul ou joint)
//   'conjoint'  → actifs où le conjoint est propriétaire
//   'enfant_N'  → actifs de l'enfant N
//   ID démo     → actifs de ce membre de la FAMILLE
export const filterActifsByPov = (actifs, pov) => {
  if (!pov || pov === 'foyer') return actifs;
  return actifs.filter(a => {
    const props = a.proprietaires;
    if (!props || props.length === 0) return pov === 'user'; // sans tag → appartient à l'user
    return props.includes(pov);
  });
};

// Patrimoine total selon POV :
//   foyer → somme totale du ménage (valeur de marché complète)
//   tout autre POV → quote-part (division par nombre de co-propriétaires)
export const getPatrimoine = (pov, actifs) => {
  if (pov === 'foyer') return actifs.reduce((s, a) => s + (a.valeur || 0), 0);
  const owned = filterActifsByPov(actifs, pov);
  return owned.reduce((s, a) => s + (a.valeur || 0) / Math.max(1, (a.proprietaires?.length || 1)), 0);
};

export const getActifsByOwner = (id, actifs) => filterActifsByPov(actifs, id);

// Résout le label d'un propriétaire — gère les IDs réels (user/conjoint/enfant_N) et les IDs démo
export const resolveOwnerLabel = (id, userProfile) => {
  if (id === 'user') return userProfile?.prenom || 'Vous';
  if (id === 'conjoint') return userProfile?.conjoint || 'Conjoint(e)';
  if (id?.startsWith?.('enfant_')) {
    const i = parseInt(id.split('_')[1], 10);
    return userProfile?.enfants_prenoms?.[i] || `Enfant ${i + 1}`;
  }
  return getPersonne(id)?.prenom || id;
};

export const getProprietaireLabel = (ids, userProfile) => {
  if (!ids || ids.length === 0) return 'Non défini';
  return ids.map(id => resolveOwnerLabel(id, userProfile)).join(' + ');
};

export const getAlerts = (id) => {
  const p = getPersonne(id);
  const alerts = [];
  if (!p) return alerts;
  if (p.age >= 67) alerts.push('Fenêtre assurance-vie bientôt fermée');
  if (p.regime === 'Communauté universelle') alerts.push('Clause attribution intégrale à vérifier');
  if (ACTIFS.filter(a => a.proprietaires.includes(id) && a.pays && a.pays !== 'France').length > 0)
    alerts.push('Fiscalité internationale');
  if (p.handicap) alerts.push('Abattement handicap 159 325€ applicable');
  return alerts;
};
