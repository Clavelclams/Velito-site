---
titre: "Simuler avant d'exécuter : la commande qui montre avant d'écrire"
parcours: "dojo-debutant"
ordre: 13
niveau: "solide"
duree: 12
date: 2026-11-13
---

## Le cours

Le 12 novembre, une commande doit refaire le planning du club : désactiver 8 créneaux, supprimer 264 séances futures, en créer 134. Sur la vraie base. Celle des vraies joueuses.

```jeu
{ "type": "devine", "question": "Avant de lancer une commande qui supprime 264 séances, que voudrais-tu voir ?", "indice": "Le coach dessine le système sur la plaquette avant de le faire jouer.", "reponse": "La liste de ce qu'elle FERAIT, sans qu'elle le fasse. C'est une simulation (en anglais : dry-run, tour à blanc)." }
```

### Mot 1 : simulation

Dans `src/Command/PlanningMabb202611Command.php`, la commande ne touche à rien par défaut. Elle affiche son plan, puis s'arrête. Pour écrire vraiment, il faut le demander :

```bash
php bin/console app:planning:mabb-2026-11              # simulation, rien n'est écrit
php bin/console app:planning:mabb-2026-11 --execute    # applique
```

`--execute` est une **option** : un mot ajouté à la commande pour changer son comportement. Le choix important : le mode sans danger est celui par défaut. Si tu oublies l'option, il ne se passe rien.

```jeu
{ "type": "trous", "consigne": "Tu as relu la simulation, tout est bon. Complète pour appliquer.", "code": "php bin/console app:planning:mabb-2026-11 ___", "choix": ["--force", "--execute", "--dry-run", "--env=prod"], "bonne": 1, "explication": "Dans cette commande, l'option s'appelle --execute. Sans elle : simulation." }
```

### Mot 2 : transaction

Et si la commande plante au milieu ? 100 séances supprimées, 0 créée ? Non. Elle travaille dans une **transaction** : tout ou rien.

Image : le distributeur de billets. Soit ton compte est débité ET tu as le billet, soit rien du tout.

```php
$conn->beginTransaction();
try {
    // ... toutes les modifications ...
    $conn->commit();
} catch (\Throwable $e) {
    $conn->rollBack();
}
```

`beginTransaction` : on commence au brouillon. `commit` : on valide tout d'un coup. `rollBack` : on déchire le brouillon. La même structure est dans `src/Command/FusionnerSeancesGroupeCommand.php`.

```jeu
{ "type": "paires", "consigne": "Associe chaque mot à son rôle.", "paires": [["beginTransaction", "Commencer au brouillon"], ["commit", "Valider toutes les modifications"], ["rollBack", "Tout annuler après une erreur"], ["--execute", "Demander d'écrire pour de vrai"]] }
```

### Mot 3 : idempotent

**Idempotent** : relancer la commande ne change rien de plus. Comme le bouton de l'ascenseur : appuyer dix fois n'appelle pas dix ascenseurs. Ici, un créneau déjà identique est gardé tel quel, rien n'est créé en double.

```jeu
{ "type": "vraifaux", "affirmation": "Une commande idempotente, lancée deux fois, crée tout en double.", "vrai": false, "explication": "C'est l'inverse : la deuxième fois, elle constate que le travail est fait et ne change rien de plus." }
```

### L'histoire : la simulation qui a sauvé la CEC

Le `--execute` du 12/11 crée un groupe nommé « U15 B et U18 B ». Par prudence, on relance la simulation juste après. Surprise : l'équipe U15 B est devenue « ambiguë ».

La commande retrouve les équipes par leur **nom**. Or le nom du nouveau groupe contient « u15 » et « b ». Deux candidats pour U15 B : elle ne sait plus choisir. Un deuxième `--execute` aurait désactivé le créneau de la CEC.

```jeu
{ "type": "choix", "question": "Qu'est-ce qui a permis de voir le piège avant les dégâts ?", "choix": ["Un message d'une coach", "La simulation relancée après l'exécution", "Une erreur 500", "La sauvegarde de la nuit"], "bonne": 1, "explication": "La simulation a montré « ambiguë » sans rien écrire. Le correctif exclut les noms de groupes de la recherche des équipes." }
```

```jeu
{ "type": "ordre", "consigne": "Remets le bon déroulé d'une commande qui modifie la base.", "etapes": ["Lancer la simulation", "Lire chaque ligne du plan", "Lancer avec --execute", "Relancer la simulation de contrôle", "Vérifier dans l'application"], "explication": "La simulation d'après est aussi utile que celle d'avant : elle doit dire qu'il n'y a plus rien à faire." }
```

## À retenir

- **Simulation** : la commande montre ce qu'elle ferait, sans écrire.
- Le mode sûr est celui **par défaut** ; écrire demande `--execute`.
- **Transaction** : tout ou rien, `commit` valide, `rollBack` annule.
- **Idempotent** : relancer ne change rien de plus.
- On relance la simulation **après** chaque exécution.

## Mise en pratique

Ouvre `src/Command/FusionnerSeancesGroupeCommand.php` dans `mabb-site`. Sans rien modifier, trouve quatre lignes : celle qui déclare l'option `execute`, `beginTransaction`, `commit` et `rollBack`. Note leurs numéros.

C'est réussi quand tu peux expliquer à voix haute, sans regarder : « sans `--execute` rien n'est écrit ; avec, tout passe dans une transaction, et une erreur annule tout ».
