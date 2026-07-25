---
titre: "Le DOM et les événements : quand le code touche la page"
parcours: "javascript"
ordre: 7
niveau: "intermediaire"
duree: 25
date: 2026-07-25
---

## Le cours

Jusqu'ici, ton JavaScript vivait dans la console. Aujourd'hui, il touche la page. Le pont entre les deux s'appelle le **DOM** (Document Object Model).

Quand le navigateur lit du HTML, il construit en mémoire une représentation de la page : un arbre d'objets JavaScript, un objet par balise. Cet arbre, c'est le DOM. La page affichée n'est que le reflet de cet arbre : **modifie l'arbre, la page change instantanément**. Pense à une maquette d'architecte reliée au vrai bâtiment — tu déplaces un mur sur la maquette, le vrai mur bouge.

Le point d'entrée est l'objet global `document`. Pour attraper un élément, on utilise un **sélecteur CSS** (les mêmes que dans tes fichiers de style) :

```js
// Le PREMIER élément qui matche le sélecteur (ou null si aucun)
const titre = document.querySelector("h1");
// TOUS les éléments qui matchent
const liens = document.querySelectorAll("a");
```

Une fois l'élément en main, tu peux tout lire et tout modifier :

```js
titre.textContent = "Nouveau titre";     // change le texte
titre.style.color = "red";               // change le style
titre.classList.add("surligne");         // ajoute une classe CSS
```

Deuxième moitié de la leçon : les **événements**. Une page vit : clics, frappes clavier, défilement. Chaque action émet un événement, et tu peux poser un **écouteur** (listener) dessus : « quand CET événement arrive sur CET élément, exécute CETTE fonction ».

```js
const bouton = document.querySelector("button");
bouton.addEventListener("click", () => {
  console.log("Cliqué !");
});
```

Relis la ligne : `addEventListener` reçoit deux arguments — le nom de l'événement (`"click"`) et une fonction fléchée (leçon 2). Tu ne l'appelles pas toi-même : tu la confies au navigateur, qui l'appellera à chaque clic. C'est le modèle mental clé : **tu ne diriges plus le programme, tu réagis à ce qui arrive**. On appelle ça la programmation événementielle.

L'écouteur reçoit un objet décrivant l'événement :

```js
champ.addEventListener("input", (e) => {
  console.log(e.target.value); // e.target = l'élément concerné ; .value = son contenu
});
```

Ce `(e) => e.target.value`, tu l'as DÉJÀ écrit : dans `RechercheFiches.tsx`, `onChange={(e) => setRequete(e.target.value)}` — à chaque frappe, on lit le texte du champ. React emballe l'événement, mais c'est le même mécanisme.

Et ton code fait même plus fort : il **fabrique ses propres événements**. Dans `progression.ts`, après chaque sauvegarde :

```ts
window.dispatchEvent(new CustomEvent("progression-maj"));
```

« Criez dans toute la page : la progression a changé ! ». Et dans `RechercheFiches.tsx`, quelqu'un écoute ce cri :

```ts
window.addEventListener("progression-maj", rafraichir);
```

C'est ainsi que le dashboard se met à jour quand tu finis un quiz dans un autre composant : pas d'appel direct entre eux, juste un événement émis et écouté. Un vrai motif d'architecture (publish/subscribe), dans TON code.

Dernière chose, importante pour la suite : en React, tu ne manipules presque jamais le DOM à la main (`querySelector`, etc.). Tu décris ce que la page doit afficher, et React modifie le DOM pour toi. Mais React fait EXACTEMENT ce que tu vas faire à la main aujourd'hui — savoir le faire, c'est comprendre ce que React automatise.

## À retenir

- Le DOM est la représentation en mémoire de la page ; le modifier modifie la page affichée.
- `document.querySelector("...")` attrape un élément via un sélecteur CSS.
- `element.addEventListener("click", fonction)` confie une fonction au navigateur, qui l'appellera à chaque événement.
- L'écouteur reçoit un objet événement : `e.target.value` lit le contenu du champ concerné.
- Ton site utilise un événement personnalisé (`progression-maj`) émis dans `progression.ts` et écouté dans les composants : c'est du publish/subscribe.

## Mise en pratique

Ouvre TON site de cours dans le navigateur, console F12 :

1. Attrape un élément : `const h = document.querySelector("h1")` puis `h.textContent`. **Résultat attendu :** le vrai titre de ta page.
2. Modifie-le : `h.textContent = "Je contrôle le DOM"`. **Résultat attendu :** le titre change SOUS TES YEUX sur la page. (Recharge la page : tout revient — tu n'as modifié que l'arbre en mémoire, pas les fichiers.)
3. Style : `h.style.background = "gold"`. **Résultat attendu :** fond doré immédiat.
4. Pose un écouteur global : `document.addEventListener("click", (e) => console.log("cliqué sur", e.target))` puis clique à différents endroits de la page. **Résultat attendu :** chaque clic loggue l'élément exact touché.
5. Écoute l'événement de TON site : tape `window.addEventListener("progression-maj", () => console.log("La progression vient de changer !"))`, puis va faire une action qui donne de l'XP (marquer une fiche lue, finir un quiz). **Résultat attendu :** ton message apparaît dans la console à l'instant où l'XP est enregistrée. C'est le `dispatchEvent` de `lib/progression.ts` que tu viens d'intercepter.
6. Dans VS Code, ouvre `app/components/RechercheFiches.tsx` (lignes 44-49) : trouve le `addEventListener("progression-maj", ...)` et le `removeEventListener`. Explique à voix haute qui émet, qui écoute, et pourquoi on retire l'écouteur (indice : que se passerait-il si on empilait un écouteur à chaque affichage du composant ?).
