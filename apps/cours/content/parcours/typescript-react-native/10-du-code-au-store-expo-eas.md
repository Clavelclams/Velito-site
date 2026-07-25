---
titre: "Du code au store : Expo, EAS et les exigences d'Apple et Google"
parcours: "typescript-react-native"
ordre: 10
niveau: "solide"
duree: 30
date: 2026-07-25
---

## Le cours

Dernière étape du parcours : comment ton code TypeScript devient une app installable depuis l'App Store et le Play Store. C'est le sujet de ta fiche `pirb-eas-deploiement-store` — ici, on le relit dans les deux fichiers de configuration réels.

D'abord les rôles. **Expo** est la plateforme qui fait tourner ton React Native (SDK, `npx expo start` pour le développement). **EAS** (Expo Application Services) est son service de build dans le cloud : il compile ton app en binaire natif — indispensable, car produire un `.ipa` iOS exige un Mac et des certificats Apple ; EAS s'en charge sur ses serveurs.

Premier fichier : `app.json`, la **carte d'identité** de l'app. Les lignes qui comptent :

```json
"name": "Venaball",              // le nom sous l'icône
"slug": "pirb",
"ios":     { "bundleIdentifier": "fr.mabb.pirb", "buildNumber": "1" },
"android": { "package": "fr.mabb.pirb", "versionCode": 1 }
```

`fr.mabb.pirb` est l'identifiant unique mondial de l'app (convention : domaine inversé). Une fois publié, il ne change **jamais** — c'est lui qui fait qu'une mise à jour remplace l'app au lieu d'en installer une deuxième. `versionCode` / `buildNumber` doivent croître à chaque envoi aux stores.

Toujours dans `app.json`, la section `plugins` cache un point d'audit store : la permission caméra. Apple et Google **exigent** qu'une app explique pourquoi elle demande chaque permission, dans un texte visible par l'utilisatrice :

```json
"cameraPermission": "Venaball utilise la caméra pour compter tes tirs et tes
dribbles pendant tes séances. L'image reste sur ton téléphone : rien n'est
filmé, rien n'est enregistré, rien n'est envoyé."
```

Un texte vague = rejet en review. Celui-ci dit l'usage ET la garantie de confidentialité — d'autant plus important que le public de Pirb est mineur.

Deuxième fichier : `eas.json`, les **profils de build**. Trois profils, trois usages :

```json
"development": { "developmentClient": true, "distribution": "internal", ... }
"preview":     { "distribution": "internal", "android": { "buildType": "apk" } }
"production":  { "autoIncrement": true, "android": { "buildType": "app-bundle" } }
```

`development` : build de dev avec outils de debug, installé en direct (`distribution: "internal"`), pour développer avec le vrai code natif — rappelle-toi, le push ne marche pas dans Expo Go. `preview` : un **APK** Android, le format qu'on installe à la main — parfait pour faire tester l'app au club sans passer par le store. `production` : un **app-bundle (AAB)**, le format exigé par le Play Store, avec `autoIncrement: true` qui monte le `versionCode` tout seul à chaque build — plus d'oubli possible. Remarque enfin le bloc `env` répété dans chaque profil : `EXPO_PUBLIC_DATA_SOURCE=api` et `EXPO_PUBLIC_API_URL=https://pirb.mabb.fr`. La boucle est bouclée avec la leçon 5 : **tout build EAS embarque la vraie API ; le mock, c'est pour le développement local**.

Reste la review des stores, où la technique rejoint le droit. Exemple concret dans ton code : Apple (guideline 5.1.1(v)) impose que toute app à compte permette de **demander la suppression du compte depuis l'app** — un lien vers un site ne suffit pas. C'est exactement pourquoi `PirbDataService` a la méthode `demanderSuppressionCompte()` : une exigence de store devenue une méthode du contrat de données, doublée d'une exigence RGPD (article 17, droit à l'effacement). Devant le jury, ce pont code ↔ conformité vaut de l'or : tu montres que le déploiement n'est pas un clic, c'est une responsabilité.

Le chemin complet à savoir dérouler : code TypeScript → `eas build --profile production` (compilation cloud en AAB/IPA, types effacés, variables d'env injectées) → soumission aux stores → review Apple/Google (permissions, RGPD, suppression de compte) → publication. Chaque étape a sa trace dans tes deux fichiers de config.

## À retenir

- Expo fait tourner l'app en développement ; EAS la compile dans le cloud en binaires natifs (AAB pour Google, IPA pour Apple) — pas besoin de Mac.
- `app.json` = carte d'identité : `fr.mabb.pirb` est l'identifiant unique et définitif ; `versionCode`/`buildNumber` croissent à chaque envoi.
- `eas.json` = trois profils : development (debug), preview (APK à installer à la main pour tester), production (app-bundle + autoIncrement).
- Chaque profil EAS injecte ses variables d'env : tout build embarque `EXPO_PUBLIC_DATA_SOURCE=api` — le mock ne sort jamais en build.
- La review des stores impose des règles dans le code : texte de permission caméra honnête, suppression de compte in-app (Apple 5.1.1(v) + RGPD art. 17 → `demanderSuppressionCompte()`).

## Mise en pratique

Dans ton projet Pirb :

1. Ouvre `app.json` et lis à voix haute : le nom affiché, l'identifiant iOS, le package Android, les numéros de version. Explique pourquoi `bundleIdentifier` et `package` portent la même valeur `fr.mabb.pirb` et pourquoi elle ne devra jamais changer.
2. Ouvre `eas.json` et compare les profils `preview` et `production` : trouve les DEUX différences Android (buildType `apk` vs `app-bundle`, présence d'`autoIncrement`) et explique à quoi sert chaque profil dans la vraie vie du projet.
3. Prédis : si tu lances un build avec le profil `preview`, l'app utilisera-t-elle le mock ou l'API ? Vérifie dans le bloc `env` du profil — puis explique pourquoi ce choix est cohérent avec la factory de `src/services/data/index.ts` (leçon 5).
4. Dans `app.json`, lis le texte de `cameraPermission` et explique en quoi il répond aux exigences de review : usage précis + promesse de confidentialité (rien n'est enregistré ni envoyé), pour un public mineur.
5. Relie le code à la conformité : ouvre `src/services/data/PirbDataService.ts`, retrouve `demanderSuppressionCompte()` et son commentaire, puis formule en deux phrases « pourquoi cette méthode existe » comme tu le dirais au jury (Apple 5.1.1(v) + RGPD art. 17, traitement sous 30 jours plutôt qu'effacement immédiat, et pourquoi). Résultat attendu : tu sais justifier une méthode de code par une règle de store ET une règle de droit — sans notes. Pour ancrer le tout, relis ensuite ta fiche `pirb-eas-deploiement-store`.
