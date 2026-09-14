---
titre: "Variables d'environnement en prod : Vercel, .env.local sur OVH, et les trois erreurs de l'été"
parcours: "deploiement"
ordre: 4
niveau: "intermediaire"
duree: 20
date: 2026-09-09
---

## Le cours

Une variable d'environnement, c'est une valeur que ton code lit avec `process.env.X` (Node) ou `$_ENV['X']` / `%env(X)%` (Symfony), et qui **change selon l'endroit où le code tourne** : URL de base de dev vs prod, clé de test vs clé réelle. Le code est le même partout ; l'environnement le configure.

**Sur Vercel : le dashboard.** Settings → Environment Variables. Chaque variable a un nom, une valeur, une portée (Production / Preview / Development), et un drapeau *Sensitive*. Trois règles vues cet été à la dure :

1. **Snapshot à la création.** Le déploiement emporte les variables telles qu'elles sont **à l'instant du push**. Ajouter ou modifier après = Redeploy obligatoire.
2. **`NEXT_PUBLIC_` + Sensitive = vide.** Sensitive empêche la lecture au build ; `NEXT_PUBLIC_` est inliné au build. Incompatibles. Une variable serveur peut être Sensitive ; une publique, non.
3. **Listée dans `turbo.json`.** Sinon invisible au build.

**Sur OVH : le fichier `.env.local`.** Il est **sur le serveur**, dans le dossier du site, jamais dans Git. Symfony le lit au démarrage et le fusionne par-dessus `.env` (commité, valeurs par défaut). Modifier une variable = éditer le fichier en SSH (`nano .env.local`) puis `php bin/console cache:clear --env=prod` — Symfony met en cache la configuration compilée, et sans clear, l'ancienne valeur reste. Deux instances (MABB, Venaball) = deux `.env.local` différents : même code, `DATABASE_URL` différente, `APP_SUB_MANAGER` différent.

**La composition Symfony.** `.env` → `.env.local` → `.env.$APP_ENV` → `.env.$APP_ENV.local`, chacun écrasant le précédent. En prod, `APP_ENV=prod` dans `.env.local` sélectionne la chaîne prod. Un oubli d'`APP_ENV` laissait Venaball en `dev` — avec la barre de debug et les traces complètes visibles par tous. Le défaut a été passé à `prod` le 26 juillet : **une config manquante doit donner l'état sûr, pas l'état pratique.** Même principe que le middleware fail-closed du parcours React.

Pour aller plus loin en prod : `composer dump-env prod` génère `.env.local.php`, un fichier PHP compilé lu plus vite que le parsing du `.env` à chaque requête. Optionnel sur un mutualisé, utile sous charge.

**Le contrat entre le code et l'environnement.** Le code **attend** des variables. Si l'une manque, trois comportements possibles : planter au démarrage (le mieux : on le voit tout de suite), planter à la première utilisation (on le voit quand un utilisateur tombe dessus), ou continuer avec `undefined` (le pire : ça « marche » faux). `lib/supabase/server.ts` de cours lève une erreur explicite si les variables manquent — c'est le premier comportement. Symfony refuse de démarrer si un `%env(X)%` référencé dans `services.yaml` n'est pas défini — pareil. Le middleware de cours laissait passer — c'était le troisième, et c'est corrigé.

**Documenter ce qui est attendu.** `.env` commité (Symfony) ou `.env.example` (Next) liste chaque variable avec une valeur factice et un commentaire. Un nouveau développeur — ou toi dans six mois — sait quoi fournir. Sur Vercel, il n'y a pas de fichier : le `.env.example` de chaque app est la seule documentation, tiens-le à jour.

**Ce qui n'est pas une variable d'environnement.** Une configuration métier qui change souvent (la date du jury, un tarif, un texte) va en base ou dans un fichier de contenu, pas en variable d'env — sinon chaque changement est un redeploy. Une variable d'env est pour ce qui dépend de **l'infrastructure** : URLs, clés, secrets, drapeaux d'environnement.

**Les trois erreurs de l'été, résumées pour ne plus les faire.**

| Symptôme | Cause | Fix |
|---|---|---|
| Lien Cours absent du hub après déploiement | Variable ajoutée après le push (snapshot) | Redeploy |
| `NEXT_PUBLIC_X` vide en prod | Marquée Sensitive | Décocher Sensitive |
| Variable présente dans Vercel mais `undefined` au build | Absente de `turbo.json` | L'ajouter à `tasks.build.env` |

## À retenir

- Vercel : dashboard, portée, snapshot au push, `NEXT_PUBLIC_`≠Sensitive, `turbo.json`.
- OVH : `.env.local` sur le serveur, jamais dans Git, `cache:clear` après modification.
- Config manquante → état sûr (`APP_ENV=prod` par défaut, erreur explicite au démarrage).
- `.env.example` / `.env` commité = le contrat, à tenir à jour.
- Infrastructure en variable d'env ; métier en base ou en contenu.

## Mise en pratique

Objectif : auditer les deux `.env.local` OVH, rendre le démarrage strict, et documenter le contrat.

1. SSH sur l'instance MABB : `cat .env.local` (ne le copie nulle part). Compare avec `.env` commité : chaque variable du `.env.local` a-t-elle une ligne dans `.env` avec un commentaire ? Sinon, ajoute la ligne (valeur factice) dans `.env`, commit.
2. Même chose sur l'instance Venaball. Liste les variables qui **diffèrent** entre les deux : `DATABASE_URL`, `APP_SUB_*`, `MAILER_DSN`… C'est la définition de « deux instances ».
3. `grep -n "APP_ENV" .env .env.local` sur les deux serveurs. `prod` partout ? Puis `php bin/console debug:container --env-vars` : la liste de ce que Symfony attend, avec les valeurs résolues (masquées pour les secrets). Une variable « not found » = un plantage en attente.
4. Rends une lecture stricte : trouve dans le code Next une lecture `process.env.X` sans vérification qui est **nécessaire** (pas optionnelle). Ajoute `if (!X) throw new Error("X manquante")` au démarrage du module. Redéploie. Si ça plante en Preview, c'est que la variable manquait vraiment en Preview — tu viens de trouver un trou de portée.
5. Crée ou mets à jour `apps/<app>/.env.example` pour chaque app Velito-site : une ligne par variable, valeur factice, commentaire (à quoi ça sert, où la trouver). Commit.
6. Écris dans `instruction/` de Venaball une page « Variables d'environnement » : le tableau des variables, leur rôle, et la procédure de modification (`nano .env.local` + `cache:clear`). C'est ce que tu donnerais à un collaborateur.

Résultat attendu : les deux instances documentées, un démarrage strict sur au moins une variable, et un `.env.example` par app.
