---
titre: "Hydratation : pourquoi le premier rendu client doit être identique au HTML"
parcours: "react-nextjs"
ordre: 10
niveau: "solide"
duree: 25
date: 2026-09-09
---

## Le cours

Tu as vu dans `CompteARebours` et `ListeLecons` un motif étrange : `useState(null)` puis `useEffect` qui met la vraie valeur. Pourquoi ne pas mettre la vraie valeur directement ? La réponse est l'**hydratation**, et la comprendre t'évite l'erreur `Text content does not match server-rendered HTML` — que tu finiras par croiser.

**Ce qui se passe quand une page arrive.** Un Client Component est rendu **deux fois** :

1. **Sur le serveur**, pour produire le HTML initial. L'utilisateur le voit immédiatement, avant tout JavaScript — c'est ce qui rend Next rapide.
2. **Dans le navigateur**, une fois le JavaScript chargé. React réexécute le composant, obtient un arbre virtuel, et le **compare** au HTML déjà présent pour y **attacher** les événements (`onClick`, etc.). C'est l'hydratation : le HTML mort devient une application vivante.

Cette comparaison exige que les deux rendus produisent **exactement le même arbre**. Si le serveur a rendu `J−230` et que le client rend `J−204`, React ne sait plus quel nœud correspond à quoi. Il abandonne l'hydratation partielle, reconstruit tout, et te crie dessus dans la console. La page marche, mais lentement et avec un flash.

**Les sources classiques de désaccord serveur/client :**

- **La date et l'heure** — le serveur a rendu au build (ou à une autre seconde), le client rend maintenant.
- **`localStorage`, `sessionStorage`, cookies lus côté client** — le serveur n'a pas accès au stockage du navigateur ; il rend « vide », le client rend « la progression ».
- **`window`, `navigator`, la largeur d'écran** — n'existent pas sur le serveur.
- **`Math.random()`** — deux valeurs différentes, évidemment.
- **Du HTML invalide** — un `<p>` dans un `<p>`, un `<div>` dans un `<span>` : le navigateur corrige silencieusement, le serveur non, l'arbre diffère.

**Le motif qui règle tout : « null d'abord, vrai ensuite ».**

```tsx
const [jours, setJours] = useState<number | null>(null);

useEffect(() => {
  setJours(joursAvantJury());     // ne tourne QUE dans le navigateur
}, []);

return <p>{jours === null ? "J−···" : `J−${jours}`}</p>;
```

Premier rendu serveur : `jours === null` → `J−···`. Premier rendu client : même state initial → `J−···`. **Identique.** Hydratation réussie. Puis `useEffect` (client seulement) met la vraie valeur, React re-rend, l'utilisateur voit `J−204`. Le placeholder est visible quelques dizaines de millisecondes — c'est le prix, et il est faible. Dessine-le de la même taille que la vraie valeur pour éviter un saut de mise en page.

`lib/progression.ts` et tous ses consommateurs suivent exactement ce motif : l'état initial est vide, la lecture du `localStorage` se fait dans un effet.

**L'échappatoire à ne pas utiliser par réflexe : `suppressHydrationWarning`.** Un attribut qui dit à React « ignore la différence sur cet élément ». Légitime pour un horodatage dans un `<time>` que tu assumes différent. Dangereux comme réflexe : il cache le symptôme, et les vrais désaccords (HTML invalide, structure différente) restent.

**Une autre échappatoire, légitime celle-là : `dynamic(() => import(...), { ssr: false })`.** Pour un composant qui n'a **aucun sens** sur le serveur — un éditeur de canvas, une carte Leaflet, un graphique qui lit `window` partout — on désactive son rendu serveur. Il n'apparaît que côté client, après hydratation. Le HTML initial contient un trou (ou un `loading`), et c'est acceptable pour ce type de composant. Pas pour un texte de page.

**Le lien avec `"use client"`.** Un Server Component n'est jamais hydraté — il n'a pas de JavaScript client, son HTML est final. Seuls les Client Components subissent la double exécution. Donc **plus tu gardes de composants côté serveur, moins tu as de risques d'hydratation** — un argument de plus pour pousser `"use client"` vers le bas (leçon 5).

## À retenir

- Un Client Component est rendu sur le serveur puis dans le navigateur ; les deux arbres doivent être identiques.
- Date, `localStorage`, `window`, `Math.random`, HTML invalide → désaccord → erreur d'hydratation.
- Motif : `useState(null)` + `useEffect` pour la valeur réelle. Premier rendu identique, puis mise à jour.
- `suppressHydrationWarning` cache, ne répare pas. `dynamic(..., { ssr: false })` pour les composants sans sens serveur.
- Un Server Component n'est pas hydraté : moins de client = moins de risques.

## Mise en pratique

Objectif : provoquer l'erreur d'hydratation, la lire, la corriger avec le bon motif.

1. Crée `apps/cours/app/components/Aleatoire.tsx` en Client Component qui rend `<p>{Math.random()}</p>`. Place-le dans le dashboard. Ouvre la console F12 et recharge : erreur d'hydratation (`Text content did not match…` ou `Hydration failed…`). Lis-la entièrement : elle montre les deux valeurs.
2. Corrige avec le motif : `useState<number | null>(null)`, `useEffect` qui fait `setN(Math.random())`, rendu `n === null ? "…" : n`. Recharge : plus d'erreur. Observe le `…` furtif.
3. Même exercice avec `localStorage` : un composant qui affiche `localStorage.getItem("test") ?? "vide"` directement dans le rendu. Erreur (et même plantage : `localStorage is not defined` côté serveur). Corrige avec le motif.
4. HTML invalide : rends `<p><div>texte</div></p>` dans n'importe quel composant. Erreur d'hydratation d'un autre type : le navigateur a « réparé » le HTML. Corrige en `<div><p>`.
5. Ouvre `ProgressionDashboard.tsx` et `BarreLecture.tsx`. Pour chacun, trouve le `useState` initial et l'`useEffect` qui lit le stockage. Vérifie que le rendu avec l'état initial est plausible (pas un `0 XP` qui saute à `340 XP` brutalement — si oui, propose un placeholder).
6. Supprime `Aleatoire.tsx` et les tests. Bonus : dans `CompteARebours.tsx`, vérifie que le placeholder `J−···` a la même largeur que `J−204` (classe `tabular-nums`, même nombre de caractères). Sinon la page « saute » à l'hydratation.

Résultat attendu : tu reconnais une erreur d'hydratation à sa tête, tu sais ce qui la cause, et tu appliques le motif null-puis-valeur sans réfléchir.
