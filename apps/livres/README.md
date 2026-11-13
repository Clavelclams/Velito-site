# Boîtes à livres d'Amiens (livres.velito.fr)

Trouver la boîte à livres la plus proche, voir si elle est remplie, dire
« j'ai déposé un livre » ou « elle est vide », sans compte et sans publicité.
Porté par Velito Esport Amiens, conçu bénévolement par VENA. App Next.js du
monorepo Velito, port dev **3008**. V1 du 13/11/2026.

Cahier des charges d'origine : `Velito Esport Amiens/09_Autre documents/budget participatif/CDC_Site_Boites_a_Livres_V1.md`
(dossier du budget participatif 2026). Le site existe **que le projet soit lauréat ou non** : il recense aussi les boîtes déjà installées.

## Ce que fait la V1

- **Carte** (Leaflet + fond OpenStreetMap, sans clé) et **liste accessible**
  de toutes les boîtes, avec « la plus proche de moi » : la position reste
  dans le téléphone, elle sert seulement à trier.
- **Fiche d'une boîte** (`/boite/<slug>`) : adresse, état, date de mise à
  jour, photo, itinéraire, et 4 boutons sans compte : j'ai déposé, j'ai pris,
  elle est vide, elle est abîmée. C'est la page ouverte par le **QR code**
  collé sur la boîte.
- **Espace bénévoles** (`/admin`) : ajouter une boîte, la modifier, changer
  son état, la retirer, traiter les signalements, imprimer son QR code.
  Accès : owner ou editor de l'organisation VEA dans
  `shared.user_permissions` (même table que tout l'écosystème).
- **Installable comme une app** (`app/manifest.ts`) : « Ajouter à l'écran
  d'accueil », sans store.

Pas dans la V1 (choix du 13/11/2026) : comptes habitants, points, badges,
partenaires. Prévu en V2 avec le compte Velito, facultatif. Puis lien avec
le projet Ma Ville, qui lira ces données sans les posséder.

## Règles et sécurité (à savoir défendre)

- **Zéro donnée personnelle des habitants.** Un signalement garde la boîte,
  le type et un message facultatif. Ni nom, ni e-mail, ni adresse IP.
- **Aucune écriture depuis le navigateur.** La base n'accorde au public que
  la lecture des boîtes actives. Les signalements passent par une action
  serveur (`lib/livres/actions.ts`) qui écrit avec service_role APRÈS ses
  contrôles : champ piège anti-robot, type dans la liste, boîte active, au
  plus 20 signalements par boîte et par heure.
- **Signalements jamais publics** (un message libre peut contenir n'importe
  quoi) : seuls l'état et la date de la boîte le sont.
- **Les règles métier sont dans un module pur testé** (`lib/livres/regles.ts`) :
  effet d'un signalement sur l'état (« abîmée » l'emporte, un dépôt ne répare
  pas une porte), nettoyage des messages, distances, dates.
- Pas de police externe, pas de cookie de mesure, pas de traceur. La
  géolocalisation est autorisée pour ce site seul (`next.config.js`).

## Mise en route (une fois)

1. Supabase : exécuter `sql/001_livres_schema.sql`, puis ajouter `livres`
   aux schémas exposés (Settings > API > Exposed schemas).
2. Vercel : nouveau projet sur le même dépôt, dossier racine `apps/livres`,
   mêmes variables que les autres apps (Supabase, `SUPABASE_SERVICE_ROLE_KEY`
   en Sensitive, `COOKIE_DOMAIN=.velito.fr`).
3. Domaine : `livres.velito.fr` dans le projet Vercel, plus l'enregistrement
   DNS indiqué par Vercel.
4. Ajouter les boîtes dans `/admin`, imprimer et coller les QR codes.

## Dev local

```bash
npm install                                    # à la racine du monorepo
npm run dev --workspace apps/livres            # http://localhost:3008
node --experimental-strip-types apps/livres/lib/livres/regles.test.ts   # 23 tests
node apps/livres/sql/test_livres.mjs           # 14 contrôles sur un vrai Postgres
```

## Suite prévue

- V1.1 : recenser les boîtes déjà installées à Amiens (OpenStreetMap a une
  catégorie dédiée, à vérifier ; sinon relevé sur le terrain).
- V2 : compte Velito facultatif, points et badges, compteur public de livres
  déposés, agenda des animations, API publique en lecture.
- Ma Ville : un onglet qui lit ces données.
