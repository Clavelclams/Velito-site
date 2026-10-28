---
titre: "Ouvrir un document privé dans le navigateur du téléphone : un lien signé de 2 minutes au lieu du jeton"
projet: "venaball"
bloc: 1
themes: ["securite-applicative", "api", "authentification"]
source: "src/Controller/Api/Club/ApiClubDocumentController.php"
date: 2026-10-10
---

## Le concept

L'app staff Venaball Club appelle mon API avec un jeton Bearer dans l'en-tête `Authorization`. Pour afficher un PDF du club (compte rendu, règlement, décharge), le plus simple est de l'ouvrir dans le navigateur du téléphone. Problème : ce navigateur ne connaît pas le jeton de l'app, il fait un simple `GET` sans en-tête. Mettre le jeton dans l'URL serait pire : il finirait dans l'historique, les journaux du serveur, et il vaut des semaines.

La solution du lot C de l'API Club (commit `7c2ab04`, 05/10) se fait en deux appels, dans `src/Controller/Api/Club/ApiClubDocumentController.php` :

1. `POST /api/club/documents/{id}/lien`, **authentifié** par le jeton : le serveur vérifie que le document est du club courant et que je peux le voir, puis fabrique une URL qui contient l'id du document, l'id du compte, une expiration à 2 minutes et une signature.
2. `GET /api/club/documents/{id}/fichier?u=..&e=..&s=..`, **public**, ouvert par le navigateur. Il recalcule la signature, puis revérifie tout.

```php
// src/Controller/Api/Club/ApiClubDocumentController.php
if ($e < time() || !hash_equals($this->signature($id, $u, $e), $s)) {
    return $introuvable;
}
$doc = $this->documentRepository->find($id);
$user = $this->userRepository->find($u);
$club = $doc?->getClub();
if (!$doc instanceof Document || !$user instanceof User || !$club instanceof Club || !$this->peutVoir($user, $club, $doc)) {
    return $introuvable;
}
// ...
private function signature(int $docId, int $userId, int $exp): string
{
    return hash_hmac('sha256', sprintf('doc-club|%d|%d|%d', $docId, $userId, $exp), $this->secret);
}
```

Le mécanisme : un HMAC est une empreinte calculée avec une clé que seul le serveur connaît (`%kernel.secret%`). Changer un seul chiffre de l'URL (un autre document, une autre date d'expiration) donne une signature différente, impossible à recalculer sans la clé. `hash_equals` compare en temps constant pour ne pas laisser deviner la signature caractère par caractère. Le préfixe `doc-club|` évite qu'une signature fabriquée pour autre chose (le ticket SSO de `PirbSsoTicketController` utilise la même clé) soit réutilisable ici.

Le pourquoi des détails : la signature prouve que le serveur a émis le lien, mais **les droits sont recalculés à l'ouverture** avec `peutVoir()` ; un rôle retiré entre les deux appels ferme l'accès. Toutes les erreurs donnent la même 404, pour ne rien apprendre à quelqu'un qui tâtonne. La réponse porte `Cache-Control: private, no-store` et `X-Content-Type-Options: nosniff`. La seule exception au « tout `/api` est authentifié » est déclarée ligne à ligne dans `config/packages/security.yaml` : `- { path: ^/api/club/documents/\d+/fichier$, roles: PUBLIC_ACCESS }`, placée avant la règle générale `^/api`.

## Comment je l'explique au jury

Le navigateur du téléphone ne peut pas envoyer le jeton Bearer de l'app, et je refuse de mettre ce jeton dans une URL. L'app demande donc au serveur, avec son jeton, un lien temporaire : l'URL porte le document, le compte et une expiration à deux minutes, le tout signé par un HMAC SHA-256 avec le secret du serveur. Personne ne peut fabriquer ou modifier ce lien sans la clé, et je compare la signature avec `hash_equals` pour éviter une attaque temporelle. À l'ouverture, je ne fais pas confiance à la signature seule : je recharge le compte et je recalcule ses droits sur le document, donc un rôle retiré ferme l'accès immédiatement. C'est le même principe que les URL pré-signées d'Amazon S3, appliqué à mon cas.

## La question vicieuse du jury

**« Si quelqu'un récupère l'URL dans les deux minutes, il ouvre le document sans être connecté. Et le fichier, il est où sur le disque ? »**

Oui, pendant deux minutes le lien est un laissez-passer : il n'est pas à usage unique (rien n'est stocké en base pour le marquer comme utilisé). J'ai accepté ce compromis parce que la fenêtre est courte, que le lien est lié à un compte qui a déjà le droit de voir ce document, et que les droits sont revérifiés à chaque ouverture. Pour aller plus loin, j'ajouterais une table de liens consommés, ou une expiration plus courte.

La deuxième partie est plus gênante et je préfère la dire : `src/Service/DocumentUploader.php` écrit les documents dans `public/uploads/ent/{clubId}/`, sous la racine web, avec un nom `uniqid('ent_')` dérivé de l'horloge. `public/uploads/.htaccess` bloque l'accès direct aux PDF et aux fichiers bureautiques, mais il laisse passer les images (`jpg`, `png`...) partout sauf dans `tresorerie/` et `reunions/`. Un document du club déposé en photo est donc lisible par son adresse directe, sans passer par mon lien signé. La correction de fond est déjà dans mes prochaines étapes : stocker hors de `public/` et ne servir les fichiers que par le contrôleur ; en attendant, fermer `uploads/ent/` dans le `.htaccess` comme je l'ai fait le 05/10 pour la trésorerie. Enfin, rien de tout ça n'est couvert par un test automatisé ; les trois premiers à écrire sont : lien expiré, signature modifiée, rôle retiré entre les deux appels.
