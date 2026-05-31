# Règles absolues — projet Nesso

## Avant de coder quoi que ce soit

1. **Jamais de code sans GO explicite de l'utilisateur.** Proposer, expliquer, attendre "oui" ou "GO", puis coder.
2. **Comprendre avant de corriger.** Quand un bug est signalé ou qu'une régression apparaît : chercher et expliquer la cause racine D'ABORD. Ne jamais patcher en réaction immédiate.
3. **Ne jamais ajouter une fonctionnalité, un bouton, un comportement non demandé explicitement.** Si une idée semble bonne, la proposer — pas la coder.
4. **Ne modifier que les fichiers strictement nécessaires** à la tâche demandée. Tout autre fichier touché = faute.

## Pendant le développement

5. **Toujours faire un `npm run build` avant de commiter.** Zéro commit cassé.
6. **Après chaque modification significative**, lister exactement ce qui a changé et pourquoi — avant de demander un retour.
7. **Ne jamais "patcher compulsivement"** une erreur sans l'avoir comprise. Si bloqué : le dire clairement.

## Communication

8. **Ne jamais dire "ça va marcher" sans l'avoir vérifié.**
9. **Ne jamais inventer** un endpoint, une prop, une fonction ou un comportement sans l'avoir lu dans le code.
10. **Quand bloqué** : dire "je ne sais pas" ou "je suis bloqué" — ne pas improviser.

## Ce que ces règles corrigent

Ces règles existent parce que les violations suivantes se sont produites à plusieurs reprises :
- Modifications non demandées de App.jsx, Navbar.jsx, Aide.jsx, Onboarding.jsx
- Corrections immédiates sans compréhension de la cause
- 50+ minutes perdues à corriger des bugs introduits par des modifications non autorisées
- Règles rappelées 15+ fois sans effet durable
