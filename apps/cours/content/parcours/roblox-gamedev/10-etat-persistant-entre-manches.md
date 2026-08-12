---
titre: "L'état qui persiste entre les manches : élimination, spectateurs et fuites mémoire"
parcours: "roblox-gamedev"
ordre: 10
niveau: "solide"
duree: 30
date: 2026-08-11
---

## Le cours

Bienvenue dans le jeu n°2. Rush Magasin réutilise quatre systèmes du Prop Hunt (machine à états, Weld d'objet, RemoteEvent + validations, HUD) — tu démarres avec 40 % du travail fait. Mais il introduit une difficulté nouvelle : dans le Prop Hunt, chaque manche repart de zéro ; ici, **un état survit d'une manche à l'autre** — qui est encore en lice. C'est toute la structure d'un jeu à élimination.

### Trois durées de vie d'état

Prends l'habitude de classer chaque donnée de ton serveur par durée de vie, comme tu distingues variable de requête, session et base de données en web :

- **État de manche** : `porteurs` (qui porte quel article), `valides` (qui est passé en caisse). Remis à zéro à chaque manche.
- **État de partie** : `enLice` (qui joue encore). Survit aux manches, remis à zéro à chaque partie.
- **État permanent** : leaderstats `Victoires`, DataStore. Survit à tout.

La plupart des bugs de jeux à manches viennent d'une donnée rangée dans la mauvaise catégorie — un `valides` jamais vidé, et plus personne n'est éliminable à la manche 2.

### La partie : enLice, éliminer, finir la manche

```lua
local enLice = {}   -- liste des joueurs encore en jeu

local function demarrerPartie()
	enLice = {}
	for _, player in ipairs(Players:GetPlayers()) do
		table.insert(enLice, player)
	end
end

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
	valides = {}      -- état de manche : remis à zéro
	porteurs = {}
	return #enLice
end
```

`finDeManche` illustre le tri par reconstruction : on rebâtit la liste des survivants plutôt que de supprimer en itérant (supprimer dans un tableau **pendant** qu'on le parcourt saute des éléments — même piège qu'en JS). Puis la boucle décide : `restants <= 1` → VICTOIRE, `+1` sur `Victoires`, retour en ATTENTE ; sinon, manche suivante avec un article de moins.

### Les spectateurs : éliminé ≠ éjecté

Règle de design de ta roadmap : **ne sors jamais un éliminé du serveur**. Tu le téléportes sur une plateforme spectateur avec vue sur les caisses — il regarde, il commente, il attend la prochaine partie. Un joueur qui attend est un joueur qui reste ; un joueur éjecté ne revient pas. Techniquement, l'élimination c'est : retrait de `enLice`, `humanoid.Health = 0`, téléportation au respawn vers la zone spectateur.

### Les fuites mémoire : le nettoyage des déconnexions

Le sujet sérieux de cette leçon. Ton serveur accumule des tables indexées par joueur : `porteurs[player]`, `valides[player]`, `immunite[player]`, `cooldowns[player]`. Quand un joueur se déconnecte, **ces entrées ne disparaissent pas toutes seules** : la table garde une référence vers l'objet Player, qui ne peut donc pas être libéré par le garbage collector. C'est une fuite mémoire au sens strict — invisible en test, mortelle sur un serveur qui tourne des heures avec des joueurs qui entrent et sortent.

Pire que la mémoire : les **bugs fantômes**. Un joueur parti reste dans `enLice` ; la boucle attend qu'il passe en caisse ; la partie se bloque sur un fantôme. D'où le nettoyage systématique de la roadmap :

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

Règle d'or : **chaque table indexée par player doit avoir sa ligne dans `PlayerRemoving`**. Quand tu crées une nouvelle table d'état, ajoute son nettoyage dans la même minute. Et le cas limite signalé par la roadmap : tout le monde se déconnecte en pleine manche — ta boucle doit vérifier `#enLice` à chaque étape et savoir revenir en ATTENTE proprement, au lieu d'attendre un joueur qui n'existe plus.

## À retenir

- Classe chaque donnée par durée de vie : manche (`porteurs`, `valides`), partie (`enLice`), permanent (leaderstats). Les resets se font aux bonnes frontières.
- `finDeManche` reconstruit la liste des survivants — on ne supprime jamais dans un tableau pendant qu'on l'itère.
- Un éliminé devient spectateur, jamais éjecté : un joueur qui attend est un joueur qui reste.
- Toute table indexée par `player` sans nettoyage dans `PlayerRemoving` = fuite mémoire + bugs fantômes (partie bloquée sur un joueur parti).
- La boucle doit survivre au pire cas : tout le monde part en pleine manche → retour propre en ATTENTE.

## Mise en pratique

**Crée `RushMagasin.rbxl` et fais les phases 0, 1 et 5 de ta roadmap Rush** ([/projets/rush-magasin](/projets/rush-magasin)) :

1. **Phase 0** : Baseplate → `RushMagasin.rbxl`, arborescence (`Serveur`, `Remotes`, `Modules`, `Articles`, `Client`), puis importe `Config.lua` et `BoucleDeJeu.lua` depuis ton Prop Hunt.
2. **Phase 1** : le magasin gris — sol `160 x 1 x 120`, murs, 6 rayons `40 x 8 x 4` en deux colonnes, zone articles surélevée au centre, 4 tapis de caisse, sas avec `PorteMagasin`, et les trois zones logiques (`ZoneSpawnArticles`, `ZoneCaisse`, `ZoneSas`) dans un Folder `Zones` — tu sais les faire depuis la leçon 3. Vérifie : sas → caisses en 8 à 12 secondes de course.
3. **Phase 5.1** : adapte `BoucleDeJeu` aux états ATTENTE → PREPARATION (10s) → RUSH (45s) → CAISSE (20s) → ELIMINATION (8s), avec retour en PREPARATION s'il reste 2+ joueurs, sinon VICTOIRE (15s) → ATTENTE.
4. **5.2 à 5.6** : `enLice`/`demarrerPartie`/`eliminer`, `finDeManche`, condition de victoire (`Victoires += 1`), plateforme spectateur avec téléportation, et le nettoyage complet dans `PlayerRemoving`.
5. Les phases 2 (ramassage), 3 (arrachage) et 4 (caisse) réutilisent tes acquis des leçons 7 et 8 — fais-les avec les scripts de la roadmap au fil de la semaine, la boucle d'élimination les attend (des joueurs sans article sont simplement tous éliminés en attendant).

**Résultat attendu** : la structure du jeu 2 tourne — manches enchaînées, éliminés en zone spectateur, un vainqueur, retour en attente.

**Test de validation (roadmap, phase 5)** : test en 4 joueurs, une partie complète s'enchaîne du début à la victoire sans intervention. Test du piège : déconnecte un joueur en pleine manche → la partie continue sans se bloquer ; déconnecte tout le monde → retour propre en ATTENTE.
