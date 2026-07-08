# Feuille de route — Velito Compta

> Document de cadrage technique. Rédigé le 2026-07-07.
> Décision de direction actée : **approche en 2 phases**.
> Phase 1 = on garde la partie simple actuelle et on livre vite ce qui est utile et sans risque.
> Phase 2 = on pose le socle *partie double* qui débloque le vrai reste (FEC, bilan, liasse).

---

## 1. Où on en est (état réel du code)

L'app actuelle est une **comptabilité en partie simple** : une `transaction` porte un
`type` (recette / dépense), un montant TTC/TVA en centimes, une date, une catégorie
libre par entité. Archi en couches propre (présentation → services → repositories →
Postgres/RLS), montants en centimes `bigint`, HT en colonne générée, FK composite
anti-fuite inter-entités. C'est du travail sérieux et défendable.

Le README dit, à raison :

> « N'est pas un logiciel de comptabilité certifié : il alimente l'expert-comptable,
> il ne le remplace pas. »

**Cette phrase reste vraie même après la Phase 2.** On ne vise pas à remplacer
l'expert-comptable ni à télédéclarer. On vise à produire des données propres,
un FEC conforme, et des brouillons pré-remplis. Le dépôt officiel reste hors app
(voir §3).

---

## 2. Les 3 principes non négociables

1. **Déterminisme des chiffres.** Tout montant officiel (bilan, IS, FEC) est *calculé*,
   traçable, reproductible. Jamais estimé, jamais « généré ». Une valeur comptable
   doit pouvoir être remontée jusqu'à l'écriture qui la produit.

2. **L'IA sert la saisie, pas le calcul.** L'IA lit un ticket, *propose* un compte PCG,
   flague une anomalie. Un humain valide. Ensuite le moteur déterministe prend le
   relais. Une IA qui « invente » un chiffre de bilan = risque de contrôle fiscal.
   (Détail du branchement IA au §6.)

3. **Ce qui est réglementé et transmis reste hors app.** La transmission officielle
   (EDI-TDFC, greffe) exige des agréments qu'on n'a pas et qu'on ne code pas (§3).

---

## 3. Ce qui NE sera PAS dans l'app (et pourquoi) — à assumer clairement

| Item de ta liste | Statut | Pourquoi / le vrai canal |
|---|---|---|
| **EDI-TDFC** (dépôt officiel de la liasse aux impôts) | **Hors app, définitif** | Exige d'être *partenaire EDI agréé DGFiP* + homologation technique. Ce n'est pas une feature. Canal réel : expert-comptable, OGA, ou portail EDI d'un tiers agréé. |
| **Dépôt des comptes annuels au greffe RCS** | **Hors app, définitif** | Se fait via le *guichet unique INPI*. Pas le rôle d'une app maison de télétransmettre au greffe. |
| **Déclaration TVA CA3** | **Reporté / feature morte aujourd'hui** | VENA est en *franchise en base de TVA*. Seuils 2026 : 37 500 € (services) / 85 000 € (vente). Tant que tu es dessous, il n'y a **rien** à déclarer. À coder seulement si/quand tu franchis le seuil et passes au réel. |

> **Le bon réflexe pour ton 1er exercice VENA** : l'app produit le FEC + un export propre +
> les brouillons de liasse. Un expert-comptable relit, corrige, signe et télédéclare.
> Coût maîtrisé, responsabilité couverte. C'est ça, « être carré » — pas réimplémenter
> la DGFiP.

---

## 4. PHASE 1 — Utile tout de suite, faible risque (garde la partie simple)

Objectif : livrables visibles rapidement pour ton exercice en cours, sans toucher au
modèle de données. Aucun de ces lots n'exige la partie double.

### Lot A — Générateur de documents juridiques
Modèles à variables (pas de logique comptable). Priorité haute, effort faible.
- **PV d'AG d'approbation des comptes** (SASU, associé unique — décision de l'associé unique).
- **Rapport de gestion allégé** (SASU).
- Sortie : `.docx` propre, en-tête VENA, variables (exercice, dates, résultat) injectées.
- Techniquement : templating côté serveur → génération docx. Réutilise l'esprit de ton
  agent `vea-juridique-agent`.
- **Dépendance** : les *chiffres* du résultat viennent idéalement du bilan (Lot F, Phase 2).
  En attendant, saisie manuelle du résultat dans un petit formulaire. Le document, lui,
  est livrable dès maintenant.

### Lot B — Export propre pour l'expert-comptable
Ce que l'expert attend vraiment aujourd'hui.
- Export **Excel/CSV** des transactions d'une entité sur une période : date, libellé,
  type, catégorie, TTC, TVA, HT, présence justificatif (oui/non).
- Filtres : entité, plage de dates, statut (`a_verifier` / `validee`).
- Bonus utile : liste des transactions **sans justificatif** (LEFT JOIN, déjà prévu au schéma).
- Effort faible-moyen. Passe par la couche `services` (agrégation) + `repositories` (requête).

### Lot C — Justificatifs + IA de saisie (le « coller une IA » utile)
- **Upload** des pièces (Supabase Storage, bucket privé — déjà anticipé dans le schéma,
  table `justificatif`).
- **OCR / lecture par IA** d'un ticket ou d'une facture → pré-remplit date, montant TTC,
  TVA, libellé, et *propose* une catégorie. **L'utilisateur valide toujours.**
- Effort moyen. C'est ici que l'IA apporte le plus de valeur, tout de suite, sans risque
  (elle ne calcule rien d'officiel, elle accélère la saisie).

---

## 5. PHASE 2 — Le socle partie double (débloque le vrai reste)

⚠️ **C'est le gros chantier.** Rien de la liste « bilan / liasse / FEC » n'est possible
sans lui. On le fait proprement, en lot fondateur, sans casser l'existant.

### Lot D — PCG + passage en partie double *(fondation, bloque tout le reste)*
- Table **`compte`** : plan comptable (racines 1 à 7 : capitaux, immo, stocks, tiers,
  financier, charges, produits). On seed un PCG *simplifié* adapté SASU + asso, pas les
  600 comptes du PCG complet.
- Table **`ecriture`** (en-tête : date, journal, libellé, pièce) + **`ligne_ecriture`**
  (compte, débit centimes, crédit centimes). Une écriture est équilibrée :
  Σ débits = Σ crédits (contrainte / validation service).
- **Pont avec l'existant** : chaque `transaction` actuelle génère une écriture
  (ex : une dépense TTC 120 € TVA 20 € → débit 6xx 100 + débit 44566 20 / crédit 512 120).
  On ne jette pas la partie simple : elle devient la couche de *saisie assistée*
  au-dessus des écritures.
- Effort **élevé**. C'est le lot le plus délicat à défendre au jury — et le plus valorisant.

### Lot E — Export FEC *(dépend de D)*
- **Fichier des Écritures Comptables**, format officiel (article A47 A-1 du LPF) :
  18 champs normalisés (JournalCode, EcritureNum, CompteNum, Debit, Credit, etc.),
  encodage et séparateur imposés.
- Une fois la partie double en place, c'est un export **déterministe** des écritures.
  Livrable phare : réaliste, conforme, et directement exploitable par un expert-comptable
  ou en cas de contrôle.
- Effort moyen (une fois D fait).

### Lot F — Bilan + compte de résultat *(dépend de D)*
- **Compte de résultat** = agrégation des comptes de charges (6) et de produits (7).
- **Bilan** actif/passif = soldes des comptes 1 à 5.
- Calcul déterministe à partir de la balance des comptes. Sortie écran + export.
- Effort moyen.

### Lot G — Calcul IS indicatif + acomptes *(dépend de F)*
- À partir du résultat fiscal : **15 %** jusqu'à 42 500 € de bénéfice (conditions PME :
  CA ≤ 10 M€, capital libéré, détenu ≥ 75 % par personnes physiques), **25 %** au-delà.
  ⚠️ *Un amendement PLF 2026 propose de porter le seuil de 42 500 € à 100 000 € —
  non confirmé à ce jour. Le taux doit être un paramètre, pas une constante en dur.*
- Estimation des **acomptes IS**.
- **Toujours étiqueté « indicatif — à valider par l'expert-comptable ».**
- Effort faible-moyen (c'est du calcul, une fois F fait).

### Lot H — Liasse 2065-SD + tableaux 2033-A à 2033-G (brouillon pré-rempli) *(dépend de F, G)*
- **Pré-remplissage** des formulaires à partir du bilan et du compte de résultat.
- Sortie = **brouillon** à remettre à l'expert-comptable, **pas** une déclaration officielle.
  Le mapping comptes → lignes de liasse est complexe et source d'erreurs : on assume que
  c'est une aide, relue par un pro. On ne télédéclare pas (voir §3, EDI-TDFC).
- Effort **élevé** (mapping fastidieux). À faire en dernier, quand tout le socle est solide.

---

## 6. Où l'IA se branche exactement

| Usage IA | Lot | Rôle | Garde-fou |
|---|---|---|---|
| Lecture ticket/facture (OCR) | C | Extrait date, montant, TVA, fournisseur | Champs pré-remplis, **validés à la main** |
| Suggestion de catégorie / compte PCG | C, D | Propose le classement le plus probable | Suggestion, jamais imposée |
| Détection d'anomalies | B, F | Flague un doublon, un montant aberrant, une TVA incohérente | Alerte, pas correction auto |
| Aide à la saisie du libellé | A, C | Reformule / normalise | Cosmétique |

**Ce que l'IA ne fait JAMAIS** : produire un chiffre de bilan, un montant de FEC,
un résultat fiscal, un total de liasse. Ces valeurs sont *calculées* par le moteur
déterministe, à partir d'écritures validées. Non négociable.

---

## 7. Graphe des dépendances

```
PHASE 1 (parallélisable, indépendant du socle)
  Lot A  Documents ........... (autonome ; enrichi par F plus tard)
  Lot B  Export expert ....... (autonome)
  Lot C  Justificatifs + IA .. (autonome)

PHASE 2 (séquentiel, fondation d'abord)
  Lot D  PCG + partie double  ──┬──> Lot E  FEC
                                ├──> Lot F  Bilan + Cpte de résultat ──┬──> Lot G  IS
                                                                       └──> Lot H  Liasse
```

Lot D est le goulot : tant qu'il n'est pas fait, E/F/G/H sont bloqués. D'où l'intérêt de
la Phase 1 en parallèle — elle produit de la valeur pendant que tu prépares le gros morceau.

---

## 8. Priorisation conseillée (ordre d'attaque)

1. **Lot A** — documents (rapide, visible, utile à ton exercice en cours).
2. **Lot B** — export expert-comptable (ce dont tu as besoin *maintenant* pour régulariser).
3. **Lot C** — justificatifs + IA de saisie (grosse valeur d'usage, faible risque).
4. **Lot D** — PCG + partie double (le socle ; on l'attaque une fois la Phase 1 rodée).
5. **Lot E** — FEC (livrable phare, une fois D).
6. **Lot F** — bilan + compte de résultat.
7. **Lot G** — IS indicatif.
8. **Lot H** — liasse brouillon (le plus lourd, en dernier).

---

## 9. Ce que chaque lot apporte au jury CDA (avril 2027)

- **Lot A** : génération documentaire, templating, séparation données/présentation.
- **Lot B** : requêtes d'agrégation, export de données, gestion de filtres.
- **Lot C** : intégration d'un service externe (IA/OCR), upload de fichiers sécurisé
  (Storage, bucket privé, validation MIME), *human-in-the-loop*.
- **Lot D** : **le morceau fort** — modélisation d'un domaine métier complexe (partie
  double), contraintes d'intégrité (équilibre débit/crédit), migration sans perte de
  l'existant. Excellent sujet de soutenance.
- **Lot E** : conformité à une norme officielle (format FEC), export déterministe.
- **Lot F/G** : logique métier de calcul, tests unitaires, paramétrage fiscal.
- **Lot H** : mapping de données vers un format réglementaire.

Chaque lot est défendable ligne par ligne, dans la continuité de ta doc technique actuelle.

---

## 10. Risques & garde-fous

- **Risque fiscal** : ne jamais présenter un chiffre de l'app comme « la » déclaration.
  Tout ce qui touche liasse / IS / bilan porte la mention « brouillon, à valider par un
  expert-comptable ».
- **Paramètres fiscaux volatils** : taux IS, seuils, franchise TVA changent presque chaque
  loi de finances. → tout mettre en **paramètres datés**, jamais en constantes dispersées.
- **Migration partie double (Lot D)** : à faire sur une branche, testée, avec un jeu de
  données de contrôle, avant de toucher aux vraies écritures VENA/VEA.
- **IA** : toujours *human-in-the-loop* sur la saisie. Journaliser ce que l'IA a proposé
  vs ce que l'humain a validé (traçabilité + amélioration).

---

## 11. Prochaine étape

Dis-moi par quel lot on démarre. Ma reco : **Lot A ou Lot B** (rapides, utiles à ton
exercice en cours), puis on enchaîne. Quand tu veux attaquer le socle partie double
(Lot D), on lui consacre une session dédiée — c'est le morceau qui mérite qu'on prenne
le temps.
