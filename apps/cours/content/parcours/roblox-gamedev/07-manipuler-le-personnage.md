---
titre: "Manipuler le personnage : transparence, Welds, Massless et caméra"
parcours: "roblox-gamedev"
ordre: 7
niveau: "intermediaire"
duree: 35
date: 2026-08-11
---

## Le cours

La transformation en prop est **le cœur du Prop Hunt** — et un condensé de tout ce qu'on peut faire subir à un personnage Roblox. Le principe tient en une phrase de ta roadmap : on ne remplace pas le personnage, on le rend **invisible** et on lui **soude** un objet dessus. Le joueur bouge normalement ; tout le monde voit un banc se déplacer.

### Anatomie d'un Character

`player.Character` est un Model dans le Workspace : des `BasePart` (tête, torse, membres), un `Humanoid` (vie, vitesse), et surtout le **`HumanoidRootPart`** — la Part invisible qui est la racine physique du personnage. C'est elle qu'on prend comme point d'ancrage pour tout : position, soudures, distance. Deux gardes systématiques avant d'y toucher, car le Character peut ne pas exister (mort, respawn en cours) :

```lua
local perso = player.Character
if not perso then return end
local racine = perso:FindFirstChild("HumanoidRootPart")
if not racine then return end
```

C'est ton réflexe « vérifier que la ressource existe avant de la manipuler » — le `if ($user === null)` du web.

### Étape 1 : rendre invisible

```lua
for _, partie in ipairs(perso:GetDescendants()) do
	if partie:IsA("BasePart") and partie.Name ~= "HumanoidRootPart" then
		partie.Transparency = 1
		partie.CanCollide = false
	elseif partie:IsA("Decal") then
		partie.Transparency = 1   -- le visage
	end
end
```

`GetDescendants()` parcourt **toute** la hiérarchie, pas seulement les enfants directs — indispensable car accessoires et chapeaux imbriquent leurs Parts. Et le détail culte de la roadmap : le **`Decal`**, c'est le visage. Si tu l'oublies, un visage flottant se promène dans le gymnase. Effet involontairement terrifiant.

### Étape 2 : cloner et positionner le prop

```lua
local prop = modele:Clone()
prop.Name = "PropActuel"
prop:PivotTo(racine.CFrame)   -- le place exactement sur le joueur (leçon 2)
prop.Parent = perso
```

Trois choix qui comptent. `Clone()` : l'original reste intact dans `ReplicatedStorage/Props`, on travaille sur une copie — comme instancier depuis un template. Le nom **`PropActuel`** : c'est une convention de contrat ; en phase 5, le code de capture remontera du clic jusqu'au joueur en cherchant précisément ce nom. Le `Parent = perso` : le prop vit **dans** le Character, donc il disparaît automatiquement avec lui au respawn, et le nettoyage (`FindFirstChild("PropActuel")` → `Destroy()`) est trivial en début de transformation.

### Étape 3 : souder

```lua
for _, partie in ipairs(prop:GetDescendants()) do
	if partie:IsA("BasePart") then
		partie.Anchored = false
		partie.CanCollide = false
		partie.Massless = true   -- n'alourdit pas le personnage

		local weld = Instance.new("WeldConstraint")
		weld.Part0 = racine
		weld.Part1 = partie
		weld.Parent = partie
	end
end
```

Un `WeldConstraint` fige la position relative de `Part1` par rapport à `Part0` : chaque Part du prop devient solidaire de la racine du joueur. Les trois propriétés sont non négociables, et la roadmap explique pourquoi : **`Anchored = false`** (une Part ancrée ignore les soudures — c'est LA cause du prop qui « reste planté » ou tremble) ; **`CanCollide = false`** (sinon le banc se cogne dans les murs et bloque le joueur de façon absurde) ; **`Massless = true`** (sinon le poids du prop ralentit le personnage — la physique Roblox additionne les masses soudées).

Tout ceci s'exécute **côté serveur** : la transformation doit être vue par tous les joueurs, donc répliquée depuis le serveur. Fil rouge, toujours.

### La caméra : affaire strictement locale

Invisible, collé à la caméra première personne, le joueur ne voit plus rien. Solution de la roadmap, dans un **LocalScript** (`StarterPlayerScripts/Client`) :

```lua
local player = game.Players.LocalPlayer
player.CameraMinZoomDistance = 8
player.CameraMaxZoomDistance = 15
```

Pourquoi un LocalScript ? La caméra n'existe que sur la machine du joueur ; le serveur n'a rien à décider ici — c'est de l'affichage pur. C'est la répartition exacte du fil rouge : la transformation (règle du jeu) au serveur, le confort visuel au client.

## À retenir

- On ne remplace jamais le personnage : invisible (`Transparency = 1` via `GetDescendants`) + prop soudé sur le `HumanoidRootPart`.
- N'oublie pas le `Decal` : c'est le visage — sinon un visage flottant hante ton gymnase.
- Trio obligatoire sur chaque Part du prop : `Anchored = false`, `CanCollide = false`, `Massless = true`. Un prop qui tremble = un `Anchored` oublié ou un Weld manquant.
- `PropActuel` dans le Character est un contrat de nommage : la capture (phase 5) en dépend, et le prop meurt avec le personnage.
- Transformation côté serveur (répliquée à tous) ; caméra côté LocalScript (purement locale). Le serveur décide, le client affiche.

## Mise en pratique

**Ouvre `PropHunt.rbxl`, fais la phase 4 de ta roadmap** ([/projets/prop-hunt](/projets/prop-hunt), PHASE 4 — La transformation en objet) :

1. **4.1** : duplique 5 à 8 meubles du gymnase (Ctrl+D) vers `ReplicatedStorage/Props`. Pour chacun : c'est un `Model`, `PrimaryPart` définie, toutes les Parts en `Anchored = false` et `CanCollide = false`, taille raisonnable.
2. **4.3** : dans `ServerScriptService/Serveur`, crée `GestionProps` avec la fonction `transformerEnProp(player, nomDuProp)` complète de la roadmap (invisibilité, nettoyage de l'ancien `PropActuel`, clone + `PivotTo`, soudures). Expose-la (`_G.transformerEnProp` ou ton module).
3. **4.5** : branche le prop aléatoire dans `BoucleDeJeu`, au TODO « phase 4 » de l'état PLANQUE : pour chaque joueur de l'équipe Cachés, `transformerEnProp(player, props[math.random(1, #props)].Name)`.
4. **4.6** : le LocalScript caméra dans `StarterPlayerScripts/Client` (`CameraMinZoomDistance = 8`, `CameraMaxZoomDistance = 15`).

**Résultat attendu** : au début de la planque, chaque caché devient visuellement un objet du gymnase et peut se déplacer normalement, caméra reculée.

**Test de validation (roadmap)** : test en 2 joueurs — un joueur devient visuellement un banc ; le second voit le banc se déplacer, pas le personnage. Piège si le prop tremble ou dérive : un `Anchored` resté à `true` ou un Weld manquant sur une des Parts, y compris les imbriquées — vérifie-les toutes.
