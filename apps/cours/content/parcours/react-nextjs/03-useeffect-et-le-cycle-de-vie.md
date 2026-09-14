---
titre: "useEffect : faire quelque chose après le rendu"
parcours: "react-nextjs"
ordre: 3
niveau: "intermediaire"
duree: 25
date: 2026-09-09
---

## Le cours

Un composant rend du JSX. Mais parfois il doit **faire** quelque chose qui n'est pas du rendu : lire le `localStorage`, lancer un timer, s'abonner à un événement, appeler une API. Ça s'appelle un *effet de bord*, et ça passe par `useEffect`.

**La forme :**

```tsx
useEffect(() => {
  // code exécuté APRÈS que le composant a été affiché
  return () => {
    // (optionnel) code exécuté quand l'effet est nettoyé
  };
}, [dépendances]);
```

Trois morceaux : la fonction d'effet, une fonction de nettoyage optionnelle qu'elle retourne, et un **tableau de dépendances** qui dit *quand* relancer l'effet.

**Le tableau de dépendances est tout le sujet.**

- `[]` vide : l'effet tourne **une fois**, après le premier affichage. C'est le cas « au montage » : lire le localStorage, poser un `setInterval`.
- `[a, b]` : l'effet tourne après le premier affichage, **puis à chaque fois que `a` ou `b` change**.
- Pas de tableau du tout : l'effet tourne après **chaque** rendu. Presque toujours une erreur.

Regarde `CompteARebours.tsx` :

```tsx
useEffect(() => {
  setJours(joursAvantJury());
  const t = setInterval(() => setJours(joursAvantJury()), 3_600_000);
  return () => clearInterval(t);
}, []);
```

Tableau vide : au montage, on calcule une fois et on pose un timer horaire. La fonction retournée **nettoie** le timer quand le composant disparaît. Sans ce `clearInterval`, chaque fois que tu navigues vers le dashboard, un nouveau timer s'ajoute aux précédents — une fuite classique.

**Pourquoi le calcul n'est pas fait directement dans le corps du composant.** Tu pourrais écrire `const jours = joursAvantJury()` sans `useEffect`. Mais ce composant est rendu **deux fois** : une fois sur le serveur (au build, pour produire le HTML statique), une fois dans le navigateur (pour l'hydrater — leçon 10). Si les deux rendus donnent des valeurs différentes (la date du build ≠ la date du visiteur), React détecte une incohérence et se plaint. `useEffect` ne tourne **que dans le navigateur**, jamais sur le serveur. Donc : premier rendu identique des deux côtés (`jours === null`, placeholder), puis l'effet met la vraie valeur. C'est le motif standard pour tout ce qui dépend du navigateur : date, `window`, `localStorage`.

**Le cycle de vie, en trois moments.**

1. **Montage** : le composant apparaît. Rendu, puis effets avec `[]` ou dépendances.
2. **Mise à jour** : un state ou une prop change. Re-rendu, puis nettoyage des effets dont les dépendances ont changé, puis ré-exécution de ces effets.
3. **Démontage** : le composant disparaît (navigation, condition devenue fausse). Tous les nettoyages tournent.

`ListeLecons.tsx` illustre le cas « s'abonner » :

```tsx
useEffect(() => {
  const rafraichir = () => setFaites(chargerProgression().leconsFaites);
  rafraichir();
  window.addEventListener("progression-maj", rafraichir);
  return () => window.removeEventListener("progression-maj", rafraichir);
}, []);
```

Au montage : lit la progression et s'abonne à l'événement. Au démontage : se désabonne. Sans le `removeEventListener`, chaque visite empile un écouteur de plus, et un jour tu te demandes pourquoi la page rame.

**Le piège des dépendances manquantes.** Si ton effet utilise une variable (`idQuiz`, `slug`) et que tu ne la mets pas dans le tableau, l'effet garde la **première** valeur qu'il a vue — même si elle change ensuite. ESLint te prévient (`react-hooks/exhaustive-deps`). Écoute-le : dans 95 % des cas il a raison. Les 5 % restants, tu sauras les reconnaître quand tu en seras là.

**Ce que `useEffect` n'est pas.** Ce n'est pas l'endroit pour calculer une valeur dérivée des props (`const total = fiches.length` se fait dans le corps, directement). Ce n'est pas l'endroit pour réagir à un clic (c'est `onClick`). C'est pour : synchroniser avec quelque chose d'extérieur au rendu — navigateur, réseau, timers, événements.

## À retenir

- `useEffect(fn, deps)` : `fn` tourne après le rendu, quand une dépendance change.
- `[]` = une fois au montage. Pas de tableau = à chaque rendu (erreur fréquente).
- La fonction retournée nettoie : timers, écouteurs, abonnements. Sans elle : fuites.
- L'effet ne tourne que dans le navigateur → c'est là qu'on lit la date, `window`, `localStorage`.
- ESLint `exhaustive-deps` a presque toujours raison.

## Mise en pratique

Objectif : voir un effet tourner, fuir, puis être nettoyé — dans ton propre composant.

1. Dans `CompteurClics.tsx` (créé leçon 2, recrée-le si supprimé), ajoute un `useEffect` avec `[]` qui fait `console.log("monté")` et retourne `() => console.log("démonté")`. Place le composant dans une page, ouvre la console F12, navigue vers la page puis ailleurs. Observe les deux logs.
2. Ajoute un second effet sans tableau de dépendances qui fait `console.log("rendu")`. Clique le badge trois fois : « rendu » apparaît trois fois. C'est l'effet « à chaque rendu ». Mets `[n]` : même chose (n change à chaque clic). Mets `[]` : une seule fois. Tu viens de tester les trois modes.
3. Fuite volontaire : un effet avec `[]` qui fait `setInterval(() => console.log("tick"), 1000)` **sans** nettoyage. Navigue vers la page, ailleurs, vers la page, ailleurs. Les « tick » se multiplient et continuent après avoir quitté. Ajoute `return () => clearInterval(t)`. Ils s'arrêtent au démontage.
4. Lis `apps/cours/lib/progression.ts` puis `app/components/ProgressionDashboard.tsx`. Trouve l'effet qui lit la progression et celui qui s'abonne à `progression-maj`. Explique par écrit pourquoi la lecture ne peut pas se faire dans le corps du composant (indice : `localStorage` n'existe pas sur le serveur).
5. Nettoie : retire `CompteurClics` de la page.

Résultat attendu : tu sais quand un effet tourne, pourquoi il nettoie, et pourquoi tout ce qui touche au navigateur passe par lui.
