---
titre: "Symfony : requête, routing, contrôleur, réponse"
parcours: "php-symfony"
ordre: 6
niveau: "intermediaire"
duree: 25
date: 2026-07-25
---

## Le cours

Symfony n'est pas magique : c'est une chaîne de traitement très régulière. Chaque page de Venaball, chaque appel de l'app mobile, suit EXACTEMENT le même trajet : **requête HTTP → routing → contrôleur → réponse HTTP**. Maîtriser ce trajet, c'est pouvoir expliquer n'importe lequel de tes 88 contrôleurs au jury.

Analogie : Symfony est le standard téléphonique du club. Un appel arrive (la requête), la standardiste regarde le numéro demandé (le routing), passe l'appel à la bonne personne (le contrôleur), qui formule une réponse (la réponse HTTP). Puis on raccroche : rien n'est gardé en mémoire entre deux appels.

**1. La requête.** Toute requête entrante est convertie en objet `Request` : URL, méthode (GET/POST), en-têtes, corps. Tu n'as jamais à toucher `$_POST` ou `$_GET` : l'objet `Request` encapsule tout proprement.

**2. Le routing.** Symfony cherche quelle méthode de quel contrôleur correspond à l'URL. Dans ton projet, les routes sont déclarées par **attributs PHP** directement sur les méthodes — regarde ton `ApiAuthController` :

```php
#[Route('/api/auth/login', name: 'api_auth_login', methods: ['POST'])]
public function login(Request $request, /* ... */): JsonResponse
```

Décodage : URL `/api/auth/login`, uniquement en POST (un GET sur cette URL → 405), et un nom interne `api_auth_login` qui sert à générer des liens sans écrire l'URL en dur. Le `#[...]` est un *attribut* PHP 8 : une métadonnée accrochée au code — même syntaxe que les `#[ORM\Column]` de tes entités.

**3. Le contrôleur.** C'est un chef d'orchestre, pas un ouvrier : il lit la requête, délègue le vrai travail (aux services, aux repositories), et fabrique la réponse. Ton `login()` illustre le déroulé complet :

```php
$data = json_decode($request->getContent(), true);      // 1. lire le corps JSON
$email = is_array($data) ? trim((string) ($data['email'] ?? '')) : '';

$user = $em->getRepository(User::class)->findOneBy(['email' => $email]); // 2. déléguer la recherche

if (!$user instanceof User || !$hasher->isPasswordValid($user, $password)) {
    return new JsonResponse(['error' => 'Identifiants invalides.'], Response::HTTP_UNAUTHORIZED); // 3. réponse 401
}

[$token, $clair] = ApiToken::creerPour($user, ...);      // 4. déléguer la création du jeton
$em->persist($token);
$em->flush();

return new JsonResponse(['token' => $clair, /* ... */]); // 5. réponse 200 en JSON
```

Remarque le principe : à CHAQUE branche, le contrôleur retourne un objet réponse. Un contrôleur Symfony retourne TOUJOURS une `Response` (ici sa variante `JsonResponse`, qui encode le tableau PHP en JSON et pose le bon `Content-Type`).

**4. La réponse.** Statut + en-têtes + corps. Les statuts que ton projet utilise et que tu dois savoir citer : 200 (OK), 302 (redirection, ex. vers le login), 400 (requête mal formée), 401 (non authentifié), 403 (authentifié mais non autorisé), 404 (introuvable).

**Et le MVC dans tout ça ?** Modèle-Vue-Contrôleur est le découpage en trois responsabilités : le **Modèle** = tes entités et services (les données et les règles métier : `User`, `SaisonService`), la **Vue** = ce qui met en forme (tes templates Twig côté web, ou le JSON côté API), le **Contrôleur** = l'aiguilleur entre les deux. `ApiAuthController` est un cas d'école : modèle = `User`/`ApiToken`, vue = le JSON de sortie, contrôleur = la méthode `login()`. Garder les contrôleurs minces (« thin controllers ») et la logique dans les services : c'est un choix d'architecture que tu revendiqueras en leçon 8.

## À retenir

- Trajet invariable : requête HTTP → routing → contrôleur → réponse. Symfony ne garde rien entre deux requêtes.
- La route est déclarée par attribut : `#[Route('/api/auth/login', name: 'api_auth_login', methods: ['POST'])]` — URL, nom interne, méthodes autorisées.
- Un contrôleur retourne TOUJOURS une `Response` (ou `JsonResponse`) ; il orchestre et délègue, il ne fait pas le travail métier lui-même.
- MVC dans Venaball : Modèle = entités + services, Vue = Twig ou JSON, Contrôleur = l'aiguilleur. Codes HTTP à connaître : 200, 302, 400, 401, 403, 404.

## Mise en pratique

1. Ouvre `src/Controller/Api/ApiAuthController.php`.
2. Sur la méthode `login()`, raconte à voix haute le trajet complet d'une requête de l'app mobile : quelle URL, quelle méthode HTTP, que se passe-t-il si le JSON est vide, si l'email est inconnu, si tout est bon ? Cite le code HTTP de chaque branche (400, 401, 200).
3. Repère la ligne du commentaire « Message UNIQUE que le compte existe ou non (anti-énumération) » : explique pourquoi renvoyer « email inconnu » serait une faille (un attaquant pourrait tester quels emails ont un compte).
4. Ouvre `src/Controller/Api/PirbApiController.php` et lis l'attribut de route de `profil()` : note qu'il n'y a AUCUN paramètre `{id}` dans l'URL — le user vient du token. Formule en une phrase pourquoi c'est une protection contre l'IDOR (tu approfondiras en leçon 9).

Résultat attendu : tu sais dérouler « une requête arrive sur /api/auth/login » de bout en bout, codes HTTP à l'appui, sans regarder le fichier.
