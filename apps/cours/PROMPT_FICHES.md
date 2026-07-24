# PROMPT À COLLER dans la conversation Claude de chaque projet

> Copie tout ce qui suit la ligne, et colle-le dans la conversation Claude
> qui gère le dossier du projet (MABB, Pirb store, Interactive, etc.).
> Remplace juste `<PROJET>` par le nom court : `compta`, `interactive`,
> `mabb`, `pirb`, `hub`, `vea`, `vena`, `arena`.

---

**MISSION CDA — Projet `<PROJET>`.** Je prépare le titre CDA (Concepteur
Développeur d'Applications, jury avril 2027). Mon site de révision
(`Velito-site/apps/cours`) affiche deux types de fichiers Markdown que TU vas
produire à partir de CE projet. Tu connais déjà ce dossier : ne relis pas
tout le code — appuie-toi sur ce que tu sais, et ne relis que les fichiers
nécessaires (docs, schéma de base, fichiers cœur). Jamais node_modules,
assets ou dossiers de build.

**LIVRABLE 1 — La fiche projet** (une seule, à METTRE À JOUR à chaque fois,
pas à dupliquer). Crée/actualise `fiches-cda/projet-<PROJET>.md` à la racine
du projet, format STRICT :

```markdown
---
titre: "<Nom lisible du projet>"
avancement: <0-100>
statut: "<en cours | en prod | en pause | terminé>"
maj: <AAAA-MM-JJ>
---

## C'est quoi
2-4 phrases : le besoin, pour qui, où ça en est réellement.

## Comment c'est construit
Stack, architecture (couches, dossiers clés), base de données (tables
principales), comment la sécurité est gérée. Avec les VRAIS chemins de
fichiers.

## Les décisions techniques et POURQUOI
Liste datée des choix importants avec leur justification — c'est la matière
première de mon dossier professionnel CDA.

## État d'avancement honnête
Ce qui marche, ce qui est en cours, ce qui reste. Pas de projection
optimiste : l'état RÉEL du code.

## Prochaines étapes
3-5 items max, concrets.
```

**LIVRABLE 2 — Les fiches de révision** (plusieurs, une par CONCEPT).
Identifie les concepts défendables au jury présents dans ce qu'on a
construit ensemble (sécurité, base de données, architecture, tests, choix
justifiés) — entre 5 et 15 selon la richesse du projet. Pour CHACUN, crée
`fiches-cda/<PROJET>-<concept-en-kebab-case>.md`, format STRICT :

```markdown
---
titre: "<Le concept en une phrase accrocheuse>"
projet: "<PROJET>"
bloc: <1 | 2 | 3>
themes: ["<theme1>", "<theme2>"]
source: "<chemin/du/fichier/principal>"
date: <AAAA-MM-JJ>
---

## Le concept
Explication claire, niveau débutant, avec MON code réel en exemple
(chemins et extraits courts) — jamais d'exemple générique inventé.

## Comment je l'explique au jury
3-6 phrases orales, à la première personne, prêtes à dire.

## La question vicieuse du jury
LA question piège probable sur ce sujet + la réponse qui tient.
```

Blocs CDA : 1 = développer une application sécurisée (UI, code, sécurité) ·
2 = concevoir (BDD, architecture, couches) · 3 = préparer le déploiement
(tests, CI, déploiement, documentation).

**Règles absolues** : français ; frontmatter YAML exactement conforme (le
site le parse) ; slugs en minuscules-kebab-case sans accents ; une fiche =
UN concept ; pas de fiche sans lien direct avec ce code ; si une fiche
existe déjà sur un concept, ne la recrée pas, améliore-la. À la fin, liste
les fichiers créés/modifiés — je les copierai moi-même dans
`Velito-site/apps/cours/content/` (fiches → `fiches/`, projet → `projets/`).

**À refaire en fin de chaque session de dev significative** : mettre à jour
la fiche projet + créer les fiches des nouveaux concepts abordés.
