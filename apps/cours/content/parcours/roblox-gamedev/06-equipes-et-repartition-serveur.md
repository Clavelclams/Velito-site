---
titre: "Équipes et répartition serveur : PlayerAdded, Teams et Fisher-Yates"
parcours: "roblox-gamedev"
ordre: 6
niveau: "intermediaire"
duree: 25
date: 2026-08-11
---

## Le cours

Un prop hunt sans équipes n'est qu'une map. Cette leçon met en place la première **vraie logique serveur** de ton jeu : répartir les joueurs en Cachés et Chercheurs, équitablement, à chaque manche.

### Le service Teams

`Teams` est un service Roblox : tu y insères des objets `Team`, et chaque joueur a une propriété `player.Team`. Pour le Prop Hunt : `Cachés` (Bright green) et `Chercheurs` (Bright red). Détail crucial de ta roadmap : **décoche `AutoAssignable`** sur les deux. Si tu le laisses coché, Roblox assigne automatiquement les arrivants à l'équipe la moins peuplée — or ici, c'est **ton serveur** qui décide qui va où, au moment que **ta boucle de jeu** choisit. Même logique qu'en web : tu ne laisses pas le framework attribuer des rôles par défaut quand la répartition est une règle métier.

Effet de bord à connaître (le piège de la phase 2) : changer `player.Team` fait **respawn** le joueur. C'est en réalité pratique : au début de chaque manche, la répartition remet tout le monde aux points de spawn — et si tu as décoché `Neutral` sur tes SpawnLocations en réglant leur `TeamColor`, chaque équipe apparaît chez elle.

### PlayerAdded : le point d'entrée

```lua
Players.PlayerAdded:Connect(function(player)
	player.Team = equipeCaches   -- par défaut en attendant la prochaine manche
	print(player.Name .. " a rejoint")
end)
```

`PlayerAdded` est ton hook d'inscription : tout ce qu'un joueur doit avoir en arrivant (équipe par défaut, leaderstats en phase 7, chargement de données) se branche ici. Un arrivant en pleine manche est mis chez les Cachés en attendant — il sera vraiment réparti à la manche suivante, quand la boucle appellera `repartirEquipes()`.

### Mélanger équitablement : Fisher-Yates

Si tu répartis toujours dans l'ordre de `Players:GetPlayers()`, les mêmes joueurs seront chercheurs à chaque manche (l'ordre de connexion ne change pas). Il faut **mélanger** la liste. L'algorithme correct s'appelle Fisher-Yates :

```lua
-- On mélange la liste pour que ce ne soit pas toujours les mêmes
-- (on échange chaque élément avec un autre pris au hasard avant lui)
for i = #joueurs, 2, -1 do
	local j = math.random(1, i)
	joueurs[i], joueurs[j] = joueurs[j], joueurs[i]
end
```

On parcourt le tableau de la fin vers le début ; à chaque position `i`, on échange avec un index aléatoire entre 1 et `i`. Chaque permutation possible a exactement la même probabilité — c'est prouvé mathématiquement. Les alternatives naïves (trier avec un comparateur aléatoire, tirer des index au hasard en espérant ne pas répéter) produisent des mélanges **biaisés** ou des boucles infinies. C'est le même besoin qu'un `shuffle()` PHP — sauf qu'ici tu sais ce qu'il y a dedans. Note au passage l'idiome Luau `a, b = b, a` : l'échange sans variable temporaire.

### Le ratio et ses gardes-fous

```lua
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
```

Environ 1 chercheur pour 3 cachés : c'est un choix de game design (un prop hunt où la moitié des joueurs cherchent est invivable pour les cachés). Le `math.max(1, ...)` est un **garde-fou de bord** : à 2 ou 3 joueurs, `math.floor(#joueurs / 4)` vaut 0 — sans le max, aucune manche ne pourrait se jouer. Et le `if #joueurs == 0 then return end` en tête de fonction protège le cas serveur vide. Réflexe à généraliser : chaque fois que tu divises un effectif, demande-toi ce que donnent les valeurs 0, 1 et 2. C'est l'équivalent des cas limites que tu testes sur une pagination ou un panier vide.

Enfin, l'exposition : la roadmap termine par `_G.repartirEquipes = repartirEquipes` pour que `BoucleDeJeu` puisse l'appeler au début de chaque PLANQUE. Tu sais depuis la leçon 4 que la version propre est un ModuleScript — les deux fonctionnent, choisis celle que tu as mise en place.

## À retenir

- `AutoAssignable` décoché : la répartition d'équipes est une règle métier, c'est ton serveur qui décide, pas le moteur.
- Changer `player.Team` fait respawn le joueur — pratique pour remettre tout le monde en place à chaque manche.
- `PlayerAdded` est le hook d'arrivée : équipe par défaut maintenant, leaderstats et données plus tard.
- Fisher-Yates (boucle décroissante + échange aléatoire) est LE mélange équitable ; les mélanges naïfs sont biaisés.
- Garde-fous de bord systématiques : `#joueurs == 0`, `math.max(1, ...)` pour garantir un chercheur. Teste toujours 0, 1, 2 joueurs.

## Mise en pratique

**Ouvre `PropHunt.rbxl`, fais la phase 2 de ta roadmap** ([/projets/prop-hunt](/projets/prop-hunt), PHASE 2 — Les équipes) :

1. **2.1** : `Insert Service` → `Teams`. Insère deux `Team` : `Cachés` (Bright green) et `Chercheurs` (Bright red). Décoche `AutoAssignable` sur les deux.
2. **2.2** : dans `ServerScriptService/Serveur`, crée le `Script` `GestionEquipes` avec le code complet de la roadmap : `repartirEquipes` (mélange Fisher-Yates, ratio 1 chercheur pour 3 cachés, garde-fous), branchement `PlayerAdded`, et l'exposition (`_G.repartirEquipes` ou ton `EquipesModule.repartir` de la leçon 4).
3. Dans `BoucleDeJeu`, décommente/branche l'appel de répartition au début de l'état PLANQUE.
4. Sur tes deux SpawnLocations (leçon 3), décoche `Neutral` et règle `TeamColor` : une pour chaque équipe.

**Résultat attendu** : à chaque début de manche, les joueurs sont mélangés puis répartis, avec toujours au moins un chercheur, et chacun respawn du côté de son équipe.

**Test de validation (roadmap)** : Test → `Clients and Servers` → 3 joueurs → Start. Les personnages ont des couleurs de nom différentes, l'Output confirme les arrivées. Relance plusieurs manches : le chercheur n'est pas toujours le même joueur.
