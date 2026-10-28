---
titre: "Signaler et masquer : la modération que les stores exigent dès qu'une app affiche du contenu d'utilisatrices"
projet: "pirb"
bloc: 1
themes: ["mobile", "metier"]
source: "src/services/moderation.ts"
date: 2026-10-10
---

## Le concept

Mon app affiche du **contenu généré par les utilisatrices** (en anglais UGC, *user generated content*) : la bio d'une joueuse, ses liens de highlights vidéo, le fil « commu ». Et ces utilisatrices sont souvent mineures. Apple (règle 1.2 de sa review) et Google demandent alors trois choses : un moyen de **signaler** un contenu, un moyen de **bloquer** son auteur, et un **contact de modération** qui répond vite. Sans ces trois-là, l'app est refusée, quel que soit le reste.

Ma checklist du 09/09 (`instruction/19_CHECKLIST_STORES_2026-09-09.md`, point A.8) l'a trouvé : un grep de « signaler » ne remontait que « Signaler un bug ». Le jour même, le commit `342abc4` a ajouté `src/services/moderation.ts`. Le cœur du module :

```ts
// src/services/moderation.ts
export const EMAIL_MODERATION = 'contact@velito.fr';
const CLE_MASQUEES = 'venaball.moderation.masquees.v1';

async masquer(joueurId: number): Promise<void> {
  const s = await charger();
  s.add(joueurId);
  await sauver();
  notifier();
},

menu(contexte: { type: 'highlight' | 'profil' | 'bio'; joueurId: number; pseudo?: string; ref?: string }, onMasque?: () => void) {
  Alert.alert(contexte.pseudo ? `${contexte.pseudo}` : 'Ce contenu', 'Que veux-tu faire ?', [
    { text: 'Signaler ce contenu', onPress: () => void moderation.signaler(contexte) },
    { text: 'Masquer cette joueuse', style: 'destructive',
      onPress: () => { void moderation.masquer(contexte.joueurId).then(() => onMasque?.()); } },
    { text: 'Annuler', style: 'cancel' },
  ]);
},
```

Le mécanisme, en V1 volontairement simple et **sans nouvel endpoint serveur** :

- **Signaler** ouvre un mail pré-rempli (`mailto:`) vers l'adresse de modération des CGU, avec le type de contenu, l'identifiant de la joueuse et la référence (l'URL du highlight). Le modérateur retrouve le contenu sans chercher. Si aucune app de mail ne s'ouvre, une alerte donne l'adresse.
- **Masquer** ajoute l'id de la joueuse dans une liste stockée sur le téléphone (AsyncStorage). Le module prévient ses abonnés (`notifier()`), et chaque écran refiltre sa liste tout de suite.
- **Revenir en arrière** : Réglages liste les joueuses masquées avec un bouton « Réafficher » (`app/reglages.tsx`).

Le menu s'ouvre par un **appui long** sur une carte. Au 09/09 il était branché sur Scouting, Social et Réglages ; le 05/10 (commit `8eb70ff`) je l'ai étendu à toutes les cartes de joueuses (`CommuCard` sur l'accueil, la recherche et ses highlights, `app/equipe.tsx`), et j'ai créé le hook `src/hooks/useJoueusesMasquees.ts` parce que cinq écrans recopiaient le même abonnement. Une joueuse masquée sur l'accueil disparaît aussi de la recherche sans recharger.

Le pourquoi du « simple » : le module est **le seul point d'entrée**. Les écrans n'appellent que `moderation.menu()` ou le hook. Le jour où le serveur enregistre les signalements et les blocages, je remplace l'intérieur du module sans toucher aux écrans. Sans ce module : refus à la review, et surtout aucun recours pour une ado qui tombe sur un contenu déplacé.

## Comment je l'explique au jury

Mon app affiche des bios et des liens vidéo publiés par des joueuses mineures, donc les stores exigent que l'on puisse signaler un contenu, bloquer son autrice et joindre quelqu'un. Ma checklist store a révélé que je n'avais rien de tout ça, et c'était un motif de refus à lui seul. J'ai fait une V1 sans toucher au serveur : un appui long sur une carte propose « Signaler », qui ouvre un mail pré-rempli avec les identifiants du contenu, ou « Masquer », qui retire la joueuse de tous mes écrans en direct, avec un retour possible depuis les réglages. Tout passe par un seul module, `moderation.ts`, pour que la future version serveur ne change que ce fichier. Je sais que c'est un minimum, et je sais exactement ce qui manque.

## La question vicieuse du jury

**« Votre masquage est local et votre signalement est un mail. La joueuse masquée voit toujours vos contenus, et rien n'est tracé côté serveur. C'est vraiment de la modération ? »**

C'est une modération minimale, et je ne la présente pas autrement. Masquer ne bloque pas au sens fort : la liste vit sur le téléphone, elle disparaît si l'app est réinstallée, elle ne suit pas le compte sur un autre appareil, et la joueuse masquée n'est pas empêchée de voir le profil de celle qui l'a masquée. Le signalement dépend d'une personne qui lit la boîte `contact@velito.fr` et répond sous 24 heures ouvrées comme le promettent les CGU ; rien n'est horodaté en base. Deux garde-fous existent ailleurs : le profil est privé par défaut et l'app n'affiche que le prénom et le club (doc maître de `mabb-site`, §3.5). La version suivante, que je décrirais ainsi : une table de signalements côté Symfony (auteur, contenu, motif, date, statut), un blocage enregistré par compte et appliqué par le serveur dans les requêtes du fil, et un écran de traitement pour le club. Le module `moderation.ts` est déjà la façade qui permettra ce changement sans toucher aux écrans. Ce que je ne sais pas encore : si la review Apple acceptera le masquage local comme « blocage ». Je le saurai à la première soumission.
