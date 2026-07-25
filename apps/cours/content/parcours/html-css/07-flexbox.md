---
titre: "Flexbox : aligner enfin sans souffrir"
parcours: "html-css"
ordre: 7
niveau: "intermediaire"
duree: 25
date: 2026-07-25
---

## Le cours

Tu sais maintenant que tout est boîte. Nouveau problème : **comment ranger des boîtes les unes par rapport aux autres** ? Centrer un logo, aligner un menu, espacer des boutons… Pendant des années c'était un cauchemar. Flexbox l'a résolu.

Le principe : tu poses `display: flex` sur un **conteneur**, et ce sont **ses enfants directs** qui se rangent. Analogie : le conteneur est une étagère, les enfants sont les livres. Toi, tu donnes des consignes à l'étagère (« serre les livres à gauche », « espace-les régulièrement »), pas à chaque livre.

```css
.etagere {
  display: flex;            /* les enfants se placent en ligne */
  justify-content: space-between; /* répartis sur l'axe principal */
  align-items: center;      /* centrés sur l'axe croisé */
  gap: 20px;                /* espace minimal entre eux */
}
```

Deux axes à visualiser, tout Flexbox repose dessus :

- **L'axe principal** : la direction de rangement. Par défaut horizontal (`flex-direction: row`), vertical avec `flex-direction: column`.
- **L'axe croisé** : le perpendiculaire.

Et deux propriétés, une par axe :

- `justify-content` distribue **le long de l'axe principal** : `flex-start` (début), `center`, `space-between` (premier et dernier collés aux bords, le reste réparti), `space-around`…
- `align-items` aligne **sur l'axe croisé** : `stretch` (défaut : tout à la même hauteur), `center`, `flex-start`…

Le piège classique : quand tu passes en `flex-direction: column`, les axes pivotent — `justify-content` devient vertical et `align-items` horizontal. Si « ça centre pas dans le bon sens », c'est presque toujours ça.

Ajoute `gap` (l'espace entre enfants, sans toucher aux bords — bien plus propre que des margins sur chaque enfant) et `flex-wrap: wrap` (autorise le passage à la ligne quand ça déborde), et tu couvres 90 % des besoins.

En Tailwind, traduction directe : `flex` = `display:flex`, `flex-col` = direction colonne, `justify-between`, `items-center`, `gap-4`. Tu écris ces classes tous les jours. La preuve par ton code :

- `/root/work/Velito-site/apps/cours/app/components/EnTete.tsx` : le conteneur du header porte `flex items-center justify-between` — logo + liens poussés à gauche, bouton Déconnexion poussé à droite, tout centré verticalement. C'est LE motif de barre de navigation, tu peux le réécrire en CSS pur maintenant.
- À l'intérieur, le groupe de liens porte `flex items-center gap-5` : une étagère dans l'étagère. Les conteneurs flex s'imbriquent sans problème — chaque conteneur ne commande que ses enfants directs.
- `/root/work/Velito-site/apps/cours/app/login/LoginForm.tsx` : le formulaire porte `flex flex-col gap-4` — les champs empilés verticalement, espacés de 1rem, sans une seule margin.

Le combo à connaître par cœur pour le jury : **centrer parfaitement un élément** dans son parent = `display:flex; justify-content:center; align-items:center` sur le parent. Trois lignes qui ont remplacé quinze ans de bricolages.

## À retenir

- `display: flex` se pose sur le conteneur (l'étagère) et range ses enfants directs (les livres).
- Axe principal = direction de rangement (`row` par défaut, `column` pour empiler) ; l'axe croisé est perpendiculaire.
- `justify-content` distribue sur l'axe principal, `align-items` aligne sur l'axe croisé — en `column`, les rôles pivotent.
- `gap` espace les enfants proprement, `flex-wrap: wrap` autorise le retour à la ligne.
- Tailwind : `flex items-center justify-between gap-4` — le motif exact du header de ton site.

## Mise en pratique

Objectif : disséquer le header flex de ton site, puis le déformer pour sentir chaque propriété.

1. Lance ton site de cours et inspecte le `<div>` intérieur du header (celui avec `flex items-center justify-between`). Dans l'inspecteur, un badge « flex » apparaît à côté de l'élément : clique-le, le navigateur dessine les zones flex par-dessus la page.
2. Dans le panneau Styles de l'inspecteur, trouve `justify-content: space-between` et fais défiler les autres valeurs (l'inspecteur propose souvent une liste : `center`, `flex-start`, `space-around`…). Regarde le bouton Déconnexion se déplacer. Décris à voix haute ce que fait chaque valeur.
3. Passe `flex-direction` à `column` (toujours dans l'inspecteur) : observe le header s'empiler et remarque comment `justify-content` agit maintenant à la verticale. Recharge pour tout annuler.
4. En vrai maintenant : dans `/root/work/Velito-site/apps/cours/app/components/EnTete.tsx`, remplace `justify-between` par `justify-center`, sauvegarde, constate, puis remets. Une classe = une propriété = un effet.
5. Réécris de mémoire dans ton `test.html` une barre de navigation en CSS pur (pas de Tailwind) : un `<header>` avec un `<nav>` contenant 3 liens à gauche et un bouton à droite, en utilisant `display:flex`, `justify-content:space-between`, `align-items:center` et `gap`. Compare visuellement avec le header de ton site.
6. Vérifie ta compréhension sur `LoginForm.tsx` : pourquoi `flex-col` ici ? Qu'est-ce que `gap-4` remplace comme code (pense à la leçon sur les margins) ?

**Résultat attendu** : ta barre de navigation en CSS pur ressemble à celle du site, et tu sais prédire l'effet de `justify-content`, `align-items`, `flex-direction` et `gap` sans recharger.
