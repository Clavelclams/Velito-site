---
titre: "Luau : les bases du langage"
parcours: "roblox-luau"
ordre: 4
niveau: "debutant"
duree: 25
date: 2026-07-27
---

## Le cours

Luau est la version de Lua utilisée par Roblox. C'est un langage **très simple** — la syntaxe tient sur une page. Venant de JS et PHP, tu vas le lire sans effort. Le danger n'est pas la difficulté : ce sont les **petites différences** qui te feront perdre deux heures si tu ne les notes pas maintenant.

| Sujet | JavaScript / PHP | Luau |
|---|---|---|
| Point-virgule | `let x = 5;` | `local x = 5` (aucun) |
| Valeur vide | `null` / `undefined` | `nil` |
| Différent de | `!=` | `~=` |
| Non | `!condition` | `not condition` |
| Et / Ou | `&&` / `\|\|` | `and` / `or` |
| Fin de bloc | `{ }` | `end` |
| Commentaire | `//` | `--` |
| Concaténation | `+` ou `.` | `..` (deux points) |
| Index de tableau | commence à **0** | commence à **1** |

Ce dernier point est le piège n°1 : en Luau, **le premier élément est à l'index 1**. Après des années de `tableau[0]`, ton cerveau va résister. Accepte-le tout de suite.

**Variables.** `local nom = "Clavel"`, `local age = 26`, `local estConnecte = true`, `local rien = nil`. Pas de `let`/`const`/`$` : juste `local`. Un seul type numérique (`number`, pas d'int/float séparés). Concaténation avec `..` : `print("Salut " .. nom)`. **Toujours mettre `local`** : sans lui, la variable devient globale et accessible partout — source de bugs impossibles à traquer. C'est l'équivalent d'oublier `let` en JS : ça « marche », jusqu'au jour où deux scripts s'écrasent mutuellement une variable.

**Conditions.** Structure `if ... then ... end`, avec `elseif` (en un mot) :

```lua
if vie <= 0 then
	print("Mort")
elseif vie < 50 then
	print("Attention, vie basse")
else
	print("Ça va")
end
```

⚠️ Piège majeur : en Luau, **seuls `false` et `nil` sont faux**. `0` est vrai. `""` est vrai. En PHP, `if (0)` ne passe pas ; en Luau, `if 0 then` passe. Conséquence pratique : `if variable then` teste « la variable existe-t-elle ? », pas « vaut-elle zéro ? ». C'est même un idiome courant pour vérifier qu'un objet existe avant de l'utiliser.

**Boucles.** `for i = 1, 10 do ... end` répète 10 fois (i de 1 à 10, bornes incluses). À rebours : `for i = 10, 1, -1 do`. Le `while` existe aussi : `while compteur < 5 do ... end`. Pas de `compteur++` ni de `+=` classique : tu écris `compteur = compteur + 1` (Luau accepte aussi `compteur += 1`, mais pas `++`).

**Fonctions.** `local function additionner(a, b) return a + b end`. Une fonction sans `return` renvoie `nil` — comme `undefined` en JS. Même logique de fonctions que tu passes en argument, tu verras ça avec les événements en leçon 6.

**Attendre.** `task.wait(2)` fait une pause de 2 secondes ; `task.wait()` sans argument attend une frame (~1/60e de seconde). Contrairement à JS où tu ne peux pas « bloquer » sans geler la page (d'où les promesses et `async/await`), en Luau chaque script tourne dans sa propre coroutine : `task.wait()` suspend **ce script**, le reste du jeu continue. Utilise **toujours `task.wait()`**, jamais l'ancien `wait()` : le vieux `wait()` est imprécis et déprécié. Tu le verras dans plein de vieux tutos YouTube — c'est d'ailleurs un bon détecteur de tuto périmé.

**Afficher / débugger.** `print("...")` en blanc, `warn("...")` en orange, `error("...")` en rouge (et stoppe le script). `print` est ton meilleur outil de debug, ton `console.log`. Utilise-le sans retenue.

## À retenir

- Les pièges de syntaxe : `~=` (différent), `and/or/not`, `end` pour fermer les blocs, `..` pour concaténer, `nil` pour « rien ».
- **Les index commencent à 1**, pas à 0. Piège n°1 pour qui vient du web.
- **Seuls `false` et `nil` sont faux** : `0` et `""` sont vrais, contrairement à JS et PHP.
- Toujours `local` devant tes variables — sinon elles deviennent globales et polluent tout.
- `task.wait(n)` pour attendre (jamais l'ancien `wait()`) ; `print` sans modération pour débugger.

## Mise en pratique

Objectif : animer les plateformes de ton obby avec ta première vraie logique Luau.

1. Ouvre `MonObby`. Dans `ServerScriptService`, ouvre ton script `Demarrage` (ou crée un Script `AnimationPlateformes`).
2. Écris ce script, ligne par ligne, sans copier-coller mentalement — tape-le :

```lua
local plateforme = workspace.Obby.Plateforme3

for i = 1, 5 do
	print("Clignotement numéro " .. i)
	plateforme.Transparency = 0.8
	task.wait(0.5)
	plateforme.Transparency = 0
	task.wait(0.5)
end

print("Fin de l'animation")
```

3. Lance **Play**. La troisième plateforme doit clignoter 5 fois (elle devient presque invisible puis réapparaît), et l'Output doit afficher les tours 1 à 5 puis « Fin de l'animation ».
4. Expérimente : remplace `for i = 1, 5 do` par `for i = 5, 1, -1 do` et affiche `i` — vérifie le compte à rebours dans l'Output.
5. Ajoute au-dessus de la boucle : `if plateforme then print("Plateforme trouvée") end`. Puis change volontairement le chemin en `workspace.Obby.Plateforme9` et relance : observe l'erreur rouge dans l'Output. Lis-la — tu apprendras à la décoder en leçon 11. Remets le bon chemin.
6. **Stop**, `Ctrl+S`.

**Résultat attendu** : la plateforme 3 clignote 5 fois au lancement, l'Output trace chaque tour de boucle, et tu as vu à quoi ressemble une erreur de chemin. Tu sais maintenant écrire variables, boucles, conditions et pauses en Luau.
