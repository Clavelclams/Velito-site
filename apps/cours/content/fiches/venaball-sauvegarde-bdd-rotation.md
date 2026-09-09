---
titre: "Un backup sur la machine qui brûle n'est pas un backup"
projet: "venaball"
bloc: 2
themes: ["base-de-donnees", "deploiement"]
source: "bin/sauvegarde-bdd.sh, instruction/33_SAUVEGARDE_BDD.md"
date: 2026-09-04
---

## Le concept

Toutes les données du club — joueuses, stats, convocations, cotisations, trésorerie — vivent dans une base MySQL sur un hébergement mutualisé OVH. Pendant des mois, il n'y en a eu **aucune sauvegarde**. C'est le risque le plus grave que le projet ait porté, et il n'était pas technique : il était simplement absent de ma liste.

Le script en place fait quatre choses :

```bash
set -euo pipefail
DIR="$(cd "$(dirname "$0")/.." && pwd)"
URL="$(grep -E '^DATABASE_URL=' "$DIR/.env.local" | head -1 | cut -d= -f2- | tr -d '"')"
```

**`set -euo pipefail`** est la première ligne qui compte. `-e` arrête au premier échec, `-u` refuse une variable non définie, `-o pipefail` fait échouer un pipe si n'importe quel maillon échoue. Sans ça, un script shell continue après une erreur — et produit un fichier de sauvegarde vide qu'on croira valide jusqu'au jour où on en aura besoin.

**`mysqldump --single-transaction`** est le choix technique central. Sans lui, `mysqldump` verrouille les tables pendant l'export : le site est figé le temps du dump. Avec, l'export se fait dans une transaction en isolation *repeatable read* — on obtient un instantané **cohérent** de toutes les tables à un même point dans le temps, sans bloquer les écritures. (Valable pour InnoDB ; ça ne couvre pas MyISAM, qui ne connaît pas les transactions.)

**La rotation** supprime les dumps de plus de 14 jours. Sans elle, la sauvegarde finit par remplir le disque — et une sauvegarde qui remplit le disque devient elle-même la panne.

Et le lancement quotidien à 4 h par le cron OVH, parce qu'une sauvegarde qu'il faut penser à lancer n'est pas une sauvegarde.

Le commentaire le plus important du fichier est un avertissement contre lui-même :

> ⚠️ `var/backups` est sur le MÊME hébergement : télécharger une copie ailleurs régulièrement — **un backup sur la machine qui brûle n'est pas un backup.**

## Comment je l'explique au jury

« La base de production n'avait aucune sauvegarde, ce qui était le premier risque du projet. J'ai écrit un script lancé par le cron OVH chaque nuit : `mysqldump --single-transaction`, compression, datage, et rotation à quatorze jours. Le `--single-transaction` est le point technique : il donne un instantané cohérent de toutes les tables sans verrouiller la base, donc sans figer le site pendant l'export. Le script commence par `set -euo pipefail`, sinon une erreur au milieu produirait silencieusement un fichier vide. Et je documente sa limite dans le fichier lui-même : les dumps sont sur le même hébergement que la base, donc ce n'est pas encore une vraie sauvegarde. »

## La question vicieuse du jury

**« Vous avez déjà restauré depuis un de ces fichiers ? »**

Non — et c'est la question qui fait mal, parce qu'elle transforme ma sauvegarde en hypothèse. Un dump jamais restauré n'est pas une sauvegarde, c'est un fichier dont on espère qu'il en est une. Les modes d'échec sont connus : jeu de caractères qui casse les accents au retour, `DEFINER` de vues ou de triggers qui pointe vers un utilisateur inexistant sur la machine de restauration, fichier tronqué que personne ne remarque parce que le script n'a pas vérifié sa taille. Ce que je devrais faire, et qui n'est pas fait : une restauration périodique dans une base de test, avec un contrôle simple — le nombre de joueuses et de rencontres correspond-il à la production ? Ce serait aussi l'occasion de chronométrer la restauration, parce que le jour où j'en aurai besoin, la vraie question ne sera pas « est-ce que ça marche » mais « en combien de temps le club est de nouveau en ligne ». Aujourd'hui je n'ai la réponse à aucune des deux.
