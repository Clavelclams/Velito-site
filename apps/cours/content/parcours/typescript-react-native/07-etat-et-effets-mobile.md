---
titre: "État et effets dans une app mobile : useState et useEffect chez Pirb"
parcours: "typescript-react-native"
ordre: 7
niveau: "intermediaire"
duree: 25
date: 2026-07-25
---

## Le cours

Tu connais `useState` et `useEffect` du web. En mobile, ce sont exactement les mêmes hooks — mais les situations changent : réseau qui tombe, écran qu'on quitte en plein chargement, session à relire au démarrage. Lisons comment Pirb les emploie, cas réels à l'appui.

**useState : la mémoire du composant.** Dans `src/components/EcranHorsLigne.tsx` :

```tsx
const [ignore, setIgnore] = useState(false);
```

`ignore` retient que l'utilisatrice a tapé « Continuer sans réseau ». Un appel à `setIgnore(true)` déclenche un nouveau rendu, et la condition `if (!horsLigne || ignore || ...) return null;` fait disparaître l'écran. Note le pattern : **retourner `null`**, c'est la façon React de dire « je ne m'affiche pas » — l'overlay hors-ligne et l'intro de `app/_layout.tsx` l'utilisent tous les deux.

**useEffect : réagir à un changement.** Toujours dans `EcranHorsLigne.tsx` :

```tsx
useEffect(() => {
  if (!horsLigne) setIgnore(false); // la connexion revient : on réarme l'écran
}, [horsLigne]);
```

Relis le tableau de dépendances `[horsLigne]` : l'effet ne tourne QUE quand cette valeur change. Ici, dès que le réseau revient, on remet `ignore` à false pour que la prochaine coupure raffiche l'écran. Un état qui en pilote un autre : c'est ça, un effet.

**useEffect au montage : le démarrage de l'app.** Dans `app/_layout.tsx` :

```tsx
useEffect(() => {
  if (MODE_API) chargerSession(); // relire le coffre-fort UNE fois, à l'ouverture
}, []);
```

Tableau vide `[]` = « une seule fois, au montage ». C'est le moment idéal pour les initialisations : relire la session, verrouiller l'orientation portrait (autre effet du même fichier). Et juste en dessous, un effet avec dépendance ET nettoyage :

```tsx
useEffect(() => {
  if (!MODE_API || session.statut !== 'connectee') return;
  enregistrerPush();                          // déclarer l'appareil au serveur
  const abonnement = ecouterTapNotification(); // écouter les taps sur les notifs
  return () => abonnement.remove();            // NETTOYAGE au démontage
}, [session.statut]);
```

La fonction retournée par un effet est sa **fonction de nettoyage** : React l'appelle quand le composant disparaît ou avant de relancer l'effet. Ici, on désabonne l'écouteur de notifications — sinon, chaque relance en empilerait un de plus.

Le nettoyage le plus important du projet est dans `src/hooks/useAsyncData.ts` :

```ts
const load = useCallback(() => {
  let annule = false; // évite de mettre à jour un écran démonté
  fetcher().then((data) => { if (!annule) setState({ data, loading: false, error: null }); })
  return () => { annule = true; };
}, deps);

useEffect(() => load(), [load]);
```

Scénario mobile typique : l'écran Stats lance son chargement (300 ms de latence, même en mock — c'est voulu), et la joueuse change d'onglet avant la réponse. Sans le drapeau `annule`, la promesse reviendrait et appellerait `setState` sur un composant démonté : avertissement React, fuite mémoire potentielle. Le nettoyage passe `annule` à true, et la réponse tardive est simplement ignorée. Remarque enfin `useCallback(..., deps)` : il mémorise la fonction `load` et ne la recrée que si une dépendance change (ex. la saison sélectionnée) — c'est ce qui permet le re-fetch maîtrisé ET le bouton `reload` exposé aux écrans.

La leçon d'ensemble : en mobile, chaque effet doit se demander « et si l'utilisatrice part avant la fin ? ». Les réponses de Pirb — drapeau d'annulation, désabonnement, `return null` — sont des patterns que tu dois savoir montrer du doigt.

## À retenir

- `useState` déclenche un nouveau rendu à chaque `set...` ; retourner `null` fait disparaître proprement un composant (overlay hors-ligne, intro).
- Le tableau de dépendances décide quand l'effet tourne : `[]` = au montage uniquement, `[valeur]` = à chaque changement de cette valeur.
- La fonction retournée par un `useEffect` est le nettoyage : désabonner, annuler — React l'appelle au démontage ou avant relance.
- Le drapeau `annule` de `useAsyncData` empêche un `setState` sur un écran démonté : réflexe indispensable quand réseau et navigation se croisent.
- `useCallback` mémorise une fonction entre les rendus ; dans `useAsyncData`, il pilote le re-fetch (deps) et fournit `reload` aux écrans.

## Mise en pratique

Dans ton projet Pirb :

1. Ouvre `src/components/EcranHorsLigne.tsx`. Raconte à voix haute le cycle complet : coupure réseau → affichage → tap « Continuer sans réseau » → retour du réseau → nouvelle coupure. À chaque étape, dis ce que valent `horsLigne` et `ignore`.
2. Dans `app/_layout.tsx`, repère les trois `useEffect` du composant `RootLayout` et classe-les : lequel tourne une fois au montage ? lequel dépend de `session.statut` ? lequel a une fonction de nettoyage, et que nettoie-t-elle ?
3. Ouvre `src/hooks/useAsyncData.ts` et joue le scénario : « l'écran Stats se monte, la joueuse quitte au bout de 100 ms, la réponse arrive à 300 ms ». Prédis ligne par ligne ce qui s'exécute et pourquoi aucun `setState` n'a lieu à la fin.
4. Prédis avant de vérifier : dans `useAsyncData`, si on retirait `let annule = false` et les `if (!annule)`, quel avertissement React pourrait apparaître en console quand on navigue vite entre les onglets ? (Réponse : mise à jour d'état sur un composant démonté.)
5. Modification sans risque : dans le composant `Intro` de `app/_layout.tsx`, change `Animated.delay(1100)` (celui qui garde le logo à l'écran) en `Animated.delay(2000)`, lance l'app et observe l'intro rester affichée plus longtemps. Résultat attendu : le logo et la tagline persistent presque une seconde de plus — et un tap n'importe où passe toujours l'intro. Remets `1100`.
