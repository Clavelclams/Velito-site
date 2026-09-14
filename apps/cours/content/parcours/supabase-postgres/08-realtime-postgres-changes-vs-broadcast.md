---
titre: "Temps réel : postgres_changes garde, broadcast passe"
parcours: "supabase-postgres"
ordre: 8
niveau: "solide"
duree: 20
date: 2026-09-09
---

## Le cours

Sur Interactive, l'écran host et vingt téléphones doivent voir la même chose au même moment. Supabase Realtime le permet par WebSocket, avec **deux mécanismes différents** que le jeu de dessin utilise tous les deux — et choisir le mauvais coûte cher.

**`postgres_changes` : écouter la base.** Tu t'abonnes à une table ; chaque `INSERT`, `UPDATE` ou `DELETE` te parvient comme un événement, avec la ligne.

```ts
supabase.channel(`draw-host-${sessionId}`)
  .on("postgres_changes",
      { event: "UPDATE", schema: "interactive", table: "session_players", filter: `session_id=eq.${sessionId}` },
      (payload) => setJoueurs(/* payload.new */))
  .subscribe();
```

Le `filter` est essentiel : sans lui, tu reçois les mises à jour de **toutes** les sessions. Et la RLS s'applique aussi au temps réel : un abonné ne reçoit que les lignes qu'il aurait le droit de lire.

Ce mécanisme porte l'**état du jeu** : scores, propositions, avancement du tour. La donnée est écrite en base d'abord, diffusée ensuite. Si l'écran host se recharge en pleine partie, il relit la base et retrouve tout. **La base est la source de vérité, le temps réel n'est qu'une notification.**

**`broadcast` : parler de client à client.** Un message envoyé sur un canal, reçu par tous les abonnés du canal, **sans passer par la base**.

```ts
const channel = supabase.channel(`draw-canvas-${sessionId}`);
channel.on("broadcast", { event: "snapshot" }, (payload) => afficher(payload.payload.image));
channel.subscribe();

// côté dessinateur, plusieurs fois par seconde :
channel.send({ type: "broadcast", event: "snapshot", payload: { image: canvas.toDataURL() } });
```

Ce mécanisme porte le **dessin en cours**. Écrire une image de canvas en base dix fois par seconde serait absurde : des milliers d'écritures pour une donnée périmée à la seconde suivante, et la latence d'un aller-retour disque sur chaque trait. Le broadcast va de client à client via le serveur Realtime, sans toucher Postgres.

**Le critère de choix, en une question : quelqu'un aura-t-il besoin de cette donnée dans dix secondes ?**

- Oui → elle doit survivre → base + `postgres_changes`. Le score, le gagnant, la réponse validée.
- Non → elle ne fait que passer → `broadcast`. Le trait de crayon, la position d'un curseur, un « X est en train d'écrire… ».

**Ce que le broadcast ne garantit pas.** Aucune livraison. Un message perdu est perdu. Un client qui arrive en retard ne voit pas les messages précédents. Pour le dessin, c'est sans importance : le snapshot suivant, une fraction de seconde après, corrige tout. Pour un score, ce serait inacceptable. Le cas gênant : un joueur qui rejoint pendant une **pause** du dessinateur voit un canvas vide jusqu'au prochain trait. La parade — non implémentée — serait une resynchronisation à l'abonnement : le nouvel arrivant demande « qui a l'état ? », le dessinateur renvoie un snapshot.

**`presence` : le troisième mécanisme.** Savoir qui est connecté au canal, en direct. Chaque client annonce un état (`{ pseudo, pret: true }`), tous reçoivent la liste. C'est ce qu'il faut pour un « 12 joueurs connectés » ou un « tout le monde est prêt ». Tu ne l'utilises pas encore ; c'est le bon outil pour la salle d'attente d'une partie.

**Les pièges pratiques.**

- **Se désabonner.** Un `channel.subscribe()` dans un `useEffect` **doit** avoir `return () => supabase.removeChannel(channel)`. Sinon chaque montage empile un abonnement — et tu reçois chaque événement en double, triple.
- **Activer la publication.** `postgres_changes` ne fonctionne que si la table est dans la publication `supabase_realtime` (dashboard → Database → Replication, ou `ALTER PUBLICATION supabase_realtime ADD TABLE interactive.session_players;`). Une table non publiée n'émet rien, silencieusement.
- **Un canal par sujet.** `draw-host-${sessionId}` et `draw-canvas-${sessionId}` sont deux canaux : l'un pour l'état, l'autre pour le flux. Mélanger les deux sur un canal oblige tous les abonnés à recevoir tout.

## À retenir

- `postgres_changes` = notification d'écritures en base. La base reste la vérité ; survit au rechargement.
- `broadcast` = message client → clients, sans base, sans garantie. Pour l'éphémère.
- La question : « utile dans dix secondes ? » Oui → base. Non → broadcast.
- `presence` = qui est là. Pour les salles d'attente.
- Toujours `removeChannel` au démontage. Vérifier la publication. Un canal par sujet.

## Mise en pratique

Objectif : voir les deux mécanismes côte à côte dans un composant de test, puis les repérer dans Interactive.

1. SQL Editor : `CREATE TABLE public.lecon_compteur (id int PRIMARY KEY, valeur int);` `INSERT INTO public.lecon_compteur VALUES (1, 0);` RLS + policy SELECT `true`. `ALTER PUBLICATION supabase_realtime ADD TABLE public.lecon_compteur;`
2. Crée un Client Component de test dans cours avec un `useEffect` qui s'abonne en `postgres_changes` (`UPDATE` sur `lecon_compteur`) et affiche `payload.new.valeur`. N'oublie pas le `removeChannel`. Ouvre la page dans **deux onglets**.
3. SQL Editor : `UPDATE public.lecon_compteur SET valeur = valeur + 1 WHERE id = 1;`. Les deux onglets se mettent à jour. Recharge un onglet : il affiche l'état initial lu… nulle part — ajoute une lecture initiale (`.from("lecon_compteur").select()`) dans l'effet. Maintenant il retrouve la valeur. C'est « la base est la vérité ».
4. Broadcast : dans le même composant, un second canal `lecon-souris` ; sur `onMouseMove`, `channel.send({ type: "broadcast", event: "pos", payload: { x, y } })` (limite à 20 fois par seconde avec un `setTimeout`). Les autres onglets affichent un point à cette position. Ouvre un troisième onglet en cours de route : il ne voit rien tant que tu ne bouges pas. C'est l'absence de garantie.
5. Retire le `removeChannel`, navigue vers la page et ailleurs trois fois, reviens : chaque `UPDATE` arrive en quatre exemplaires. Remets-le.
6. Ouvre `apps/interactive/app/host/HostDrawGame.tsx`. Repère les deux canaux, ce que chacun transporte, et le `removeChannel`. Pour chaque donnée transportée, réponds : « utile dans dix secondes ? »
7. `DROP TABLE public.lecon_compteur;` (retire-la de la publication avant si nécessaire), supprime le composant.

Résultat attendu : tu as vu la différence de nature entre les deux mécanismes, la fuite sans désabonnement, et tu sais lequel choisir en une question.
