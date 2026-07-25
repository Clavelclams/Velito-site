---
titre: "Héritage de templates : extends, block et le layout de base"
parcours: "twig"
ordre: 5
niveau: "intermediaire"
duree: 20
date: 2026-07-25
---

## Le cours

Fais l'expérience mentale : Venaball a des dizaines de pages (accueil, profils, stats, admin…). Chacune a besoin du même squelette HTML : `<!DOCTYPE html>`, `<head>` avec les feuilles de style, la barre de navigation, le pied de page. Si tu copiais ce squelette dans chaque template, le jour où tu ajoutes un lien dans le menu, tu modifierais des dizaines de fichiers — et tu en oublierais un. C'est le problème que résout **l'héritage de templates**.

Le principe : un template parent, le **layout**, définit le squelette avec des « trous » nommés, les **blocks**. Chaque page enfant **étend** ce parent et ne remplit que les trous. Par convention Symfony, le parent s'appelle `base.html.twig`, à la racine de `templates/` :

```twig
{# Le layout parent : le squelette commun à TOUT le site #}
<!DOCTYPE html>
<html lang="fr">
<head>
    <title>{% block title %}Venaball{% endblock %}</title>
    {# Le contenu entre block/endblock est la valeur PAR DÉFAUT #}
</head>
<body>
    <nav>… menu commun …</nav>
    {% block body %}{% endblock %}   {# trou vide : chaque page le remplit #}
    <footer>… pied de page commun …</footer>
</body>
</html>
```

Et une page enfant :

```twig
{% extends 'base.html.twig' %}   {# TOUJOURS la première ligne #}

{% block title %}Profil joueuse — Venaball{% endblock %}

{% block body %}
    <h1>{{ joueur.prenom }} {{ joueur.nom }}</h1>
{% endblock %}
```

Trois règles à graver :

**1. `{% extends %}` doit être la première instruction** du template. Un enfant qui étend ne peut rien écrire *hors* des blocks — logique : tout ce qui n'est pas dans un trou n'a nulle part où aller dans le squelette.

**2. Un block non redéfini garde sa valeur par défaut.** Si ta page ne redéfinit pas `title`, elle affichera « Venaball ». C'est pour ça qu'on met un contenu par défaut raisonnable dans le parent.

**3. `{{ parent() }}` complète au lieu de remplacer.** Dans un block enfant, `{{ parent() }}` injecte le contenu du block parent. Cas d'usage typique : un block `stylesheets` où le parent charge le CSS global et l'enfant *ajoute* un CSS spécifique à la page, sans perdre le reste.

Pourquoi une **seule** `base.html.twig` pour tout un site ? Parce que c'est l'application du principe **DRY** (Don't Repeat Yourself) à l'affichage : le squelette existe en un seul exemplaire, donc une modification du menu = un seul fichier touché, zéro oubli possible, cohérence visuelle garantie sur les 88 pages servies par tes contrôleurs. C'est le pendant « Vue » de ce que tu fais déjà côté PHP quand tu factorises du code dans un service.

L'héritage peut avoir plusieurs étages : un site avec un espace public et un espace admin a souvent `base.html.twig` → un layout admin qui l'étend (menu latéral en plus) → les pages admin qui étendent ce layout intermédiaire. Chaque étage ne redéfinit que ce qui change. Si ton Venaball distingue l'espace club et l'espace joueuse, c'est probablement ce schéma que tu retrouveras dans ton dossier `templates/`.

Dernier vocabulaire jury : on parle d'héritage **de templates**, à ne pas confondre avec l'héritage de classes PHP — l'idée est cousine (un enfant spécialise un parent) mais le mécanisme est propre à Twig.

## À retenir

- `{% extends 'base.html.twig' %}` en première ligne : la page enfant remplit les `{% block %}` du parent.
- Un seul layout de base = principe DRY appliqué à la Vue : un changement de menu → un seul fichier modifié.
- Un block non redéfini affiche le contenu par défaut du parent.
- `{{ parent() }}` permet d'ajouter au block parent au lieu de l'écraser (typique pour les CSS/JS par page).
- L'héritage peut se faire en cascade : base → layout de section (admin, espace joueuse…) → page.

## Mise en pratique

Objectif : cartographier l'arbre d'héritage réel de Venaball.

1. Ouvre `templates/base.html.twig` dans ton projet local. Liste tous les `{% block %}` qu'il définit (title, body, stylesheets, javascripts…) et note lesquels ont un contenu par défaut.
2. Recherche globalement `{% extends` dans `templates/` : combien de templates étendent directement `base.html.twig` ? Y a-t-il des layouts intermédiaires (des templates qui sont à la fois étendus ET qui étendent la base) ?
3. Dessine l'arbre : `base.html.twig` en haut, les layouts intermédiaires en dessous, puis trois exemples de pages feuilles.
4. Choisis une page et modifie son block `title` pour y mettre un titre plus précis ; recharge la page et vérifie l'onglet du navigateur.
5. Recherche `parent()` dans tes templates : si tu en trouves un, explique ce qu'il conserve du parent.

Résultat attendu : un arbre d'héritage dessiné (2 ou 3 niveaux) avec les vrais noms de TES templates, et un titre de page modifié visible dans l'onglet du navigateur.
