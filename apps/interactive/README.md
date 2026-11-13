# Velito Interactive (interactive.velito.fr)

Jeux de soirée sur grand écran, joués depuis les téléphones, sans rien
installer. Pour les bars, MJC, centres sociaux et animations d'entreprise.
Édité par VENA. App Next.js du monorepo, port dev **3004**.

## Comment ça marche

- **L'animateur** (connecté avec son compte Velito) ouvre `/host` sur la télé
  ou le projecteur, choisit un jeu et lance une session. Un code court
  s'affiche.
- **Les joueurs** vont sur `/play/<code>` depuis leur téléphone, choisissent un
  pseudo et un avatar. Pas de compte, pas d'application.
- **Tout est en temps réel** (Supabase Realtime) : réponses, scores, phases du
  jeu s'affichent sur la télé et les téléphones sans recharger.
- **Le tableau de bord** (`/dashboard`) montre la galerie des jeux et les
  statistiques de l'animateur.

## Les 9 jeux

| Jeu | `game_type` | Logique | Écran télé | Écran joueur | Actions |
|---|---|---|---|---|---|
| Quiz | `quiz` | `lib/games/quiz-questions.ts` | `HostQuizGame` | `PlayQuizGame` | `quiz-actions.ts` |
| Blind test | `blind_test` | `blindtest.ts` | `HostBlindTestGame` | `PlayBlindTestGame` | `blindtest-actions.ts` |
| Petit bac | `petit_bac` | `petit-bac.ts` | `HostPetitBacGame` | `PlayPetitBacGame` | `petitbac-actions.ts` |
| Dessin | `draw` | `draw.ts` | `HostDrawGame` | `PlayDrawGame` | `draw-actions.ts` |
| Estim' | `estim` | `estim.ts` | `HostEstimGame` | `PlayEstimGame` | `estim-actions.ts` |
| Réflexe | `reflex` | `reflex.ts` | `HostReflexGame` | `PlayReflexGame` | `reflex-actions.ts` |
| Laser | `laser` | `laser.ts` (testé) | `HostLaserGame` | `PlayLaserGame` | `laser-actions.ts` |
| Loup-Garou | `loup_garou` | `loup-garou.ts` | `HostLoupGarouGame` | `PlayLoupGarouGame` | `loupgarou-actions.ts` |
| Pin'Point (carte du monde) | `pinpoint` | `geo.ts` | `HostGeoGame` | `PlayGeoGame` | `geo-actions.ts` |

Pin'Point s'appelle `geo` dans le code et `pinpoint` en base : la contrainte
`sessions.game_type` en production est propre (vérifiée le 13/11/2026).

## Sécurité (à savoir défendre)

Les joueurs sont **anonymes** : pas de compte, donc pas de `auth.uid()` pour
les reconnaître. La règle :

- **Jeton privé par joueur.** À l'inscription, la fonction `rejoindre_session`
  crée le joueur et lui rend SON `player_token`, une seule fois. Le navigateur
  le garde. La colonne n'est lisible par personne d'autre (droits par colonne).
- **Données secrètes = fonctions qui exigent le jeton.** Au Loup-Garou : son
  rôle (`get_my_lg_role`), la vision de la Voyante (`lg_seer_peek`), ses
  coéquipiers loups (`lg_mes_loups`), son vote (`lg_voter`).
- **Droits par colonne + Realtime.** Les colonnes secrètes (rôle, cible des
  votes) ne sont pas accordées aux joueurs. Realtime respecte ces droits :
  `realtime.apply_rls` vérifie `has_column_privilege` colonne par colonne
  (vérifié dans la base le 13/11/2026 ; un ancien commentaire affirmait le
  contraire).
- **L'animateur lit les secrets par des fonctions réservées à l'hôte**
  (`lg_hote_roles`, `lg_hote_votes`, qui vérifient `sessions.host_user_id`).

Historique : jusqu'au 13/11/2026, rôles, cibles des votes et jetons étaient
lisibles par tous, et on pouvait voter au nom d'un autre. Corrigé par les
migrations listées ci-dessous, avec 37 tests.

## Base de données

Schéma `interactive` du projet Supabase partagé. Fichiers dans `sql/`,
exécutés à la main dans l'éditeur SQL Supabase. Les plus récents :

| Fichier | Rôle | Quand |
|---|---|---|
| `interactive-player-token-v2-prive.sql` | Jeton privé, `rejoindre_session` | Exécuté le 13/11/2026 |
| `interactive-lg-v2-secrets.sql` | Rôles et votes fermés aux joueurs non connectés | Exécuté le 13/11/2026 |
| `interactive-lg-v3a-lecture-hote.sql` | Fonctions de lecture de l'animateur | Exécuté le 13/11/2026 |
| `interactive-lg-v3b-fermer-connectes.sql` | Fermer aussi aux joueurs connectés | **Après** le déploiement du code qui utilise la v3a |

Tests sur un vrai Postgres : `node sql/test_player_token_prive.mjs`.

## Dev local

```bash
npm install          # à la racine du monorepo
npm run dev          # http://localhost:3004
npx tsc --noEmit -p apps/interactive
```

Variables : Supabase (URL, clé anon), `COOKIE_DOMAIN`, et
`NEXT_PUBLIC_CARTO_BASEMAPS_KEY` pour le fond de carte de Pin'Point (clé
gratuite CARTO, sans elle les tuiles affichent « API KEY REQUIRED »). Toute
nouvelle variable doit aussi figurer dans la liste `env` de `turbo.json`.

## Vendre Interactive

La page publique de l'offre est sur velito.fr/offres (« Soirée et animation
numérique », sur devis). Ce qu'il faut pour une soirée : un ordinateur
branché à la télé du lieu, le Wi-Fi ou la 4G des joueurs, et 10 minutes
d'installation.
