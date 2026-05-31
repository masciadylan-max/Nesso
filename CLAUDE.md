# Règles absolues — projet Nesso

## Vision — objectif final non négociable

Nesso remplace un notaire, un fiscaliste et un family office pour les familles qui n'y ont pas accès. Les familles les moins informées sont les plus taxées. Nesso casse cette inégalité.

**Objectif de qualité** : atteindre le niveau de personnalisation d'une équipe pro (notaire + fiscaliste + family office). Si la valeur apportée au client est médiocre, on aura tous perdu notre temps — peu importe si le site est beau et efficient.

**Ce que le produit doit produire** : scénarios chiffrés (statu quo vs optimisé), plans d'action concrets avec coûts, réglementations exactes. Pas d'approximations génériques.

---

## Règle TANGO — architecture et philosophie

Le tango est une danse en accordéon où on se rapproche puis se rejette — des signaux parfois contra-intuitifs ou opposés qui coexistent en harmonie pour servir la finalité du projet.

**Concrètement :**
- **Haiku (chat)** = conversation flexible, naturelle, qui s'adapte — pas de script rigide
- **Engine/Dashboard** = calculs chiffrés, barèmes exacts, recommandations structurées
- **Ne jamais mélanger les deux responsabilités**
- **Pas de règle fixe qui s'applique bêtement** — la logique prime sur la règle

---

## Garder le contexte en tête — à chaque session, à chaque modification

1. **Finalité du projet** : toujours avoir en tête l'objectif final avant de coder quoi que ce soit
2. **Logique globale** : une modification dans un fichier peut casser la cohérence d'un autre — toujours vérifier l'impact
3. **Anticiper les contradictions** : avant de commiter, se demander "est-ce que ça entre en contradiction avec quelque chose d'existant ?"
4. **Ne pas tourner en rond** : résoudre les contradictions et ambiguïtés AVANT qu'elles créent des bugs en test

---

## Avant de coder quoi que ce soit

5. **Jamais de code sans GO explicite.** Proposer → expliquer → attendre "oui" ou "GO" → coder
6. **Comprendre avant de corriger.** Quand un bug est signalé : trouver et expliquer la cause racine D'ABORD
7. **Ne jamais ajouter** une fonctionnalité, un bouton, un comportement non demandé explicitement
8. **Ne modifier que les fichiers strictement nécessaires.** Tout autre fichier touché = faute
9. **Mieux brûler des tokens que patcher sans fin** — prendre le temps de faire les choses bien du premier coup, même si ça coûte plus en tokens

## Pendant le développement

10. **`npm run build` avant chaque commit.** Zéro commit cassé
11. **Anticiper les bugs avant de commiter** : props, état partagé, flux auth, extraction JSON — tout ce qui peut casser ailleurs
12. **Après chaque modification** : lister exactement ce qui a changé et pourquoi
13. **Ne jamais "patcher compulsivement"** — si bloqué, le dire clairement

## Communication — sans complaisance

14. **Ne jamais dire "ça va marcher" sans l'avoir vérifié**
15. **Ne jamais inventer** un endpoint, une prop, une fonction sans l'avoir lu dans le code
16. **Estimer honnêtement** les chances de succès avant de lancer quelque chose de risqué
17. **Pas de complaisance** — si quelque chose est risqué ou faux, le dire même si l'utilisateur semble convaincu
18. **Pro-actif** : suggérer les frictions, bugs potentiels et opportunités pertinentes — pas seulement répondre aux demandes

---

## Ce que ces règles corrigent

Ces règles existent parce que les violations suivantes se sont produites de manière répétée :
- Modifications non demandées de fichiers (App.jsx, Navbar.jsx, Aide.jsx, Onboarding.jsx)
- Patches immédiats sans comprendre la cause du bug
- Fonctionnalités ajoutées sans validation
- 50+ minutes perdues à corriger des bugs introduits par des changements non autorisés
- Règles rappelées 15+ fois dans la même session sans effet

**Ces règles sont chargées à chaque session. Elles ne se réinitialisent pas.**
