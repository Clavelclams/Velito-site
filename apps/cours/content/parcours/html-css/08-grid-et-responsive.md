---
titre: "Grid et responsive : des colonnes qui s'adaptent"
parcours: "html-css"
ordre: 8
niveau: "intermediaire"
duree: 30
date: 2026-07-25
---

## Le cours

Flexbox range sur **une ligne** (ou une colonne). Quand tu veux une vraie **grille** — des lignes ET des colonnes, comme un tableau de cartes — l'outil dédié est **CSS Grid**.

Même logique que Flexbox : tout se déclare sur le conteneur, les enfants se placent dans les cases.

```css
.grille {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr; /* 3 colonnes de largeur égale */
  gap: 16px;                          /* gouttières, comme en flex */
}
```

L'unité `fr` (« fraction ») partage l'espace disponible : `1fr 1fr 1fr` = trois parts égales ; `2fr 1fr` = deux tiers / un tiers. Les enfants remplissent la grille case par case, ligne après ligne, automatiquement. Pour l'immense majorité des grilles de cartes, c'est tout ce qu'il faut. Règle pratique : **Flexbox pour une rangée d'éléments, Grid pour un quadrillage**.

Deuxième moitié de la leçon, et pas la moindre : le **responsive**. Ton site est ouvert sur un téléphone de 375px de large comme sur un écran de 1920px. Trois colonnes sur mobile = illisible. La solution : les **media queries**, des règles CSS conditionnelles :

```css
.grille {
  display: grid;
  grid-template-columns: 1fr;      /* mobile : 1 colonne */
  gap: 16px;
}
@media (min-width: 640px) {        /* SI l'écran fait au moins 640px… */
  .grille {
    grid-template-columns: 1fr 1fr; /* …alors 2 colonnes */
  }
}
```

Lis-le comme un « si » : *si la fenêtre fait au moins 640px, applique ces règles en plus*. Note le sens de lecture : on écrit d'abord le style **mobile**, puis on ajoute des exceptions pour les écrans plus grands. C'est l'approche **mobile-first** : le téléphone est le cas de base (le plus contraint), le grand écran est l'enrichissement. L'inverse — designer pour grand écran puis rabotter — finit toujours en rustines.

Tailwind est mobile-first par construction : une classe sans préfixe s'applique partout, une classe préfixée `sm:` ne s'applique qu'à partir de 640px, `md:` 768px, `lg:` 1024px. Donc `grid gap-4 sm:grid-cols-2` signifie : « grille 1 colonne (défaut), et 2 colonnes dès 640px ».

Cette classe exacte existe dans ton code : ouvre `/root/work/Velito-site/apps/cours/app/components/GrilleParcours.tsx` — la liste des parcours est un `<ul className="grid gap-4 sm:grid-cols-2">`. Et dans `/root/work/Velito-site/apps/cours/app/page.tsx`, le bloc de statistiques utilise `grid gap-4 sm:grid-cols-3`. Chaque fois que tu écris `sm:quelquechose`, Tailwind génère pour toi la media query `@media (min-width: 640px)` correspondante. Tu fais du responsive mobile-first depuis le début — maintenant tu sais nommer ce que tu fais.

Dernier outil : le **mode responsive** de l'inspecteur (icône téléphone/tablette, ou Ctrl+Shift+M). Il simule n'importe quelle largeur d'écran et affiche la largeur en pixels pendant que tu redimensionnes — indispensable pour voir tes media queries basculer en direct.

## À retenir

- Grid crée des grilles à deux dimensions : `display:grid` + `grid-template-columns` sur le conteneur ; `1fr` = une part de l'espace.
- Flexbox pour une rangée, Grid pour un quadrillage : deux outils complémentaires, pas concurrents.
- Une media query est un « si » sur la taille d'écran : `@media (min-width: 640px) { … }`.
- Mobile-first : on style d'abord le petit écran, puis on ajoute des exceptions pour les grands.
- En Tailwind, `sm:` / `md:` / `lg:` génèrent les media queries : `grid sm:grid-cols-2` = 1 colonne mobile, 2 dès 640px.

## Mise en pratique

Objectif : voir tes propres grilles basculer, puis en ajouter un cran responsive.

1. Lance ton site de cours, va sur la page d'accueil, et active le mode responsive de l'inspecteur (Ctrl+Shift+M). Fais glisser la largeur de 375px à 1200px lentement : repère le moment exact où les statistiques de `page.tsx` passent de 1 à 3 colonnes. Note la largeur affichée — elle doit être 640px, le seuil `sm:` de Tailwind.
2. Inspecte le `<ul>` de la grille des parcours (`GrilleParcours.tsx`). Clique sur le badge « grid » à côté de l'élément dans l'inspecteur : le navigateur dessine les lignes de la grille. Regarde le panneau Styles : tu dois voir la vraie media query générée par Tailwind autour de `grid-template-columns`.
3. Dans `/root/work/Velito-site/apps/cours/app/components/GrilleParcours.tsx`, ajoute un cran : transforme `grid gap-4 sm:grid-cols-2` en `grid gap-4 sm:grid-cols-2 lg:grid-cols-3`. Sauvegarde et vérifie en mode responsive : 1 colonne, puis 2 à 640px, puis 3 à 1024px. Remets ensuite la version d'origine (2 colonnes suffisent tant qu'il y a peu de parcours).
4. Dans ton `test.html`, construis en CSS pur (balise `<style>` dans le `<head>`) une grille de 6 `<div>` « cartes » : 1 colonne par défaut, 2 colonnes à partir de 640px, 3 à partir de 1024px. C'est l'équivalent exact de la classe Tailwind du point 3 — écris-le à la main une fois dans ta vie.
5. Bonus Venaball : ouvre une page de ton projet Symfony en mode responsive à 375px. Est-ce que tout reste lisible ? Note un endroit à améliorer et la media query (ou la classe Tailwind) qui le corrigerait.

**Résultat attendu** : tu sais dire à quelle largeur tes grilles basculent et pourquoi, et ton `test.html` reproduit en CSS pur le comportement de `sm:grid-cols-2 lg:grid-cols-3`.
