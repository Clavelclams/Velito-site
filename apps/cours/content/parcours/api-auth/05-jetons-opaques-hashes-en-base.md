---
titre: "Le jeton opaque de Venaball : montré une fois, hashé en base, révocable"
parcours: "api-auth"
ordre: 5
niveau: "intermediaire"
duree: 20
date: 2026-09-09
---

## Le cours

L'app Venaball s'authentifie avec un jeton **opaque** : une chaîne aléatoire qui ne contient aucune information. C'est l'ADR-0007 puis 0010, et les raisons sont dans l'en-tête de `ApiToken.php`.

**Pourquoi opaque et pas JWT.** Trois arguments, dans le fichier :

1. **Zéro dépendance.** Symfony fournit nativement l'authenticator `access_token` : pas de LexikJWTBundle, pas de clés RSA à gérer, pas d'API Platform. Pour une phase 1, moins de code est plus sûr.
2. **Révocation immédiate.** Un jeton opaque est une ligne en base. Le supprimer, c'est le révoquer — tout de suite. Un JWT reste valide jusqu'à son expiration, quoi qu'il arrive (« impossible sans liste noire »).
3. **Le JWT reste possible plus tard.** La décision est réversible et documentée.

**Le cycle de vie.**

```php
public const VALIDITE = '+30 days';

public static function creer(User $user): array   // schéma simplifié
{
    $clair = bin2hex(random_bytes(32));             // 64 caractères hexa, 256 bits d'entropie
    $token = new self();
    $token->tokenHash = hash('sha256', $clair);     // en base : le hash seulement
    $token->expiresAt = new \DateTimeImmutable(self::VALIDITE);
    return [$token, $clair];                        // le clair part UNE fois, dans la réponse du login
}
```

Trois décisions dans ces lignes :

**Le clair n'est montré qu'une fois.** La réponse de `/api/auth/login` contient le jeton. L'app le stocke. Le serveur ne le garde **pas** — il n'a que le hash. Si l'app le perd, elle se reconnecte : impossible de « retrouver » un jeton, par conception.

**En base, le hash SHA-256.** Un dump de `api_token` — par une faille, un backup qui fuit, un développeur indélicat — donne des hashes. Un hash SHA-256 d'une chaîne de 256 bits aléatoires est **irréversible en pratique** : aucun moyen de retrouver le jeton clair, donc aucun moyen de rejouer. C'est le même principe que les mots de passe hashés, appliqué aux jetons. À chaque requête, le serveur hashe le jeton reçu et cherche le hash en base — un index sur `token_hash` rend ça instantané.

Pourquoi SHA-256 et pas bcrypt comme pour les mots de passe ? Parce qu'un mot de passe est **faible** (choisi par un humain, devinable) et que bcrypt ralentit volontairement le brute force. Un jeton de 256 bits aléatoires est **fort** : le brute force est impossible quelle que soit la vitesse du hash. SHA-256 suffit, et il est mille fois plus rapide — ce qui compte à chaque requête.

**Expiration à 30 jours, pas de refresh token.** Assumé dans le commentaire : « l'app re-loguera ». C'est une simplification de phase 1. Un refresh token (leçon 6, hub) permettrait de renouveler sans re-saisir le mot de passe ; ici, on accepte une reconnexion mensuelle. Pour une app de club utilisée chaque semaine, c'est acceptable ; pour une app grand public, non.

**L'authenticator `access_token` de Symfony.** Dans `security.yaml`, le firewall `api` déclare `access_token: { token_handler: App\Security\ApiTokenHandler }`. Le handler reçoit le jeton de l'en-tête `Authorization: Bearer`, le hashe, cherche en base, vérifie l'expiration, et renvoie l'utilisateur. Symfony fait le reste (401 si absent ou invalide). Une trentaine de lignes, natives, testables.

**La révocation.** `DELETE FROM api_token WHERE user_id = ?` : tous les appareils de cet utilisateur sont déconnectés. `WHERE id = ?` : un seul. C'est ce que permet un jeton en base, et c'est ce qui manque à un JWT. Un utilisateur qui perd son téléphone : une requête, et le jeton du téléphone perdu ne vaut plus rien.

**Ce que le jeton ne dit pas.** Il identifie l'utilisateur, pas ses droits — ceux-ci sont relus en base à chaque requête (les `UserClubRole`). Un rôle retiré prend effet immédiatement, sans attendre l'expiration du jeton. Avec un JWT qui embarquerait les rôles, ce ne serait pas le cas.

## À retenir

- Opaque = aléatoire, sans information. Le serveur le cherche en base.
- Clair montré une fois ; en base, SHA-256 seulement. Un dump ne permet pas de rejouer.
- SHA-256 suffit pour un secret de 256 bits ; bcrypt est pour les mots de passe faibles.
- 30 jours, pas de refresh : assumé pour la phase 1.
- Révocation = suppression d'une ligne. Immédiate. C'est l'argument contre le JWT.
- Le jeton dit qui ; les droits sont relus à chaque requête.

## Mise en pratique

Objectif : suivre un jeton de sa création à sa révocation, et vérifier qu'il est bien hashé.

1. `POST /api/auth/login` avec un compte de test → note le jeton clair de la réponse. Puis SQL : `SELECT token_hash, expires_at FROM api_token ORDER BY id DESC LIMIT 1;`. Le hash ne ressemble pas au jeton. Vérifie : `php -r 'echo hash("sha256", "<ton-jeton>");'` → identique au `token_hash`.
2. Utilise le jeton sur `/api/club/moi` → 200. Modifie un caractère → 401. Le hash ne correspond plus.
3. Révocation : `DELETE FROM api_token WHERE token_hash = '<hash>';`. Le jeton → 401 immédiatement. Reconnecte-toi.
4. Expiration : `UPDATE api_token SET expires_at = NOW() - INTERVAL 1 DAY WHERE token_hash = '<hash>';` → 401. Le handler vérifie la date.
5. Lis `src/Security/ApiTokenHandler.php`. Repère : la lecture de l'en-tête (faite par Symfony), le hash, la recherche, la vérification d'expiration, le retour de l'utilisateur. Compte les lignes. C'est tout ce qu'il faut.
6. Test unitaire : `ApiTokenTest.php` — `creer()` produit un clair de 64 caractères hexa, le hash stocké correspond, `estExpire()` est faux à la création et vrai après 31 jours (injecte la date ou utilise `ClockMock`). Commit.
7. Pour le jury, 4 lignes : « Pourquoi un jeton opaque hashé plutôt qu'un JWT pour mon API mobile ». Révocation, dépendances, dump de base.

Résultat attendu : tu as vu le hash, la révocation, l'expiration, et tu as un test sur le cycle de vie du jeton.
