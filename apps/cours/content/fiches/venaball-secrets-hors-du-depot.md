---
titre: "Ce qui est entré dans Git y reste : sortir les secrets d'un dépôt"
projet: "venaball"
bloc: 3
themes: ["securite-applicative", "deploiement", "rgpd"]
source: "commit 16b658d (26/07/2026)"
date: 2026-09-04
---

## Le concept

Un audit de mon dépôt a montré qu'il contenait des choses qui n'avaient rien à y faire : un `.env` de développement avec des identifiants, des dumps SQL de la base, et des PV de réunion nominatifs.

Le fait à comprendre avant tout : **`git rm` ne supprime rien**. Git est un historique — le fichier disparaît de la version courante, et reste consultable dans tous les commits précédents. Quiconque clone le dépôt récupère l'historique complet.

Donc la seule conclusion saine : **tout secret qui a été commité doit être considéré comme compromis et changé.** Pas nettoyé — changé. Réécrire l'historique (`git filter-repo`, BFG) est possible mais ne suffit jamais : le secret a pu être cloné, lu, indexé pendant tout le temps où il était là.

La structure qui évite d'y revenir, sur Symfony :

- **`.env`** est commité. Il ne contient que des valeurs par défaut de développement et surtout la **liste des variables attendues** — c'est de la documentation exécutable : un nouveau développeur voit tout de suite ce qu'il doit fournir.
- **`.env.local`** n'est jamais commité. C'est lui qui porte les vraies valeurs, et il vit **sur le serveur**.
- `.gitignore` interdit `.env.local`, `var/`, les dumps.

Le script de sauvegarde applique la même logique et le dit dans son en-tête : *« lit `DATABASE_URL` dans `.env.local` — jamais de mot de passe en dur ici, ce fichier est commité, les secrets restent dans `.env.local` sur OVH »*.

Le troisième item est le plus facile à sous-estimer : les **PV nominatifs**. Ce ne sont pas des secrets techniques, ce sont des **données personnelles** — des noms de personnes dans des comptes rendus d'association. Le RGPD ne fait pas de différence entre une fuite par une faille et une fuite par un dépôt de code. Un dépôt Git est un lieu de stockage comme un autre, avec la particularité de se copier tout seul à chaque clone.

Dans le même mouvement, `APP_ENV` est passé à `prod` par défaut. En `dev`, Symfony affiche la page d'exception complète : chemins des fichiers, extraits de code, variables d'environnement. Un défaut à `prod` fait qu'un oubli de configuration produit une page d'erreur sobre au lieu d'un plan de l'application.

## Comment je l'explique au jury

« Mon dépôt contenait un `.env` de dev, des dumps SQL et des PV nominatifs. Je les ai retirés, mais le point important est que `git rm` ne supprime pas : le fichier reste dans l'historique, donc tout secret commité est compromis et doit être changé, pas seulement effacé. J'ai remis la structure Symfony standard : `.env` commité pour la liste des variables attendues, `.env.local` non commité avec les vraies valeurs sur le serveur. Et les PV, ce sont des données personnelles : un dépôt Git est un lieu de stockage comme un autre, sauf qu'il se copie à chaque clone. J'ai aussi basculé `APP_ENV` sur `prod` par défaut, pour qu'un oubli de configuration ne serve pas la page d'exception détaillée de Symfony. »

## La question vicieuse du jury

**« Comment savez-vous qu'il n'en reste pas ? Vous avez tout relu à la main ? »**

Non — j'ai fait deux passes d'audit, la seconde le 26 juillet ayant d'ailleurs corrigé trois conclusions de la première, ce qui montre bien qu'une relecture humaine n'est pas fiable. Ce que je n'ai pas, et qui est le vrai manque : une **détection automatique**. Un hook de pre-commit avec `gitleaks` ou `git-secrets` refuserait un commit contenant un motif de clé ou d'URL de base ; la même vérification en intégration continue attraperait ce qui passe malgré tout. C'est peu de travail et ça transforme une vigilance — qui s'épuise — en garde-fou permanent. Le principe est le même que partout ailleurs dans mes projets : quand une règle dépend de ma discipline, je cherche à la déplacer dans un mécanisme. Je l'ai fait pour les invariants de base avec des triggers Postgres ; je ne l'ai pas encore fait pour les secrets, et c'est incohérent.
