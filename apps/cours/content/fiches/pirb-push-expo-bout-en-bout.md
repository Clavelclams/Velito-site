---
titre: "Le push de bout en bout : du coach qui convoque à la notification qui ouvre le bon écran"
projet: "pirb"
bloc: 1
themes: ["notifications push", "integration client-serveur"]
source: "src/services/push.ts"
date: 2026-07-25
---

## Le concept

Une notification push traverse toute la chaîne : l'app demande la **permission** à l'utilisatrice, Expo fabrique un **jeton** qui identifie cet appareil, l'app l'envoie au serveur Symfony qui le range dans la table `push_token` rattaché au compte ; quand le coach convoque, le serveur (service `ExpoPushService` côté mabb-site) envoie le message à Expo, qui le relaie à Apple (APNs) ou Google (FCM), qui l'affichent sur le téléphone.

Côté client, tout est dans `src/services/push.ts`. La fonction `enregistrerPush()` est appelée depuis `app/_layout.tsx` à chaque ouverture de session, car un jeton peut changer (réinstallation, restauration) — le réenregistrement est idempotent côté serveur. Elle est écrite pour **ne jamais lever d'erreur** :

```ts
// Refus = refus. On ne redemande pas, on ne harcèle pas.
if (status !== 'granted') return;

const projectId =
  Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
if (!projectId) return; // pas un bug : un prérequis absent
```

Deux contraintes de plateforme sont documentées en tête de fichier : le push **ne marche pas dans Expo Go** (support retiré depuis le SDK 53, il faut un development build EAS) et il exige un **projectId EAS** créé par `eas init`. D'où le choix : tout échoue en silence tant que ces prérequis manquent, l'app continue normalement — « le push est un confort, pas une dépendance ». Sur Android, un canal de notification est obligatoire (`setNotificationChannelAsync`), sinon les notifications sont muettes. Enfin, `ecouterTapNotification()` lit la charge utile envoyée par le serveur (`data: { type: 'convocation' }`) pour router vers `/convocations` et pas vers l'accueil ; et à la déconnexion, `retirerPush()` désinscrit l'appareil pour qu'il ne reçoive plus les convocations de quelqu'un d'autre.

## Comment je l'explique au jury

J'ai écrit la chaîne push complète : côté serveur Symfony, une table push_token, un service ExpoPushService et un envoi déclenché quand le coach convoque une joueuse ; côté app, un service qui demande la permission une seule fois, récupère le jeton Expo de l'appareil et le déclare au serveur. Je réenregistre le jeton à chaque ouverture parce qu'il peut changer, et l'opération est idempotente côté serveur — c'est le prix d'un push qui arrive vraiment. J'ai conçu ce service pour échouer en silence : Expo Go ne supporte plus le push et il me manque encore le projectId EAS, donc tant que ces prérequis manquent, le service ne fait rien proprement, sans jamais casser l'app. Quand la joueuse tape la notification, je lis la charge utile pour ouvrir directement l'écran des convocations — une notification qui mène nulle part, c'est une notification qu'on ignore la fois d'après. Et à la déconnexion, je désinscris l'appareil : question de sécurité, il ne doit plus recevoir les données d'un autre compte.

## La question vicieuse du jury

**« Vous dites que la chaîne push est complète, mais vous ne l'avez jamais vue fonctionner. Comment pouvez-vous l'affirmer ? »**

Je l'assume, et c'est documenté dans mon état des lieux : le code est écrit de bout en bout, mais rien n'est validé sur un vrai téléphone, parce que le test est physiquement impossible aujourd'hui — Expo Go ne supporte plus le push distant depuis le SDK 53, et un development build exige un projectId EAS et un certificat, donc un compte développeur Apple, qui n'est pas encore créé. Ce n'est pas un choix technique, c'est un blocage administratif identifié comme LE point critique de mon plan de fin de projet. J'ai préparé le terrain pour que ce blocage ne coûte rien : le service échoue en silence, l'app fonctionne sans push, et le jour où le compte existe, la validation est une séance de test au gymnase, pas une réécriture. Savoir distinguer « codé » de « validé en conditions réelles », c'est précisément ce que je montre là.
