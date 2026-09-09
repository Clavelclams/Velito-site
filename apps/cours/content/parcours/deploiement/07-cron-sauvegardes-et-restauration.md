---
titre: "Sauvegardes : un dump qu'on n'a jamais restauré n'est pas une sauvegarde"
parcours: "deploiement"
ordre: 7
niveau: "solide"
duree: 25
date: 2026-09-09
---

## Le cours

Venaball a eu zéro sauvegarde pendant des mois. Depuis le 13 juillet, un script tourne chaque nuit. Cette leçon explique ce qu'il fait, ce qu'il ne fait pas, et pourquoi tu n'as **toujours pas** de sauvegarde au sens strict.

**Ce qui doit être sauvegardé.** La **base de données** — c'est là que vivent les joueuses, les stats, les cotisations. Les **fichiers déposés** (`public/uploads/`, `var/uploads/`) — justificatifs, photos ; ils ne sont pas dans Git. Le **`.env.local`** — sans lui, le code ne sait pas où est la base. Le code, lui, est dans Git : pas besoin.

**`bin/sauvegarde-bdd.sh`, ligne par ligne.**

- `set -euo pipefail` — arrêt au premier échec, variable non définie = erreur, pipe cassé = erreur. Sans ça, un `mysqldump` qui échoue à moitié produit un fichier tronqué, compressé, daté, qui a l'air d'une sauvegarde.
- Lit `DATABASE_URL` dans `.env.local` et la découpe (user, mot de passe, hôte, port, base). Le mot de passe est décodé (`%40` → `@`) parce que les mots de passe OVH contiennent des caractères encodés dans l'URL.
- `mysqldump --single-transaction` — un instantané cohérent de toutes les tables InnoDB à un même instant, **sans verrouiller** : le site continue de fonctionner pendant le dump. Sans cette option, les tables sont verrouillées le temps de l'export.
- Compression `gzip`, nom daté `var/backups/venaball-2026-09-09.sql.gz`.
- Rotation : suppression des fichiers de plus de 14 jours. Sans rotation, le disque se remplit — et une sauvegarde qui remplit le disque est la panne suivante.

**Le cron.** Manager OVH → Tâches planifiées → tous les jours à 4 h → `/home/<login>/www/bin/sauvegarde-bdd.sh`. Le cron n'est pas dans Git : documente-le (`instruction/33_SAUVEGARDE_BDD.md` le fait).

**Pourquoi ce n'est pas encore une sauvegarde.** Le script le dit lui-même : *« `var/backups` est sur le MÊME hébergement : un backup sur la machine qui brûle n'est pas un backup. »* Si OVH perd le disque, tu perds la base **et** les dumps. La règle **3-2-1** : trois copies, sur deux supports différents, dont une hors site. Aujourd'hui : une copie (la base) plus des dumps au même endroit — ça compte pour un et demi. Il manque la copie **ailleurs** : un `rclone` vers un stockage objet (OVH Object Storage, Backblaze B2, un Google Drive), ou un simple `scp` depuis ton PC chaque semaine. Le script pourrait le faire en une ligne de plus.

**Et surtout : la restauration.** Un dump que tu n'as jamais restauré est une **hypothèse**. Les modes d'échec sont connus et silencieux : jeu de caractères qui casse les accents au retour, `DEFINER` de vue ou de trigger pointant vers un utilisateur qui n'existe pas sur la base cible, fichier tronqué que personne n'a vérifié, version de MySQL différente (MariaDB 10.4 → MySQL 8.4 : ce n'est pas le même moteur, et un dump de l'un peut refuser de s'importer dans l'autre sur certaines syntaxes).

La procédure de test, à faire une fois par mois :

```bash
gunzip -c var/backups/venaball-2026-09-09.sql.gz | mysql -h <hôte> -u <user> -p <base_de_test>
mysql -h <hôte> -u <user> -p <base_de_test> -e "SELECT COUNT(*) FROM joueur; SELECT COUNT(*) FROM rencontre;"
```

Et comparer avec la prod. Si les comptes correspondent, la sauvegarde est réelle. Chronomètre : le jour J, la question ne sera pas « est-ce que ça marche » mais « en combien de temps le club est de nouveau en ligne ».

**Les fichiers déposés.** Ils ne sont **pas** dans le dump SQL. Une ligne `tar -czf var/backups/uploads-$(date +%F).tar.gz public/uploads var/uploads` dans le même script, avec la même rotation, les couvre. Aujourd'hui, un disque perdu = tous les justificatifs perdus.

**Sur Vercel/Supabase.** Vercel n'a rien à sauvegarder (le code est dans Git, les déploiements sont immuables). Supabase fait des sauvegardes quotidiennes automatiques sur les plans payants ; sur le plan gratuit, **non** — ou avec une rétention très courte. Vérifie ton plan. Si tu es en gratuit, un `pg_dump` planifié depuis ton PC ou un GitHub Action vers un stockage est la seule protection de tout Velito-site.

## À retenir

- Sauvegarder : la base, les fichiers déposés, `.env.local`. Pas le code (Git).
- `set -euo pipefail` + `--single-transaction` + rotation. Le script Venaball a les trois.
- 3-2-1 : trois copies, deux supports, une hors site. Il manque le hors site.
- Un dump jamais restauré est une hypothèse. Restaurer dans une base de test, compter, chronométrer, chaque mois.
- Les uploads ne sont pas dans le dump SQL. Supabase gratuit ne sauvegarde pas pour toi.

## Mise en pratique

Objectif : restaurer un dump pour de vrai, ajouter les uploads et la copie hors site, et vérifier Supabase.

1. SSH MABB : `ls -la var/backups/`. Les dumps sont là, datés, ~14 fichiers ? Prends le dernier : `gunzip -c var/backups/<dernier>.sql.gz | head -50` — lis l'en-tête (version de MySQL, jeu de caractères). `gunzip -c … | tail -5` — se termine-t-il par `-- Dump completed` ? Sinon, tronqué.
2. Crée une base de test dans le manager OVH (ou utilise la base de dev locale). Restaure : `gunzip -c <dump> | mysql -h … -u … -p <base_test>`. Chronomètre. Note les erreurs éventuelles (DEFINER, charset).
3. Compte : `SELECT COUNT(*) FROM joueur; SELECT COUNT(*) FROM club; SELECT COUNT(*) FROM action_match;` sur la base de test et sur la prod. Identiques ? Ouvre une fiche joueuse avec un accent sur la base de test (en pointant un `.env.local` de dev dessus) : les accents sont-ils intacts ?
4. Ajoute au script `bin/sauvegarde-bdd.sh` la sauvegarde des uploads (`tar -czf`) avec la même rotation. Teste à la main. Commit.
5. Hors site : depuis ton PC, un script PowerShell `sauvegarde-locale.ps1` qui fait `scp <login>@<cluster>:www/var/backups/*.gz C:\Sauvegardes\venaball\`. Lance-le. Planifie-le (Planificateur de tâches Windows, hebdomadaire). Tu as ta troisième copie.
6. Supabase → Settings → Database → Backups. Quel plan, quelle rétention ? Si aucune sauvegarde : `pg_dump` depuis ton PC avec la connection string (Settings → Database → Connection string, mode session) vers `C:\Sauvegardes\supabase\`. Planifie-le aussi.
7. Écris dans `instruction/33_SAUVEGARDE_BDD.md` : la date de ton test de restauration, le temps mesuré, les erreurs rencontrées et leur fix. C'est la preuve que la sauvegarde est réelle.

Résultat attendu : tu as restauré et compté, les uploads sont sauvegardés, une copie vit hors OVH, et Supabase est couvert.
