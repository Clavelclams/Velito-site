---
titre: "Qui a le droit ? Connexion, rôles et multi-club"
parcours: "venaball-de-zero"
ordre: 11
niveau: "debutant"
duree: 40
date: 2026-10-04
---

## Le cours

Imagine l'entrée du gymnase un samedi matin. Deux questions se posent, toujours dans le même ordre.

1. **Qui es-tu ?** Tu montres ton badge. Le gardien vérifie que c'est bien toi.
2. **As-tu le droit d'aller là ?** Ton badge te laisse entrer dans le hall. Mais le bureau du club, la réserve de ballons et le vestiaire des arbitres, c'est une autre affaire. Pour ça, on regarde la liste des rôles affichée au bureau.

En informatique, ces deux questions ont un nom :

- **Authentification** : prouver qui tu es (le badge). Dans Venaball, c'est l'e-mail et le mot de passe.
- **Autorisation** : vérifier ce que tu as le droit de faire (la liste des rôles). Dans Venaball, c'est le travail de `ClubVoter`.

Retiens bien la différence. Au jury, beaucoup de candidats les mélangent.

### Ce que tu vois à l'écran

Une coach ouvre `club.venaball.fr`. Elle tape son e-mail et son mot de passe. Elle arrive sur le tableau de bord de son club, avec le menu coach. Une maman qui se connecte au même endroit ne voit pas les mêmes menus. Et une coach d'un autre club ne voit jamais les joueuses de ce club. Tout ça vient de quelques fichiers. On les lit un par un.

### 1. Le mot de passe n'est jamais stocké en clair

Ouvre `config/packages/security.yaml`. C'est le règlement de sécurité de tout le site. Tout en haut :

```yaml
password_hashers:
    Symfony\Component\Security\Core\User\PasswordAuthenticatedUserInterface: 'auto'

providers:
    app_user_provider:
        entity:
            class: App\Entity\Core\User
            property: email
```

- `password_hashers` : la règle pour transformer les mots de passe. Un **hash** (ou « empreinte »), c'est le résultat d'une moulinette à sens unique : on peut fabriquer l'empreinte à partir du mot de passe, mais pas retrouver le mot de passe à partir de l'empreinte. Comme une empreinte de chaussure dans la boue : elle prouve quelle chaussure est passée, mais tu ne reconstruis pas la chaussure avec.
- `'auto'` : Symfony choisit lui-même un algorithme solide (bcrypt ou argon2, d'après le commentaire du fichier).
- `providers` : un **provider**, c'est « l'endroit où on va chercher les comptes ». Ici, la table des `User`.
- `property: email` : on reconnaît un compte à son e-mail.

Dans `src/Entity/Core/User.php`, la colonne s'appelle simplement `password` (ligne 38). Elle contient l'empreinte, pas le mot de passe. Quand un compte est créé, le code appelle `hashPassword()` avant d'enregistrer (par exemple `src/Controller/Manager/ManagerCreerClubController.php`, ligne 155). Si quelqu'un volait la base, il aurait des empreintes, pas des mots de passe.

### 2. Les firewalls : un portique par porte d'entrée

Venaball a plusieurs adresses : `club.venaball.fr` (le Manager), `app.venaball.fr` (l'espace joueuse), le site vitrine, et l'API `/api` des apps mobiles. Chaque porte a son propre portique de sécurité. Symfony appelle ça un **firewall** : une zone du site avec sa propre façon de se connecter.

```yaml
manager:
    # [08/09/2026] club.venaball.fr : même application, autre adresse.
    host: '^(manager|club)\.(mabb\.fr|venaball\.fr|localhost)(:\d+)?$'
    lazy: true
    provider: app_user_provider
    form_login:
        login_path: manager_login
        check_path: manager_login
        # ...
        enable_csrf: true
```

- `manager:` : le nom du firewall.
- `host:` : une **expression régulière** (un motif de texte) qui dit « ce firewall s'applique si l'adresse commence par `manager.` ou `club.`, suivie de `mabb.fr`, `venaball.fr` ou `localhost` ». C'est comme ça qu'un seul code sert deux instances (MABB et Venaball).
- `provider:` : on cherche les comptes dans la table `User`.
- `form_login:` : on se connecte avec un formulaire. `login_path` est la page du formulaire, `check_path` l'adresse où Symfony vérifie l'e-mail et le mot de passe.
- `enable_csrf: true` : protection contre un autre site qui essaierait d'envoyer le formulaire à ta place.

Le fichier contient aussi les firewalls `api`, `vitrine_admin`, `vitrine` et `pirb`. Le commentaire en tête le rappelle : « la première règle qui correspond à la requête gagne ». L'ordre compte.

### 3. Deux sortes de rôles

C'est le point le plus important de la leçon. Venaball a **deux niveaux de rôles**.

- Les **rôles plateforme**, rangés dans `User` : `ROLE_USER` pour tout le monde, `ROLE_SUPER_ADMIN` pour l'administrateur de la plateforme. Le commentaire de `User.php` le dit : « Les rôles MÉTIER (COACH, JOUEUR...) sont dans UserClubRole, pas ici. »
- Les **rôles métier**, rangés dans `UserClubRole` : DIRIGEANT, COACH, STAFF, JOUEUR, PARENT, BENEVOLE, TRESORIER, SECRETAIRE, et d'autres.

Pourquoi deux ? Parce qu'une même personne peut être coach dans un club et parent dans un autre. Un rôle unique sur le compte ne pourrait pas le dire. Voici le cœur de `src/Entity/Core/UserClubRole.php` :

```php
#[ORM\UniqueConstraint(name: 'unique_user_club_role', columns: ['user_id', 'club_id', 'role'])]
class UserClubRole
{
    // ...
    #[ORM\ManyToOne(targetEntity: User::class, inversedBy: 'userClubRoles')]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    private ?User $user = null;

    #[ORM\ManyToOne(targetEntity: Club::class, inversedBy: 'userClubRoles')]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    private ?Club $club = null;

    #[ORM\Column(length: 30)]
    private ?string $role = null;

    #[ORM\Column(length: 20, options: ['default' => 'pending'])]
    private string $status = self::STATUS_PENDING;
```

- `UniqueConstraint(... ['user_id', 'club_id', 'role'])` : impossible d'avoir deux fois la même ligne « Karim, club A, COACH ». Mais « Karim, club A, COACH » et « Karim, club B, PARENT » peuvent coexister.
- `ManyToOne(targetEntity: User::class)` : chaque ligne pointe vers **un** compte. Un compte peut avoir **plusieurs** lignes. `JoinColumn(nullable: false, onDelete: 'CASCADE')` : le lien est obligatoire, et si le compte est supprimé, ses lignes de rôle partent avec.
- `ManyToOne(targetEntity: Club::class)` : chaque ligne pointe vers **un** club.
- `$role` : le rôle métier, en texte (`'COACH'`, `'PARENT'`…).
- `$status` avec la valeur par défaut `pending` : quand quelqu'un s'inscrit, il est « en attente ». Il n'a **aucun droit** tant qu'un dirigeant n'a pas validé. C'est la file d'attente devant le bureau : tu as rempli la fiche, mais personne ne t'a encore remis les clés.

Image du club : `UserClubRole`, c'est la liste des rôles affichée au bureau de **chaque** club. Ton nom peut apparaître sur plusieurs listes, avec un rôle différent sur chacune.

### 4. Le ClubVoter : le responsable qui vérifie la liste

Un **Voter**, dans Symfony, c'est une classe qui répond oui ou non à la question « cette personne a-t-elle le droit de faire ça sur cet objet ? ». Celui de Venaball est `src/Security/Voter/ClubVoter.php`. Il connaît des **attributs**, c'est-à-dire des noms de droits : `CLUB_MEMBER` (être membre), `CLUB_COACH`, `CLUB_ADMIN` (être dirigeant), `CLUB_STAFF` (dirigeant, coach ou staff), `CLUB_JOUEUR`, et d'autres.

Voici comment il vérifie un rôle :

```php
private function hasMetaRole(User $user, Club $club, string $metaRole): bool
{
    foreach ($user->getUserClubRoles() as $ucr) {
        if (
            $ucr->getClub()?->getId() === $club->getId()
            && $ucr->getRole() === $metaRole
            && $ucr->isActive()
            && $ucr->isStatusActive()
        ) {
            return true;
        }
    }
    return false;
}
```

- `foreach (... as $ucr)` : on parcourt toutes les lignes de rôle de cette personne.
- `getClub()?->getId() === $club->getId()` : la ligne concerne-t-elle **ce** club ? Un rôle de coach ailleurs ne compte pas ici.
- `getRole() === $metaRole` : est-ce le bon rôle ?
- `isActive()` : le rôle n'a pas été désactivé par un dirigeant.
- `isStatusActive()` : la demande a été validée (pas `pending`).
- Si les quatre conditions sont vraies, `return true` : accès accordé. Sinon, à la fin, `return false`.

Comment le Voter sait-il de quel club il s'agit ? Il accepte un `Club`, ou n'importe quelle entité qui implémente `ClubAwareInterface` (une **interface**, c'est un contrat : « je promets d'avoir une méthode `getClub()` »). Une rencontre, une équipe, une joueuse savent toutes dire à quel club elles appartiennent.

Dans un contrôleur, ça donne une seule ligne. Exemple réel dans `src/Controller/Manager/ConvocationController.php`, ligne 52 :

```php
$this->denyAccessUnlessGranted(ClubVoter::CLUB_STAFF, $rencontre);
```

Traduction : « si cette personne n'est pas dirigeant, coach ou staff **du club de cette rencontre**, arrête tout et renvoie une erreur 403 (accès interdit) ».

Une exception existe : le `ROLE_SUPER_ADMIN` passe partout (le Voter le court-circuite ligne 105). C'est le compte de support de la plateforme.

### 5. Le TenantResolver : sur quel club je travaille en ce moment ?

**Multi-tenant** veut dire « plusieurs locataires dans le même immeuble ». Ici, plusieurs clubs partagent **une seule base de données**. Chaque ligne (équipe, joueuse, rencontre) porte une colonne `club_id`, et chacun ne doit voir que ses lignes. Comme des casiers dans un même vestiaire : chaque club a sa clé, et ne doit jamais ouvrir le casier du voisin.

Quand quelqu'un appartient à deux clubs, il faut savoir lequel est « actif ». C'est le rôle de `src/Security/Tenant/TenantResolver.php` :

```php
$activeClubId = $session->get('active_club_id');
if ($activeClubId) {
    $club = $this->clubRepository->find($activeClubId);
    if ($club && ($this->isSuperAdmin() || $this->userBelongsToClub($user, $club))) {
        return $club;
    }
    $session->remove('active_club_id');
}

$clubs = $this->getUserClubs($user);
if (count($clubs) === 1) {
    $club = $clubs[0];
    $session->set('active_club_id', $club->getId());
    return $club;
}

return null;
```

- `$session->get('active_club_id')` : la **session**, c'est la mémoire que le serveur garde pour toi entre deux pages. On y regarde si un club a déjà été choisi.
- `find($activeClubId)` puis `userBelongsToClub(...)` : même si un club est noté en session, on **revérifie** que tu en fais vraiment partie. On ne fait pas confiance aveuglément.
- `remove('active_club_id')` : si ce n'est plus valable (rôle retiré, par exemple), on efface.
- `count($clubs) === 1` : si tu n'as qu'un club, on le choisit pour toi. C'est le cas de la plupart des gens.
- `return null` : plusieurs clubs et aucun choisi, l'écran devra te demander lequel.

### 6. Ce qui est prouvé par des tests

Une faille classique s'appelle **IDOR** (Insecure Direct Object Reference) : changer un numéro dans l'adresse, par exemple `/seances/12` en `/seances/13`, pour voir la fiche de quelqu'un d'autre. Le dossier `tests/Functional/Pirb/` contient des tests qui lancent de vraies requêtes et vérifient le refus. Extrait de `PirbSeancesIdorTest.php` :

```php
$this->client->loginUser($userA, 'pirb');
$this->get('/seances/' . $seanceB->getId());

// Accès refusé : la séance ne concerne pas son équipe.
self::assertResponseStatusCodeSame(403);
```

- `loginUser($userA, 'pirb')` : on connecte une joueuse de l'équipe A sur le firewall `pirb`.
- `get('/seances/' . ...)` : elle demande la séance de l'équipe B.
- `assertResponseStatusCodeSame(403)` : le test échoue si le serveur ne répond pas « interdit ».

Il existe aussi des tests unitaires de la logique (`tests/Unit/Security/Voter/ClubVoterTest.php`, `tests/Unit/Security/Tenant/TenantResolverTest.php`). Le détail est dans la leçon 16.

### 7. Ce qui n'est pas encore fait

Sois honnête au jury. Dans `security.yaml`, la limitation des tentatives de connexion (`login_throttling`) est **en commentaire** sur les firewalls web (`vitrine_admin`, `vitrine`, `manager`, `pirb`). Le commentaire explique qu'il faut d'abord installer le composant `symfony/rate-limiter`. Aujourd'hui, les formulaires de connexion web n'ont donc pas de limite d'essais. La connexion de l'**API** mobile, elle, a sa propre limite écrite à la main dans `ApiAuthController.php` (leçon 12). C'est un chantier ouvert, listé dans la leçon 17.

### Ce que tu dis au jury

« Je sépare l'authentification, qui prouve qui tu es par e-mail et mot de passe haché, de l'autorisation, qui décide ce que tu peux faire. Les rôles métier ne sont pas sur le compte mais dans `UserClubRole`, une ligne par club et par rôle, ce qui permet d'être coach dans un club et parent dans un autre. Chaque route vérifie le droit avec `ClubVoter` sur l'objet demandé, donc sur son club, et une inscription non validée ne donne aucun droit. Plusieurs clubs partagent une base, chaque ligne porte son `club_id`, et des tests fonctionnels prouvent qu'une joueuse ne peut pas ouvrir la séance d'une autre équipe. Je sais aussi ce qui manque : la limitation des tentatives sur les connexions web n'est pas encore activée. »

## À retenir

- Authentification = qui es-tu (e-mail + mot de passe haché, jamais stocké en clair). Autorisation = as-tu le droit (`ClubVoter`).
- Les firewalls de `security.yaml` découpent le site par adresse (`club.`, `app.`, `/api`…) ; l'ordre des firewalls compte.
- Deux niveaux de rôles : plateforme dans `User` (`ROLE_USER`, `ROLE_SUPER_ADMIN`), métier dans `UserClubRole` (un rôle par club, statut `pending` tant que non validé).
- `denyAccessUnlessGranted(ClubVoter::CLUB_STAFF, $objet)` vérifie le rôle dans le club de l'objet, pas dans un club quelconque.
- Multi-tenant : une base, plusieurs clubs, chaque ligne a son `club_id` ; `TenantResolver` garde le club actif en session et le revérifie.
- Pas encore de limitation des tentatives sur les connexions web (`login_throttling` en commentaire).

## Mise en pratique

Sur ton projet `mabb-site`, en lecture seulement (environ 45 minutes) :

1. Ouvre `config/packages/security.yaml`. Note sur une feuille, dans l'ordre, le nom de chaque firewall et l'adresse ou le chemin qu'il protège.
2. Ouvre `src/Entity/Core/UserClubRole.php`. Recopie la liste des rôles de `ROLES_DISPONIBLES` et, pour chacun, écris en une phrase qui c'est dans un vrai club.
3. Dans `src/Security/Voter/ClubVoter.php`, trouve le bloc `match ($attribute)`. Pour `CLUB_STAFF` et `CLUB_STAFF_ELARGI`, écris la liste exacte des rôles qui passent.
4. Lance une recherche de `denyAccessUnlessGranted(ClubVoter::` dans `src/Controller/Manager/`. Choisis trois résultats et explique, pour chacun, quel objet est vérifié et pourquoi ce droit-là.
5. Invente un cas : « Karim est COACH au club A, statut active, et PARENT au club B, statut pending ». Écris ce qu'il peut faire dans chaque club, en t'appuyant sur `hasMetaRole`.

C'est réussi quand tu peux expliquer à voix haute, sans notes, pourquoi Karim ne voit rien côté parent au club B, et citer les deux fichiers qui le garantissent.
