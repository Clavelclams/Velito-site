# ARENA — Tournois Velito

Infrastructure de tournois **gratuite et neutre**, esport et sport physique.
App du monorepo Velito — `arena.velito.fr` — port dev **3003**.

> Source de vérité pour l'état du projet, les décisions et la feuille de
> route : Notion (« Feuille de route — Hub Velito & ARENA »). Ce README ne
> décrit que ce qu'il faut pour lancer et comprendre le code.

## Ce que fait l'app (état au 09/09/2026)

**Côté orga** (`/admin`, staff d'une organisation `shared.organizations`) :
créer un tournoi (élimination simple, double élimination, poules + phase
finale ; individuel ou par équipes : padel, five, playground, ping-pong),
inscrire et pointer les joueurs le jour J, répartir les têtes de série et les
équipes, démarrer, saisir puis valider les scores (double étape, litiges),
assigner les terrains, QR code imprimable, export CSV des participants,
saisie manuelle d'un palmarès externe, fiche RGPD par joueur (année de
naissance, droit à l'effacement).

**Côté public** (client anonyme, RLS) : page tournoi en direct `/t/[token]`
avec « Mon match » (où je joue, contre qui, sur quel terrain), classement
`/classement` (points 3/2/1, esport / sport), profil joueur `/joueurs/[pseudo]`
(parcours, stats maison, badges, palmarès externe), fiches jeux `/jeux/[slug]`
(tournois du jeu + renvoi vers le tracker de référence), exports CSV et JSON
gratuits, règlement, prévention.

**Mineurs** : l'année de naissance est obligatoire à l'inscription ; un mineur
passe automatiquement en profil restreint (absent de tout classement public),
un moins de 15 ans exige l'autorisation parentale. Règle « protéger par
excès » dans `lib/arena/age.ts`.

**Espace joueur (12/11/2026, migration 010)** : connexion avec le compte
Velito (même session SSO `.velito.fr` que le staff : pas besoin d'OIDC pour
un sous-domaine), page `/moi` (tournois en cours, à venir, joués, tournois
ouverts en ligne), création d'un profil ou demande de rattachement d'un pseudo
existant (validée par le staff dans `/admin/rattachements`), inscription en
ligne depuis `/t/[token]` si le staff l'a ouverte pour ce tournoi. Le check-in
reste fait par le staff ; un moins de 15 ans inscrit en ligne n'est pointable
qu'après le bouton « Autorisation reçue ». Règles dans le module pur
`lib/arena/espace-joueur.ts` (18 tests), actions joueur dans
`lib/arena/actions-joueur.ts` (jamais d'id joueur venu du formulaire).

**Pont VEA ↔ ARENA (12/11/2026, migration 011)** : la fonction
`arena.mon_resume()` (sans paramètre, lit `auth.uid()`, SECURITY DEFINER)
donne au profil VEA les vrais chiffres Arena du membre connecté (tournois,
matchs, victoires, titres) ; testée par `node sql/test_mon_resume.mjs`. Les
liens « Arena » de VEA pointent vers ce site, et la page d'un tournoi affiche
« Organisé par » avec le lien du site de la structure
(`lib/arena/organisations.ts`).

**Widget (12/11/2026)** : `/widget/t/[token]`, version compacte et en
lecture seule du tableau d'un tournoi, à intégrer en `<iframe>` sur le site
d'un club (code fourni sur la page staff du tournoi, « Intégrer sur un
site »). Seule route autorisée en iframe : en-têtes séparés dans
`next.config.js` (frame-ancestors ouvert pour `/widget/*`, DENY partout
ailleurs). Rafraîchi toutes les 15 s pendant le tournoi, noindex.

**Validation atomique (12/11/2026, migration 012)** : `validerScore` calcule
en TypeScript ce qu'il faut écrire (logique de bracket inchangée), puis
`arena.appliquer_validation` l'applique en UNE transaction : passage en
VALIDE (seulement si encore TERMINE, donc pas de double validation), placements
dans les matchs suivants (jamais dans un match déjà validé), journal. Tout ou
rien. Tests : `node sql/test_validation_atomique.mjs` (29 contrôles).
Toutes les écritures des actions vérifient aussi `{ error }` : supabase-js ne
lève pas d'exception sur une erreur SQL.

**Score par sets (14/11/2026, migration 013)** : au padel et au ping-pong,
le staff peut saisir le détail (« 6-4 3-6 7-5 ») dans le champ à côté du
score. Le serveur vérifie les règles (module pur `lib/arena/sets.ts`, 18
tests : 6-4, 7-5, 7-6, super jeu décisif au 3e set au padel ; 11 avec 2
d'écart au ping-pong) et calcule lui-même le score en sets gagnés : le
bracket, le classement et la validation ne changent pas. Le détail s'affiche
sur la page publique, le widget, les exports CSV (colonne en fin) et JSON.
La 013 ajoute aussi les sets et l'équipe gagnante au verrou du règlement §3
(un match validé ne bouge plus).

**API publique par clé (14/11/2026, migration 014)** : `/api/v1/tournois`,
`/api/v1/tournois/{token}` (format arena-export-v2), `/api/v1/classement`.
Clé créée par le staff dans `/admin/api`, montrée une seule fois, stockée
en empreinte SHA-256 ; 120 requêtes par minute et par clé, compteur
atomique dans `arena.api_consommer`. La clé ne donne aucun droit en plus :
lecture avec le client ANONYME sans cookie (`lib/supabase/anon.ts`), donc la
RLS publique s'applique. Documentation publique : `/developpeurs`. Tests :
`lib/arena/api-cles.test.ts` (10) et `node sql/test_sets_api.mjs` (38
contrôles PGlite pour 013 et 014).

**Pages légales (14/11/2026)** : `/mentions-legales` et `/confidentialite`
(« Tes données »), écrites d'après ce que le code enregistre réellement.

**Pas encore fait** : notifications (attend le domaine d'envoi Resend).
L'OIDC du hub reste utile pour une future app HORS velito.fr.

## Architecture (à savoir défendre)

- **Server Components + Server Actions** — pas d'API custom pour le flux
  orga, un seul composant client (`AutoRefresh`, polling de la page publique)
  plus la répartition par glisser-déposer.
- **Sécurité en trois couches** : chaque Server Action commence par
  `requireStaff()` puis `chargerTournoiDeLOrga()` (appartenance à l'orga) ;
  les écritures passent par `service_role` APRÈS ce contrôle ; la RLS reste
  active en filet (lecture publique = non-brouillon, joueurs non anonymisés,
  colonnes publiques seulement — migration 009).
- **Logique métier dans des modules purs testés** (`lib/bracket*.ts`,
  `lib/poules.ts`, `lib/elo.ts`, `lib/arena/{classement,mon-match,stats,csv,
  age,erreurs,trackers,transitions}.ts`). Les actions orchestrent, elles ne
  décident pas.
- **Traçabilité** : toute action sensible écrit dans `arena.logs`
  (append-only, trigger). Les erreurs Postgres sont traduites par code
  SQLSTATE (`lib/arena/erreurs.ts`) : le message brut ne sort jamais à l'écran.
- **Interop gratuite par défaut** : exports CSV/JSON publics, données qui
  repartent avec la structure — c'est la doctrine de complémentarité.

## Dev local

```bash
npm install                  # à la racine du monorepo
cp .env.example .env.local   # puis remplir (mêmes valeurs que le hub)
npm run dev                  # http://localhost:3003
npm run test                 # vitest, modules purs
npm run check-types          # typecheck strict
```

Prérequis base : `sql/001` → `sql/014` exécutés dans l'ordre sur Supabase
(schéma `arena`, exposé à l'API Data), plus une organisation et un membre
owner/editor dans `shared.user_permissions`.

## Migrations

Fichiers numérotés dans `sql/`, exécutés à la main dans l'éditeur SQL
Supabase, jamais rejoués sauf mention « idempotente » en tête. La 009
(droits par colonne sur `joueurs`) doit être passée AVANT toute inscription
avec année de naissance. La 010 se teste sur un vrai Postgres en local :
`node sql/test_espace_joueur.mjs` (PGlite, migrations 001 à 010, 29 contrôles).

## Pièges connus

- `noUncheckedIndexedAccess` est activé : `tableau[i]` est `T | undefined`.
- Les `NEXT_PUBLIC_*` marquées Sensitive sur Vercel arrivent vides au
  runtime → lire `SUPABASE_URL` (runtime) en priorité.
- Une variable ajoutée doit aussi figurer dans la liste `env` de
  `turbo.json` à la racine, sinon elle est masquée au build.
- Jamais de caractère Unicode invisible dans le source (BOM, combinants) :
  écrire `"\uFEFF"` et `[\u0300-\u036f]`, pas le caractère lui-même.
- Le code Toornament (`lib/toornament.ts`, `importerResultatToornament`) est
  **dormant** : l'API est payante (229 €/mois). Le palmarès externe se saisit
  à la main avec un lien source.
