---
titre: "Sélecteurs CSS, cascade et spécificité"
parcours: "html-css"
ordre: 5
niveau: "intermediaire"
duree: 25
date: 2026-07-25
---

## Le cours

On attaque le CSS. Une règle CSS a deux parties : un **sélecteur** (qui vise des éléments) et des **déclarations** (ce qu'on leur applique) :

```css
p {                  /* sélecteur : tous les <p> de la page */
  color: red;        /* déclaration : propriété + valeur */
}
```

Les sélecteurs essentiels, du plus large au plus précis :

```css
p        { }   /* par balise : tous les paragraphes */
.note    { }   /* par classe : tout élément avec class="note" */
#menu    { }   /* par id : L'élément avec id="menu" (unique) */
article p { }  /* descendant : les <p> À L'INTÉRIEUR d'un <article> */
a:hover  { }   /* pseudo-classe : un lien survolé par la souris */
```

Maintenant la vraie question : que se passe-t-il quand **plusieurs règles visent le même élément** avec des valeurs contradictoires ? C'est le « C » de CSS : la **cascade**. Le navigateur départage en deux temps.

**1. La spécificité** : la règle la plus précise gagne. Pense à des panneaux dans un lycée : « interdit de courir » (règle générale) perd contre « salle 12 : autorisé pendant le sport » (règle ciblée). En chiffres, compte trois colonnes (id, classes, balises) : `#menu` (1-0-0) bat `.note` (0-1-0) qui bat `p` (0-0-1). Un sélecteur composé additionne : `article p` = (0-0-2), `.fiche a:hover` = (0-2-1) — les pseudo-classes comptent comme des classes.

**2. L'ordre** : à spécificité égale, la **dernière règle lue** gagne. C'est pour ça que l'ordre de tes fichiers CSS et de tes lignes compte.

Deux tricheurs à connaître : le style **inline** (`style="…"` posé directement sur la balise) écrase presque tout, et `!important` écrase tout le reste. Les deux sont des aveux d'échec en CSS écrit à la main : si tu en as besoin, c'est que ta spécificité est mal construite. (Tailwind génère parfois des utilitaires avec `!` — c'est un usage contrôlé, on en reparle leçon 9.)

Où est le CSS « à toi » dans ton site de cours ? Ouvre `/root/work/Velito-site/apps/cours/app/globals.css` : les règles `.fiche-contenu h2`, `.fiche-contenu p`, etc. Ce sont des **sélecteurs descendants** : « les `h2` à l'intérieur d'un élément portant la classe `fiche-contenu` ». C'est comme ça que tes fiches Markdown sont stylées sans mettre une classe sur chaque titre. Regarde aussi `.fiche-contenu pre code` (0-1-2) qui bat `.fiche-contenu code` (0-1-1) : c'est ce qui enlève le fond gris des `code` quand ils sont dans un bloc `pre`. Ta propre feuille de style est une démonstration de spécificité.

Ton meilleur ami pour tout ça reste l'inspecteur : sélectionne un élément, et le panneau **Styles** liste toutes les règles qui le visent, de la gagnante à la perdante — les valeurs **barrées** sont celles qui ont perdu la cascade. Savoir lire ce panneau, c'est savoir déboguer n'importe quel CSS.

## À retenir

- Une règle CSS = un sélecteur (qui ?) + des déclarations (quoi ?) ; sélecteurs clés : balise, `.classe`, `#id`, descendant, `:hover`.
- La cascade départage les conflits : d'abord la spécificité (id > classe > balise), puis l'ordre (la dernière gagne).
- La spécificité se compte en trois colonnes (id, classes, balises) : `#menu` bat `.note` qui bat `p`.
- `style=""` inline et `!important` court-circuitent la cascade : à éviter, sauf usage outillé et volontaire.
- Dans l'inspecteur, le panneau Styles montre toutes les règles en compétition ; les valeurs barrées ont perdu.

## Mise en pratique

Objectif : lire la cascade en direct sur tes propres fiches, puis la manipuler.

1. Lance ton site de cours, ouvre une fiche (n'importe quelle page sous `/fiches/`), et inspecte un **titre `h2`** du contenu. Dans le panneau Styles, retrouve la règle `.fiche-contenu h2` venue de `globals.css`, au milieu des utilitaires Tailwind.
2. Inspecte ensuite un bout de `code` en ligne dans une fiche, puis un `code` **dans un bloc de code**. Compare leurs panneaux Styles : pour le second, la règle `.fiche-contenu pre code` gagne et tu dois voir `.fiche-contenu code` partiellement barrée. Explique pourquoi avec le calcul de spécificité (écris les deux scores).
3. Dans l'inspecteur toujours, sur le `h2` : ajoute à la main une nouvelle règle dans le panneau Styles (bouton `+`) avec le sélecteur `h2` et `color: red;`. Elle perd contre quoi ? Change le sélecteur en `.fiche-contenu h2` : que se passe-t-il, et pourquoi ? (Indice : à égalité de spécificité, laquelle est lue en dernier ?)
4. Ouvre `/root/work/Velito-site/apps/cours/app/globals.css` dans VS Code et lis les règles `.fiche-contenu` une par une en les traduisant à voix haute : « les listes à l'intérieur d'une fiche ont… ». C'est un excellent entraînement jury.
5. Bonus Venaball : inspecte un élément d'une page de ton projet Symfony et repère une valeur barrée dans le panneau Styles. Trouve quelle règle l'a battue, et pourquoi (spécificité ou ordre ?).

**Résultat attendu** : tu sais dire, pour n'importe quel élément inspecté, quelle règle a gagné, laquelle a perdu, et pourquoi — spécificité ou ordre — chiffres à l'appui.
