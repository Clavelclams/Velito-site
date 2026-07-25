---
titre: "Accessibilité et bonnes pratiques : un web pour tout le monde"
parcours: "html-css"
ordre: 10
niveau: "solide"
duree: 25
date: 2026-07-25
---

## Le cours

Dernière leçon, et pas la moins importante : l'**accessibilité** (abrégée a11y). L'idée : ta page doit être utilisable par tout le monde — personnes aveugles ou malvoyantes (lecteurs d'écran), personnes qui naviguent au clavier (handicap moteur), daltoniens, personnes sensibles aux animations. Ce n'est pas un bonus : c'est un critère du référentiel CDA, une obligation légale pour beaucoup de sites publics, et un marqueur de sérieux professionnel.

La bonne nouvelle : **tu as déjà fait 80 % du travail dans ce parcours**. L'accessibilité repose d'abord sur le HTML bien écrit :

- **La sémantique (leçon 3)** : `<header>`, `<main>`, `<nav>` permettent aux lecteurs d'écran de naviguer par régions. Un vrai `<button>` est focusable au clavier et activable avec Entrée — un `<div onclick>` ne l'est pas. C'est l'argument massue en faveur de la sémantique.
- **Les labels (leçon 4)** : un champ sans label lié est un champ muet pour un lecteur d'écran.
- **La structure des titres (leçon 3)** : les utilisateurs de lecteurs d'écran naviguent de titre en titre.

Ajoutons les pièces manquantes :

**Le texte alternatif** : toute image porteuse d'information doit avoir un `alt` qui la remplace (`<img src="graphique.png" alt="Progression : 7 fiches sur 10 lues">`). Image purement décorative → `alt=""` (vide mais présent) pour que le lecteur d'écran l'ignore au lieu de lire le nom du fichier.

**Les attributs ARIA** : quand le HTML natif ne suffit pas à exprimer un état ou un rôle, on le déclare. Trois exemples qui sont **déjà dans ton code** :

```html
<input aria-label="Rechercher une fiche par titre ou thème">
<!-- pas de label visible (choix design) → aria-label le remplace vocalement -->

<button aria-pressed="true">Bloc 1</button>
<!-- un filtre enfoncé/relâché : l'état est annoncé au lecteur d'écran -->

<p role="alert">Identifiants incorrects.</p>
<!-- role="alert" : le lecteur d'écran interrompt et annonce l'erreur -->
```

Le premier vient de `RechercheFiches.tsx`, le dernier de `LoginForm.tsx`. Règle d'or ARIA : **d'abord la balise native, ARIA seulement en complément** — un `<button>` natif vaut mieux qu'un `<div role="button">`.

**Le contraste** : un texte gris clair sur fond blanc est illisible pour beaucoup. Le standard WCAG demande un ratio d'au moins **4,5:1** pour le texte courant. L'inspecteur le calcule pour toi (clique sur la pastille de couleur d'un `color` dans le panneau Styles). Ton `cours-text-muted` (#5B5A6E) sur fond clair a été choisi pour passer ce seuil — vérifie-le.

**Le mouvement** : certaines personnes sont incommodées par les animations (troubles vestibulaires). Le système d'exploitation expose leur préférence, et le CSS peut l'écouter : `@media (prefers-reduced-motion: reduce)`. Ton `globals.css` le fait déjà — les animations `arrivee`, `pop` et `secousse` sont coupées pour qui le demande.

**Le clavier** : tout ce qui est cliquable doit être atteignable avec Tab et activable avec Entrée, avec un **focus visible** (l'anneau autour de l'élément actif). Ne supprime jamais l'outline sans le remplacer : `outline-none` seul est une faute, `outline-none focus:border-cours-accent` (comme dans ton `LoginForm.tsx`) est un remplacement.

## À retenir

- L'accessibilité commence par le HTML bien écrit : sémantique, labels liés, hiérarchie de titres — tout ce parcours y contribue.
- Toute image informative a un `alt` descriptif ; une image décorative a `alt=""` (vide, mais présent).
- ARIA complète le HTML natif (`aria-label`, `aria-pressed`, `role="alert"`) mais ne remplace jamais une balise native qui existe.
- Contraste texte/fond ≥ 4,5:1 (l'inspecteur le mesure) et `prefers-reduced-motion` pour couper les animations.
- Tout doit être utilisable au clavier, avec un focus toujours visible — supprimer l'outline sans remplacement est une faute.

## Mise en pratique

Objectif : auditer ton propre site comme un évaluateur accessibilité, au clavier et à l'inspecteur.

1. Le test du clavier : lance ton site de cours, pose ta souris loin, et navigue uniquement avec Tab / Shift+Tab / Entrée depuis la page d'accueil. Peux-tu atteindre chaque lien du header, ouvrir une fiche, revenir ? Vois-tu toujours où tu es (focus visible) ? Note tout endroit où le focus disparaît.
2. Chasse aux ARIA dans ton code : ouvre `/root/work/Velito-site/apps/cours/app/components/RechercheFiches.tsx` et retrouve `aria-label`, `aria-pressed` et `aria-hidden`. Pour chacun, écris en une phrase ce qu'un lecteur d'écran en fait. Fais pareil pour le `role="alert"` de `/root/work/Velito-site/apps/cours/app/login/LoginForm.tsx` (déclenche-le en vrai : mauvais mot de passe sur `/login`).
3. Mesure un contraste : inspecte un texte en `text-cours-text-muted` (par exemple un lien du header), clique la pastille de couleur dans le panneau Styles et lis le ratio de contraste calculé. Passe-t-il 4,5:1 ? Essaie ensuite de l'éclaircir à la volée (#AAAAAA) et regarde le ratio chuter sous le seuil.
4. Teste `prefers-reduced-motion` : dans l'inspecteur, ouvre le menu « Rendering » (Chrome : les trois points → More tools → Rendering) et force `prefers-reduced-motion: reduce`. Recharge et réponds à un quiz de fiche : les animations pop/secousse ont disparu, comme prévu par le bloc dédié de `/root/work/Velito-site/apps/cours/app/globals.css`.
5. Audit final Venaball : sur une page avec formulaire de ton projet Symfony, vérifie trois points — chaque champ a-t-il un label lié ? Les images ont-elles un `alt` ? La page se navigue-t-elle au clavier ? Note les corrections à faire dans les templates Twig ; c'est exactement le genre d'amélioration documentable dans ton dossier professionnel CDA.

**Résultat attendu** : une liste de 3 à 5 constats concrets (points conformes + corrections à faire) sur tes deux projets, et la capacité d'expliquer au jury pourquoi sémantique, labels, contraste, clavier et `prefers-reduced-motion` font partie du métier.
