---
titre: "Tailwind : du CSS que tu connais déjà"
parcours: "html-css"
ordre: 9
niveau: "solide"
duree: 25
date: 2026-07-25
---

## Le cours

Tu utilises Tailwind depuis le premier jour. Cette leçon remet le décor à l'endroit : **Tailwind n'est pas un autre langage, c'est du CSS pré-découpé**. Chaque classe utilitaire correspond à une ou deux déclarations CSS que tu sais maintenant lire :

```html
<button class="rounded-md bg-cours-accent px-4 py-2 text-white hover:bg-cours-accent-hover">
<!-- rounded-md  → border-radius: 0.375rem
     px-4 py-2   → padding: 0 1rem / 0.5rem 0  (leçon 6)
     hover:…     → une règle :hover            (leçon 5) -->
```

La question légitime : « mais alors c'est du style inline, le truc interdit ? » Non, et la nuance vaut d'être défendue au jury. Le style inline (`style="padding: 13px"`) a trois défauts : n'importe quelle valeur est possible (13px ici, 14px là — l'incohérence garantie), pas de `:hover` ni de media queries possibles, et une spécificité écrasante qui casse la cascade. Tailwind, c'est **du CSS inline discipliné** : tu composes localement, sur la balise, mais uniquement à partir d'un **menu fermé de valeurs** (`p-3`, `p-4` — jamais 13px), avec `hover:` et `sm:` disponibles, et une spécificité normale de classe. La liberté de l'inline, les garde-fous d'un design system.

Ce menu fermé est configurable, et tu l'as fait : ouvre `/root/work/Velito-site/apps/cours/tailwind.config.ts`. Le bloc `theme.extend.colors.cours` déclare tes **design tokens** : `cours-bg`, `cours-accent` (#4F46E5), `cours-bloc1` à `bloc3`… Déclarer `accent: "#4F46E5"` fait exister d'un coup `bg-cours-accent`, `text-cours-accent`, `border-cours-accent`, `hover:bg-cours-accent`… Une couleur définie une fois, utilisable partout, modifiable en un point : c'est ça, un token. Le jour où tu changes la charte, tu touches un fichier.

Comment ça marche sous le capot ? À la compilation, Tailwind **scanne tes fichiers** (la clé `content` du config : `./app/**/*.{ts,tsx}`) et ne génère que le CSS des classes réellement utilisées. Résultat : un fichier CSS minuscule, quel que soit le nombre d'utilitaires théoriquement disponibles. C'est aussi pour ça qu'une classe construite dynamiquement (`"bg-" + couleur`) ne marche pas : Tailwind ne peut générer que ce qu'il lit en toutes lettres.

Et quand les utilitaires ne suffisent pas ? Ton projet montre les deux échappatoires propres, dans `/root/work/Velito-site/apps/cours/app/globals.css` :

- `@apply` : regrouper des utilitaires dans une vraie règle CSS. Les règles `.fiche-contenu h2 { @apply mb-3 mt-8 … }` stylent du HTML généré par Markdown, où tu ne peux pas poser de classes sur chaque balise. Cas d'usage parfait.
- Du **CSS pur** quand c'est le bon outil : les `@keyframes` d'animation (`arrivee`, `pop`, `secousse`) et le bloc `prefers-reduced-motion` sont écrits à la main, dans des `@layer` qui indiquent à Tailwind où les ranger dans la cascade.

La leçon de fond : Tailwind ne t'a jamais dispensé du CSS — il t'a fait écrire du CSS avec un vocabulaire raccourci. Padding, cascade, flex, grid, media queries : tout ce que tu as appris depuis la leçon 5, c'est ce que ces classes produisent. Tu peux maintenant lire les deux couches.

## À retenir

- Chaque classe Tailwind est une ou deux déclarations CSS : `px-4` = padding horizontal 1rem, `hover:` = pseudo-classe, `sm:` = media query.
- Tailwind ≠ style inline : menu fermé de valeurs (cohérence), `hover:`/`sm:` disponibles, spécificité normale — de l'inline discipliné.
- Les tokens du config (`cours-accent`…) définissent une valeur en un point et génèrent toutes les classes associées.
- Tailwind scanne le code (clé `content`) et ne génère que les classes écrites en toutes lettres — jamais de classes construites dynamiquement.
- `@apply` et le CSS pur dans `globals.css` restent les bons outils pour le HTML non contrôlé (Markdown) et les animations.

## Mise en pratique

Objectif : toucher le design system par son point central, et traduire du Tailwind en CSS à la demande.

1. Ouvre `/root/work/Velito-site/apps/cours/tailwind.config.ts` et lis le bloc `colors.cours` en entier. Pour chaque token, cite de mémoire un endroit du site où tu penses le voir (l'accent indigo ? les badges de blocs CDA ?).
2. Lance le site et vérifie avec l'inspecteur : inspecte le bouton « Se connecter » de `/login`, trouve la classe `bg-cours-accent` dans le panneau Styles, et déplie-la : le navigateur montre le CSS généré avec `#4F46E5` (la valeur du config, en couleur calculée).
3. Le test du token : dans `tailwind.config.ts`, change `accent: "#4F46E5"` en `accent: "#0E7490"` (le cyan de bloc1). Sauvegarde, recharge : liens survolés, bouton de connexion, bordures de focus… tout a suivi, sans toucher un seul composant. C'est LA démonstration « un token = un point de modification ». Remets `#4F46E5`.
4. Entraînement de traduction (à l'écrit, comme au jury) : prends le `<button>` de `/root/work/Velito-site/apps/cours/app/login/LoginForm.tsx` et traduis ses classes une par une en déclarations CSS (`rounded-md` → ?, `px-4 py-2` → ?, `disabled:opacity-50` → quelle pseudo-classe ?). Vérifie chaque réponse en dépliant les classes dans l'inspecteur.
5. Explique l'exception : dans `globals.css`, pourquoi les styles `.fiche-contenu` utilisent `@apply` au lieu de classes dans le JSX ? (Indice : qui génère le HTML des fiches ? Peux-tu poser une classe sur un `h2` produit par Markdown ?) Écris la réponse en deux phrases.

**Résultat attendu** : tu as vu une couleur changer partout depuis un seul fichier, et tu sais traduire n'importe quelle classe Tailwind de ton code en CSS — et justifier pourquoi ce n'est pas du style inline.
