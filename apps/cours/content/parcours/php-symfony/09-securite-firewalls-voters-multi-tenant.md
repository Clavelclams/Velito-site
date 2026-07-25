---
titre: "Sécurité Symfony : firewalls, Voters et multi-tenant"
parcours: "php-symfony"
ordre: 9
niveau: "solide"
duree: 30
date: 2026-07-25
---

## Le cours

La sécurité Symfony répond à deux questions distinctes, et le jury attend que tu les sépares proprement. **Authentification** : « qui es-tu ? » **Autorisation** : « as-tu le droit de faire ÇA ? » Analogie complète du gymnase : le firewall est le portier qui vérifie ta carte de membre à l'entrée (authentification) ; le Voter est le responsable de salle qui décide si TOI, tu peux entrer dans LE local matériel (autorisation).

**Les firewalls.** Un firewall est une zone de l'application avec sa méthode d'authentification. Venaball en a plusieurs, et c'est un choix d'architecture à revendiquer : l'espace web (Manager, PIRB web) s'authentifie par formulaire de login + session ; l'API mobile s'authentifie par jeton. Pour l'API, ton `ApiTokenHandler` se branche sur l'authenticator natif `access_token` de Symfony :

```php
// À chaque requête API, Symfony extrait « Authorization: Bearer <jeton> »
// et demande à ton handler : « c'est qui ? »
public function getUserBadgeFrom(string $accessToken): UserBadge
{
    $token = $this->tokens->findValide($accessToken);   // hash SHA-256 → lookup en base
    if ($token === null || $token->getUser()?->getEmail() === null) {
        throw new BadCredentialsException('Jeton d\'accès invalide ou expiré.');
    }
    return new UserBadge($token->getUser()->getEmail()); // Symfony charge le User
}
```

Note le mode **stateless** : pas de session côté API, chaque requête re-prouve son identité — exactement ce qu'attend une app mobile. Et le message d'erreur générique est volontaire : ne jamais dire si le jeton est inconnu, expiré ou orphelin (pas d'oracle pour un attaquant).

**Les Voters.** Une fois authentifié, `ROLE_USER` ne suffit pas : être connecté ne donne pas le droit de voir les données du club voisin. Les rôles Symfony sont globaux et grossiers ; tes droits réels sont **contextuels** : « Jean est-il COACH de CE club ? » C'est le travail de `ClubVoter`. Quand un contrôleur appelle `denyAccessUnlessGranted('CLUB_STAFF', $equipe)`, Symfony interroge les voters : `supports()` filtre (« cet attribut et ce sujet me concernent-ils ? »), puis `voteOnAttribute()` tranche :

```php
return match ($attribute) {
    self::CLUB_ADMIN  => $this->hasMetaRole($user, $club, UserClubRole::ROLE_DIRIGEANT),
    self::CLUB_STAFF  => $this->isStaffOrAbove($user, $club),
    // ...
};
```

La décision croise trois choses : le rôle métier dans `UserClubRole`, le flag `isActive`, ET le statut `active` du workflow de validation — un membre `pending` n'a AUCUN droit. Seule exception, le court-circuit `ROLE_SUPER_ADMIN` (support cross-club), placé AVANT tout le reste et assumé comme tel. Relie ça à ta fiche *venaball-voters* : c'est le même contenu, vu ici sous l'angle du code.

**Le multi-tenant.** Venaball héberge plusieurs clubs dans UNE base : chaque club est un « tenant » (locataire). Le danger mortel de ce modèle est la fuite de données entre clubs. Ta défense a deux étages. Étage 1, `TenantResolver` : il détermine LE club actif de la session (club choisi en session, validé par `userBelongsToClub()` ; auto-sélection si un seul club) — et si le club en session n'est plus légitime, il le retire. Étage 2, `ClubVoter` : même si un attaquant forge un id dans une URL, le Voter compare le club de la RESSOURCE (`$subject->getClub()`) aux rôles réels de l'utilisateur. C'est ta parade anti-**IDOR** (Insecure Direct Object Reference) : deviner `/seances/42` ne sert à rien si la séance 42 appartient à une autre équipe — le Voter répond 403. Ta fiche *venaball-multi-tenancy* raconte cette histoire ; ici tu en tiens les deux fichiers sources. Et côté API mobile, la défense est encore plus radicale : aucun `{id}` dans les URLs de `PirbApiController`, tout dérive du porteur du jeton.

## À retenir

- Authentification (« qui es-tu ? » — firewalls) ≠ autorisation (« as-tu le droit ? » — Voters) : toujours séparer les deux devant le jury.
- L'API mobile est stateless : `ApiTokenHandler` revalide le Bearer token à chaque requête (hash SHA-256, expiration, message d'erreur volontairement générique).
- Les rôles Symfony sont globaux ; les droits réels de Venaball sont contextuels par club → `ClubVoter` croise rôle métier + `isActive` + statut `active` du workflow.
- Multi-tenant : `TenantResolver` fixe le club actif légitime, `ClubVoter` vérifie la ressource elle-même — double barrière anti-IDOR.
- Le court-circuit `ROLE_SUPER_ADMIN` est un choix assumé et documenté : compte support cross-club, sans `UserClubRole`.

## Mise en pratique

1. Ouvre `src/Security/ApiTokenHandler.php` : déroule à voix haute la chaîne « Bearer token → hash → findValide → UserBadge », puis explique pourquoi le message d'erreur ne distingue pas jeton inconnu / expiré.
2. Ouvre `src/Security/Voter/ClubVoter.php` : dans `voteOnAttribute()`, repère l'ordre exact des vérifications — court-circuit super-admin, extraction du club (Club direct ou `ClubAwareInterface`), garde-fou `!$club instanceof Club`, puis le `match`. Justifie cet ordre.
3. Dans `hasMetaRole()`, montre du doigt les TROIS conditions cumulées (`club identique`, `isActive`, `isStatusActive`) et explique ce qui se passerait si on oubliait la troisième (un inscrit non validé obtiendrait des droits).
4. Ouvre `src/Security/Tenant/TenantResolver.php`, méthode `getCurrentClub()` : raconte le scénario d'attaque qu'empêche la vérification `userBelongsToClub()` sur le club stocké en session, puis rapproche l'ensemble de tes fiches venaball-voters et venaball-multi-tenancy.

Résultat attendu : tu peux dérouler au jury le scénario complet « une joueuse du club A forge une URL du club B » et montrer, fichier par fichier, où l'attaque meurt (403).
