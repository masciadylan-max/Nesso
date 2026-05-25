export default function Confidentialite() {
  return (
    <div style={{ maxWidth: 760, margin: '0 auto', padding: '48px 24px 120px', fontFamily: 'DM Sans, sans-serif' }}>

      <p style={{ color: '#C9A96E', fontSize: 12, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8 }}>Légal</p>
      <h1 className="font-serif" style={{ color: '#1B2B4B', fontSize: 32, fontWeight: 700, margin: '0 0 8px' }}>Politique de confidentialité</h1>
      <p style={{ color: '#7A7A8C', fontSize: 13, marginBottom: 40 }}>Dernière mise à jour : mai 2026</p>

      {[
        {
          titre: '1. Éditeur du service',
          contenu: `Nesso est un service d'analyse et d'optimisation patrimoniale. En l'absence de structure juridique formalisée, le service est opéré à titre expérimental. Pour toute question, contactez-nous à l'adresse : contact@nesso.fr`,
        },
        {
          titre: '2. Données collectées',
          contenu: `Lors de l'utilisation de Nesso, vous pouvez partager volontairement des informations sur votre situation patrimoniale : prénom, situation familiale, valeur de vos actifs, objectifs financiers. Ces données sont saisies librement dans le cadre d'un audit conversationnel.

Nesso ne collecte pas votre adresse e-mail, votre nom complet, votre adresse postale ou tout autre identifiant personnel, sauf si vous choisissez de les communiquer dans la conversation.`,
        },
        {
          titre: '3. Comment vos données sont stockées',
          contenu: `Toutes les données que vous saisissez sont stockées uniquement dans votre navigateur, via le mécanisme localStorage. Elles ne sont jamais envoyées ni conservées sur nos serveurs.

Si vous videz le cache de votre navigateur ou changez d'appareil, vos données sont effacées. Aucune base de données centralisée ne contient vos informations patrimoniales.`,
        },
        {
          titre: '4. Transmission à l\'API Anthropic',
          contenu: `Le moteur de conversation de Nesso est alimenté par Claude, un modèle d'intelligence artificielle développé par Anthropic. Les messages que vous échangez pendant l'audit sont transmis à l'API Anthropic pour générer les réponses.

Cette transmission transite par un proxy sécurisé hébergé sur Vercel (infrastructure européenne / américaine). Anthropic dispose de sa propre politique de confidentialité, disponible sur anthropic.com. Nous vous recommandons de ne pas saisir de données hautement sensibles (numéros de compte, mots de passe, données de santé).`,
        },
        {
          titre: '5. Cookies et traceurs',
          contenu: `Nesso n'utilise pas de cookies publicitaires ni de traceurs tiers. Aucun outil d'analyse comportementale (Google Analytics, Hotjar, etc.) n'est actif sur ce service. La navigation sur Nesso ne génère aucun profil publicitaire.`,
        },
        {
          titre: '6. Vos droits (RGPD)',
          contenu: `Conformément au Règlement Général sur la Protection des Données (RGPD), vous disposez des droits suivants :

— Droit d'accès : vous pouvez consulter vos données à tout moment dans votre navigateur (localStorage).
— Droit d'effacement : vous pouvez supprimer toutes vos données en cliquant sur "Réinitialiser" dans l'application, ou en vidant le cache de votre navigateur.
— Droit de rectification : vous pouvez modifier vos actifs à tout moment depuis l'onglet "Mes actifs".
— Droit à la portabilité : vos données sont lisibles directement dans les outils développeur de votre navigateur.

Pour toute demande relative à vos droits : contact@nesso.fr`,
        },
        {
          titre: '7. Sécurité',
          contenu: `Le site Nesso est servi exclusivement en HTTPS. La clé API Anthropic est stockée côté serveur (variable d'environnement Vercel) et n'est jamais exposée dans le code frontend. Aucune donnée patrimoniale n'est stockée sur nos serveurs.`,
        },
        {
          titre: '8. Modifications',
          contenu: `Cette politique peut être mise à jour. En cas de modification substantielle, la date de mise à jour en haut de cette page sera modifiée. L'utilisation continue du service vaut acceptation des modifications.`,
        },
      ].map(({ titre, contenu }) => (
        <div key={titre} style={{ marginBottom: 36 }}>
          <h2 style={{ color: '#1B2B4B', fontSize: 17, fontWeight: 600, margin: '0 0 12px', borderBottom: '1px solid #F0EBE4', paddingBottom: 10 }}>{titre}</h2>
          {contenu.split('\n\n').map((para, i) => (
            <p key={i} style={{ color: '#4B5563', fontSize: 14, lineHeight: 1.8, margin: '0 0 12px' }}>{para}</p>
          ))}
        </div>
      ))}

      <div style={{ background: '#F5F0EA', borderRadius: 12, padding: 20, marginTop: 16 }}>
        <p style={{ color: '#7A7A8C', fontSize: 13, margin: 0, lineHeight: 1.7 }}>
          <strong style={{ color: '#1B2B4B' }}>Contact :</strong> contact@nesso.fr<br />
          <strong style={{ color: '#1B2B4B' }}>Hébergeur :</strong> Vercel Inc., 340 Pine Street, Suite 900, San Francisco, CA 94104, USA<br />
          <strong style={{ color: '#1B2B4B' }}>IA :</strong> Anthropic, PBC — anthropic.com/privacy
        </p>
      </div>
    </div>
  );
}
