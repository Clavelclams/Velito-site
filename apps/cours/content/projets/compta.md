---
titre: "Velito Compta"
avancement: 75
statut: "en prod"
maj: 2026-07-11
---

## C'est quoi

Outil de pré-comptabilité interne pour mes deux structures : VEA (association
loi 1901) et VENA (SASU). Remplace mes fichiers Excel : saisie,
catégorisation, import de relevés, trésorerie, exports pour
l'expert-comptable. Ce n'est PAS un logiciel de comptabilité certifié : il
alimente le comptable, il ne le remplace pas. Deuxième réalisation
professionnelle CDA (avec MABB). **En production sur compta.velito.fr.**

## Comment c'est construit

App Next.js 16 + TypeScript strict dans le monorepo (`apps/compta`, port
3006). Architecture 3 couches strictes : `app/` (présentation, routing par
entité `/[entiteId]/…`), `lib/services/` (métier, fonctions pures testées),
`lib/repositories/` (accès données, client Supabase injecté). Base : projet
Supabase velito partagé — 5 migrations SQL commentées : noyau (5 tables),
RLS, stockage justificatifs, **partie double** (compte/écriture/lignes,
plan PCG), pont catégorie↔compte. Sécurité 3 étages : middleware
default-deny + liste blanche, revérification par page, RLS Postgres.

## Les décisions techniques et POURQUOI

- **Montants en centimes entiers (bigint)** : jamais de flottant, pas de
  numeric (renvoyé en string par le client JS). Parsing saisie par analyse
  de texte, jamais parseFloat. 23 tests.
- **HT en colonne générée** (TTC−TVA calculé par Postgres) : incohérence
  physiquement impossible.
- **FK composite (categorie_id, entite_id)** : anti-mélange VEA/VENA
  garanti par la structure, avant même la RLS.
- **SQL manuel, pas Prisma** : RLS non gérée par Prisma + Prisma racine en
  MySQL legacy.
- **Projet Supabase partagé avec le hub** : arbitrage coût/simplicité,
  compensé par liste blanche (authentifié ≠ autorisé) + backfill profil.
- **Partie double (journal, comptes PCG)** : extension au-delà du CDC Lot 1,
  pont facultatif catégorie→compte pour générer des écritures.

## État d'avancement honnête

**En prod.** Réalisé : Lot 1 quasi complet (auth, multi-entités, CRUD
catégories, saisie/édition transactions, liste, import de relevés, exports
dont route de téléchargement), Lot 2 entamé (stockage justificatifs +
détection "sans justificatif"), et au-delà du CDC : journal en partie
double, états, page impôt, export FEC. À vérifier/mesurer : utilisation
RÉELLE au quotidien (le jalon de décision du CDC), couverture de tests des
nouveaux modules (partie double notamment), conformité du FEC (le CDC le
classait Lot 4+ "reporté" — il est arrivé plus tôt que prévu : à valider
avec l'expert-comptable avant de s'y fier).

## Prochaines étapes

1. Utiliser l'outil au quotidien 2 semaines → jalon CDC : est-ce que ça
   remplace vraiment Excel ?
2. Tests unitaires sur la partie double (équilibre débit/crédit) — matière
   Bloc 3 jury
3. Faire valider un export FEC par l'expert-comptable avant tout usage réel
4. Mettre à jour cette fiche après ces vérifications
