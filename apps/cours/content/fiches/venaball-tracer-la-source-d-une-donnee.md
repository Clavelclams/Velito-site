---
titre: "Deux chiffres qui se contredisent : tracer d'où vient une donnée"
projet: "venaball"
bloc: 2
themes: ["base-de-donnees", "modelisation"]
source: "src/Entity/Sport/EvaluationMatch.php, migrations/Version20260726120000.php"
date: 2026-09-04
---

## Le concept

Les statistiques d'une joueuse peuvent venir de deux endroits. Soit du **Stats Live** — la saisie faite au bord du terrain pendant le match, sur mobile. Soit de la **FFBB** — les feuilles de match officielles importées après coup.

Les deux décrivent le même match et **ne donnent pas les mêmes chiffres**. Ce n'est pas un bug : la saisie live capte des choses que la feuille officielle ignore (temps de jeu réel, actions détaillées), la feuille officielle fait foi pour ce qu'elle contient. Les deux sont vraies dans leur périmètre.

La mauvaise réponse aurait été d'en choisir une et d'écraser l'autre — on perd de l'information, et le jour où quelqu'un conteste un chiffre, il n'y a plus rien à comparer. La bonne réponse tient en une colonne : `EvaluationMatch` porte désormais une **`source`**, et la fiche joueuse offre un basculement entre les deux vues.

Le principe général derrière : **une donnée agrégée sans sa provenance est une donnée qu'on ne peut pas défendre.** Dès qu'il existe plusieurs origines possibles pour une même mesure, la provenance fait partie de la mesure. Sans elle, on ne peut ni expliquer un écart, ni corriger une source sans toucher à l'autre, ni dire à un utilisateur pourquoi il voit 12 points ici et 14 là.

L'opération qui a rendu la migration `Version20260726120000` intéressante est le **backfill**. Ajouter une colonne `source` à une table qui contient déjà des milliers de lignes pose la question : que vaut-elle pour l'existant ? Une colonne `NULL` par défaut aurait créé une troisième catégorie — « on ne sait pas » — qu'il aurait fallu traiter partout dans le code, pour toujours. La migration remplit donc les lignes existantes avec leur origine réelle, connue par construction, et la colonne est `NOT NULL`. Une migration qui ajoute une colonne significative doit répondre pour le passé, pas seulement pour l'avenir.

## Comment je l'explique au jury

« Les stats d'une joueuse viennent de deux origines : la saisie en direct au bord du terrain, et les feuilles de match officielles FFBB importées ensuite. Elles ne donnent pas les mêmes chiffres, et les deux sont légitimes dans leur périmètre. Plutôt que d'en choisir une et d'écraser l'autre, j'ai ajouté une colonne `source` sur l'évaluation de match et un basculement dans l'interface. Une donnée agrégée sans sa provenance ne se défend pas : on ne peut ni expliquer un écart, ni corriger une origine sans abîmer l'autre. La migration fait un backfill : elle remplit la colonne pour les lignes existantes, pour ne pas créer une troisième valeur "inconnu" que le code aurait dû gérer indéfiniment. »

## La question vicieuse du jury

**« Vous laissez donc l'utilisateur choisir quel chiffre est vrai. Ce n'est pas votre travail de trancher ? »**

Sur ce cas précis, non — et c'est un choix de conception, pas une fuite de responsabilité. Les deux sources ne mesurent pas exactement la même chose : la FFBB fait foi pour le score et les points marqués, la saisie live est la seule à connaître le temps de jeu réel, calculé depuis les présences sur le terrain. Trancher voudrait dire jeter ce que l'autre est seule à savoir. Là où je tranche, en revanche, c'est sur ce qui est **officiel** : ce qui est publié vers l'extérieur s'appuie sur la source FFBB, parce que c'est celle qui est opposable. Le basculement sert au coach et à la joueuse, pour le suivi. Si demain je devais afficher un chiffre unique sans contexte — un classement public, par exemple — il faudrait une règle de priorité explicite, écrite et documentée, et non un choix laissé à l'affichage. Ce que j'aurais dû ajouter dès maintenant, et qui manque : quand les deux sources existent et divergent, l'interface devrait le **signaler** plutôt que d'attendre que quelqu'un pense à basculer.
