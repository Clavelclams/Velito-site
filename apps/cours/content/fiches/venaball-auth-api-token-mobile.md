---
titre: "Authentifier une app mobile : le jeton opaque hashé plutôt que la session"
projet: "venaball"
bloc: 1
themes: ["authentification", "api"]
source: "src/Security/ApiTokenHandler.php"
date: 2026-07-25
---

## Le concept

Le site web utilise une **session** : après login, Symfony pose un cookie et garde l'état côté serveur. Une app mobile ne fonctionne pas comme ça : elle est **stateless** et envoie à chaque requête un en-tête `Authorization: Bearer <jeton>`. Dans Venaball, l'app Expo se connecte via `POST /api/auth/login` (`src/Controller/Api/ApiAuthController.php`) qui fabrique un jeton opaque :

```php
// src/Entity/Core/ApiToken.php
public static function creerPour(User $user, ?string $appareil = null): array
{
    $clair = bin2hex(random_bytes(32));       // 32 octets aléatoires
    $token = new self();
    $token->user      = $user;
    $token->tokenHash = hash('sha256', $clair); // en base : SEULEMENT le hash
    ...
    return [$token, $clair];  // le clair n'est montré qu'UNE fois au client
}
```

À chaque requête API, le firewall `api` (mode `access_token` natif de Symfony) appelle `src/Security/ApiTokenHandler.php` : jeton clair → SHA-256 → recherche en base → contrôle d'expiration (30 jours) → `UserBadge`. Si le jeton est inconnu, expiré ou orphelin, le message d'erreur est volontairement **générique** (« Jeton d'accès invalide ou expiré ») pour ne pas donner d'oracle à un attaquant. Le choix du jeton opaque plutôt que JWT est acté par l'ADR-0010 : zéro dépendance nouvelle, et surtout **révocation immédiate** — le logout supprime la ligne en base, chose impossible avec un JWT sans liste noire.

## Comment je l'explique au jury

Mon site web et mon app mobile n'utilisent pas le même mécanisme d'authentification, et c'est un choix. Le web est en session classique derrière des firewalls par sous-domaine ; l'app mobile est stateless, chaque requête porte un jeton Bearer validé indépendamment. Au login, je génère 32 octets aléatoires : le clair part une seule fois vers l'app, et en base je ne stocke que son hash SHA-256 — si ma table fuite, les jetons ne sont pas rejouables, exactement comme pour les mots de passe. J'ai préféré un jeton opaque à un JWT pour deux raisons : Symfony fournit nativement l'authenticator `access_token` donc zéro dépendance, et je peux révoquer un jeton instantanément en supprimant sa ligne, ce qu'un JWT ne permet pas sans liste noire. Enfin, mes endpoints `/api/pirb/*` n'ont aucun paramètre `{id}` : chaque endpoint sert les données du porteur du jeton, donc impossible de demander les données d'une autre joueuse.

## La question vicieuse du jury

**« Pourquoi hasher le jeton en SHA-256 alors que vous hashez les mots de passe en bcrypt/argon2 ? Ce n'est pas incohérent ? »**

Non, parce que la menace n'est pas la même. Un mot de passe est **faible et réutilisé** par l'humain : il faut un hachage lent (bcrypt/argon2, via le PasswordHasher Symfony — RT-0007) pour rendre le brute-force coûteux. Mon jeton, lui, sort de `random_bytes(32)` : 256 bits d'entropie, aucun dictionnaire possible, le brute-force est mathématiquement hors de portée même avec un hash rapide. SHA-256 suffit donc, et il est même préférable : il doit être recalculé **à chaque requête API**, un argon2 ajouterait des dizaines de millisecondes par appel pour zéro gain de sécurité. Je sais aussi nommer la limite assumée de ma phase 1 : pas de refresh token, l'app se relogue à l'expiration des 30 jours — le passage à JWT + refresh est prévu en phase 2 sans changer les contrôleurs, le header Bearer reste identique.
