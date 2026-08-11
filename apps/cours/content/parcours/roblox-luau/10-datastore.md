---
titre: "Le DataStore : sauvegarder des données"
parcours: "roblox-luau"
ordre: 10
niveau: "solide"
duree: 30
date: 2026-07-27
---

## Le cours

Sans sauvegarde, tout est perdu quand le joueur quitte — comme une appli sans base de données. Le **DataStore** est ta BDD Roblox : pense-y comme une table `clé → valeur`, beaucoup plus limitée que ton SQL. Pas de requêtes, pas de jointures, pas de `WHERE` : tu stockes une valeur sous une clé (typiquement le `UserId` du joueur), tu la relis avec la même clé. Un Redis minimaliste plutôt qu'un PostgreSQL — mais hébergé et répliqué gratuitement par Roblox. Et évidemment, tout se passe **côté serveur** : le client n'accède jamais au DataStore, exactement comme ton navigateur ne parle jamais directement à ta base Supabase sans passer par les policies.

**Prérequis** : dans `Game Settings` → `Security`, active **Enable Studio Access to API Services** (le jeu doit être publié sur Roblox). Sans ça, tout appel DataStore échoue en Studio.

Le script complet, à placer dans `ServerScriptService` :

```lua
local DataStoreService = game:GetService("DataStoreService")
local Players = game:GetService("Players")
local magasin = DataStoreService:GetDataStore("DonneesJoueurs")

-- À la connexion : charger
Players.PlayerAdded:Connect(function(player)
	local leaderstats = Instance.new("Folder")
	leaderstats.Name = "leaderstats"
	leaderstats.Parent = player

	local pieces = Instance.new("IntValue")
	pieces.Name = "Pièces"
	pieces.Parent = leaderstats

	-- pcall = try/catch. OBLIGATOIRE : un appel réseau peut échouer
	local ok, donnees = pcall(function()
		return magasin:GetAsync(player.UserId)
	end)

	if ok and donnees then
		pieces.Value = donnees
	else
		pieces.Value = 0   -- nouveau joueur, ou erreur réseau
	end
end)

-- À la déconnexion : sauvegarder
Players.PlayerRemoving:Connect(function(player)
	local pieces = player.leaderstats.Pièces.Value

	local ok, err = pcall(function()
		magasin:SetAsync(player.UserId, pieces)
	end)

	if not ok then
		warn("Échec sauvegarde pour " .. player.Name .. " : " .. tostring(err))
	end
end)
```

**Trois choses à retenir, dans l'ordre d'importance.**

**1. `pcall` est obligatoire.** C'est le `try/catch` de Luau : `pcall(fonction)` exécute la fonction et renvoie deux valeurs — un booléen de succès, puis le résultat ou l'erreur. Un DataStore est un **appel réseau** vers les serveurs Roblox : il peut échouer (panne, latence, quota), comme n'importe quel `fetch` peut te renvoyer un timeout ou une 500. La différence avec JS : sans `pcall`, une erreur **stoppe ton script entier** — et ici, ce script gère les connexions de TOUS les joueurs. Un seul échec non attrapé, et tous les joueurs suivants perdent leur sauvegarde. C'est ton réflexe try/catch autour d'un appel API, avec un fallback propre (`pieces.Value = 0`).

**2. `leaderstats` est un nom magique.** Un dossier nommé **exactement** `leaderstats` (minuscule comprise) dans un joueur s'affiche automatiquement dans le classement en haut à droite de l'écran. Roblox le détecte par le nom — une convention over configuration à la Symfony : respecte la convention, la fonctionnalité est gratuite. Les `IntValue` qu'il contient deviennent les colonnes du tableau. Note aussi le pattern `Instance.new("Folder")` + réglages + `.Parent` : créer des objets par code, comme un `document.createElement` suivi d'un `appendChild`.

**3. Il y a des quotas.** Roblox limite le nombre de requêtes DataStore par minute (proportionnel au nombre de joueurs). Ne sauvegarde pas à chaque pièce ramassée — c'est l'équivalent d'un `INSERT` par frappe clavier, ton API rate-limiterait pareil. La stratégie standard : sauvegarde **à la déconnexion** (`PlayerRemoving`), plus une **auto-sauvegarde toutes les 2-3 minutes** en tâche de fond. Si le serveur crashe entre deux, on perd au pire 2-3 minutes de progression.

Dernier lien avec la règle d'or : le DataStore ne stocke que ce que **le serveur** a décidé. Si ta valeur de pièces était gérée côté client, tu sauvegarderais des données trafiquées — la persistance hérite de la confiance de la donnée. Serveur de bout en bout.

## À retenir

- DataStore = BDD clé→valeur de Roblox, accessible **uniquement côté serveur**. Clé standard : le `UserId` du joueur.
- **`pcall` = try/catch, obligatoire** autour de chaque `GetAsync`/`SetAsync` : ce sont des appels réseau qui peuvent échouer, et une erreur non attrapée stoppe le script pour tout le monde.
- Un dossier nommé exactement `leaderstats` dans le joueur = classement automatique à l'écran (convention over configuration).
- Quotas : on sauvegarde à la déconnexion + auto-save toutes les 2-3 minutes, jamais à chaque événement.
- On ne persiste que des données gérées par le serveur — sinon on grave la triche dans la base.

## Mise en pratique

Objectif : un compteur d'étapes persistant pour ton obby — quitte le jeu, reviens, ta progression est toujours là.

1. Publie ton jeu si ce n'est pas fait (`File` → `Publish to Roblox`), puis `Home` → `Game Settings` → `Security` → active **Enable Studio Access to API Services**.
2. Dans `ServerScriptService`, crée un Script `Sauvegarde`. Recopie le script complet du cours, en renommant le stat : remplace les deux `"Pièces"` par `"Étapes"` et la variable `pieces` par `etapes` (partout).
3. Ajoute la logique de progression : place une Part fine et verte au bout de ton parcours, nommée `Arrivee` (Anchored, `Material` = Neon). Insère-y un Script :

```lua
local arrivee = script.Parent
local dejaTouche = {}

arrivee.Touched:Connect(function(autrePartie)
	local perso = autrePartie.Parent
	local humanoid = perso:FindFirstChildWhichIsA("Humanoid")
	if not humanoid then return end

	local player = game.Players:GetPlayerFromCharacter(perso)
	if not player then return end
	if dejaTouche[player.UserId] then return end   -- debounce par joueur

	dejaTouche[player.UserId] = true
	player.leaderstats["Étapes"].Value += 1
	task.wait(5)
	dejaTouche[player.UserId] = false
end)
```

4. Lance **Play** : ton pseudo apparaît en haut à droite avec « Étapes : 0 ». Finis le parcours, touche l'arrivée : le compteur passe à 1.
5. **Stop**, puis relance **Play** : le compteur affiche 1 — chargé depuis le DataStore. La persistance fonctionne.
6. Test de robustesse : dans le script `Sauvegarde`, remplace temporairement `GetAsync` par `GetAsyncc` (faute volontaire) et relance : l'Output montre l'échec, mais le jeu continue et le compteur repart à 0 — c'est le `pcall` qui a amorti. Corrige, relance, **Stop**, `Ctrl+S`.

**Résultat attendu** : un leaderboard « Étapes » visible en jeu, incrémenté à l'arrivée côté serveur, sauvegardé à la déconnexion et rechargé à la connexion. Ton obby a maintenant une vraie persistance — et tu as vu `pcall` encaisser une panne sans casser le jeu.
