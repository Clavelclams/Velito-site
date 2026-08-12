---
titre: "Instance.new et la création par code : tout ce que l'Explorer fait, le code le fait"
parcours: "roblox-gamedev"
ordre: 3
niveau: "intermediaire"
duree: 25
date: 2026-08-11
---

## Le cours

Jusqu'ici, tu as surtout créé tes objets à la souris dans l'Explorer. Règle fondamentale : **tout ce que tu fais dans l'Explorer, le code peut le faire** — et souvent mieux, car le code est répétable, paramétrable et versionnable. C'est la même bascule que passer d'un HTML écrit à la main à un `document.createElement` en JS, ou d'une insertion phpMyAdmin à une migration Symfony.

### L'anatomie d'un Instance.new

```lua
local part = Instance.new("Part")   -- 1. créer (l'objet existe en mémoire, invisible)
part.Name = "PlotEntrainement"      -- 2. configurer toutes les propriétés
part.Size = Vector3.new(2, 3, 2)
part.Shape = Enum.PartType.Cylinder
part.Anchored = true
part.BrickColor = BrickColor.new("Bright orange")
part.Parent = workspace.Gymnase     -- 3. Parent EN DERNIER
```

Le détail qui compte : **`Parent` en dernier**. Tant que `Parent` est `nil`, l'objet n'existe que pour ton script. Dès que tu l'affectes, Roblox l'insère dans le monde et **le réplique aux clients**. Si tu parentes d'abord puis configures ensuite, chaque changement de propriété est répliqué un par un — c'est du travail réseau inutile, comme insérer une ligne en base puis faire dix `UPDATE` au lieu d'un seul `INSERT` complet.

Tu as déjà vu ce pattern dans ta roadmap sans forcément le remarquer : la phase 3 crée le RemoteEvent `MiseAJourEtat` par code, la phase 7 crée le dossier `leaderstats` et son `IntValue`, la phase 4 crée des `WeldConstraint` à la volée. Rien de tout ça n'est posé à la main dans l'Explorer.

### Créer en série : la boucle remplace la souris

Poser 10 plots à la main, c'est long et irrégulier. En code :

```lua
local function creerPlot(position)
	local plot = Instance.new("Part")
	plot.Name = "Plot"
	plot.Shape = Enum.PartType.Cylinder
	plot.Size = Vector3.new(2, 3, 2)
	plot.Orientation = Vector3.new(0, 0, 90)  -- cylindre debout
	plot.Anchored = true
	plot.BrickColor = BrickColor.new("Bright orange")
	plot.Position = position
	plot.Parent = workspace.Gymnase
	return plot
end

-- Une rangée de 6 plots espacés de 8 studs
for i = 1, 6 do
	creerPlot(Vector3.new(-20 + i * 8, 2, 15))
end
```

Tu veux les resserrer ? Tu changes un nombre et tu relances. La map à la souris, la répétition au code : c'est le bon partage des rôles.

### Les zones logiques : des Parts pour le code, pas pour les yeux

Concept central des deux jeux : une **zone logique** est une Part invisible qui sert de repère au code. Dans Rush Magasin, `ZoneSpawnArticles`, `ZoneCaisse` et `ZoneSas` sont exactement ça :

```lua
local zone = Instance.new("Part")
zone.Name = "ZoneAttenteChercheurs"
zone.Size = Vector3.new(20, 10, 20)
zone.Transparency = 1        -- invisible pour les joueurs
zone.CanCollide = false      -- traversable
zone.Anchored = true         -- fixe
zone.Parent = workspace.Zones
```

Le trio `Transparency = 1` + `CanCollide = false` + `Anchored = true` est la signature d'une zone logique. Le code pourra ensuite lire `zone.Position` et `zone.Size` (pour y faire apparaître des objets) ou brancher son `.Touched` (pour détecter une entrée). Analogie web : c'est une `<div>` invisible qui sert d'ancre à ton JS — présente dans le DOM, absente à l'écran.

### SpawnLocation : une Instance comme les autres

Une `SpawnLocation` est une Part spéciale où les joueurs apparaissent. Ses propriétés utiles : `Neutral` (si coché, tout le monde peut y apparaître) et `TeamColor` (si `Neutral` est décoché, seule l'équipe de cette couleur y apparaît — on s'en servira quand les équipes existeront, phase 2). Poser deux SpawnLocations dans le gymnase garantit que les joueurs apparaissent dedans et pas sur la Baseplate.

Dernier réflexe : ce qui est créé par un script serveur au lancement (`RemoteEvent`, zones...) n'a pas besoin d'exister dans le fichier — mais les autres scripts doivent alors l'attendre avec `WaitForChild`, jamais le supposer déjà là.

## À retenir

- Tout ce que l'Explorer fait, `Instance.new` le fait — et c'est répétable et paramétrable.
- Ordre canonique : créer → configurer **toutes** les propriétés → `Parent` en dernier (évite des réplications inutiles).
- Une zone logique = `Transparency = 1` + `CanCollide = false` + `Anchored = true` : un repère pour le code, comme une div invisible pour ton JS.
- La map se construit à la souris, les répétitions (rangées de plots, séries d'objets) se génèrent en boucle par code.
- Ce qu'un script crée au lancement, les autres scripts l'attendent avec `WaitForChild`.

## Mise en pratique

**Ouvre `PropHunt.rbxl`, termine la phase 1 de ta roadmap (étape 1.5) et prépare le terrain des phases suivantes** :

1. **1.5 Points d'apparition** : insère 2 `SpawnLocation` dans le gymnase (une pour chaque future équipe). Laisse `Neutral` coché pour l'instant — tu le décocheras en phase 2, quand les équipes existeront.
2. **Zones logiques** : crée un Folder `Zones` dans le Workspace. Écris un `Script` temporaire dans `ServerScriptService` qui crée par code une Part `ZoneAttenteChercheurs` (invisible, traversable, ancrée, ~`20 x 10 x 20`) près d'un des spawns — c'est là que les chercheurs patienteront pendant la planque (phase 5). Vérifie dans l'Explorer en mode Play qu'elle existe, puis reproduis-la en dur si tu préfères la garder dans le fichier.
3. **Génération en série** : écris la fonction `creerPlot` du cours et génère une rangée de 6 plots le long d'un mur. Ajuste espacement et position en changeant les nombres, pas à la souris.

**Résultat attendu** : les joueurs apparaissent dans le gymnase, un Folder `Zones` contient ta zone invisible, et une rangée de plots régulière garnit le gymnase.

**Test de validation** : en Play, tu apparais sur une SpawnLocation (jamais sur la Baseplate), les plots sont alignés, et la zone est bien invisible et traversable — mais visible dans l'Explorer avec les bonnes propriétés.
