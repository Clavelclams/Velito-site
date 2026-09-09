---
titre: "ELO : mesurer une force, pas afficher un palmarès"
projet: "arena"
bloc: 1
themes: ["algorithmes", "metier"]
source: "apps/arena/lib/elo.ts"
date: 2026-09-04
---

## Le concept

ARENA a **deux classements**, et c'est un choix produit, pas une redondance.

Le classement public de l'esport marche aux **points cumulés** (3/2/1). Ça récompense la participation dans la durée — le bon signal pour une association d'inclusion : venir souvent compte plus que gagner une fois.

L'**ELO** mesure autre chose : une **force relative**. Il ne s'affiche nulle part côté public. Il sert au staff, à deux endroits : composer des poules équilibrées et placer les têtes de série.

Le principe tient en une phrase : chaque joueur a une note, avant le match on calcule la probabilité de victoire attendue, après le match on déplace la note de l'écart entre le résultat réel et l'attente.

```ts
export function probabiliteVictoire(noteA: number, noteB: number): number {
  return 1 / (1 + Math.pow(10, (noteB - noteA) / 400));
}
```

Le **400** est l'échelle de référence : 400 points d'écart valent 10 fois plus de chances de gagner (≈ 0,909). On ne peut pas la changer sans recalibrer toutes les notes.

Le **facteur K** est l'amplitude maximale d'un ajustement. `facteurK(nbMatchs)` rend 40 sous 10 matchs, 20 au-delà : la note d'un débutant bouge vite le temps de trouver son niveau, celle d'un habitué est stable. C'est la « période de placement ».

Pour les matchs par équipes (padel en double, five), la force d'une équipe est la **moyenne** des notes et chaque membre encaisse le même écart. C'est le modèle standard, et le seul défendable sans données individuelles : sur un match de padel, on ne sait pas qui a porté la paire. Conséquence assumée : un joueur faible associé à un fort progresse vite s'il gagne — ce qui pousse au mélange des niveaux, exactement l'objectif d'une asso d'inclusion.

Enfin, la seule utilisation visible de l'ELO — la répartition en poules par **serpentin** : on trie par niveau décroissant et on distribue A, B, B, A, A, B… Chaque poule reçoit un fort, un faible et des intermédiaires, au lieu d'une poule de la mort et d'une poule de figuration.

## Comment je l'explique au jury

« J'ai deux classements parce qu'ils répondent à deux questions différentes. Les points cumulés mesurent l'assiduité et sont publics ; l'ELO mesure la force et reste interne. L'ELO utilise la formule logistique de référence avec une échelle de 400 points, et un facteur K dégressif — 40 pendant les dix premiers matchs, 20 ensuite — pour qu'une note se stabilise. En équipe, je prends la moyenne des notes du camp et j'applique le même écart à chacun : c'est assumé et documenté, faute de données individuelles. L'ELO ne s'affiche jamais, il sert à composer des poules équilibrées par serpentin. »

## La question vicieuse du jury

**« Vous dites que la moyenne d'équipe est "assumée". Assumée veut dire faux ?»**

Assumée veut dire que je connais sa limite et que je l'ai choisie quand même. La limite réelle : deux joueurs à 1000 et deux joueurs à 1400/600 donnent la même force d'équipe, alors que ce sont deux situations sportives très différentes. Les modèles qui corrigent ça — TrueSkill, Glicko-2 — estiment aussi l'*incertitude* de chaque note et redistribuent l'écart selon la contribution probable. Ils sont meilleurs, et bien plus lourds à implémenter et à expliquer à un orga d'asso. Pour un usage qui consiste à équilibrer des poules sur une journée, la moyenne suffit et son défaut va dans le sens de mon objectif : elle favorise les paires mixtes en niveau. J'ai écrit ce raisonnement dans le commentaire d'en-tête du module, pour que le prochain qui le lit sache que c'est un arbitrage et non une approximation subie.
