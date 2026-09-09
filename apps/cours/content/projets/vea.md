---
titre: "VEA — Velito Esport Amiens"
avancement: 75
statut: "en prod"
maj: 2026-09-04
---

## C'est quoi

VEA est le site et le back-office de l'association Velito Esport Amiens, qui utilise l'esport comme outil d'inclusion pour les jeunes des quartiers d'Amiens. Ce n'est pas une vitrine : la partie publique (agenda, événements, galeries, inscriptions) ne représente qu'une fraction du code. L'essentiel est un **outil de gestion associative** — comptabilité, documents, rapports d'activité, heures de bénévolat, prestations, tournois, récompenses, préinscriptions, gamification des participants.

C'est aussi l'application qui produit les chiffres des dossiers de subvention : sans données d'impact, pas de financements.

## Comment c'est construit

**Stack** : Next.js 16 (App Router), TypeScript, Tailwind, Supabase (Postgres + RLS + Auth + Storage). Déployé sur Vercel, sur `vea.velito.fr`. Authentification déléguée au hub.

Le schéma vit dans le namespace `vea.` avec une quinzaine de fichiers SQL versionnés, plus des fonctions et triggers dans `shared.` pour ce qui touche à l'identité. Les modules d'administration sont sous `app/admin/`, la partie publique à la racine.

## Les décisions techniques et POURQUOI

- **Migration de MySQL/Prisma vers Supabase** : un seul système de données pour tout l'écosystème Velito, avec la RLS comme socle d'autorisation. Le client Prisma a été remplacé par un stub `Proxy` qui échoue à l'usage plutôt qu'au chargement, pour permettre une migration progressive sans casser le build.
- **Fusion pré-inscrit → compte sur trois critères, pas un** : la v1 rapprochait sur le seul téléphone, ce qui mélangeait les fratries partageant le numéro d'un parent. La v2 exige téléphone + prénom + nom normalisés, et ne fusionne pas en cas de doute — une non-fusion se corrige, une fusion erronée est très difficile à démêler.
- **Fonctions `security definer` avec `search_path` figé** pour les helpers de droits appelés par les policies RLS.
- **Scripts SQL idempotents** (`create or replace`, `drop … if exists`) : rejouables sans risque, ce qui compte quand on les exécute à la main.

## État d'avancement honnête

Le back-office est utilisé réellement par l'association : compta, documents, rapports, événements, heures de bénévolat, préinscriptions. La partie publique est en ligne.

Ce qui pèse :
- **Aucun test automatisé** sur 26 000 lignes, dont un module de comptabilité. C'est le plus gros trou de qualité de l'écosystème après le hub.
- Plusieurs fichiers SQL sont des **scripts de diagnostic ou de correction ponctuelle** (`vea-diagnostic-doublons`, `vea-grant-admin-alban`) mélangés aux vraies migrations : l'historique du schéma n'est pas nettement séparé de l'outillage d'exploitation.
- Le stub Prisma est une dette : rien n'alerte si un chemin oublié l'appelle en production.
- La fusion automatique reste un pari sur l'identité : deux homonymes seraient toujours fusionnés à tort.

## Prochaines étapes

1. Séparer `sql/migrations/` de `sql/exploitation/` pour que l'historique du schéma soit lisible.
2. Tester au minimum le module de comptabilité — c'est celui où une erreur coûte de l'argent.
3. Retirer les derniers imports Prisma et supprimer le stub.
4. Remplacer la fusion automatique par une validation explicite côté animateur, ou un code de préinscription.
