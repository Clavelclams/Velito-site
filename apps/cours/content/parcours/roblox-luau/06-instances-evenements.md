---
titre: "Instances : propriétés, méthodes, événements"
parcours: "roblox-luau"
ordre: 6
niveau: "intermediaire"
duree: 25
date: 2026-07-27
---

## Le cours

Tout objet dans l'Explorer est une **Instance**. Et chaque Instance a trois choses : des propriétés (ce qu'elle **est**), des méthodes (ce qu'elle **fait**), des événements (ce à quoi elle **réagit**). Si tu penses « élément du DOM » — avec ses attributs, ses méthodes comme `remove()`, et ses `addEventListener` — tu as le bon modèle mental.

**1. Les propriétés (les données).** Celles que tu vois dans le panneau Properties, lisibles et modifiables en code :

```lua
local part = workspace.Part

part.BrickColor = BrickColor.new("Really red")
part.Transparency = 0.5              -- 0 = opaque, 1 = invisible
part.Anchored = true                 -- figé, ignore la gravité
part.CanCollide = false              -- on passe à travers
part.Size = Vector3.new(10, 1, 10)   -- largeur, hauteur, profondeur
part.Position = Vector3.new(0, 5, 0)
part.Material = Enum.Material.Neon
```

**`Vector3`** = un point ou une taille en 3D (X, Y, Z). **Y est la hauteur** dans Roblox. **`Enum`** = une liste de valeurs prédéfinies (`Enum.Material.Neon`, `Enum.KeyCode.E`) — comme un enum PHP 8 ou TypeScript : impossible d'y mettre une valeur inventée, et Studio t'autocomplète les choix. **`Anchored`** est crucial : si `false`, la Part tombe sous l'effet de la gravité dès le lancement. Toute plateforme fixe doit avoir `Anchored = true` — le fameux « ma map a disparu » vient de là.

**2. Les méthodes (les actions).** On les appelle avec **deux-points** `:` et non un point :

```lua
part:Destroy()                       -- supprime définitivement
part:Clone()                         -- duplique
part:FindFirstChild("Script")        -- cherche un enfant, renvoie nil sinon
part:WaitForChild("Script")          -- cherche et ATTEND qu'il existe
humanoid:TakeDamage(25)              -- inflige des dégâts
```

**La règle `.` vs `:`**, source d'erreur n°1 : `.` pour une **propriété** ou un **enfant** (`part.Size`, `workspace.Baseplate`), `:` pour une **méthode** (`part:Destroy()`). Pourquoi cette bizarrerie ? Le `:` passe automatiquement l'objet lui-même en premier argument — l'équivalent du `this` implicite en JS ou du `$this` en PHP. C'est du sucre syntaxique, mais si tu écris `part.Destroy()`, tu auras une erreur.

**`FindFirstChild` vs `WaitForChild`** : le premier renvoie `nil` si l'objet n'existe pas — pour **tester** l'existence (`if part:FindFirstChild("X") then`). Le second **bloque le script** jusqu'à ce que l'objet apparaisse — pour les objets qui vont forcément arriver, notamment côté client où le chargement est progressif. Pense au `await` d'un fetch : tu attends que la donnée arrive avant de l'utiliser.

**3. Les événements (les réactions).** C'est ton `addEventListener` :

```lua
part.Touched:Connect(function(autrePartie)
	print("Touché par " .. autrePartie.Name)
end)
```

Décomposition : `part.Touched` est l'événement (il existe déjà, Roblox le déclenche) ; `:Connect(...)` signifie « branche cette fonction dessus » ; `function(autrePartie)` est le callback, avec les infos que l'événement fournit — ici, la Part qui a touché. Compare : `element.addEventListener("click", (event) => {...})`. Même modèle : tu ne demandes pas « est-ce touché ? » en boucle, tu déclares une réaction et le moteur t'appelle.

Les événements que tu utiliseras le plus : `part.Touched` (une partie touche celle-ci), `Players.PlayerAdded` (un joueur rejoint), `Players.PlayerRemoving` (un joueur part), `humanoid.Died` (le personnage meurt), `button.MouseButton1Click` (clic sur un bouton d'interface), `RunService.Heartbeat` (à chaque frame, ~60x/s).

Attention pour tout de suite : `.Touched` se déclenche pour **n'importe quel contact** — un pied, une main, un caillou qui roule — et **des dizaines de fois par seconde**. On encaissera ce problème dans l'exercice (la lave tue net, donc pas grave), et on le résoudra proprement en leçon 9 avec le debounce.

## À retenir

- Une Instance = **propriétés** (ce qu'elle est) + **méthodes** (ce qu'elle fait) + **événements** (ce à quoi elle réagit) — comme un élément du DOM.
- `.` pour propriétés et enfants, `:` pour les méthodes (le `:` passe l'objet en `this` implicite). `part.Destroy()` plante, `part:Destroy()` marche.
- `FindFirstChild` = tester (renvoie `nil` si absent) ; `WaitForChild` = attendre que ça arrive (comme un `await`).
- `evenement:Connect(fonction)` = ton `addEventListener`. Roblox appelle ta fonction avec les infos du contexte.
- `Anchored = true` sur toute plateforme fixe, sinon elle tombe. `Vector3` = (X, Y, Z), et Y est la hauteur.

## Mise en pratique

Objectif : ajouter la première vraie difficulté de ton obby — une plateforme de lave qui tue au contact.

1. Dans `Workspace → Obby`, insère une nouvelle **Part**. Renomme-la `Lave`. Place-la entre deux plateformes de ton parcours, comme un passage risqué à traverser. `Anchored = true`.
2. Dans **Properties** : `BrickColor` = un rouge vif, `Material` = `Neon` (elle doit briller — c'est de la lave, autant que ça se voie).
3. Clique sur le `+` de `Lave` dans l'Explorer → insère un **Script** (pas un LocalScript — la mort d'un joueur, c'est une décision de serveur ; tu comprendras pleinement pourquoi à la leçon 7). Renomme-le `ScriptLave`.
4. Tape :

```lua
local lave = script.Parent

lave.Touched:Connect(function(autrePartie)
	local perso = autrePartie.Parent
	local humanoid = perso:FindFirstChild("Humanoid")
	if humanoid then
		humanoid.Health = 0
		print(perso.Name .. " est tombé dans la lave !")
	end
end)
```

5. Lance **Play**, marche sur la lave : ton personnage meurt et respawn, et l'Output affiche le message. Note le `if humanoid then` : sans lui, le script planterait dès qu'un objet sans Humanoid touche la lave.
6. Étends le défi : duplique `Lave` (avec son script — `Ctrl+D` copie tout) et place une deuxième zone de lave ailleurs dans le parcours. Le script marche tel quel grâce à `script.Parent`.
7. **Stop**, `Ctrl+S`.

**Résultat attendu** : deux zones de lave néon qui tuent au contact, chacune portant son propre script autonome. Ton obby a maintenant un vrai risque — et toi, ton premier événement branché.
