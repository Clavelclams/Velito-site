---
titre: "Filtres Twig : |date, |upper, |default… et tes extensions maison"
parcours: "twig"
ordre: 4
niveau: "intermediaire"
duree: 20
date: 2026-07-25
---

## Le cours

Tu sais afficher une variable. Mais afficher une date brute d'objet `DateTime`, un prénom en minuscules ou un champ parfois null, ça donne des pages moches. Les **filtres** servent à transformer une valeur *au moment de l'affichage*, avec la barre verticale `|` (pipe) :

```twig
{{ joueur.prenom|upper }}                    {# CLAVEL : tout en majuscules #}
{{ joueur.nom|capitalize }}                  {# Première lettre en majuscule #}
{{ joueur.dateNaissance|date('d/m/Y') }}     {# 12/03/2008 au lieu d'un objet DateTime #}
{{ joueurs|length }}                         {# nombre d'éléments de la liste #}
{{ joueur.bio|default('Pas encore de bio') }} {# valeur de repli si null/absent #}
```

Lis un filtre comme un tuyau : la valeur de gauche « coule » dans le filtre de droite, qui la transforme. Et on peut **enchaîner** les tuyaux, ils s'appliquent de gauche à droite :

```twig
{{ joueur.bio|default('')|striptags|upper }}
{# 1. si null → chaîne vide  2. retire les balises HTML  3. majuscules #}
```

Quelques autres filtres du quotidien : `|lower`, `|trim` (retire les espaces autour), `|number_format(1, ',', ' ')` (formater un nombre à la française), `|join(', ')` (coller les éléments d'un tableau), `|slice(0, 3)` (garder les 3 premiers). Pas besoin de tous les connaître par cœur : sache qu'ils existent et où chercher (documentation Twig officielle).

Point important pour le jury : le filtre transforme **l'affichage**, pas la donnée. `{{ joueur.prenom|upper }}` ne modifie pas l'entité en base ; c'est cohérent avec le rôle de la Vue — présenter, jamais persister.

**Et quand le filtre n'existe pas ?** C'est là qu'entrent en scène les **extensions Twig maison**. Une extension, c'est une classe PHP qui enregistre tes propres filtres et fonctions auprès de Twig. Ton projet Venaball en a déjà plusieurs dans `src/Twig/` : `SaisonExtension`, `CmsExtension`, `NotificationExtension`…

Prenons `SaisonExtension` conceptuellement. Dans Venaball, la « saison » (2025-2026, 2026-2027…) est partout : titres de pages, sélecteurs, stats. Plutôt que de recalculer ou reformater la saison dans chaque template, une extension expose par exemple une fonction ou un filtre réutilisable. Le squelette ressemble toujours à ça :

```php
class SaisonExtension extends AbstractExtension
{
    public function getFilters(): array
    {
        // Déclare un filtre 'saison' utilisable comme {{ valeur|saison }}
        return [new TwigFilter('saison', [$this, 'formatSaison'])];
    }

    public function formatSaison(...): string { /* la logique, en PHP */ }
}
```

Grâce à l'autoconfiguration de Symfony, la classe est détectée automatiquement : pas de câblage manuel. Résultat : la logique vit **une seule fois** en PHP testable, et les templates l'utilisent d'une syntaxe courte. C'est exactement l'argument à donner au jury : « quand une transformation d'affichage se répète dans plusieurs templates, je la centralise dans une extension Twig, comme mes `SaisonExtension` et `CmsExtension` ».

La règle de partage des rôles se précise donc : filtre natif quand il existe, extension maison quand la transformation est propre à ton métier, service PHP quand ce n'est plus de l'affichage du tout (calculer l'XP → `XpCalculator`, pas un filtre).

## À retenir

- Un filtre transforme une valeur à l'affichage : `{{ valeur|filtre }}` ; il ne modifie jamais la donnée en base.
- Les indispensables : `|date('d/m/Y')`, `|upper`, `|lower`, `|length`, `|default('repli')`.
- Les filtres s'enchaînent de gauche à droite comme des tuyaux : `|default('')|striptags|upper`.
- Une extension Twig maison = une classe PHP dans `src/Twig/` qui déclare mes propres filtres/fonctions (ex. `SaisonExtension` dans Venaball).
- Transformation métier répétée → extension ; calcul métier pur → service PHP.

## Mise en pratique

Objectif : inventorier les filtres réellement utilisés dans Venaball et lire une de tes extensions.

1. Dans ton dossier `templates/` local, recherche globalement `|date(` : ouvre deux résultats et note le format demandé (`'d/m/Y'`, `'H:i'`…).
2. Recherche `|default(` : trouve un exemple et explique à voix haute ce qui s'afficherait si la donnée était null SANS le filtre.
3. Ouvre `src/Twig/SaisonExtension.php` (ou `CmsExtension.php`) dans ton projet local. Repère la méthode `getFilters()` ou `getFunctions()` : liste les noms déclarés, puis recherche un de ces noms dans `templates/` pour voir un usage réel.
4. Dans un mini-template de test, écris `{{ 'venaball'|upper }}`, `{{ 'now'|date('d/m/Y') }}` et `{{ inexistant|default('rien') }}` (sans passer `inexistant` depuis le contrôleur), et affiche la page.

Résultat attendu : une liste écrite de 5 filtres natifs trouvés dans TES templates + le nom d'au moins un filtre/fonction déclaré par TES extensions, avec un exemple d'usage ; ton template de test affiche VENABALL, la date du jour et « rien ».
