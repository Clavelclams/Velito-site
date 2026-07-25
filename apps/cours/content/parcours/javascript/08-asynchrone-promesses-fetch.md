---
titre: "L'asynchrone : promesses, async/await et fetch"
parcours: "javascript"
ordre: 8
niveau: "intermediaire"
duree: 30
date: 2026-07-25
---

## Le cours

Jusqu'ici, ton code s'exécutait ligne après ligne, instantanément. Mais certaines opérations prennent du TEMPS : appeler un serveur, lire un fichier, attendre 2 secondes. Si JavaScript attendait bêtement, la page serait gelée pendant ce temps — plus de clics, plus de défilement. La solution : l'**asynchrone**.

L'analogie : tu commandes au food-truck. Le vendeur ne te fait pas attendre planté devant lui — il te donne un **ticket** et t'appelle quand c'est prêt. Pendant ce temps, tu fais autre chose. En JavaScript, ce ticket s'appelle une **promesse** (Promise).

Une promesse est un objet qui représente un résultat FUTUR. Elle a trois états : *pending* (en attente), *fulfilled* (tenue : le résultat est là), *rejected* (échouée : une erreur est survenue).

L'écriture moderne pour travailler avec, c'est **`async`/`await`** :

```js
// "async" marque la fonction : elle contient de l'attente
async function chargerProfil() {
  // "await" = attends que la promesse soit tenue, puis donne-moi le résultat
  const res = await fetch("/api/profil");
  const data = await res.json();
  return data;
}
```

`await` se lit « attends le ticket ». Point crucial : pendant ce temps, **le reste de la page continue de tourner** — seul le corps de cette fonction est en pause. Et règle de grammaire : `await` ne s'utilise que dans une fonction marquée `async`. Autre conséquence : une fonction `async` renvoie TOUJOURS une promesse — son appelant devra lui aussi faire `await`.

**`fetch`** est la fonction du navigateur pour appeler un serveur HTTP. Note le DOUBLE await du code ci-dessus : le premier attend la réponse (les en-têtes), le second attend et décode le corps JSON (leçon 6 : du texte → un objet). Deux étapes, deux attentes.

Et les erreurs ? Le serveur peut être injoignable. On entoure d'un **`try/catch`** :

```js
async function charger() {
  try {
    const res = await fetch("/api/profil");
    if (!res.ok) throw new Error(`HTTP ${res.status}`); // 404, 500...
    return await res.json();
  } catch (erreur) {
    // On atterrit ici si le réseau a lâché OU si on a "throw" au-dessus
    console.log("Échec :", erreur.message);
    return null;
  }
}
```

Attention au piège : `fetch` ne rejette PAS sa promesse pour un 404 ou un 500 — pour lui, le serveur a répondu, mission accomplie. C'est à TOI de vérifier `res.ok`. D'où le `if (!res.ok)` : réflexe obligatoire.

Maintenant, ouvre ton vrai code : `src/services/data/ApiPirbDataService.ts` dans Pirb store. La méthode `get` (vers la ligne 116) :

```ts
private async get<T>(path: string): Promise<T> {
  const res = await fetch(`${this.baseUrl}${path}`, { ... });
  // ...
  const body = await res.json().catch(() => ({}));
}
```

Tout y est : `async`, le double `await`, la gestion d'erreur. Et même mieux — regarde la ligne ~149 :

```ts
await new Promise((r) => setTimeout(r, 300 * essai));
```

C'est une **pause fabriquée à la main** : une promesse qui se tient toute seule après `300 * essai` millisecondes (`setTimeout` exécute une fonction après un délai). Ton app s'en sert pour attendre avant de RÉESSAYER un appel qui a échoué — un « retry avec délai croissant » : 300 ms, puis 600 ms. C'est de l'architecture réseau sérieuse, et maintenant tu peux l'expliquer ligne par ligne.

Tu croiseras aussi l'ancienne écriture `.then((res) => ...)` dans des tutos : même mécanique, `async/await` est juste plus lisible.

## À retenir

- Une promesse est un ticket : le résultat n'est pas encore là, mais il arrivera (ou échouera).
- `await` met en pause LA fonction (pas la page) jusqu'au résultat ; il exige une fonction marquée `async`.
- Une fonction `async` renvoie toujours une promesse.
- `fetch` demande deux await : un pour la réponse, un pour `res.json()` — et il faut vérifier `res.ok` soi-même (un 404 ne déclenche pas d'erreur).
- `try/catch` autour des `await` : le filet de sécurité quand le réseau lâche.

## Mise en pratique

1. Dans la console (F12), fabrique une pause : tape
   ```js
   const attendre = (ms) => new Promise((r) => setTimeout(r, ms));
   ```
   puis :
   ```js
   async function test() {
     console.log("avant");
     await attendre(2000);
     console.log("après, 2 s plus tard");
   }
   test();
   ```
   **Résultat attendu :** « avant » immédiatement, « après » 2 secondes plus tard. Pendant l'attente, la page répond toujours (scrolle pour vérifier).
2. Tape `test()` seul et regarde ce que la console affiche AVANT les logs. **Résultat attendu :** `Promise {<pending>}` — la preuve qu'une fonction async renvoie un ticket, pas une valeur.
3. Sur TON site de cours ouvert dans le navigateur, tape :
   ```js
   const res = await fetch("/");
   console.log(res.status, res.ok);
   ```
   **Résultat attendu :** `200 true`. Puis `await fetch("/page-inexistante")` : **résultat attendu :** un objet Response avec `status: 404` — et AUCUNE erreur levée. Redis la règle : c'est `res.ok` qu'on vérifie.
4. Dans VS Code, ouvre `src/services/data/ApiPirbDataService.ts` (projet Pirb store), méthode `get` vers la ligne 116. Repère : le `async`, chaque `await`, le `fetch`, et la ligne `await new Promise((r) => setTimeout(r, 300 * essai))`. Explique à voix haute : pourquoi 300 × essai et pas 300 fixe ? (Réponse attendue : chaque nouvelle tentative attend plus longtemps — on laisse au serveur le temps de respirer.)
