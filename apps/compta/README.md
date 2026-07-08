# Velito Compta — compta.velito.fr

Outil de pré-comptabilité interne pour VEA (association loi 1901) et VENA (SASU).
Remplace les fichiers Excel. **N'est pas** un logiciel de comptabilité certifié :
il alimente l'expert-comptable, il ne le remplace pas.

- CDC : `docs/cdc/CDC_Velito_Compta.docx`
- Réalisation professionnelle CDA (jury avril 2027)
- Port dev : `3006` — `npm run dev` depuis `apps/compta`

## Architecture en couches

Le projet sépare strictement trois responsabilités. Règle : **une couche ne
parle qu'à la couche directement en dessous**, jamais par-dessus.

```
┌─────────────────────────────────────────────┐
│ PRÉSENTATION      app/ + components/        │  ce que voit l'utilisateur
├─────────────────────────────────────────────┤
│ LOGIQUE MÉTIER    lib/services/             │  les règles (calculs, validations)
├─────────────────────────────────────────────┤
│ ACCÈS DONNÉES     lib/repositories/         │  les requêtes vers Supabase
├─────────────────────────────────────────────┤
│ BASE DE DONNÉES   Supabase (Postgres + RLS) │  schéma dans sql/
└─────────────────────────────────────────────┘
```

Réponse à la question type du jury « si vous ajoutez une fonctionnalité, où
codez-vous ? » :

| Type de modification | Emplacement unique |
|---|---|
| Nouvel écran, nouveau bouton | `app/` ou `components/` |
| Nouvelle règle de calcul (ex : solde par catégorie) | `lib/services/` |
| Nouvelle requête base (ex : lister par période) | `lib/repositories/` |
| Nouvelle table ou colonne | `sql/` (migration) |

## Rôle de chaque dossier

| Dossier | Couche | Contenu |
|---|---|---|
| `app/` | Présentation | Pages (App Router Next.js) : 1 route = 1 dossier avec `page.tsx`. Aucune logique métier, aucune requête directe. |
| `components/` | Présentation | Composants React réutilisables (tableau de transactions, formulaire de saisie…). |
| `lib/services/` | Métier | Fonctions pures : calcul de solde, agrégation par catégorie, validation d'une transaction, conversion centimes ↔ euros. Testables unitairement sans base de données. |
| `lib/repositories/` | Accès données | Toutes les requêtes Supabase, une seule fois, à un seul endroit. Requêtes paramétrées (le client Supabase le garantit). |
| `lib/supabase/` | Infra | Création des clients Supabase (navigateur / serveur). Pattern `@supabase/ssr`, identique au hub. |
| `types/` | Transverse | Types TypeScript partagés (`Transaction`, `Entite`, `Categorie`…) — miroir du schéma SQL. |
| `sql/` | Base | Migrations SQL numérotées, commentées en français, exécutées dans Supabase. Même pattern que `apps/hub/sql/`. |

## Décisions techniques (journal CDA)

| Date | Décision | Justification |
|---|---|---|
| 2026-07-05 | App dans le monorepo (`apps/compta`) | Pattern établi : 1 sous-domaine = 1 app. Packages partagés, conventions communes. |
| 2026-07-05 | TypeScript strict | Convention écosystème + fiabilité : le typage empêche de mélanger centimes/euros, string/number sur des montants. |
| 2026-07-05 | Migrations SQL manuelles (pas Prisma) | Le Prisma racine est en MySQL (legacy VEA). Supabase = Postgres + RLS, que Prisma ne gère pas nativement. SQL écrit à la main = défendable ligne par ligne au jury. |
| 2026-07-05 | Pas de SSO au démarrage | Outil mono-utilisateur. Supabase Auth standalone, prêt à rejoindre le SSO hub plus tard (même provider). |
| 2026-07-06 | Middleware "default deny" | Contrairement au hub (site public), Compta est 100 % privé : toute route sans session redirige vers /login. Symétrique du default-deny RLS côté base. |
| 2026-07-06 | Parsing des montants par analyse de texte | parseFloat("12,50")=12 et 12.10*100=1209.999… : la saisie est découpée en chaînes (entiers uniquement), aucun flottant ne transporte un montant. Testé (23 cas). |
| 2026-07-06 | Inscriptions publiques désactivées | Compte créé à la main dans le Dashboard Supabase (Authentication > Sign up : OFF). Pas de page register = pas de surface d'attaque inutile. |
| 2026-07-06 | Repositories avec client injecté | Le client Supabase est passé en paramètre (injection de dépendance) : même code pour serveur/navigateur, testable avec un faux client. |
| 2026-07-06 | Réutilisation du projet Supabase du hub (pas de projet dédié) | Arbitrage coût/simplicité (limite de projets du plan gratuit). Conséquences traitées : liste blanche d'emails dans le middleware (authentifié ≠ autorisé, auth.users étant partagé), backfill manuel du profil (le trigger ne voit que les nouveaux comptes). Risque documenté : la clé service_role du projet donne accès aux données compta. |
| 2026-07-07 | Routing par entité sous `/[entiteId]/…` + validation dans le layout | Une seule vérification d'accès (RLS via `getEntite`) pour tout l'espace d'une entité ; un id inconnu ou non possédé renvoie un 404 neutre (ne révèle rien). Les pages enfants n'ont plus à re-vérifier le contexte. |
| 2026-07-07 | Catégories : archivage doux (`active=false`) au lieu de suppression | Supprimer une catégorie utilisée casserait l'historique des transactions classées dessous. Le `type` (recette/dépense) est également non modifiable après création, pour la même raison d'intégrité. |
| 2026-07-07 | Le `type` de catégorie est repris du contexte, jamais d'un champ libre modifiable | Cohérence : entite_id vient de l'URL, pas du formulaire → impossible de créer une catégorie chez une autre entité (double barrière avec la RLS). |
| 2026-07-07 | Fichiers `*.test.ts` exclus du `tsconfig` | Ils importent le module en `.ts` explicite (nécessaire pour l'exécution directe par `node`, type-stripping), ce que `moduleResolution: bundler` refuse en compilation. Ils tournent à part via `node`, hors du build. |
| 2026-07-07 | Saisie transaction : le formulaire n'envoie que des CHAÎNES au service | La page/formulaire ne calcule jamais un montant. La conversion euros→centimes se fait dans `services/transactions` en déléguant à `montants.ts` (frontière unique). Testé (19 cas : montants, TVA≤TTC, dates réelles, libellé). |
| 2026-07-07 | Liste transactions : 2 requêtes + map plutôt qu'une jointure SQL | On charge transactions et catégories séparément, on résout les noms côté serveur. Plus simple à lire/tester ; suffisant au volume mono-utilisateur. Les catégories archivées sont incluses (une vieille transaction peut y pointer). |
| 2026-07-07 | Infra de test : résolveur d'alias `@/` (`scripts/alias-loader.mjs`) | Node exécute le TS par type-stripping mais ne lit pas les alias tsconfig. Un resolve hook traduit `@/…` en chemin réel → `npm test` lance tous les `*.test.ts` sans compilation ni dépendance externe. |
| 2026-07-07 | CRUD transaction complet : édition/suppression réutilisent la validation de la création | `modifierTransactionAction` rappelle `preparerNouvelleTransaction` (une seule source de vérité pour valider/convertir). L'édition ne réécrit jamais `entite_id` (type `ChampsTransaction = Omit<…,"entite_id">`). Suppression : cascade sur les justificatifs, confirmée côté client. |
| 2026-07-07 | Frontière centimes↔euros bidirectionnelle dans `montants.ts` | Ajout de `centimesVersSaisie` (1250 → "12,50") pour pré-remplir un champ éditable, distinct de `formaterCentimes` ("12,50 €", affichage). Aller-retour testé : `eurosVersCentimes(centimesVersSaisie(x)) === x`. |
| 2026-07-07 | Tableau de bord : calculs isolés dans un service pur testé | `solde`, `totauxParType`, `filtrerMois`, `repartitionParCategorie` ne touchent pas la base → 15 tests unitaires (solde négatif, mois zéro-paddé, pourcentages sommant à 100). Fiabilité des chiffres = exigence CDA (CDC §4). Filtrage du mois par préfixe "AAAA-MM" (aucun décalage de fuseau). |
| 2026-07-07 | Export CSV via Route Handler (pas une page) + service pur | Le téléchargement renvoie un fichier (Content-Disposition), donc un `route.ts` distinct de la page. Format Excel-FR : séparateur `;`, décimales virgule, BOM `﻿` (accents), échappement RFC 4180 testé (libellé contenant `;` ou `"`). 17 tests. Sécurité : `getEntite` (RLS) → 404 si l'entité n'est pas à moi, pas d'export par URL devinée. |
| 2026-07-07 | Import CSV : parseur pur partagé client (aperçu) ↔ serveur (revalidation) | Le même service `import-csv` parse pour la prévisualisation ET le serveur repasse chaque ligne par `preparerNouvelleTransaction` en forçant `entiteId` (le client n'est pas de confiance). Découpage RFC 4180, montant signé → type, insertion en lot en statut `a_verifier`. 24 tests (guillemets, dates, montants signés). |
| 2026-07-07 | **Lot 1 livré** (remplace l'Excel) | Auth, multi-entités, CRUD transactions complet, catégories, tableau de bord, export, import CSV. 6 services purs, 109 tests unitaires verts, type-check propre. Reste : Lot 2 (justificatifs + IA), puis socle partie double (voir ROADMAP/CDC de finalisation). |
| 2026-07-07 | Justificatifs : Storage privé + RLS par chemin (migration `sql/03`) | Bucket `justificatifs` privé ; policies sur `storage.objects` réutilisant `est_proprietaire_entite((storage.foldername(name))[1]::uuid)` → même cloisonnement que les tables. Upload direct navigateur→Storage (RLS), métadonnées en base via action, consultation par URL signée 60 s. Validation type/taille dans un service pur (19 tests). ⚠️ Migration à exécuter dans Supabase (non vérifiable en local). |
| 2026-07-07 | Détection pièces manquantes (Bloc 2.4) | `transactionsSansJustificatif` (pur, testé) = différence entre toutes les transactions et l'ensemble de celles ayant ≥ 1 justificatif (2 requêtes + Set, pas de LEFT JOIN SQL). Page dédiée réutilisant `TableauTransactions`. |
| 2026-07-07 | Socle PARTIE DOUBLE — fondation (Bloc 5.1, migration `sql/04`) | 3 tables (compte/ecriture/ligne_ecriture) à côté de la partie simple (ne la remplace pas). Équilibre Σdébit=Σcrédit garanti par un **constraint trigger DÉFÉRÉ** (vérifié au commit, avec garde-fou sur la suppression en cascade). `compte.classe` = 1er chiffre du numéro (CHECK). Service pur `comptabilite` (équilibre, classes, PCG_BASE) + 19 tests. ⚠️ Migration à appliquer dans Supabase. Reste : repo + pont transaction→écriture (5.2) + FEC (5.3). |
| 2026-07-07 | Pont partie simple → partie double (Bloc 5.2) | Générateur PUR `genererLignesEcriture` : une transaction (TTC+TVA) → écriture équilibrée (dépense : débit charge + débit 44566 / crédit 512 ; recette : débit 512 / crédit produit + crédit 44571). 13 tests (équilibre garanti dans tous les cas, refus si compte TVA manquant). Repos `comptes` (+ seed PCG en lot) et `ecritures` (lignes insérées en UN appel pour que le trigger différé les voie ensemble ; rollback applicatif si échec). Reste à câbler : génération auto à la saisie + seed PCG + écran écritures, puis FEC (5.3). |
| 2026-07-07 | Export FEC (Bloc 5.3) — livrable phare | Service pur `genererFec` : format officiel (art. A47 A-1 LPF), 18 colonnes, tabulation, dates AAAAMMJJ, montants virgule, neutralisation tab/newline, ordre déterministe (date puis création), EcritureNum séquentiel. 19 tests. Route `/[entiteId]/comptabilite/fec` + page Comptabilité (compteurs + bouton). ⚠️ Fichier non vide seulement une fois les écritures peuplées par le câblage du pont (à faire). |
| 2026-07-07 | **Câblage du pont** (Bloc 5.2b) — socle vivant | Seed PCG (action + bouton, idempotent) ; `construireEcritureDepuisTransaction` résout les comptes par défaut (dépense→606, recette→706, +512/44566/44571) et bâtit l'écriture équilibrée (7 tests). Génération AUTO de l'écriture à la création d'une transaction, en **best-effort** (si PCG absent, la transaction reste valide en partie simple, l'écriture est ignorée). → le FEC se remplit désormais réellement. Limites connues : régénération à la modif + génération à l'import CSV + mapping fin catégorie→compte = prochains increments. |
| 2026-07-07 | Bilan + compte de résultat (Bloc 5.4) | Service pur `etats-financiers` : soldes par compte, compte de résultat (charges 6 / produits 7 / résultat), bilan (actif = soldes débiteurs, passif = créditeurs + résultat). **Invariant prouvé** : bilan équilibré (actif=passif) dès que les écritures le sont — testé sur un scénario complet ET en cas de perte (12 tests). Page `/comptabilite/etats`. États INDICATIFS (mention à valider par l'expert-comptable). Montants en centimes, zéro arrondi. |
| 2026-07-07 | Calcul IS indicatif (Bloc 5.5) | Service pur `impot-societe` : barème 2026 **daté** (paramètre : 15 % jusqu'à 42 500 €, 25 % au-delà), tranches, acompte trimestriel. Pas d'IS sur perte. 12 tests (30 k€→4,5 k€ ; 50 k€ éligible→8 250 € ; non éligible→12 500 €). Page `/comptabilite/impot` (société uniquement ; note pour asso, conditions PME et amendement PLF 100 k€). INDICATIF : résultat fiscal ≠ comptable. |
| 2026-07-07 | Documents juridiques (Bloc 4.1/4.2) | Service pur `documents-juridiques` : trames décision d'associé unique (approbation des comptes) + rapport de gestion, rendu HTML autonome imprimable (styles @page, échappement). Résultat repris de la compta. Génération client via fenêtre d'impression (→ PDF), zéro dépendance. 12 tests. Ciblé SASU ; note pour asso (PV d'AG distinct). Blancs « …… » explicites plutôt que valeurs inventées. |
| 2026-07-07 | Mapping catégorie → compte PCG (migration `sql/05`) | Colonne `categorie.compte_id` (nullable, FK composite `(compte_id, entite_id)` anti-fuite). Sélecteur de compte dans le formulaire de catégorie, filtré par type (dépense→classe 6, recette→classe 7). Le pont utilise ce compte comme contrepartie si défini, sinon retombe sur 606/706 (rétro-compatible). → FEC et états plus précis. Tests de l'override. |
| 2026-07-07 | Robustesse du pont : synchronisation écriture ↔ transaction | Module serveur `lib/comptabilite-sync` (pas une "use server", car ses helpers prennent un SupabaseClient — args d'action non sérialisables). `synchroniserEcriture` idempotent (supprime l'ancienne + régénère) → utilisé à la CRÉATION et à la MODIFICATION ; `genererEcrituresLot` à l'IMPORT ; suppression de la transaction nettoie l'écriture liée (plus d'orphelines). La compta reste le miroir exact des transactions. Best-effort partout. |
| 2026-07-07 | Resync global (backfill) | `resynchroniserToutAction` régénère les écritures de TOUTES les transactions d'une entité — corrige le cas où le PCG est initialisé après coup (transactions existantes sans écriture). Bouton « Régénérer les écritures » sur la page Comptabilité. |
| 2026-07-07 | Journal des écritures + balance générale | Service pur `balanceGenerale` (par compte : débit/crédit/solde ; invariant total débit = total crédit, 5 tests). Page `/comptabilite/journal` : balance + détail des écritures en partie double (ce que le FEC exporte, mais lisible à l'écran). |
