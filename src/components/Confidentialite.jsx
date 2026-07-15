export default function Confidentialite() {
  return (
    <div style={{ maxWidth: 760, margin: '0 auto', padding: '48px 24px 120px', fontFamily: 'DM Sans, sans-serif' }}>

      <p style={{ color: '#1F6B4A', fontSize: 12, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8 }}>Légal</p>
      <h1 className="font-serif" style={{ color: '#1A201C', fontSize: 32, fontWeight: 700, margin: '0 0 8px' }}>Politique de confidentialité</h1>
      <p style={{ color: '#5C635E', fontSize: 13, marginBottom: 40 }}>Dernière mise à jour : mai 2026</p>

      {[
        {
          titre: '1. Éditeur du service',
          contenu: `Nesso est un service d'analyse et d'optimisation patrimoniale. En l'absence de structure juridique formalisée, le service est opéré à titre expérimental. Pour toute question, contactez-nous à l'adresse : contact@nesso.fr`,
        },
        {
          titre: '2. Données collectées',
          contenu: `Lors de l'utilisation de Nesso, vous partagez volontairement des informations sur votre situation patrimoniale : prénom, situation familiale, valeur estimée de vos actifs, objectifs financiers. Ces données sont saisies dans le cadre d'un audit conversationnel.

Si vous créez un compte, Nesso collecte également votre adresse e-mail, utilisée uniquement pour l'authentification. Aucun nom complet, adresse postale ou numéro de téléphone n'est requis.`,
        },
        {
          titre: '3. Comment vos données sont stockées',
          contenu: `Si vous utilisez Nesso sans compte, vos données restent uniquement dans votre navigateur (localStorage) et disparaissent si vous videz votre cache.

Si vous créez un compte, vos données patrimoniales (profil et actifs) sont stockées dans une base de données sécurisée hébergée par Supabase (infrastructure AWS, région Europe — Irlande), chiffrées au repos (AES-256) et en transit (TLS). Chaque utilisateur ne peut accéder qu'à ses propres données.

L'éditeur du service a accès aux données stockées dans la base de données à des fins de maintenance et de support technique. Ces données ne sont jamais revendues ni partagées avec des tiers commerciaux.`,
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

— Droit d'accès : vous pouvez consulter vos données depuis votre tableau de bord et l'onglet "Mes actifs".
— Droit d'effacement : cliquez sur "Réinitialiser" dans l'application pour supprimer toutes vos données, y compris celles stockées en base de données. Vous pouvez aussi écrire à contact@nesso.fr pour demander la suppression de votre compte.
— Droit de rectification : vous pouvez modifier vos actifs à tout moment depuis l'onglet "Mes actifs".
— Droit à la portabilité : écrivez à contact@nesso.fr pour recevoir vos données au format JSON.

Pour toute demande relative à vos droits : contact@nesso.fr`,
        },
        {
          titre: '7. Sécurité',
          contenu: `Le site Nesso est servi exclusivement en HTTPS. La clé API Anthropic est stockée côté serveur et n'est jamais exposée côté navigateur. Les données en base de données sont chiffrées au repos et en transit. L'accès à chaque compte est protégé par authentification email et mot de passe hashé (bcrypt).`,
        },
        {
          titre: '8. Modifications',
          contenu: `Cette politique peut être mise à jour. En cas de modification substantielle, la date de mise à jour en haut de cette page sera modifiée. L'utilisation continue du service vaut acceptation des modifications.`,
        },
      ].map(({ titre, contenu }) => (
        <div key={titre} style={{ marginBottom: 36 }}>
          <h2 style={{ color: '#1A201C', fontSize: 17, fontWeight: 600, margin: '0 0 12px', borderBottom: '1px solid #E3DFD3', paddingBottom: 10 }}>{titre}</h2>
          {contenu.split('\n\n').map((para, i) => (
            <p key={i} style={{ color: '#3F4842', fontSize: 14, lineHeight: 1.8, margin: '0 0 12px' }}>{para}</p>
          ))}
        </div>
      ))}

      <div style={{ background: '#F6F4ED', borderRadius: 12, padding: 20, marginTop: 16 }}>
        <p style={{ color: '#5C635E', fontSize: 13, margin: 0, lineHeight: 1.7 }}>
          <strong style={{ color: '#1A201C' }}>Contact :</strong> contact@nesso.fr<br />
          <strong style={{ color: '#1A201C' }}>Hébergeur frontend :</strong> Vercel Inc., 340 Pine Street, Suite 900, San Francisco, CA 94104, USA<br />
          <strong style={{ color: '#1A201C' }}>Hébergeur base de données :</strong> Supabase Inc. / AWS eu-west-1 (Irlande)<br />
          <strong style={{ color: '#1A201C' }}>IA :</strong> Anthropic, PBC — anthropic.com/privacy
        </p>
      </div>
    </div>
  );
}
