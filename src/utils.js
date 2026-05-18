import { FAMILLE, ACTIFS, DEMO_SCRIPT } from './data.js';

export const euro = (n) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n || 0);

export const getPersonne = (id) => FAMILLE.find(p => p.id === id);

export const getPatrimoine = (id, actifs) =>
  actifs.filter(a => a.proprietaires.includes(id))
    .reduce((s, a) => s + a.valeur / a.proprietaires.length, 0);

export const getActifsByOwner = (id, actifs) =>
  actifs.filter(a => a.proprietaires.includes(id));

export const getProprietaireLabel = (ids) =>
  ids.map(id => getPersonne(id)?.prenom || id).join(' + ');

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

// Retourne une réponse scriptée selon le message utilisateur
export const getDemoResponse = (message, messageCount) => {
  const lower = message.toLowerCase();

  // Dernier message → rediriger vers le dashboard
  if (messageCount >= 7) {
    return DEMO_SCRIPT.find(s => s.trigger === 'default').response.replace(
      'Pour commencer',
      '✦ Votre profil est prêt. Cliquez sur "Voir mon tableau de bord" pour découvrir vos recommandations.\n\nPour finir'
    );
  }

  for (const script of DEMO_SCRIPT) {
    if (script.trigger === 'default') continue;
    if (script.trigger.some(t => lower.includes(t))) return script.response;
  }

  // Réponse générique si rien ne correspond
  return `Je comprends. Pour affiner votre profil : avez-vous des biens immobiliers, en France ou à l'étranger ?`;
};
