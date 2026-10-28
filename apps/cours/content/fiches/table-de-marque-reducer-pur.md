---
titre: "Un seul chemin pour modifier l'état : dispatch, un réducteur pur, des abonnés"
projet: "table-de-marque"
bloc: 2
themes: ["architecture", "tests"]
source: "maquette/emarque-unss/js/store.js"
date: 2026-10-10
---

## Le concept

Dans une app sans framework, la tentation est de modifier l'état directement depuis chaque bouton : `etat.matchs[id].chrono.demarreA = Date.now()`, puis de penser à sauvegarder, puis de penser à redessiner. Avec vingt boutons, on oublie une étape quelque part.

La table de marque reprend le principe de Redux, sans la bibliothèque. Tout l'état tient dans un objet, et il n'existe **qu'une** façon de le changer :

```js
let etat = charger();
const abonnes = new Set();

/** Un écran s'abonne pour être prévenu à chaque changement. */
export function abonner(fonction) {
  abonnes.add(fonction);
  return () => abonnes.delete(fonction);
}

/** Le SEUL moyen de modifier l'état. */
export function dispatch(action) {
  const suivant = reduire(etat, action);
  if (suivant === etat) return; // rien n'a changé : pas de sauvegarde inutile
  etat = suivant;
  sauvegarder(etat);
  abonnes.forEach((f) => f(etat));
}
```

(`maquette/emarque-unss/js/store.js`)

`reduire(etat, action)` est une **fonction pure** : elle reçoit l'ancien état et une action, et renvoie un nouvel objet sans toucher à l'ancien (copies avec `...`). Quand une action est refusée, elle renvoie **le même objet**, et le test `suivant === etat` évite une sauvegarde et un redessin pour rien. Les actions de match (`MATCH_DEMARRER`, `MATCH_EVENEMENT`, `MATCH_CORRIGER`...) sont déléguées à `reduireMatchs` dans `js/match.js`.

Le point qui rend tout ça testable : le réducteur n'appelle jamais `Date.now()` ni ne fabrique d'identifiant. L'heure (`maintenant`) et les `id` arrivent **dans l'action**, fournis par les gestes de l'écran (`js/gestes.js`, `js/horloge.js`). Le commentaire en tête de `match.js` le dit : « fonctions pures, l'heure (`maintenant`) et les identifiants sont fournis par l'action ». Un test peut donc rejouer « démarrer à t=0, panier à t=5000, pause à t=12000 » et obtenir toujours le même résultat.

Le réducteur sert aussi de garde : `MATCH_SIGNATURE` est ignoré si le match n'est pas terminé, et tout est ignoré une fois la feuille verrouillée (`if (m.verrouillage) return m;`). L'écran cache déjà ces boutons ; le réducteur refuse quand même. Double sécurité.

Sans ce modèle : une sauvegarde oubliée après un changement, un écran pas redessiné, et des règles du match dispersées dans les gestionnaires de clic, impossibles à tester sans navigateur.

## Comment je l'explique au jury

« Toutes les modifications de l'état passent par une seule fonction, `dispatch`, qui appelle un réducteur pur, sauvegarde dans le localStorage puis prévient les écrans abonnés. Le réducteur ne lit ni l'horloge ni l'écran : l'heure et les identifiants lui sont donnés dans l'action, donc il donne toujours le même résultat pour les mêmes entrées. C'est ce qui m'a permis de tester les moteurs en Node, sans navigateur. Il sert aussi de dernière barrière : une feuille verrouillée renvoie l'état inchangé, quoi que l'écran envoie. Et si l'état ne change pas, il n'y a ni sauvegarde ni redessin. »

## La question vicieuse du jury

**« Vous dites que c'est testable. Où sont les tests ? »**

Il n'y en a pas dans le dossier, et c'est la limite honnête de cette maquette. J'ai testé les moteurs en Node pendant la session de développement, dans un bac à sable : 20 tests sur le chrono et les changements de joueurs, 12 sur le volley. Ils ont servi, mais je ne les ai pas gardés, donc aujourd'hui rien ne protège contre une régression. La correction est simple justement parce que le réducteur est pur : un fichier `tests/moteurs.test.js` lancé avec `node --test`, sans aucune dépendance, qui construit un match avec `creerMatch`, enchaîne des actions avec des `maintenant` fixes et vérifie le score et le chrono. C'est la première chose à faire avant de modifier les moteurs.

Autre limite que je connais : `etat` est remplacé à chaque action, mais rien ne **gèle** l'objet. Un écran qui ferait `getEtat().matchs[id].statut = 'termine'` contournerait tout le modèle. C'est une convention, pas une contrainte ; `Object.freeze` en développement la rendrait vérifiable.
