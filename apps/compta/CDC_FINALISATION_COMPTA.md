# CDC de finalisation — Velito Compta

> Document d'exécution. Rédigé le 2026-07-07. Complète (sans remplacer) :
> - `docs/cdc/CDC_Velito_Compta.docx` (le *quoi* — conception, périmètre, positionnement)
> - `apps/compta/ROADMAP_COMPTA.md` (la *direction* — phases, décision partie double)
>
> Ici : le **comment finir**, bloc par bloc, couche par couche, avec un critère
> de « fini » (Definition of Done) pour chaque bloc. Tu builds directement dessus.

---

## Mode d'emploi de ce document

Chaque bloc suit **toujours** la même structure, pour que tu saches exactement où coder
(c'est la question type du jury CDA : « si vous ajoutez une fonctionnalité, où codez-vous ? ») :

- **But** — ce que le bloc apporte.
- **Déjà là** — ce qui existe et que tu réutilises.
- **À construire** — découpé par couche : `sql/` → `repositories/` → `services/` → `app/` + `components/`.
- **Fini quand** — la checklist de validation. Tant qu'une case n'est pas cochée, le bloc n'est pas fini.
- **Sécurité / Tests / Jury** — les points à ne pas oublier et l'angle de soutenance.

Règle d'architecture rappelée : **une couche ne parle qu'à celle juste en dessous.**
Présentation → Services → Repositories → SQL. Jamais de saut.

---

## 0. État des lieux (point de départ réel)

### ✅ Déjà fait (solide, réutilisable tel quel)
- **Auth** : `app/login/` (form + server action), `middleware.ts` en *default-deny* (toute route sans session → `/login`), liste blanche d'emails.
- **Base** : `sql/01_schema_noyau.sql` (5 tables : utilisateur, entite, categorie, transaction, justificatif) + `sql/02_rls_noyau.sql` (RLS default-deny sur les 5 tables).
- **Types** : `types/database.ts` — miroir exact du schéma, y compris `NouvelleTransaction` (DTO de saisie).
- **Service montants** : `lib/services/montants.ts` — conversion euros↔centimes par analyse de texte, formatage, validations. Testé (23 cas).
- **Repository entités** : `lib/repositories/entites.ts` — `listerEntites()`, client injecté.
- **Accueil** : `app/page.tsx` — liste les entités (VEA / VENA).

### ⛔ Reste à faire (l'objet de ce document)
- Catégories : aucune couche (repo / service / UI).
- Transactions : type + service montants OK, mais **aucun** repository, **aucune** UI (ni saisie, ni liste, ni édition).
- Import CSV, tableau de bord, export : rien.
- Justificatifs : table OK, mais Storage non câblé, pas d'upload, pas d'OCR.
- Facturation VENA : rien.
- Documents juridiques (PV, rapport) : rien.
- Socle partie double (PCG, FEC, bilan, liasse) : rien.

### Conclusion
Le **Lot 1 du CDC v1.0 est à peine entamé** : il reste tout le CRUD transaction, l'import, le dashboard et l'export. **C'est la priorité absolue** — c'est lui qui « remplace l'Excel ». Le reste vient après.

---

## PHASE 1 — Terminer le noyau et le rendre utile (aucune refonte de modèle)

---

### BLOC 1.1 — Plan de catégories (CRUD)
*Fondation : sans catégories, on ne peut pas classer une transaction.*

**But.** Gérer les postes de recette/dépense propres à chaque entité.

**Déjà là.** Table `categorie` (avec `active`, `unique(entite_id,nom,type)`), type `Categorie`, RLS.

**À construire.**
- `repositories/categories.ts` : `listerCategories(supabase, entiteId, opts?)` (filtre `active`, tri par nom), `creerCategorie`, `modifierCategorie`, `desactiverCategorie` (jamais de DELETE dur — ça casserait l'historique ; on passe `active=false`).
- `services/categories.ts` : validation du nom (longueur, non vide), refus d'un doublon côté service (message propre avant l'erreur SQL).
- `app/[entiteId]/categories/page.tsx` + `components/FormulaireCategorie.tsx`, `components/ListeCategories.tsx`.

**Fini quand.**
- [ ] Je peux créer une catégorie recette et une catégorie dépense pour VEA et pour VENA.
- [ ] Une catégorie désactivée disparaît des formulaires de saisie mais reste sur les vieilles transactions.
- [ ] Créer un doublon affiche un message clair, pas une erreur Postgres brute.

**Sécurité / Tests / Jury.** RLS filtre déjà par entité (rien à filtrer en code). Test unitaire de la validation de nom. Jury : « pourquoi désactiver au lieu de supprimer ? » → intégrité de l'historique comptable.

---

### BLOC 1.2 — Entité active & routing par entité
*Le cloisonnement VEA/VENA doit se voir dans l'URL.*

**But.** Naviguer dans le contexte d'une entité : toutes les pages compta vivent sous `/[entiteId]/…`.

**Déjà là.** `app/page.tsx` liste les entités (les cartes deviennent des liens).

**À construire.**
- `repositories/entites.ts` : ajouter `getEntite(supabase, entiteId)` (une entité par id — RLS garantit qu'on ne lit que les siennes).
- `app/[entiteId]/layout.tsx` : charge l'entité active, affiche son nom + un fil d'ariane + la nav (Transactions, Catégories, Tableau de bord, Export). Si `getEntite` renvoie null → `notFound()`.
- Transformer les cartes de `app/page.tsx` en `<Link href={/${entite.id}}>`.

**Fini quand.**
- [ ] Cliquer sur VEA m'amène sur `/[id-vea]` avec le nom affiché et la nav.
- [ ] Bidouiller un id d'entité qui n'est pas à moi → page « non trouvée » (RLS renvoie 0 ligne).

**Sécurité / Jury.** Démontre la *défense en profondeur* : l'URL ne donne aucun accès, c'est la RLS qui décide. Bon point de soutenance.

---

### BLOC 1.3 — Saisie manuelle d'une transaction (Create)
*Le geste #1 de l'app.*

**But.** Saisir une recette ou une dépense : date, libellé, montant TTC, TVA, catégorie, type.

**Déjà là.** `NouvelleTransaction` (DTO), `montants.ts` (`eurosVersCentimes`, `estMontantValide`, `estTvaCoherente`), contraintes SQL (montant>0, TVA≤TTC, FK composite anti-fuite).

**À construire.**
- `repositories/transactions.ts` : `creerTransaction(supabase, NouvelleTransaction)`.
- `services/transactions.ts` : `preparerNouvelleTransaction(saisie)` qui convertit les euros saisis en centimes via `montants.ts`, vérifie montant + cohérence TVA, renvoie soit le DTO prêt soit une liste d'erreurs. **Toute la logique ici, zéro calcul dans la page.**
- `app/[entiteId]/transactions/nouvelle/page.tsx` + `components/FormulaireTransaction.tsx` (server action pour l'insert).

**Fini quand.**
- [ ] Je saisis « 12,50 » et la base stocke `1250` centimes (jamais un flottant).
- [ ] TVA > TTC → refus avec message clair, avant même d'atteindre la base.
- [ ] Le HT s'affiche sans jamais être saisi (colonne générée).
- [ ] Une saisie manuelle naît en statut `validee`.

**Sécurité / Tests / Jury.** Tests unitaires du service (cas limites : « 12 », « 1 234,56 », « 12.5 », vide, négatif, TVA>TTC). Jury : « pourquoi centimes entiers et pas float ? » (réponse déjà dans `montants.ts`).

---

### BLOC 1.4 — Liste, édition, suppression des transactions (Read / Update / Delete)
*Le CRUD complet attendu par le jury.*

**But.** Consulter les transactions d'une entité (récentes d'abord), filtrer, éditer, supprimer.

**Déjà là.** Index SQL `idx_transaction_entite_date (entite_id, date desc)` — la requête centrale est déjà optimisée.

**À construire.**
- `repositories/transactions.ts` : `listerTransactions(supabase, entiteId, {periode?, categorieId?, statut?, type?})`, `getTransaction`, `modifierTransaction`, `supprimerTransaction`.
- `services/transactions.ts` : filtres validés, pagination si besoin.
- `app/[entiteId]/transactions/page.tsx` + `components/TableauTransactions.tsx` (montants formatés via `formaterCentimes`), `app/[entiteId]/transactions/[id]/page.tsx` (édition).

**Fini quand.**
- [ ] La liste affiche les transactions triées, montants en « 1 234,56 € ».
- [ ] Je filtre par période / catégorie / statut.
- [ ] J'édite un libellé/montant → `modifie_le` se met à jour tout seul (trigger SQL).
- [ ] Je supprime une transaction (avec confirmation) ; ses justificatifs partent en cascade.

**Sécurité / Jury.** CRUD = cœur du Bloc 3 CDA. Montre les 4 opérations + la RLS qui protège chacune.

---

### BLOC 1.5 — Import d'un relevé bancaire CSV
*Supprime la ressaisie ligne à ligne.*

**But.** Charger un CSV de relevé, mapper les colonnes, créer des transactions en `a_verifier`.

**Déjà là.** Statut `a_verifier` prévu au schéma exactement pour ça ; `categorie_id` nullable (une ligne importée arrive sans catégorie).

**À construire.**
- `services/import-csv.ts` : parsing robuste (séparateur `;` ou `,`, décimales FR, dates FR), mapping colonnes → `NouvelleTransaction`, déduction du `type` selon le signe, rapport d'erreurs par ligne. **Fonction pure, testable.**
- `repositories/transactions.ts` : `creerTransactionsEnLot(supabase, [])` (insert groupé).
- `app/[entiteId]/import/page.tsx` : upload CSV → écran de mapping des colonnes → prévisualisation → validation. Puis catégorisation depuis la liste (Bloc 1.4).

**Fini quand.**
- [ ] J'importe un relevé, je mappe date/libellé/montant, je prévisualise avant d'écrire.
- [ ] Les lignes créées sont en `a_verifier` et repérables dans la liste.
- [ ] Une ligne mal formée est signalée sans planter tout l'import.

**Sécurité / Tests / Jury.** Valider/assainir le CSV (taille max, colonnes attendues). Tests du parseur (dates FR, montants négatifs, lignes vides). Jury : gestion d'un import partiel, robustesse.

---

### BLOC 1.6 — Tableau de bord de trésorerie
*Le pilotage, ce que tu regardes chaque semaine.*

**But.** Pour une entité : solde, entrées/sorties du mois, répartition par catégorie.

**Déjà là.** Index `idx_transaction_categorie` pour l'agrégation ; tout est en centimes → sommes exactes.

**À construire.**
- `services/tableau-de-bord.ts` : fonctions **pures** de calcul (solde = Σrecettes − Σdépenses, totaux par mois, agrégat par catégorie). Calculs en centimes, formatage uniquement à l'affichage.
- `repositories/transactions.ts` : requêtes d'agrégation (ou agrégation en service si volume faible — à arbitrer et documenter).
- `app/[entiteId]/page.tsx` (accueil de l'entité) + `components/CarteSolde.tsx`, `components/RepartitionCategories.tsx` (camembert/barres).

**Fini quand.**
- [ ] Le solde affiché = Σrecettes − Σdépenses, vérifié à la main sur un petit jeu.
- [ ] Entrées/sorties du mois en cours corrects.
- [ ] Répartition par catégorie cohérente (somme = total dépenses).

**Sécurité / Tests / Jury.** **Tests unitaires impératifs** sur les calculs (c'est de l'argent). Jury : « comment garantissez-vous l'exactitude des soldes ? » → centimes entiers + service pur testé.

---

### BLOC 1.7 — Export pour l'expert-comptable / bilan associatif
*Le livrable qui sert MAINTENANT (ton exercice VENA en cours).*

**But.** Exporter les transactions d'une entité/période en Excel ou CSV, prêt à transmettre.

**Déjà là.** Toute la donnée est en base ; filtres du Bloc 1.4 réutilisables.

**À construire.**
- `services/export.ts` : mise en forme des lignes (date, libellé, type, catégorie, TTC, TVA, HT, justificatif oui/non), en euros lisibles.
- `app/[entiteId]/export/…` : choix période + format → téléchargement. Génération XLSX côté serveur.
- Bonus : onglet/section « transactions sans justificatif » (LEFT JOIN, déjà prévu).

**Fini quand.**
- [ ] Je télécharge un XLSX propre d'une période, ouvrable dans Excel/LibreOffice.
- [ ] Les montants sont justes et lisibles.
- [ ] La liste des pièces manquantes est exportable.

**Jury.** Export de données + agrégation ; utile réellement → bon argument « outil qui sert ».

> 🔚 **Fin de la Phase 1 = le CDC v1.0 Lot 1 est LIVRÉ.** L'Excel est remplacé. C'est le jalon à viser avant tout le reste.

---

## PHASE 1 bis — Valeur ajoutée sans refonte

---

### BLOC 2.1 → 2.4 — Justificatifs & scan IA (= Lot 2 du CDC v1.0)

**2.1 Storage + upload.** Bucket privé Supabase Storage, chemin `{entite_id}/{transaction_id}/fichier`. `repositories/justificatifs.ts` (métadonnées) + upload du binaire. Validation MIME (images + PDF uniquement) et taille max **côté serveur**.
**Fini quand** : je joins une photo/PDF à une transaction, je la reconsulte, un non-connecté n'y accède pas (URL signée).

**2.2 Consultation.** Vignette + lien de téléchargement via URL signée à durée courte. **Jamais** de bucket public.

**2.3 Extraction IA (OCR).** À l'upload, un service IA lit le ticket et **propose** date/montant TTC/TVA/fournisseur → pré-remplit le formulaire. **L'utilisateur valide toujours.** Journaliser proposé vs validé.
**Fini quand** : je photographie un ticket, les champs se pré-remplissent, je corrige si besoin, je valide.

**2.4 Pièces manquantes.** `LEFT JOIN justificatif WHERE id IS NULL` → écran « transactions sans justificatif ».

**Sécurité (critique ici).** Bucket privé + URL signées + validation MIME/taille serveur + RLS sur `justificatif`. C'est le bloc le plus sensible en soutenance sécurité.
**Jury.** Upload sécurisé + intégration service externe + *human-in-the-loop* = très valorisant (Bloc 2 & 3 CDA).

---

### BLOC 4.1 / 4.2 — Documents juridiques (issu du ROADMAP, utile à ton exercice)

**4.1 PV de décision de l'associé unique (approbation des comptes, SASU).** Modèle `.docx` à variables (exercice, dates, résultat, affectation). Génération serveur.
**4.2 Rapport de gestion allégé (SASU).** Même principe.
**Dépendance chiffres.** Les montants (résultat) viennent idéalement du bilan (Bloc 5.4). En attendant : saisie manuelle du résultat dans un mini-formulaire ; le document reste livrable.
**Fini quand** : je génère un PV et un rapport pré-remplis, propres, en-tête VENA.
**Note.** Ne pas confondre avec de la production comptable légale : ce sont des trames à relire/signer.

---

## PHASE 2 — Le socle partie double (le vrai chantier, session dédiée)

⚠️ **Rien ci-dessous n'est possible sans le Bloc 5.1.** Voir `ROADMAP_COMPTA.md` §5 pour le raisonnement complet. À faire sur une **branche Git dédiée**, testée sur données de contrôle, avant de toucher aux vraies écritures.

---

### BLOC 5.1 — PCG + écritures en partie double *(fondation, bloque 5.2 → 5.6)*
- `sql/03_partie_double.sql` : table `compte` (PCG simplifié SASU+asso, racines 1-7), table `ecriture` (en-tête : date, journal, libellé, pièce), table `ligne_ecriture` (compte, débit centimes, crédit centimes). RLS sur les 3.
- Contrainte d'équilibre : Σdébits = Σcrédits par écriture (validation service + vérif à l'insert).
- `repositories/ecritures.ts`, `services/ecritures.ts`.
**Fini quand** : je passe une écriture équilibrée sur des comptes PCG ; une écriture déséquilibrée est refusée.
**Jury** : **le morceau fort** — modélisation d'un domaine complexe, contrainte d'intégrité métier, migration sans perte.

### BLOC 5.2 — Pont transaction → écriture *(dépend de 5.1)*
Chaque `transaction` (partie simple) génère automatiquement l'écriture équilibrée correspondante (ex : dépense TTC 120 / TVA 20 → débit 6xx 100 + débit 44566 20 / crédit 512 120). La saisie assistée existante reste l'interface ; les écritures deviennent la vérité comptable.
**Fini quand** : créer une transaction crée l'écriture juste ; le total débit = total crédit.

### BLOC 5.3 — Export FEC *(dépend de 5.1)*
Fichier des Écritures Comptables, **format officiel** (art. A47 A-1 du LPF) : 18 champs normalisés, séparateur/encodage imposés. Export **déterministe** des écritures validées.
**Fini quand** : le fichier généré respecte les 18 champs et passe un contrôle de structure FEC.
**Jury** : conformité à une norme réglementaire.

### BLOC 5.4 — Bilan + compte de résultat *(dépend de 5.1)*
Compte de résultat = agrégat comptes 6 (charges) et 7 (produits). Bilan = soldes comptes 1-5. Calcul **déterministe** depuis la balance. Écran + export.
**Fini quand** : bilan équilibré (actif = passif), résultat = produits − charges, vérifiés à la main.

### BLOC 5.5 — IS indicatif *(dépend de 5.4)*
Sur le résultat fiscal : **15 %** jusqu'à 42 500 € de bénéfice (conditions PME : CA ≤ 10 M€, capital libéré, ≥ 75 % personnes physiques), **25 %** au-delà. Estimation des acomptes.
⚠️ **Taux et seuils = paramètres datés, jamais des constantes en dur** (amendement PLF 2026 en discussion pour porter le seuil à 100 000 € — non confirmé). Toujours étiqueté **« indicatif — à valider par l'expert-comptable »**.

### BLOC 5.6 — Liasse 2065 / 2033 (brouillon) *(dépend de 5.4, 5.5)*
Pré-remplissage des formulaires depuis bilan + compte de résultat. Sortie = **brouillon** pour l'expert-comptable, **pas** une déclaration. Le mapping comptes → lignes est fastidieux : à faire en dernier.

---

## Ce qui reste HORS de l'app (rappel — ne pas coder)
- **EDI-TDFC** (transmission officielle liasse) → expert-comptable / OGA / portail agréé.
- **Dépôt greffe RCS** → guichet unique INPI.
- **TVA CA3** → VENA en franchise (seuils 2026 : 37 500 € services / 85 000 € vente) ; rien à déclarer tant que dessous.

Détail et justification dans `ROADMAP_COMPTA.md` §3.

---

## Ordre d'exécution recommandé (résumé)

| # | Bloc | Phase | Effort | Débloque |
|---|---|---|---|---|
| 1 | 1.1 Catégories | 1 | faible | 1.3 |
| 2 | 1.2 Entité active / routing | 1 | faible | tout le reste UI |
| 3 | 1.3 Saisie transaction | 1 | moyen | 1.4, 1.6 |
| 4 | 1.4 CRUD transactions | 1 | moyen | 1.6, 1.7 |
| 5 | 1.5 Import CSV | 1 | moyen | — |
| 6 | 1.6 Tableau de bord | 1 | moyen | — |
| 7 | 1.7 Export expert | 1 | faible | **fin Lot 1** |
| 8 | 2.1–2.4 Justificatifs + IA | 1bis | moyen | — |
| 9 | 4.1–4.2 Documents | 1bis | faible | — |
| 10 | 5.1 PCG + partie double | 2 | **élevé** | 5.2–5.6 |
| 11 | 5.3 FEC | 2 | moyen | — |
| 12 | 5.4 Bilan / résultat | 2 | moyen | 5.5, 5.6 |
| 13 | 5.5 IS indicatif | 2 | faible | — |
| 14 | 5.6 Liasse brouillon | 2 | **élevé** | — |

**Reco de démarrage : Blocs 1.1 → 1.2 → 1.3.** En trois blocs tu as une app où tu crées une catégorie et saisis une vraie transaction, de bout en bout. C'est le meilleur point de reprise.

---

## Rappels transverses (valables sur TOUS les blocs)
- **Où je code ?** Nouvel écran → `app/`+`components/`. Nouvelle règle/calcul → `services/`. Nouvelle requête → `repositories/`. Nouvelle table/colonne → `sql/` (migration numérotée).
- **Montants** : toujours centimes entiers, conversion euros uniquement dans `services/montants.ts`.
- **Sécurité** : RLS d'abord (structurel), validation service ensuite (message propre), contrainte SQL en dernier rempart. Requêtes paramétrées (garanties par supabase-js).
- **Tests** : tout `service` de calcul a des tests unitaires (fonctions pures, sans base). C'est éliminatoire au CDA sur des données financières.
- **Doc CDA** : à chaque décision technique, une ligne dans le journal du README (date, décision, justification) — comme tu le fais déjà.

## Prochaine étape
Dis-moi « on attaque le Bloc 1.1 » et je code les catégories couche par couche, en t'expliquant chaque fichier. Ou choisis un autre bloc si ta priorité est ailleurs (ex : Bloc 1.7 export si tu dois régulariser VENA cette semaine).
