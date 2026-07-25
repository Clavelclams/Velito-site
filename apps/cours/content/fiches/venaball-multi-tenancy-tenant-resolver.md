---
titre: "Le multi-tenant : une seule base, des clubs hermétiquement cloisonnés"
projet: "venaball"
bloc: 2
themes: ["multi-tenant", "architecture"]
source: "src/Security/Tenant/TenantResolver.php"
date: 2026-07-25
---

## Le concept

Venaball héberge plusieurs clubs dans **une seule base de données** : c'est du multi-tenant (le « tenant » = le locataire = le club). Plutôt qu'une base par club (lourde à déployer), chaque table métier porte une colonne `club_id` et **toutes les requêtes sont filtrées côté serveur** — c'est la décision ADR-0003 dans `instruction/08_ADR.md`.

La pièce centrale est le `TenantResolver` (`src/Security/Tenant/TenantResolver.php`) : il décide quel club est « actif » pour la session. Le point de sécurité clé, c'est qu'il **ne fait jamais confiance à la session** — il revérifie l'appartenance à chaque lecture :

```php
// 1. Club déjà sélectionné en session
$activeClubId = $session->get('active_club_id');
if ($activeClubId) {
    $club = $this->clubRepository->find($activeClubId);
    // Vérifier que l'user appartient vraiment à ce club (sécurité).
    if ($club && ($this->isSuperAdmin() || $this->userBelongsToClub($user, $club))) {
        return $club;
    }
    // Si le club en session n'est plus valide, on le supprime
    $session->remove('active_club_id');
}
```

Un `active_club_id` forgé ou périmé en session est donc **ignoré et corrigé**. C'est prouvé par le test `testSessionForgeeVersUnAutreClubEstIgnoree` dans `tests/Unit/Security/Tenant/TenantResolverTest.php`. Seul un `ROLE_SUPER_ADMIN` (support) peut entrer dans n'importe quel club sans y être membre — exception explicite et commentée dans le code.

## Comment je l'explique au jury

J'ai choisi une base unique avec une colonne `club_id` sur chaque table métier plutôt qu'une base par club, parce que c'est beaucoup plus simple à déployer et à migrer, et c'est documenté dans mon ADR-0003. Le prix à payer, c'est une vigilance absolue : chaque requête doit être filtrée par club côté serveur, jamais côté front. Mon `TenantResolver` résout le club actif depuis la session, mais il revérifie à chaque appel que l'utilisateur appartient vraiment à ce club — une session manipulée ne donne jamais accès à un autre club. J'ai écrit un test unitaire qui forge exprès un `active_club_id` étranger en session et qui vérifie que le résolveur le rejette et corrige la session. Enfin, mon audit de juillet a identifié les entités où l'isolation reste implicite : je sais exactement où ma protection est contractuelle et où elle ne l'est pas encore.

## La question vicieuse du jury

**« Et si un développeur oublie le filtre `club_id` dans une nouvelle requête, qu'est-ce qui l'arrête ? »**

Réponse honnête : rien d'automatique au niveau SQL — c'est la limite connue de ce pattern, et je l'assume dans mon registre technique (RT-0001). Mes garde-fous sont en couches : le `ClubVoter` bloque l'accès aux entités d'un autre club via `ClubAwareInterface`, les tests anti-IDOR (`tests/Functional/Pirb/PirbSeancesIdorTest.php`) vérifient le comportement réel en HTTP, et mon document d'état réel (`31_ETAT_REEL`) recense les trois formes d'isolation présentes dans le code, y compris les entités encore en « isolation implicite » à contractualiser. Une évolution possible serait un filtre Doctrine global qui injecte le `club_id` automatiquement — je peux en expliquer le principe et pourquoi je ne l'ai pas encore fait (le super-admin cross-club le complique).
