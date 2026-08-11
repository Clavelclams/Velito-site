---
titre: "Rush Magasin"
avancement: 0
statut: "a venir"
maj: 2026-08-11
---

> **Jeu Roblox n°2 — projet loisir.** Prérequis : avoir terminé et publié le
> Prop Hunt (cette roadmap réutilise 40 % de son code).

**Jeu n°2. Loisir. Aucune deadline.**
Prérequis : avoir terminé et publié le Prop Hunt. Cette roadmap réutilise directement quatre systèmes appris là-bas.

---


## ⚠️ Avertissement marque — à lire avant tout

**N'utilise aucune marque réelle.** Ni Lidl, ni PlayStation, ni aucun logo, nom de magasin ou charte graphique existante.

Roblox modère activement les contenus qui reprennent des marques déposées. Un signalement suffit à faire retirer ton jeu, et tu perds tout le travail.

**Parodie systématiquement :**

| Réel | Parodie |
|---|---|
| Lidl / Aldi | **LIDLE**, **MAXI DISCOUNT**, **PROMO+** |
| PS6 | **PlaySphere 6**, **StationPlay 6** |
| Nom du jeu | **RUSH!**, **PROMO RUSH**, **DERNIER EN CAISSE** |

Invente ton logo, tes couleurs, ta typo. C'est plus fun, ça t'appartient, et personne ne te le supprime.

---

## Le pitch

> Les portes du magasin s'ouvrent. Il y a moins d'articles que de joueurs.
> Attrape-en un. Garde-le. Passe en caisse avant la fin du temps.
> Sinon tu es éliminé.

Une phrase, tout le monde comprend. C'est la plus grosse force de ce jeu.

### La boucle

```
        Portes fermées, compte à rebours
                     │
                     ▼
        OUVERTURE — les portes s'ouvrent
                     │
                     ▼
        RUSH — N articles pour N+X joueurs
        (attraper, arracher, défendre)
                     │
                     ▼
        CAISSE — passer avec l'article
        (nombre de places limité)
                     │
                     ▼
        ÉLIMINATION — ceux qui n'ont pas
        payé sortent
                     │
                     ▼
        Manche suivante, un article de moins
                     │
                     ▼
        Jusqu'au dernier survivant
```

### Les trois raisons pour lesquelles ce jeu peut marcher

1. **Deux phases de tension, pas une.** Avoir l'article ne suffit pas. Il faut le garder jusqu'à la caisse. Ça crée un deuxième moment de panique que la plupart des party games n'ont pas.
2. **L'article du jour est une donnée, pas du code.** Tu peux changer le contenu chaque semaine sans toucher au moteur du jeu. Durée de vie énorme pour un effort quasi nul.
3. **Ça se filme.** Le rush, l'arrachage, la course vers la caisse : c'est du contenu TikTok naturel. Et la découverte sur Roblox passe massivement par là.

---

## Ce que tu réutilises du Prop Hunt

C'est la raison pour laquelle le Prop Hunt vient en premier. Tu n'attaques pas ce jeu de zéro.

| Système | Prop Hunt | Rush Magasin |
|---|---|---|
| **Machine à états** | Attente → Planque → Chasse → Résultats | Attente → Ouverture → Rush → Caisse → Élimination |
| **Weld d'objet sur joueur** | Devenir un banc | Porter un carton |
| **RemoteEvent + 6 validations** | Capturer un caché | Arracher un article |
| **HUD avec timer diffusé** | Timer de manche | Timer + articles restants |
| **Leaderstats** | Points | Victoires |

Concrètement : tu ouvres ton fichier Prop Hunt, tu copies `BoucleDeJeu.lua` et `Config.lua`, et tu adaptes les états. Tu démarres avec 40 % du travail déjà fait.

---

## Le contrat de périmètre

### ✅ La v1 contient

| Élément | Périmètre |
|---|---|
| Map | Un magasin, ~6 rayons, une zone caisses, un sas d'entrée |
| Article | UN type d'article par manche, modèle simple |
| Ramassage | Toucher l'article → il se colle sur le joueur |
| Arrachage | Contact + cooldown → l'article change de main |
| Caisse | Zone à traverser avec l'article, places limitées |
| Manches | Élimination progressive jusqu'au dernier |
| Joueurs | 8 à 16, humains uniquement |

### ❌ La v1 NE contient PAS

- **Le combat physique type Gang Beasts** (voir phase 3, c'est le point critique)
- **Les bots CPU** — reporté, voir phase 10
- Des skins, une boutique, des Robux
- Plusieurs magasins
- Un système de classement mondial
- Des pièges, des obstacles mobiles, des vigiles
- Des sons custom

### La définition de "fini"

> 6 personnes lancent une partie, jouent jusqu'au dernier survivant, comprennent les règles sans explication, et il y a au moins un moment où quelqu'un crie.

---

## PHASE 0 — Préparation

*~1 session*

### 🎯 Objectif
Nouveau projet, arborescence prête, code du Prop Hunt importé.

### 🔨 Étapes

**0.1 — Nouveau fichier**
Studio → Baseplate → `File` → `Save to File As` → `RushMagasin.rbxl`

**0.2 — L'arborescence**

```
ServerScriptService
└── 📁 Serveur

ReplicatedStorage
├── 📁 Remotes
├── 📁 Modules
└── 📁 Articles          ← les modèles d'articles

StarterPlayer/StarterPlayerScripts
└── 📁 Client
```

**0.3 — Importer**
Ouvre ton fichier Prop Hunt en parallèle, copie `Config.lua` et `BoucleDeJeu.lua`. Tu les adapteras en phase 5.

### ✅ Validation
Le projet est vide mais structuré, et la boucle du Prop Hunt tourne (même avec les mauvais états).

---

## PHASE 1 — Le magasin

*~1 à 2 sessions*

### 🎯 Objectif
Un magasin gris, avec des rayons, un sas d'entrée et une zone caisses.

### 🧠 Ce que tu apprends
Level design orienté gameplay. **Ici la map n'est pas décorative, elle est le jeu.**

### 🔨 Étapes

**1.1 — Le principe de conception**

Contrairement au Prop Hunt, la forme du magasin **détermine directement le fun**. Trois éléments à doser :

- **Les couloirs** créent les goulots d'étranglement. C'est là que les gens se percutent
- **La distance rayon → caisse** définit le temps de vulnérabilité. Trop court, l'arrachage ne sert à rien. Trop long, c'est frustrant
- **Les rayons** créent des chemins alternatifs. Sans eux, tout le monde suit la même ligne

**1.2 — Le plan de base**

```
┌─────────────────────────────────────────┐
│  ███ CAISSES ███  ███ CAISSES ███       │  ← zone de validation
│                                          │
│   ▬▬▬▬▬     ▬▬▬▬▬     ▬▬▬▬▬            │
│                                          │  ← rayons (obstacles)
│   ▬▬▬▬▬     ▬▬▬▬▬     ▬▬▬▬▬            │
│                                          │
│            ★ ZONE ARTICLES ★             │  ← spawn des articles
│                                          │
│   ▬▬▬▬▬     ▬▬▬▬▬     ▬▬▬▬▬            │
│                                          │
│          ▓▓▓ PORTES ▓▓▓                  │  ← sas de départ
│           [ SAS DÉPART ]                 │
└─────────────────────────────────────────┘
```

**1.3 — Construire**
- Sol : `160 x 1 x 120`, `Anchored = true`
- Murs périmétriques
- 6 rayons : Parts de `40 x 8 x 4`, alignés en deux colonnes
- Zone articles : une plateforme surélevée au centre, visible de loin
- Zone caisses : 4 tapis (Parts plates colorées) en haut
- Sas de départ : une pièce fermée en bas, avec un mur qui va disparaître

**1.4 — La porte**
Une Part large qui bloque le sas. Elle sera supprimée (ou rendue non-collidante) au top départ.

Nomme-la `PorteMagasin` et mets-la dans le Workspace, accessible facilement.

**1.5 — Les zones logiques**
Crée trois Parts invisibles (`Transparency = 1`, `CanCollide = false`, `Anchored = true`) :
- `ZoneSpawnArticles` — où les articles apparaissent
- `ZoneCaisse` — la zone de validation
- `ZoneSas` — où les joueurs attendent

Ce sont des **repères pour le code**, pas du décor. Range-les dans un Folder `Zones`.

### ✅ Validation
Tu cours du sas jusqu'aux caisses en 8 à 12 secondes. Les rayons t'obligent à contourner.

### ⚠️ Piège
Même règle qu'au Prop Hunt : **gris et jouable d'abord**. Mais ici, contrairement au Prop Hunt, prends le temps de tester les distances en courant. La géométrie a un impact direct sur l'équilibrage.

---

## PHASE 2 — Ramasser l'article

*~1 à 2 sessions*

### 🎯 Objectif
Des articles apparaissent, un joueur peut en attraper un, et ça se voit.

### 🧠 Ce que tu apprends
Spawn dynamique, Weld (réutilisé du Prop Hunt), état par joueur.

### 🔨 Étapes

**2.1 — Créer un article**

Dans `ReplicatedStorage/Articles`, un `Model` nommé `Carton` :
- Une Part cubique `3 x 3 x 3`
- `PrimaryPart` définie
- `Anchored = false`, `CanCollide = false`

Simple exprès. On enrichira en phase 6.

**2.2 — Faire apparaître les articles**

```lua
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local dossierArticles = ReplicatedStorage:WaitForChild("Articles")
local zoneSpawn = workspace.Zones.ZoneSpawnArticles

local articlesActifs = {}   -- liste des articles posés au sol

local function poserArticles(nombre, nomArticle)
	-- Nettoyer les restes de la manche précédente
	for _, article in ipairs(articlesActifs) do
		if article and article.Parent then
			article:Destroy()
		end
	end
	articlesActifs = {}

	local modele = dossierArticles:FindFirstChild(nomArticle)
	if not modele then
		warn("Article introuvable : " .. nomArticle)
		return
	end

	local taille = zoneSpawn.Size
	local centre = zoneSpawn.Position

	for i = 1, nombre do
		local article = modele:Clone()
		article.Name = "Article"

		-- Position aléatoire dans la zone
		local decalageX = math.random(-taille.X / 2, taille.X / 2)
		local decalageZ = math.random(-taille.Z / 2, taille.Z / 2)

		article:PivotTo(CFrame.new(
			centre.X + decalageX,
			centre.Y + 3,
			centre.Z + decalageZ
		))

		-- Ancré tant que personne ne l'a pris : il flotte, bien visible
		for _, partie in ipairs(article:GetDescendants()) do
			if partie:IsA("BasePart") then
				partie.Anchored = true
			end
		end

		article.Parent = workspace
		table.insert(articlesActifs, article)
	end
end
```

**2.3 — Le porteur**

On a besoin de savoir qui porte quoi. Une table serveur suffit :

```lua
local porteurs = {}   -- [player] = le Model de l'article porté

local function possede(player)
	return porteurs[player] ~= nil
end
```

**2.4 — Attraper**

```lua
local Players = game:GetService("Players")

local function donnerArticle(player, article)
	local perso = player.Character
	if not perso then return end

	local racine = perso:FindFirstChild("HumanoidRootPart")
	if not racine then return end

	-- Détacher l'article de sa position au sol
	for _, partie in ipairs(article:GetDescendants()) do
		if partie:IsA("BasePart") then
			partie.Anchored = false
			partie.CanCollide = false
			partie.Massless = true
		end
	end

	-- Le placer devant le joueur, à hauteur de poitrine
	article:PivotTo(racine.CFrame * CFrame.new(0, 0.5, -2))
	article.Parent = perso

	-- Le souder (même technique que le prop du jeu 1)
	for _, partie in ipairs(article:GetDescendants()) do
		if partie:IsA("BasePart") then
			local weld = Instance.new("WeldConstraint")
			weld.Part0 = racine
			weld.Part1 = partie
			weld.Parent = partie
		end
	end

	porteurs[player] = article
end

-- Détection du ramassage
local function brancherArticle(article)
	local principale = article.PrimaryPart
	if not principale then return end

	principale.Touched:Connect(function(autrePartie)
		local perso = autrePartie.Parent
		local joueur = Players:GetPlayerFromCharacter(perso)

		if not joueur then return end
		if possede(joueur) then return end        -- déjà chargé
		if article.Parent ~= workspace then return end  -- déjà pris
		if not _G.phaseRushActive then return end -- pas encore ouvert

		donnerArticle(joueur, article)
	end)
end
```

**2.5 — Un seul article par joueur**

C'est une règle de design importante : `if possede(joueur) then return end`.

Sans elle, le premier arrivé rafle tout et le jeu s'écroule. Un joueur, un article.

### ✅ Validation
Test en 2 joueurs. Des cartons apparaissent, tu en touches un, il se colle devant toi et te suit quand tu cours.

### ⚠️ Piège
`Massless = true` est indispensable. Sinon le carton alourdit le personnage et ralentit le porteur — ce qui semble logique mais rend le jeu injouable.

---

## PHASE 3 — L'arrachage

*~1 session*

### 🎯 Objectif
Un joueur sans article peut le voler à un porteur.

### 🧠 Ce que tu apprends
Validation serveur (les mêmes six contrôles que la capture du Prop Hunt), cooldown, équilibrage.

### 🔨 Étapes

**3.1 — La décision de design la plus importante du projet**

Tu voulais du Gang Beasts : de la physique, du ragdoll, des bras qui attrapent.

**Ne le fais pas en v1.** Le ragdoll physique synchronisé en réseau, c'est un projet à part entière — contraintes, `BallSocketConstraint`, gestion de la propriété réseau, désynchronisations. Des studios avec des équipes complètes galèrent dessus.

**La version faisable :** contact simple + cooldown. Tu fonces dans un porteur, l'article change de main, les deux joueurs sont brièvement figés.

Ça représente **5 % de la difficulté pour 80 % de la sensation**. Et pour le joueur, se faire arracher son carton dans un couloir bondé produit exactement la même montée d'adrénaline.

Si le jeu marche, tu ajoutes le ragdoll par-dessus. Pas avant.

**3.2 — Le script**

```lua
local Players = game:GetService("Players")

local COOLDOWN_VOL = 2        -- secondes d'immunité après un vol
local DUREE_ETOURDI = 0.6     -- immobilisation des deux joueurs

local immunite = {}           -- [player] = tick() de fin d'immunité

local function estImmunise(player)
	return immunite[player] ~= nil and tick() < immunite[player]
end

local function etourdir(player, duree)
	local perso = player.Character
	if not perso then return end
	local humanoid = perso:FindFirstChildWhichIsA("Humanoid")
	if not humanoid then return end

	humanoid.WalkSpeed = 0
	task.delay(duree, function()
		if humanoid and humanoid.Parent then
			humanoid.WalkSpeed = 16
		end
	end)
end

local function tenterVol(voleur, victime)
	-- ① Le voleur a-t-il déjà un article ?
	if possede(voleur) then return end

	-- ② La victime en a-t-elle un ?
	if not possede(victime) then return end

	-- ③ La victime est-elle immunisée ?
	if estImmunise(victime) then return end

	-- ④ Sont-ils vraiment proches ? (le Touched l'implique,
	--    mais on revérifie côté serveur par principe)
	local rA = voleur.Character and voleur.Character:FindFirstChild("HumanoidRootPart")
	local rB = victime.Character and victime.Character:FindFirstChild("HumanoidRootPart")
	if not rA or not rB then return end
	if (rA.Position - rB.Position).Magnitude > 10 then return end

	-- ✅ Le vol est validé
	local article = porteurs[victime]
	porteurs[victime] = nil
	article.Parent = workspace   -- on le détache temporairement

	-- Supprimer les anciennes soudures
	for _, partie in ipairs(article:GetDescendants()) do
		if partie:IsA("WeldConstraint") then
			partie:Destroy()
		end
	end

	donnerArticle(voleur, article)

	-- Immunité + étourdissement : évite le ping-pong infini
	immunite[voleur] = tick() + COOLDOWN_VOL
	etourdir(voleur, DUREE_ETOURDI)
	etourdir(victime, DUREE_ETOURDI)
end
```

**3.3 — Détecter le contact**

Le plus simple : brancher le `Touched` du `HumanoidRootPart` de chaque joueur à sa création, et appeler `tenterVol` quand deux joueurs se percutent.

**3.4 — Pourquoi l'immunité de 2 secondes**

Sans elle : A vole B, B revole A immédiatement, A revole B... l'article fait du ping-pong et personne n'atteint la caisse. Le jeu se bloque.

L'immunité crée une **fenêtre de fuite**. C'est ce qui rend la course vers la caisse tendue et lisible.

**3.5 — Les valeurs à régler**

`COOLDOWN_VOL` et `DUREE_ETOURDI` sont les deux curseurs les plus sensibles du jeu.

- Cooldown trop court → chaos illisible
- Cooldown trop long → le premier qui attrape gagne, plus d'intérêt

Mets-les dans `Config.lua` dès maintenant. Tu vas les ajuster dix fois en phase 8.

### ✅ Validation
Test en 3 joueurs. Tu fonces dans un porteur, tu récupères son carton, il ne peut pas te le reprendre pendant 2 secondes.

### ⚠️ Piège
Oublier de détruire les anciens `WeldConstraint` avant de re-souder. L'article reste alors accroché aux deux joueurs et se déchire visuellement entre eux. Bug spectaculaire.

---

## PHASE 4 — La caisse

*~1 session*

### 🎯 Objectif
Un porteur qui atteint la caisse est validé et sécurisé.

### 🧠 Ce que tu apprends
Zones de déclenchement, ressource limitée, verrouillage d'état.

### 🔨 Étapes

**4.1 — La détection**

```lua
local zoneCaisse = workspace.Zones.ZoneCaisse

local valides = {}          -- [player] = true
local placesRestantes = 0   -- défini au début de chaque manche

zoneCaisse.Touched:Connect(function(autrePartie)
	local perso = autrePartie.Parent
	local joueur = Players:GetPlayerFromCharacter(perso)

	if not joueur then return end
	if not _G.phaseCaisseActive then return end
	if valides[joueur] then return end        -- déjà passé
	if not possede(joueur) then return end    -- pas d'article
	if placesRestantes <= 0 then return end   -- caisses pleines

	-- ✅ Passage validé
	valides[joueur] = true
	placesRestantes = placesRestantes - 1

	-- L'article est consommé
	local article = porteurs[joueur]
	porteurs[joueur] = nil
	if article then article:Destroy() end

	-- Le joueur est sécurisé : on l'immunise et on le signale
	immunite[joueur] = tick() + 9999

	print(joueur.Name .. " est passé en caisse")
	_G.diffuser("CAISSE", 0, joueur.Name .. " a payé !")
end)
```

**4.2 — Les places limitées**

C'est le levier d'équilibrage principal.

```
Manche 1 : 10 joueurs, 8 articles, 8 places  →  2 éliminés
Manche 2 :  8 joueurs, 6 articles, 6 places  →  2 éliminés
Manche 3 :  6 joueurs, 5 articles, 5 places  →  1 éliminé
...
Finale   :  2 joueurs, 1 article,  1 place   →  1 vainqueur
```

Formule de départ : `articles = joueurs - 2` au début, puis `joueurs - 1` quand il reste peu de monde. Tu affineras en phase 8.

**4.3 — Le retour visuel**

Il faut que ce soit **spectaculaire**. Quand quelqu'un passe :
- Un son (même un son Roblox par défaut suffit)
- Un flash de couleur sur la caisse
- Un message dans le HUD de tout le monde

Le passage en caisse est le moment culminant du jeu. S'il est silencieux, il tombe à plat.

### ✅ Validation
Tu traverses la caisse avec un carton, il disparaît, tu es marqué comme sauvé. Sans carton, rien ne se passe.

### ⚠️ Piège
`.Touched` se déclenche en boucle. Le `if valides[joueur] then return end` est ton debounce. Sans lui, un joueur consomme toutes les places en une seconde.

---

## PHASE 5 — La boucle d'élimination

*~2 sessions*

### 🎯 Objectif
Les manches s'enchaînent, les éliminés sortent, il reste un gagnant.

### 🧠 Ce que tu apprends
Machine à états avec état persistant entre les manches, gestion des spectateurs.

### 🔨 Étapes

**5.1 — La machine à états adaptée**

Reprends `BoucleDeJeu.lua` du Prop Hunt et remplace les états :

```
ATTENTE → PREPARATION (10s) → RUSH (45s) → CAISSE (20s) → ELIMINATION (8s)
                ▲                                                │
                └────────── s'il reste 2+ joueurs ───────────────┘
                                     │
                              sinon → VICTOIRE (15s) → ATTENTE
```

**5.2 — La liste des participants**

Différence majeure avec le Prop Hunt : ici il y a un **état qui persiste entre les manches**. Il faut suivre qui est encore en lice.

```lua
local enLice = {}   -- liste des joueurs encore en jeu

local function demarrerPartie()
	enLice = {}
	for _, player in ipairs(Players:GetPlayers()) do
		table.insert(enLice, player)
	end
end

local function eliminer(player)
	for i, p in ipairs(enLice) do
		if p == player then
			table.remove(enLice, i)
			break
		end
	end
	-- Passage en spectateur
	local perso = player.Character
	if perso then
		local humanoid = perso:FindFirstChildWhichIsA("Humanoid")
		if humanoid then humanoid.Health = 0 end
	end
	-- TODO : téléporter en zone spectateur
end
```

**5.3 — La fin de manche**

```lua
local function finDeManche()
	local survivants = {}

	for _, player in ipairs(enLice) do
		if valides[player] then
			table.insert(survivants, player)
		else
			eliminer(player)
		end
	end

	enLice = survivants
	valides = {}
	porteurs = {}

	return #enLice
end
```

**5.4 — La condition de victoire**

```lua
local restants = finDeManche()

if restants <= 1 then
	local gagnant = enLice[1]
	if gagnant then
		_G.diffuser("VICTOIRE", 0, gagnant.Name .. " remporte la partie !")
		gagnant.leaderstats.Victoires.Value += 1
	end
	task.wait(Config.DUREE_VICTOIRE)
	-- retour à ATTENTE
else
	-- manche suivante
end
```

**5.5 — La zone spectateur**

Construis une petite plateforme surélevée, hors du magasin, avec vue sur les caisses. Téléportes-y les éliminés.

Ne les éjecte pas du serveur : ils regardent, ils commentent, ils attendent la prochaine partie. Un joueur qui attend est un joueur qui reste.

**5.6 — Gérer les déconnexions**

```lua
Players.PlayerRemoving:Connect(function(player)
	-- Nettoyer partout, sinon fuite mémoire et bugs fantômes
	porteurs[player] = nil
	valides[player] = nil
	immunite[player] = nil

	for i, p in ipairs(enLice) do
		if p == player then
			table.remove(enLice, i)
			break
		end
	end
end)
```

Ce nettoyage n'est pas cosmétique. Sans lui, une partie peut se bloquer en attendant un joueur qui n'existe plus.

### ✅ Validation
Test en 4 joueurs. Une partie complète s'enchaîne du début à la victoire, sans intervention.

### ⚠️ Piège
Le cas « tout le monde se déconnecte pendant une manche ». Ta boucle doit vérifier `#enLice` à chaque étape et savoir revenir en ATTENTE proprement.

---

## PHASE 6 — L'article du jour

*~1 session*

### 🎯 Objectif
L'article change, sans toucher au code du jeu.

### 🧠 Ce que tu apprends
Conception pilotée par les données. **C'est le concept le plus réutilisable de tout le projet.**

### 🔨 Étapes

**6.1 — Le principe**

Le code ne doit jamais savoir qu'il manipule « une clim ». Il manipule « l'article de la manche », et cet article est une donnée.

C'est exactement le même raisonnement qu'un CMS : le moteur ne connaît pas le contenu.

**6.2 — Le catalogue**

Dans `ReplicatedStorage/Modules`, un `ModuleScript` nommé `Catalogue` :

```lua
local Catalogue = {}

Catalogue.Articles = {
	{
		id = "clim",
		nom = "Climatiseur",
		modele = "Clim",              -- nom du Model dans ReplicatedStorage/Articles
		accroche = "38°C dehors. Dernière clim du magasin.",
		couleur = Color3.fromRGB(120, 200, 255)
	},
	{
		id = "console",
		nom = "PlaySphere 6",
		modele = "Console",
		accroche = "Sortie mondiale. 12 exemplaires en stock.",
		couleur = Color3.fromRGB(60, 90, 220)
	},
	{
		id = "nutella",
		nom = "Pot géant Choconoisette",
		modele = "PotGeant",
		accroche = "-70%. Ça a mal tourné l'an dernier.",
		couleur = Color3.fromRGB(90, 50, 20)
	},
}

function Catalogue.auHasard()
	return Catalogue.Articles[math.random(1, #Catalogue.Articles)]
end

return Catalogue
```

**6.3 — L'utiliser**

```lua
local Catalogue = require(ReplicatedStorage.Modules.Catalogue)

local articleDuJour = Catalogue.auHasard()
poserArticles(nombreArticles, articleDuJour.modele)
_G.diffuser("PREPARATION", 10, articleDuJour.accroche)
```

**6.4 — Ce que ça te donne**

Pour ajouter un nouvel article, tu fais deux choses :
1. Construire un Model dans `ReplicatedStorage/Articles`
2. Ajouter 6 lignes dans le catalogue

**Aucune modification du moteur.** C'est ce qui te permettra de mettre le jeu à jour en 20 minutes quand un truc est à la mode.

**6.5 — Les modèles**

Reste simple. Une clim, c'est un pavé blanc avec une grille. Une console, un pavé noir avec une LED. Ce n'est pas du modeling, c'est de l'assemblage de Parts.

### ✅ Validation
Chaque partie tire un article différent, avec son nom et son accroche affichés.

---

## PHASE 7 — L'interface

*~1 session*

### 🎯 Objectif
Le joueur sait en permanence : où il en est, ce qu'il doit faire, combien il reste.

### 🔨 Étapes

**7.1 — Les éléments du HUD**

| Élément | Position | Contenu |
|---|---|---|
| Timer | Haut centre | `00:38` |
| Consigne | Sous le timer | « ATTRAPE UN ARTICLE ! » / « FILE EN CAISSE ! » |
| Article du jour | Haut gauche | Nom + accroche |
| Articles restants | Haut droite | `4 / 8 au sol` |
| Places caisse | Haut droite | `3 places restantes` |
| Ton statut | Bas centre | « Tu portes un article » / « SAUVÉ » / « ÉLIMINÉ » |

**7.2 — La règle de lisibilité**

Ce jeu se joue dans la panique. Le joueur a **une demi-seconde** pour lire.

- Textes courts, gros, en majuscules
- Code couleur constant : vert = sauvé, rouge = danger, blanc = neutre
- Une seule info importante à la fois

**7.3 — Le compteur de places**

C'est l'élément qui crée la tension finale. Quand il affiche `1 place restante` et qu'il reste trois porteurs, tout le monde sprinte.

Fais-le clignoter en dessous de 3.

### ✅ Validation
Un joueur qui n'a jamais vu le jeu comprend quoi faire sans qu'on lui explique.

---

## PHASE 8 — Équilibrage

*~2 sessions, et ça ne s'arrête jamais vraiment*

### 🎯 Objectif
Le jeu est tendu, pas frustrant.

### 🔨 Les curseurs

Tous dans `Config.lua`. Voici les valeurs de départ et ce qui se passe si tu les tournes :

| Paramètre | Départ | Trop bas | Trop haut |
|---|---|---|---|
| `DUREE_RUSH` | 45s | Personne n'a le temps | Plus de tension |
| `DUREE_CAISSE` | 20s | Injouable | Les porteurs sont trop tranquilles |
| `COOLDOWN_VOL` | 2s | Ping-pong illisible | Le premier arrivé gagne |
| `DUREE_ETOURDI` | 0.6s | On sent rien | Frustrant |
| `ARTICLES_MOINS` | 2 | Trop lent | Élimine trop vite |
| `VITESSE_PORTEUR` | 14 | Le porteur est une proie | Impossible à rattraper |

**8.1 — Le malus de vitesse du porteur**

Ralentir légèrement le porteur (16 → 14) change tout : ça rend l'arrachage viable et récompense les joueurs sans article. Teste avec et sans, la différence est nette.

**8.2 — La méthode de test**

Fais jouer 4 à 6 personnes réelles. Note trois choses :
1. **Où ils rigolent** → à amplifier
2. **Où ils râlent** → à corriger
3. **Où ils s'ennuient** → à raccourcir

Ne change **qu'un seul paramètre à la fois**. Sinon tu ne sais pas ce qui a produit l'effet. C'est du débogage, exactement comme du code.

**8.3 — Le symptôme le plus courant**

« Le premier qui attrape gagne toujours. »
→ Baisse le cooldown de vol, ralentis plus le porteur, ou allonge la distance rayon-caisse.

---

## PHASE 9 — Publication

*~1 session*

- `File` → `Publish to Roblox`
- Titre parodique, description courte et accrocheuse
- Miniature : une capture du rush avec des joueurs qui se percutent
- `Max Players` : 16
- Genre : Party

**Le test qui compte** : fais jouer 6 personnes qui ne connaissent pas le jeu. Ne dis rien. Regarde.

Et filme. Ce jeu produit du contenu vidéo naturellement — c'est un de ses arguments principaux.

---

## PHASE 10 — Après (optionnel)

**Ce qui apporte le plus, dans l'ordre**

1. **Plus d'articles au catalogue** — effort minime, effet maximal
2. **Sons** — le jeu passe de correct à vivant
3. **Bots CPU** — permet de jouer à 2. `PathfindingService` + une IA simple : se diriger vers l'article le plus proche, puis vers la caisse. Pas besoin qu'ils soient intelligents, juste présents
4. **Ragdoll / Gang Beasts** — seulement si tout le reste tourne. C'est un chantier complet, pas une option
5. **Plusieurs magasins** — une deuxième map change complètement le rythme
6. **Événements de manche** — annonce au micro, promotion surprise, allée bloquée

**Idées v2 en vrac**
*(note ici tout ce qui te vient pendant le dev, au lieu de l'implémenter)*

- …
- …

---

## Architecture des fichiers

```
ServerScriptService/
└── Serveur/
    ├── BoucleDeJeu.lua           (phase 5)
    ├── GestionArticles.lua       (phase 2)
    ├── GestionVol.lua            (phase 3)
    ├── GestionCaisse.lua         (phase 4)
    ├── GestionJoueurs.lua        (phase 5)
    └── Leaderstats.lua

ReplicatedStorage/
├── Remotes/
│   └── MiseAJourEtat            (RemoteEvent)
├── Modules/
│   ├── Config.lua               (tous les curseurs)
│   └── Catalogue.lua            (phase 6)
└── Articles/
    ├── Clim                     (Model)
    ├── Console                  (Model)
    └── PotGeant                 (Model)

StarterPlayer/StarterPlayerScripts/
└── Client/
    └── HUD.lua                  (phase 7)

StarterGui/
└── HUD                          (ScreenGui)

Workspace/
├── Magasin/                     (phase 1)
└── Zones/
    ├── ZoneSpawnArticles
    ├── ZoneCaisse
    └── ZoneSas
```

---

## Journal de bord

| Date | Phase | Fait | Bloqué sur | Prochaine étape |
|---|---|---|---|---|
| | | | | |
| | | | | |

---

## Les cinq règles

1. **Aucune marque réelle.** Parodie tout.
2. **Contact simple, pas de ragdoll.** 5 % de l'effort, 80 % du fun. Le ragdoll c'est un autre projet.
3. **Le catalogue est une donnée, jamais du code.** C'est ce qui donne au jeu sa durée de vie.
4. **Un seul paramètre modifié à la fois** pendant l'équilibrage.
5. **Ce jeu ne se teste pas seul.** Il te faut 4 personnes minimum, sinon tu ne sais rien de ce que tu construis.
