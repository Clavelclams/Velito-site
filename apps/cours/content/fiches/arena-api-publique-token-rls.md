---
titre: "Une API publique où je n'écris aucun contrôle d'accès"
projet: "arena"
bloc: 3
themes: ["api", "securite-applicative"]
source: "apps/arena/app/api/export/[token]/route.ts"
date: 2026-09-04
---

## Le concept

Chaque tournoi possède un `qr_token` — un UUID généré par la base — qui sert d'adresse publique : `/t/[token]` pour la page, `/api/export/[token]` pour les données brutes. On imprime le QR code, les joueurs scannent, ils suivent le bracket en direct sans compte.

Le point remarquable de cette route, c'est ce qu'elle **ne contient pas** :

```ts
export async function GET(_request: Request, { params }) {
  const { token } = await params;
  const supabase = await createClient();      // ← client ANONYME

  const { data: tournoiData } = await supabase
    .schema("arena").from("tournois")
    .select("*").eq("qr_token", token).maybeSingle();

  if (!tournoiData) {
    return NextResponse.json({ erreur: "Tournoi introuvable" }, { status: 404 });
  }
  /* ... */
}
```

Aucun `if (tournoi.statut !== "BROUILLON")`. Aucune vérification de droits. Et pourtant un tournoi en brouillon renvoie bien 404 : le client est **anonyme**, donc la **RLS** s'applique, et la policy de lecture ne rend les tournois qu'à partir d'un certain statut. La ligne n'arrive jamais jusqu'à mon code — `maybeSingle()` rend `null`, et le `null` devient un 404.

C'est le renversement à comprendre : le contrôle d'accès n'est pas une étape de ma route, c'est une propriété de la connexion. Si j'oublie une condition, la base ne me donne quand même rien. Alors qu'avec `service_role` — la clé qui contourne la RLS — l'oubli d'un `if` aurait publié les brouillons de tous les clubs.

D'où la règle que je m'impose : **le client anonyme par défaut, `service_role` seulement quand j'en ai la preuve du besoin.** Et le besoin, c'est l'écriture après vérification des droits, pas la lecture.

Deux choix secondaires. Le 404 plutôt qu'un 403 : un 403 confirmerait qu'un tournoi existe derrière ce token. Un 404 ne dit rien — c'est le principe de ne pas transformer un message d'erreur en oracle. Et les deux requêtes suivantes partent en `Promise.all` : participations et matchs ne dépendent pas l'une de l'autre, les lancer en parallèle divise l'attente réseau par deux.

## Comment je l'explique au jury

« Cette route publique ne contient aucun contrôle d'accès, et c'est volontaire. Elle utilise un client Supabase anonyme, donc la RLS de Postgres s'applique : un tournoi en brouillon n'est simplement jamais rendu, la requête revient vide et je réponds 404. Le contrôle est une propriété de la connexion, pas une étape de mon code — si j'oublie une condition, la base me protège quand même. J'aurais pu utiliser la clé de service et filtrer moi-même : à la première ligne oubliée, je publiais les brouillons de tous les clubs. Je réponds 404 et pas 403, pour ne pas confirmer l'existence d'un tournoi derrière un token. »

## La question vicieuse du jury

**« Un UUID dans l'URL, c'est de la sécurité par l'obscurité. »**

En partie oui, et il faut être précis sur ce que ce token protège. Un UUID v4 a 122 bits d'entropie : on ne le devine pas, et c'est le même mécanisme qu'un lien de partage Google Drive ou une facture Stripe. Mais un token dans une URL **fuit** — historique de navigateur, `Referer`, capture d'écran postée dans un groupe. Donc je ne lui fais porter que ce qu'il peut porter : l'accès à des données **déjà publiques par nature**, celles d'un tournoi publié, affichées de toute façon sur l'écran de la salle. Il n'ouvre aucune écriture, aucune donnée personnelle au-delà du pseudo, et les brouillons restent inaccessibles même avec le bon token. Si un orga veut couper l'accès, la parade existe : régénérer le `qr_token` invalide instantanément tous les anciens liens. Ce que je n'ai pas fait et qui manque : le régénérer devrait être un bouton dans l'interface staff, aujourd'hui ça passe par une requête à la main.
