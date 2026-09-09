---
titre: "Le workflow complet : branche → Pull Request → Preview → prod"
parcours: "git-avance"
ordre: 7
niveau: "solide"
duree: 25
date: 2026-09-09
---

## Le cours

Tu as les briques. Cette leçon les assemble en un flux de travail que tu peux appliquer demain matin, et qui aurait évité que 7 commits restent hors de `main` sans que tu le saches.

**Le principe : `main` est toujours déployable.** Tout ce qui est sur `main` est en prod (Vercel écoute `main`). Donc on ne travaille jamais directement dessus pour autre chose qu'un fix d'une ligne. Tout le reste passe par une branche.

**Étape 1 — Partir propre.**

```bash
git switch main
git pull --ff-only          # récupère ce que GitHub a, refuse si divergence
git switch -c feat/arena-badges-auto
```

Le `--ff-only` sur le pull est important : si tu as des commits locaux sur `main` que GitHub n'a pas (ça ne devrait pas arriver, mais si), Git refuse au lieu de créer un merge commit silencieux. Tu vois le problème avant qu'il ne se cache.

Le nom de branche dit ce qu'elle fait : `feat/`, `fix/`, `docs/`, `chore/`, puis un résumé en kebab-case. Tes noms sont déjà bons.

**Étape 2 — Travailler par petits commits.** Un commit = une intention. « Ajoute la migration », « Ajoute le calcul », « Ajoute l'UI ». Pas « wip ». Si tu ne peux pas décrire un commit en une ligne, il est trop gros. Tu pourras toujours squasher avant de merger (leçon 3), mais tu ne peux pas découper un gros commit après coup facilement.

Le format que tu utilises déjà, à garder : `type(scope): description`. `feat(arena): attribution auto des badges`. Ce format permet de générer des changelogs et de filtrer `git log --grep`.

**Étape 3 — Pousser tôt, pousser souvent.** `git push -u origin feat/arena-badges-auto` la première fois (`-u` lie la branche locale à la distante, ensuite `git push` suffit). Deux raisons de pousser avant d'avoir fini : c'est une sauvegarde (le disque de ton PC n'est pas éternel — ton dépôt `venaball club-store` de 5 100 lignes n'a **toujours pas de remote**), et Vercel construit un **Preview** à chaque push.

**Étape 4 — Le Preview, c'est ton environnement de test gratuit.** Vercel déploie chaque branche sur une URL propre : `velito-site-cours-git-feat-arena-badges-auto-vena-s-projects.vercel.app`. Tu testes en conditions réelles — vraies variables d'environnement, vraie base — sans toucher la prod. Le 9 septembre, le Preview de `7c762ab` était vert 7 minutes avant que tu merges : tu avais la preuve que le build passait avant de toucher `main`.

**Étape 5 — La Pull Request.** Sur GitHub, « Compare & pull request ». Même seul, une PR t'apporte :

- une **liste de ce qui va entrer** dans `main`, commit par commit, fichier par fichier — c'est là que tu aurais vu « 7 commits, dont un fix du compte à rebours que je croyais déployé » ;
- le lien vers le Preview Vercel, automatiquement ;
- un endroit pour écrire *pourquoi* — le message de PR est la documentation de la fonctionnalité.

**Étape 6 — Merger, puis nettoyer.** Trois options sur GitHub (leçon 2). Pour toi, seul, avec des branches courtes : **Squash and merge** si la branche a des commits brouillons, **Merge commit** ou **Rebase** si les commits sont propres. Puis **Delete branch** : une branche mergée n'a plus de raison d'exister. Localement :

```bash
git switch main
git pull --ff-only
git branch -d feat/arena-badges-auto    # -d refuse si non mergée (sécurité)
git fetch --prune                        # nettoie les refs distantes supprimées
```

Ton `git branch -vv` du 9 septembre listait 9 branches déjà mergées et jamais supprimées. Ce n'est pas grave, mais c'est du bruit qui masque la seule qui comptait.

**La règle qui aurait tout évité : une branche vit moins d'une semaine.** Si elle dure plus, c'est qu'elle mélange plusieurs choses — la tienne portait « saisie manuelle palmarès » **et** « fix compte à rebours » **et** « 30 fiches ». Trois PR de un jour valent mieux qu'une PR de trois semaines : chaque fusion est petite, vérifiable, et `main` reflète ton travail en continu au lieu de sauter d'un coup.

**Le fix urgent sur `main`.** Exception assumée : une ligne à corriger en prod tout de suite. `git switch main`, `git pull --ff-only`, corrige, commit, push. Puis, si tu as une branche de feature en cours : `git switch feat/…`, `git rebase main` pour l'intégrer (leçon 3). Ainsi ta branche contient le fix et le merge final restera un fast-forward.

## À retenir

- `main` = prod. On n'y travaille pas, on y fusionne.
- Branche courte, commits petits et nommés, push tôt.
- Le Preview Vercel est ton test en conditions réelles, gratuit, avant `main`.
- La PR est la liste de ce qui entre — même seul, c'est ta relecture.
- Après merge : supprimer la branche, `fetch --prune`.
- Une branche de plus d'une semaine mélange plusieurs sujets. Découpe.

## Mise en pratique

Objectif : faire une vraie PR sur `Velito-site`, de bout en bout, avec un changement minuscule et sans risque.

1. `cd "C:\Users\Velito Adventure\Documents\Velito-site"`. `git switch main`, `git pull --ff-only`.
2. `git switch -c docs/readme-cours`. Ouvre `apps/cours/README.md` (crée-le s'il n'existe pas) et écris trois lignes : ce qu'est l'app, comment la lancer (`npm run dev` depuis la racine avec `--filter=cours`), où est le contenu (`content/`).
3. `git add apps/cours/README.md`, `git commit -m "docs(cours): README minimal"`, `git push -u origin docs/readme-cours`.
4. Va sur github.com/Clavelclams/Velito-site : bandeau « Compare & pull request ». Ouvre la PR. Lis l'onglet « Files changed » et « Commits ». Attends le check Vercel (une coche verte et un lien Preview pour chaque app impactée — ici aucune, un README ne déclenche pas de build ; c'est normal).
5. « Squash and merge » (un seul commit, c'est déjà le cas) → confirme → « Delete branch ».
6. Localement : `git switch main`, `git pull --ff-only`, `git branch -d docs/readme-cours`, `git fetch --prune`. `git branch -vv` : la branche a disparu.
7. Nettoyage bonus : `git branch --merged main` liste tes 9 branches mergées. Pour chacune : `git branch -d <nom>` puis `git push origin --delete <nom>`. Ton `git branch` devient lisible.

Résultat attendu : tu as fait le cycle complet une fois. La prochaine fonctionnalité suit le même chemin, et tu ne redécouvres plus un fix non déployé trois semaines après.
