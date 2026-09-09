---
titre: "Secrets : où ils vivent, où ils ne vivent jamais, et ce qu'on fait quand ils ont fui"
parcours: "securite-web"
ordre: 9
niveau: "intermediaire"
duree: 20
date: 2026-09-09
---

## Le cours

Un secret est une valeur qui donne un pouvoir : mot de passe de base, clé `service_role`, clé API Resend, secret de signature JWT, clé privée RSA du hub. Sa gestion se résume à trois règles, et tes projets ont enfreint chacune au moins une fois avant de la respecter.

**Règle 1 : un secret ne va jamais dans le dépôt.** Ni dans le code, ni dans un `.env` commité, ni dans un dump SQL, ni dans un fichier « temporaire ». Le parcours Git leçon 5 explique pourquoi c'est irréversible : Git est un historique, un fichier commité y reste. Venaball a retiré un `.env` de dev, des dumps et des PV le 26 juillet, et a encore trouvé un secret de dev dans `.env.dev` le 9 septembre. La structure qui évite ça :

- `.env` commité : la **liste** des variables et des valeurs par défaut **non secrètes**. Documentation.
- `.env.local` jamais commité : les vraies valeurs, sur chaque machine et sur le serveur.
- `.env.dev`, `.env.test` commités : spécifiques à un environnement, **sans secret**.
- Vercel : les variables dans le dashboard, jamais dans le code.

Un hook `gitleaks` en pre-commit rend la règle mécanique.

**Règle 2 : un secret ne va jamais dans le navigateur.** Un Client Component, un `NEXT_PUBLIC_*`, un bundle JavaScript, une réponse d'API — tout ça est public. La clé `anon` de Supabase est **conçue** pour être publique (elle identifie le projet, la RLS fait la sécurité). La clé `service_role` ne l'est pas : elle contourne la RLS. Le fichier `lib/supabase/service.ts` est importable **uniquement** depuis du code serveur, et la frontière `"use client"` (parcours React, leçon 5) est ce qui le garantit. Le test : « si cette valeur est dans le code source visible par tous, est-ce grave ? »

La clé privée RSA du hub est le cas le plus sensible : elle **signe les tokens** de tout l'écosystème. Elle est en base (`shared.oauth_jwks`, lisible par `service_role` uniquement). C'est acceptable pour un écosystème associatif ; un KMS (où la clé ne sort jamais du module matériel) serait la réponse d'une banque. Sache le dire.

**Règle 3 : un secret qui a fui est changé, pas nettoyé.** Réécrire l'historique Git, supprimer un log, effacer une capture — rien ne remonte le temps. Pendant qu'il était exposé, il a pu être copié. La seule réponse est la **rotation** : nouveau mot de passe de base, nouvelle clé API, nouvelle clé de signature. Le hub a une infrastructure de rotation des clés JWKS (parcours API, leçon 6) précisément pour que ce jour-là, ce soit une requête SQL et non une panique.

**Ce qui est un secret sans en avoir l'air.**

- Une **URL de base avec mot de passe** : `mysql://user:P@ssw0rd@host/db`. C'est `DATABASE_URL`, et elle contient le mot de passe.
- Un **jeton de webhook** ou un **`CRON_SECRET`** : ce qui autorise un appel externe.
- Les **données personnelles** : PV nominatifs, dumps avec des emails. Pas un secret technique, mais une fuite RGPD, et le dépôt est un lieu de stockage comme un autre.
- Un **secret de dev** : « c'est juste pour le dev » — sauf qu'il signe des tickets SSO, et qu'un attaquant qui le lit peut forger des sessions sur l'environnement de dev, puis pivoter.

**L'énumération de comptes est une fuite aussi.** « Cet email n'existe pas » révèle quels emails ont un compte. « Identifiants invalides » ne révèle rien. Le cas 429 (trop de tentatives) est traité à part sur cours : dire « identifiants invalides » pousserait l'utilisateur légitime à retaper en boucle et à entretenir le blocage. Les messages d'erreur font partie de la surface d'information.

**Les logs.** `console.error("[seConnecterAction] Supabase auth :", error.message)` — le détail va dans les logs serveur (Vercel Logs), pas dans la réponse. Mais les logs sont **eux aussi** un endroit où un secret peut atterrir : ne jamais logger un mot de passe, un jeton, un `Authorization` header complet. Le middleware OAuth du hub le dit : « on NE log JAMAIS les paramètres OAuth en clair ».

**Le principe du moindre privilège appliqué aux secrets.** La clé API Resend n'a besoin que d'envoyer des mails, pas de lire le compte. La Viewer API Toornament plutôt que l'Organizer. Un jeton mobile avec des scopes limités. Chaque secret a le pouvoir minimal, pour que sa fuite ait l'impact minimal.

## À retenir

- Jamais dans le dépôt : `.env.local` pour les vraies valeurs, `.env` pour la liste. Hook `gitleaks`.
- Jamais dans le navigateur : `service_role` reste derrière `"use client"`. Test : « grave si public ? »
- Un secret qui a fui est **changé**. Le nettoyage ne remonte pas le temps. Rotation outillée.
- `DATABASE_URL`, `CRON_SECRET`, secrets « de dev », données perso : des secrets qui n'en ont pas l'air.
- Messages d'erreur neutres, logs sans jetons. La surface d'information compte.

## Mise en pratique

Objectif : inventorier tous les secrets de tes projets, vérifier où chacun vit, et en faire tourner un.

1. Construis un tableau : pour chaque projet (hub, arena, vea, vena, interactive, compta, cours, mabb-site), liste les variables d'environnement (`.env` commité + dashboard Vercel + `.env.local` sur OVH). Colonnes : nom, secret ou non, où vit la valeur, exposé au navigateur (`NEXT_PUBLIC_`) ou non.
2. Pour chaque ligne « secret » : est-elle dans un fichier commité ? `git log --all -S "<début de la valeur>" --oneline` sur chaque dépôt. Un résultat = une fuite historique. Note-la.
3. Pour chaque `NEXT_PUBLIC_` : réponds « grave si public ? ». Une seule réponse « oui » = à retirer du préfixe et à déplacer côté serveur.
4. Fais tourner le secret de dev SSO de Venaball identifié le 9 septembre : génère une nouvelle valeur (`openssl rand -hex 32`), mets-la dans `.env.local` (dev et serveurs), retire l'ancienne de `.env.dev`, commit `secu: rotation secret SSO dev, retire du depot`.
5. Logs : `findstr /s "console.log\|console.error" apps\*\app apps\*\lib` puis `findstr /s "logger->" mabb-site\src`. Pour chaque ligne qui logge une variable, cette variable peut-elle contenir un jeton, un mot de passe, un header `Authorization` ? Si oui, masque ou retire.
6. Installe `gitleaks` en pre-commit sur `mabb-site` et `Velito-site` (parcours Git, leçon 5). Vérifie qu'il refuse un commit contenant `sk_live_…`.

Résultat attendu : un inventaire complet de tes secrets, au moins une rotation faite, et un hook qui empêche la prochaine fuite.
