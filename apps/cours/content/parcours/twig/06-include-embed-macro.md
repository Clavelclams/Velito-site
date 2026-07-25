---
titre: "Réutiliser : include, embed, macro — les composants de Twig"
parcours: "twig"
ordre: 6
niveau: "intermediaire"
duree: 20
date: 2026-07-25
---

## Le cours

L'héritage (leçon 5) factorise le squelette *vertical* d'une page. Mais il reste un autre besoin : réutiliser des **morceaux** de page à plusieurs endroits — une carte joueuse affichée sur la page équipe ET sur la page de recherche, un badge, une pagination. Twig offre trois outils, du plus simple au plus puissant.

**1. `include` : coller un fragment.** On isole le morceau dans son propre fichier (convention : préfixé d'un underscore, `_carte_joueur.html.twig`, pour dire « fragment, pas une page complète ») puis on l'inclut :

```twig
{# Dans la page équipe : une carte par joueuse #}
{% for joueur in joueurs %}
    {{ include('_carte_joueur.html.twig', { joueur: joueur }) }}
{% endfor %}
```

Le deuxième argument passe des variables au fragment — exactement comme le contrôleur en passe au template avec `render()`. Bonne pratique : ajouter `with_context = false` (ou utiliser `only`) pour que le fragment ne reçoive QUE ce qu'on lui donne explicitement ; un fragment qui dépend de variables « ambiantes » devient vite fragile et difficile à réutiliser.

**2. `embed` : include + blocks.** Parfois le fragment doit avoir des zones personnalisables selon l'endroit où on l'utilise — une carte dont le pied change selon la page. `embed` combine l'inclusion et l'héritage : on inclut le fragment ET on redéfinit ses blocks :

```twig
{% embed '_carte.html.twig' %}
    {% block pied %}<a href="#">Voir les stats</a>{% endblock %}
{% endembed %}
```

Retiens la formule : `include` = photocopie du fragment, `embed` = photocopie dont on peut remplir les trous. `embed` est plus rare ; sache l'expliquer, utilise-le seulement quand `include` ne suffit plus.

**3. `macro` : la fonction de template.** Une macro, c'est l'équivalent Twig d'une fonction PHP : des paramètres, un rendu. Idéal pour les tout petits motifs répétés vingt fois — un badge coloré, une pastille de statut :

```twig
{# Dans un fichier dédié, ex. _macros.html.twig #}
{% macro pastille(texte, couleur) %}
    <span class="badge badge-{{ couleur }}">{{ texte }}</span>
{% endmacro %}

{# Dans une page : on importe puis on appelle #}
{% import '_macros.html.twig' as ui %}
{{ ui.pastille('Victoire', 'vert') }}
{{ ui.pastille('Défaite', 'rouge') }}
```

Différence clé avec `include` : la macro est appelée comme une fonction (arguments positionnels, réutilisable plusieurs fois après un seul import) alors que `include` charge un fichier à chaque usage. Macro pour les micro-motifs paramétrés, include pour les blocs de page.

C'est ce qu'on appelle avec le sourire « les composants du pauvre » : pas de JavaScript, pas de framework front, juste du découpage discipliné — et pour un site serveur comme Venaball, c'est largement suffisant. « Le riche » existe aussi dans l'écosystème : Symfony UX propose des Twig Components (classes PHP + template = composant déclaré), version structurée de la même idée. Au jury, savoir dire « j'ai découpé mes vues en fragments réutilisables avec include et macro, et je sais que Symfony UX formalise ça en composants » montre que tu situes ta pratique.

La boussole pour choisir : squelette commun → héritage ; bloc de page réutilisé → include ; bloc réutilisé avec zones personnalisables → embed ; micro-motif paramétré → macro.

## À retenir

- `include('_fragment.html.twig', {…})` réutilise un morceau de page ; l'underscore signale un fragment.
- Passer les variables explicitement (`only`/`with_context = false`) rend le fragment autonome et fiable.
- `embed` = include dont on peut redéfinir des blocks ; pour les fragments à zones personnalisables.
- `macro` = fonction de template (paramètres → rendu), importée puis appelée ; pour les petits motifs répétés.
- Boussole : héritage pour le squelette, include pour les blocs, embed pour les blocs à trous, macro pour les micro-motifs.

## Mise en pratique

Objectif : trouver la réutilisation existante dans Venaball et créer ta première macro.

1. Recherche globalement `include` dans ton dossier `templates/` local : liste trois fragments inclus et, pour chacun, note quelles variables lui sont passées.
2. Repère si ton projet suit la convention de l'underscore pour les fragments. Sinon, note deux fichiers que tu renommerais.
3. Cherche un motif dupliqué dans tes templates (un badge, une pastille de statut, un affichage victoire/défaite répété dans plusieurs fichiers).
4. Crée `templates/_macros_test.html.twig` avec une macro `pastille(texte, couleur)` comme dans le cours. Dans un mini-template de test, importe-la avec `{% import %}` et appelle-la trois fois avec des couleurs différentes.
5. Affiche la page de test et vérifie les trois pastilles.

Résultat attendu : une liste écrite de trois `include` réels de ton projet avec leurs variables, et une page de test qui affiche trois pastilles générées par TA macro.
