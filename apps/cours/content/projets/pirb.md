---
titre: "Pirb : l'app joueuse Venaball"
avancement: 87
statut: "en cours"
maj: 2026-10-10
---

## C'est quoi

Pirb (renommée **Venaball** côté utilisateur, « pirb » reste le nom technique : sous-domaine `pirb.mabb.fr`, routes `/api/pirb`, types `PirbDataService`) est l'app mobile compagnon de la plateforme Symfony de gestion de clubs de basket. Elle donne à une joueuse — souvent mineure — son espace perso : stats de match validées par le club, profil, badges et niveau XP, convocations avec réponse, notifications, bilans de compétences, et un Playground caméra (jeux de dribble/tir dont le score est compté automatiquement par vision). 27 écrans, dont l'essentiel est natif ; l'app est branchée sur les vraies données du club via l'API Symfony.

Depuis le 9 septembre 2026, l'identité store est **Venaball** (`fr.venaball.app` sur iOS et Android, slug et scheme `venaball`, commit `cdfd018`). Le serveur visé dépend du profil de build : `pirb.mabb.fr` (instance MABB, comptes réels) en development et preview, `api.venaball.fr` (instance produit) en preview-venaball et production. Le dossier s'appelle encore `Pirb store` : c'est un nom historique.

## Comment c'est construit

- **Stack** : Expo SDK 54 (managed) / React Native 0.81.5 / React 19.1 / TypeScript ~5.9 — voir `package.json`.
- **Navigation par fichiers** avec expo-router 6 : chaque fichier de `app/` est un écran. `app/_layout.tsx` = Stack racine (fonts, intro animée, garde de connexion, error boundary global, enregistrement push) ; `app/(tabs)/_layout.tsx` = les 5 onglets (Accueil, Stats, Recherche, Playground, Profil).
- **Couche données abstraite** : l'interface `src/services/data/PirbDataService.ts` (le contrat, ~40 méthodes), deux implémentations `src/services/data/MockPirbDataService.ts` (démo sans serveur) et `src/services/data/ApiPirbDataService.ts` (API Symfony réelle, avec retry/timeout), et une factory `src/services/data/index.ts` qui choisit selon `EXPO_PUBLIC_DATA_SOURCE`. Les écrans ne connaissent que l'interface.
- **Session** : `src/services/auth/session.ts` — jeton Bearer 30 jours stocké dans expo-secure-store (Keychain iOS / Keystore Android), store sans React consommé via `useSyncExternalStore`.
- **Résilience** : `src/hooks/useAsyncData.ts` (états loading/error/data systématiques), `src/components/EcranCrash.tsx` (error boundary global), `src/components/EcranHorsLigne.tsx` (overlay hors-ligne qui donne accès à l'easter egg arcade offline).
- **Push** : `src/services/push.ts` (permission, jeton Expo, enregistrement serveur, routage du tap de notification).
- **Types** : `src/types/pirb.ts` (443 lignes), calqués sur les structures réelles du backend Symfony — c'est le contrat d'API proposé côté client.
- **Build** (mis à jour le 2026-10-10) : `eas.json` a 4 profils, tous avec `EXPO_PUBLIC_DATA_SOURCE=api` ; `development` et `preview` visent `https://pirb.mabb.fr`, `preview-venaball` et `production` visent `https://api.venaball.fr`. Un bloc `submit` existe depuis le 06/10, avec `appleTeamId` et `ascAppId` encore à `A_COMPLETER_PAR_CLAVEL` et une clé Google Play ignorée par git. `app.json` : `fr.venaball.app`, version 1.0.0, `projectId` EAS posé le 14/09 (commit `5e53909`), plugins expo-camera (texte de permission, pas d'audio) et expo-notifications.
- **Adresses** : `src/services/hosts.ts` (30/09) déduit toutes les adresses (API, espace club, pages « mot de passe oublié » et « inscription ») de `EXPO_PUBLIC_API_URL`. Les écrans importent `API_BASE`, `MANAGER_BASE` ou `URLS` au lieu de recopier un domaine (une exception relevée le 10/10 : `app/claveliito.tsx`, voir l'état d'avancement).
- **Source des données** : `src/services/data/source.ts` (05/10) décide à un seul endroit entre `api` et `mock` ; `src/services/data/index.ts` lève une erreur si un binaire release est configuré en mock.
- **Modération** : `src/services/moderation.ts` (signaler par mail pré-rempli, masquer en liste locale AsyncStorage) et le hook `src/hooks/useJoueusesMasquees.ts` qui refiltre tous les écrans en direct.
- **Onglet Stats enrichi** (05 et 06/10) : `src/components/RetoursCoach.tsx` (retours de match du coach, partage parent décidé par la joueuse mineure) et la carte des actions dans `app/(tabs)/stats.tsx` (`GET /api/pirb/carte-actions`, rendu par `src/components/ShotChartCourt.tsx`).

## Les décisions techniques et POURQUOI

- **2026-07-04 — Expo managed plutôt que bare RN ou Flutter** (`instruction/01_ARCHITECTURE_APP.md`, D-01) : Expo Go suffit pour l'ossature ; le besoin caméra natif passera par un development build EAS sans quitter Expo. Bare RN aurait imposé Xcode/Gradle dès le jour 1 ; Flutter aurait imposé Dart.
- **2026-07-04 — expo-router (navigation par fichiers)** (D-02) : moins de code d'assemblage, convention lisible (« mes routes, c'est mon arborescence »), standard actuel d'Expo.
- **2026-07-04 — Couche données abstraite interface + factory** (D-03) : les écrans dépendent de l'abstraction, jamais d'une implémentation (SOLID/D). Développement et démo sans serveur.
- **2026-07-04 — Gamification côté serveur** (D-04) : l'app affiche XP/badges/niveaux, ne les recalcule jamais — source de vérité unique côté Symfony.
- **2026-07-05 — Rétrogradation Expo 57 → SDK 54** : l'Expo Go des appareils de Clavel plafonne au SDK 54, et tester sur du vrai matériel prime.
- **2026-07-05 — Identité « Playground de nuit »** (D-06) : tokens 3 couches dans `src/theme/tokens.ts`, aucun hex hors de ce fichier ; Bebas Neue + Nunito ; zones de tap ≥ 44px.
- **2026-07-06 — Auth par écran de connexion + secure-store** : `ApiPirbDataService` ne connaît aucun identifiant, il lit le jeton de la session ; sur 401 il invalide la session et l'app retombe sur l'écran de connexion.
- **SSO par ticket signé HMAC (90 s)** pour les WebView : la session web se crée depuis l'app, fini le double login (`urlWebConnectee` dans le contrat, dégradation douce si échec).
- **2026-07-13 — Marquage « lu » des notifications par POST, pas en effet de bord du GET** (commentaire dans `PirbDataService.ts`) : un GET ne doit rien modifier, sinon le retry réseau marquerait tout lu.
- **2026-07-13 — API bilan en liste blanche RGPD** : les données de santé de l'entité serveur (sécu, mutuelle, allergies) ne sortent jamais de l'API.
- **2026-07-13 — Retry + timeout sur erreurs transitoires** (`ApiPirbDataService.ts`) : 3 essais avec backoff, timeout 8 s ; on ne réessaie jamais un 401 ni un 4xx.
- **Suppression de compte depuis l'app** (Apple 5.1.1(v)) : demande RGPD traitée sous 30 jours, pas de suppression immédiate (mineures rattachées à un club, obligations fédérales).
- **2026-08-20, Documents et Mes parents passent en natif** (`app/documents.tsx`, `app/mes-parents.tsx`, commit `e8e4bf6`) : c'étaient deux des dernières WebViews du menu. L'en-tête de `documents.tsx` cite la règle Apple 4.2 (une app qui n'est qu'un site emballé est refusée). La liste est native, seul le fichier s'ouvre dans l'écran web via la session SSO, donc le contrôle d'accès du serveur s'applique tel quel.
- **2026-09-09, Identifiant d'app `fr.venaball.app` avant toute publication** (`app.json`, commit `cdfd018`, `instruction/20_BASCULE_VENABALL_2026-09-09.md`) : un bundle ID est définitif et public dès la première fiche store. Rien n'était publié, le changement ne coûtait rien ; une semaine plus tard, il était impossible.
- **2026-09-09, Un serveur par profil de build** (`eas.json`, même commit) : la production vise `api.venaball.fr`, les profils de test restent sur `pirb.mabb.fr` pour tester avec les comptes réels. Conséquence assumée et écrite dans la doc 20 : les joueuses du MABB n'existent pas dans la base de production, donc le binaire du store ne sert personne tant que le MABB n'est pas migré.
- **2026-09-09, Signaler et masquer le contenu des utilisatrices** (`src/services/moderation.ts`, commit `342abc4`) : Apple 1.2 exige pour tout contenu généré par les utilisateurs un moyen de signaler, de bloquer et un contact qui répond. V1 sans nouvel endpoint : mail pré-rempli vers `contact@velito.fr`, masquage local réversible depuis Réglages. Étendu le 05/10 à toutes les cartes de joueuses (commit `8eb70ff`, hook `useJoueusesMasquees`).
- **2026-09-09, La carte inter-clubs renvoie une liste vide, plus le mock** (`ApiPirbDataService.ts`, `app/carte.tsx`, commit `342abc4`) : avant, de vraies joueuses voyaient 26 clubs réels de la Somme avec des XP inventés. Règle « 0 = 0 » : pas de donnée, on le dit.
- **2026-09-14, Le mode de données ne peut plus être mock par accident** (`src/services/data/index.ts`, commit `1e9cb77`, puis `src/services/data/source.ts` le 05/10 dans `8eb70ff`) : sans variable, `mock` en développement et `api` en release ; un binaire release configuré en mock lève une erreur. Avant le 05/10, quatre fichiers recalculaient le mode chacun de leur côté avec `mock` par défaut.
- **2026-09-14, Timeouts sur les écritures et replis déclarés** (`ApiPirbDataService.ts`, `src/services/data/indisponibilites.ts`, `src/components/BandeauIndispo.tsx`, commit `ee18e47`) : `ecrire()` a un timeout de 12 s et accepte le 204 ; les lectures qui retombent sur une valeur neutre sont listées et affichent « ce que tu vois peut être incomplet ». Le retrait du jeton push à la déconnexion a son propre délai court (commit `1e9cb77`).
- **2026-09-30, Toutes les adresses déduites du build** (`src/services/hosts.ts`, commits `42c6808` et `991e451`) : le premier APK (preview-venaball) envoyait « mot de passe oublié » vers `pirb.mabb.fr/reset-password`, une page qui n'existe pas, et deux écrans avaient `manager.mabb.fr` en dur. Une seule source, `EXPO_PUBLIC_API_URL`, et l'espace club se déduit du sous-domaine de l'API.
- **2026-09-30, Textes conformes Apple 2.1** (commit `3efce2e`) : plus de « beta » ni de « phase de test », plus de tiret cadratin ni d'emoji hors arcade, mail de retour `contact@velito.fr`. Le Playground affiche un avis « en amélioration continue » avant chaque jeu (`src/components/AvisPlayground.tsx`).
- **2026-10-06, Carte des actions et icônes de badges** (`app/(tabs)/stats.tsx`, `src/components/badgeIcons.ts`, commits `8eb70ff` et `679b569`) : sur l'onglet Stats, une puce par famille (tirs, rebonds, pertes, interceptions, passes, contres, fautes), chargée à la demande. C'est une exception à la règle « pas de nouvelle fonctionnalité avant le store », décidée par moi et notée comme telle dans le journal de `mabb-site`.

## État d'avancement honnête

**Au 2026-10-10 : l'app n'est publiée sur aucun store.** Sources : `git log` du dossier depuis le 25/07, `mabb-site/instruction/00_ECOSYSTEME.md` (§3.5 au 21/09, §9.1 bloc B au 01/10, journal « Store B » du 05/10), `instruction/19_CHECKLIST_STORES_2026-09-09.md` et `20_BASCULE_VENABALL_2026-09-09.md`.

- **Ce qui a avancé depuis juillet** : `projectId` EAS posé (14/09), premier build EAS réussi le 30/09 (APK preview-venaball, d'après le journal du doc maître), identifiant `fr.venaball.app`, adresses centralisées, signaler et masquer sur toutes les cartes de joueuses, mock interdit en release, textes sans « beta », retours du coach et carte des actions sur l'onglet Stats. Le compte Google Play Console existe (son identifiant est cité dans `venaball club-store/instruction/02_PROMPT_DEV_STORE.md`) ; pour le compte Apple, je n'ai rien trouvé qui le confirme : non vérifié.
- **Ce qui bloque encore la soumission** (journal du 05/10) : identifiants Apple et Google à compléter dans le bloc `submit` d'`eas.json` ; questionnaires App Privacy et classification d'âge ; compte de review complet (la commande `app:demo:club --enrichir` existe côté serveur mais doit être lancée sur l'instance Venaball) ; notes de review ; captures ; build de production iOS et Android.
- **Le vrai verrou est côté serveur** : le binaire de production vise `api.venaball.fr`, où les joueuses du MABB n'ont pas de compte. Tant que la migration MABB vers l'instance Venaball n'est pas faite (procédure écrite le 09/10 dans `mabb-site`, hébergement MABB fermé le 22/10/2026), l'app du store ne sert aucune joueuse réelle.
- **Écarts que j'ai vus dans le code le 10/10** : `app/scouting.tsx` affiche encore « PIRB SCOUTING » ; `app/club.tsx` ouvre toujours la carte vide alors que le doc maître demande de la retirer de la navigation ; `app/claveliito.tsx` ouvre `https://mabb.fr/clavel` en dur, malgré la règle « plus de domaine en dur » ; `app/(tabs)/stats.tsx` déclare deux couleurs hex hors de `tokens.ts`, contre la règle D-06 ; `MockPirbDataService` (environ 480 lignes) reste dans le bundle.
- **Jamais validé sur le terrain, à ma connaissance** : push réel de bout en bout, boucle convocation, vision du Playground au gymnase. Aucun test automatisé, pas de lint, pas de crash reporting (Sentry est noté « prochaine étape » dans `src/components/EcranCrash.tsx`).
- Risques toujours ouverts : le Playground reste une WebView (risque « web wrapper » Apple), la modération repose sur un mail et une liste locale (rien n'est bloqué côté serveur), serveur OVH mutualisé sans monitoring.

## Prochaines étapes

1. **Migrer le MABB sur l'instance Venaball avant le 22/10** (procédure de `mabb-site`, avec une sauvegarde restaurée une fois) : sans ça, le binaire de production n'a aucune utilisatrice.
2. **Corriger les derniers écarts du code** : « PIRB SCOUTING », lien `mabb.fr/clavel`, carte vide dans la navigation, puis `npx tsc --noEmit` et `npx expo-doctor`.
3. **Remplir le dossier store** : identifiants Apple et Google dans `eas.json`, App Privacy et classification d'âge, compte de review lancé avec `app:demo:club --enrichir`, notes de review, captures prises après la migration.
4. **Test réel sur téléphone** d'un build preview-venaball : push, convocation, mot de passe oublié (vérifier que `hosts.ts` donne la bonne adresse), signaler et masquer.
5. **Builds de production iOS et Android, puis soumission**, décidée par moi.
