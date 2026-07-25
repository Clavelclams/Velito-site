---
titre: "Git au quotidien pro : .gitignore, diff, revenir en arriere sans peur"
parcours: "terminal"
ordre: 10
niveau: "solide"
duree: 25
date: 2026-07-25
---

## Le cours

Dernière leçon : les outils qui font la différence entre « je connais Git » et « je travaille proprement avec Git » — et pourquoi ton historique est un dossier de preuves pour ton jury CDA.

**`.gitignore`** d'abord. Ce fichier, à la racine du projet, liste ce que Git doit **ignorer** : jamais photographié, jamais proposé au commit. On y trouve toujours les mêmes suspects, et tu sais maintenant pourquoi : `node_modules/` et `vendor/` (reconstructibles, leçons 5-6), `.env.local` (secrets, leçon 7), les dossiers de build (`.next/`, `var/`). Règle d'or : on versionne les **sources**, pas ce qui se **régénère** ni ce qui est **secret**.

Ensuite, les deux commandes de lecture qui te rendent lucide :

```powershell
# L'album, en résumé (une ligne par commit) ; -10 limite aux 10 derniers
git log --oneline -10

# Qu'ai-je changé depuis le dernier commit ? (lignes - en rouge, + en vert)
git diff

# Et qu'y a-t-il exactement sur la table de staging ?
git diff --staged
```

Réflexe pro : `git diff` avant chaque commit — on relit sa photo avant de la coller. C'est là que tu attrapes le `console.log` oublié ou le fichier modifié par accident.

Maintenant, revenir en arrière. Trois outils, du plus courant au plus dangereux :

```powershell
# 1. Annuler les modifications NON commitées d'un fichier
#    (le remettre tel qu'à la dernière photo)
git restore recette.md
# ATTENTION : tes modifications en cours sur ce fichier sont perdues.
# Garde-fou : toujours "git diff recette.md" AVANT, pour voir ce que tu jettes.

# 2. Annuler un commit DÉJÀ dans l'historique : git revert crée un
#    commit inverse qui défait les changements, sans effacer l'histoire
git revert HEAD        # HEAD = le dernier commit
```

Et le troisième, `git reset --hard`, celui des tutos de forums : il **efface** des commits comme s'ils n'avaient jamais existé. Comprends la différence philosophique : `revert` ajoute une page « erratum » à l'album (l'erreur ET sa correction restent visibles — l'histoire est honnête), `reset --hard` arrache des pages. Sur un travail déjà pushé, arracher des pages que d'autres ont lues crée le chaos. Règle simple pour les deux prochaines années : **`revert` par défaut ; `reset --hard` jamais sans avoir vérifié `git status` et `git log`, jamais sur du travail pushé, et idéalement jamais tout court**. Si un jour tu crois avoir tout perdu : ne touche plus à rien et cherche `git reflog` — Git garde un journal de secours de tout ce que tu as fait. Il est très difficile de vraiment perdre du travail commité.

Enfin, parlons du jury CDA. Ton historique Git est une **preuve professionnelle** à trois titres. Un : la paternité — des mois de commits signés à ton nom, datés, démontrent que ce code est le tien, construit progressivement (pas copié la veille). Deux : la démarche — un historique aux messages clairs (« Ajout de la validation des adhésions », « Correction de la migration des cotisations ») raconte ta méthode de travail, exactement ce que le référentiel CDA évalue. Trois : la traçabilité — en entretien, pouvoir montrer `git log`, expliquer un `revert` assumé ou une branche fusionnée, c'est prouver que tu maîtrises l'outil central du métier. Chaque commit propre que tu fais aujourd'hui dans `mabb-site` est une pièce que tu verses à ton dossier d'avril 2027. Commite souvent, commite clair : ton toi de la soutenance te dira merci.

## À retenir

- `.gitignore` exclut du versionnement ce qui se régénère (`node_modules`, `vendor`, builds) et ce qui est secret (`.env.local`).
- `git diff` avant chaque commit : on relit sa photo avant de la coller dans l'album.
- `git restore fichier` jette les modifications non commitées (vérifier avec `git diff` avant !) ; `git revert` annule un commit en créant un commit inverse, sans effacer l'histoire.
- `reset --hard` efface l'histoire : jamais sur du travail pushé, et `revert` par défaut ; en cas de panique, `git reflog` est le journal de secours.
- Mon historique Git est une preuve pour le jury CDA : paternité du code, démarche progressive, messages clairs — chaque commit propre prépare avril 2027.

## Mise en pratique

Objectif : t'entraîner à `restore` et `revert` dans le labo (aucun risque), puis auditer les `.gitignore` de tes vrais projets en lecture seule.

1. `cd "C:\Users\Velito Adventure\Documents\terminal-lab"`. Vérifie avec `git status` que tout est propre.
2. Entraînement `restore` : ouvre `recette.md` (`code recette.md`), ajoute une ligne `Sel : 3 kilos` (volontairement absurde), enregistre. Tape `git diff` : la ligne apparaît en `+`. Comme c'est bien elle que tu veux jeter, tape `git restore recette.md`, rouvre le fichier : la ligne a disparu, retour à la dernière photo.
3. Entraînement `revert` : ajoute une ligne `Piment : 500 g` (toujours absurde), enregistre, puis commite-la : `git add recette.md` et `git commit -m "Ajout piment (erreur volontaire)"`.
4. Annule ce commit proprement : `git revert HEAD` (valide le message proposé). Puis `git log --oneline -4` : tu vois l'erreur ET son annulation — l'histoire complète, honnête, rien d'effacé.
5. Audit `.gitignore` n°1 : `cd "C:\Users\Velito Adventure\Documents\Velito-site"`, puis `cat .gitignore`. Retrouve `node_modules` et les dossiers de build ; relie chaque ligne à sa raison (reconstructible ? secret ?).
6. Audit n°2 : `cd "C:\Users\Velito Adventure\Documents\mabb-site"`, puis `cat .gitignore`. Vérifie que `/vendor/` et `.env.local` y figurent — la théorie des leçons 6 et 7 confirmée par tes propres projets.
7. Constitue ta preuve jury : toujours dans mabb-site, tape `git log --oneline -20` puis `git shortlog -sn` (nombre de commits par auteur). Note ton total de commits.
8. Pour finir : `git log --since="1 month ago" --oneline` — relis tes messages du mois. Choisis ton meilleur message et ton pire, et reformule le pire comme tu l'écrirais aujourd'hui.

Résultat attendu : une modification jetée avec `restore`, un commit annulé avec `revert` (les deux visibles dans le log — c'est le but), la confirmation que tes vrais `.gitignore` appliquent la règle « ni régénérable, ni secret », et un chiffre concret — ton nombre de commits sur mabb-site — première pièce de ton dossier pour le jury d'avril 2027.
