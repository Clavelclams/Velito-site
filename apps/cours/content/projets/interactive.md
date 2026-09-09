---
titre: "Velito Interactive"
avancement: 70
statut: "en cours"
maj: 2026-09-04
---

## C'est quoi

Velito Interactive est une solution d'animation clé en main pour bars, MJC et espaces jeunes : un écran projeté (« host ») anime la salle, les participants jouent depuis leur téléphone en rejoignant une session avec un code, sans installer d'application ni créer de compte.

Le catalogue compte plusieurs jeux : blindtest, dessin à deviner, estimation, géographie, quiz, petit bac, loup-garou, réflexe, laser. C'est le projet le plus volumineux de l'écosystème (~24 000 lignes) parce que chaque jeu apporte ses propres règles, son propre écran host et son propre écran joueur.

## Comment c'est construit

**Stack** : Next.js 16 (App Router), TypeScript, Tailwind, Supabase (Postgres + RLS + Realtime), déployé sur Vercel sur `interactive.velito.fr`.

L'architecture tourne autour de trois espaces : `/host` (l'écran projeté, un composant par jeu), `/play/[code]` (le téléphone du joueur), et `lib/games/` où vivent les règles de chaque jeu. Le schéma Postgres est dans `sql/`, un fichier par jeu plus les fonctions transverses.

La synchronisation temps réel utilise **les deux mécanismes** de Supabase Realtime, selon la durée de vie de la donnée : `postgres_changes` pour l'état persistant (scores, propositions, avancement du tour), `broadcast` pour l'éphémère (le dessin en cours, qui transite de client à client sans toucher la base).

## Les décisions techniques et POURQUOI

- **Pas de compte pour jouer** : on rejoint par un code de session. La barrière à l'entrée doit être nulle — c'est une animation en présentiel, pas un service en ligne.
- **Incrément de score atomique en base** (`interactive.add_player_score`) : le motif lire-calculer-écrire faisait perdre des points quand deux joueurs marquaient dans la même fraction de seconde. Un seul `UPDATE score = score + p` supprime la race condition, et `security definer` en fait la seule porte d'écriture du score.
- **Broadcast pour le canvas, base pour le score** : écrire plusieurs images de canvas par seconde en base serait des milliers d'écritures pour une donnée périmée à la seconde suivante. Le critère : est-ce que quelqu'un en aura besoin dans dix secondes ?
- **Un module par jeu dans `lib/games/`** plutôt qu'un moteur générique : les règles diffèrent trop pour qu'une abstraction commune reste lisible. Le prix est de la répétition assumée entre jeux.

## État d'avancement honnête

Plusieurs jeux sont jouables de bout en bout et ont tourné en conditions réelles. La mécanique de session, le rejoint-par-code, le scoring et l'affichage host sont stables.

Ce qui est faible :
- **Un seul fichier de test** (`laser.test.ts`) pour 24 000 lignes. Les règles de jeu sont pourtant de la logique pure, donc exactement ce qui se teste bien — c'est un manque de discipline, pas une difficulté technique.
- **Pas de resynchronisation à l'abonnement** sur le broadcast : un joueur qui rejoint pendant une pause du dessinateur voit un canvas vide jusqu'au trait suivant.
- Duplication importante entre les composants host des différents jeux (gestion de session, chronomètre, affichage des scores) qui gagnerait à être factorisée, une fois seulement que le motif sera stabilisé.

## Prochaines étapes

1. Tester les modules de `lib/games/` — c'est de la logique pure, il n'y a aucune raison qu'elle ne soit pas couverte.
2. Resynchronisation à l'abonnement pour le canvas partagé.
3. Factoriser ce qui est réellement commun aux écrans host, après avoir vérifié que le motif est stable sur au moins quatre jeux.
