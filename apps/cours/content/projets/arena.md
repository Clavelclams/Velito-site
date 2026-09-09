---
titre: "ARENA"
avancement: 65
statut: "en cours"
maj: 2026-09-04
---

## C'est quoi

ARENA est une plateforme de gestion de tournois esport et sport amateur : inscriptions, brackets, saisie de scores, classements, diffusion publique par QR code. Elle sert d'abord les tournois de VEA (Velito Esport Amiens), avec l'ambition d'être utilisable par n'importe quelle association.

Le positionnement a été arrêté le 13/08/2026 et il structure tout le reste : ARENA ne concurrence pas Toornament ou Challonge, il les **complète**. La promesse tient en une phrase — « un club doit pouvoir tester ARENA sur UN tournoi sans rien migrer, et repartir sans rien perdre ». D'où l'import de résultats externes, l'export CSV et l'export JSON public, là où les plateformes établies font payer l'accès aux données.

## Comment c'est construit

**Stack** : Next.js 16 (App Router), TypeScript, Tailwind, Supabase (Postgres + RLS + Auth), Vitest. Déployé sur Vercel, sous-domaine `arena.velito.fr`, authentification partagée avec le reste de l'écosystème via le SSO du hub.

L'architecture est organisée autour d'une séparation stricte : les **algorithmes** (`lib/bracket.ts`, `bracket-double.ts`, `elo.ts`, `poules.ts`, `classement.ts`, `csv.ts`, `transitions.ts`) sont des modules purs sans aucune I/O, testés avec Vitest — 11 fichiers de tests. Les **accès aux données** (`lib/arena/actions.ts`, `lib/supabase/`) ne contiennent aucune règle métier. Le schéma de base vit dans `sql/001` à `sql/008`, huit migrations numérotées, transactionnelles et versionnées avec le code.

## Les décisions techniques et POURQUOI

- **Schéma Postgres dédié `arena.`** plutôt que des tables `public.arena_*` : cohérent avec `vea.`, `shared.`, `interactive.` — un seul pattern dans tout l'écosystème.
- **Réutilisation de `shared.organizations` et `shared.user_permissions`** : pas de système de droits propre à ARENA. Un seul modèle d'autorisation pour toutes les apps Velito.
- **Invariants critiques en triggers, pas en code** : un match `VALIDE` ne peut plus changer de score, les journaux et consentements sont append-only. Un trigger s'applique à tous les rôles, y compris `service_role` — contrairement à une policy RLS.
- **Topologie du bracket calculée, jamais stockée** : le parent de `(round, position)` est `(round+1, position/2)`. Une table de nœuds en moins, et zéro désynchronisation possible.
- **Deux classements coexistants** : points cumulés en public (récompense l'assiduité, bon signal pour une asso d'inclusion), ELO en interne (mesure la force, sert à équilibrer les poules et placer les têtes de série).
- **Minimisation RGPD dans le schéma** : année de naissance seule, pseudonymisation par défaut, et une contrainte `CHECK` qui rend impossible un profil public pour un mineur.
- **Client anonyme par défaut sur les routes publiques** : la RLS fait le contrôle d'accès, `service_role` n'est utilisé que pour les écritures après vérification des droits.

## État d'avancement honnête

Le socle est solide et testé. Ce qui fonctionne : création et cycle de vie d'un tournoi, élimination simple et double, poules avec phase finale, saisie et validation des scores, classement public, profils joueurs, page publique par QR code, export CSV et JSON, import de résultats Toornament, module sport (équipes, ELO, terrains), fiches jeux.

Ce qui manque ou reste fragile :
- **Aucun suivi automatique des migrations appliquées** : je les exécute à la main dans l'éditeur SQL Supabase. Ça tient parce que je suis seul ; ça ne tiendrait pas à deux.
- **Pas de procédure d'annulation tracée** pour un résultat validé par erreur : la correction exige de désactiver le trigger en base, et rien ne l'écrit dans `arena.logs`.
- **Régénération du `qr_token`** possible en SQL mais absente de l'interface staff.
- **Attribution automatique des badges** (Lot 4) posée en schéma, pas implémentée.
- **Pas de test de contrat sur l'API Toornament** : un changement de leur format casserait l'import sans alerte.

## Prochaines étapes

1. Outiller le suivi des migrations (CLI Supabase ou table `arena.migrations_appliquees`) avant tout travail à plusieurs.
2. Procédure d'annulation d'un résultat validé, avec motif obligatoire écrit dans `arena.logs`.
3. Bouton de régénération du `qr_token` côté staff.
4. Attribution automatique des badges.
5. Étendre les tests aux Server Actions (aujourd'hui seuls les modules purs sont couverts).
