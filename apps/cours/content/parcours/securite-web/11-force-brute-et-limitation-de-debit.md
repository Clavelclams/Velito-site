---
titre: "Force brute et limitation de débit : le videur qui compte les essais"
parcours: "securite-web"
ordre: 11
niveau: "intermediaire"
duree: 30
date: 2026-10-04
---

## Le cours

Ton formulaire de connexion vérifie le mot de passe, hache avec l'algorithme `auto`, protège contre le CSRF. Tout ça est juste. Mais il reste une question simple : que se passe-t-il si quelqu'un essaie 10 000 mots de passe à la suite ? Cette leçon répond, en partant de ce que `mabb-site` fait déjà, et de ce qu'il ne fait pas encore.

### Deux attaques, un même point d'entrée

La **force brute**, c'est essayer des mots de passe les uns après les autres jusqu'à tomber sur le bon. Un programme peut en tenter des centaines par minute. Contre un mot de passe court ou courant (« Basket2024 »), il finit par gagner.

Le **credential stuffing** (littéralement « bourrage d'identifiants ») est plus vicieux. Des fuites de données d'autres sites circulent avec des millions de couples email + mot de passe. L'attaquant ne devine rien : il rejoue ces couples sur ton site, en pariant qu'un parent du club a réutilisé le même mot de passe partout. Il n'a besoin que d'un essai par compte, mais sur des milliers de comptes.

Dans les deux cas, la parade de base est la même : **compter les échecs et freiner**.

### La limitation de débit

La **limitation de débit** (en anglais *rate limiting*) consiste à fixer un nombre maximum d'actions sur une période, et à refuser au-delà. Pense au videur à l'entrée du gymnase un soir de match : « Tu t'es trompé de billet trois fois ? Tu attends 15 minutes sur le côté. » Il ne sait pas si tu es un fraudeur ou juste distrait, et ce n'est pas son problème : il rend la triche trop lente pour valoir le coup.

Sur le web, la réponse standard à « trop d'essais » est le code HTTP **429 Too Many Requests**. Le code 401 dit « tu n'es pas identifié », le 403 « tu n'as pas le droit », le 429 dit « tu demandes trop, reviens plus tard ».

### Ce que fait déjà ton API : un freinage maison

La connexion des apps mobiles passe par `POST /api/auth/login`, dans `src/Controller/Api/ApiAuthController.php`. Dans `security.yaml`, le firewall `api_login` est en `security: false` : Symfony ne protège rien sur cette route, c'est le contrôleur qui fait tout. Le commentaire daté de l'audit du 13/07 le dit : avant, un attaquant pouvait tester des mots de passe en boucle. Voici le correctif :

```php
if ($logs->countFailuresByIp((string) $ip, 15) >= 10
    || $logs->countFailuresByEmail($email, 15) >= 5
) {
    return new JsonResponse(
        ['error' => 'Trop de tentatives. Réessaie dans quelques minutes.'],
        Response::HTTP_TOO_MANY_REQUESTS
    );
}
```

Ligne par ligne :

- `$logs` est le `ConnexionLogRepository`. Chaque tentative de connexion est enregistrée dans la table `connexion_log` (entité `ConnexionLog`) : succès ou échec, email, IP, date.
- `countFailuresByIp($ip, 15) >= 10` : dix échecs depuis la même adresse IP dans les 15 dernières minutes. Ce seuil coupe le balayage large (une machine qui teste plein de comptes).
- `countFailuresByEmail($email, 15) >= 5` : cinq échecs sur le même email, quelle que soit l'IP. Ce seuil, plus bas, protège un compte ciblé même si l'attaquant change d'adresse.
- `Response::HTTP_TOO_MANY_REQUESTS` : la constante Symfony qui vaut 429.

Deux détails montrent que ce code est bien pensé :

1. **Le contrôle est placé avant la vérification du mot de passe.** Une fois le seuil atteint, même le bon mot de passe reçoit 429. Si on vérifiait d'abord le mot de passe, l'attaquant verrait la différence entre 429 (mauvais) et 200 (bon) et continuerait à tester.
2. **Les échecs sont journalisés à la main** (`ConnexionLog::echec(...)` plus bas). Le commentaire explique pourquoi : comme la route contourne le firewall, aucun `LoginFailureEvent` n'est émis, donc sans cette ligne le compteur n'aurait rien à compter.

Une limite à connaître : compter par email permet aussi à quelqu'un de **bloquer** un compte exprès, en tapant cinq faux mots de passe sur l'email d'une coach. Elle attendra 15 minutes. C'est un compromis classique, accepté ici parce que la gêne est courte.

### Ce qui manque côté web : `login_throttling` en commentaire

Les quatre formulaires web (`vitrine_admin`, `vitrine`, `manager`, `pirb`) passent par le `form_login` de Symfony. Et dans `config/packages/security.yaml`, sur chacun de ces firewalls, tu trouves ceci (lignes 87, 113, 143 et 170) :

```yaml
# login_throttling:
#     max_attempts: 5
#     interval: '1 minute'
```

C'est en commentaire. Le commentaire au-dessus du bloc admin explique pourquoi : il faut d'abord installer le composant, sinon « le conteneur ne compile plus = site en 500 ». C'est exact : j'ai lu la classe `LoginThrottlingFactory` de Symfony, elle lève une exception « Login throttling requires the Rate Limiter component » si le composant manque. Et dans ton `composer.json`, `symfony/rate-limiter` n'est pas présent. Aujourd'hui, les formulaires web n'ont donc **aucune limite d'essais**.

Il existe bien `src/EventListener/LoginLogListener.php`, qui écrit un avertissement dans les journaux après 5 échecs de la même IP en 10 minutes. Son propre commentaire le qualifie d'« anti-brute-force passif » : il note, il ne bloque pas. Une caméra de surveillance, pas un videur.

### Ce que fait `login_throttling`

Une fois activé sur un firewall, Symfony crée deux compteurs (je l'ai vérifié dans le code de `LoginThrottlingFactory` et `DefaultLoginRateLimiter`) :

- un compteur **local** par couple « identifiant + IP », limité à `max_attempts` (5 dans ta config) par `interval` (1 minute) ;
- un compteur **global** par IP seule, limité à 5 fois `max_attempts` (donc 25).

Au-delà, Symfony refuse la tentative avant même de vérifier le mot de passe, et renvoie l'utilisateur sur le formulaire avec un message traduit, du type « Plusieurs tentatives de connexion ont échoué, veuillez réessayer dans 1 minute ». Note la différence avec l'API : sur un formulaire web, pas de 429 visible, c'est une redirection vers la page de connexion avec un message. Le 429 est le langage des API.

Remarque la différence de stratégie : le compteur local de Symfony est par email **et** IP, alors que ton freinage API compte aussi par email seul. Contre un credential stuffing réparti sur beaucoup d'IP, ta version maison est plus stricte.

Les compteurs sont stockés dans le cache (pool `cache.rate_limiter`, qui par défaut s'appuie sur le cache de l'application, des fichiers dans `var/cache/`). Conséquence pratique : ton déploiement fait `rm -rf var/cache/prod`, ce qui remet les compteurs à zéro. Ce n'est pas grave, mais il faut le savoir.

### L'activer, dans le bon ordre

L'ordre est écrit dans ton propre commentaire, et il compte :

1. En local : `composer require symfony/rate-limiter`. Composer ajoute la ligne dans `composer.json` et fige la version dans `composer.lock`.
2. Décommenter les blocs `login_throttling` dans `security.yaml`.
3. Tester en local (voir la mise en pratique), puis `php bin/console lint:container`.
4. Commiter `composer.json`, `composer.lock` et `security.yaml` **ensemble**.
5. Sur chaque serveur : récupérer le code, puis `composer install --no-dev --optimize-autoloader` **avant** `cache:clear`. Si le cache est reconstruit avant que le composant soit installé, tu as ton 500.

### Le même message pour tout le monde

La règle anti-énumération vue en leçon 9 s'applique ici. **Énumérer**, c'est utiliser les réponses du site pour dresser la liste des emails qui ont un compte. Ton API répond « Identifiants invalides. » que l'email existe ou non : bien. Le message 429 est différent, mais il s'affiche dès que le seuil est atteint, que le compte existe ou pas (le compteur par email compte aussi les emails inconnus). Il ne révèle donc rien. Le jour où tu personnalises ces messages, garde cette propriété : jamais « ce compte n'existe pas », jamais un délai différent selon que le compte existe.

### Le compte désactivé : le `UserChecker` absent

Dernier trou, plus discret. L'entité `User` a un champ `isActive`, commenté « Compte actif ou désactivé par un admin ». Mais j'ai cherché : aucun **`UserChecker`** n'est déclaré dans `security.yaml`, et ni `ApiAuthController` ni `ApiTokenHandler` ne regardent `isActive()`. Un compte désactivé peut donc encore se connecter.

Un `UserChecker` est une classe que Symfony appelle à chaque connexion pour dire « ce compte a-t-il le droit d'entrer, même avec le bon mot de passe ? ». C'est le videur qui vérifie la liste des interdits de salle :

```php
final class UserChecker implements UserCheckerInterface
{
    public function checkPreAuth(UserInterface $user): void
    {
        if ($user instanceof User && !$user->isActive()) {
            throw new CustomUserMessageAccountStatusException('Ce compte est désactivé.');
        }
    }

    public function checkPostAuth(UserInterface $user): void {}
}
```

On le branche avec `user_checker: App\Security\UserChecker` sur chaque firewall. Pour l'API, la route de login étant hors firewall, il faut aussi le test `isActive()` dans `ApiAuthController`. Aujourd'hui, d'après ce que j'ai trouvé, seul l'anonymiseur RGPD (`RgpdAnonymizer`) passe un `User` à `isActive = false`, en changeant aussi son email : le trou est donc surtout latent. Mais le jour où un admin « désactive » quelqu'un, il croira l'avoir bloqué, et ce sera faux.

## À retenir

- Force brute : deviner un mot de passe par essais répétés. Credential stuffing : rejouer des couples fuités ailleurs. Parade commune : compter les échecs et freiner.
- Ton API a un freinage maison dans `ApiAuthController` : 10 échecs par IP ou 5 par email en 15 minutes donnent 429, contrôlé avant le mot de passe.
- Côté web, `login_throttling` est commenté sur les quatre firewalls et `symfony/rate-limiter` n'est pas installé : aucune limite aujourd'hui. Installer le composant avant de décommenter, sinon 500.
- Le message d'erreur ne doit jamais dépendre de l'existence du compte (anti-énumération).
- `isActive` existe sur `User` mais rien ne le vérifie à la connexion : il manque un `UserChecker`.

## Mise en pratique

Objectif : activer `login_throttling` sur **un seul** firewall, en local, et prouver qu'il bloque (environ 45 minutes). Pas de script d'attaque : tu testes à la main, dans ton navigateur, sur ta machine.

1. Dans `mabb-site`, lance `composer require symfony/rate-limiter`. Regarde avec `git diff composer.json` ce qui a changé.
2. Dans `config/packages/security.yaml`, décommente uniquement le bloc du firewall `manager` (autour de la ligne 143). Laisse les trois autres commentés.
3. `php bin/console lint:container` puis `php bin/console cache:clear` : aucun message d'erreur.
4. Ouvre la page de connexion du manager en local. Tape 6 fois un mauvais mot de passe sur un compte de test. Note le message affiché à la 6e tentative.
5. Tape tout de suite le **bon** mot de passe : la connexion doit être refusée. Attends une minute, réessaie : elle passe.
6. Refais l'étape 4 avec un email qui n'existe pas. Le message est-il identique ? Note ta réponse.
7. Écris dans un commentaire daté au-dessus du bloc ce que tu as constaté. Ne déploie pas : tu montreras le diff à valider avant d'étendre aux trois autres firewalls.

C'est réussi quand tu as vu le refus du bon mot de passe pendant le blocage, que le message est le même pour un email existant et inexistant, et que tu sais expliquer pourquoi il faut installer le composant avant de décommenter la configuration.
