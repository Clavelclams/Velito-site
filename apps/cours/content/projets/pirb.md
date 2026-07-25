---
titre: "Pirb — app mobile"
avancement: 85
statut: "en cours"
maj: 2026-07-25
---

## C'est quoi

Pirb (renommée **Venaball** côté utilisateur, « pirb » reste le nom technique : sous-domaine `pirb.mabb.fr`, routes `/api/pirb`, types `PirbDataService`) est l'app mobile compagnon de la plateforme Symfony de gestion de clubs de basket. Elle donne à une joueuse — souvent mineure — son espace perso : stats de match validées par le club, profil, badges et niveau XP, convocations avec réponse, notifications, bilans de compétences, et un Playground caméra (jeux de dribble/tir dont le score est compté automatiquement par vision). 27 écrans, dont l'essentiel est natif ; l'app est branchée sur les vraies données du club via l'API `pirb.mabb.fr`.

## Comment c'est construit

- **Stack** : Expo SDK 54 (managed) / React Native 0.81.5 / React 19.1 / TypeScript ~5.9 — voir `package.json`.
- **Navigation par fichiers** avec expo-router 6 : chaque fichier de `app/` est un écran. `app/_layout.tsx` = Stack racine (fonts, intro animée, garde de connexion, error boundary global, enregistrement push) ; `app/(tabs)/_layout.tsx` = les 5 onglets (Accueil, Stats, Recherche, Playground, Profil).
- **Couche données abstraite** : l'interface `src/services/data/PirbDataService.ts` (le contrat, ~40 méthodes), deux implémentations `src/services/data/MockPirbDataService.ts` (démo sans serveur) et `src/services/data/ApiPirbDataService.ts` (API Symfony réelle, avec retry/timeout), et une factory `src/services/data/index.ts` qui choisit selon `EXPO_PUBLIC_DATA_SOURCE`. Les écrans ne connaissent que l'interface.
- **Session** : `src/services/auth/session.ts` — jeton Bearer 30 jours stocké dans expo-secure-store (Keychain iOS / Keystore Android), store sans React consommé via `useSyncExternalStore`.
- **Résilience** : `src/hooks/useAsyncData.ts` (états loading/error/data systématiques), `src/components/EcranCrash.tsx` (error boundary global), `src/components/EcranHorsLigne.tsx` (overlay hors-ligne qui donne accès à l'easter egg arcade offline).
- **Push** : `src/services/push.ts` (permission, jeton Expo, enregistrement serveur, routage du tap de notification).
- **Types** : `src/types/pirb.ts` (443 lignes), calqués sur les structures réelles du backend Symfony — c'est le contrat d'API proposé côté client.
- **Build** : `eas.json` (3 profils : development / preview / production, tous verrouillés sur `EXPO_PUBLIC_DATA_SOURCE=api` + `https://pirb.mabb.fr`) et `app.json` (bundleIdentifier `fr.mabb.pirb`, version 1.0.0, plugin expo-camera avec texte de permission RGPD).

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

## État d'avancement honnête

D'après `instruction/14_ETAT_DES_LIEUX_2026-07-13.md`, `06_AVANCEMENT.md` et `15_PLAN_FIN_PROJET_2026-07-13.md` : **le code de la 1.0 est fait à ~90 %, mais l'app n'est pas publiable aujourd'hui** — et ce qui manque n'est plus du code.

- Fait et branché sur les vraies données : ossature (98 %), robustesse (100 %), profil/stats/badges/niveau (~90 %), convocations natives (95 %, non testées bout en bout), notifications (90 %), bilans (90 %), config de build (95 %), arcade offline (100 %).
- Encore jeune : social (confidentialité appliquée partiellement côté serveur — 45 %, scouting 60 %, attributs 55 %), vision v5 non validée au gymnase (85 %).
- **Publication store : bloquée à 0.** Le seul vrai blocage : les comptes développeur Apple + Google (organisation VENA) ne sont pas créés — le D-U-N-S est obtenu, il reste « une demi-heure de formulaires ». Sans comptes : pas de certificat push, pas de `eas init` (projectId), pas de dev build, pas de TestFlight. S'ajoutent : rien n'a été testé sur le terrain (boucle convocation, push, vision v5), la conformité mineurs (consentement parental) est à cadrer avant soumission, et `venaball.fr` est à acheter.
- Risques identifiés les yeux ouverts : le Playground reste une WebView (risque « web wrapper » Apple, module natif prévu en 1.1), pas de crash reporting (Sentry) donc aveugle en prod, serveur OVH mutualisé sans monitoring.

## Prochaines étapes

1. **Créer les comptes développeur Apple + Google** (organisation VENA) et acheter `venaball.fr` — le bloc P0 qui débloque tout le reste (½ journée).
2. `eas init` → projectId → **premier development build** sur un vrai téléphone (½ journée).
3. **Tester la boucle complète au gymnase** : convocation Manager → app → réponse, push réel, vision v5 (fps, arceau auto), arcade en mode avion (1 journée).
4. **Conformité mineurs** (consentement parental via le club, questionnaire d'âge des stores) + brancher **Sentry** sur l'error boundary.
5. **Build de production + soumission** : TestFlight iOS + piste fermée Google avec les joueuses du MABB, puis store public.
