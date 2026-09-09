---
titre: "Temps réel : ce qu'on garde en base et ce qui ne fait que passer"
projet: "interactive"
bloc: 3
themes: ["temps-reel", "architecture", "performance"]
source: "apps/interactive/app/host/HostDrawGame.tsx"
date: 2026-09-04
---

## Le concept

Velito Interactive fait jouer une salle entière : un écran « host » projeté, et les joueurs sur leur téléphone via `/play/[code]`. Tout doit être synchronisé en direct. Supabase Realtime offre deux mécanismes, et le jeu de dessin utilise **les deux, pour des choses différentes**.

**`postgres_changes`** écoute les changements d'une table. Quand une ligne est insérée ou modifiée, tous les abonnés reçoivent l'événement.

```ts
supabase.channel(`draw-host-${sessionId}`)
  .on("postgres_changes", { /* … table session_players, guesses … */ }, handler)
```

C'est ce qui porte l'**état du jeu** : les scores, les propositions, l'avancement du tour. Ces données doivent survivre — si l'écran host se recharge en plein milieu, la partie se reconstruit depuis la base.

**`broadcast`** envoie un message directement d'un client à l'autre, **sans passer par la base**.

```ts
const channel = supabase.channel(`draw-canvas-${sessionId}`);
channel.on("broadcast", { event: "snapshot" }, (payload) => { /* … */ });
```

C'est ce qui porte le **dessin en cours**. Un trait de crayon produit une image du canvas plusieurs fois par seconde. Les écrire en base serait absurde à double titre : on ferait des milliers d'écritures pour des données dont plus personne ne veut une seconde après, et on paierait la latence d'un aller-retour disque sur chaque trait.

Le critère de choix tient en une question : **est-ce que quelqu'un aura besoin de cette donnée dans dix secondes ?** Le score, oui — il détermine le gagnant. Le trait de crayon, non — seule l'image finale compte, et elle est enregistrée une fois, à la fin.

La conséquence assumée est que le broadcast n'a **aucune garantie de livraison**. Un joueur qui arrive en retard ne voit pas les traits déjà tracés ; un message perdu est perdu. Pour un dessin qui se met à jour dix fois par seconde, c'est sans importance : le snapshot suivant corrige tout. Ce serait inacceptable pour un score.

## Comment je l'explique au jury

« Le jeu de dessin utilise deux mécanismes temps réel différents, selon la durée de vie de la donnée. L'état du jeu — scores, propositions, tour en cours — passe par `postgres_changes` : la donnée est écrite en base, diffusée aux abonnés, et survit à un rechargement de l'écran host. Le dessin en train de se faire passe par `broadcast` : les messages vont de client à client sans toucher la base. Écrire plusieurs images de canvas par seconde en base coûterait des milliers d'écritures pour des données périmées à la seconde suivante. Le critère, c'est : est-ce que quelqu'un en aura besoin dans dix secondes ? Si oui, ça passe par la base ; sinon, ça ne fait que passer. »

## La question vicieuse du jury

**« Si le broadcast ne garantit rien, comment un joueur qui se connecte en cours de partie voit-il le dessin ? »**

Il ne le voit pas — jusqu'au prochain snapshot, soit une fraction de seconde plus tard, parce que le dessinateur émet en continu tant qu'il dessine. Le cas réellement gênant est différent : un joueur qui arrive pendant une **pause** du dessinateur voit un canvas vide jusqu'au trait suivant. Ce n'est pas couvert, et la parade serait qu'un client fraîchement abonné demande explicitement l'état courant — un message « qui a le canvas ? » auquel le dessinateur répond par un snapshot. Ça existe dans les systèmes collaboratifs sérieux, ça s'appelle une resynchronisation à l'abonnement. Je ne l'ai pas fait parce que dans une salle physique, le décalage dure moins d'une seconde et l'écran projeté fait référence pour tout le monde. C'est un arbitrage lié à l'usage — des gens dans la même pièce, pas des joueurs distants — et il ne tiendrait plus si le jeu devenait purement en ligne.
