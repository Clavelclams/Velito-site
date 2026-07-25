---
titre: "Balises et structure du document"
parcours: "html-css"
ordre: 2
niveau: "debutant"
duree: 20
date: 2026-07-25
---

## Le cours

Hier tu as vu que le serveur envoie du HTML. Aujourd'hui, on apprend à lire et écrire ce HTML nous-mêmes.

Le HTML fonctionne avec des **balises** : des étiquettes entre chevrons qui disent au navigateur « ce qui suit est un titre », « ceci est un paragraphe ». La plupart marchent par paires — une ouvrante, une fermante avec un `/` :

```html
<p>Un paragraphe.</p>        <!-- <p> ouvre, </p> ferme -->
<img src="logo.png" alt="Logo">  <!-- img n'a pas de fermante : elle est "vide" -->
```

Une balise peut porter des **attributs** : des informations en plus, écrites `nom="valeur"` dans la balise ouvrante. Ici `src` (la source de l'image) et `alt` (le texte de remplacement) sont des attributs.

La règle d'or, c'est l'**imbrication** : les balises s'emboîtent comme des boîtes dans des boîtes. Une balise ouverte à l'intérieur d'une autre doit se fermer à l'intérieur aussi. C'est ce qui crée l'arbre que tu vois dans l'inspecteur : chaque élément a un **parent** (la boîte qui le contient) et parfois des **enfants** (les boîtes qu'il contient). Ce vocabulaire parent/enfant reviendra sans arrêt en CSS.

Tout document HTML complet a la même charpente, non négociable :

```html
<!DOCTYPE html>            <!-- « Ceci est du HTML moderne » -->
<html lang="fr">           <!-- la racine : TOUT vit dedans -->
  <head>
    <!-- Le head = les coulisses : rien ne s'affiche ici -->
    <meta charset="UTF-8">           <!-- encodage : accents corrects -->
    <title>Ma page</title>           <!-- texte de l'onglet du navigateur -->
  </head>
  <body>
    <!-- Le body = la scène : tout ce qui est visible -->
    <h1>Bonjour</h1>
  </body>
</html>
```

Analogie théâtre : `<head>` c'est les coulisses (titre de l'onglet, encodage, liens vers les CSS — des réglages invisibles), `<body>` c'est la scène (tout ce que l'utilisateur voit). `<html>` est le bâtiment entier, et `lang="fr"` prévient le navigateur et les lecteurs d'écran que le spectacle est en français.

Tu écris déjà cette charpente sans le savoir. Ouvre `/root/work/Velito-site/apps/cours/app/layout.tsx` : tu y trouves `<html lang="fr">` et `<body className="…">`. Le layout racine de Next.js, c'est exactement ce squelette HTML — le framework se contente d'injecter tes pages à l'intérieur du `<body>`. Et le `<title>` de l'onglet ? C'est l'objet `metadata` du même fichier qui le génère dans le `<head>`.

Dernières balises de survie pour cette semaine : `<h1>` à `<h6>` pour les titres (du plus au moins important), `<p>` pour les paragraphes, `<a href="…">` pour les liens, `<ul>`/`<li>` pour les listes, et `<div>` — la boîte neutre, sans aucun sens particulier, qu'on utilise pour grouper. On verra bientôt pourquoi il ne faut pas mettre des `<div>` partout.

## À retenir

- Une balise étiquette un contenu ; la plupart vont par paires ouvrante/fermante et portent des attributs `nom="valeur"`.
- Les balises s'imbriquent en arbre : chaque élément a un parent, parfois des enfants — c'est le DOM.
- Tout document a la charpente `<!DOCTYPE html>` → `<html>` → `<head>` (invisible, les réglages) + `<body>` (visible, le contenu).
- Le `lang="fr"` sur `<html>` sert aux navigateurs et aux lecteurs d'écran.
- Dans Next.js, cette charpente vit dans le layout racine : le framework génère le squelette, pas de magie.

## Mise en pratique

Objectif : écrire une page HTML complète à la main, puis retrouver la même charpente dans ton vrai projet.

1. Dans VS Code, crée un fichier `test.html` sur ton bureau (hors de tes projets, c'est un brouillon).
2. Écris de mémoire la charpente complète : doctype, `html` avec `lang="fr"`, `head` avec `meta charset` et un `title` « Page de test », `body` avec un `h1`, deux `p` et une liste `ul` de 3 `li`. Sans copier-coller le cours — c'est le but.
3. Ouvre le fichier dans ton navigateur (double-clic suffit : pas de serveur nécessaire, le navigateur sait lire un fichier local). Vérifie le titre de l'onglet et les accents.
4. Casse volontairement l'imbrication : déplace un `</p>` après le `</ul>`, recharge, et regarde dans l'inspecteur comment le navigateur a « réparé » ton arbre à sa façon. Répare.
5. Ouvre maintenant `/root/work/Velito-site/apps/cours/app/layout.tsx` et note les correspondances : où sont `<html>`, `<body>` ? Qui génère le `<head>` ? Compare avec l'onglet Éléments de l'inspecteur sur ton site lancé en local.

**Résultat attendu** : ta page `test.html` s'affiche correctement, et tu sais pointer dans `layout.tsx` chaque morceau de la charpente HTML qu'il produit.
