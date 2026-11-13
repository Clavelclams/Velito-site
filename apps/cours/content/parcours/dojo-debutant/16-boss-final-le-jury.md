---
titre: "Boss final : le jury"
parcours: "dojo-debutant"
ordre: 16
niveau: "expert"
duree: 15
date: 2026-11-13
---

## Le cours

Avril 2027. Trois personnes en face de toi. L'une pointe une ligne de ton code : « Pourquoi avoir fait ça ? » Tu as quinze leçons derrière toi. Il reste à savoir **répondre**.

### La routine du lancer franc

Un bon tireur fait toujours les mêmes gestes avant de tirer. Toi aussi : quatre phrases, toujours dans le même ordre.

1. **Ce que j'ai fait.** Un fait, un fichier.
2. **Pourquoi.** Le problème réel que ça règle.
3. **Ce que ça évite.** Le bug ou le risque écarté.
4. **La limite que je connais.** Ce qui n'est pas parfait, et ce que je ferais ensuite.

La quatrième phrase fait la différence. Un jury se méfie de celui qui dit que tout est parfait. Il fait confiance à celui qui connaît ses limites.

```jeu
{ "type": "ordre", "consigne": "Remets la réponse au jury dans l'ordre de la routine.", "etapes": ["Ce que j'ai fait", "Pourquoi je l'ai fait", "Ce que ça évite", "La limite que je connais"], "explication": "Fait, raison, risque évité, limite. Quatre phrases courtes valent mieux qu'un long discours." }
```

### Échauffement : le vocabulaire

```jeu
{ "type": "paires", "consigne": "Associe chaque mot à sa définition.", "paires": [["Route", "Le lien entre une adresse et un bout de code"], ["Migration", "La notice qui modifie la base, avec up et down"], ["Service", "Une règle métier écrite à un seul endroit"], ["Voter", "Le code qui répond oui ou non à une demande de droit"], ["Cron", "Le réveil qui lance une commande à heure fixe"]] }
```

### Les questions pièges

Le jury aime les « pourquoi pas l'autre solution ? ». Entraîne-toi.

```jeu
{ "type": "choix", "question": "Dans l'API, une coach demande une équipe qui n'est pas la sienne. Pourquoi répondre 404 et pas 403 ?", "choix": ["Parce que 403 n'existe pas en JSON", "Pour ne pas confirmer que cette équipe existe", "Parce que 404 est plus rapide à calculer", "Parce que l'app ne sait pas lire un 403"], "bonne": 1, "explication": "Un 403 dirait « elle existe, mais pas pour toi ». Le 404 ne révèle rien. Le commentaire est dans ApiClubCoachController.php : on ne confirme pas l'existence d'une équipe qui n'est pas la sienne." }
```

```jeu
{ "type": "choix", "question": "Pourquoi écrire down() dans chaque migration, alors qu'on ne veut jamais revenir en arrière ?", "choix": ["Pour sauvegarder les données avant up()", "Parce que Doctrine refuse de jouer up() sans down()", "Pour pouvoir défaire le changement si la nouveauté pose problème", "Pour vider le cache après la migration"], "bonne": 2, "explication": "down() est la marche arrière. Attention au piège : il ne sauvegarde rien, une colonne supprimée par down() perd son contenu. La sauvegarde se fait à part, avant." }
```

```jeu
{ "type": "vraifaux", "affirmation": "Une commande dans une transaction n'a pas besoin de sauvegarde avant.", "vrai": false, "explication": "La transaction protège d'un plantage en cours de route. Elle ne protège pas d'une commande qui réussit à faire la mauvaise chose. Seule la sauvegarde permet de revenir en arrière." }
```

### Le déploiement, les yeux fermés

```jeu
{ "type": "ordre", "consigne": "Remets le déploiement d'un lot avec migration dans l'ordre.", "etapes": ["Sauvegarder la base", "Pousser le code depuis le PC (git push)", "Récupérer le code sur le serveur", "Jouer la migration", "Vider le cache de production", "Tester la page ou la route concernée"], "explication": "La sauvegarde en premier, le test en dernier. Entre les deux, le code arrive avant la migration qui en dépend." }
```

### Le match : dix questions de jury

Lis la question. Réponds **à voix haute**. Retourne la carte seulement après.

```jeu
{ "type": "cartes", "titre": "Le jury t'interroge", "cartes": [{ "recto": "C'est quoi une route, dans votre projet ?", "verso": "C'est le lien entre une adresse et le code qui y répond. J'ai eu un 404 parce que deux contrôleurs déclaraient /seances/{id} : le premier lu gagnait. J'ai déplacé la bibliothèque sous /bibliotheque." }, { "recto": "Quel est le rôle d'un contrôleur ?", "verso": "Il reçoit la demande, vérifie le droit, fait travailler les services et renvoie la réponse. Je n'y mets pas de règle métier : elle va dans un service." }, { "recto": "Pourquoi un jeton CSRF sur vos formulaires ?", "verso": "Tout ce qui modifie passe en POST, et le jeton prouve que le formulaire vient bien de mon site. Sans jeton valide, je n'enregistre rien." }, { "recto": "Pourquoi une migration plutôt qu'une modification à la main ?", "verso": "Parce que j'ai deux serveurs. La migration est écrite, relue et rejouée à l'identique sur chacun. Je la garde petite, avec un down(), et je sauvegarde avant." }, { "recto": "Pourquoi avoir créé des services ?", "verso": "Pour écrire une règle une seule fois. Le site et l'API appellent le même service, donc ils prennent la même décision." }, { "recto": "Comment empêchez-vous un club de voir les données d'un autre ?", "verso": "Chaque route commence par denyAccessUnlessGranted avec mon ClubVoter, sur l'objet demandé. Le droit se vérifie dans le club de l'objet. Dans l'API, je réponds 404 pour ne rien révéler." }, { "recto": "Que faites-vous devant une erreur 500 en production ?", "verso": "Je ne corrige pas au hasard. J'ouvre le log daté du jour dans var/log, je cherche la ligne CRITICAL et je lis l'erreur en entier. C'est comme ça que j'ai trouvé une variable d'environnement absente." }, { "recto": "Où sont vos mots de passe et vos clés ?", "verso": "Dans .env.local, sur chaque serveur, jamais commité. Le code est le même partout, seuls ces réglages changent. Si une variable manque, j'ai prévu une valeur de repli quand c'est possible." }, { "recto": "Comment lancez-vous une commande qui modifie la base ?", "verso": "Elle simule par défaut et n'écrit qu'avec --execute, dans une transaction. Je relance la simulation après : une fois, elle m'a montré qu'un second passage aurait désactivé un créneau." }, { "recto": "Citez une limite de votre projet.", "verso": "Je n'ai pas de base de test locale fiable : mes migrations ne se testent vraiment qu'en production. Je compense avec des migrations petites, un down() écrit et une sauvegarde avant. La suite logique serait une base de test." }] }
```

## À retenir

- Quatre phrases : ce que j'ai fait, pourquoi, ce que ça évite, la limite que je connais.
- Une réponse s'appuie sur un fait réel : un fichier, une date, un bug.
- 404 plutôt que 403 dans l'API : ne pas révéler ce qui existe.
- `down()` défait, la sauvegarde protège : ce sont deux choses différentes.
- Dire sa limite soi-même vaut mieux que se la faire trouver.

## Mise en pratique

Lance un chronomètre sur 20 minutes. Prends les dix cartes dans l'ordre. Pour chacune, réponds à voix haute en moins d'une minute, avec les quatre phrases de la routine, puis retourne la carte. Enregistre-toi avec ton téléphone si tu peux.

C'est réussi quand tu as répondu à huit cartes sur dix sans regarder le verso, en citant à chaque fois un fichier ou un moment réel de Venaball.
