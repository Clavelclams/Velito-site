---
titre: "Sécurité et bonnes pratiques : |raw, path(), asset() et les questions du jury"
parcours: "twig"
ordre: 8
niveau: "solide"
duree: 25
date: 2026-07-25
---

## Le cours

Dernière leçon : on consolide les réflexes sécurité et les bonnes pratiques qui feront la différence à l'oral d'avril 2027.

**Le filtre `|raw`, ou comment désactiver l'airbag.** Depuis la leçon 2, tu sais que Twig échappe tout par défaut. `|raw` dit à Twig : « n'échappe pas, envoie le HTML brut au navigateur » :

```twig
{{ article.contenu|raw }}   {# le HTML de contenu sera INTERPRÉTÉ, pas affiché #}
```

Quand est-ce légitime ? Uniquement pour du HTML **de confiance** : du contenu que TOI ou ton système avez produit — typiquement le HTML généré par un éditeur de contenu côté admin (le genre de besoin qu'adresse un module CMS comme celui derrière ta `CmsExtension`). Quand est-ce dangereux ? Dès que la valeur peut contenir, même indirectement, une saisie utilisateur. `{{ joueur.bio|raw }}` serait une faille XSS immédiate : n'importe quelle joueuse pourrait injecter un `<script>` exécuté chez les autres. La règle d'or à énoncer au jury : « `|raw` seulement sur du contenu maîtrisé par l'application, jamais sur une donnée utilisateur ; en cas de doute, on n'échappe pas à l'échappement ». Si tu dois vraiment afficher du HTML riche saisi par un utilisateur, la réponse pro est un **assainisseur** (le composant HtmlSanitizer de Symfony) qui filtre les balises autorisées AVANT le `|raw`.

**`path()` et `url()` : plus jamais d'URL en dur.** Tu as vu les routes côté contrôleur (`#[Route('/api/pirb/profil', name: 'api_pirb_profil')]` dans ton `PirbApiController` : un chemin ET un nom). Dans Twig, on génère les liens à partir du **nom** de route :

```twig
<a href="{{ path('nom_de_la_route') }}">Voir</a>
<a href="{{ path('nom_de_la_route', { id: joueur.id }) }}">Sa fiche</a>
{{ url('nom_de_la_route') }}   {# pareil mais URL absolue https://… (emails !) #}
```

Pourquoi ? Si demain tu changes le chemin `/joueur/{id}` en `/joueuse/{id}`, tous les liens générés par `path()` suivent automatiquement : zéro lien cassé. Une URL écrite en dur, elle, casse silencieusement. `url()` (absolue) sert surtout dans les emails et les flux, où « même domaine » n'existe pas — le même problème que tu as résolu dans `PirbApiController` en construisant l'URL absolue des photos pour l'app mobile.

**`asset()` : les fichiers statiques.** Pour les images, CSS et JS du dossier `public/` :

```twig
<img src="{{ asset('images/logo.png') }}" alt="Venaball">
```

`asset()` génère le bon chemin quel que soit le déploiement (sous-dossier, CDN…) et s'intègre au versionnage des assets (cache busting). Règle simple : lien interne → `path()`, fichier statique → `asset()`, jamais de chemin en dur.

**Les questions jury type, et les réponses en une phrase :**

- *« Comment Twig vous protège-t-il du XSS ? »* → Échappement automatique de toutes les variables affichées : les caractères HTML deviennent des entités, un script injecté s'affiche comme texte au lieu de s'exécuter.
- *« C'est quoi le danger de `|raw` ? »* → Il désactive cet échappement ; sur une donnée utilisateur c'est une faille XSS directe.
- *« Pourquoi `path()` plutôt qu'une URL en dur ? »* → Découplage : les liens se régénèrent depuis le nom de route, un changement d'URL ne casse rien.
- *« De la logique métier dans un template ? »* → Non : la vue affiche, les services calculent ; au pire un filtre ou une extension pour du formatage.

Tu as maintenant le tour complet : rendu, variables, logique d'affichage, filtres, héritage, composants, formulaires, sécurité. Tout est illustrable avec Venaball — et c'est ça, défendre son code.

## À retenir

- `|raw` désactive l'échappement : réservé au HTML de confiance, JAMAIS sur une saisie utilisateur (sinon XSS).
- HTML riche saisi par un utilisateur → assainisseur (HtmlSanitizer) avant affichage, pas un `|raw` aveugle.
- `path('nom_route', {params})` pour tous les liens internes ; `url()` pour les URL absolues (emails).
- `asset('...')` pour les fichiers de `public/` : chemins corrects partout + versionnage.
- Réponse jury XSS : « Twig échappe automatiquement toutes les variables, un script injecté devient du texte inoffensif ».

## Mise en pratique

Objectif : auditer la sécurité Twig de Venaball comme le ferait un jury.

1. Recherche globalement `|raw` dans ton dossier `templates/` local. Pour CHAQUE occurrence, réponds par écrit : d'où vient la donnée ? Peut-elle contenir une saisie utilisateur ? Verdict : légitime ou à corriger.
2. Recherche `href="/` (guillemet + slash) dans `templates/` : chaque résultat est un lien potentiellement en dur. Choisis-en un, retrouve le nom de la route cible dans le contrôleur concerné, et remplace-le par `path('...')`. Vérifie que le lien fonctionne toujours.
3. Recherche `asset(` : vérifie qu'au moins tes CSS/JS du layout de base passent par `asset()`. Si un `<img>` pointe en dur vers `public/`, corrige-le.
4. Entraînement oral : réponds à voix haute, sans notes, aux quatre questions jury du cours. Chronomètre-toi : une phrase par question.
5. Consigne les résultats de l'audit (nombre de `|raw`, liens corrigés) dans tes notes de dossier professionnel : c'est une preuve de démarche sécurité à présenter.

Résultat attendu : un mini-rapport d'audit écrit (occurrences de `|raw` justifiées ou corrigées, au moins un lien migré vers `path()`), et les quatre réponses jury formulées d'une traite.
