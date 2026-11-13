---
titre: "La migration : changer le classeur sans le casser"
parcours: "dojo-debutant"
ordre: 6
niveau: "intermediaire"
duree: 12
date: 2026-11-13
---

## Le cours

Leçon 5 : tu as ajouté la case `motifAnnulation` sur la fiche PHP. Mais le vrai classeur, celui du serveur, n'a pas encore cette case.

```jeu
{ "type": "devine", "question": "Tu déploies la nouvelle entité sans toucher à la base. Que se passe-t-il quand le site lit une séance ?", "indice": "Doctrine va demander au classeur une case qui n'y est pas.", "reponse": "Une erreur. Doctrine demande la colonne motif_annulation, la base répond qu'elle ne la connaît pas, et la page plante. Il faut modifier la base en même temps que le code : c'est le rôle de la migration." }
```

### Une notice de travaux

Une **migration** est un fichier PHP qui contient la notice pour modifier la base. Elle a deux méthodes : `up()` fait les travaux, `down()` les défait.

Celle du 13 novembre s'appelle `migrations/Version20261113100000.php` (son nom, c'est sa date et son heure). Dans `up()`, elle crée la table `fermeture`, puis ajoute les colonnes :

```php
$this->addSql('ALTER TABLE seance ADD motif_annulation VARCHAR(120) DEFAULT NULL, ADD fermeture_id INT DEFAULT NULL');
```

`ALTER TABLE` veut dire « modifie cet intercalaire ». `DEFAULT NULL` : la nouvelle case arrive vide sur toutes les séances existantes. Aucune n'est annulée par accident.

Et dans `down()`, le chemin inverse (extrait) :

```php
$this->addSql('ALTER TABLE seance DROP motif_annulation, DROP fermeture_id');
$this->addSql('DROP TABLE fermeture');
```

```jeu
{ "type": "choix", "question": "À quoi sert down() ?", "choix": ["À sauvegarder la base", "À défaire ce que up() a fait", "À vider le cache"], "bonne": 1, "explication": "Si la nouveauté pose problème, down() ramène la base à son état d'avant. C'est pour ça que tu l'écris toujours." }
```

```jeu
{ "type": "vraifaux", "affirmation": "Après un down(), les motifs d'annulation déjà saisis sont conservés.", "vrai": false, "explication": "DROP supprime la colonne et ce qu'elle contient. Le commentaire en tête de la migration le dit : les séances redeviennent normales, leur motif est perdu. D'où la sauvegarde avant." }
```

### La même notice sur chaque serveur

Tu as deux serveurs, donc deux bases : SSH VELITO et SSH MABB. La même migration est jouée sur les deux, avec la même commande. Les deux classeurs restent identiques.

```jeu
{ "type": "trous", "consigne": "Complète la commande qui joue les migrations en production.", "code": "php bin/console doctrine:migrations:___ --no-interaction --env=prod", "choix": ["up", "migrate", "update", "run"], "bonne": 1, "explication": "migrate joue toutes les migrations pas encore passées, dans l'ordre de leur date." }
```

Doctrine note dans la base quelles migrations sont déjà passées. Il ne rejoue jamais deux fois la même. S'il répond « Already at the latest version », ce n'est pas une erreur : il n'y a rien de nouveau à jouer, la base est à jour.

### Tes trois règles

Une migration est **petite**. Son `down()` est **écrit**. Et **avant** de la jouer, tu sauvegardes :

```bash
bash bin/sauvegarde-bdd.sh
```

```jeu
{ "type": "ordre", "consigne": "Remets le déploiement d'un lot avec migration dans l'ordre.", "etapes": ["Sauvegarder la base avec bin/sauvegarde-bdd.sh", "Récupérer le nouveau code avec git", "Jouer la migration avec migrate", "Vider le cache de prod", "Ouvrir le site pour vérifier"], "explication": "La sauvegarde d'abord : c'est ton filet. Le code avant la migration, car le fichier de migration arrive avec lui. Le cache en dernier." }
```

```jeu
{ "type": "cartes", "titre": "Questions de jury", "cartes": [{ "recto": "Pourquoi une migration plutôt qu'une modification à la main ?", "verso": "Parce qu'elle est écrite, relue, et rejouable à l'identique sur chaque serveur. À la main, les deux bases finiraient différentes." }, { "recto": "Que fais-tu avant de lancer migrate en prod ?", "verso": "Une sauvegarde de la base, et je vérifie que down() est écrit." }, { "recto": "« Already at the latest version » ?", "verso": "Toutes les migrations sont déjà passées sur cette base. Rien à faire." }] }
```

## À retenir

- Une **migration** est la notice qui modifie la base ; elle voyage avec le code.
- `up()` fait, `down()` défait. Tu écris toujours les deux.
- Elle est jouée sur chaque serveur : SSH VELITO et SSH MABB.
- Sauvegarde **avant** : `bash bin/sauvegarde-bdd.sh`.
- Ordre : sauvegarde, git, `migrate`, cache, vérification.
- « Already at the latest version » = la base est à jour, ce n'est pas une erreur.

## Mise en pratique

Ouvre `migrations/Version20261113100000.php` (lecture seule). Sur une feuille, fais deux colonnes : `up()` à gauche, `down()` à droite. Pour chaque ligne `addSql` de gauche, trouve à droite la ligne qui la défait et relie-les d'un trait.

C'est réussi quand chaque ligne de `up()` est reliée, et que tu peux expliquer pourquoi `down()` retire les colonnes de `seance` avant de supprimer la table `fermeture`, alors que `up()` a fait l'inverse.
