---
titre: "Twig : fabriquer la page que voit la coach"
parcours: "venaball-de-zero"
ordre: 10
niveau: "debutant"
duree: 35
date: 2026-10-04
---

## Le cours

La coach ouvre la page « Équipes ». En haut, un menu avec le logo du club et le sélecteur de saison. En dessous, le titre « Équipes », une ligne « 4 équipe(s), saison 2026-2027 » avec un petit badge vert « EN COURS », puis un tableau : nom, catégorie, saison, niveau, statut, et des boutons Voir, Modifier, Archiver.

Cette page n'existe nulle part sous forme de fichier tout fait. Elle est **fabriquée** à chaque visite, par un moteur appelé **Twig**, à partir d'un modèle et des données envoyées par le contrôleur (leçon 8). Cette leçon lit ce modèle.

### Template : le gabarit de la feuille de match

Une feuille de match vierge a des cases imprimées : « Équipe A », « N° », « Nom », « Points ». Le jour du match, on remplit les cases. La feuille vierge, c'est le **template** : un fichier HTML avec des trous. Twig remplit les trous avec les données.

Rappel : le **HTML** est le langage qui décrit la structure d'une page web (titres, tableaux, boutons). Le navigateur ne reçoit que du HTML terminé. Il ne voit jamais Twig.

Le contrôleur `EquipeController::index()` termine par :

```php
return $this->render('manager/equipe/index.html.twig', [
    'equipes'             => $equipes,
    'club'                => $club,
    'saison_filtre'       => $saisonFiltre,
    'saison_courante'     => $saisonCourante,
    // ...
]);
```

« Prends le template `templates/manager/equipe/index.html.twig` et donne-lui ces variables. » À gauche le nom de la variable dans Twig, à droite sa valeur en PHP.

### Les trois sortes de balises

Twig n'a que trois signes à connaître :

- `{{ ... }}` : **affiche** quelque chose. `{{ equipe.nom }}` écrit le nom de l'équipe.
- `{% ... %}` : **fait** quelque chose, sans rien afficher : une boucle, une condition, un héritage.
- `{# ... #}` : un **commentaire**, invisible dans la page finale.

### `extends` et `block` : le gabarit commun

Le fichier commence ainsi :

```twig
{% extends 'manager/base.html.twig' %}

{% block title %}Équipes{% endblock %}

{% block body %}
    <div class="page-header">
    ...
{% endblock %}
```

- `{% extends 'manager/base.html.twig' %}` : « cette page **hérite** du gabarit commun ». Toutes les pages du manager partagent le même menu, les mêmes styles, le même pied de page. Plutôt que de les recopier 100 fois, on les écrit une fois dans `base.html.twig`.
- `{% block title %}...{% endblock %}` : un **bloc**, c'est un emplacement réservé dans le gabarit, que la page enfant remplit.

Dans `templates/manager/base.html.twig` (1 217 lignes), on trouve les emplacements :

```twig
<title>{% block title %}{{ marque.nom }}{% endblock %}</title>
...
<main class="container-app">
    {% for type, messages in app.flashes %}
        {% for message in messages %}
            <div class="flash flash-{{ type }}">
                ...
                {{ message }}
            </div>
        {% endfor %}
    {% endfor %}

    {% block body %}{% endblock %}
</main>
```

- `{% block title %}{{ marque.nom }}{% endblock %}` : par défaut, le titre de l'onglet est le nom de la marque (MABB ou Venaball selon le domaine). Notre page remplace ce contenu par « Équipes ».
- La boucle sur `app.flashes` affiche les **messages flash** déposés par le contrôleur (le bandeau vert « Équipe archivée » de la leçon 8). `app` est une variable que Symfony fournit toujours à Twig.
- `{% block body %}{% endblock %}` : le grand trou central, rempli par chaque page.

Image : le gabarit, c'est le gymnase avec ses tribunes et son tableau d'affichage. Chaque page, c'est le match du jour qui s'y joue.

### Afficher et conditionner

```twig
<p class="subtitle">
    {{ equipes|length }} équipe(s)
    {% if saison_filtre == 'all' %}
       , toutes saisons confondues
    {% else %}
       , saison {{ saison_filtre }}
        {% if saison_filtre == saison_courante %}
            <span ...>EN COURS</span>
        {% endif %}
    {% endif %}
</p>
```

- `{{ equipes|length }}` : la barre `|` applique un **filtre**, un petit outil de transformation. `length` compte les éléments de la liste. On obtient « 4 ».
- `{% if ... %} ... {% else %} ... {% endif %}` : une **condition**. Si le filtre vaut `all`, on écrit « toutes saisons confondues ». Sinon, la saison, et le badge EN COURS seulement si c'est la saison courante.
- `==` compare deux valeurs.

### Boucler sur les équipes

```twig
{% for equipe in equipes %}
    <tr class="{{ not equipe.isActive ? 'inactive' : '' }}">
        <td>
            <a href="{{ path('manager_equipe_show', {id: equipe.id}) }}">
                {{ equipe.nom }}
            </a>
        </td>
        <td><span class="badge-categorie">{{ equipe.categorie }}</span></td>
        <td>{{ equipe.saison }}</td>
        ...
    </tr>
{% endfor %}
```

- `{% for equipe in equipes %}` : une **boucle**. Pour chaque équipe de la liste, Twig répète le bloc jusqu'à `{% endfor %}`, et la variable `equipe` désigne l'équipe en cours. Quatre équipes, quatre lignes de tableau.
- `equipe.nom` : Twig cherche tout seul `getNom()` sur l'objet `Equipe` (leçon 6). Pas besoin d'écrire `getNom()`.
- `not equipe.isActive ? 'inactive' : ''` : une condition courte. Si l'équipe est archivée, on ajoute la classe CSS `inactive` (qui la grise), sinon rien.
- Juste avant, le template teste `{% if equipes is empty %}` pour afficher un message « Aucune équipe pour l'instant » au lieu d'un tableau vide.

### `path()` : jamais d'adresse en dur

```twig
<a href="{{ path('manager_equipe_show', {id: equipe.id}) }}">
```

`path()` fabrique l'adresse à partir du **nom de la route** (leçon 8) et de ses paramètres. Ici, `/equipes/12`. Pourquoi ne pas écrire `/equipes/12` directement ? Parce que si l'adresse change un jour, tous les `path()` suivent. Et parce que le même code tourne sur deux domaines (`manager.mabb.fr` et `club.venaball.fr`) : la règle du projet, dans `mabb-site/CLAUDE.md`, est `path()` pour les liens internes, `url()` (adresse complète avec le domaine) pour les liens qui sortent du site, comme dans un e-mail.

### Droits et sécurité dans la page

```twig
{% if is_granted('CLUB_ADMIN', equipe) %}
    <form method="post" action="{{ path('manager_equipe_archive', {id: equipe.id}) }}" ...>
        <input type="hidden" name="_token" value="{{ csrf_token('archive_equipe_' ~ equipe.id) }}">
```

- `is_granted('CLUB_ADMIN', equipe)` : la même question au `ClubVoter` que dans le contrôleur. Le bouton Archiver n'apparaît que pour un dirigeant. Attention : cacher un bouton n'est **pas** une protection. La vraie barrière est le `denyAccessUnlessGranted` du contrôleur. Le template ne fait que du confort.
- `csrf_token(...)` génère le jeton CSRF vérifié côté contrôleur. `~` colle deux textes en Twig (comme le `.` en PHP).

### L'échappement automatique : la protection silencieuse

Imagine qu'un utilisateur malveillant nomme une équipe `<script>...</script>`. Le **script**, c'est du code JavaScript que le navigateur exécute. Si Twig recopiait ce nom tel quel dans la page, le navigateur l'exécuterait chez chaque coach qui ouvre la liste. C'est une **injection de code** (on dit aussi XSS, Cross-Site Scripting).

Twig empêche ça par défaut. Tout ce qui passe par `{{ }}` est **échappé** : les caractères spéciaux comme `<` et `>` sont transformés en équivalents inoffensifs (`&lt;`, `&gt;`). Le navigateur affiche alors le texte `<script>` à l'écran au lieu de l'exécuter. Tu n'as rien à faire : `{{ equipe.nom }}` est déjà protégé.

### Le filtre `|raw` : la porte qu'on ouvre

Le filtre `|raw` dit à Twig : « n'échappe pas, recopie tel quel ». Il existe parce qu'on a parfois besoin d'insérer du vrai HTML, par exemple le texte mis en forme d'un article (gras, titres, liens).

Une recherche de `|raw` dans `templates/` trouve 24 utilisations réparties dans 16 fichiers. Trois familles :

- des données passées à du JavaScript pour des graphiques, souvent sous la forme `|json_encode|raw` (par exemple dans `templates/pirb/stats.html.twig`) ;
- du contenu HTML d'articles et de pages de la vitrine, comme `{{ article.contenu|raw }}` dans `templates/vitrine/accueil/article.html.twig` et `{{ pageContenu.contenu|raw }}` dans plusieurs pages de `templates/vitrine/` (et dans les éditeurs de `templates/admin/`) ;
- deux textes d'aide de formulaire, `form_help(...)|raw`, dans `templates/manager/contenu_seance/`.

Le problème : je n'ai trouvé dans `src/` aucun nettoyage de ce HTML avant affichage (aucune utilisation du composant HtmlSanitizer de Symfony). Ce contenu est saisi par des administrateurs, ce qui limite le risque, mais la règle saine est simple : **tout `|raw` doit afficher un contenu nettoyé**. Ce point est à corriger : nettoyer le HTML à l'enregistrement ou à l'affichage, et revoir les `json_encode|raw` un par un.

### Ce que tu dis au jury

« Les pages du manager sont des templates Twig qui héritent d'un gabarit commun, `manager/base.html.twig`, et remplissent ses blocs `title` et `body`. Le contrôleur passe les données avec `render`, et le template les affiche avec `{{ }}`, les boucles et les conditions avec `{% %}`. Les liens internes passent par `path()`, parce que le même code tourne sur deux domaines. Twig échappe automatiquement tout ce qu'il affiche, ce qui protège contre l'injection de script ; je sais que certains `|raw` du projet désactivent cette protection sans nettoyage préalable, et c'est un correctif que j'ai identifié. »

## À retenir

- Un template Twig est une page HTML avec des trous, remplis par les variables que le contrôleur passe à `render()`.
- `{{ }}` affiche, `{% %}` agit (boucle `for`, condition `if`, `extends`, `block`), `{# #}` commente.
- `extends` + `block` : chaque page hérite de `manager/base.html.twig` et remplit ses emplacements (`title`, `body`).
- `path('nom_de_route', {id: ...})` pour les liens internes ; `is_granted()` cache un bouton mais ne protège rien, le contrôleur protège.
- Twig échappe tout par défaut (protection contre l'injection de script) ; `|raw` désactive cette protection et ne doit afficher que du contenu nettoyé, ce qui n'est pas encore le cas partout dans Venaball.

## Mise en pratique

Lis seul `templates/manager/equipe/index.html.twig` (153 lignes) avec cette leçon fermée.

1. Repère le gabarit parent et les deux blocs remplis.
2. Liste toutes les variables utilisées dans le template, puis vérifie qu'elles sont bien toutes dans le `render()` de `EquipeController::index()`.
3. Trouve la boucle `for` du sélecteur de saison et explique ce qu'elle affiche, et pourquoi elle saute la saison courante.
4. Trouve tous les `is_granted` et dis, pour chacun, quel rôle voit l'élément.
5. Cherche `|raw` dans `templates/` et classe chaque résultat dans une des trois familles de la leçon.

C'est réussi quand chaque variable de ta liste est retrouvée dans le `render()`, que tu sais expliquer pourquoi un coach ne voit pas le bouton Archiver mais serait quand même bloqué s'il forçait l'adresse, et que ton classement des `|raw` est complet.
