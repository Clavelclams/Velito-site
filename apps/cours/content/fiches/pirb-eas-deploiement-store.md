---
titre: "Préparer une app aux stores : profils de build EAS, identité d'app et exigences Apple/Google"
projet: "pirb"
bloc: 3
themes: ["build et deploiement", "conformite stores"]
source: "eas.json"
date: 2026-07-25
---

## Le concept

Publier une app, ce n'est pas « appuyer sur un bouton » : il faut une configuration de build et une conformité. Dans Pirb, deux fichiers portent tout ça.

**`eas.json`** définit 3 **profils de build** EAS (Expo Application Services, l'usine à binaires d'Expo) :
- `development` : build avec le client de dev (`developmentClient: true`), distribution interne — c'est lui qui permet de tester le push et la caméra, impossibles dans Expo Go ;
- `preview` : APK Android en distribution interne (installable directement pour tester) ;
- `production` : `app-bundle` Android (le format .aab exigé par Google Play) + `autoIncrement` du numéro de build.

Point sécurité important : **les 3 profils verrouillent l'environnement** — `EXPO_PUBLIC_DATA_SOURCE=api` et `EXPO_PUBLIC_API_URL=https://pirb.mabb.fr` sont inscrits dans chaque profil. Un audit (`instruction/11_AUDIT_STORE_2026-07-10.md`) avait identifié le risque de builder par erreur la version `mock` : des utilisatrices auraient vu de fausses données. Le verrou dans `eas.json` rend l'erreur impossible.

**`app.json`** porte l'identité et la conformité : `bundleIdentifier: "fr.mabb.pirb"` (iOS) et `package: "fr.mabb.pirb"` (Android) — sans eux, aucune soumission possible ; `version: "1.0.0"` ; et le plugin `expo-camera` avec le texte de permission que l'utilisatrice (et le reviewer Apple) lira :

```json
"cameraPermission": "Venaball utilise la caméra pour compter tes tirs et tes
dribbles pendant tes séances. L'image reste sur ton téléphone : rien n'est
filmé, rien n'est enregistré, rien n'est envoyé."
```

Apple rejette toute app qui utilise la caméra sans explication (NSCameraUsageDescription). S'ajoutent les exigences traitées dans le code : suppression de compte depuis l'app (guideline Apple 5.1.1(v), via `demanderSuppressionCompte()` du contrat de données), politique de confidentialité amendée pour couvrir l'app et la caméra, et le cadrage du public mineur (consentement parental) encore à formaliser.

## Comment je l'explique au jury

Pour préparer la publication, j'ai défini trois profils de build dans eas.json : un profil development avec le client de dev, indispensable pour tester le push et la caméra qu'Expo Go ne supporte pas ; un profil preview qui sort un APK installable pour les testeuses ; et un profil production qui sort l'app-bundle exigé par Google Play, avec incrément automatique du numéro de build. Un point auquel je tiens : mon audit avait repéré le risque de builder par erreur la version mock, avec de fausses données — j'ai donc verrouillé la source de données et l'URL de l'API en dur dans les trois profils. Côté conformité, j'ai déclaré les identifiants de bundle iOS et Android, écrit le texte de permission caméra qu'Apple exige, en langage humain et honnête — rien n'est filmé, rien n'est envoyé — et implémenté la suppression de compte dans l'app, une exigence Apple. Aujourd'hui le code est prêt ; ce qui bloque la publication, c'est l'administratif : les comptes développeur Apple et Google au nom de l'entreprise ne sont pas encore créés, et sans eux, pas de certificat push ni de TestFlight.

## La question vicieuse du jury

**« Votre app est en grande partie des WebView : Apple rejette les "web wrappers" au titre de la guideline 4.2. Qu'est-ce qui vous fait croire que vous passerez la review ? »**

C'est le risque que j'ai identifié moi-même dans mon audit store, et que j'ai traité par un chantier de "nativisation" mesuré : on est parti de 8 entrées WebView sur 8 dans le menu, on est à 2 vraies WebView de contenu sur 10 — convocations, notifications, bilans, équipe, stats, profil, social sont natifs, et j'ai un easter egg 100 % offline qui prouve que l'app vit sans le web. Le point restant, je le connais : le Playground caméra est encore une WebView, parce que la détection MediaPipe y tourne sans module natif — c'était le moyen d'avoir la vision sans development build. Le remède est planifié en 1.1 : un module natif vision-camera + TFLite, qui réutilise le development build déjà nécessaire au push. Donc face au reviewer, j'ai un argument chiffré aujourd'hui et une trajectoire crédible pour demain.
