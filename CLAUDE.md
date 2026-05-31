# Règles absolues — projet Nesso

## Vision — garder ça en tête à chaque session

Nesso remplace un conseiller en patrimoine, fiscaliste et family office pour les familles qui n'y ont pas accès. Les familles les moins informées sont les plus taxées. Nesso casse cette inégalité.

**Standard absolu** : scénarios chiffrés (statu quo vs optimisé), plans d'action concrets avec coûts, réglementations exactes. Pas d'approximations génériques. Pas d'à-peu-près.

**Priorité absolue** : la valeur apportée au client. Un site beau avec un conseil médiocre = échec total. La qualité du conseil prime sur tout le reste.

---

## Règle TANGO — architecture non négociable

- **Haiku** = conseiller conversationnel (barèmes, leviers, signaux, posture de conseiller)
- **Engine/Dashboard** = calculs chiffrés et recommandations structurées
- **Ne jamais mélanger les deux responsabilités.** Le chat n'affiche pas de tableaux. Le dashboard ne fait pas de conseils flous.

---

## Avant de coder quoi que ce soit

1. **Jamais de code sans GO explicite.** Proposer → expliquer → attendre "oui" ou "GO" → coder.
2. **Comprendre avant de corriger.** Quand un bug est signalé : trouver et expliquer la cause racine D'ABORD. Ne jamais patcher en réaction immédiate.
3. **Ne jamais ajouter** une fonctionnalité, un bouton, un comportement non demandé explicitement. Si une idée semble bonne → la proposer, pas la coder.
4. **Ne modifier que les fichiers strictement nécessaires.** Tout autre fichier touché = faute.

## Pendant le développement

5. **`npm run build` avant chaque commit.** Zéro commit cassé.
6. **Anticiper les bugs avant de commiter** : se demander systématiquement "qu'est-ce que ce changement peut casser ailleurs ?" — props, état partagé, flux auth, extraction JSON.
7. **Après chaque modification**, lister exactement ce qui a changé et pourquoi.
8. **Ne jamais "patcher compulsivement".** Si bloqué : dire "je suis bloqué" — ne pas improviser.

## Communication — sans complaisance

9. **Ne jamais dire "ça va marcher" sans l'avoir vérifié.**
10. **Ne jamais inventer** un endpoint, une prop, une fonction sans l'avoir lu dans le code.
11. **Estimer honnêtement** les chances de succès avant de lancer quelque chose de risqué.
12. **Quand bloqué** : dire "je ne sais pas" — pas d'improvisation.
13. **Pas de complaisance.** Ne pas valider une direction parce que l'utilisateur semble convaincu. Si quelque chose est risqué ou faux, le dire.

---

## Ce que ces règles corrigent

Ces règles existent parce que les violations suivantes se sont produites de manière répétée :
- Modifications non demandées de fichiers (App.jsx, Navbar.jsx, Aide.jsx, Onboarding.jsx)
- Patches immédiats sans comprendre la cause du bug
- Fonctionnalités ajoutées sans validation
- 50+ minutes perdues à corriger des bugs introduits par des changements non autorisés
- Règles rappelées 15+ fois dans la même session sans effet

**Ces règles sont chargées à chaque session. Elles ne se réinitialisent pas.**
