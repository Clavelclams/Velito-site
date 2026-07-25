---
titre: "Lire du React : décoder ton propre QuizFiche.tsx"
parcours: "javascript"
ordre: 10
niveau: "solide"
duree: 30
date: 2026-07-25
---

## Le cours

Dernière leçon. Tu as maintenant TOUTES les briques : fonctions fléchées, ternaires, map, destructuring, événements, types. React, ce n'est que ça, assemblé. Aujourd'hui on décode ton `QuizFiche.tsx` — pour de vrai.

**Un composant est une fonction.** `export default function QuizFiche({ idQuiz, titre, questions })` : une fonction qui reçoit un objet (les **props**, destructuré dès la signature — leçon 6) et RENVOIE de quoi afficher. Les props descendent toujours du parent vers l'enfant : ici, un Server Component lit les questions sur le disque et les passe à `QuizFiche`. L'enfant ne les modifie jamais : il les reçoit, point.

**Le JSX.** Le `return (...)` contient du pseudo-HTML dans du JavaScript : c'est du JSX, transformé en appels de fonctions à la compilation. Deux règles de lecture : les accolades `{}` ouvrent une fenêtre vers JavaScript (`{question.question}` affiche la valeur), et les attributs sont en camelCase (`onClick`, `className`).

**Le state : la mémoire du composant.** Le concept central de React. Une variable normale serait remise à zéro à chaque affichage ; le **state** survit et, surtout, **sa modification déclenche un réaffichage**.

```tsx
const [indexQuestion, setIndexQuestion] = useState(0);
// destructuring de TABLEAU : [la valeur actuelle, la fonction pour la changer]
// 0 = valeur de départ
```

Ton quiz en a six : la question courante, le choix cliqué, le score, fini ou pas, l'XP, la manche. La mécanique à comprendre — et à dire au jury : **on ne modifie JAMAIS la valeur directement** (`indexQuestion++` ne réafficherait rien). On appelle `setIndexQuestion(...)`, React note le changement, ré-exécute la fonction `QuizFiche`, et le nouveau JSX remplace l'ancien à l'écran. Un composant React, c'est une fonction ré-exécutée à chaque changement de state.

Suis le fil d'un clic dans TON code : `onClick={() => repondre(i)}` → `repondre` vérifie `if (choixFait !== null) return;` (une seule tentative — leçon 3), puis `setChoixFait(index)` → React réaffiche → le JSX `{choixFait !== null && (...)}` devient vrai → le bloc feedback apparaît. Ce `condition && (...)` est un affichage conditionnel : si la condition est fausse, rien ; si elle est vraie, le bloc s'affiche (souviens-toi du `&&` de la leçon 3 : il ne va à droite que si la gauche est vraie).

Et les listes ? `question.choix.map((choix, i) => <button ...>)` : le `map` de la leçon 5, qui transforme chaque texte de choix en bouton. La `key={i}` aide React à retrouver ses petits d'un affichage à l'autre.

**useEffect : sortir du cadre.** Parfois il faut faire une action qui n'est pas de l'affichage : lire le localStorage, poser un écouteur d'événement. Ça se fait dans un `useEffect`, qui s'exécute APRÈS l'affichage. Dans `RechercheFiches.tsx` :

```tsx
useEffect(() => {
  rafraichir();                                        // au montage
  window.addEventListener("progression-maj", rafraichir);
  return () => window.removeEventListener("progression-maj", rafraichir);
}, []); // [] = exécuté une seule fois, à l'arrivée du composant à l'écran
```

Trois temps : à l'arrivée, on lit la progression et on pose l'écouteur (leçon 7) ; la fonction RETOURNÉE est le nettoyage, exécutée au départ du composant (sinon les écouteurs s'empileraient) ; le tableau `[]` dit « ne refais jamais ça ». Pourquoi lire le localStorage ici et pas directement dans le corps ? Le commentaire de ton propre fichier le dit : le premier affichage a lieu côté serveur, où localStorage n'existe pas.

Tu croiseras aussi `useMemo(() => calcul, [deps])` : « garde le résultat en cache, ne recalcule que si une dépendance change » — c'est ton filtrage de fiches et ton mélange de questions.

Tu sais maintenant lire chaque ligne de ce composant. Il n'y a plus de magie.

## À retenir

- Un composant React est une fonction : props en entrée (objet destructuré, jamais modifié), JSX en sortie.
- `useState` donne `[valeur, setValeur]` ; appeler `setValeur` déclenche la ré-exécution du composant — jamais de modification directe.
- `{condition && <bloc/>}` affiche le bloc seulement si la condition est vraie ; `liste.map(...)` transforme des données en éléments.
- `useEffect(() => {...}, [])` exécute du code après l'affichage ; sa fonction retournée nettoie (écouteurs, etc.) au départ du composant.
- Phrase jury : « le state est la mémoire du composant ; chaque mise à jour via le setter redessine l'interface ».

## Mise en pratique

Dans VS Code, ouvre `app/components/QuizFiche.tsx` — on lit, on prédit, on vérifie :

1. Liste les six `useState` (lignes 36-43). Pour chacun, dis à voix haute : que mémorise-t-il, et quelle est sa valeur de départ ?
2. Suis le fil d'un clic : pars de `onClick={() => repondre(i)}`, lis `repondre`, puis trouve dans le JSX le `{choixFait !== null && (` qui fait apparaître le feedback. Raconte la chaîne complète clic → setState → réaffichage → feedback.
3. Prédiction : dans `repondre`, à quoi sert `if (choixFait !== null) return;` ? Vérifie ta réponse en jouant un quiz sur ton site : clique une réponse, puis essaie d'en cliquer une autre. **Résultat attendu :** le deuxième clic ne fait rien — et tu sais exactement quelle ligne l'empêche.
4. Trouve le `question.choix.map((choix, i) => ...)` et explique : combien de boutons produit-il, et d'où vient la lettre A/B/C/D affichée ? (Indice : `String.fromCharCode(65 + i)` — 65 est le code du caractère « A », l'index fait le reste.)
5. Ouvre `app/components/RechercheFiches.tsx`, le `useEffect` des lignes 44-49. Explique les trois temps : montage, écoute, nettoyage. Puis modifie pour VOIR : ajoute `console.log("montage")` dans l'effet et `console.log("nettoyage")` dans la fonction retournée, lance le site (`npm run dev`), navigue vers la page puis quitte-la. **Résultat attendu :** « montage » à l'arrivée, « nettoyage » au départ. Retire les logs ensuite.
6. Pour finir le parcours : choisis N'IMPORTE QUELLE ligne de `QuizFiche.tsx` au hasard et explique-la à voix haute, comme au jury. Si une seule résiste, tu sais dans quelle leçon retourner.
