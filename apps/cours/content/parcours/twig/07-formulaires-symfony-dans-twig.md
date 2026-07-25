---
titre: "Formulaires Symfony dans Twig : form_start, form_row, form_end"
parcours: "twig"
ordre: 7
niveau: "solide"
duree: 25
date: 2026-07-25
---

## Le cours

Dans le parcours Symfony, tu as vu le composant Form côté PHP : une classe FormType décrit les champs, le contrôleur crée le formulaire avec `createForm()`, le valide, puis le passe à la vue. Cette leçon couvre l'autre moitié : l'affichage du formulaire dans Twig.

Côté contrôleur, le passage de témoin se fait ainsi :

```php
$form = $this->createForm(JoueurType::class, $joueur);
$form->handleRequest($request);
// … si soumis et valide : persist, flush, redirect …
return $this->render('mon_template.html.twig', [
    'form' => $form,   // la vue du formulaire part au template
]);
```

Dans le template, trois fonctions suffisent pour un rendu complet :

```twig
{{ form_start(form) }}   {# ouvre <form method="post"> + champs cachés #}
    {{ form_row(form.prenom) }}        {# une "ligne" complète pour le champ prenom #}
    {{ form_row(form.numeroMaillot) }}
    <button type="submit">Enregistrer</button>
{{ form_end(form) }}     {# affiche les champs restants + ferme </form> #}
```

C'est court, presque magique. Le réflexe CDA, c'est justement de savoir **ce que la magie cache** — question de jury garantie.

**Ce que fait `form_start(form)` :** elle génère la balise `<form>` avec la bonne méthode et la bonne action, gère l'attribut `enctype` si un champ fichier existe, et surtout prépare le terrain pour le **jeton CSRF**. Ce jeton — un champ caché `_token` généré par Symfony — protège contre les attaques Cross-Site Request Forgery : un site malveillant qui ferait soumettre ton formulaire à ton insu ne connaîtrait pas ce jeton, et Symfony rejetterait la requête. Tu ne l'as jamais codé : il est rendu automatiquement (via `form_end` avec les champs restants) et vérifié automatiquement par `handleRequest()`. À dire au jury : « mes formulaires Symfony sont protégés CSRF par défaut, le jeton est injecté et vérifié par le framework ».

**Ce que fait `form_row(form.prenom)` :** une « row », c'est en réalité trois morceaux qu'on peut aussi afficher séparément quand on veut un contrôle fin :

```twig
{{ form_label(form.prenom) }}    {# le <label> lié au champ #}
{{ form_widget(form.prenom) }}   {# l'<input> lui-même #}
{{ form_errors(form.prenom) }}   {# les erreurs de validation de CE champ #}
```

`form_row` = label + widget + erreurs + aide, enrobés dans le HTML du **thème de formulaire** actif. Le thème, c'est un ensemble de blocks Twig qui décident du HTML autour de chaque champ ; Symfony en fournit plusieurs (dont un compatible Bootstrap) et on peut définir le sien. Résultat : le même FormType peut changer complètement d'apparence sans toucher au PHP — encore la séparation Modèle/Vue.

**Ce que fait `form_end(form)` :** elle ferme `</form>` mais surtout affiche tous les champs que tu n'as pas rendus explicitement — dont le fameux `_token` CSRF. C'est pour ça qu'on ne l'oublie jamais : sans elle, pas de jeton, et le formulaire serait rejeté à la soumission.

Le lien avec les erreurs de validation boucle la boucle MVC : les contraintes (`#[Assert\NotBlank]`…) vivent sur l'entité ou le FormType côté PHP ; quand la validation échoue, le contrôleur re-`render()` le template avec le même `form`, et `form_row` affiche automatiquement les messages d'erreur au bon endroit. La vue n'invente rien : elle affiche l'état que le composant Form lui donne.

## À retenir

- Trio de base : `form_start(form)` / `form_row(form.champ)` / `form_end(form)` — un formulaire complet en quelques lignes.
- `form_row` = `form_label` + `form_widget` + `form_errors` : on peut éclater le rendu pour un contrôle fin.
- Le jeton **CSRF** est ajouté et vérifié automatiquement ; `form_end` rend les champs restants dont ce jeton.
- Les erreurs de validation (contraintes PHP) s'affichent automatiquement via `form_row` après un re-render.
- Le thème de formulaire change tout le HTML sans toucher au FormType : séparation logique/affichage.

## Mise en pratique

Objectif : disséquer un vrai formulaire de Venaball, du FormType au HTML généré.

1. Dans ton dossier `templates/` local, recherche `form_start(` : ouvre un template qui affiche un formulaire (édition de profil, création d'entité…).
2. Remonte la chaîne : retrouve le contrôleur qui fait le `createForm()` correspondant et la classe FormType dans `src/Form/`. Note les champs déclarés côté PHP et compare avec les `form_row` du template : y a-t-il des champs non rendus explicitement (donc rendus par `form_end`) ?
3. Affiche la page du formulaire dans le navigateur, puis « Afficher le code source » : retrouve le champ caché `_token`. C'est ton jeton CSRF.
4. Soumets le formulaire avec une valeur invalide (champ requis vide, par exemple) : observe où et comment le message d'erreur apparaît, puis retrouve la contrainte correspondante côté PHP.
5. Bonus : remplace un `form_row` par le trio `form_label` / `form_widget` / `form_errors` et vérifie que le rendu reste équivalent.

Résultat attendu : pour UN formulaire réel de ton projet, un schéma FormType → contrôleur → template → HTML, la capture du champ `_token` dans le code source, et une erreur de validation affichée que tu sais expliquer de bout en bout.
