---
titre: "Conditions et boucles : {% if %}, {% for %} et la variable loop"
parcours: "twig"
ordre: 3
niveau: "debutant"
duree: 20
date: 2026-07-25
---

## Le cours

Afficher une variable, c'est bien. Mais une vraie page de Venaball doit s'adapter : afficher la liste des joueuses d'une équipe, montrer un message si la liste est vide, mettre en avant la capitaine… C'est le rôle des balises logiques `{% %}`.

**La condition.** Même logique que le `if` PHP que tu connais, avec une syntaxe allégée :

```twig
{% if joueur.profilPublic %}
    <p>Profil visible par tout le monde</p>
{% elseif joueur.club is not null %}
    <p>Profil réservé au club</p>
{% else %}
    <p>Profil privé</p>
{% endif %}   {# obligatoire : Twig n'a pas d'accolades, il ferme par endmachin #}
```

Remarque `joueur.profilPublic` : Twig trouve tout seul le getter `isProfilPublic()` de ton entité — la magie du point vue en leçon 2 marche aussi avec les booléens. Les opérateurs s'écrivent presque en anglais courant : `and`, `or`, `not`, `==`, `is null`, `is defined`, `is empty`. Un test très utile : `{% if tirs is not empty %}` (vrai si le tableau contient au moins un élément).

**La boucle.** En PHP tu écris `foreach ($joueurs as $joueur)` ; en Twig :

```twig
<ul>
{% for joueur in joueurs %}
    <li>{{ joueur.prenom }} {{ joueur.nom }} — n°{{ joueur.numeroMaillot }}</li>
{% else %}
    {# Ce else ne s'exécute QUE si la liste est vide : spécifique à Twig ! #}
    <li>Aucune joueuse dans cette équipe.</li>
{% endfor %}
</ul>
```

Ce `{% else %}` dans un `for` n'existe pas en PHP : c'est le cas « collection vide », très pratique pour éviter un `if` séparé. Le contrôleur, lui, a juste passé `['joueurs' => $joueurs]` où `$joueurs` vient d'un repository — la vue se débrouille avec, vide ou pas.

**La variable `loop`.** À l'intérieur d'un `for`, Twig t'offre gratuitement un objet `loop` qui décrit où tu en es :

```twig
{% for tir in tirs %}
    {{ loop.index }}     {# position en partant de 1 : 1, 2, 3… #}
    {{ loop.index0 }}    {# position en partant de 0 #}
    {% if loop.first %}<strong>Premier tir !</strong>{% endif %}
    {% if loop.last %}<em>Dernier tir.</em>{% endif %}
    {{ loop.length }}    {# nombre total d'éléments #}
{% endfor %}
```

Usage classique dans un tableau de stats : numéroter les lignes avec `loop.index`, ou zébrer une ligne sur deux avec `{% if loop.index is even %}` (le test `even` = pair, `odd` = impair).

On peut aussi boucler sur un intervalle : `{% for i in 1..5 %}` affiche de 1 à 5 — pratique pour dessiner cinq étoiles de niveau, par exemple.

**Le garde-fou à répéter au jury :** si tu te retrouves à imbriquer trois `if` et deux `for` avec des calculs dedans, c'est un signal d'alarme. La logique **métier** (calculer des moyennes de points, décider si un badge est débloqué — ce que font tes classes `XpCalculator` ou `BadgeChecker` dans `src/Gamification/`) appartient au PHP, dans des services. Le template ne doit contenir que de la logique **d'affichage** : montrer/cacher, répéter, formater. C'est la frontière du V dans MVC, et savoir la tracer est exactement ce qu'un Concepteur Développeur d'Applications doit défendre.

## À retenir

- `{% if %}...{% elseif %}...{% else %}...{% endif %}` : conditions avec `and`, `or`, `not`, `is null`, `is empty`.
- `{% for x in liste %}...{% endfor %}` : le foreach de Twig ; toujours fermer avec `end...`.
- Le `{% else %}` dans un `for` gère le cas « liste vide » — ça n'existe pas en PHP.
- `loop.index`, `loop.first`, `loop.last`, `loop.length` : infos gratuites à l'intérieur de chaque boucle.
- Logique d'affichage dans Twig, logique métier dans les services PHP : la frontière à défendre au jury.

## Mise en pratique

Objectif : retrouver et manipuler boucles et conditions dans tes templates Venaball.

1. Dans ton dossier `templates/` local, fais une recherche globale (Ctrl+Maj+F dans ton éditeur) sur `{% for` : compte combien de templates contiennent au moins une boucle.
2. Ouvre-en un qui liste des entités (joueuses, matchs, clubs…). Identifie : la variable bouclée, d'où elle vient (retrouve le `render()` du contrôleur correspondant), et s'il y a un `{% else %}` de liste vide.
3. S'il n'y en a pas, ajoutes-en un avec un message du type « Aucune donnée pour le moment » et vérifie le rendu.
4. Crée un mini-template de test `test_loop.html.twig` : boucle sur `1..10`, affiche `loop.index`, mets le premier élément en gras avec `loop.first` et le dernier en italique avec `loop.last`. Ajoute une route de test qui le rend.
5. Vérifie dans le navigateur : 10 lignes, la première en gras, la dernière en italique.

Résultat attendu : au moins un template réel amélioré avec un `{% else %}` de boucle, et ton mini-template de test qui affiche 1 à 10 avec premier/dernier stylés.
