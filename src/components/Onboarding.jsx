import { useState, useRef, useEffect } from 'react';
import { getDemoResponse } from '../utils.js';

const SYSTEM_PROMPT = `Tu es le conseiller patrimonial Nesso. Style : chaleureux, professionnel, ultra-concis. 2-3 phrases max par message. Texte brut uniquement — aucun markdown.
Le chat éclaire et oriente. Quand tu identifies un enjeu, tu l'annonces en une phrase — sans attendre le tableau de bord. Tu ne rédiges pas un plan d'action complet dans le chat (c'est le rôle du dashboard), mais tu ne retiens pas non plus un premier éclairage utile sous prétexte que "ce n'est pas le moment".

LANGUE ET TON — RÈGLES ABSOLUES :
- Vouvoiement par défaut. Si l'utilisateur tutoie explicitement, basculer au tutoiement et ne plus en changer. Ne jamais alterner entre les deux dans le même audit.
- Français soutenu mais accessible : aucun anglicisme, aucune familiarité ("malin", "light", "sympa"), aucune expression traduite de l'anglais.
- Ne jamais employer de tournures qui évoquent la mort imminente des parents ("succession moyen terme", "après leur départ", "quand ils ne seront plus là"). Employer : "organiser la transmission", "préparer l'avenir", "anticiper la transmission de leur vivant".
- Ne jamais inventer de conflits familiaux, de tensions ou de parties prenantes non explicitement mentionnées par l'utilisateur.
- Ne jamais supposer des montants ou des situations non communiqués.

RÈGLE D'OR — LA CONVERSATION DANSE :
Tu conduis une vraie conversation de conseiller. Tu as la connaissance — utilise-la pour poser les bonnes questions au bon moment. Découvre toujours les objectifs avant d'aller plus loin : protéger le conjoint ou les enfants en priorité ? organiser ce qu'on va recevoir ou ce qu'on va laisser ? optimiser ou transmettre ? Ne suppose jamais la réponse.
Si l'utilisateur hésite ou ne sait pas : explique le risque concret en une phrase, repose la question simplement. Ne passe pas à la suite sans une réponse, même partielle.

POSTURE DU CONSEILLER :
Un conseiller sait ce qu'il sait. Les questions portent sur les faits de la situation du client : valeur d'un bien, date d'une donation, existence d'un testament, objectifs personnels, prénom d'un bénéficiaire. Les règles fiscales, les barèmes, les conventions bilatérales, la fiscalité d'un pays étranger : c'est ta connaissance, pas celle du client. Si un immeuble est en Italie, tu expliques les implications — tu ne demandes pas au client s'il a "une idée de la fiscalité italienne". Dès que tu connais une valeur et le lien de parenté, donne un ordre de grandeur concret — pas "ça peut coûter cher".

═══ CONNAISSANCE PATRIMONIALE ═══

BARÈME DROITS DE SUCCESSION / DONATION — LIGNE DIRECTE (parent→enfant) :
Abattements : 100 000€ par enfant (tous les 15 ans) + 31 865€ don familial en numéraire cumulable (donateur < 80 ans).
Taux après abattement :
  0 – 8 072€ : 5 % | 8 072 – 12 109€ : 10 % | 12 109 – 15 932€ : 15 % | 15 932 – 552 324€ : 20 % | 552 324 – 902 838€ : 30 % | > 902 838€ : 45 %
Conjoint/PACS : exonéré totalement.
Abattement handicap : 159 325€ supplémentaires, cumulable avec l'abattement standard (enfant handicapé → 100 000 + 159 325 = 259 325€ exonérés).
Frères/sœurs : abattement 15 932€, taux 35–45%. Concubin : abattement 1 594€, taux 60%.
GP→petit-enfant : abattement 31 786€ par petit-enfant (tous les 15 ans), mêmes taux que ligne directe.

DROITS PAR SITUATION CIVILE :
- Marié : conjoint protégé par défaut (art. 757 CC). Régime matrimonial détermine la masse transmissible. Mariage sans contrat = communauté légale réduite aux acquêts par défaut — peut être défavorable selon la composition du patrimoine.
- Pacsé : aucun droit successoral légal sans testament. Partenaire = étranger sans acte (0€ même après 20 ans de vie commune).
- Concubin : idem PACS + droits de succession à 60%, abattement 1 594€ seulement (vs 100 000€ parent-enfant).
- Célibataire sans enfants : tout aux parents, puis à la fratrie. Si parents décédés : fratrie en totalité.
- Demi-frères/sœurs : règle de la fente (art. 733 CC) — ne reçoivent que dans leur branche si le défunt n'a pas de descendant direct.
- Communauté universelle avec enfants : clause d'attribution intégrale à vérifier impérativement — peut priver les enfants de leur réserve.

RÉSERVE HÉRÉDITAIRE : part incompressible des enfants — 1/2 pour 1 enfant, 2/3 pour 2, 3/4 pour 3+. La quotité disponible est ce qu'on peut transmettre librement.

OUTILS CLÉS (à mobiliser si pertinent, jamais énumérés comme liste) :
- Testament : définit qui reçoit quoi dans la quotité disponible. Priorité si PACS ou concubinage.
- Assurance-vie : hors succession, 152 500€/bénéficiaire exonérés avant 70 ans. Clause bénéficiaire à rédiger sur mesure.
- Donation : transmet de son vivant. Abattement parent/enfant 100 000€, rappel fiscal après 15 ans.
- Démembrement usufruit/nue-propriété : anticipe la transmission sans se dépouiller.
- Donation-partage : gèle les valeurs et répartit entre héritiers de son vivant. Pertinence à évaluer selon les objectifs — pas automatique.
- Saut de génération : donation directe GP→petit-enfant, abattement propre 31 786€/petit-enfant. Évite la double imposition GP→parent puis parent→enfant sur le même actif. À proposer si GP en vie et patrimoine significatif.
- Pacte Dutreil : transmission d'entreprise, 75% d'exonération.
- PER : capital hors succession si décès avant retraite.

SIGNAUX DE COMPLEXITÉ (détecter et creuser selon ce qu'on entend) :
- Handicap dans la famille : vérifier si un membre (enfant, frère/sœur, parent) est en situation de handicap dès que la famille est évoquée. L'abattement 159 325€ est cumulable — peut annuler totalement les droits sur une transmission importante.
- Famille recomposée : tension potentielle entre protéger le conjoint actuel et les enfants d'unions précédentes. Ne pas supposer l'objectif — demander.
- Bien étranger UE : règlement 650/2012 applicable, certificat successoral européen possible.
- Bien étranger hors UE (USA, Maroc, Suisse, Liban…) : règlement 650/2012 inapplicable, convention bilatérale spécifique à identifier.
- Immeuble étranger : suit souvent la loi du pays où il est situé (lex situs), même avec convention. La fiscalité locale s'applique en plus — l'expliquer au client, ne pas lui demander.
- Nationalité américaine : estate tax mondiale possible même résident en France, convention France-USA complexe — signal d'alerte fort.
- Double imposition toujours possible → vérifier convention bilatérale et résidence fiscale exacte.
- IFI : patrimoine immobilier net > 1 300 000€. Abattement 30% sur résidence principale.
- Dirigeant/TNS : arbitrage salaire vs dividendes, holding, Dutreil.
- Grands-parents en vie avec patrimoine significatif : explorer le saut de génération. Comparer GP→parent (droits) + parent→enfant (nouveaux droits) vs GP→petit-enfant directement (abattement propre 31 786€, mêmes taux, une seule imposition). Calculer et présenter l'économie si les montants sont connus.
- AV sans bénéficiaire désigné ou clause standard non mise à jour après divorce/remariage → perd son avantage hors succession.
- Donations antérieures non formalisées (virement, aide à l'achat, paiement études) → requalifiables en donation rapportable à la succession.
- Indivision sans convention → tout indivisaire peut forcer la vente (art. 815 CC).
- Démembrement non anticipé → blocage si le nu-propriétaire veut vendre sans l'accord de l'usufruitier.
- SCI familiale sans comptabilité ni assemblées générales à jour → risque de requalification fiscale.
- Testament olographe non déposé au FCDDV → risque de perte ou contestation.
- Famille recomposée + enfants non communs → conjoint survivant limité à l'usufruit du quart seulement (art. 757 CC).
- Âge > 67 ans → versements AV après 70 ans perdent l'abattement 152 500€ → urgence à alimenter avant.

═══ LEVIERS D'OPTIMISATION AVANCÉS ═══
À mobiliser uniquement si le cas s'y prête — jamais comme liste, toujours en expliquant le pourquoi.

DÉMEMBREMENT USUFRUIT / NUE-PROPRIÉTÉ :
Barème art. 669 CGI : valeur nue-propriété = 50% si usufruitier 51-60 ans, 60% si 61-70 ans, 70% si 71-80 ans. Plus l'usufruitier est âgé, plus la nue-propriété est chère → moins l'économie est intéressante.
Pertinent si : usufruitier > 61 ans, bien > 200k€, donateur sans besoin de liquidités.
Pas pertinent si : usufruitier < 55 ans (économie marginale), bien avec crédit, risque EHPAD (vente impossible sans accord des deux parties), ou si les abattements couvrent déjà la transmission.
À la mort de l'usufruitier : le nu-propriétaire récupère la pleine propriété sans droits supplémentaires.

DONATION-PARTAGE :
Gèle les valeurs au jour de l'acte pour le calcul successoral futur (protection contre la revalorisation). Pertinent si plusieurs enfants et patrimoine hétérogène. Pas automatique — dépend des objectifs : égalité entre enfants, ou favoriser l'un d'eux dans la quotité disponible.

TIMING DES DONATIONS :
Rappel fiscal 15 ans : une donation remet l'abattement à zéro. Attendre 15 ans pour redonner = nouvel abattement de 100k€. À calculer selon l'âge des parents et la valeur du bien. Donner en période de baisse de valeur = assiette taxable réduite.
Don familial exonéré : jusqu'à 31 865€ en numéraire si donateur < 80 ans, cumulable avec les 100k€.

SCI (Société Civile Immobilière) :
Pertinente si : plusieurs biens immobiliers, transmission progressive souhaitée, démembrement de parts (plus souple que démembrement direct du bien). Coût de création et gestion : 1 500–3 000€/an. Pas pertinente si : 1 seul bien, patrimoine < 300k€ (coût > économie), ou liquidités nécessaires rapidement.

HOLDING PATRIMONIALE :
Pertinente si : dirigeant avec dividendes importants (IS holding < IR personnel), réinvestissement des bénéfices, préparation Dutreil. Apport-cession (art. 150-0 B ter) : avant cession de société, apport des titres à une holding → report de la plus-value si réinvestissement 60% dans les 2 ans.

PACTE DUTREIL :
Transmission d'entreprise (donation ou succession) avec 75% d'exonération des droits. Conditions : engagement collectif de conservation 2 ans + individuel 4 ans. Cumulable avec démembrement → économie maximale. À anticiper bien avant la transmission.

LMNP / DÉFICIT FONCIER :
LMNP (location meublée) : amortissement comptable du bien → revenus locatifs réduits à zéro ou quasi. Seuil LMP si revenus > 23k€ ET > 50% des revenus du foyer → déficit imputable sur revenu global.
Déficit foncier (location nue) : travaux > revenus fonciers → imputable sur revenu global jusqu'à 10 700€/an, report 10 ans. Très efficace en TMI 41-45%.

PER (Plan Épargne Retraite) :
Double levier : déduction des versements du revenu imposable (efficace en TMI 30%+) ET capital hors succession si décès avant retraite. Pertinent si revenus élevés et horizon retraite > 5 ans.

ACTIFS ATYPIQUES — RÉGIMES SPÉCIFIQUES :
- Forêts / GFI (Groupements Forestiers d'Investissement) : 75% d'exonération IFI et droits de succession. Rendement ~2% mais avantage fiscal majeur si patrimoine > 1M€.
- Art / objets de collection : hors IFI, plus-value forfaitaire 6,5% à la vente. Transmission favorable — à mentionner si collection significative.
- Crypto-actifs : flat tax 30% sur les plus-values, déclaration obligatoire, transmission complexe. À explorer si montants importants.
- SCPI en démembrement : achat de la nue-propriété uniquement → pas de revenus (pas d'imposition) pendant 5-15 ans, récupération pleine propriété à terme. Pertinent en phase d'accumulation ou TMI élevée.
- PEA : exonération des plus-values après 5 ans (hors prélèvements sociaux 17,2%). Plafond 150k€/personne. À maximiser avant tout autre véhicule financier si non ouvert.

CONTRAT DE CAPITALISATION :
Similaire à l'assurance-vie fiscalement pour les revenus, mais entre dans la succession (contrairement à l'AV). Avantage : peut être donné avec réserve d'usufruit → transmission anticipée du capital avec maintien des revenus. Pertinent pour les patrimoines financiers importants.

ASSURANCE-VIE LUXEMBOURGEOISE :
Triangle de sécurité (actifs ségrégués de l'assureur), accès à une gamme d'actifs élargie. Fiscalité identique à l'AV française pour les résidents français. Pertinent si patrimoine financier > 500k€ à placer.

TONTINE (clause d'accroissement) :
Bien acquis à deux avec clause tontinière : au décès de l'un, l'autre devient propriétaire comme s'il l'avait toujours été seul. Pertinent pour les concubins souhaitant protéger leur logement commun. Droits de succession quand même applicables (60% entre concubins), mais évite l'indivision successorale.

ADOPTION SIMPLE :
Donne des droits successoraux complets à l'adopté (abattement 100k€, tarif enfant). Applicable aux beaux-enfants en famille recomposée. Maintien des liens avec la famille d'origine. À étudier si volonté d'égaliser la transmission entre enfants de différentes unions.

CHANGEMENT DE RÉGIME MATRIMONIAL :
Passage en communauté universelle avec clause d'attribution intégrale → conjoint survivant récupère tout sans droits de succession. Délai d'homologation : 3 mois, puis 2 ans avant que les héritiers ne puissent contester. Pertinent pour les couples âgés souhaitant protéger le conjoint survivant.

═══ PHASES ═══

FORMULAIRE DE CADRAGE — SI PRÉSENT :
Si le premier message contient "DONNÉES DE CADRAGE — FORMULAIRE NESSO", les informations fournies remplacent intégralement la Phase 1 et la Phase 1.5. Ne redemander aucune de ces informations — même indirectement. Traiter chaque donnée du formulaire comme acquise et repartir de là.
Première réponse : accueillir par le prénom, confirmer le focus en une phrase neutre ("nous commençons par X"), poser immédiatement la première question de Phase 3 — une seule idée. Adapter la technicité au niveau déclaré.
Le choix d'un axe ne dit rien sur les autres — ne pas formuler par exclusion. Dire simplement "nous commençons par X".

PHASE 1 — CADRAGE (sans formulaire) :
Découvrir : prénom, âge, profession, niveau de connaissance patrimoniale, situation civile et régime si marié, conjoint/partenaire, enfants (union précédente ?), parents en vie, grands-parents en vie.
Si concubin ou célibataire, "votre patrimoine" = vos biens propres uniquement. Ne jamais consolider avec le partenaire sans l'avoir demandé.

PHASE 1.5 — MAGNITUDE (2-3 questions) :
Calibrer les enjeux réels avant de proposer un focus :
- Patrimoine estimé (fourchette large, en chiffres) — préciser : tous actifs confondus, seul ou en couple
- Si parents en vie : ont-ils organisé la transmission ? (testament, donations notariées) — ne pas supposer la réponse
- Événement de vie en cours ou à venir ?

PHASE 2 — CHOIX DU FOCUS (1 message) :
Sur la base de ce qu'on sait — et uniquement ce qu'on sait — présenter les 3 axes en les contextualisant à leur situation. Ne jamais décrire un axe en invoquant un enjeu qu'on n'a pas confirmé.

A. Transmission verticale — anticiper ce qu'ils recevront (transmission des parents et grands-parents).
B. Transmission horizontale — organiser ce qu'ils transmettront (conjoint, enfants, proches).
C. Optimisation fiscale — réduire les impôts cette année et les suivantes.

Terminer par une question sur leur priorité personnelle — pas sur une contrainte de l'outil.
Ne jamais mentionner tarif ou Nesso+ ici.

PHASE 3 — APPROFONDISSEMENT :
Adapter le fil de la conversation à l'axe choisi. Conduire comme un vrai conseiller : regrouper les questions liées quand c'est naturel, ne pas multiplier les allers-retours inutiles. S'adapter à ce qu'on entend. Si une réponse ouvre une piste importante, la suivre. Si quelque chose est déjà su ou réglé, ne pas redemander.
L'objectif : comprendre les actifs en jeu (nature, valeur, localisation), ce qui est déjà en place, les objectifs prioritaires. Dès qu'on a assez pour identifier 1-2 leviers, les énoncer clairement et avancer. Si le formulaire a fourni le patrimoine personnel, la situation civile et les objectifs de l'utilisateur — ces données sont acquises, ne pas les redemander. Approfondir uniquement ce qui n'est pas couvert ou nécessite une précision.

FOCUS A — TRANSMISSION VERTICALE (ce qu'ils vont recevoir) :
L'utilisateur ne reçoit jamais directement des GP — sauf donation ou saut de génération explicitement voulu. Le flux naturel est GP → parents/oncles-tantes → utilisateur. Toujours raisonner dans cet ordre et ne jamais mettre l'utilisateur au même niveau que les héritiers directs des GP.

Commencer par la génération la plus haute en vie avec un patrimoine significatif.
Collecter d'abord : nature et valeur des biens, nombre d'héritiers à ce niveau (enfants des GP = parents + oncles/tantes + leur fratrie éventuelle), quelqu'un en situation de handicap ?, ce qui est déjà organisé (testament, donation-partage, démembrement).
Avant tout levier : calculer les droits concrets que paieront les héritiers directs. Demander si la liquidité sera suffisante pour régler les droits sans vendre — surtout si le patrimoine est majoritairement immobilier. Identifier s'il y a un bien avec de l'affect ou une contrainte particulière (bien à l'étranger, maison de famille, outil de travail). Ce n'est qu'après avoir compris ces contraintes réelles que les leviers deviennent pertinents.
Les leviers (saut de génération, démembrement, donation du vivant, donation-partage) sont des réponses à des problèmes identifiés — pas des solutions à proposer par défaut. Le saut de génération en particulier s'applique chirurgicalement sur un bien précis quand cela préserve les abattements de la génération intermédiaire — pas comme stratégie globale. Pour le calculer : connaître le nombre de petits-enfants (fratrie de l'utilisateur) est indispensable avant toute estimation.
Descendre ensuite naturellement au niveau des parents : patrimoine propre, ce qui est en place pour leur propre transmission vers l'utilisateur.
La situation personnelle de l'utilisateur (patrimoine, situation civile, objectifs) est déjà connue via le formulaire — ne pas la redemander. L'évoquer si elle éclaire un levier, pas comme étape de collecte.
Conclure en précisant que les autres axes (protection du conjoint, optimisation fiscale) sont disponibles dans Nesso+.

FOCUS B — TRANSMISSION HORIZONTALE (ce qu'ils vont laisser) :
Commencer par la situation familiale : conjoint, enfants (communs ou non), famille recomposée éventuelle. Identifier les vulnérabilités prioritaires (conjoint sans protection, enfants de première union, bénéficiaires AV non à jour).
Explorer les actifs : nature, valeur, répartition. Ce qui est déjà en place (testament, AV, donations).
Cerner les objectifs : protéger le conjoint, équité entre enfants, transmission d'un bien particulier ?
Couvrir le patrimoine personnel de l'utilisateur avant de conclure. Proposer Nesso+ pour les axes ascendants et l'optimisation fiscale.

FOCUS C — OPTIMISATION FISCALE :
Commencer par la structure des revenus : salaires, dividendes, revenus fonciers, revenus du capital. TMI estimé. Situation professionnelle (salarié, TNS, dirigeant).
Explorer les actifs : nature, valeur, fiscalité actuelle. Ce qui est déjà en place (PER, PEA, déficit foncier, holding...).
Cerner les objectifs : réduire l'IR cette année, préparer la retraite, optimiser la structure professionnelle ?
Couvrir le patrimoine personnel de l'utilisateur avant de conclure. Proposer Nesso+ pour les axes successoraux.

Selon le contexte, ne pas oublier :
- Retraite : régime(s), pension de réversion prévue pour le conjoint ?
- AV : clause bénéficiaire sur mesure ou clause standard ? Situation familiale changée depuis la souscription ?
- Donations : montant total, date précise, enregistrées aux impôts ? Acte notarié ou sous seing privé ?
- Testament : olographe ou authentique ? Déposé au FCDDV ? Dernière mise à jour ?
- Dirigeant/TNS : valeur estimée de la société ? Successeur identifié ? Pacte Dutreil envisageable ?
- Bien étranger : UE ou hors UE ? Meuble ou immeuble ?

PHASE 4 — CLÔTURE :
Vérifier s'il reste des éléments importants. Quand l'utilisateur est prêt, dire EXACTEMENT :
"Parfait, je transmets vos données à notre moteur d'analyse. Votre tableau de bord personnalisé sera prêt dans quelques secondes.

Pour aller plus loin sur les autres axes, Nesso+ vous permettra de les approfondir avec un suivi annuel.

⚠ Pour conserver votre audit, créez un compte gratuit depuis le tableau de bord."

Ajouter \`[AUDIT_COMPLET]\` à la toute fin, une seule fois.`;

const EXTRACTION_PROMPT = `Extrais les données patrimoniales en JSON strict. Réponds UNIQUEMENT le JSON, sans markdown, sans texte avant/après.

PRINCIPE : ne JAMAIS renvoyer null/0/vide pour les champs critiques. Si une info manque, ESTIME le plus probable. Un tableau de bord vide est un échec.

RÈGLE ABSOLUE — PROPRIÉTÉ DES ACTIFS :
Le champ 'actifs' ne contient QUE les biens personnels de l'UTILISATEUR (la personne qui conduit cet audit).
Si la conversation a abordé les biens des parents, grands-parents, tante, oncle, frère ou sœur — même pour les optimiser — ces biens N'appartiennent PAS à l'utilisateur.
Mettre le patrimoine des ascendants dans 'famille.patrimoine_parents' et 'famille.patrimoine_gp'.
Compagne/concubin = conjoint si la conversation le confirme, mais ses actifs propres restent hors 'actifs' sauf si concubinage consolidé explicitement confirmé.

PÉRIMÈTRE PATRIMOINE :
- Si situation_civile = 'marie' ou 'pacse' : 'actifs' = biens du foyer (user + conjoint). JAMAIS les biens des parents/beaux-parents/fratrie.
- Si situation_civile = 'concubin' ou 'celibataire' : 'actifs' = UNIQUEMENT les biens propres de l'utilisateur.
- Un héritage attendu n'est PAS un actif actuel.

{
  "prenom": "prénom user ou 'Vous'",
  "conjoint": "prénom conjoint/compagne/partenaire ou null",
  "enfants_prenoms": [],
  "enfants": 0,
  "age": 45,
  "profession": "Cadre",
  "regime": "communaute|separation|participation|universel — défaut 'communaute' si marié",
  "situation_civile": "marie|pacse|concubin|celibataire",
  "parents_en_vie": true,
  "famille_recomposee": false,

  "famille": {
    "mere_prenom": null,
    "pere_prenom": null,
    "parents_en_vie": true,
    "gp_maternels_vivants": false,
    "gp_paternels_vivants": false,
    "fratrie": [{"prenom": "Marie", "lien": "sœur|frère", "handicap": false}],
    "autres": [{"prenom": "Claire", "lien": "tante|oncle|cousin"}],
    "patrimoine_parents_estime": 0,
    "patrimoine_gp_estime": 0,
    "gp_transmission_organisee": false,
    "gp_leviers_identifies": []
  },

  "focus_principal": "Transmission parentale|Protection du partenaire|Transmission en famille recomposée|Protection des proches & transmission|IFI & optimisation immobilière|Optimisation rémunération & structure|Optimisation fiscale annuelle",
  "focus_audit": "succession|optimisation|les_deux",

  "succession": {
    "grands_parents_vivants": false,
    "grands_parents_patrimoine_estime": 0,
    "autres_parties_prenantes": [],
    "belle_famille_incluse": false,
    "belle_famille_patrimoine_estime": 0,
    "donations_passees": [{"de": "parent|user", "vers": "user|enfant", "montant": 0, "annee": 2020}],
    "testament_existant": false
  },

  "optimisation": {
    "revenus_annuels_foyer": 0,
    "tmi": "0|11|30|41|45",
    "charges_deductibles": [],
    "dispositifs_en_place": [],
    "regime_renumeration_dirigeant": "salaire|dividendes|mixte|na",
    "quotient_familial_situations": []
  },

  "actifs": [
    {
      "nom": "description courte",
      "categorie": "immobilier|financier|professionnel|exotique",
      "valeur": 250000,
      "type": "Résidence principale|Résidence secondaire|Bien locatif|Bien étranger|Assurance-vie|PEA|PER|Liquidités|Société|Autre",
      "pays": "France",
      "proprietaires": ["user"]
    }
  ],

RÈGLE PROPRIETAIRES — obligatoire sur chaque actif :
- ["user"] si l'actif appartient uniquement à l'utilisateur
- ["conjoint"] si l'actif appartient uniquement au conjoint/partenaire
- ["user","conjoint"] si l'actif est détenu en commun (résidence principale d'un couple, compte joint…)
- ["enfant_0"], ["enfant_1"]… si l'actif appartient à un enfant
- Par défaut si inconnu : ["user"]

  "objectifs": "résumé en 1 phrase",
  "score": 60,
  "alertes": []
}

ESTIMATIONS PAR DÉFAUT (si non précisé) :
- RP : 350 000€ ; Résidence secondaire : 250 000€ ; Bien locatif : 200 000€
- AV : 50 000€ ; PEA : 30 000€ ; PER : 20 000€ ; Liquidités : 15 000€ ; Société : 200 000€
- Âge : 45. Profession : 'Cadre' si patrimoine > 500k€, sinon 'Salarié'.
- Au moins 2 actifs dans 'actifs' (sinon dashboard vide)
- enfants_prenoms : "Enfant 1", "Enfant 2"... si nombre connu mais prénoms manquants

ALERTES OBLIGATOIRES si triggers détectés :
- PACS + pas de testament → "pacs_sans_testament"
- Concubinage → "concubinage"
- Bien à l'étranger → "international"
- Patrimoine immobilier net (RP×0.7 + autres biens immo) > 1 300 000€ → "ifi"
- Libéral médical → "carmf"
- Dirigeant/TNS → "dutreil"
- Famille recomposée → "famille_recomposee"

Mieux vaut une estimation imparfaite qu'un champ vide. Tranche toujours.`;

// ─── FORMULAIRE DE CADRAGE ───────────────────────────────────────────────────
const FORM_INIT = {
  prenom: '', age: '', profession: 'salarié', niveau: 'intermediaire',
  situation_civile: '', regime: 'communaute', conjoint_prenom: '', conjoint_age: '',
  enfants: '0', enfants_data: [], famille_recomposee: false,
  parents_en_vie: '',      // 'les_deux' | 'pere' | 'mere' | 'non'
  pere_age: '', mere_age: '', parents_orga: '',
  gp_maternels: '',        // 'les_deux' | 'un' | 'non'
  gp_maternels_age: '', gp_maternels_age2: '',
  gp_paternels: '',        // 'les_deux' | 'un' | 'non'
  gp_paternels_age: '', gp_paternels_age2: '',
  patrimoine: '', patrimoine_detail: {}, evenement: '', focus: '',
  // Focus A
  parents_patrimoine: '', parents_compo: [], gp_patrimoine: '', donations_recues: '',
  oncles_tantes_maternels: '', oncles_tantes_paternels: '',
  // Focus B
  testament: '', av_existante: '', actifs_type: [],
  // Focus C
  statut_pro: '', revenus_foyer: '', per_ouvert: '', pea_ouvert: '',
};

const buildContextMessage = (f) => {
  const niveauLabel = { debutant: 'Débutant', intermediaire: 'Intermédiaire', avance: 'Expert' }[f.niveau] || '';
  const situLabel   = { celibataire: 'Célibataire', marie: 'Marié(e)', pacse: 'Pacsé(e)', concubin: 'En couple (concubinage)' }[f.situation_civile] || '';
  const regimeLabel = { communaute: 'communauté légale réduite aux acquêts', separation: 'séparation de biens', universel: 'communauté universelle', participation: 'participation aux acquêts' }[f.regime] || '';
  const patriLabel  = { '<100': '< 100 000 €', '100-300': '100 000 – 300 000 €', '300-700': '300 000 – 700 000 €', '700-1500': '700 000 – 1 500 000 €', '1500+': '> 1 500 000 €' }[f.patrimoine] || '';
  const focusLabel  = { A: 'A — Ce que je vais recevoir (transmission parentale / grands-parents)', B: 'B — Ce que je vais laisser (protection conjoint et enfants)', C: 'C — Réduire ma fiscalité (optimisation)' }[f.focus] || '';
  const orgaLabel   = { oui: 'Oui', en_partie: 'En partie', non: 'Non', sais_pas: 'Je ne sais pas' }[f.parents_orga] || '';
  const nbEnfants   = parseInt(f.enfants) || 0;

  // Enfants : liste prénoms + âges si renseignés
  const enfantsDetail = (f.enfants_data || []).filter(e => e.prenom || e.age);
  const enfantsDesc = enfantsDetail.length > 0
    ? enfantsDetail.map((e, i) => `${e.prenom || `Enfant ${i+1}`}${e.age ? ` (${e.age} ans)` : ''}`).join(', ')
    : null;

  const lines = [
    'DONNÉES DE CADRAGE — FORMULAIRE NESSO',
    f.prenom
      ? `Prénom : ${f.prenom}${f.age ? `, ${f.age} ans` : ''}${f.profession ? `, ${f.profession}` : ''}`
      : null,
    niveauLabel ? `Niveau de connaissance patrimoniale : ${niveauLabel}` : null,
    situLabel
      ? `Situation civile : ${situLabel}${f.situation_civile === 'marie' && regimeLabel ? ` — régime ${regimeLabel}` : ''}`
      : null,
    f.situation_civile && f.situation_civile !== 'celibataire' && f.conjoint_prenom
      ? `Conjoint(e) / partenaire : ${f.conjoint_prenom}${f.conjoint_age ? `, ${f.conjoint_age} ans` : ''}` : null,
    nbEnfants === 0
      ? 'Enfants : Aucun'
      : `Enfants : ${nbEnfants}${f.famille_recomposee ? ' — famille recomposée' : ''}${enfantsDesc ? ` — ${enfantsDesc}` : ''}`,
    f.parents_en_vie
      ? `Parents en vie : ${{ les_deux: 'Les deux', pere: 'Père uniquement', mere: 'Mère uniquement', non: 'Aucun' }[f.parents_en_vie] || f.parents_en_vie}${f.parents_en_vie !== 'non' && (f.pere_age || f.mere_age) ? ` — ${[f.parents_en_vie !== 'mere' && f.pere_age ? `père ${f.pere_age} ans` : null, f.parents_en_vie !== 'pere' && f.mere_age ? `mère ${f.mere_age} ans` : null].filter(Boolean).join(', ')}` : ''}${f.parents_en_vie !== 'non' && orgaLabel ? ` — transmission organisée : ${orgaLabel}` : ''}`
      : null,
    f.gp_maternels
      ? `Grands-parents maternels : ${{ les_deux: 'Les deux en vie', un: "L'un d'eux en vie", non: 'Aucun' }[f.gp_maternels]}${f.gp_maternels !== 'non' && f.gp_maternels_age ? ` — ${f.gp_maternels_age} ans${f.gp_maternels === 'les_deux' && f.gp_maternels_age2 ? ` / ${f.gp_maternels_age2} ans` : ''}` : ''}`
      : null,
    f.gp_paternels
      ? `Grands-parents paternels : ${{ les_deux: 'Les deux en vie', un: "L'un d'eux en vie", non: 'Aucun' }[f.gp_paternels]}${f.gp_paternels !== 'non' && f.gp_paternels_age ? ` — ${f.gp_paternels_age} ans${f.gp_paternels === 'les_deux' && f.gp_paternels_age2 ? ` / ${f.gp_paternels_age2} ans` : ''}` : ''}`
      : null,
    patriLabel ? `Patrimoine estimé${(f.situation_civile && f.situation_civile !== 'celibataire' && f.conjoint_prenom) ? ' du foyer' : ' personnel'} : ${patriLabel}` : null,
    ...(Object.entries(f.patrimoine_detail || {}).map(([key, v]) => {
      const labels = { rp: 'Résidence principale', locatif: 'Immobilier locatif', financier: 'Épargne/Placements', entreprise: 'Entreprise', etranger: 'Bien étranger' };
      return v?.valeur ? `  → ${labels[key] || key} : ${parseInt(v.valeur).toLocaleString('fr-FR')} €` : `  → ${labels[key] || key} : montant à préciser`;
    })),
    f.evenement?.trim() ? `Événement de vie : ${f.evenement}` : null,
    focusLabel ? `Focus choisi : ${focusLabel}` : null,
    // Focus A
    f.focus === 'A' && f.parents_patrimoine ? `Patrimoine parents estimé : ${{ '<100': '< 100 000 €', '100-300': '100 000 – 300 000 €', '300-700': '300 000 – 700 000 €', '700-1500': '700 000 – 1 500 000 €', '1500+': '> 1 500 000 €' }[f.parents_patrimoine] || f.parents_patrimoine}` : null,
    f.focus === 'A' && f.parents_compo?.length > 0 ? `Composition patrimoine parents : ${f.parents_compo.join(', ')}` : null,
    f.focus === 'A' && f.gp_patrimoine ? `Patrimoine grands-parents estimé : ${{ '<100': '< 100 000 €', '100-300': '100 000 – 300 000 €', '300-700': '300 000 – 700 000 €', '700-1500': '700 000 – 1 500 000 €', '1500+': '> 1 500 000 €' }[f.gp_patrimoine] || f.gp_patrimoine}` : null,
    f.focus === 'A' && f.donations_recues ? `Donations déjà reçues : ${{ oui: 'Oui', non: 'Non', sais_pas: 'Je ne sais pas' }[f.donations_recues] || f.donations_recues}` : null,
    f.focus === 'A' && f.oncles_tantes_maternels ? `Oncles/tantes côté maternel : ${f.oncles_tantes_maternels}` : null,
    f.focus === 'A' && f.oncles_tantes_paternels ? `Oncles/tantes côté paternel : ${f.oncles_tantes_paternels}` : null,
    // Focus B
    f.focus === 'B' && f.testament ? `Testament existant : ${{ oui: 'Oui', non: 'Non', sais_pas: 'Je ne sais pas' }[f.testament] || f.testament}` : null,
    f.focus === 'B' && f.av_existante ? `Assurance-vie : ${{ oui: 'Oui — bénéficiaires à jour', oui_maj: 'Oui — à mettre à jour', non: 'Non' }[f.av_existante] || f.av_existante}` : null,
    f.focus === 'B' && f.actifs_type?.length > 0 ? `Types d'actifs principaux : ${f.actifs_type.join(', ')}` : null,
    // Focus C
    f.focus === 'C' && f.statut_pro ? `Statut professionnel : ${{ salarie: 'Salarié', tns: 'TNS / indépendant', dirigeant: 'Dirigeant de société', retraite: 'Retraité' }[f.statut_pro] || f.statut_pro}` : null,
    f.focus === 'C' && f.revenus_foyer ? `Revenus annuels foyer : ${{ '<30': '< 30 000 €', '30-60': '30 000 – 60 000 €', '60-100': '60 000 – 100 000 €', '100-200': '100 000 – 200 000 €', '200+': '> 200 000 €' }[f.revenus_foyer] || f.revenus_foyer}` : null,
    f.focus === 'C' && f.per_ouvert ? `PER ouvert : ${{ oui: 'Oui', non: 'Non' }[f.per_ouvert]}` : null,
    f.focus === 'C' && f.pea_ouvert ? `PEA ouvert : ${{ oui: 'Oui', non: 'Non' }[f.pea_ouvert]}` : null,
  ].filter(Boolean);

  return lines.join('\n');
};
// ─────────────────────────────────────────────────────────────────────────────

// Bug #3 : parsing JSON robuste — gère markdown ```json, texte autour, JSON tronqué
// Tracker de coût pour un audit (réinitialisé à chaque nouveau démarrage)
// Tarifs Haiku 4.5 (USD / 1M tokens) — à ajuster si les prix Anthropic changent
const PRICE = { input: 1.0, cacheRead: 0.10, cacheWrite: 1.25, output: 5.0 };
let auditCost = { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, usd: 0, calls: 0 };

const resetAuditCost = () => { auditCost = { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, usd: 0, calls: 0 }; };

const trackCost = (usage, label) => {
  if (!usage) return;
  const cacheRead  = usage.cache_read_input_tokens || 0;
  const cacheWrite = usage.cache_creation_input_tokens || 0;
  const inputNew   = Math.max(0, (usage.input_tokens || 0) - cacheRead - cacheWrite);
  const output     = usage.output_tokens || 0;
  const cost =
    inputNew   * PRICE.input      / 1_000_000 +
    cacheWrite * PRICE.cacheWrite / 1_000_000 +
    cacheRead  * PRICE.cacheRead  / 1_000_000 +
    output     * PRICE.output     / 1_000_000;
  auditCost.input      += inputNew;
  auditCost.cacheRead  += cacheRead;
  auditCost.cacheWrite += cacheWrite;
  auditCost.output     += output;
  auditCost.usd        += cost;
  auditCost.calls      += 1;
  console.log(`[Nesso] ${label} #${auditCost.calls} — input:${inputNew} cache:${cacheRead}r/${cacheWrite}w output:${output} → $${cost.toFixed(5)}`);
};

const logAuditTotal = () => {
  const centimesEur = auditCost.usd * 0.92 * 100;
  console.log(
    `%c[Nesso] 📊 AUDIT TERMINÉ\n` +
    `  Appels API : ${auditCost.calls}\n` +
    `  Input neuf : ${auditCost.input} tokens\n` +
    `  Cache hit : ${auditCost.cacheRead} tokens (économisés)\n` +
    `  Cache write : ${auditCost.cacheWrite} tokens\n` +
    `  Output : ${auditCost.output} tokens\n` +
    `  Coût : $${auditCost.usd.toFixed(4)} ≈ ${centimesEur.toFixed(2)} centimes €`,
    'color:#C9A96E;font-weight:bold;'
  );
};

const parseJsonRobust = (text) => {
  if (!text) return null;
  // Strip code fences ```json ... ``` ou ``` ... ```
  let cleaned = text.replace(/```(?:json)?\s*/gi, '').replace(/```/g, '').trim();
  // Premier essai : parser le texte nettoyé directement
  try { return JSON.parse(cleaned); } catch {}
  // Deuxième essai : extraire le plus grand bloc { ... } équilibré
  const start = cleaned.indexOf('{');
  if (start === -1) return null;
  let depth = 0, end = -1;
  for (let i = start; i < cleaned.length; i++) {
    if (cleaned[i] === '{') depth++;
    else if (cleaned[i] === '}') { depth--; if (depth === 0) { end = i; break; } }
  }
  if (end === -1) return null;
  try { return JSON.parse(cleaned.slice(start, end + 1)); } catch (e) {
    console.error('parseJsonRobust failed:', e, 'on:', cleaned.slice(start, end + 1).slice(0, 200));
    return null;
  }
};

const extractUserData = async (history) => {
  if (history.length < 3) return null;
  // Bug #8 : timeout de 20s sur l'extraction (au lieu d'attendre indéfiniment)
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);
  try {
    const res = await fetch('/anthropic/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        model: 'claude-haiku-4-5',
        max_tokens: 1200, // Augmenté pour éviter les troncatures du JSON
        system: 'Tu es un extracteur de données JSON. Réponds UNIQUEMENT avec le JSON demandé, sans markdown, sans texte avant ou après.',
        messages: [
          // Strip les propriétés internes (hidden, etc.) — l'API n'accepte que role + content
          ...history.slice(-20).map(m => ({ role: m.role, content: m.content })),
          { role: 'user', content: EXTRACTION_PROMPT }
        ]
      })
    });
    clearTimeout(timeout);
    if (!res.ok) return null;
    const data = await res.json();
    trackCost(data.usage, 'extraction');
    const text = data.content?.[0]?.text || '';
    return parseJsonRobust(text);
  } catch (e) {
    clearTimeout(timeout);
    if (e.name === 'AbortError') console.error('Extraction timeout (20s)');
    else console.error('Extraction error:', e);
    return null;
  }
};

// Rendu markdown minimal : **gras** → <strong>
const renderText = (text) => {
  const parts = text.split(/(\*\*[^*\n]+\*\*)/g);
  return parts.map((part, i) =>
    part.startsWith('**') && part.endsWith('**')
      ? <strong key={i}>{part.slice(2, -2)}</strong>
      : part
  );
};

export default function Onboarding({ onComplete, apiKey, onApiKey, onLogin, onRetourDashboard }) {
  // auditPhase : 'landing' | 'form' | 'chat'
  const [auditPhase, setAuditPhase] = useState('landing');
  const [form, setForm]             = useState(FORM_INIT);
  const [formStep, setFormStep]     = useState(1);
  const [messages, setMessages]     = useState([]);
  const [input, setInput]           = useState('');
  const [loading, setLoading]       = useState(false);
  const [updating, setUpdating]     = useState(false);
  const [msgCount, setMsgCount]     = useState(0);
  const endRef = useRef(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const isDemoMode = !apiKey;

  const callApi = async (history) => {
    const res = await fetch('/anthropic/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-haiku-4-5',
        max_tokens: 500,
        system: [{ type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } }],
        messages: history.slice(-18).map(m => ({ role: m.role, content: m.content }))
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || `Erreur ${res.status}`);
    }
    const data = await res.json();
    trackCost(data.usage, 'chat');
    return data.content[0].text;
  };

  const getReply = async (history, count) => {
    if (isDemoMode) {
      await new Promise(r => setTimeout(r, 500 + Math.random() * 300));
      return getDemoResponse(history[history.length - 1].content, count);
    }
    return callApi(history);
  };

  // Profil de secours : valeurs plausibles pour ne JAMAIS afficher un tableau vide
  const PROFIL_VIDE = {
    prenom: 'Vous', conjoint: null, enfants_prenoms: [], age: 45, profession: 'Cadre',
    regime: 'communaute', situation_civile: 'celibataire', parents_en_vie: true, famille_recomposee: false,
    focus_principal: 'Protection des proches & transmission',
    focus_audit: 'les_deux',
    succession: { grands_parents_vivants: false, grands_parents_patrimoine_estime: 0, autres_parties_prenantes: [], belle_famille_incluse: false, belle_famille_patrimoine_estime: 0, donations_passees: [], testament_existant: false },
    optimisation: { revenus_annuels_foyer: 0, tmi: null, charges_deductibles: [], dispositifs_en_place: [], regime_renumeration_dirigeant: 'na', quotient_familial_situations: [] },
    actifs: [
      { nom: 'Résidence principale (estimée)', categorie: 'immobilier', valeur: 350000, type: 'Résidence principale', pays: 'France' },
      { nom: 'Épargne (estimée)', categorie: 'financier', valeur: 30000, type: 'Liquidités', pays: 'France' },
    ],
    alertes: [], score: 60,
    objectifs: 'Optimiser la transmission patrimoniale et réduire la fiscalité',
  };

  // Garantit qu'aucun champ critique n'est vide/nul après extraction
  const sanitizeUserData = (data) => {
    if (!data) return PROFIL_VIDE;
    const out = { ...data };
    if (!out.prenom || out.prenom === 'Utilisateur') out.prenom = 'Vous';
    if (!out.age) out.age = 45;
    if (!out.profession) out.profession = 'Cadre';
    if (!out.regime && out.situation_civile === 'marie') out.regime = 'communaute';
    if (out.parents_en_vie == null) out.parents_en_vie = true;
    if (!out.objectifs) out.objectifs = 'Optimiser la transmission patrimoniale et réduire la fiscalité';
    if (!out.score) out.score = 60;
    if (!Array.isArray(out.alertes)) out.alertes = [];
    if (!Array.isArray(out.enfants_prenoms)) out.enfants_prenoms = [];

    // Nouvelle archi phasée : focus_principal + focus_audit (déduit)
    const VALID_FOCUSES = ['Transmission parentale', 'Protection du partenaire', 'Transmission en famille recomposée', 'Protection des proches & transmission', 'IFI & optimisation immobilière', 'Optimisation rémunération & structure', 'Optimisation fiscale annuelle'];
    if (!VALID_FOCUSES.includes(out.focus_principal)) {
      out.focus_principal = PROFIL_VIDE.focus_principal;
    }
    // Déduire focus_audit depuis focus_principal si absent ou invalide
    if (!['succession', 'optimisation', 'les_deux'].includes(out.focus_audit)) {
      const fp = out.focus_principal || '';
      if (fp.startsWith('Optimisation')) out.focus_audit = 'optimisation';
      else out.focus_audit = 'succession';
    }
    out.succession = {
      grands_parents_vivants: false,
      grands_parents_patrimoine_estime: 0,
      autres_parties_prenantes: [],
      belle_famille_incluse: false,
      belle_famille_patrimoine_estime: 0,
      donations_passees: [],
      testament_existant: false,
      ...(out.succession || {}),
    };
    out.optimisation = {
      revenus_annuels_foyer: 0,
      tmi: null,
      charges_deductibles: [],
      dispositifs_en_place: [],
      regime_renumeration_dirigeant: 'na',
      quotient_familial_situations: [],
      ...(out.optimisation || {}),
    };
    // Si nombre d'enfants > 0 mais pas de prénoms, en générer
    if (out.enfants > 0 && out.enfants_prenoms.length === 0) {
      out.enfants_prenoms = Array.from({ length: out.enfants }, (_, i) => `Enfant ${i + 1}`);
    }
    // Au moins 2 actifs pour éviter un dashboard vide
    if (!Array.isArray(out.actifs) || out.actifs.length === 0) {
      out.actifs = PROFIL_VIDE.actifs;
    } else {
      // Filet de sécurité : exclure les actifs qui semblent appartenir à des tiers
      // (mots-clés dans le nom évoquant parents/beaux-parents/fratrie)
      const TIERS_REGEX = /\b(parent|beau|belle|père|mère|m[èe]re|p[èa]re|fr[èe]re|s(œ|oe)ur|grand[\s-]?(parent|p[èe]re|m[èe]re)|oncle|tante|cousin|cousine|ami|amie)s?\b/i;
      out.actifs = out.actifs.filter(a => !TIERS_REGEX.test(a.nom || ''));
      // Concubin / célibataire : filtrer les actifs mentionnant le prénom du partenaire
      // (sauf si belle_famille_incluse = true = l'user a demandé la consolidation)
      if (['concubin', 'celibataire'].includes(out.situation_civile) && !out.succession?.belle_famille_incluse && out.conjoint) {
        const partnerName = out.conjoint.trim().split(' ')[0].toLowerCase();
        if (partnerName.length > 2) {
          const partnerRegex = new RegExp(`\\b${partnerName}\\b`, 'i');
          out.actifs = out.actifs.filter(a => !partnerRegex.test(a.nom || ''));
        }
      }
      // Si on a tout filtré → revenir aux defaults pour ne pas afficher un dashboard vide
      if (out.actifs.length === 0) out.actifs = PROFIL_VIDE.actifs;

      // Forcer valeurs >0 sur les actifs (estimations par défaut si manquantes)
      const defauts = {
        'Résidence principale': 350000, 'Résidence secondaire': 250000, 'Bien locatif': 200000,
        'Assurance-vie': 50000, 'PEA': 30000, 'PER': 20000, 'Liquidités': 15000, 'Société': 200000,
      };
      out.actifs = out.actifs.map(a => ({
        ...a,
        valeur: a.valeur > 0 ? a.valeur : (defauts[a.type] || 50000),
        categorie: a.categorie || 'financier',
        type: a.type || 'Autre',
        pays: a.pays || 'France',
        // Garantit que chaque actif a un tableau proprietaires valide
        // Défaut : ['user'] (l'extraction peut ne pas toujours fournir ce champ)
        proprietaires: Array.isArray(a.proprietaires) && a.proprietaires.length > 0
          ? a.proprietaires
          : ['user'],
      }));
    }

    // Cohérence des alertes : retirer 'ifi' si le patrimoine immobilier net
    // du foyer ne dépasse pas le seuil légal (1,3M€). Évite que l'alerte reste
    // stale après filtrage des biens de tiers.
    const patrimoineImmoNet = out.actifs
      .filter(a => a.categorie === 'immobilier')
      .reduce((s, a) => s + (a.valeur || 0) * (a.type === 'Résidence principale' ? 0.70 : 1), 0);
    if (patrimoineImmoNet <= 1300000) {
      out.alertes = out.alertes.filter(a => !a.toLowerCase().includes('ifi'));
    }

    return out;
  };

  const complete = (updatedHistory) => {
    setTimeout(async () => {
      if (isDemoMode) { onComplete(null); return; }
      const userData = await extractUserData(updatedHistory);
      logAuditTotal();
      onComplete(sanitizeUserData(userData));
    }, 1200);
  };

  const saveMessages = (msgs) => {
    try { localStorage.setItem('nesso_messages', JSON.stringify(msgs)); } catch {}
  };

  const start = async () => {
    resetAuditCost();
    setAuditPhase('chat');
    setLoading(true);
    const init = [{ role: 'user', content: 'Bonjour, je voudrais faire le point sur mon patrimoine familial.' }];
    try {
      const reply = await getReply(init, 0);
      const msgs = [...init, { role: 'assistant', content: reply }];
      setMessages(msgs);
      saveMessages(msgs);
      setMsgCount(1);
    } catch {
      const msgs = [{ role: 'assistant', content: 'Bonjour ! Je suis votre conseiller Nesso. Pour commencer, comment évalueriez-vous votre niveau de connaissance en patrimoine et fiscalité ? Novice, intermédiaire ou expert ?' }];
      setMessages(msgs);
      saveMessages(msgs);
    } finally { setLoading(false); }
  };

  // Démarre le chat après remplissage du formulaire
  // Le message de contexte est injecté en "hidden" : présent dans l'historique API mais pas affiché dans l'UI
  const startWithForm = async (f) => {
    resetAuditCost();
    const contextMsg = buildContextMessage(f);
    const hiddenMsg  = { role: 'user', content: contextMsg, hidden: true };
    setAuditPhase('chat');
    setLoading(true);
    try {
      const reply = await getReply([hiddenMsg], 0);
      const msgs = [hiddenMsg, { role: 'assistant', content: reply }];
      setMessages(msgs);
      saveMessages(msgs);
      setMsgCount(1);
    } catch {
      const greeting = f.prenom ? `Bonjour ${f.prenom} !` : 'Bonjour !';
      const msgs = [hiddenMsg, { role: 'assistant', content: `${greeting} Merci pour ces informations. Commençons directement.` }];
      setMessages(msgs);
      saveMessages(msgs);
    } finally { setLoading(false); }
  };

  const send = async (overrideText) => {
    const text = overrideText ?? input.trim();
    if (!text || loading) return;
    const userMsg = { role: 'user', content: text };
    const history = [...messages, userMsg];
    setMessages(history);
    setInput('');
    setLoading(true);
    const newCount = msgCount + 1;
    setMsgCount(newCount);
    try {
      const rawReply = await getReply(history, newCount);
      // Bug #2 : détection robuste du signal de fin (tolère variantes : majuscules, espaces, accents, markdown)
      const SIGNAL_REGEX = /\[?\s*audit[\s_-]*complet[\s_-]*\]?/i;
      const auditTermine = SIGNAL_REGEX.test(rawReply);
      const reply = rawReply.replace(/\[?\s*audit[\s_-]*complet[\s_-]*\]?/gi, '').trim();
      const updatedHistory = [...history, { role: 'assistant', content: reply }];
      setMessages(updatedHistory);
      saveMessages(updatedHistory);
      if (auditTermine) complete(updatedHistory);
    } catch (e) {
      setMessages(prev => [...prev, { role: 'assistant', content: `Une erreur est survenue. Réessayez ou passez à la démo.` }]);
    } finally { setLoading(false); }
  };

  const handleMettreAJour = async () => {
    if (updating || loading) return;
    setUpdating(true);
    if (isDemoMode) { onComplete(null); }
    else {
      const userData = await extractUserData(messages);
      logAuditTotal();
      onComplete(sanitizeUserData(userData));
    }
    setUpdating(false);
  };

  const handleNouvelleConversation = () => {
    localStorage.removeItem('nesso_messages');
    setMessages([]);
    setMsgCount(0);
    setForm(FORM_INIT);
    setFormStep(1);
    setAuditPhase('landing');
  };

  const handlePasserDashboard = () => { onComplete(null); };

  // Charger la conversation sauvegardée dans le chat
  const handleContinuerConversation = () => {
    const saved = getSavedMessages();
    if (saved) {
      setMessages(saved);
      setMsgCount(saved.filter(m => m.role === 'user').length);
      setAuditPhase('chat');
    }
  };

  // Générer le tableau depuis la conversation sauvegardée
  const handleReprendreConversation = async () => {
    const saved = getSavedMessages();
    if (!saved) return;
    setLoading(true);
    const userData = await extractUserData(saved);
    logAuditTotal();
    onComplete(sanitizeUserData(userData));
    setLoading(false);
  };

  const getSavedMessages = () => {
    try { const m = localStorage.getItem('nesso_messages'); return m ? JSON.parse(m) : null; } catch { return null; }
  };
  const savedMessages = getSavedMessages();
  const hasSavedConversation = savedMessages && savedMessages.length > 4;

  // Helpers formulaire
  const totalSteps = 5; // toujours 5 étapes — étape 5 = sous-formulaire par focus
  const stepTitles = ['Vous', 'Votre famille', 'Votre situation', 'Votre priorité', { A: 'La transmission à recevoir', B: 'Ce que vous transmettrez', C: 'Votre situation fiscale' }[form.focus] || 'Précisions'];
  const canAdvance = () => {
    if (formStep === 1) return form.prenom.trim().length > 0;
    if (formStep === 2) return form.situation_civile !== '';
    if (formStep === 4) return form.focus !== '';
    return true;
  };

  return (
    <div style={{ minHeight: '100vh', background: '#F5F0EA', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: auditPhase === 'chat' ? 'center' : 'flex-start', padding: auditPhase === 'chat' ? 24 : '60px 24px' }}>
      <div style={{ maxWidth: 720, width: '100%' }}>

        {auditPhase !== 'chat' && (
          <div style={{ textAlign: 'center', marginBottom: 36 }}>
            <h1 className="font-serif" style={{ color: '#C9A96E', fontSize: 42, fontWeight: 700, margin: '0 0 8px' }}>Nesso</h1>
            <p style={{ color: '#1B2B4B', fontSize: 17, margin: 0, lineHeight: 1.5 }}>La solution IA pour gérer le patrimoine et la succession de ta famille</p>
          </div>
        )}

        {/* ── BRANCHE 1 : LANDING ── */}
        {auditPhase === 'landing' && (
          <>
          <div className="card" style={{ padding: 40, textAlign: 'center' }}>
            <div style={{ width: 60, height: 60, borderRadius: '50%', background: '#1B2B4B', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 22px', color: '#C9A96E', fontSize: 26 }}>✦</div>
            <h2 className="font-serif" style={{ color: '#1B2B4B', fontSize: 26, margin: '0 0 12px' }}>Votre audit patrimonial</h2>
            <p style={{ color: '#6B7280', lineHeight: 1.75, marginBottom: 28, fontSize: 15 }}>
              Quelques questions pour construire votre tableau de bord personnalisé. <strong>5 à 15 minutes</strong> selon votre situation.
            </p>

            {isDemoMode && (
              <div style={{ background: '#F0F4FF', border: '1px solid #C7D7FD', borderRadius: 9, padding: 16, marginBottom: 24, textAlign: 'left' }}>
                <p style={{ color: '#1D4ED8', fontSize: 13, fontWeight: 600, margin: '0 0 4px' }}>Mode démo activé</p>
                <p style={{ color: '#3B5BDB', fontSize: 12, margin: '0 0 10px' }}>Réponses simulées. Pour activer le vrai Claude :</p>
                <button onClick={onApiKey} className="btn-navy" style={{ fontSize: 12, padding: '6px 14px' }}>Ajouter ma clé API →</button>
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>

              {hasSavedConversation && !isDemoMode && (
                <>
                  <button onClick={handleContinuerConversation} disabled={loading}
                    style={{ width: '100%', padding: '13px', fontSize: 14, background: '#C9A96E', color: 'white', border: 'none', borderRadius: 10, cursor: loading ? 'wait' : 'pointer', fontFamily: 'DM Sans, sans-serif', fontWeight: 600 }}>
                    ↺ Continuer ma conversation en cours →
                  </button>
                  <button onClick={handleReprendreConversation} disabled={loading}
                    style={{ width: '100%', padding: '11px', fontSize: 13, background: 'white', color: '#1B2B4B', border: '1px solid #E5E7EB', borderRadius: 10, cursor: loading ? 'wait' : 'pointer', fontFamily: 'DM Sans, sans-serif' }}>
                    {loading ? '⏳ Génération...' : '📊 Générer mon tableau depuis la dernière conversation'}
                  </button>
                </>
              )}
              <button className="btn-navy" onClick={() => { setForm(FORM_INIT); setFormStep(1); setAuditPhase('form'); }} style={{ width: '100%', padding: '14px', fontSize: 15 }}>
                {isDemoMode ? 'Démarrer la démo →' : hasSavedConversation ? 'Recommencer un nouvel audit →' : 'Commencer l\'audit →'}
              </button>
              {/* ── Reprendre le tableau existant (user authentifié avec données sauvegardées) ── */}
              {onRetourDashboard && (
                <button onClick={onRetourDashboard} disabled={loading}
                  style={{ width: '100%', padding: '13px', fontSize: 14, background: 'white', color: '#1B2B4B', border: '1px solid #E5E7EB', borderRadius: 10, cursor: loading ? 'wait' : 'pointer', fontFamily: 'DM Sans, sans-serif', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                  {loading ? '⏳ Chargement…' : '✦ Reprendre mon tableau de bord →'}
                </button>
              )}
              <button onClick={handlePasserDashboard} style={{ background: 'none', border: 'none', color: '#7A7A8C', cursor: 'pointer', fontSize: 13, padding: 8, fontFamily: 'DM Sans, sans-serif' }}>
                Voir l'exemple sans remplir →
              </button>
            </div>

            {/* Connexion pour utilisateurs existants */}
            {onLogin && (
              <div style={{ marginTop: 22, paddingTop: 18, borderTop: '1px solid #F0EBE4' }}>
                <p style={{ color: '#7A7A8C', fontSize: 13, margin: 0 }}>
                  Vous avez déjà un compte ?{' '}
                  <button onClick={onLogin} style={{ background: 'none', border: 'none', color: '#C9A96E', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', padding: 0, textDecoration: 'underline' }}>
                    Se connecter →
                  </button>
                </p>
              </div>
            )}
          </div>

          {/* Manifeste / Qui sommes-nous */}
          <div style={{ marginTop: 64, padding: '0 8px' }}>

            {/* Ornement décoratif d'ouverture */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14, marginBottom: 24 }}>
              <div style={{ flex: '0 0 60px', height: 1, background: '#D1C4B0' }} />
              <span style={{ color: '#C9A96E', fontSize: 14 }}>✦</span>
              <div style={{ flex: '0 0 60px', height: 1, background: '#D1C4B0' }} />
            </div>

            <p style={{ color: '#C9A96E', fontSize: 11, fontWeight: 600, letterSpacing: '0.22em', textTransform: 'uppercase', textAlign: 'center', margin: '0 0 16px' }}>Notre manifeste</p>
            <h2 className="font-serif" style={{ color: '#1B2B4B', fontSize: 30, fontWeight: 700, textAlign: 'center', margin: '0 0 18px', lineHeight: 1.25, letterSpacing: '-0.01em' }}>
              La clarté patrimoniale n'est plus réservée aux familles aisées.
            </h2>
            <p style={{ color: '#6B7280', fontSize: 15, lineHeight: 1.75, textAlign: 'center', maxWidth: 560, margin: '0 auto 40px', fontStyle: 'italic' }}>
              Une succession bien préparée peut représenter <strong style={{ color: '#1B2B4B', fontStyle: 'normal' }}>des dizaines de milliers d'euros</strong> conservés par votre famille. Jusqu'ici, ce savoir-faire restait inaccessible à la plupart des foyers.
            </p>

            {/* Tableau de constats — style éditorial */}
            <div style={{ background: 'white', borderRadius: 14, overflow: 'hidden', border: '1px solid rgba(27,43,75,0.08)', marginBottom: 36, boxShadow: '0 4px 24px rgba(27,43,75,0.04)' }}>
              <div style={{ background: '#F5F0EA', padding: '12px 24px', borderBottom: '1px solid rgba(27,43,75,0.08)' }}>
                <p style={{ color: '#1B2B4B', fontSize: 11, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', margin: 0 }}>Le constat — 15 dernières années</p>
              </div>

              {[
                {
                  icon: '↑',
                  chiffre: '× 3',
                  titre: 'Les recettes de l\'État sur les successions',
                  desc: 'De 7 milliards € en 2011 à 21,2 milliards € en 2025 : les droits de succession ont triplé en moins de 15 ans.',
                  source: 'Source : DGFiP',
                  ton: 'rouge',
                },
                {
                  icon: '=',
                  chiffre: '100 k€',
                  titre: 'L\'abattement parent-enfant, inchangé depuis 2012',
                  desc: 'Le seuil d\'exonération n\'a pas bougé depuis 13 ans. Pendant ce temps, le prix moyen de l\'immobilier en France a augmenté de plus de 30 %. La fiscalité réelle progresse en silence.',
                  source: 'Source : article 779 du CGI',
                  ton: 'orange',
                },
                {
                  icon: '◐',
                  chiffre: 'Une minorité',
                  titre: 'Les familles vraiment équipées',
                  desc: 'Seules les familles qui pouvaient s\'offrir notaire de famille, fiscaliste, gestionnaire de patrimoine ou family office optimisaient réellement leur transmission.',
                  ton: 'navy',
                },
              ].map((c, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 22, padding: '22px 24px', borderTop: i > 0 ? '1px solid #F5F0EA' : 'none' }}>
                  <div style={{ flex: '0 0 56px', textAlign: 'center' }}>
                    <div style={{ width: 38, height: 38, borderRadius: '50%', background: c.ton === 'rouge' ? '#FEF2F2' : c.ton === 'orange' ? '#FFF8F0' : '#F0F4FF', color: c.ton === 'rouge' ? '#E24B4A' : c.ton === 'orange' ? '#C9A96E' : '#1B2B4B', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 700, margin: '0 auto' }}>
                      {c.icon}
                    </div>
                  </div>
                  <div style={{ flex: '0 0 110px', display: 'flex', alignItems: 'center' }}>
                    <p className="font-serif" style={{ color: '#C9A96E', fontSize: c.chiffre.length > 4 ? 19 : 28, fontWeight: 700, margin: 0, lineHeight: 1.05 }}>{c.chiffre}</p>
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ color: '#1B2B4B', fontSize: 14, fontWeight: 600, margin: '0 0 4px' }}>{c.titre}</p>
                    <p style={{ color: '#7A7A8C', fontSize: 13, lineHeight: 1.65, margin: '0 0 6px' }}>{c.desc}</p>
                    {c.source && (
                      <p style={{ color: '#A8A8B8', fontSize: 11, fontStyle: 'italic', margin: 0 }}>{c.source}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Bloc Mission — style citation éditoriale */}
            <div style={{ position: 'relative', background: 'linear-gradient(135deg, #1B2B4B 0%, #243656 100%)', borderRadius: 16, padding: '40px 36px 32px', color: 'white', overflow: 'hidden' }}>
              {/* Guillemet décoratif */}
              <span className="font-serif" style={{ position: 'absolute', top: 4, left: 22, fontSize: 110, color: 'rgba(201,169,110,0.18)', lineHeight: 1, pointerEvents: 'none' }}>“</span>

              <div style={{ position: 'relative' }}>
                <p style={{ color: '#C9A96E', fontSize: 11, fontWeight: 600, letterSpacing: '0.22em', textTransform: 'uppercase', margin: '0 0 16px' }}>Notre conviction</p>

                <p className="font-serif" style={{ fontSize: 22, lineHeight: 1.5, margin: '0 0 18px', color: 'white', fontWeight: 400 }}>
                  Aujourd'hui, l'IA permet à chacun de prendre en main son patrimoine et d'anticiper sa succession <span style={{ color: '#C9A96E' }}>à un coût quasi nul</span>.
                </p>

                <p style={{ fontSize: 15, lineHeight: 1.75, margin: '0 0 28px', color: 'rgba(255,255,255,0.78)' }}>
                  C'est la mission de <strong style={{ color: '#C9A96E' }}>Nesso</strong> : apporter cette connaissance et cette clarté à tous les foyers, et casser l'inégalité d'accès au conseil patrimonial.
                </p>

                {/* Signature */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 10, paddingTop: 18, borderTop: '1px solid rgba(201,169,110,0.2)' }}>
                  <div style={{ width: 40, height: 1, background: 'rgba(201,169,110,0.45)' }} />
                  <p className="font-serif" style={{ fontStyle: 'italic', color: '#C9A96E', fontSize: 16, margin: 0, fontWeight: 400 }}>
                    L'équipe Nesso
                  </p>
                </div>
              </div>
            </div>

            {/* Ornement décoratif de fermeture */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14, marginTop: 32 }}>
              <div style={{ flex: '0 0 60px', height: 1, background: '#D1C4B0' }} />
              <span style={{ color: '#C9A96E', fontSize: 10 }}>◆</span>
              <div style={{ flex: '0 0 60px', height: 1, background: '#D1C4B0' }} />
            </div>
          </div>
          </>
        )}

        {/* ── BRANCHE 2 : FORMULAIRE ── */}
        {auditPhase === 'form' && (
          <div className="card" style={{ padding: '36px 32px' }}>
            {/* En-tête + barre de progression */}
            <div style={{ marginBottom: 28 }}>
              <p style={{ color: '#C9A96E', fontSize: 11, fontWeight: 600, letterSpacing: '0.15em', textTransform: 'uppercase', margin: '0 0 5px' }}>
                Étape {formStep} sur {totalSteps}
              </p>
              <h2 className="font-serif" style={{ color: '#1B2B4B', fontSize: 24, margin: '0 0 14px' }}>
                {stepTitles[formStep - 1]}
              </h2>
              <div style={{ display: 'flex', gap: 4 }}>
                {Array.from({ length: totalSteps }).map((_, i) => (
                  <div key={i} style={{ flex: 1, height: 3, borderRadius: 2, background: i < formStep ? '#C9A96E' : '#E5E7EB', transition: 'background 0.3s' }} />
                ))}
              </div>
            </div>

            {/* ── Étape 1 : Vous ── */}
            {formStep === 1 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                <div>
                  <label style={{ color: '#6B7280', fontSize: 13, display: 'block', marginBottom: 6 }}>Votre prénom *</label>
                  <input type="text" value={form.prenom} autoFocus
                    onChange={e => setForm(p => ({ ...p, prenom: e.target.value }))}
                    placeholder="Thomas"
                    style={{ width: '100%', border: '1px solid #E5E7EB', borderRadius: 8, padding: '10px 14px', fontSize: 14, fontFamily: 'DM Sans, sans-serif', boxSizing: 'border-box' }} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={{ color: '#6B7280', fontSize: 13, display: 'block', marginBottom: 6 }}>Votre âge</label>
                    <input type="number" value={form.age} min="18" max="100"
                      onChange={e => setForm(p => ({ ...p, age: e.target.value }))}
                      placeholder="38"
                      style={{ width: '100%', border: '1px solid #E5E7EB', borderRadius: 8, padding: '10px 14px', fontSize: 14, fontFamily: 'DM Sans, sans-serif', boxSizing: 'border-box' }} />
                  </div>
                  <div>
                    <label style={{ color: '#6B7280', fontSize: 13, display: 'block', marginBottom: 6 }}>Votre statut</label>
                    <select value={form.profession} onChange={e => setForm(p => ({ ...p, profession: e.target.value }))}
                      style={{ width: '100%', border: '1px solid #E5E7EB', borderRadius: 8, padding: '10px 14px', fontSize: 14, fontFamily: 'DM Sans, sans-serif', boxSizing: 'border-box' }}>
                      <option value="salarié">Salarié(e)</option>
                      <option value="cadre">Cadre</option>
                      <option value="dirigeant">Dirigeant / TNS</option>
                      <option value="libéral">Profession libérale</option>
                      <option value="retraité">Retraité(e)</option>
                      <option value="autre">Autre</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label style={{ color: '#6B7280', fontSize: 13, display: 'block', marginBottom: 10 }}>Niveau de connaissance patrimoniale</label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {[['debutant', 'Débutant'], ['intermediaire', 'Intermédiaire'], ['avance', 'Expert']].map(([val, lbl]) => (
                      <button key={val} onClick={() => setForm(p => ({ ...p, niveau: val }))}
                        style={{ flex: 1, padding: '10px 6px', border: `2px solid ${form.niveau === val ? '#C9A96E' : '#E5E7EB'}`, borderRadius: 8, background: form.niveau === val ? '#FDF8F0' : 'white', color: form.niveau === val ? '#C9A96E' : '#6B7280', cursor: 'pointer', fontSize: 13, fontWeight: form.niveau === val ? 600 : 400, fontFamily: 'DM Sans, sans-serif', transition: 'all 0.15s' }}>
                        {lbl}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ── Étape 2 : Famille ── */}
            {formStep === 2 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                <div>
                  <label style={{ color: '#6B7280', fontSize: 13, display: 'block', marginBottom: 10 }}>Situation civile *</label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    {[['celibataire', 'Célibataire', '◯'], ['marie', 'Marié(e)', '◎'], ['pacse', 'Pacsé(e)', '◑'], ['concubin', 'En couple', '◐']].map(([val, lbl, ico]) => (
                      <button key={val} onClick={() => setForm(p => ({ ...p, situation_civile: val }))}
                        style={{ padding: '12px 8px', border: `2px solid ${form.situation_civile === val ? '#1B2B4B' : '#E5E7EB'}`, borderRadius: 10, background: form.situation_civile === val ? '#F0F4FF' : 'white', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', transition: 'all 0.15s' }}>
                        <div style={{ fontSize: 18, marginBottom: 4, color: '#1B2B4B' }}>{ico}</div>
                        <div style={{ fontSize: 13, fontWeight: form.situation_civile === val ? 600 : 400, color: form.situation_civile === val ? '#1B2B4B' : '#6B7280' }}>{lbl}</div>
                      </button>
                    ))}
                  </div>
                </div>
                {form.situation_civile === 'marie' && (
                  <div>
                    <label style={{ color: '#6B7280', fontSize: 13, display: 'block', marginBottom: 6 }}>Régime matrimonial</label>
                    <select value={form.regime} onChange={e => setForm(p => ({ ...p, regime: e.target.value }))}
                      style={{ width: '100%', border: '1px solid #E5E7EB', borderRadius: 8, padding: '10px 14px', fontSize: 14, fontFamily: 'DM Sans, sans-serif', boxSizing: 'border-box' }}>
                      <option value="communaute">Communauté légale (par défaut)</option>
                      <option value="separation">Séparation de biens</option>
                      <option value="universel">Communauté universelle</option>
                      <option value="participation">Participation aux acquêts</option>
                    </select>
                  </div>
                )}
                {form.situation_civile && form.situation_civile !== 'celibataire' && (
                  <div>
                    <label style={{ color: '#6B7280', fontSize: 13, display: 'block', marginBottom: 6 }}>
                      {form.situation_civile === 'marie' ? 'Conjoint(e)' : form.situation_civile === 'pacse' ? 'Partenaire' : 'Compagnon / Compagne'}
                    </label>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <input type="text" value={form.conjoint_prenom}
                        onChange={e => setForm(p => ({ ...p, conjoint_prenom: e.target.value }))}
                        placeholder="Prénom"
                        style={{ flex: 2, border: '1px solid #E5E7EB', borderRadius: 8, padding: '10px 14px', fontSize: 14, fontFamily: 'DM Sans, sans-serif' }} />
                      <input type="number" value={form.conjoint_age || ''} min="18" max="100"
                        onChange={e => setForm(p => ({ ...p, conjoint_age: e.target.value }))}
                        placeholder="Âge"
                        style={{ flex: 1, border: '1px solid #E5E7EB', borderRadius: 8, padding: '10px 14px', fontSize: 14, fontFamily: 'DM Sans, sans-serif' }} />
                    </div>
                  </div>
                )}
                <div>
                  <label style={{ color: '#6B7280', fontSize: 13, display: 'block', marginBottom: 10 }}>Enfants</label>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {['0','1','2','3','4+'].map(n => (
                      <button key={n} onClick={() => setForm(p => ({ ...p, enfants: n }))}
                        style={{ flex: 1, padding: '10px 4px', border: `2px solid ${form.enfants === n ? '#C9A96E' : '#E5E7EB'}`, borderRadius: 8, background: form.enfants === n ? '#FDF8F0' : 'white', color: form.enfants === n ? '#C9A96E' : '#6B7280', cursor: 'pointer', fontSize: 14, fontWeight: form.enfants === n ? 700 : 400, fontFamily: 'DM Sans, sans-serif', transition: 'all 0.15s' }}>
                        {n}
                      </button>
                    ))}
                  </div>
                </div>
                {parseInt(form.enfants) > 0 && (
                  <div>
                    <label style={{ color: '#6B7280', fontSize: 13, display: 'block', marginBottom: 8 }}>Prénoms et âges des enfants <span style={{ color: '#A8A8B8' }}>(optionnel)</span></label>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {Array.from({ length: Math.min(form.enfants === '4+' ? 4 : parseInt(form.enfants), 4) }).map((_, i) => (
                        <div key={i} style={{ display: 'flex', gap: 8 }}>
                          <input type="text" placeholder={`Enfant ${i + 1} — prénom`} value={form.enfants_data[i]?.prenom || ''}
                            onChange={e => { const d = [...(form.enfants_data || [])]; d[i] = { ...(d[i] || {}), prenom: e.target.value }; setForm(p => ({ ...p, enfants_data: d })); }}
                            style={{ flex: 2, border: '1px solid #E5E7EB', borderRadius: 8, padding: '9px 12px', fontSize: 13, fontFamily: 'DM Sans, sans-serif' }} />
                          <input type="number" placeholder="Âge" min="0" max="60" value={form.enfants_data[i]?.age || ''}
                            onChange={e => { const d = [...(form.enfants_data || [])]; d[i] = { ...(d[i] || {}), age: e.target.value }; setForm(p => ({ ...p, enfants_data: d })); }}
                            style={{ flex: 1, border: '1px solid #E5E7EB', borderRadius: 8, padding: '9px 12px', fontSize: 13, fontFamily: 'DM Sans, sans-serif' }} />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {parseInt(form.enfants) > 0 && form.situation_civile && form.situation_civile !== 'celibataire' && (
                  <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                    <input type="checkbox" checked={form.famille_recomposee}
                      onChange={e => setForm(p => ({ ...p, famille_recomposee: e.target.checked }))}
                      style={{ width: 16, height: 16, accentColor: '#1B2B4B' }} />
                    <span style={{ color: '#6B7280', fontSize: 13 }}>Famille recomposée (enfants d'une union précédente)</span>
                  </label>
                )}
              </div>
            )}

            {/* ── Étape 3 : Situation ── */}
            {formStep === 3 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                {/* Parents */}
                <div>
                  <label style={{ color: '#6B7280', fontSize: 13, display: 'block', marginBottom: 10 }}>Vos parents</label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    {[['les_deux','Les deux en vie'],['pere','Père uniquement'],['mere','Mère uniquement'],['non','Aucun']].map(([val, lbl]) => (
                      <button key={val} onClick={() => setForm(p => ({ ...p, parents_en_vie: val }))}
                        style={{ padding: '11px 8px', border: `2px solid ${form.parents_en_vie === val ? '#1B2B4B' : '#E5E7EB'}`, borderRadius: 8, background: form.parents_en_vie === val ? '#F0F4FF' : 'white', color: form.parents_en_vie === val ? '#1B2B4B' : '#6B7280', cursor: 'pointer', fontSize: 13, fontWeight: form.parents_en_vie === val ? 600 : 400, fontFamily: 'DM Sans, sans-serif', transition: 'all 0.15s' }}>
                        {lbl}
                      </button>
                    ))}
                  </div>
                </div>
                {form.parents_en_vie && form.parents_en_vie !== 'non' && (
                  <>
                    <div style={{ display: 'flex', gap: 10 }}>
                      {(form.parents_en_vie === 'les_deux' || form.parents_en_vie === 'pere') && (
                        <div style={{ flex: 1 }}>
                          <label style={{ color: '#A8A8B8', fontSize: 12, display: 'block', marginBottom: 6 }}>Âge du père</label>
                          <input type="number" min="40" max="110" placeholder="ex. 72"
                            value={form.pere_age}
                            onChange={e => setForm(p => ({ ...p, pere_age: e.target.value }))}
                            style={{ width: '100%', border: '1px solid #E5E7EB', borderRadius: 8, padding: '9px 12px', fontSize: 14, fontFamily: 'DM Sans, sans-serif', boxSizing: 'border-box' }} />
                        </div>
                      )}
                      {(form.parents_en_vie === 'les_deux' || form.parents_en_vie === 'mere') && (
                        <div style={{ flex: 1 }}>
                          <label style={{ color: '#A8A8B8', fontSize: 12, display: 'block', marginBottom: 6 }}>Âge de la mère</label>
                          <input type="number" min="40" max="110" placeholder="ex. 68"
                            value={form.mere_age}
                            onChange={e => setForm(p => ({ ...p, mere_age: e.target.value }))}
                            style={{ width: '100%', border: '1px solid #E5E7EB', borderRadius: 8, padding: '9px 12px', fontSize: 14, fontFamily: 'DM Sans, sans-serif', boxSizing: 'border-box' }} />
                        </div>
                      )}
                    </div>
                    <div>
                      <label style={{ color: '#6B7280', fontSize: 13, display: 'block', marginBottom: 8 }}>Ont-ils organisé leur transmission ?</label>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                        {[['oui','Oui'],['en_partie','En partie'],['non','Non'],['sais_pas','Je ne sais pas']].map(([val, lbl]) => (
                          <button key={val} onClick={() => setForm(p => ({ ...p, parents_orga: val }))}
                            style={{ padding: '10px', border: `2px solid ${form.parents_orga === val ? '#C9A96E' : '#E5E7EB'}`, borderRadius: 8, background: form.parents_orga === val ? '#FDF8F0' : 'white', color: form.parents_orga === val ? '#C9A96E' : '#6B7280', cursor: 'pointer', fontSize: 13, fontWeight: form.parents_orga === val ? 600 : 400, fontFamily: 'DM Sans, sans-serif', transition: 'all 0.15s' }}>
                            {lbl}
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                )}
                {/* Grands-parents — deux lignes séparées */}
                {[
                  ['gp_maternels','gp_maternels_age','gp_maternels_age2','Grands-parents maternels'],
                  ['gp_paternels','gp_paternels_age','gp_paternels_age2','Grands-parents paternels'],
                ].map(([field, age1Field, age2Field, label]) => (
                  <div key={field}>
                    <label style={{ color: '#6B7280', fontSize: 13, display: 'block', marginBottom: 8 }}>{label}</label>
                    <div style={{ display: 'flex', gap: 8, marginBottom: form[field] && form[field] !== 'non' ? 10 : 0 }}>
                      {[['les_deux','Les deux'],['un',"L'un d'eux"],['non','Aucun']].map(([val, lbl]) => (
                        <button key={val} onClick={() => setForm(p => ({ ...p, [field]: val }))}
                          style={{ flex: 1, padding: '10px 4px', border: `2px solid ${form[field] === val ? '#1B2B4B' : '#E5E7EB'}`, borderRadius: 8, background: form[field] === val ? '#F0F4FF' : 'white', color: form[field] === val ? '#1B2B4B' : '#6B7280', cursor: 'pointer', fontSize: 13, fontWeight: form[field] === val ? 600 : 400, fontFamily: 'DM Sans, sans-serif', transition: 'all 0.15s' }}>
                          {lbl}
                        </button>
                      ))}
                    </div>
                    {form[field] && form[field] !== 'non' && (
                      <div style={{ display: 'flex', gap: 10 }}>
                        <div style={{ flex: 1 }}>
                          <label style={{ color: '#A8A8B8', fontSize: 12, display: 'block', marginBottom: 4 }}>
                            {form[field] === 'les_deux' ? '1er grand-parent' : 'Âge'}
                          </label>
                          <input type="number" min="50" max="115" placeholder="ex. 78"
                            value={form[age1Field]}
                            onChange={e => setForm(p => ({ ...p, [age1Field]: e.target.value }))}
                            style={{ width: '100%', border: '1px solid #E5E7EB', borderRadius: 8, padding: '9px 12px', fontSize: 14, fontFamily: 'DM Sans, sans-serif', boxSizing: 'border-box' }} />
                        </div>
                        {form[field] === 'les_deux' && (
                          <div style={{ flex: 1 }}>
                            <label style={{ color: '#A8A8B8', fontSize: 12, display: 'block', marginBottom: 4 }}>2e grand-parent</label>
                            <input type="number" min="50" max="115" placeholder="ex. 75"
                              value={form[age2Field]}
                              onChange={e => setForm(p => ({ ...p, [age2Field]: e.target.value }))}
                              style={{ width: '100%', border: '1px solid #E5E7EB', borderRadius: 8, padding: '9px 12px', fontSize: 14, fontFamily: 'DM Sans, sans-serif', boxSizing: 'border-box' }} />
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
                {/* Patrimoine */}
                <div>
                  {form.situation_civile && form.situation_civile !== 'celibataire' && form.conjoint_prenom
                    ? <label style={{ color: '#6B7280', fontSize: 13, display: 'block', marginBottom: 4 }}>Patrimoine du foyer estimé <span style={{ color: '#A8A8B8' }}>(vous + {form.conjoint_prenom})</span></label>
                    : <label style={{ color: '#6B7280', fontSize: 13, display: 'block', marginBottom: 4 }}>Votre patrimoine personnel estimé</label>
                  }
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {[['<100','< 100 000 €'],['100-300','100 000 – 300 000 €'],['300-700','300 000 – 700 000 €'],['700-1500','700 000 – 1 500 000 €'],['1500+','> 1 500 000 €']].map(([val, lbl]) => (
                      <button key={val} onClick={() => setForm(p => ({ ...p, patrimoine: val }))}
                        style={{ padding: '11px 16px', border: `2px solid ${form.patrimoine === val ? '#C9A96E' : '#E5E7EB'}`, borderRadius: 8, background: form.patrimoine === val ? '#FDF8F0' : 'white', color: form.patrimoine === val ? '#C9A96E' : '#6B7280', cursor: 'pointer', fontSize: 14, fontWeight: form.patrimoine === val ? 600 : 400, fontFamily: 'DM Sans, sans-serif', textAlign: 'left', transition: 'all 0.15s' }}>
                        {lbl}
                      </button>
                    ))}
                  </div>
                </div>
                {/* Composition du patrimoine */}
                {form.patrimoine && (
                  <div>
                    <label style={{ color: '#6B7280', fontSize: 13, display: 'block', marginBottom: 8 }}>Composition <span style={{ color: '#A8A8B8' }}>(sélectionnez ce qui s'applique)</span></label>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {[
                        { key: 'rp',       label: '🏠 Résidence principale',     placeholder: 'Valeur estimée (€)' },
                        { key: 'locatif',  label: '🏢 Immobilier locatif',        placeholder: 'Valeur estimée (€)' },
                        { key: 'financier',label: '💰 Épargne / Placements',      placeholder: 'Montant total (€)' },
                        { key: 'entreprise',label:'⚙ Entreprise / Parts sociales', placeholder: 'Valeur estimée (€)' },
                        { key: 'etranger', label: '🌍 Bien à l\'étranger',         placeholder: 'Valeur estimée (€)' },
                      ].map(({ key, label, placeholder }) => {
                        const entry = (form.patrimoine_detail || {})[key];
                        const active = !!entry;
                        return (
                          <div key={key}>
                            <button onClick={() => setForm(p => {
                              const d = { ...(p.patrimoine_detail || {}) };
                              if (d[key]) delete d[key]; else d[key] = { valeur: '' };
                              return { ...p, patrimoine_detail: d };
                            })} style={{ width: '100%', padding: '10px 14px', border: `2px solid ${active ? '#1B2B4B' : '#E5E7EB'}`, borderRadius: 8, background: active ? '#F0F4FF' : 'white', color: active ? '#1B2B4B' : '#6B7280', cursor: 'pointer', fontSize: 13, fontWeight: active ? 600 : 400, fontFamily: 'DM Sans, sans-serif', textAlign: 'left', transition: 'all 0.15s', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              {label} {active && <span style={{ color: '#C9A96E' }}>✓</span>}
                            </button>
                            {active && (
                              <input type="number" placeholder={placeholder} value={entry.valeur || ''}
                                onChange={e => setForm(p => ({ ...p, patrimoine_detail: { ...(p.patrimoine_detail || {}), [key]: { valeur: e.target.value } } }))}
                                style={{ width: '100%', border: '1px solid #E5E7EB', borderRadius: '0 0 8px 8px', borderTop: 'none', padding: '9px 14px', fontSize: 13, fontFamily: 'DM Sans, sans-serif', boxSizing: 'border-box', marginTop: -2 }} />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
                {/* Événement */}
                <div>
                  <label style={{ color: '#6B7280', fontSize: 13, display: 'block', marginBottom: 6 }}>
                    Un événement de vie en cours ou à venir ? <span style={{ color: '#A8A8B8' }}>(optionnel)</span>
                  </label>
                  <input type="text" value={form.evenement}
                    onChange={e => setForm(p => ({ ...p, evenement: e.target.value }))}
                    placeholder="Retraite, héritage, vente, achat, divorce, naissance…"
                    style={{ width: '100%', border: '1px solid #E5E7EB', borderRadius: 8, padding: '10px 14px', fontSize: 14, fontFamily: 'DM Sans, sans-serif', boxSizing: 'border-box' }} />
                </div>
              </div>
            )}

            {/* ── Étape 4 : Focus ── */}
            {formStep === 4 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <p style={{ color: '#7A7A8C', fontSize: 14, margin: '0 0 8px', lineHeight: 1.6 }}>
                  Pour un audit approfondi et pertinent, Nesso se concentre sur <strong style={{ color: '#1B2B4B' }}>un axe à la fois</strong>. Quelle est votre priorité ?
                </p>
                {[
                  { val: 'A', icon: '↑', label: 'Ce que je vais recevoir', desc: 'Comprendre et organiser la transmission de mes parents et grands-parents de mon vivant.', show: form.parents_en_vie !== 'non' },
                  { val: 'B', icon: '↓', label: 'Ce que je vais laisser', desc: form.situation_civile === 'celibataire' ? 'Organiser ma succession et protéger mes proches.' : 'Protéger mon conjoint et mes enfants en cas de décès ou d\'incapacité.', show: true },
                  { val: 'C', icon: '◎', label: 'Réduire ma fiscalité', desc: 'Optimiser mes impôts cette année et structurer mon patrimoine sur le long terme.', show: true },
                ].filter(o => o.show).map(({ val, icon, label, desc }) => (
                  <div key={val} onClick={() => setForm(p => ({ ...p, focus: val }))}
                    style={{ display: 'flex', gap: 16, alignItems: 'flex-start', border: `2px solid ${form.focus === val ? '#C9A96E' : '#E5E7EB'}`, borderRadius: 12, padding: '18px 20px', cursor: 'pointer', background: form.focus === val ? '#FDF8F0' : 'white', transition: 'all 0.15s' }}>
                    <span style={{ fontSize: 22, color: '#C9A96E', flexShrink: 0, marginTop: 2 }}>{icon}</span>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontWeight: 600, color: '#1B2B4B', fontSize: 15, margin: '0 0 5px' }}>{label}</p>
                      <p style={{ color: '#7A7A8C', fontSize: 13, margin: 0, lineHeight: 1.5 }}>{desc}</p>
                    </div>
                    {form.focus === val && <span style={{ color: '#C9A96E', fontSize: 20, flexShrink: 0, marginTop: 2 }}>✓</span>}
                  </div>
                ))}
                <p style={{ color: '#A8A8B8', fontSize: 12, margin: '4px 0 0' }}>Vous pourrez explorer les autres axes avec Nesso+.</p>
              </div>
            )}

            {/* ── Étape 5 : Sous-formulaire focus ── */}
            {formStep === 5 && form.focus === 'A' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                <p style={{ color: '#7A7A8C', fontSize: 14, margin: 0, lineHeight: 1.6 }}>Quelques précisions pour calibrer l'audit sur ce que vous allez recevoir.</p>
                {/* Patrimoine parents */}
                <div>
                  <label style={{ color: '#6B7280', fontSize: 13, display: 'block', marginBottom: 8 }}>Patrimoine estimé de vos parents</label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {[['<100','< 100 000 €'],['100-300','100 000 – 300 000 €'],['300-700','300 000 – 700 000 €'],['700-1500','700 000 – 1 500 000 €'],['1500+','> 1 500 000 €']].map(([val, lbl]) => (
                      <button key={val} onClick={() => setForm(p => ({ ...p, parents_patrimoine: val }))}
                        style={{ padding: '10px 16px', border: `2px solid ${form.parents_patrimoine === val ? '#C9A96E' : '#E5E7EB'}`, borderRadius: 8, background: form.parents_patrimoine === val ? '#FDF8F0' : 'white', color: form.parents_patrimoine === val ? '#C9A96E' : '#6B7280', cursor: 'pointer', fontSize: 14, fontWeight: form.parents_patrimoine === val ? 600 : 400, fontFamily: 'DM Sans, sans-serif', textAlign: 'left', transition: 'all 0.15s' }}>
                        {lbl}
                      </button>
                    ))}
                  </div>
                </div>
                {/* Composition patrimoine parents */}
                <div>
                  <label style={{ color: '#6B7280', fontSize: 13, display: 'block', marginBottom: 8 }}>Composition <span style={{ color: '#A8A8B8' }}>(plusieurs choix possibles)</span></label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {[['Immobilier','🏠'],['Épargne / financier','💰'],['Entreprise','🏢'],['Bien étranger','🌍'],['Autre','◇']].map(([lbl, ico]) => {
                      const sel = (form.parents_compo || []).includes(lbl);
                      return (
                        <button key={lbl} onClick={() => setForm(p => ({ ...p, parents_compo: sel ? p.parents_compo.filter(x => x !== lbl) : [...(p.parents_compo||[]), lbl] }))}
                          style={{ padding: '8px 14px', border: `2px solid ${sel ? '#1B2B4B' : '#E5E7EB'}`, borderRadius: 20, background: sel ? '#F0F4FF' : 'white', color: sel ? '#1B2B4B' : '#6B7280', cursor: 'pointer', fontSize: 13, fontWeight: sel ? 600 : 400, fontFamily: 'DM Sans, sans-serif', transition: 'all 0.15s' }}>
                          {ico} {lbl}
                        </button>
                      );
                    })}
                  </div>
                </div>
                {/* Patrimoine GP si en vie */}
                {((form.gp_maternels && form.gp_maternels !== 'non') || (form.gp_paternels && form.gp_paternels !== 'non')) && (
                  <div>
                    <label style={{ color: '#6B7280', fontSize: 13, display: 'block', marginBottom: 8 }}>Patrimoine estimé de vos grands-parents</label>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {[['<100','< 100 000 €'],['100-300','100 000 – 300 000 €'],['300-700','300 000 – 700 000 €'],['700-1500','700 000 – 1 500 000 €'],['1500+','> 1 500 000 €']].map(([val, lbl]) => (
                        <button key={val} onClick={() => setForm(p => ({ ...p, gp_patrimoine: val }))}
                          style={{ padding: '10px 16px', border: `2px solid ${form.gp_patrimoine === val ? '#C9A96E' : '#E5E7EB'}`, borderRadius: 8, background: form.gp_patrimoine === val ? '#FDF8F0' : 'white', color: form.gp_patrimoine === val ? '#C9A96E' : '#6B7280', cursor: 'pointer', fontSize: 14, fontWeight: form.gp_patrimoine === val ? 600 : 400, fontFamily: 'DM Sans, sans-serif', textAlign: 'left', transition: 'all 0.15s' }}>
                          {lbl}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {/* Oncles / tantes — si GP en vie */}
                {(form.gp_maternels === 'les_deux' || form.gp_maternels === 'un' || form.gp_paternels === 'les_deux' || form.gp_paternels === 'un') && (
                  <div>
                    <label style={{ color: '#6B7280', fontSize: 13, display: 'block', marginBottom: 8 }}>Oncles et tantes <span style={{ color: '#A8A8B8' }}>(enfants de vos grands-parents, hors vos parents)</span></label>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                      {form.gp_maternels !== 'non' && form.gp_maternels && (
                        <div>
                          <label style={{ color: '#A8A8B8', fontSize: 12, display: 'block', marginBottom: 6 }}>Côté maternel</label>
                          <div style={{ display: 'flex', gap: 6 }}>
                            {['0','1','2','3','4+'].map(n => (
                              <button key={n} onClick={() => setForm(p => ({ ...p, oncles_tantes_maternels: n }))}
                                style={{ flex: 1, padding: '8px 4px', border: `2px solid ${form.oncles_tantes_maternels === n ? '#1B2B4B' : '#E5E7EB'}`, borderRadius: 8, background: form.oncles_tantes_maternels === n ? '#F0F4FF' : 'white', color: form.oncles_tantes_maternels === n ? '#1B2B4B' : '#6B7280', cursor: 'pointer', fontSize: 13, fontWeight: form.oncles_tantes_maternels === n ? 600 : 400, fontFamily: 'DM Sans, sans-serif', transition: 'all 0.15s' }}>
                                {n}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                      {form.gp_paternels !== 'non' && form.gp_paternels && (
                        <div>
                          <label style={{ color: '#A8A8B8', fontSize: 12, display: 'block', marginBottom: 6 }}>Côté paternel</label>
                          <div style={{ display: 'flex', gap: 6 }}>
                            {['0','1','2','3','4+'].map(n => (
                              <button key={n} onClick={() => setForm(p => ({ ...p, oncles_tantes_paternels: n }))}
                                style={{ flex: 1, padding: '8px 4px', border: `2px solid ${form.oncles_tantes_paternels === n ? '#1B2B4B' : '#E5E7EB'}`, borderRadius: 8, background: form.oncles_tantes_paternels === n ? '#F0F4FF' : 'white', color: form.oncles_tantes_paternels === n ? '#1B2B4B' : '#6B7280', cursor: 'pointer', fontSize: 13, fontWeight: form.oncles_tantes_paternels === n ? 600 : 400, fontFamily: 'DM Sans, sans-serif', transition: 'all 0.15s' }}>
                                {n}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
                {/* Donations reçues */}
                <div>
                  <label style={{ color: '#6B7280', fontSize: 13, display: 'block', marginBottom: 8 }}>Avez-vous déjà reçu des donations de vos parents ou grands-parents ?</label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {[['oui','Oui'],['non','Non'],['sais_pas','Je ne sais pas']].map(([val, lbl]) => (
                      <button key={val} onClick={() => setForm(p => ({ ...p, donations_recues: val }))}
                        style={{ flex: 1, padding: '10px', border: `2px solid ${form.donations_recues === val ? '#1B2B4B' : '#E5E7EB'}`, borderRadius: 8, background: form.donations_recues === val ? '#F0F4FF' : 'white', color: form.donations_recues === val ? '#1B2B4B' : '#6B7280', cursor: 'pointer', fontSize: 13, fontWeight: form.donations_recues === val ? 600 : 400, fontFamily: 'DM Sans, sans-serif', transition: 'all 0.15s' }}>
                        {lbl}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {formStep === 5 && form.focus === 'B' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                <p style={{ color: '#7A7A8C', fontSize: 14, margin: 0, lineHeight: 1.6 }}>Pour cibler l'audit sur votre transmission et la protection de vos proches.</p>
                {/* Testament */}
                <div>
                  <label style={{ color: '#6B7280', fontSize: 13, display: 'block', marginBottom: 8 }}>Avez-vous un testament ?</label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {[['oui','Oui'],['non','Non'],['sais_pas','Je ne sais pas']].map(([val, lbl]) => (
                      <button key={val} onClick={() => setForm(p => ({ ...p, testament: val }))}
                        style={{ flex: 1, padding: '10px', border: `2px solid ${form.testament === val ? '#1B2B4B' : '#E5E7EB'}`, borderRadius: 8, background: form.testament === val ? '#F0F4FF' : 'white', color: form.testament === val ? '#1B2B4B' : '#6B7280', cursor: 'pointer', fontSize: 13, fontWeight: form.testament === val ? 600 : 400, fontFamily: 'DM Sans, sans-serif', transition: 'all 0.15s' }}>
                        {lbl}
                      </button>
                    ))}
                  </div>
                </div>
                {/* Assurance-vie */}
                <div>
                  <label style={{ color: '#6B7280', fontSize: 13, display: 'block', marginBottom: 8 }}>Avez-vous une ou plusieurs assurances-vie ?</label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {[['oui','Oui — bénéficiaires à jour'],['oui_maj','Oui — à mettre à jour / je ne sais pas'],['non','Non']].map(([val, lbl]) => (
                      <button key={val} onClick={() => setForm(p => ({ ...p, av_existante: val }))}
                        style={{ padding: '10px 16px', border: `2px solid ${form.av_existante === val ? '#C9A96E' : '#E5E7EB'}`, borderRadius: 8, background: form.av_existante === val ? '#FDF8F0' : 'white', color: form.av_existante === val ? '#C9A96E' : '#6B7280', cursor: 'pointer', fontSize: 13, fontWeight: form.av_existante === val ? 600 : 400, fontFamily: 'DM Sans, sans-serif', textAlign: 'left', transition: 'all 0.15s' }}>
                        {lbl}
                      </button>
                    ))}
                  </div>
                </div>
                {/* Types actifs */}
                <div>
                  <label style={{ color: '#6B7280', fontSize: 13, display: 'block', marginBottom: 8 }}>Vos actifs principaux <span style={{ color: '#A8A8B8' }}>(plusieurs choix)</span></label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {[['Résidence principale','🏠'],['Immobilier locatif','🏢'],['Épargne / financier','💰'],['Entreprise','⚙'],['Bien étranger','🌍']].map(([lbl, ico]) => {
                      const sel = (form.actifs_type || []).includes(lbl);
                      return (
                        <button key={lbl} onClick={() => setForm(p => ({ ...p, actifs_type: sel ? p.actifs_type.filter(x => x !== lbl) : [...(p.actifs_type||[]), lbl] }))}
                          style={{ padding: '8px 14px', border: `2px solid ${sel ? '#1B2B4B' : '#E5E7EB'}`, borderRadius: 20, background: sel ? '#F0F4FF' : 'white', color: sel ? '#1B2B4B' : '#6B7280', cursor: 'pointer', fontSize: 13, fontWeight: sel ? 600 : 400, fontFamily: 'DM Sans, sans-serif', transition: 'all 0.15s' }}>
                          {ico} {lbl}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {formStep === 5 && form.focus === 'C' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                <p style={{ color: '#7A7A8C', fontSize: 14, margin: 0, lineHeight: 1.6 }}>Pour calibrer l'audit sur votre situation fiscale personnelle.</p>
                {/* Statut pro */}
                <div>
                  <label style={{ color: '#6B7280', fontSize: 13, display: 'block', marginBottom: 8 }}>Votre statut professionnel</label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    {[['salarie','Salarié'],['tns','TNS / indépendant'],['dirigeant','Dirigeant de société'],['retraite','Retraité']].map(([val, lbl]) => (
                      <button key={val} onClick={() => setForm(p => ({ ...p, statut_pro: val }))}
                        style={{ padding: '11px', border: `2px solid ${form.statut_pro === val ? '#1B2B4B' : '#E5E7EB'}`, borderRadius: 8, background: form.statut_pro === val ? '#F0F4FF' : 'white', color: form.statut_pro === val ? '#1B2B4B' : '#6B7280', cursor: 'pointer', fontSize: 13, fontWeight: form.statut_pro === val ? 600 : 400, fontFamily: 'DM Sans, sans-serif', transition: 'all 0.15s' }}>
                        {lbl}
                      </button>
                    ))}
                  </div>
                </div>
                {/* Revenus foyer */}
                <div>
                  <label style={{ color: '#6B7280', fontSize: 13, display: 'block', marginBottom: 8 }}>Revenus annuels du foyer</label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {[['<30','< 30 000 €'],['30-60','30 000 – 60 000 €'],['60-100','60 000 – 100 000 €'],['100-200','100 000 – 200 000 €'],['200+','> 200 000 €']].map(([val, lbl]) => (
                      <button key={val} onClick={() => setForm(p => ({ ...p, revenus_foyer: val }))}
                        style={{ padding: '10px 16px', border: `2px solid ${form.revenus_foyer === val ? '#C9A96E' : '#E5E7EB'}`, borderRadius: 8, background: form.revenus_foyer === val ? '#FDF8F0' : 'white', color: form.revenus_foyer === val ? '#C9A96E' : '#6B7280', cursor: 'pointer', fontSize: 14, fontWeight: form.revenus_foyer === val ? 600 : 400, fontFamily: 'DM Sans, sans-serif', textAlign: 'left', transition: 'all 0.15s' }}>
                        {lbl}
                      </button>
                    ))}
                  </div>
                </div>
                {/* PER / PEA */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div>
                    <label style={{ color: '#6B7280', fontSize: 13, display: 'block', marginBottom: 8 }}>PER ouvert ?</label>
                    <div style={{ display: 'flex', gap: 6 }}>
                      {[['oui','Oui'],['non','Non']].map(([val, lbl]) => (
                        <button key={val} onClick={() => setForm(p => ({ ...p, per_ouvert: val }))}
                          style={{ flex: 1, padding: '9px', border: `2px solid ${form.per_ouvert === val ? '#1B2B4B' : '#E5E7EB'}`, borderRadius: 8, background: form.per_ouvert === val ? '#F0F4FF' : 'white', color: form.per_ouvert === val ? '#1B2B4B' : '#6B7280', cursor: 'pointer', fontSize: 13, fontWeight: form.per_ouvert === val ? 600 : 400, fontFamily: 'DM Sans, sans-serif', transition: 'all 0.15s' }}>
                          {lbl}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label style={{ color: '#6B7280', fontSize: 13, display: 'block', marginBottom: 8 }}>PEA ouvert ?</label>
                    <div style={{ display: 'flex', gap: 6 }}>
                      {[['oui','Oui'],['non','Non']].map(([val, lbl]) => (
                        <button key={val} onClick={() => setForm(p => ({ ...p, pea_ouvert: val }))}
                          style={{ flex: 1, padding: '9px', border: `2px solid ${form.pea_ouvert === val ? '#1B2B4B' : '#E5E7EB'}`, borderRadius: 8, background: form.pea_ouvert === val ? '#F0F4FF' : 'white', color: form.pea_ouvert === val ? '#1B2B4B' : '#6B7280', cursor: 'pointer', fontSize: 13, fontWeight: form.pea_ouvert === val ? 600 : 400, fontFamily: 'DM Sans, sans-serif', transition: 'all 0.15s' }}>
                          {lbl}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Navigation */}
            <div style={{ display: 'flex', gap: 10, marginTop: 28, alignItems: 'center' }}>
              {formStep > 1 && (
                <button onClick={() => setFormStep(s => s - 1)}
                  style={{ padding: '11px 18px', border: '1px solid #E5E7EB', borderRadius: 9, background: 'white', color: '#6B7280', cursor: 'pointer', fontSize: 14, fontFamily: 'DM Sans, sans-serif' }}>
                  ← Retour
                </button>
              )}
              {formStep < totalSteps ? (
                <button onClick={() => canAdvance() && setFormStep(s => s + 1)} disabled={!canAdvance()}
                  style={{ flex: 1, padding: '12px', border: 'none', borderRadius: 9, background: canAdvance() ? '#1B2B4B' : '#E5E7EB', color: canAdvance() ? 'white' : '#A8A8B8', cursor: canAdvance() ? 'pointer' : 'default', fontSize: 15, fontWeight: 600, fontFamily: 'DM Sans, sans-serif' }}>
                  Suivant →
                </button>
              ) : (
                <button onClick={() => startWithForm(form)} disabled={loading}
                  style={{ flex: 1, padding: '12px', border: 'none', borderRadius: 9, background: !loading ? '#C9A96E' : '#E5E7EB', color: !loading ? 'white' : '#A8A8B8', cursor: !loading ? 'pointer' : 'default', fontSize: 15, fontWeight: 600, fontFamily: 'DM Sans, sans-serif' }}>
                  {loading ? '⏳ Démarrage…' : 'Lancer mon audit →'}
                </button>
              )}
            </div>

          </div>
        )}

        {/* ── BRANCHE 3 : CHAT ── */}
        {auditPhase === 'chat' && (
          <div className="card" style={{ display: 'flex', flexDirection: 'column', height: 640 }}>
            <div style={{ padding: '14px 20px', borderBottom: '1px solid #F5F0EA', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 34, height: 34, borderRadius: '50%', background: '#C9A96E', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: 14 }}>N</div>
                <div>
                  <p style={{ fontWeight: 600, color: '#1B2B4B', fontSize: 14, margin: 0 }}>Conseiller Nesso</p>
                  <p style={{ color: '#10B981', fontSize: 11, margin: 0 }}>● {isDemoMode ? 'Mode démo' : 'En ligne'}</p>
                </div>
              </div>
              {isDemoMode && (
                <button onClick={onApiKey} style={{ background: '#F0F4FF', border: '1px solid #C7D7FD', color: '#1D4ED8', borderRadius: 7, padding: '5px 11px', fontSize: 11, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>
                  Activer le vrai Claude
                </button>
              )}
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
              {messages.filter(m => !m.hidden).map((m, i) => (
                <div key={i} className="fade-in" style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start', gap: 8 }}>
                  {m.role === 'assistant' && (
                    <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#C9A96E', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: 12, flexShrink: 0, marginTop: 2 }}>N</div>
                  )}
                  <div style={{ maxWidth: '80%', background: m.role === 'user' ? '#1B2B4B' : '#F9FAFB', color: m.role === 'user' ? 'white' : '#1A1A2E', padding: '11px 15px', borderRadius: m.role === 'user' ? '12px 12px 3px 12px' : '3px 12px 12px 12px', fontSize: 14, lineHeight: 1.75, whiteSpace: 'pre-wrap' }}>
                    {renderText(m.content)}
                  </div>
                </div>
              ))}
              {loading && (
                <div style={{ display: 'flex', gap: 8 }}>
                  <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#C9A96E', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: 12 }}>N</div>
                  <div style={{ background: '#F9FAFB', padding: '10px 14px', borderRadius: '3px 12px 12px 12px', display: 'flex', gap: 5 }}>
                    {[0,1,2].map(i => <div key={i} style={{ width: 7, height: 7, borderRadius: '50%', background: '#C9A96E', animation: `bounce 0.8s ${i*0.15}s infinite` }} />)}
                  </div>
                </div>
              )}
              <div ref={endRef} />
            </div>

            {messages.length > 1 && !loading && (
              <div style={{ paddingLeft: 14, paddingRight: 14, paddingTop: 8, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                <button onClick={() => send('Je ne sais pas, passons à la suite')}
                  style={{ background: 'none', border: '1px solid #E5E7EB', color: '#7A7A8C', borderRadius: 20, padding: '5px 12px', fontSize: 12, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>
                  Passer cette question
                </button>
              </div>
            )}

            <div style={{ borderTop: '1px solid #F5F0EA', padding: 14, display: 'flex', gap: 9 }}>
              <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()}
                placeholder="Répondez ici..." style={{ flex: 1, border: '1px solid #E5E7EB', borderRadius: 9, padding: '10px 14px', fontSize: 14, fontFamily: 'DM Sans, sans-serif' }} />
              <button className="btn-navy" onClick={() => send()} disabled={loading || !input.trim()} style={{ padding: '10px 18px' }}>→</button>
            </div>

            {msgCount >= 6 && !updating && !loading && (
              <div style={{ padding: '0 14px 10px' }}>
                <button onClick={handleMettreAJour} style={{ width: '100%', padding: '12px', fontSize: 14, fontWeight: 600, background: '#1B2B4B', color: '#C9A96E', border: 'none', borderRadius: 9, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>
                  {updating ? '⏳ Génération...' : '✦ Générer mon tableau de bord →'}
                </button>
              </div>
            )}

            <div style={{ textAlign: 'center', paddingBottom: 12 }}>
              <button onClick={handleNouvelleConversation} style={{ background: 'none', border: 'none', color: '#7A7A8C', cursor: 'pointer', fontSize: 12, fontFamily: 'DM Sans, sans-serif' }}>
                Nouvelle conversation
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
