---
titre: "HTML sémantique : donner du sens, pas juste des boîtes"
parcours: "html-css"
ordre: 3
niveau: "debutant"
duree: 20
date: 2026-07-25
---

## Le cours

Tu connais maintenant `<div>`, la boîte neutre. Le problème : une page faite uniquement de `<div>`, ça marche visuellement… mais c'est une maison où toutes les pièces s'appellent « pièce ». Impossible de savoir laquelle est la cuisine. Le HTML **sémantique**, c'est nommer les pièces.

HTML propose des balises qui disent *le rôle* d'un bloc, pas seulement son existence :

```html
<header>  <!-- l'en-tête : logo, titre du site, navigation -->
  <nav>…</nav>  <!-- le menu de navigation -->
</header>

<main>    <!-- LE contenu principal — un seul par page -->
  <article>…</article>  <!-- un contenu autonome (une fiche, un billet) -->
  <section>…</section>  <!-- un regroupement thématique avec un titre -->
  <aside>…</aside>      <!-- contenu secondaire (encart, barre latérale) -->
</main>

<footer>…</footer>  <!-- le pied de page : mentions, liens annexes -->
```

Visuellement, `<header>` et `<div>` s'affichent pareil : ce sont deux boîtes. La différence est **pour ceux qui lisent le code sans le voir** :

- **Les lecteurs d'écran** (utilisés par les personnes aveugles ou malvoyantes) permettent de sauter directement au `<main>` ou de lister les `<nav>`. Avec des `<div>`, l'utilisateur doit tout écouter linéairement.
- **Les moteurs de recherche** comprennent mieux ce qui est important sur ta page.
- **Toi dans six mois** (et le jury en avril 2027) : `<footer>` se lit tout seul, `<div class="bas">` demande un effort.

Même logique pour les **titres** `<h1>` à `<h6>` : ce ne sont pas des tailles de police, ce sont des **niveaux de plan**, comme dans un dossier. Un seul `<h1>` (le sujet de la page), des `<h2>` pour les grandes parties, des `<h3>` dedans — sans sauter de niveau. Si un titre te semble « trop gros », on le réduit avec du CSS, on ne triche pas en prenant un `<h4>`.

Deux autres balises portent un sens fort qu'on massacre souvent :

- `<a>` : un **lien**, qui *emmène ailleurs* (autre page, ancre).
- `<button>` : un **bouton**, qui *déclenche une action* sur place (envoyer, filtrer, déplier).

Regarde ton propre code : dans `/root/work/Velito-site/apps/cours/app/components/EnTete.tsx`, la barre du haut est un vrai `<header>`, les liens « Parcours » et « Révision » sont des `<Link>` de Next.js (qui deviennent des `<a>` dans le navigateur — vérifie à l'inspecteur !), et « Déconnexion » est un `<button>` car il déclenche une action, il ne navigue pas. Ce choix-là est exactement le genre de détail qu'un jury CDA aime t'entendre justifier.

Le réflexe à prendre : avant d'écrire `<div>`, demande-toi « est-ce que ce bloc a un rôle nommable ? ». Si oui, utilise la balise qui porte ce nom. `<div>` reste légitime pour les regroupements purement techniques (centrer, faire une grille) — il n'est pas interdit, il est **le choix par défaut quand aucun sens ne s'applique**.

## À retenir

- Le HTML sémantique décrit le rôle d'un bloc (`header`, `nav`, `main`, `article`, `footer`), pas son apparence.
- Ça sert aux lecteurs d'écran, au référencement et à la lisibilité du code — pas au rendu visuel.
- Les `<h1>`–`<h6>` sont des niveaux de plan, jamais des tailles de police ; un seul `<h1>` par page.
- `<a>` navigue vers ailleurs, `<button>` déclenche une action sur place — ne jamais les confondre.
- `<div>` n'est pas interdit : c'est le choix par défaut quand aucune balise porteuse de sens ne convient.

## Mise en pratique

Objectif : auditer la sémantique de tes deux vrais projets, comme le ferait un correcteur.

1. Lance ton site de cours et ouvre l'inspecteur sur la page d'accueil. Dans l'onglet Éléments, replie tout (flèches) pour ne voir que les grands blocs du `<body>` : repère le `<header>` (celui d'`EnTete.tsx`) et cherche s'il y a un `<main>`.
2. Ouvre `/root/work/Velito-site/apps/cours/app/components/EnTete.tsx` dans VS Code et liste sur papier : quelles balises sémantiques sont utilisées ? Pourquoi « Déconnexion » est-il un `<button>` et pas un `<a>` ? Écris la justification en une phrase.
3. Passe à Venaball : ouvre le dossier `templates/` de ton projet Symfony local et choisis un template Twig d'une page complète. Ignore les `{{ … }}` et `{% … %}` de Twig : concentre-toi sur les balises HTML autour. Surligne chaque balise sémantique trouvée, et chaque `<div>` qui aurait pu être un `header`, `nav`, `main`, `section` ou `footer`.
4. Vérifie le plan des titres sur une page de chaque projet : dans la console de l'inspecteur, colle `document.querySelectorAll("h1,h2,h3,h4").forEach(t => console.log(t.tagName, t.textContent))` et regarde si la hiérarchie est logique (un seul H1 ? pas de saut de niveau ?).
5. Si tu as trouvé un `<div>` fautif dans un template Twig de Venaball, remplace-le par la balise sémantique adaptée et vérifie dans le navigateur que rien ne change visuellement — c'est la preuve que la sémantique est pour le sens, pas pour le style.

**Résultat attendu** : une petite liste écrite « balises sémantiques trouvées / divs à requalifier » pour chaque projet, et la phrase de justification `<a>` vs `<button>` prête à ressortir au jury.
