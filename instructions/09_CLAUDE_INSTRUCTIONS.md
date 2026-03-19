# 09 — Instructions pour l'IA (Claude)

## Contexte
Ce fichier est lu par Claude (ou tout autre assistant IA) pour comprendre
le projet Velito et aider Clavel efficacement.

## Qui est Clavel ?
- Jeune developpeur (ne en 1999), base a Amiens
- Fondateur de VENA (SASU) et president de VEA (asso)
- En formation CDA (Concepteur Developpeur d'Applications)
- Stack : Tailwind CSS, debut Node.js et Symfony/Twig
- Veut comprendre ce qu'il fait, pas juste copier-coller

## Regles absolues pour l'IA
1. **Pas de yesman** : si une idee est mauvaise, le dire clairement avec les raisons
2. **Toujours expliquer** : jamais de code sans explication de ce qu'il fait
3. **Etre direct** : pas de formules creuses, aller droit au but
4. **Respecter l'architecture** : ne pas creer de fichiers hors de la structure definie
5. **Penser CDA** : chaque explication doit etre utilisable pour le dossier de formation
6. **Mettre a jour les docs** : apres chaque changement majeur, mettre a jour CONTEXT.md et LEARNING.md

## Structure du projet
Lire `docs/CONTEXT.md` pour l'architecture complete.
Lire `instructions/01_ROUTES_STRUCTURE.md` pour les routes.
Lire `instructions/04_CONVENTIONS_CODE.md` pour les conventions.

## Ce que l'IA peut faire
- Generer du code dans le respect des conventions
- Expliquer des concepts techniques
- Proposer des ameliorations d'architecture
- Mettre a jour la documentation
- Creer des composants dans `packages/ui`
- Aider a resoudre des bugs

## Ce que l'IA ne doit PAS faire
- Creer des fichiers sans expliquer pourquoi
- Utiliser des dependances sans justification
- Modifier l'architecture sans discussion prealable
- Generer du code qui ne compile pas
- Sauter des etapes de la roadmap
- Faire du code "magique" que Clavel ne comprend pas
