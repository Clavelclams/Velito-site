---
titre: "Pourquoi un moteur de templates ? Twig, le V de MVC"
parcours: "twig"
ordre: 1
niveau: "debutant"
duree: 15
date: 2026-07-25
---

## Le cours

Dans le parcours Symfony, tu as vu qu'un contrôleur reçoit une requête HTTP et renvoie une réponse. Mais quelle réponse ? Il y a deux grandes familles : du **JSON** (pour une app mobile ou du JavaScript) et du **HTML** (pour un navigateur). Twig sert à fabriquer la deuxième.

Regarde ton propre code. Dans `src/Controller/Api/ApiAuthController.php` de Venaball, la méthode `login()` termine par :

```php
return new JsonResponse([
    'token' => $clair,
    'user'  => ['prenom' => $user->getPrenom(), ...],
]);
```

Ici, pas de Twig : ton app mobile Expo veut des données brutes, elle fabrique elle-même son affichage. Mais tes 88 contrôleurs web, eux, font autre chose :

```php
// Dans un contrôleur web classique de Venaball
return $this->render('un_template.html.twig', [
    'joueur' => $joueur,   // on PASSE des données au template
]);
```

`render()` dit à Symfony : « va chercher ce fichier dans le dossier `templates/`, injecte-lui ces variables, et renvoie le HTML produit ». Le template, lui, ressemble à ça :

```twig
{# Ceci est un commentaire Twig, invisible dans le HTML final #}
<h1>Bonjour {{ joueur.prenom }}</h1>  {# {{ }} affiche une valeur #}
```

Pourquoi ne pas écrire le HTML directement dans le PHP, avec des `echo` ? C'est possible techniquement, et c'est exactement ce qu'il ne faut pas faire. Trois raisons, que le jury adore entendre :

**1. Séparation des responsabilités (le V de MVC).** Le Modèle gère les données (tes entités comme `Joueur`), le Contrôleur orchestre (il décide quoi faire de la requête), la Vue affiche. Twig, c'est la Vue. Si demain tu refais le design de Venaball, tu touches aux templates, pas aux contrôleurs. Chaque fichier a un seul métier.

**2. Un langage fait pour l'affichage.** Twig est volontairement limité : on ne peut pas y faire de requête base de données ni de logique métier. C'est une contrainte saine — si tu es tenté de mettre du calcul complexe dans un template, c'est le signe qu'il doit vivre dans un service PHP.

**3. La sécurité par défaut.** Twig échappe automatiquement les variables affichées (on verra ça en détail leçon 2) : une protection anti-XSS que tu n'as pas avec un simple `echo`.

Le circuit complet à connaître par cœur : le navigateur demande une URL → le routeur Symfony trouve le contrôleur → le contrôleur récupère les données (via Doctrine, des services…) → il appelle `render('chemin.html.twig', [...])` → Twig fusionne le template et les données → le HTML part au navigateur.

Retiens aussi la convention de nommage : `nom.html.twig`. Le `.twig` dit « moteur Twig », le `.html` dit « format produit ». Tous ces fichiers vivent dans le dossier `templates/` à la racine de ton projet — c'est là que Symfony les cherche par défaut.

Enfin, un point de vocabulaire jury : Twig est un **moteur de templates** (template engine). Il « compile » d'ailleurs chaque template en classe PHP mise en cache : au deuxième affichage, c'est quasiment aussi rapide que du PHP natif. Séparation propre ET performance.

## À retenir

- Twig est la **Vue** du MVC : le contrôleur prépare les données, le template les affiche — jamais l'inverse.
- `render('x.html.twig', [...])` renvoie du HTML ; `new JsonResponse([...])` renvoie du JSON (comme dans mon `ApiAuthController`).
- Les templates vivent dans le dossier `templates/` et se nomment `nom.html.twig`.
- Twig est volontairement limité : pas de logique métier ni de SQL dans une vue.
- Twig compile les templates en PHP et les met en cache : la séparation ne coûte presque rien en performance.

## Mise en pratique

Objectif : visualiser le lien contrôleur → template dans TON projet Venaball.

1. Ouvre `src/Controller/Api/ApiAuthController.php` et repère les `return new JsonResponse(...)`. Note qu'aucun template n'est utilisé : c'est l'API mobile.
2. Ouvre maintenant n'importe quel autre contrôleur web de ton projet (hors dossier `Api/`) et trouve un appel à `$this->render(...)`. Note le premier argument : c'est un chemin relatif au dossier `templates/`.
3. Dans ton éditeur, ouvre le fichier correspondant dans `templates/` et vérifie qu'il contient bien du HTML mélangé à des `{{ }}` et des `{% %}`.
4. Trace sur papier le circuit complet pour cette page : URL → route → contrôleur → `render()` → template → HTML.

Résultat attendu : un schéma manuscrit du circuit avec les vrais noms de TA route, de TON contrôleur et de TON template, que tu sais expliquer à voix haute en moins d'une minute.
