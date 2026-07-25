---
titre: "Box model et unités : tout est une boîte"
parcours: "html-css"
ordre: 6
niveau: "intermediaire"
duree: 25
date: 2026-07-25
---

## Le cours

Grave ça : **pour le navigateur, chaque élément HTML est une boîte rectangulaire**. Un titre, un lien, une image : des rectangles. Tout le placement en CSS découle de cette idée, et le « box model » décrit les quatre couches de chaque boîte, de l'intérieur vers l'extérieur :

1. **content** : le contenu lui-même (le texte, l'image) ;
2. **padding** : le rembourrage entre le contenu et la bordure ;
3. **border** : la bordure ;
4. **margin** : la marge extérieure, l'espace qui repousse les *autres* boîtes.

Analogie du colis : le contenu c'est l'objet, le padding c'est le papier bulle, la border c'est le carton, la margin c'est la distance avec les autres colis dans le camion. Le papier bulle (padding) agrandit ton colis ; la distance entre colis (margin) n'agrandit rien, elle espace.

```css
.carte {
  padding: 16px;              /* rembourrage intérieur, les 4 côtés */
  border: 1px solid #E5E4F0;  /* épaisseur, style, couleur */
  margin: 24px 0;             /* 2 valeurs : 24px haut/bas, 0 gauche/droite */
  width: 300px;               /* largeur de la boîte */
}
```

Piège historique : par défaut, `width: 300px` désigne le **contenu seul** — padding et border s'ajoutent, et ta « boîte de 300px » fait en réalité 334px. Quasiment tout le monde corrige ça avec `box-sizing: border-box` : la largeur inclut alors padding et bordure. Tailwind l'applique d'office à tous les éléments — c'est pour ça que tu n'as jamais souffert de ce piège sans le savoir.

Parlons **unités** :

- `px` : le pixel, absolu. Simple, mais fixe.
- `rem` : multiple de la taille de police racine (16px par défaut). `1rem` = 16px, `1.5rem` = 24px. Avantage décisif : si l'utilisateur agrandit la taille de texte dans les réglages de son navigateur, tout ce qui est en `rem` suit. C'est l'unité reine pour les tailles de texte et les espacements — Tailwind est entièrement construit dessus.
- `%` : relatif au parent. `width: 50%` = la moitié de la boîte parente.
- `vw` / `vh` : pourcentage de la largeur/hauteur de la fenêtre. `100vh` = tout l'écran en hauteur.

Tu utilises ce système tous les jours en Tailwind sans forcément le voir : `p-4` = `padding: 1rem`, `px-4` = padding horizontal (left + right), `py-3` = padding vertical, `mb-4` = `margin-bottom: 1rem`, `border` = bordure de 1px. L'échelle Tailwind, c'est des multiples de `0.25rem` : `p-1` = 0.25rem, `p-4` = 1rem, `p-8` = 2rem. Regarde le header dans `/root/work/Velito-site/apps/cours/app/components/EnTete.tsx` : le conteneur interne a `px-4 py-3` — du padding, dans les deux axes, en rem.

Dernier outil : dans l'inspecteur, l'onglet qui affiche le **schéma en oignon** (content/padding/border/margin avec les valeurs chiffrées) — souvent en bas du panneau Styles ou dans « Mise en page ». Survole chaque couche : elle se colore sur la page. C'est la radiographie de n'importe quelle boîte.

## À retenir

- Tout élément est une boîte à 4 couches : content, padding (intérieur), border, margin (extérieur, espace les autres).
- Avec `box-sizing: border-box` (défaut de Tailwind), `width` inclut padding et bordure — fini les additions surprises.
- `rem` = multiple de la police racine (16px) : l'unité de référence pour respecter les réglages de l'utilisateur.
- Tailwind traduit tout ça : `p-4` = padding 1rem, `mb-4` = margin-bottom 1rem, échelle par pas de 0.25rem.
- L'inspecteur affiche le schéma du box model avec les valeurs réelles : c'est ta radiographie de débogage.

## Mise en pratique

Objectif : radiographier une boîte de ton site, puis la modifier et prédire le résultat.

1. Lance ton site de cours et inspecte la barre d'en-tête (le `<header>` d'`EnTete.tsx`), puis sélectionne le `<div>` juste à l'intérieur (celui avec `max-w-4xl`). Trouve le schéma du box model dans l'inspecteur et survole chaque couche : padding en vert, margin en orange — vérifie que le padding correspond à `px-4 py-3` (16px et 12px : fais la conversion rem → px de tête).
2. Toujours dans l'inspecteur, panneau Styles : trouve la déclaration `padding` et change-la à la volée en `40px`. Observe la barre gonfler. C'est un brouillon : recharger annule tout.
3. Maintenant en vrai : dans `/root/work/Velito-site/apps/cours/app/components/EnTete.tsx`, remplace `py-3` par `py-8`, sauvegarde, regarde le navigateur (rechargement auto). **Avant** de regarder, prédis à voix haute : « py-8 = 2rem = 32px de padding vertical ». Vérifie au box model, puis remets `py-3`.
4. Question piège à résoudre par l'inspecteur : dans une fiche, l'espace sous un paragraphe vient-il du padding du paragraphe ou de sa margin ? Inspecte un `<p>` d'une fiche et tranche grâce au schéma (indice : revois `.fiche-contenu p` dans `globals.css`).
5. Bonus : dans ton `test.html`, ajoute un `<div>` avec `style="width:200px; padding:20px; border:5px solid black"` puis le même avec `box-sizing:border-box` en plus. Mesure les deux au box model de l'inspecteur : 250px contre 200px. Le piège historique, vu en vrai.

**Résultat attendu** : tu sais lire le schéma content/padding/border/margin de n'importe quel élément, convertir une classe Tailwind d'espacement en rem puis en px, et prédire l'effet d'un changement avant de recharger.
