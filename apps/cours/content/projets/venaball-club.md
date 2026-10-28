---
titre: "Venaball Club : l'app du staff"
avancement: 70
statut: "en cours"
maj: 2026-10-10
---

## C'est quoi

Venaball Club (`fr.venaball.club`, dossier `venaball club-store`) est l'app mobile du staff d'un club de basket : coach, dirigeant, bénévole, secrétaire, trésorier, parent. Elle est l'autre face de l'app joueuse Venaball (dossier `Pirb store`) et parle à la même API Symfony (`mabb-site`), sur les routes `/api/club/*`. Le coach convoque, fait l'appel des séances et saisit les stats en direct au bord du terrain ; le bénévole confirme ses missions du week-end ; le dirigeant suit le club ; le parent répond aux convocations de son enfant ; une joueuse est renvoyée vers son app à elle.

Règle de base, écrite dans `instruction/00_DIRECTIVES.md` et dans le `CLAUDE.md` du dossier : **le serveur dit quelles vues existent** (`GET /api/club/moi`), l'app affiche et ne décide jamais d'un droit. Rien n'est mocké. L'app n'est publiée sur aucun store au 2026-10-10.

## Comment c'est construit

- **Stack** : Expo SDK 54 (`expo ~54.0.37`), React Native 0.81.5, React 19.1, expo-router 6, TypeScript strict (`package.json`). 32 écrans dans `app/`, environ 11 800 lignes de TypeScript dans `app/` et `src/` (compté le 10/10). Aucune WebView pour l'interface (doc maître de `mabb-site`, §4.1).
- **Client API** : `src/services/api.ts` (1 148 lignes). Jeton Bearer et en-tête `X-Club-Id` sur chaque appel, timeouts de 8 s en lecture et 12 s en écriture, refus de parser une réponse qui n'est pas du JSON (le message cite la route et le code HTTP), 401 qui ferme la session.
- **Session** : `src/services/session.ts`, jeton dans expo-secure-store, jamais dans AsyncStorage, store sans React lu par `useSyncExternalStore` (même patron que l'app joueuse).
- **Saisie Stats Live** : `app/saisie/[id].tsx` et la boîte d'envoi `src/services/fileAttente.ts` (file persistée, `clientUid` d'idempotence, pause sur 401, rejets visibles). Depuis le 04/10, un parcours façon Easy Stats : équipe, matchs, nouveau match, cinq de départ (`app/match/`), saisie en paysage (spec `instruction/07_SAISIE_PAYSAGE.md`).
- **Adresses** : `src/services/hosts.ts` (03/10) dérive l'API et l'espace club de `EXPO_PUBLIC_API_URL` ; les pages légales sont toujours sur `venaball.fr`.
- **Push** : `src/services/push.ts`, copié du service de l'app joueuse, avec routage du tap selon la charge utile (`data.route`, `data.rencontreId`, types `OTM_*`).
- **Rôles** : `src/services/droits.ts` lit les `droits` renvoyés par `/api/club/moi` (lots A, B et C du 05 et 06/10 : notes de frais avec photo ou scanner de ticket, cotisations, demandes d'adhésion, secrétariat, effectif, pointage d'événements, documents du club).
- **Thème** : couleurs du club servies par `/moi` (`src/theme/themeClub.ts`), sur la base « Playground de nuit » partagée avec l'app joueuse.
- **Build** : `eas.json`, 4 profils (`development` et `preview` vers `pirb.mabb.fr`, `preview-venaball` et `production` vers `api.venaball.fr`), bloc `submit` avec identifiants Apple à compléter. `app.json` : version 1.0.0, `projectId` EAS présent depuis le commit `63c28de` (06/10). Dépôt privé `github.com/Clavelclams/venaball-club` depuis le 09/09.

## Les décisions techniques et POURQUOI

- **2026-08-13, Une app native séparée de l'app joueuse** (commit `13f2896`, `instruction/00_DIRECTIVES.md`) : une seule app pour tout le staff, avec un switch de vue selon le rôle. Le serveur renvoie les vues disponibles et la vue par défaut ; l'app n'a aucune règle de droit, donc un bug d'affichage ne peut pas ouvrir un accès.
- **2026-08-13, Le POST convocation remplace la liste** (`00_DIRECTIVES.md`) : l'app envoie toujours la liste complète des convoquées, jamais un delta. Renvoyer deux fois la même liste donne le même résultat.
- **2026-08-16, Orga du match, pointage de séance, vue parent** (commit `83d3a9d`) : première version de la file hors ligne, qui ne servait que lorsque le réseau était déjà tombé.
- **2026-09-09, Boîte d'envoi v2 pour Stats Live** (`src/services/fileAttente.ts`, commit `126ff55`, `instruction/01_STATS_LIVE_V2_2026-09-09.md`) : l'audit du 06/09 montrait que la v1 perdait des actions en silence, créait des doublons quand une réponse se perdait et se vidait dans le vide sur un jeton expiré. Désormais tout passe par la file, le tap est instantané, chaque action porte un `clientUid`, le score adverse part en absolu, la file se met en pause sur 401 et garde les refus visibles. Timeout ajouté dans `api.ts` dans le même commit.
- **2026-09-09, Un serveur par profil de build et récapitulatif de fin de match local** (commit `e977460`) : la production vise l'instance Venaball, les tests restent sur les comptes réels du MABB. Le récap (score final, trois meilleures marqueuses) est calculé depuis l'état en mémoire, sans appel réseau de plus.
- **2026-09-09, Remote GitHub privé** (commit `2029ea6`) : jusque-là, tout le code de l'app n'existait que sur le disque d'un seul PC (`Pirb store/instruction/20_BASCULE_VENABALL_2026-09-09.md`, §5).
- **2026-09-30, Notifications push et présence J-1 / J** (commit `8423283`) : le GET des notifications ne marque rien comme lu, un POST séparé le fait une fois la liste affichée. Le jeton push est retiré avant la fermeture de session, avec un délai court pour ne pas bloquer la déconnexion.
- **2026-10-03, Cadrage store confié à un second développeur** (`instruction/02_PROMPT_DEV_STORE.md`, commit `9cac2ec`) : cinq lots, zéro nouvelle fonctionnalité. Je garde `eas`, `git push`, les comptes et les secrets. Les besoins côté API s'écrivent dans `instruction/05_DEMANDES_SERVEUR.md` au lieu de toucher `mabb-site`.
- **2026-10-03, Un seul domaine et la finition P1** (commits `4af3d08` et `58cd222`) : `hosts.ts` (avant, `api.ts` retombait sur `pirb.mabb.fr` et la connexion envoyait vers `manager.mabb.fr/creer-un-club`), liens confidentialité et CGU cliquables, version 1.0.0, vivier de renfort complet (B11), filtre équipe retirable (B7), rechargement au retour d'écran, SafeArea, fiches stores dans `instruction/03_FICHES_STORES.md`.
- **2026-10-04, Couleurs du club : contournement plutôt que modification du serveur** (`src/theme/themeClub.ts`, demande D1 de `05_DEMANDES_SERVEUR.md`, ouverte) : l'API renvoie les couleurs du MABB quand un club n'a rien choisi. L'app traite cette paire exacte comme « non définie » en attendant que le serveur renvoie `null`.
- **2026-10-06, Refonte, Stats Live façon Easy Stats et rôles avant le store** (commit `63c28de`, 6 814 lignes ajoutées en un seul commit) : c'est une entorse à la règle « zéro nouvelle fonctionnalité » du cadrage, décidée par moi le 05/10 (journal de `mabb-site` : « rôles avant soumission store »). Écart assumé à la spec 07 : un nouveau numéro adverse se crée en ligne seulement, il ne passe pas par la boîte d'envoi.

## État d'avancement honnête

Sources : `git log` complet du dossier (12 commits, du 13/08 au 06/10), `instruction/`, et `mabb-site/instruction/00_ECOSYSTEME.md` (§4 au 21/09, §9.1 au 01/10, journal jusqu'au 06/10).

- **Publication : aucune.** Le doc maître dit encore que l'app n'a « jamais été compilée » et que le `projectId` manque. Le code dit autre chose : `app.json` contient un `projectId` depuis le 06/10, et la spec `07_SAISIE_PAYSAGE.md` parle d'un « premier APK refondu » le 04/10. Je n'ai pas de trace de build à montrer : à vérifier, et le doc maître est à corriger.
- **Lots du cadrage store** : lots 2 et 3 faits le 03/10 (domaine unique, textes, P1). Lot 4 partiel : fiches rédigées, bloc `submit` à compléter. Lot 1 (`tsc` et `expo-doctor` verts) et lot 5 (APK testé une semaine par trois personnes du club, retours dans `instruction/04_RETOURS_TEST.md`) : pas de trace, le fichier 04 n'existe pas.
- **Fiches stores en retard sur le code** : `instruction/03_FICHES_STORES.md` (03/10) déclare caméra et photos « jamais demandées », or `app.json` déclare depuis le 05/10 `expo-image-picker` et `react-native-document-scanner-plugin` avec des textes de permission caméra et photos. La réponse « finances : non » est aussi à revoir depuis les notes de frais et les cotisations. Une déclaration fausse est un motif de rejet.
- **Boîte d'envoi** : aucun test automatisé (listé comme reste à faire dans `01_STATS_LIVE_V2`). En lisant le code le 10/10, j'ai repéré trois limites non vérifiées sur téléphone : une erreur 500 répétée bloque la file en tête, « Annuler la dernière » pendant un envoi en cours peut annuler à l'écran une action que le serveur crée quand même, et la déconnexion (`app/compte.tsx`) ne vide pas la file.
- **Docs incohérentes** : `00_DIRECTIVES.md` demande encore le vouvoiement côté staff alors que le `CLAUDE.md` impose le tutoiement ; le doc maître (§4.5) la dit partiellement périmée.
- **Même verrou que l'app joueuse** : le binaire de production vise `api.venaball.fr`, où le staff du MABB n'a pas de compte tant que la migration n'est pas faite (hébergement MABB fermé le 22/10/2026).
- Pas de lint, pas de crash reporting. Plus-minus non calculé.

## Prochaines étapes

1. **Mettre les fiches stores d'accord avec le code** : permissions caméra et photos (notes de frais), données financières, puis relire tout `03_FICHES_STORES.md` contre `app.json`.
2. **Lot 1 et lot 5 du cadrage** : `npm install`, `npx tsc --noEmit`, `npx expo-doctor`, build `preview-venaball`, une semaine d'usage par un dirigeant, une secrétaire et un bénévole, retours dans `instruction/04_RETOURS_TEST.md`.
3. **Écrire la spec puis le test d'intégration de la boîte d'envoi** (réseau coupé, rétabli, 401, 500 répété), et corriger les trois limites relevées. Le `CLAUDE.md` interdit de toucher la file sans spec.
4. **Migration MABB vers l'instance Venaball** avant le 22/10, commune aux deux apps.
5. **Compléter le bloc `submit`, builds de production iOS et Android, soumission**, décidée par moi.
