---
titre: "ARENA"
avancement: 85
statut: "en cours"
maj: 2026-11-18
---

## C'est quoi

ARENA est une plateforme de gestion de tournois esport et sport amateur : inscriptions, brackets, saisie de scores, classements, diffusion publique par QR code. Elle sert d'abord les tournois de VEA (Velito Esport Amiens), avec l'ambition d'être utilisable par n'importe quelle association.

Le positionnement a été arrêté le 13/08/2026 et il structure tout le reste : ARENA ne concurrence pas Toornament ou Challonge, il les **complète**. La promesse tient en une phrase — « un club doit pouvoir tester ARENA sur UN tournoi sans rien migrer, et repartir sans rien perdre ». D'où l'import de résultats externes, l'export CSV et l'export JSON public, là où les plateformes établies font payer l'accès aux données.

## Comment c'est construit

**Stack** : Next.js 16 (App Router), TypeScript, Tailwind, Supabase (Postgres + RLS + Auth), Vitest. Déployé sur Vercel, sous-domaine `arena.velito.fr`, authentification partagée avec le reste de l'écosystème via le SSO du hub.

L'architecture est organisée autour d'une séparation stricte : les **algorithmes** (`lib/bracket.ts`, `bracket-double.ts`, `elo.ts`, `poules.ts`, `classement.ts`, `csv.ts`, `transitions.ts`) sont des modules purs sans aucune I/O, testés avec Vitest — 11 fichiers de tests. Les **accès aux données** (`lib/arena/actions.ts`, `lib/supabase/`) ne contiennent aucune règle métier. Le schéma de base vit dans `sql/001` à `sql/015`, quinze migrations numérotées, transactionnelles et versionnées avec le code. Les migrations sensibles sont testées sur un vrai Postgres en local (PGlite) avant la production : `sql/test_*.mjs`.

## Les décisions techniques et POURQUOI

- **Schéma Postgres dédié `arena.`** plutôt que des tables `public.arena_*` : cohérent avec `vea.`, `shared.`, `interactive.` — un seul pattern dans tout l'écosystème.
- **Réutilisation de `shared.organizations` et `shared.user_permissions`** : pas de système de droits propre à ARENA. Un seul modèle d'autorisation pour toutes les apps Velito.
- **Invariants critiques en triggers, pas en code** : un match `VALIDE` ne peut plus changer de score, les journaux et consentements sont append-only. Un trigger s'applique à tous les rôles, y compris `service_role` — contrairement à une policy RLS.
- **Topologie du bracket calculée, jamais stockée** : le parent de `(round, position)` est `(round+1, position/2)`. Une table de nœuds en moins, et zéro désynchronisation possible.
- **Deux classements coexistants** : points cumulés en public (récompense l'assiduité, bon signal pour une asso d'inclusion), ELO en interne (mesure la force, sert à équilibrer les poules et placer les têtes de série).
- **Minimisation RGPD dans le schéma** : année de naissance seule, pseudonymisation par défaut, et une contrainte `CHECK` qui rend impossible un profil public pour un mineur.
- **Client anonyme par défaut sur les routes publiques** : la RLS fait le contrôle d'accès, `service_role` n'est utilisé que pour les écritures après vérification des droits.
- **2026-11-12 — Espace joueur sans OIDC** (`app/moi`, migration 010) : ARENA est un sous-domaine de velito.fr, le cookie de session du hub suffit. L'id du joueur ne vient jamais du formulaire, il est retrouvé depuis le compte connecté.
- **2026-11-12 — Validation de score en une transaction** (migration 012, `arena.appliquer_validation`) : TypeScript calcule les placements, Postgres les applique tout ou rien ; `WHERE statut = 'TERMINE'` empêche la double validation. 29 tests PGlite. Voir la fiche « Valider un score en une seule transaction ».
- **2026-11-12 — Erreurs SQL vérifiées partout** : supabase-js ne lève pas d'exception sur une erreur SQL, chaque écriture vérifie `{ error }`. Un score refusé par la base s'affichait comme enregistré.
- **2026-11-14 — Score par sets** (migration 013, `lib/arena/sets.ts`, 18 tests) : le détail des sets fait foi, le serveur calcule le score en sets gagnés ; le bracket ne change pas. Le verrou du règlement §3 couvre maintenant les sets et l'équipe gagnante (trou trouvé par un test).
- **2026-11-14 — API publique par clé** (migration 014) : la clé ne donne aucun droit en plus (lecture anonyme), on ne stocke que son empreinte SHA-256, compteur atomique à 120 requêtes par minute. Voir la fiche « Une clé d'API qu'on ne peut pas voler ».
- **2026-11-14 — Pages légales écrites d'après le code** (`/mentions-legales`, `/confidentialite`) : une politique qui promet autre chose que ce que le code enregistre est pire que pas de politique.
- **2026-11-17 — Purge des tournois de test** (`sql/maintenance/`) : lister, désigner par token, transaction avec triggers coupés puis réactivés, testé sur copie. Voir la fiche « Supprimer en production sans trembler ».
- **2026-11-17 — Pas d'import en masse des membres VEA** : préinscrits, âges inconnus, mineurs, profils publics sans accord. À la place, « Créer mon profil Arena » depuis VEA, pré-rempli côté serveur (`lib/arena/suggestion-vea.ts`, 9 tests).
- **2026-11-17 — Défi au score** (migration 015) : atelier anonyme du Stade vers l'Emploi, aucune colonne pour une personne, tables isolées des tournois, écran rafraîchi toutes les 3 s plutôt qu'en temps réel. Utilisé en vrai le 17/11. Voir la fiche « L'anonymat qu'on ne peut pas trahir ».

## État d'avancement honnête

Le socle est solide et testé, et il a servi en vrai : l'écran du défi au score a tourné toute la matinée du 17/11/2026 au Stade vers l'Emploi. Ce qui fonctionne : cycle de vie d'un tournoi, élimination simple et double, poules, saisie et validation atomique des scores, sets, classement public, profils, espace joueur (`/moi`), page publique par QR code, widget pour site de club, exports CSV et JSON, API publique par clé, palmarès externe, module sport, fiches jeux, pages légales, défi au score.

Ce qui manque ou reste fragile :
- **Migrations lancées à la main** dans l'éditeur SQL Supabase. Elles sont testées sur PGlite avant, mais rien ne garde la trace de ce qui a été exécuté.
- **Aucun vrai tournoi encore joué sur ARENA** : les 5 tournois d'août étaient des tests et ont été supprimés le 17/11. L'étape « ouverture publique » attend un vrai tournoi VEA.
- **Les Server Actions ne sont pas testées** : seuls les modules purs (Vitest) et les fonctions SQL (PGlite) le sont.
- **Notifications** absentes (attendent le domaine d'envoi Resend).
- **Rattachement de pseudo** : une demande sur un pseudo qui n'a plus aucun tournoi n'est visible par aucun staff.
- **Palmarès externe** : la liste déroulante des joueurs ne passera pas à 200 joueurs (recherche par nom à faire).

## Prochaines étapes

1. Mener un vrai tournoi VEA de bout en bout sur ARENA (ouverture publique, démonstration pour le jury).
2. Corriger le rattachement d'un pseudo sans tournoi, et la recherche de joueur dans le palmarès externe.
3. Tracer les migrations exécutées (table `arena.migrations_appliquees` ou CLI Supabase).
4. Tester au moins une Server Action critique de bout en bout (saisie puis validation d'un score).
5. Notifications, une fois le domaine d'envoi validé.
