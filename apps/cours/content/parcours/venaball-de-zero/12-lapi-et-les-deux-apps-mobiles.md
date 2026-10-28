---
titre: "L'API et les deux apps mobiles"
parcours: "venaball-de-zero"
ordre: 12
niveau: "debutant"
duree: 40
date: 2026-10-04
---

## Le cours

Venaball a deux applications pour téléphone :

- **Venaball**, l'app joueuse. Son code est dans le dossier `Pirb store`.
- **Venaball Club**, l'app du staff, des dirigeants, des bénévoles et des parents. Son code est dans `venaball club-store`.

Aucune des deux n'a de base de données à elle. Tout ce qu'elles affichent vient du serveur `mabb-site`. Elles passent par une porte spéciale : l'**API**.

### C'est quoi une API ?

Une **API** (Application Programming Interface), c'est un guichet prévu pour des programmes, pas pour des humains. Le site web renvoie des pages HTML jolies à lire. L'API renvoie des données brutes, que l'app met en forme elle-même.

Image du club : le site web, c'est le panneau d'affichage dans le hall, déjà mis en page. L'API, c'est le guichet du secrétariat. Tu poses une question précise (« les convocations de Léa »), on te tend une fiche remplie, et c'est toi qui la ranges dans ton classeur.

Chaque échange est une **requête** (la question envoyée par l'app) suivie d'une **réponse** (ce que renvoie le serveur). La réponse est écrite en **JSON**, un format texte simple fait de paires « nom : valeur ». Par exemple :

```json
{ "error": "Identifiants invalides." }
```

Chaque réponse porte aussi un **code HTTP**, un nombre qui résume le résultat :

- **200** : tout va bien.
- **401** : « je ne sais pas qui tu es » (pas de jeton, ou jeton mort).
- **403** : « je sais qui tu es, mais tu n'as pas le droit ».
- **404** : « introuvable ».

### Les deux familles de routes

Une **route**, c'est une adresse précise de l'API associée à une action. Venaball en a deux familles :

- `/api/pirb/*` pour l'app joueuse. Le point de départ est toujours « retrouve la fiche joueuse de ce compte ».
- `/api/club/*` pour l'app Club. Le point de départ est « ce compte, dans CE club, avec CE rôle, a-t-il le droit ? ».

Plus `/api/auth/login` et `/api/auth/logout`, communs aux deux, pour se connecter et se déconnecter.

### 1. La connexion : échanger son mot de passe contre un badge

Sur le web, après la connexion, le navigateur garde un **cookie de session** (un petit ticket que le serveur reconnaît). Une app mobile fonctionne autrement : elle reçoit un **jeton**, une longue suite de caractères à présenter à chaque requête. C'est le badge du gymnase : tu le montres à chaque porte.

Le jeton est fabriqué dans `src/Controller/Api/ApiAuthController.php` :

```php
$user = $em->getRepository(User::class)->findOneBy(['email' => $email]);

// Message UNIQUE que le compte existe ou non (anti-énumération d'emails)
if (!$user instanceof User || !$hasher->isPasswordValid($user, $password)) {
    // ...
    return new JsonResponse(['error' => 'Identifiants invalides.'], Response::HTTP_UNAUTHORIZED);
}

// ...
[$token, $clair] = ApiToken::creerPour($user, is_string($appareil) ? $appareil : null);
$em->persist($token);
$em->flush();

return new JsonResponse([
    'token'     => $clair, // montré UNE seule fois, l'app le stocke
    'expiresAt' => $token->getExpiresAt()->format(\DateTimeInterface::ATOM),
```

- `findOneBy(['email' => $email])` : on cherche le compte par son e-mail.
- `isPasswordValid(...)` : on compare le mot de passe tapé à l'empreinte stockée (leçon 11).
- Même message, que le compte existe ou non : sinon un curieux pourrait tester des e-mails pour savoir lesquels sont inscrits. C'est ce que le commentaire appelle « anti-énumération ».
- `HTTP_UNAUTHORIZED` : c'est le code 401.
- `ApiToken::creerPour(...)` : fabrique le jeton. On récupère deux choses : l'objet à ranger en base, et le jeton en clair.
- `persist` puis `flush` : on enregistre en base.
- `'token' => $clair` : le jeton en clair part vers l'app, **une seule fois**.

Plus haut dans la même méthode, une limite compte les échecs récents dans `ConnexionLog` : 10 échecs par adresse IP ou 5 par e-mail en 15 minutes, et le serveur répond 429 (« trop de tentatives »).

### 2. Le jeton est stocké haché

Ouvre `src/Entity/Core/ApiToken.php` :

```php
public static function creerPour(User $user, ?string $appareil = null): array
{
    $clair = bin2hex(random_bytes(32));
    $token = new self();
    $token->user      = $user;
    $token->tokenHash = hash('sha256', $clair);
    $token->appareil  = $appareil !== null ? mb_substr($appareil, 0, 100) : null;
    return [$token, $clair];
}
```

- `random_bytes(32)` : 32 octets tirés au hasard par le système, impossibles à deviner. `bin2hex` les écrit en 64 caractères lisibles.
- `new self()` : on crée une ligne `ApiToken`. Son constructeur fixe l'expiration à 30 jours (`VALIDITE = '+30 days'`).
- `tokenHash = hash('sha256', $clair)` : en base, on range l'**empreinte** du jeton, pas le jeton. Même logique que les mots de passe : si la table fuit, les empreintes ne permettent pas de se connecter.
- `appareil` : un libellé libre comme « PIRB Mobile », coupé à 100 caractères.
- `return [$token, $clair]` : l'objet pour la base, le clair pour l'app.

Ce jeton est dit **opaque** : il ne contient aucune information, c'est juste un numéro. Pour savoir à qui il appartient, il faut demander à la base. Avantage : pour couper l'accès d'un téléphone volé, on supprime une ligne.

### 3. À chaque requête, le serveur vérifie le badge

Dans `config/packages/security.yaml`, le firewall `api` :

```yaml
api:
    pattern: ^/api
    stateless: true
    provider: app_user_provider
    access_token:
        token_handler: App\Security\ApiTokenHandler
```

- `pattern: ^/api` : tout ce qui commence par `/api`.
- `stateless: true` : **sans état**, le serveur ne garde aucune session. Chaque requête doit apporter son badge.
- `access_token` : Symfony lit l'en-tête `Authorization: Bearer <jeton>`. Un **en-tête**, c'est une ligne d'information envoyée avec la requête, à côté du contenu. **Bearer** veut dire « porteur » : celui qui porte ce jeton est accepté.
- `token_handler` : la classe qui dit à qui appartient le jeton.

Et cette classe, `src/Security/ApiTokenHandler.php` :

```php
public function getUserBadgeFrom(string $accessToken): UserBadge
{
    $token = $this->tokens->findValide($accessToken);

    if ($token === null || $token->getUser()?->getEmail() === null) {
        throw new BadCredentialsException('Jeton d\'accès invalide ou expiré.');
    }

    return new UserBadge($token->getUser()->getEmail());
}
```

- `findValide($accessToken)` : cherche en base un jeton dont l'empreinte correspond et qui n'est pas expiré.
- Si rien ne correspond : exception, et Symfony répond 401. Le message ne dit pas si le jeton est inconnu ou expiré, pour ne rien apprendre à un attaquant.
- Sinon, `UserBadge(email)` : « c'est cette personne ». Le reste du code utilise `$this->getUser()` comme sur le web.

### 4. Côté téléphone : le coffre-fort et l'en-tête

Dans l'app joueuse, `Pirb store/src/services/auth/session.ts` range le jeton après la connexion :

```ts
const data = await res.json();
token = data.token;
await Promise.all([
  SecureStore.setItemAsync(CLE_TOKEN, data.token),
  SecureStore.setItemAsync(CLE_EMAIL, email),
]);
notifier({ statut: 'connectee', email });
```

- `res.json()` : on lit la réponse JSON du serveur.
- `token = data.token` : on garde le jeton en mémoire pour les prochains appels.
- `SecureStore.setItemAsync(...)` : **SecureStore** est le coffre-fort chiffré du téléphone (Keychain sur iPhone, Keystore sur Android). Le commentaire du fichier précise : « PAS AsyncStorage », qui est un stockage ordinaire, lisible.
- `Promise.all` : on fait les deux rangements en parallèle et on attend les deux.
- `notifier(...)` : on prévient les écrans que la joueuse est connectée.

Dans l'app Club, un seul fichier parle au serveur : `venaball club-store/src/services/api.ts`. Il pose les en-têtes automatiquement :

```ts
if (!options.sansAuth) {
  const token = getToken();
  if (token) entetes.Authorization = `Bearer ${token}`;
  // Le club de travail : le serveur RE-VÉRIFIE toujours de son côté,
  // mais sans cet en-tête un compte multi-club recevrait une 400.
  const clubId = getClubId();
  if (clubId !== null) entetes['X-Club-Id'] = String(clubId);
}
```

- `Authorization = Bearer ...` : le badge, sur chaque appel.
- `X-Club-Id` : un en-tête maison qui dit « je travaille sur ce club ». Utile pour quelqu'un qui est coach dans un club et parent dans un autre.

Plus bas dans le même fichier, une réponse 401 déclenche `fermerSession()` : jeton expiré, retour propre à l'écran de connexion.

### 5. Le serveur ne fait jamais confiance au club annoncé

L'app peut envoyer n'importe quel `X-Club-Id`. Le serveur vérifie dans `src/Controller/Api/Club/ApiClubController.php`, la classe mère de tous les contrôleurs `/api/club/*` :

```php
$demande = (int) $request->headers->get(self::HEADER_CLUB, '0');

if ($demande > 0) {
    // Club inconnu du compte → 404 et pas 403 : on ne confirme pas
    // l'existence d'un club auquel l'utilisateur n'appartient pas.
    if (!isset($parClub[$demande])) {
        throw new ApiClubException('Club introuvable.', Response::HTTP_NOT_FOUND);
    }
    return $parClub[$demande]['club'];
}
```

- `headers->get(self::HEADER_CLUB, '0')` : on lit l'en-tête `X-Club-Id`, `0` s'il est absent.
- `$parClub` : la liste des clubs où ce compte a un rôle **actif et validé**, calculée juste avant.
- `!isset(...)` : le club demandé n'est pas dans la liste.
- `HTTP_NOT_FOUND` : on répond **404** et pas 403. Répondre « interdit » confirmerait que le club existe. Répondre « introuvable » ne dit rien.

La même règle revient partout dans `/api/club/*` : une rencontre d'un autre club, ou d'une équipe que tu n'encadres pas, renvoie 404 (par exemple `rencontreAutorisee()` dans `ApiClubConvocationController.php`).

### 6. Le serveur décide, l'app affiche

Le premier appel de l'app Club après connexion est `GET /api/club/moi` (`ApiClubMoiController.php`). Le serveur y calcule les **vues** auxquelles le compte a droit : `coach`, `direction`, `benevole`, `parent`, `joueuse`. Le commentaire du fichier le dit : « c'est le serveur qui sait qui a le droit de quoi. L'app ne fait qu'afficher ce qu'on lui dit, elle ne déduit jamais un droit toute seule. » Si quelqu'un trafiquait l'app pour afficher un écran caché, le serveur refuserait quand même chaque requête.

Côté app joueuse, `/api/pirb/*` n'a souvent même pas d'identifiant dans l'adresse. `PirbApiController.php` le note : « Pas de paramètre {id} : impossible de demander les données d'une autre joueuse. » Tout part de la fiche liée au compte (`joueurOu404()`).

### 7. Une seule adresse, écrite à un seul endroit

Les deux apps ont un fichier `src/services/hosts.ts`. L'adresse de l'API vient de la configuration du build (`EXPO_PUBLIC_API_URL`), avec `https://api.venaball.fr` par défaut, et toutes les autres adresses (espace club, mot de passe oublié) en sont déduites. Le commentaire raconte pourquoi : avant, des adresses `mabb.fr` écrites en dur envoyaient des utilisateurs Venaball vers l'instance MABB.

### Ce qui reste fragile

Le document maître (`instruction/00_ECOSYSTEME.md`, ligne 49) liste des points ouverts côté API : une route communautaire de l'app joueuse n'applique pas encore les réglages de confidentialité, et les 14 contrôleurs `/api/club/*` n'ont aucun test automatique. Petite incohérence à connaître : pour une convocation qui n'est pas la sienne, l'API joueuse répond 403 (`PirbApiConvocationController.php`), alors que l'API Club répond 404.

### Ce que tu dis au jury

« Mes deux apps mobiles n'ont pas de base de données : elles consomment une API JSON sur le même serveur Symfony que le site. À la connexion, le serveur délivre un jeton opaque de 64 caractères, montré une seule fois et stocké haché en SHA-256, que l'app range dans le coffre-fort chiffré du téléphone et renvoie dans l'en-tête `Authorization: Bearer`. L'app Club ajoute `X-Club-Id`, mais le serveur revérifie toujours et répond 404 plutôt que 403 sur un club ou une ressource qui n'est pas la tienne. C'est le serveur qui calcule les droits et les vues, l'app ne fait qu'afficher. Je sais aussi que l'API Club n'a pas encore de tests automatiques. »

## À retenir

- Une API renvoie des données (JSON) à un programme ; chaque réponse a un code : 200 ok, 401 pas identifié, 403 pas le droit, 404 introuvable.
- Connexion : `POST /api/auth/login` renvoie un jeton opaque une seule fois ; la base n'en garde que l'empreinte SHA-256 (`ApiToken.php`), valable 30 jours.
- Chaque requête porte `Authorization: Bearer <jeton>`, vérifié par `ApiTokenHandler` ; côté app, le jeton dort dans SecureStore.
- `/api/pirb/*` part de la fiche joueuse du compte ; `/api/club/*` part du club annoncé dans `X-Club-Id`, toujours revérifié.
- 404 plutôt que 403 sur ce qui appartient à un autre club : on ne confirme pas son existence.
- Le serveur décide des droits, l'app affiche ; les adresses sont centralisées dans `hosts.ts`.

## Mise en pratique

Sur tes vrais dossiers, en lecture seulement (environ 50 minutes) :

1. Dans `mabb-site/src/Controller/Api/ApiAuthController.php`, repère les trois réponses possibles de `login()` (400, 429, 401) et le cas qui renvoie 200. Écris pour chacune une phrase « quand est-ce que ça arrive ».
2. Dans `venaball club-store/src/services/api.ts`, trouve la fonction `appeler`. Note les deux en-têtes ajoutés et ce qui se passe quand la réponse vaut 401.
3. Dans `Pirb store/src/services/auth/session.ts`, trouve où le jeton est rangé, relu au démarrage, puis effacé.
4. Dans `mabb-site/src/Controller/Api/Club/ApiClubController.php`, lis `clubCourant()` et dessine sur papier les trois chemins : en-tête fourni, un seul club, plusieurs clubs sans en-tête.
5. Bonus : cherche dans `src/Controller/Api/` les endroits qui renvoient `HTTP_FORBIDDEN` et ceux qui renvoient `404`, et note où la règle « 404 plutôt que 403 » est suivie ou non.

C'est réussi quand tu peux raconter, sans notes, le trajet du jeton depuis le formulaire de connexion de l'app jusqu'à la ligne `ApiTokenHandler` qui reconnaît la joueuse, en citant les quatre fichiers.
