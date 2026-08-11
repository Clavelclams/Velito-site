---
titre: "Les RemoteEvents : faire communiquer client et serveur"
parcours: "roblox-luau"
ordre: 8
niveau: "intermediaire"
duree: 30
date: 2026-07-27
---

## Le cours

Problème posé par la leçon 7 : le client détecte le clavier et les clics, mais seul le serveur a le droit de modifier ce qui compte. Comment le client demande-t-il au serveur d'agir ? Avec un **RemoteEvent**. C'est ton appel `fetch()` vers une route PHP, ou ta requête vers une API Route Next.js : le client envoie une demande, le serveur la traite — et surtout, la **valide**.

**Mise en place.** Un RemoteEvent doit être visible des deux côtés, donc il vit dans `ReplicatedStorage` (le dossier partagé, souviens-toi : ton `/public`) :

1. Dans `ReplicatedStorage`, insère un **RemoteEvent**.
2. Renomme-le, par exemple `DemandeSaut`. Le nom, c'est ton endpoint — comme une route `/api/demande-saut`.

**Côté client (LocalScript)** — détecter la touche et prévenir le serveur :

```lua
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local evenement = ReplicatedStorage:WaitForChild("DemandeSaut")

local UserInputService = game:GetService("UserInputService")

UserInputService.InputBegan:Connect(function(input, tapeDansUnChat)
	if tapeDansUnChat then return end   -- il écrit dans le chat, on ignore

	if input.KeyCode == Enum.KeyCode.E then
		evenement:FireServer()
	end
end)
```

`UserInputService` est le service qui écoute le clavier/la souris — ton `keydown` listener. `FireServer()` envoie la requête. Note le `WaitForChild` : côté client, le chargement est progressif, on attend que l'objet soit répliqué (le même réflexe que d'attendre le chargement avant d'attacher tes listeners en JS).

**Côté serveur (Script)** — recevoir et décider :

```lua
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local evenement = ReplicatedStorage:WaitForChild("DemandeSaut")

evenement.OnServerEvent:Connect(function(player)
	-- ATTENTION : le serveur reçoit TOUJOURS le player en 1er argument,
	-- automatiquement. Le client ne peut pas mentir dessus.
	local perso = player.Character
	if not perso then return end

	local humanoid = perso:FindFirstChildWhichIsA("Humanoid")
	if humanoid then
		humanoid.JumpPower = 100
	end
end)
```

Ce `player` automatique est précieux : c'est Roblox qui identifie l'expéditeur, comme une session authentifiée côté serveur. Le client ne choisit pas qui il prétend être — pas de « je suis l'admin » dans le payload.

**⚠️ Le piège de sécurité à comprendre absolument.** Un RemoteEvent peut être **déclenché par n'importe quel joueur, avec n'importe quels arguments, à n'importe quel moment**. Ton LocalScript propre qui n'envoie la demande que sur la touche E ? L'exploiteur s'en fiche : il appelle directement `FireServer()` lui-même, 1000 fois par seconde, avec des valeurs absurdes. Exactement comme un attaquant qui ignore ton formulaire HTML et envoie ses requêtes à ton endpoint via curl ou Postman. Le front ne protège rien — ni sur le web, ni ici.

Donc **le serveur valide toujours** :

```lua
-- ❌ Faille béante
evenement.OnServerEvent:Connect(function(player, montant)
	donnerArgent(player, montant)
	-- Le joueur envoie montant = 999999999 et gagne
end)
```

```lua
-- ✅ Le serveur décide
evenement.OnServerEvent:Connect(function(player)
	if not joueurPeutRecevoirBonus(player) then return end
	donnerArgent(player, 100)   -- montant fixé PAR LE SERVEUR
end)
```

La règle de conception : **le client exprime une intention (« je veux X »), jamais une valeur (« donne-moi 999999 »)**. Les montants, les résultats, les droits : fixés par le serveur. C'est le même raisonnement qu'une requête SQL préparée : tu ne fais jamais confiance à l'entrée. Et pense au rate limiting : un `OnServerEvent` peut aussi vérifier « pas plus d'une demande par seconde » — un debounce côté serveur, tu verras ce pattern à la leçon 9.

**RemoteFunction** : la variante qui **renvoie** une valeur (comme un `fetch` dont tu attends la réponse). Plus rare, et à éviter du serveur vers le client — si le client ne répond pas, ton serveur reste bloqué à attendre.

## À retenir

- RemoteEvent = ton `fetch()` vers le serveur. Il vit dans `ReplicatedStorage` ; client : `FireServer()`, serveur : `OnServerEvent`.
- Le serveur reçoit **automatiquement** le `player` expéditeur en premier argument — le client ne peut pas usurper une identité.
- **N'importe quel joueur peut déclencher n'importe quel RemoteEvent, avec n'importe quels arguments, à n'importe quelle fréquence.** Ton LocalScript n'est pas une protection.
- Le client envoie une **intention**, jamais une valeur décisive. Montants et résultats : fixés par le serveur, qui valide tout (comme une requête préparée).
- RemoteFunction = variante avec réponse ; à éviter dans le sens serveur → client.

## Mise en pratique

Objectif : un bouton d'interface qui demande au serveur un super-saut temporaire — avec validation serveur.

1. Dans `ReplicatedStorage`, insère un **RemoteEvent** nommé `DemandeSuperSaut`.
2. Dans `StarterGui`, insère un **ScreenGui**, et dedans un **TextButton**. Dans Properties du bouton : `Text` = « Super Saut », `Size` = `{0, 140},{0, 50}`, position en bas de l'écran.
3. Dans le TextButton, insère un **LocalScript** :

```lua
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local evenement = ReplicatedStorage:WaitForChild("DemandeSuperSaut")

script.Parent.MouseButton1Click:Connect(function()
	evenement:FireServer()
end)
```

4. Dans `ServerScriptService`, crée un Script `GestionSuperSaut` :

```lua
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local evenement = ReplicatedStorage:WaitForChild("DemandeSuperSaut")
local dernierUsage = {}

evenement.OnServerEvent:Connect(function(player)
	local maintenant = os.clock()
	if dernierUsage[player.UserId] and maintenant - dernierUsage[player.UserId] < 10 then
		return   -- refusé : moins de 10 secondes depuis le dernier usage
	end
	dernierUsage[player.UserId] = maintenant

	local perso = player.Character
	if not perso then return end
	local humanoid = perso:FindFirstChildWhichIsA("Humanoid")
	if not humanoid then return end

	humanoid.JumpPower = 100      -- valeur fixée PAR LE SERVEUR
	task.wait(5)
	humanoid.JumpPower = 50       -- retour à la normale
end)
```

5. Lance **Play**. Clique sur le bouton, saute : tu montes beaucoup plus haut pendant 5 secondes. Re-clique immédiatement : rien — le serveur applique son délai de 10 secondes, même si le client spamme.
6. Relis le script serveur et repère les trois validations : le rate limit, le `if not perso`, le `if not humanoid`. C'est ça, un endpoint bien écrit.
7. **Stop**, `Ctrl+S`. Utilise ton super-saut pour atteindre une plateforme haute de ton obby — ajoute-en une hors de portée d'un saut normal si besoin.

**Résultat attendu** : un bouton d'UI fonctionnel qui déclenche un bonus géré et limité côté serveur. Le client demande, le serveur décide — tu viens d'écrire ton premier endpoint sécurisé Roblox.
