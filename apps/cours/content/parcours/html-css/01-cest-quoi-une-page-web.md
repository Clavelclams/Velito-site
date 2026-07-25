---
titre: "C'est quoi une page web, vraiment ?"
parcours: "html-css"
ordre: 1
niveau: "debutant"
duree: 20
date: 2026-07-25
---

## Le cours

Tu as déjà construit des sites entiers. Mais si le jury te demande « que se passe-t-il quand on tape une URL ? », il faut une réponse nette. La voici.

Une page web, c'est **du texte**. Rien de plus. Quand tu ouvres `https://exemple.fr`, ton navigateur (Chrome, Firefox…) joue le rôle d'un client au restaurant : il passe une commande à un **serveur**, une machine allumée quelque part qui attend qu'on lui parle. Cette commande s'appelle une **requête HTTP** :

```
GET / HTTP/1.1          ← « donne-moi la page d'accueil »
Host: exemple.fr        ← « je parle bien à exemple.fr »
```

Le serveur répond avec une **réponse HTTP** : un code (200 = OK, 404 = introuvable) et surtout un contenu, presque toujours du **HTML** :

```html
<!-- Voilà ce que le serveur renvoie : du texte structuré par des balises -->
<h1>Bienvenue</h1>
<p>Ceci est un paragraphe.</p>
```

Le navigateur lit ce texte et **construit la page** : il transforme le HTML en un arbre d'éléments (le fameux DOM, qu'on explorera dans l'inspecteur) puis le dessine à l'écran. En lisant le HTML, il découvre qu'il lui manque des choses — une feuille de style, des images, du JavaScript — et il repasse commande pour chaque fichier. Une seule page visitée = souvent des dizaines de requêtes.

Trois langages se partagent le travail, et la métaphore du corps humain marche très bien :

- **HTML** : le squelette. Il dit *ce qu'il y a* sur la page (un titre, un paragraphe, un bouton).
- **CSS** : la peau et les vêtements. Il dit *à quoi ça ressemble* (couleurs, tailles, placement).
- **JavaScript** : les muscles. Il dit *ce que ça fait* quand on interagit (cliquer, filtrer, animer).

Et tes projets dans tout ça ? Ton site de cours tourne avec Next.js, Venaball avec Symfony et Twig. Ce sont des usines à HTML : Twig assemble des gabarits côté serveur, Next.js génère ou envoie des composants React… mais **au bout du tuyau, le navigateur ne reçoit toujours que du HTML, du CSS et du JS**. C'est pour ça que ces bases valent de l'or : peu importe le framework à la mode, c'est toujours ça qui sort.

Dernier réflexe à ancrer : le navigateur te laisse tout voir. Clic droit → « Inspecter » ouvre les **outils de développement**. L'onglet *Éléments* montre le HTML tel que le navigateur le comprend, l'onglet *Réseau* montre toutes les requêtes échangées. Tu l'utilises déjà pour déboguer du Tailwind — à partir de maintenant, tu vas t'en servir pour *comprendre*.

Retiens la chaîne complète : **URL tapée → requête HTTP du navigateur → réponse du serveur (HTML) → le navigateur construit et affiche la page, puis télécharge CSS, JS et images**. Tout le parcours qui suit détaille chaque maillon de cette chaîne.

## À retenir

- Une page web est du texte : le navigateur envoie une requête HTTP, le serveur répond avec du HTML.
- HTML = structure (squelette), CSS = présentation (habillage), JavaScript = comportement (muscles).
- Un framework (Next.js, Symfony/Twig) ne remplace pas HTML/CSS/JS : il en produit.
- Une page affichée déclenche souvent des dizaines de requêtes : le HTML d'abord, puis CSS, JS, images.
- Les outils de développement du navigateur montrent le HTML reçu et toutes les requêtes échangées.

## Mise en pratique

Objectif : voir de tes yeux la chaîne requête → HTML → page, sur TON site.

1. Lance ton site de cours en local : dans `/root/work/Velito-site/apps/cours/`, démarre le serveur de dev comme d'habitude, puis ouvre la page d'accueil dans ton navigateur.
2. Ouvre les outils de développement (clic droit → Inspecter, ou F12) et va dans l'onglet **Réseau** (Network).
3. Recharge la page (Ctrl+R). Observe la liste : clique sur la **première ligne** (le document lui-même). Dans « Headers », repère la méthode `GET`, le code `200`, et le `Content-Type: text/html`.
4. Onglet « Response » de cette même requête : tu vois le HTML brut envoyé par Next.js. C'est le texte dont on parlait.
5. Compte maintenant les autres lignes de l'onglet Réseau : fichiers CSS, JS, polices… Chacune est une requête supplémentaire déclenchée par le HTML.
6. Bonus : fais pareil sur une page de Venaball. Symfony/Twig est un moteur différent, mais tu verras exactement la même chose sortir.

**Résultat attendu** : tu sais montrer, dans l'onglet Réseau, la requête qui ramène le HTML de ta page, et tu peux expliquer à voix haute pourquoi il y a ensuite d'autres requêtes.
