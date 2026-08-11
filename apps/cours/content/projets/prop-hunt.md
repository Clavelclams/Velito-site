---
titre: "Prop Hunt Gymnases"
avancement: 0
statut: "a venir"
maj: 2026-08-11
---

> **Jeu Roblox n°1 — projet loisir.** Prérequis : le parcours 🎮 Roblox & Luau.
> Cette page est la feuille de route complète : mets à jour `avancement` à
> chaque phase terminée.

**Projet loisir. Aucune deadline. Aucune obligation.**
La seule règle : chaque phase doit être **jouable** avant de passer à la suivante.

---


## Le contrat de périmètre

Signe-le mentalement maintenant. C'est ce qui va décider si ce projet est fini ou abandonné.

### ✅ La v1 contient exactement ça

| Élément | Périmètre |
|---|---|
| Map | **UN** gymnase, gris, stylisé, non fidèle |
| Objets | 5 à 8 props transformables |
| Équipes | Cachés / Chercheurs, inversion à chaque manche |
| Manche | ~5 min, 30s de planque + 4min30 de chasse |
| Score | Points par manche, leaderboard Roblox |
| Interface | Timer, compteur de cachés restants, message d'état |

### ❌ La v1 NE contient PAS

Écris-les sur un post-it. Chaque fois que tu as envie d'en ajouter un, tu le notes dans "Idées v2" et tu retournes à la phase en cours.

- Les deux autres gymnases
- Des textures, des logos MABB, des gradins détaillés
- Des armes ou un système de tir
- Une boutique, des skins, des Robux
- Des sons custom
- Des taunts, un système de classement mondial
- Un menu principal élaboré

### La définition de "fini"

> Trois personnes lancent une partie, jouent deux manches complètes, comprennent les règles sans explication, et rigolent au moins une fois.

C'est tout. Si tu atteins ça, le projet est réussi.

---

## Comment lire cette roadmap

Chaque phase suit le même format :

- **🎯 Objectif** — ce que tu dois obtenir
- **🧠 Ce que tu apprends** — la vraie valeur de la phase
- **🔨 Étapes** — le découpage concret
- **✅ Test de validation** — comment tu sais que c'est bon
- **⚠️ Piège** — ce qui va te bloquer si tu ne le sais pas

**Les phases 1 à 5 sont obligatoires et dans l'ordre.** Elles se construisent l'une sur l'autre. Les phases 6 à 9 sont plus souples.

Une "session" = 2 à 3h. Les durées sont indicatives, pas des objectifs.

---

## PHASE 0 — Préparation

*~1 session*

### 🎯 Objectif
Studio installé, projet créé, arborescence propre, tu sais faire tourner un script.

### 🧠 Ce que tu apprends
L'interface, la hiérarchie, le cycle modifier → tester.

### 🔨 Étapes

**0.1 — Installer**
- Compte Roblox → `create.roblox.com` → Start Creating
- Studio, template **Baseplate**

**0.2 — Configurer**
- `View` → active **Explorer**, **Properties**, **Output**. Les trois, toujours ouverts
- `File` → `Game Settings` → `Security` → active **Enable Studio Access to API Services** (tu en auras besoin pour la sauvegarde plus tard)
- Sauvegarde en local : `File` → `Save to File As` → `PropHunt.rbxl`

**0.3 — Créer l'arborescence**

Dans l'Explorer, prépare les dossiers maintenant. Ça t'évitera le chaos dans trois semaines.

```
ServerScriptService
└── 📁 Serveur            (Folder)

ReplicatedStorage
├── 📁 Remotes            (Folder)
├── 📁 Modules            (Folder)
└── 📁 Props              (Folder)  ← les objets transformables

StarterPlayer
└── StarterPlayerScripts
    └── 📁 Client         (Folder)
```

Pour créer un Folder : clic droit sur le service → `Insert Object` → `Folder`.

**0.4 — Ton premier script**
Fais le script piège du cours (section 9). Puis casse-le exprès : change la valeur des dégâts, enlève le debounce, mets `Anchored = false`. Regarde ce qui se passe.

### ✅ Test de validation
Tu ouvres Studio, tu appuies sur Play, tu marches sur ta plateforme rouge, tu perds de la vie. L'Output affiche tes `print`.

### ⚠️ Piège
Ne construis **jamais** en mode Play. Tout est effacé au Stop.

---

## PHASE 1 — Le gymnase gris

*~1 à 2 sessions*

### 🎯 Objectif
Un espace fermé, gris, dans lequel on peut courir. Moche assumé.

### 🧠 Ce que tu apprends
Les Parts, Anchored, les Models, le level design de base.

### 🔨 Étapes

**1.1 — La structure**
- Un sol : Part de `100 x 1 x 60` studs, `Anchored = true`
- Quatre murs : Parts de `1 x 20 x 60` et `100 x 20 x 1`, `Anchored = true`
- Un plafond (optionnel mais recommandé — sinon on voit les props d'en haut)

**1.2 — Le mobilier**
C'est ce qui rend le prop hunt jouable. Sans mobilier, il n'y a nulle part où se fondre.

Pose au moins 20 à 30 objets, assemblés à partir de Parts simples :
- 2 paniers de basket (poteau + panneau + cercle)
- Des bancs le long des murs
- Des plots d'entraînement (cylindres)
- Des chariots à ballons
- Un extincteur, des poubelles
- Des caisses de rangement
- Une table de marque

**1.3 — Organiser**
Sélectionne les Parts d'un même meuble → clic droit → `Group as Model` → renomme-le (`Banc`, `PanierBasket`...).

Range tous les Models dans un Folder `Gymnase` dans le Workspace.

**1.4 — Vérifier**
Sélectionne tout ton décor, dans Properties : `Anchored` doit être coché. Sinon ta map s'effondre au lancement.

**1.5 — Points d'apparition**
Insère 2 `SpawnLocation` dans le gymnase. Décoche leur propriété `Neutral` plus tard, quand on aura les équipes.

### ✅ Test de validation
Tu appuies sur Play, tu apparais dans le gymnase, tu cours, rien ne tombe, rien ne traverse le sol.

### ⚠️ Piège

**C'est LA phase où le projet meurt.** L'envie de rendre ça beau va être forte : textures, lumières, logos MABB, gradins.

Ne le fais pas. Un gymnase gris moche mais jouable te fait avancer. Un gymnase magnifique sans logique de jeu, c'est trois week-ends brûlés pour rien.

**Fixe-toi une limite dure : 2 sessions maximum sur cette phase.** Au bout de 2 sessions, tu passes à la 2 quoi qu'il arrive. Tu reviendras embellir en phase 9, quand le jeu tournera.

---

## PHASE 2 — Les équipes

*~1 session*

### 🎯 Objectif
Les joueurs sont répartis en deux équipes, et le jeu le sait.

### 🧠 Ce que tu apprends
`PlayerAdded`, le service `Teams`, `Instance.new()`, la répartition côté serveur. **La première vraie logique serveur.**

### 🔨 Étapes

**2.1 — Créer le service Teams**
Clic droit sur `game` dans l'Explorer → `Insert Service` → `Teams`.

Dedans, insère deux `Team` :
- `Cachés` — TeamColor : Bright green
- `Chercheurs` — TeamColor : Bright red

Décoche `AutoAssignable` sur les deux (c'est le serveur qui décidera).

**2.2 — Le script de répartition**

Dans `ServerScriptService/Serveur`, un `Script` nommé `GestionEquipes` :

```lua
local Players = game:GetService("Players")
local Teams = game:GetService("Teams")

local equipeCaches = Teams:WaitForChild("Cachés")
local equipeChercheurs = Teams:WaitForChild("Chercheurs")

-- Répartit tous les joueurs : environ 1 chercheur pour 3 cachés
local function repartirEquipes()
	local joueurs = Players:GetPlayers()

	if #joueurs == 0 then return end

	-- On mélange la liste pour que ce ne soit pas toujours les mêmes
	-- (algorithme de Fisher-Yates : on échange chaque élément
	--  avec un autre pris au hasard avant lui)
	for i = #joueurs, 2, -1 do
		local j = math.random(1, i)
		joueurs[i], joueurs[j] = joueurs[j], joueurs[i]
	end

	-- math.max(1, ...) garantit au moins UN chercheur,
	-- même s'il n'y a que 2 joueurs
	local nbChercheurs = math.max(1, math.floor(#joueurs / 4))

	for index, player in ipairs(joueurs) do
		if index <= nbChercheurs then
			player.Team = equipeChercheurs
		else
			player.Team = equipeCaches
		end
	end
end

-- Quand un joueur arrive
Players.PlayerAdded:Connect(function(player)
	player.Team = equipeCaches   -- par défaut en attendant la prochaine manche
	print(player.Name .. " a rejoint")
end)

-- On expose la fonction pour que d'autres scripts l'utilisent
_G.repartirEquipes = repartirEquipes
```

> **Note sur `_G`** : c'est une table globale partagée. Ça marche, mais c'est une mauvaise pratique à long terme. En phase 3 on remplacera ça par un **ModuleScript**, qui est la façon propre de partager du code. Je te le laisse ici pour que tu voies la différence quand on fera le changement.

### ✅ Test de validation
Test → `Clients and Servers` → 3 joueurs → Start.
Les personnages ont des couleurs de nom différentes. L'Output confirme les arrivées.

### ⚠️ Piège
Si tu changes `player.Team`, le joueur **respawn** automatiquement. C'est normal et c'est même pratique : ça remet tout le monde à zéro entre les manches.

---

## PHASE 3 — La machine à états

*~2 sessions*

### 🎯 Objectif
Le jeu tourne en boucle tout seul : Attente → Planque → Chasse → Résultats → recommence.

### 🧠 Ce que tu apprends
**C'est la phase la plus formatrice du projet.** Boucle de jeu, machine à états, gestion du temps, ModuleScripts. Ces notions sont directement transposables ailleurs — y compris dans ton CDA.

### 🔨 Étapes

**3.1 — Comprendre le concept**

Une machine à états, c'est : à tout instant le jeu est dans **un seul** état, et les transitions sont définies.

```
   ATTENTE  ──(assez de joueurs)──▶  PLANQUE (30s)
      ▲                                  │
      │                                  ▼
  RÉSULTATS (10s) ◀──(temps écoulé      CHASSE (4min30)
      ▲              ou tous trouvés)     │
      └──────────────────────────────────┘
```

Le grand avantage : **à tout moment tu sais où tu en es.** Sans ça, tu te retrouves avec dix booléens contradictoires et des bugs impossibles à traquer.

**3.2 — Le ModuleScript de configuration**

Dans `ReplicatedStorage/Modules`, un `ModuleScript` nommé `Config` :

```lua
-- Un ModuleScript renvoie une table.
-- Les autres scripts font require() pour la récupérer.
-- Tout est centralisé ici : tu règles l'équilibrage sans toucher au reste.

local Config = {}

Config.JOUEURS_MINIMUM = 2
Config.DUREE_PLANQUE = 30
Config.DUREE_CHASSE = 270      -- 4min30
Config.DUREE_RESULTATS = 10

Config.POINTS_SURVIE = 10      -- caché non trouvé
Config.POINTS_CAPTURE = 15     -- chercheur qui trouve

return Config
```

**3.3 — La boucle de jeu**

Dans `ServerScriptService/Serveur`, un `Script` nommé `BoucleDeJeu` :

```lua
local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")

local Config = require(ReplicatedStorage.Modules.Config)

-- On crée le RemoteEvent qui informera les clients de l'état
local remotes = ReplicatedStorage:WaitForChild("Remotes")
local majEtat = Instance.new("RemoteEvent")
majEtat.Name = "MiseAJourEtat"
majEtat.Parent = remotes

-- Prévient TOUS les clients de l'état actuel
local function diffuser(etat, tempsRestant, message)
	majEtat:FireAllClients(etat, tempsRestant, message)
end

-- Compte à rebours, en diffusant chaque seconde
local function compteARebours(duree, etat, message)
	for t = duree, 1, -1 do
		diffuser(etat, t, message)
		task.wait(1)
	end
end

-- LA BOUCLE PRINCIPALE
while true do

	-- ÉTAT 1 : ATTENTE
	while #Players:GetPlayers() < Config.JOUEURS_MINIMUM do
		diffuser("ATTENTE", 0, "En attente de joueurs...")
		task.wait(2)
	end

	-- ÉTAT 2 : PLANQUE
	_G.repartirEquipes()
	-- TODO phase 4 : transformer les cachés en props
	-- TODO phase 5 : bloquer les chercheurs
	compteARebours(Config.DUREE_PLANQUE, "PLANQUE", "Cachez-vous !")

	-- ÉTAT 3 : CHASSE
	-- TODO phase 5 : libérer les chercheurs
	compteARebours(Config.DUREE_CHASSE, "CHASSE", "La chasse est ouverte !")

	-- ÉTAT 4 : RÉSULTATS
	-- TODO phase 7 : attribuer les points
	compteARebours(Config.DUREE_RESULTATS, "RESULTATS", "Fin de la manche")
end
```

**3.4 — Les TODO**

Ils sont volontaires. La boucle tourne **dès maintenant**, à vide. Tu remplis les trous phase par phase, et à chaque fois tu peux tester. C'est beaucoup plus confortable que de tout écrire d'un coup et de chercher où ça casse.

### ✅ Test de validation
Lance en 2 joueurs. L'Output défile : le jeu enchaîne les états en boucle, indéfiniment.

### ⚠️ Piège
Un `while true do` **sans `task.wait()` dedans** gèle complètement le serveur. Il y a toujours une attente dans chaque branche ici, mais garde ce réflexe en tête.

---

## PHASE 4 — La transformation en objet

*~2 à 3 sessions*

### 🎯 Objectif
Un joueur de l'équipe Cachés devient visuellement un objet du décor.

### 🧠 Ce que tu apprends
Manipulation de personnages, Welds, transparence, contrôle de caméra. **C'est le cœur du jeu.**

### 🔨 Étapes

**4.1 — Préparer les props**

Prends 5 à 8 meubles de ton gymnase, duplique-les (Ctrl+D), et mets les copies dans `ReplicatedStorage/Props`.

Pour chacun :
- C'est un `Model`
- Il a une `PrimaryPart` définie (sélectionne le Model → Properties → PrimaryPart → choisis la Part principale)
- Toutes ses Parts ont `Anchored = false` et `CanCollide = false`
- Il est de taille raisonnable — un prop plus gros que le joueur devient injouable

**4.2 — Le principe technique**

On ne remplace pas le personnage. On fait trois choses :

1. Rendre le personnage **invisible** (transparence à 1 sur toutes ses parties)
2. **Attacher** un prop à sa position (avec un `Weld`)
3. Le prop suit automatiquement le personnage puisqu'il y est soudé

Le joueur bouge toujours normalement, mais tout le monde voit un banc se déplacer.

**4.3 — Le script**

```lua
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local dossierProps = ReplicatedStorage:WaitForChild("Props")

local function transformerEnProp(player, nomDuProp)
	local perso = player.Character
	if not perso then return end

	local racine = perso:FindFirstChild("HumanoidRootPart")
	if not racine then return end

	-- 1. Rendre le personnage invisible
	for _, partie in ipairs(perso:GetDescendants()) do
		if partie:IsA("BasePart") and partie.Name ~= "HumanoidRootPart" then
			partie.Transparency = 1
			partie.CanCollide = false
		elseif partie:IsA("Decal") then
			partie.Transparency = 1   -- le visage
		end
	end
	racine.Transparency = 1

	-- 2. Nettoyer un éventuel ancien prop
	local ancien = perso:FindFirstChild("PropActuel")
	if ancien then ancien:Destroy() end

	-- 3. Cloner le prop et le positionner
	local modele = dossierProps:FindFirstChild(nomDuProp)
	if not modele then
		warn("Prop introuvable : " .. nomDuProp)
		return
	end

	local prop = modele:Clone()
	prop.Name = "PropActuel"
	prop:PivotTo(racine.CFrame)   -- le place exactement sur le joueur
	prop.Parent = perso

	-- 4. Souder chaque partie du prop à la racine du joueur
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
end

_G.transformerEnProp = transformerEnProp
```

**4.4 — Les points délicats**

- **`Massless = true`** : sans ça, un prop lourd ralentit ou bloque le joueur
- **`CanCollide = false`** sur le prop : sinon il se cogne dans les murs de façon absurde
- **`:PivotTo()`** : c'est la méthode moderne pour positionner un Model entier. Elle remplace l'ancien `SetPrimaryPartCFrame`
- **Le `Decal`** : c'est le visage. Si tu l'oublies, un visage flottant reste visible. Effet involontairement terrifiant

**4.5 — Choix du prop par le joueur**

Version simple pour la v1 : au début de la manche, chaque caché reçoit un prop **aléatoire**.

```lua
local props = dossierProps:GetChildren()
local choisi = props[math.random(1, #props)]
transformerEnProp(player, choisi.Name)
```

Le choix libre par le joueur, c'est de la v2.

**4.6 — La caméra**

Une fois invisible, la caméra reste collée au personnage et tu ne vois presque rien. Il faut la reculer.

Dans `StarterPlayer/StarterPlayerScripts/Client`, un `LocalScript` :

```lua
local player = game.Players.LocalPlayer

player.CameraMinZoomDistance = 8
player.CameraMaxZoomDistance = 15
```

C'est bien un **LocalScript** : la caméra est purement locale, elle n'a rien à faire sur le serveur.

### ✅ Test de validation
Test en 2 joueurs. Un joueur devient visuellement un banc. Le second voit le banc se déplacer, pas le personnage.

### ⚠️ Piège
Si le prop tremble ou dérive, c'est presque toujours `Anchored` resté à `true` sur une des Parts, ou un `Weld` manquant. Vérifie **toutes** les Parts du Model, y compris celles imbriquées.

---

## PHASE 5 — La chasse

*~2 sessions*

### 🎯 Objectif
Les chercheurs peuvent démasquer les cachés. Le jeu a une condition de victoire.

### 🧠 Ce que tu apprends
RemoteEvents, validation serveur, raycasting, gestion d'état des joueurs. **La phase où la sécurité serveur/client devient concrète.**

### 🔨 Étapes

**5.1 — Bloquer les chercheurs pendant la planque**

```lua
local function bloquerJoueur(player, bloque)
	local perso = player.Character
	if not perso then return end

	local humanoid = perso:FindFirstChildWhichIsA("Humanoid")
	if not humanoid then return end

	if bloque then
		humanoid.WalkSpeed = 0
		humanoid.JumpPower = 0
	else
		humanoid.WalkSpeed = 16   -- valeurs par défaut Roblox
		humanoid.JumpPower = 50
	end
end
```

Appelle-la sur tous les chercheurs au début de la planque, puis débloque-les au début de la chasse.

Bonus optionnel : un mur invisible autour de leur zone d'attente, plus fiable qu'un simple `WalkSpeed = 0`.

**5.2 — Le RemoteEvent de tentative**

Dans `ReplicatedStorage/Remotes`, insère un `RemoteEvent` nommé `TenterCapture`.

**5.3 — Côté client : viser et cliquer**

```lua
local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local UserInputService = game:GetService("UserInputService")

local player = Players.LocalPlayer
local remote = ReplicatedStorage.Remotes:WaitForChild("TenterCapture")

UserInputService.InputBegan:Connect(function(input, dansUnChat)
	if dansUnChat then return end

	if input.UserInputType == Enum.UserInputType.MouseButton1 then
		local souris = player:GetMouse()
		local cible = souris.Target   -- la Part visée

		if cible then
			remote:FireServer(cible)
		end
	end
end)
```

**5.4 — Côté serveur : valider**

**C'est ici que se joue la sécurité de ton jeu.** Lis chaque vérification et comprends pourquoi elle existe.

```lua
local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local Teams = game:GetService("Teams")

local remote = ReplicatedStorage.Remotes:WaitForChild("TenterCapture")

local DISTANCE_MAX = 30
local cooldowns = {}   -- [player] = tick() du dernier essai

remote.OnServerEvent:Connect(function(player, cible)

	-- ① Le joueur est-il bien un chercheur ?
	--    Sans ça, un caché pourrait éliminer ses coéquipiers.
	if player.Team ~= Teams["Chercheurs"] then return end

	-- ② Anti-spam. Un exploiteur peut appeler ce Remote
	--    des centaines de fois par seconde.
	local maintenant = tick()
	if cooldowns[player] and maintenant - cooldowns[player] < 1 then
		return
	end
	cooldowns[player] = maintenant

	-- ③ L'argument est-il bien ce qu'on attend ?
	--    Le client peut envoyer n'importe quoi : un nombre,
	--    du texte, nil. On ne suppose rien.
	if typeof(cible) ~= "Instance" or not cible:IsA("BasePart") then
		return
	end

	-- ④ Remonter jusqu'au joueur propriétaire du prop
	local modele = cible:FindFirstAncestorOfClass("Model")
	if not modele then return end

	local persoCible = modele
	if modele.Name == "PropActuel" then
		persoCible = modele.Parent
	end

	local joueurTouche = Players:GetPlayerFromCharacter(persoCible)
	if not joueurTouche then return end

	-- ⑤ La cible est-elle bien dans l'équipe adverse ?
	if joueurTouche.Team ~= Teams["Cachés"] then return end

	-- ⑥ VÉRIFICATION DE DISTANCE — la plus importante.
	--    Sans elle, un exploiteur élimine tout le monde
	--    depuis l'autre bout de la map sans bouger.
	local persoChercheur = player.Character
	if not persoChercheur then return end

	local racineA = persoChercheur:FindFirstChild("HumanoidRootPart")
	local racineB = persoCible:FindFirstChild("HumanoidRootPart")
	if not racineA or not racineB then return end

	local distance = (racineA.Position - racineB.Position).Magnitude
	if distance > DISTANCE_MAX then return end

	-- ✅ Tout est validé : la capture est légitime
	local humanoid = persoCible:FindFirstChildWhichIsA("Humanoid")
	if humanoid then
		humanoid.Health = 0
	end

	print(player.Name .. " a trouvé " .. joueurTouche.Name)
	-- TODO phase 7 : attribuer les points
end)

-- Nettoyer la table quand un joueur part (évite une fuite mémoire)
Players.PlayerRemoving:Connect(function(player)
	cooldowns[player] = nil
end)
```

**5.5 — Pourquoi ces six vérifications**

Relis-les. C'est **exactement** le raisonnement que tu appliques à un formulaire PHP :

| Vérification | Équivalent web |
|---|---|
| ① Bonne équipe | Contrôle de rôle / permissions |
| ② Cooldown | Rate limiting |
| ③ Type de l'argument | Validation du type d'entrée |
| ④⑤ Cible valide | Vérification d'existence en base |
| ⑥ Distance | Règle métier |

**Le client demande. Le serveur décide.** Toujours.

**5.6 — Condition de fin anticipée**

Si tous les cachés sont trouvés avant la fin du temps, la manche s'arrête. Compte les cachés vivants après chaque capture et coupe la boucle si le compteur tombe à zéro.

### ✅ Test de validation
Test en 3 joueurs. Le chercheur clique sur un prop de près → le joueur est éliminé. Il clique de loin → rien ne se passe. Il clique sur un vrai meuble du décor → rien ne se passe.

### ⚠️ Piège
Le prop d'un joueur et un vrai meuble du décor se ressemblent. C'est **le principe même du jeu**. Assure-toi juste que ton code sait les distinguer — d'où le passage par `PropActuel` et `GetPlayerFromCharacter`.

---

## PHASE 6 — L'interface

*~1 à 2 sessions*

### 🎯 Objectif
Le joueur voit le timer, son rôle, et combien de cachés restent.

### 🧠 Ce que tu apprends
ScreenGui, positionnement UDim2, réception de RemoteEvents côté client.

### 🔨 Étapes

**6.1 — Construire l'UI**

Dans `StarterGui`, insère un `ScreenGui` nommé `HUD`. Dedans :
- `TextLabel` **Timer** — en haut au centre
- `TextLabel` **Etat** — sous le timer (« Cachez-vous ! »)
- `TextLabel` **Restants** — en haut à droite

**6.2 — Comprendre UDim2**

```lua
UDim2.new(échelleX, décalageX, échelleY, décalageY)
```

- **échelle** : proportion de l'écran (0.5 = moitié)
- **décalage** : pixels fixes

```lua
label.Size = UDim2.new(0.3, 0, 0.1, 0)      -- 30% large, 10% haut
label.Position = UDim2.new(0.35, 0, 0.05, 0)
```

Utilise l'échelle en priorité : ton interface s'adaptera automatiquement du téléphone au grand écran. C'est le même raisonnement que `%` vs `px` en CSS.

**6.3 — Le script client**

```lua
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local player = game.Players.LocalPlayer

local hud = player:WaitForChild("PlayerGui"):WaitForChild("HUD")
local majEtat = ReplicatedStorage.Remotes:WaitForChild("MiseAJourEtat")

majEtat.OnClientEvent:Connect(function(etat, tempsRestant, message)
	local minutes = math.floor(tempsRestant / 60)
	local secondes = tempsRestant % 60

	hud.Timer.Text = string.format("%02d:%02d", minutes, secondes)
	hud.Etat.Text = message

	if etat == "PLANQUE" then
		hud.Etat.TextColor3 = Color3.fromRGB(0, 200, 0)
	elseif etat == "CHASSE" then
		hud.Etat.TextColor3 = Color3.fromRGB(220, 0, 0)
	else
		hud.Etat.TextColor3 = Color3.fromRGB(255, 255, 255)
	end
end)
```

`string.format("%02d:%02d", ...)` affiche `03:07` au lieu de `3:7`. C'est le même `printf` que tu connais.

### ✅ Test de validation
Le timer décompte en temps réel, le message change à chaque phase, la couleur suit.

### ⚠️ Piège
`StarterGui` est un **modèle**. À la connexion, son contenu est copié dans `Player.PlayerGui`. Ton LocalScript doit lire `PlayerGui`, pas `StarterGui`. Erreur classique.

---

## PHASE 7 — Score et fin de partie

*~1 session*

### 🎯 Objectif
Les points s'attribuent et s'affichent dans le classement Roblox.

### 🧠 Ce que tu apprends
Leaderstats, IntValue, cycle complet d'une partie.

### 🔨 Étapes

**7.1 — Les leaderstats**

```lua
local Players = game:GetService("Players")

Players.PlayerAdded:Connect(function(player)
	-- Le nom "leaderstats" est un mot-clé Roblox.
	-- Un dossier portant EXACTEMENT ce nom s'affiche
	-- automatiquement dans le classement en haut à droite.
	local stats = Instance.new("Folder")
	stats.Name = "leaderstats"
	stats.Parent = player

	local points = Instance.new("IntValue")
	points.Name = "Points"
	points.Value = 0
	points.Parent = stats
end)
```

**7.2 — Attribuer les points**

- Chercheur qui trouve quelqu'un : `+15` (dans le `OnServerEvent` de la phase 5)
- Caché survivant à la fin de la manche : `+10`

**7.3 — Le bilan de manche**
Pendant l'état RÉSULTATS, diffuse un message : « 3 cachés ont survécu » ou « Tous trouvés ! ».

**7.4 — La sauvegarde (optionnel)**
Si tu veux que les points persistent entre les sessions : DataStore + `pcall`, voir section 10 du cours.

C'est parfaitement optionnel pour une v1. Un party game se joue très bien sans progression.

### ✅ Test de validation
Les points montent, le classement Roblox les affiche, le cycle s'enchaîne proprement.

---

## PHASE 8 — Publication

*~1 session*

### 🎯 Objectif
Le jeu est en ligne et jouable par d'autres.

### 🔨 Étapes

**8.1 — Réglages**
- `File` → `Publish to Roblox`
- Titre, description, miniature (une capture d'écran suffit)
- Genre : Adventure ou Party
- **Public** : coche « Public » quand tu es prêt, sinon garde en privé et invite via un lien

**8.2 — Configuration serveur**
Dans les paramètres du jeu sur le site : `Max Players` à 12. Un prop hunt avec trop de monde devient illisible.

**8.3 — Test réel**
Invite 3-4 personnes. Regarde-les jouer **sans rien expliquer**.

Ce que tu observes là vaut plus que toutes tes hypothèses : ce qu'ils ne comprennent pas, ce qui les fait rire, ce qui les frustre.

**8.4 — Correctifs**
Note tout. Corrige uniquement ce qui bloque la compréhension ou casse le jeu. Le reste part en v2.

### ⚠️ Note
Le nombre de joueurs sera de zéro au début. **C'est normal, ça n'a aucune importance.** Tu as fini un jeu. C'est l'objectif, et c'est déjà plus que ce que 95 % des gens qui ouvrent Studio arrivent à faire.

---

## PHASE 9 — Après (optionnel)

Uniquement si le jeu tourne **et** que tu as encore envie. Aucune obligation.

**Confort de jeu**
- Choix du prop par le joueur (menu au début de la manche)
- Verrouillage de rotation du prop
- Sons d'ambiance et de capture
- Indices automatiques en fin de manche (les cachés émettent un son)

**Contenu**
- Le deuxième gymnase
- Le troisième gymnase
- Plus de props
- Habillage MABB — c'est **ici** que ça arrive, pas avant

**Systèmes**
- Sauvegarde DataStore
- Statistiques (parties jouées, meilleur temps de survie)
- Système de niveaux

**Idées v2 en vrac**
*(écris ici toutes les idées qui te viennent pendant le développement — c'est ce qui t'évitera de les implémenter tout de suite)*

- …
- …

---

## Architecture des fichiers

```
ServerScriptService/
└── Serveur/
    ├── BoucleDeJeu.lua           (phase 3)
    ├── GestionEquipes.lua        (phase 2)
    ├── GestionProps.lua          (phase 4)
    ├── GestionCapture.lua        (phase 5)
    └── Leaderstats.lua           (phase 7)

ReplicatedStorage/
├── Remotes/
│   ├── MiseAJourEtat            (RemoteEvent)
│   └── TenterCapture            (RemoteEvent)
├── Modules/
│   └── Config.lua               (phase 3)
└── Props/
    ├── Banc                     (Model)
    ├── Plot                     (Model)
    └── ...

StarterPlayer/StarterPlayerScripts/
└── Client/
    ├── Camera.lua               (phase 4)
    ├── Capture.lua              (phase 5)
    └── HUD.lua                  (phase 6)

StarterGui/
└── HUD                          (ScreenGui, phase 6)

Workspace/
└── Gymnase/                     (phase 1)
```

**Règle de lecture** : tout ce qui est dans `ServerScriptService` est invisible et intrafraudable pour les joueurs. Tout le reste est lisible par n'importe qui. Ne mets jamais de logique décisive ailleurs que dans `ServerScriptService`.

---

## Journal de bord

Remplis-le à chaque session. C'est le meilleur remède contre l'abandon : quand tu reviens après deux semaines, tu sais exactement où reprendre.

| Date | Phase | Fait | Bloqué sur | Prochaine étape |
|---|---|---|---|---|
| | | | | |
| | | | | |
| | | | | |

---

## Les cinq règles à garder en tête

1. **Une phase = un truc jouable.** Ne passe jamais à la suivante avec une phase à moitié faite.
2. **La map moche est une décision, pas un défaut.** L'esthétique arrive en phase 9.
3. **Le serveur décide, le client affiche.** Toujours.
4. **Toute nouvelle idée va dans "Idées v2".** Sans exception.
5. **Fini vaut mieux que parfait.** Un prop hunt basique publié t'apprend dix fois plus qu'un chef-d'œuvre à 40 %.
