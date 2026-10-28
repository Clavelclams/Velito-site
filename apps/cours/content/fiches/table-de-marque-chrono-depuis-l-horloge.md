---
titre: "Un chrono qui survit à la mise en veille : stocker un instant, pas un compteur"
projet: "table-de-marque"
bloc: 1
themes: ["algorithmes", "resilience"]
source: "maquette/emarque-unss/js/moteurs/chrono.js"
date: 2026-10-10
---

## Le concept

Le chrono naïf, c'est un compteur : `setInterval(() => restant -= 1000, 1000)`. Il a trois défauts sur une tablette au bord d'un terrain. Un `setInterval` n'est pas précis et dérive. Quand l'écran se met en veille ou que l'onglet passe en arrière-plan, le navigateur ralentit ou suspend les minuteurs : le compteur s'arrête alors que le match continue. Et si la page est rechargée, le compteur repart de zéro.

Dans la table de marque, le chrono ne compte rien. Le match stocke trois valeurs, `chrono: { periode, ecouleMs, demarreA }` (créées dans `js/match.js`, `creerMatch`) : le temps déjà joué avant la dernière pause, et l'instant où le chrono a été relancé (`null` s'il est arrêté). Le temps affiché est **recalculé** à partir de l'horloge réelle :

```js
/** Le chrono tourne-t-il ? (test explicite : une heure peut valoir 0 dans les tests) */
export function chronoEnMarche(match) {
  return match.chrono.demarreA != null;
}

/** Temps de jeu écoulé dans la période en cours, à l'instant `maintenant`. */
export function tempsJeuMs(match, maintenant) {
  const { ecouleMs, demarreA } = match.chrono;
  const brut = ecouleMs + (chronoEnMarche(match) ? maintenant - demarreA : 0);
  return Math.min(brut, dureePeriodeMs(match, match.chrono.periode));
}

/** Temps restant dans la période (ce qu'affiche le tableau). */
export function tempsRestantMs(match, maintenant) {
  return Math.max(0, dureePeriodeMs(match, match.chrono.periode) - tempsJeuMs(match, maintenant));
}
```

(`maquette/emarque-unss/js/moteurs/chrono.js`)

Mettre en pause, c'est figer : `ecouleMs = tempsJeuMs(m, t)` et `demarreA = null` (`MATCH_PAUSE` dans `js/match.js`). Relancer, c'est noter `demarreA = t`. Entre les deux, `js/horloge.js` se contente de réafficher `tempsRestantMs(match, Date.now())` quatre fois par seconde, et passe en pause à 00:00. Si un tic est sauté pendant la veille, le suivant affiche quand même le bon temps, parce qu'il le recalcule.

**Le piège du 0.** Avant la correction, `demarreA` était testé comme un booléen, du genre `if (match.chrono.demarreA)` (l'ancienne ligne exacte n'est plus visible : pas de git sur ce dossier). Dans les tests, les instants partent de 0 : un chrono démarré à `t = 0` avait `demarreA === 0`, qui est **falsy** en JavaScript. Le chrono se croyait arrêté et ne comptait rien. La correction est le `!= null` ci-dessus : il ne laisse passer que `null` et `undefined`, pas 0. En vrai usage `Date.now()` ne vaut jamais 0, donc le bug n'aurait pas été visible en démo : ce sont les tests qui l'ont trouvé.

`Math.min` et `Math.max` bornent le résultat : jamais plus que la durée de la période, jamais de temps négatif.

## Comment je l'explique au jury

« Je ne compte pas les secondes, je stocke un instant de départ et le temps déjà écoulé, et je recalcule le temps restant à partir de l'horloge à chaque affichage. Du coup, si la tablette se met en veille ou si la page est rechargée, le chrono est juste en revenant, parce que l'état est dans le localStorage et que le calcul repart de l'heure réelle. Le minuteur ne sert qu'à rafraîchir l'affichage, il ne porte aucune donnée. J'ai eu un bug instructif : je testais `demarreA` comme un booléen, et un chrono démarré à l'instant 0 se croyait arrêté. Depuis je teste `!= null` explicitement, et c'est commenté dans le code. »

## La question vicieuse du jury

**« Et si quelqu'un change l'heure de la tablette pendant le match ? »**

Le chrono saute, c'est une vraie limite. `Date.now()` suit l'horloge système : si elle recule d'une minute pendant que le chrono tourne, le temps de jeu recule d'une minute. Les bornes `Math.min` et `Math.max` empêchent seulement les valeurs absurdes (négatives ou au-delà de la période). La parade propre est `performance.now()`, une horloge monotone qui ne recule jamais ; mais elle repart de zéro à chaque chargement de page, donc elle ne survit pas à un rechargement, ce qui était justement le besoin. Un compromis serait de garder `Date.now()` pour la reprise après rechargement et de surveiller l'écart avec `performance.now()` pendant la session pour détecter un saut. Je ne l'ai pas fait : sur une tablette de prof en gymnase, le changement d'heure en plein match est rare, et l'arbitre garde la main sur la pause.
