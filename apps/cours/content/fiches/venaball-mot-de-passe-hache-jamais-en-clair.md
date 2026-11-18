---
titre: "Un mot de passe ne se stocke pas, il se hache : ce que contient vraiment la colonne password"
projet: "venaball"
bloc: 1
themes: ["securite-applicative", "authentification"]
source: "config/packages/security.yaml"
date: 2026-11-18
---

## Le concept

Deux fois en novembre 2026, une personne du club ne pouvait plus se connecter et m'a demandé de lui remettre un mot de passe. Je l'ai fait en ligne de commande sur le serveur. C'est l'occasion de comprendre ce qu'il y a dans la colonne `password` de la table `user`.

```jeu
{ "type": "vraifaux", "affirmation": "En tant qu'administrateur de la base, je peux lire le mot de passe de n'importe quel compte.", "vrai": false, "explication": "La base ne contient pas les mots de passe, seulement leur hachage. Même avec un accès complet, on ne peut pas retrouver le mot de passe d'origine. C'est le but." }
```

Un **hachage** est une transformation à sens unique : on calcule facilement le hash à partir du mot de passe, on ne peut pas faire le chemin inverse. À la connexion, Symfony hache ce que la personne tape et compare. Si la base fuit, l'attaquant récupère des hashs, pas des mots de passe.

La configuration tient en une ligne :

```yaml
# config/packages/security.yaml
password_hashers:
    Symfony\Component\Security\Core\User\PasswordAuthenticatedUserInterface: 'auto'
```

`auto` laisse Symfony choisir l'algorithme recommandé (bcrypt aujourd'hui sur ce projet) et, surtout, permet de **migrer** : si un jour l'algorithme change, le hash d'un compte est recalculé à sa prochaine connexion réussie. C'est pour ça que l'outil affiche `MigratingPasswordHasher`.

Un hash bcrypt fait toujours 60 caractères et se lit en trois morceaux :

```text
$2y$13$<22 caractères de sel><31 caractères de hash>
 │   │
 │   └─ coût : 2 puissance 13 tours de calcul
 └───── version de l'algorithme
```

- Le **sel** est une valeur aléatoire, différente pour chaque compte, rangée dans le hash lui-même. Deux personnes qui choisissent le même mot de passe ont donc deux hashs différents, et un attaquant ne peut pas utiliser une table de hashs calculés d'avance.
- Le **coût** rend le calcul volontairement lent (quelques dixièmes de seconde). Sans effet pour une connexion, ruineux pour qui veut essayer des milliards de mots de passe.

```jeu
{ "type": "choix", "question": "Pourquoi ne pas hacher les mots de passe avec SHA-256, qui est aussi à sens unique ?", "choix": ["SHA-256 est réversible", "SHA-256 est très rapide et sans sel : on peut tester des milliards de mots de passe par seconde", "SHA-256 produit des hashs trop longs pour MySQL", "SHA-256 n'existe pas en PHP"], "bonne": 1, "explication": "Pour un mot de passe, la lenteur est une qualité. SHA-256 convient très bien pour un jeton aléatoire de 64 caractères (c'est ce que fait l'entité ApiToken), pas pour un mot de passe choisi par un humain." }
```

La procédure que j'ai suivie, sur le serveur :

```bash
php bin/console security:hash-password --env=prod
php bin/console dbal:run-sql 'UPDATE `user` SET password = "<hash>" WHERE id = <id>' --env=prod
php bin/console dbal:run-sql 'SELECT id, LENGTH(password) AS longueur FROM `user` WHERE id = <id>' --env=prod
```

La première commande demande le mot de passe sans l'afficher et rend le hash. La troisième vérifie que la colonne fait bien 60 caractères. Elle existe à cause d'un piège réel : un hash bcrypt contient des `$`. Entre guillemets **doubles**, le terminal bash lit `$2y`, `$13` comme des variables, les remplace par du vide, et enregistre un hash tronqué. La commande répond « 1 ligne modifiée », et plus personne ne peut se connecter à ce compte. D'où les guillemets **simples** autour de la commande, et le contrôle de longueur.

Sans hachage : une seule fuite de la base donnerait le mot de passe de tout le club, y compris de mineures, et beaucoup de gens réutilisent le même partout.

## Comment je l'explique au jury

« Je ne stocke aucun mot de passe. La colonne contient un hachage bcrypt : une empreinte à sens unique, avec un sel aléatoire par compte et un coût qui rend chaque essai lent. À la connexion, Symfony hache la saisie et compare les empreintes. Le réglage est sur `auto`, ce qui me permettra de changer d'algorithme sans forcer tout le monde à changer de mot de passe. Quand j'ai dû dépanner un compte à la main, je n'ai manipulé que le hash, généré par la commande de Symfony, et j'ai vérifié sa longueur après l'écriture, parce que les dollars d'un hash sont interprétés par le terminal si on se trompe de guillemets. »

## La question vicieuse du jury

**« Vous avez choisi vous-même le mot de passe d'une utilisatrice. C'est une bonne pratique ? »**

Non, et je ne la défends pas. Au moment où je tape son mot de passe, je le connais, et il a transité par un canal non sûr quand je le lui ai donné. La base est protégée, la procédure ne l'est pas. La bonne pratique est le lien de réinitialisation à usage unique envoyé par e-mail : la personne choisit son mot de passe, personne d'autre ne le voit. La fonction « Mot de passe oublié » existe dans l'application. Je suis passé par la console parce que la personne me l'a demandé et que c'était plus rapide ; il aurait au minimum fallu l'obliger à le changer à la première connexion, ce que le code ne sait pas faire aujourd'hui.

Deuxième faiblesse, plus grave, déjà notée dans ma fiche projet : `login_throttling` est commenté dans `config/packages/security.yaml`. Rien ne limite le nombre de tentatives de connexion sur le web. Le coût de bcrypt ralentit une attaque sur une base volée, il ne protège pas contre quelqu'un qui essaie mille mots de passe courants sur le formulaire. Le hachage et la limitation des tentatives répondent à deux attaques différentes, et il me manque la seconde.

Enfin, je n'ai pas vérifié les règles de robustesse imposées à l'inscription (longueur minimale, mots de passe trop courants). Un hash solide d'un mot de passe « 123456 » reste cassé en une seconde.
