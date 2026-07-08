# État d'avancement — Velito Compta

> Analyse au 2026-07-07. **Barème : 100 % = fonctionnalité terminée ET validée.**
> ⚠️ Distinction clé : tout le code ci-dessous est **type-checké (tsc exit 0) et
> couvert par 224 tests unitaires**, mais **rien n'a encore été exécuté contre
> Supabase ni en navigateur**. Un `%` « codé » plafonne donc à ~90 % tant que le
> parcours réel n'est pas validé. La colonne « État » reflète le code ; le
> jalon manquant (déploiement + test) est traité au §4.

---

## 1. Situation dans le hub Velito (7 apps du monorepo)

| App | Fichiers TS/TSX | Rôle | Maturité (estimée) |
|---|---|---|---|
| `vea` | 139 | Site association VEA | La plus grosse — mature |
| `compta` | 73 | **Pré-comptabilité VEA/VENA** | **Voir détail ci-dessous** |
| `interactive` | 63 | Velito Interactive | Développée |
| `hub` | 61 | Portail / SSO velito.fr | Socle de référence (compta en est adaptée) |
| `vena` | 30 | Site SASU VENA | Intermédiaire |
| `arena` | 3 | Velito Arena | **Embryon / stub** |
| `prevention` | 2 | Prévention numérique | **Embryon / stub** |

> ⚠️ **Honnêteté** : je n'ai audité en profondeur QUE `compta` (c'est ce qu'on a
> construit ensemble). Les autres apps sont situées par taille de code, pas par
> revue réelle. La source de vérité fiable de l'avancement global reste ta base
> Notion « Velito Dev Tracker » (skill `velito-dev-sync`).

**Poids de compta dans le hub** : ~15 % des fichiers, mais c'est l'app la plus
**riche en logique métier testée** (14 fichiers de tests, 224 cas — probablement
la mieux couverte du monorepo).

---

## 2. Compta — page par page (ce qui est réellement codé)

| Route | Fonction | État |
|---|---|---|
| `/login` | Authentification (default-deny, liste blanche emails) | **100 %** |
| `/` (accueil) | Liste des entités → liens | **100 %** |
| `/[entiteId]` | Tableau de bord (solde, mois, répartition) | **95 %** |
| `/[entiteId]/categories` | CRUD catégories + archivage + mapping compte PCG | **90 %** |
| `/[entiteId]/transactions` | Liste + lien pièces manquantes | **100 %** |
| `/[entiteId]/transactions/nouvelle` | Saisie (→ génère l'écriture) | **100 %** |
| `/[entiteId]/transactions/[id]` | Édition/suppression + justificatifs | **100 %** |
| `/[entiteId]/transactions/sans-justificatif` | Audit pièces manquantes | **100 %** |
| `/[entiteId]/import` | Import CSV relevé (→ écritures) | **100 %** |
| `/[entiteId]/export` + `/telecharger` | Export CSV expert-comptable | **100 %** |
| `/[entiteId]/comptabilite` | Hub compta (seed PCG, resync, liens) | **100 %** |
| `/[entiteId]/comptabilite/etats` | Bilan + compte de résultat | **95 %** |
| `/[entiteId]/comptabilite/impot` | Estimation IS | **90 %** |
| `/[entiteId]/comptabilite/documents` | Décision associé unique + rapport gestion | **85 %** |
| `/[entiteId]/comptabilite/fec` (route) | Export FEC officiel | **100 %** |

**Moyenne pages ≈ 96 %** (en « codé »). Manques mineurs : édition du *nom* d'une
catégorie non branchée en UI (le repo le sait faire), pas de graphe d'évolution
mensuelle, trames docs avec blancs « …… » à compléter.

---

## 3. Compta — bloc par bloc (référentiel du CDC de finalisation)

| Lot / Bloc | Contenu | État |
|---|---|---|
| **Lot 1 — Noyau** (remplace l'Excel) | auth, multi-entités, CRUD, import, dashboard, export | **97 %** |
| **Lot 2 — Justificatifs** | Storage privé + upload + consultation + pièces manquantes | **90 % (code)** |
| ↳ Bloc 2.3 — **OCR / IA** | lecture ticket → pré-remplissage | **0 %** (bloqué : choix fournisseur + clé API) |
| **Lot 3 — Facturation VENA** | devis → facture → paiement, PDF, relances | **0 %** (non commencé) |
| **Lot 5.1 — PCG + partie double** | 3 tables + trigger d'équilibre déféré | **100 %** |
| **Lot 5.2 — Pont transaction→écriture** | génération auto + robustesse (modif/import/suppr) | **100 %** |
| **Lot 5.3 — FEC** | format officiel A47 A-1 LPF, 18 champs | **100 %** |
| **Lot 5.4 — Bilan + compte de résultat** | invariant d'équilibre prouvé | **95 %** |
| **Lot 5.5 — IS indicatif** | barème 2026 daté, tranches, acomptes | **90 %** |
| **Lot 5.6 — Liasse 2065/2033** | Cerfa brouillon | **0 %** (le plus fastidieux, faible valeur) |
| **Bloc 4.1/4.2 — Documents juridiques** | approbation comptes + rapport (SASU) | **85 %** |
| **Mapping catégorie → compte** | FEC/états précis | **100 %** |
| **Sécurité (RLS + middleware)** | cloisonnement structurel par entité | **100 %** |

---

## 4. LE manque critique (ce qui empêche le 100 %)

**Aucune ligne n'a tourné en conditions réelles.** Concrètement il reste à :

1. **Appliquer les 5 migrations** `sql/01` → `sql/05` dans Supabase (SQL Editor).
2. **Créer le compte** + seeder les entités (VEA, VENA) + la liste blanche email.
3. **Lancer `npm run dev`** (port 3006) et dérouler le parcours complet.
4. **Corriger les bugs d'intégration** qui apparaîtront forcément (rendu, RLS,
   Storage, trigger déféré, upload navigateur…).
5. **Tests d'intégration/e2e** (aujourd'hui : 0 — seulement de l'unitaire pur).

Tant que ce n'est pas fait, chaque page « codée » doit être lue comme
**« ~90 % : logique écrite et testée, intégration non validée »**.

---

## 5. Verdict chiffré

| Vue | % | Lecture |
|---|---|---|
| **MVP utilisable** (Lot 1 seul) | **~97 % codé / 0 % validé** | Remplace l'Excel dès qu'il tourne |
| **Vision complète** (tous lots CDC) | **~72 %** | Manquent : facturation (Lot 3), OCR, liasse |
| **Socle partie double** (l'ambition « impossible ») | **~92 %** | FEC/bilan/résultat/IS faits ; liasse non |
| **Qualité / architecture / tests** | **~95 %** | Couches strictes, 224 tests, RLS, doc |
| **Validation production** | **0 %** | ⚠️ jamais exécuté |

**Synthèse honnête** : en tant que *réalisation logicielle défendable* (jury CDA),
compta est à **~90 %**. En tant que *produit réellement utilisable au quotidien*,
elle est à **~40 %** — parce qu'il manque l'étape la moins glorieuse mais la plus
décisive : **la faire tourner pour de vrai**.

**Prochaine action à plus forte valeur : déployer + tester, pas coder plus.**
