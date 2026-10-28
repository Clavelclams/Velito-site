# PROMPT — Alimenter cours.velito.fr à partir de mes projets (v2, octobre 2026)

> **Comment l'utiliser.** Ouvre Claude Code dans `Velito-site` (c'est là
> qu'on écrit), ajoute le projet source en lecture avec
> `/add-dir "C:\Users\Velito Adventure\Documents\<dossier>"`, puis colle
> tout ce qui suit la ligne en remplaçant `<PROJET>` et `<DOSSIER>`.
>
> | `<PROJET>` (slug) | `<DOSSIER>` source |
> |---|---|
> | `venaball` | `mabb-site` (backend Symfony) |
> | `pirb` | `Pirb store` (app joueuse Expo) |
> | `venaball-club` | `venaball club-store` (app staff Expo) |
> | `arena`, `hub`, `cours`, `compta`, `vea`, `vena`, `interactive` | `Velito-site/apps/<slug>` (pas besoin de `/add-dir`) |
>
> Remplace ce fichier par une version plus récente si tu fais évoluer le
> format du site : c'est le site qui fait foi (`apps/cours/lib/fiches/`).

---

**MISSION — alimenter mon site de révision CDA à partir du projet `<PROJET>`.**

Je suis Clavel, alternant CDA (Concepteur Développeur d'Applications, titre
pro niveau 6, AFPA Amiens, jury avril 2027). Mon site `apps/cours` (dans ce
dépôt) est ma base pour apprendre et pour défendre mes projets devant le
jury. Tu vas l'enrichir à partir de ce que j'ai **réellement** construit
dans `<DOSSIER>`. Tu écris uniquement dans `apps/cours/content/`.

## Règles absolues

1. **Le projet source est en lecture seule.** Tu ne modifies, ne crées et
   ne supprimes rien dans `<DOSSIER>`.
2. **Aucun git qui écrit.** Pas de `git add`, `commit`, `push`, `merge`,
   `reset`. Lire l'historique (`git log`, `git show`, `git diff`) est permis
   et attendu. À la fin, tu me proposes un message de commit et c'est moi
   qui commite.
3. **Rien d'inventé.** Chaque affirmation sur mon projet s'appuie sur un
   fichier ou un commit que tu as lu, avec son vrai chemin. Si tu n'es pas
   sûr, tu l'écris (« non vérifié ») plutôt que de deviner.
4. **Honnêteté sur l'état.** Ce qui est cassé, risqué ou pas fini est dit
   clairement. Un site de révision qui m'embellit me fera perdre devant le
   jury.
5. **Pas de secrets.** Jamais de contenu de `.env`, de clés, de mots de
   passe ou de données personnelles réelles dans les fichiers produits.
6. **Écriture sobre.** Français, ton direct, « je » dans les fiches (c'est
   moi qui parle au jury), « tu » dans les leçons (c'est un prof qui me
   parle). Pas d'emoji dans le texte, pas de remplissage.
7. **Dates ISO** (`AAAA-MM-JJ`) partout, date du jour pour ce qui est créé.

## Étape 1 — Lire ce qui existe déjà (avant de toucher quoi que ce soit)

- `apps/cours/content/projets/<PROJET>.md` : la fiche projet. Note sa date
  `maj:`, c'est le point de départ de l'analyse.
- `apps/cours/content/fiches/` : toutes les fiches dont `projet: "<PROJET>"`,
  pour ne jamais recréer un concept déjà couvert (on l'améliore à la place).
- `apps/cours/content/parcours/*/_parcours.json` et la liste des leçons :
  pour savoir quels sujets généraux sont déjà enseignés.
- `apps/cours/lib/fiches/` (`fiches.ts`, `parcours.ts`, `quiz.ts`,
  `domaines.ts`, `niveaux.ts`) : c'est le code qui parse le contenu. **Les
  formats ci-dessous en découlent ; si le code dit autre chose, le code a
  raison** et tu me le signales.

## Étape 2 — Analyser le projet source, dans cet ordre

1. **Ce qui a changé depuis `maj:`** :
   `git -C "<DOSSIER>" log --since=<maj> --stat --format="%h %ad %s" --date=short`.
   Chaque commit significatif est une piste. Ouvre les diffs des plus
   importants (`git show <hash>`).
2. **La documentation de travail** : `README.md`, `instruction/`, `docs/`,
   CDC, notes datées. C'est là que sont écrites les décisions et leur
   pourquoi.
3. **La base de données** : migrations, schéma, entités, policies RLS,
   triggers. C'est le bloc 2 du CDA, le jury y va toujours.
4. **La sécurité** : authentification, contrôles d'accès (Voters, RLS,
   middleware), validation des entrées, uploads, en-têtes.
5. **Les tests** : ce qu'ils prouvent, et surtout ce qui n'est **pas** testé.
6. **Les fichiers cœur** cités par les commits et la doc. Jamais
   `node_modules`, `vendor`, `var`, `.next`, `dist`, `build`, ni les assets.

Pour chaque découverte, décide où elle va :

| Ce que j'ai trouvé | Où ça va |
|---|---|
| Un concept précis, défendable, visible dans **mon** code | une **fiche** (+ son quiz) |
| Un savoir général que j'utilise mais qu'aucun parcours n'enseigne | une **leçon** dans un parcours (+ son quiz) |
| Une décision, un changement d'état, un risque | la **fiche projet** |
| Un sujet du référentiel CDA que **je n'ai jamais pratiqué** | une leçon qui le dit explicitement (« tu ne l'as pas encore fait dans tes projets ; voici ce que c'est et comment l'essayer ») |

Avant d'écrire, montre-moi la liste prévue (fichiers à créer / modifier,
une ligne de justification chacun) et attends mon accord.

## Étape 3 — Écrire, au format exact

### A. La fiche projet — `content/projets/<PROJET>.md` (une seule, mise à jour)

```markdown
---
titre: "<Nom lisible>"
avancement: <0-100>
statut: "<en cours | en prod | en pause | terminé>"
maj: <date du jour>
---

## C'est quoi
## Comment c'est construit
## Les décisions techniques et POURQUOI
## État d'avancement honnête
## Prochaines étapes
```

Mets à jour, ne réécris pas tout. Ajoute les nouvelles décisions **datées**
dans la liste existante (format `**AAAA-MM-JJ — Décision** (fichier) : pourquoi`).
« Prochaines étapes » : 3 à 5 items concrets, le plus urgent en premier.

### B. Une fiche de révision — `content/fiches/<PROJET>-<concept>.md`

```markdown
---
titre: "<Le concept en une phrase qui donne envie>"
projet: "<PROJET>"
bloc: <1 | 2 | 3>
themes: ["<theme>", "<theme>"]
source: "<chemin/du/fichier/principal>"
date: <date du jour>
---

## Le concept
## Comment je l'explique au jury
## La question vicieuse du jury
```

- **Le concept** : niveau débutant, avec un extrait court de **mon** code
  réel (10 à 25 lignes max, chemin cité). On explique le mécanisme, puis le
  pourquoi, puis ce qui se passerait sans.
- **Comment je l'explique au jury** : 4 à 6 phrases orales à la première
  personne, prêtes à dire.
- **La question vicieuse** : la question piège probable et la réponse qui
  tient, y compris quand la réponse est « c'est une limite connue, voici
  comment je la corrigerais ».
- `bloc` : 1 = développer une application sécurisée (UI, code, sécurité) ·
  2 = concevoir (BDD, architecture, couches) · 3 = préparer le déploiement
  (tests, CI, déploiement, documentation).
- `themes` : **uniquement** dans cette liste fermée, 1 à 3 par fiche :
  `securite-applicative`, `authentification`, `base-de-donnees`,
  `modelisation`, `architecture`, `api`, `http`, `tests`, `deploiement`,
  `performance`, `resilience`, `temps-reel`, `mobile`, `frontend`, `rgpd`,
  `multi-tenant`, `algorithmes`, `metier`. Si aucun ne colle, dis-le-moi au
  lieu d'en inventer un.
- Une fiche = un concept. Slug en minuscules, kebab-case, sans accents.

### C. Une leçon — `content/parcours/<parcours>/<NN>-<slug>.md`

```markdown
---
titre: "<Titre de la leçon>"
parcours: "<id du dossier parcours>"
ordre: <entier, suit la dernière leçon du parcours>
niveau: "<debutant | intermediaire | solide | expert>"
duree: <minutes, entier>
date: <date du jour>
---

## Le cours
## À retenir
## Mise en pratique
```

- **Le cours** : part de zéro, va vers le concret ; chaque fois que c'est
  possible, l'exemple vient de mes projets (chemin cité). Si je ne l'ai
  jamais fait, dis-le en une phrase et donne un exemple minimal.
- **À retenir** : 4 à 6 points courts.
- **Mise en pratique** : un exercice faisable en moins d'une heure, si
  possible sur un de mes projets réels, avec le critère « c'est réussi
  quand… ».
- Nouveau parcours seulement si aucun existant ne convient. Il faut alors
  `content/parcours/<id>/_parcours.json` :
  `{ "titre", "description", "icone", "ordre", "domaine" }` avec `domaine`
  parmi `bases`, `backend`, `frontend`, `metier`, `jeux`, `autres`.

### D. Un quiz — `content/quiz/<id>.json` (un par fiche et un par leçon)

- `<id>` = le slug de la fiche, ou `<parcours>-<fichier de la leçon sans .md>`.

```json
{
  "fiche": "<id>",
  "questions": [
    {
      "question": "…",
      "choix": ["…", "…", "…", "…"],
      "bonne": 2,
      "explication": "Pourquoi c'est la bonne, et pourquoi le piège principal est faux."
    }
  ]
}
```

- 3 à 5 questions, 4 choix chacune, `bonne` = index **à partir de 0**.
- Varie la position de la bonne réponse ; la bonne réponse ne doit pas être
  systématiquement la plus longue ni la plus nuancée.
- Les mauvais choix sont des erreurs que je pourrais vraiment faire, pas des
  absurdités.
- Au moins une question part d'une situation concrète de mon code (« dans
  `<fichier>`, que se passe-t-il si… »).

## Étape 4 — Vérifier avant de me rendre la main

1. Chaque `.md` produit : front-matter YAML valide, tous les champs requis
   présents, les titres de section exactement comme ci-dessus.
2. Chaque `.json` : JSON valide, `fiche` = nom du fichier sans `.json`,
   `bonne` dans les bornes.
3. Chaque leçon et chaque fiche nouvelle a son quiz.
4. Aucun doublon de slug, aucun thème hors liste.
5. Lance `npm run check-types --workspace=cours` puis
   `npm run build --workspace=cours` depuis la racine et corrige jusqu'au
   vert.

## Étape 5 — Ton compte rendu final

- La liste des fichiers créés et modifiés, groupés par type.
- Ce que tu as **vu de préoccupant** dans le projet source (sécurité, données,
  dette) même si ce n'était pas ta mission : je veux le savoir.
- Les sujets que tu as repérés mais pas traités, pour la prochaine fois.
- Un message de commit proposé, au format `feat(cours): …`.

**À refaire après chaque session de dev significative** sur ce projet.
