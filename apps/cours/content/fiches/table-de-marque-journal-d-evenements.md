---
titre: "Une feuille de match qui n'efface jamais rien : annuler, c'est ajouter"
projet: "table-de-marque"
bloc: 2
themes: ["modelisation", "architecture"]
source: "maquette/emarque-unss/js/moteurs/journal.js"
date: 2026-10-10
---

## Le concept

La façon naïve de modéliser un match, c'est de stocker le score : `{ A: 34, B: 28 }`. Le marqueur se trompe, il fait `-2`, et c'est corrigé. Sauf qu'on a perdu deux informations : qu'il y a eu une erreur, et qui avait marqué. Sur une feuille de match papier, on ne gomme pas : on raye, et la rature reste lisible.

Dans la table de marque, un match ne stocke **aucun score**. Il stocke une liste d'événements (« +2 pour le n°7 », « faute du n°5 », « temps mort équipe B »), chacun avec un numéro d'ordre `seq`. Le score est **recalculé** en relisant la liste. Et annuler un événement, c'est ajouter un événement de type `annulation` qui le vise :

```js
/** Les événements qu'on peut annuler (pas les fins de période, ni le départ, ni le premier service). */
export const TYPES_ANNULABLES = ['jeu', 'tempsMort', 'changement', 'point'];

/** Identifiants des événements annulés. */
function idsAnnules(evenements) {
  return new Set(evenements.filter((e) => e.type === 'annulation').map((e) => e.cible));
}

/** Les événements "vivants" : ni annulés, ni eux-mêmes des annulations. */
export function evenementsActifs(match) {
  const annules = idsAnnules(match.evenements);
  return match.evenements.filter((e) => e.type !== 'annulation' && !annules.has(e.id));
}

/** Le dernier événement qu'on peut annuler, ou null. */
export function dernierAnnulable(match) {
  return evenementsActifs(match).filter((e) => TYPES_ANNULABLES.includes(e.type)).at(-1) ?? null;
}
```

(`maquette/emarque-unss/js/moteurs/journal.js`)

Les deux moteurs (`chrono.js` pour basket, hand, futsal et `sets.js` pour le volley) ne lisent que `evenementsActifs(match)`. Ils ne savent même pas qu'une annulation a eu lieu.

**Corriger** est construit sur le même principe, dans `js/match.js` (action `MATCH_CORRIGER`) : on ajoute une annulation de l'événement fautif, puis un nouvel événement pour le bon joueur, avec `correctionDe: cible.id` et `ordre: cible.ordre ?? cible.seq`. Ce champ `ordre` garde la place de l'action d'origine dans le match. Au volley c'est indispensable : `sets.js` trie les points par `ordre` avant de les rejouer, parce que l'ordre des points décide de qui sert et de la rotation.

Sans ce modèle : un score stocké peut devenir faux par rapport à l'historique, une correction ne laisse aucune trace, et au volley une correction mal placée décalerait toute la rotation du set.

## Comment je l'explique au jury

« Une feuille de match est un document officiel, donc j'ai modélisé le match comme un journal d'événements qu'on ne modifie jamais, seulement qu'on complète. Le score, les fautes et la rotation ne sont pas stockés : ils sont recalculés en relisant le journal, donc ils ne peuvent pas être en désaccord avec lui. Annuler, c'est ajouter un événement qui en vise un autre ; corriger, c'est une annulation plus un nouvel événement qui reprend la place de l'ancien grâce au champ `ordre`. Les moteurs de règles ne voient que les événements actifs, ils n'ont pas à gérer les annulations. Et l'historique garde toutes les erreurs de saisie, comme les ratures sur une feuille papier. »

## La question vicieuse du jury

**« Si vous relisez tout le journal à chaque affichage, ça ne devient pas lent sur un long match ? »**

Non, pas à cette échelle. Un match UNSS, c'est quelques centaines d'événements au plus ; les relire est une boucle sur un tableau, sans réseau ni base, bien en dessous de la milliseconde. Il y a quand même un coût que je connais : `calculerEtat` est appelé à chaque redessin, et `horloge.js` redessine chaque seconde pendant une exclusion temporaire. Si un jour ça se voyait, la solution classique de l'event sourcing est un **instantané** : garder l'état calculé jusqu'à l'événement N et ne rejouer que la suite. Je ne l'ai pas fait parce que je n'ai mesuré aucun problème, et un cache ajoute un risque de désynchronisation que le modèle actuel n'a pas.

Deuxième limite que j'assume : `dernierAnnulable` ne propose d'annuler que le **dernier** événement annulable. Pour une erreur plus ancienne, il faut passer par la correction. C'est volontaire pour la maquette, à valider avec les marqueurs UNSS.
