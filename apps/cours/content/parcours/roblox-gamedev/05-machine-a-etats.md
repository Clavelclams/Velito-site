---
titre: "La machine à états : la colonne vertébrale de ton jeu"
parcours: "roblox-gamedev"
ordre: 5
niveau: "intermediaire"
duree: 35
date: 2026-08-11
---

## Le cours

Ta roadmap le dit : la phase 3 est **la plus formatrice du projet**. La machine à états, tu la retrouveras partout — dans Rush Magasin, dans un panier de commande Symfony (panier → payé → expédié), dans un workflow de validation. Ici, tu la construis de tes mains.

### Le principe : un seul état à la fois

Une machine à états, c'est deux règles : à tout instant, le jeu est dans **un seul** état ; et les **transitions** entre états sont définies à l'avance.

```
   ATTENTE  ──(assez de joueurs)──▶  PLANQUE (30s)
      ▲                                  │
      │                                  ▼
  RÉSULTATS (10s) ◀──(temps écoulé      CHASSE (4min30)
      ▲              ou tous trouvés)     │
      └──────────────────────────────────┘
```

L'alternative — dix booléens `enPartie`, `planqueFinie`, `chasseActive`... — finit toujours pareil : deux booléens contradictoires (`planqueFinie = true` ET `chasseActive = false` : on est où ?) et des bugs introuvables. Avec la machine à états, **à tout moment tu sais où tu en es**. C'est le pattern « statut de commande » : une commande est `payée` OU `expédiée`, jamais un brouillard de flags.

### L'implémentation : une boucle infinie séquentielle

Ta `BoucleDeJeu.lua` implémente la machine de la façon la plus simple qui soit : un `while true do` dont **la position dans le code EST l'état courant** :

```lua
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

Pas d'objet `State`, pas d'énumération : la séquence du code garantit les transitions. Pour un party game à cycle fixe, c'est le bon niveau de complexité. Un point vital hérité de ton parcours Luau : un `while true do` sans `task.wait()` dans **chaque** chemin d'exécution gèle le serveur. Ici, `compteARebours` attend une seconde par tour et l'attente de joueurs attend 2s — vérifie ce réflexe à chaque branche que tu ajouteras.

### Diffuser l'état : le serveur parle, les clients écoutent

Fil rouge du parcours : **le serveur décide, le client affiche**. La boucle tourne côté serveur ; les clients doivent être informés pour afficher timer et messages. D'où le RemoteEvent créé par code :

```lua
local majEtat = Instance.new("RemoteEvent")
majEtat.Name = "MiseAJourEtat"
majEtat.Parent = remotes

-- Prévient TOUS les clients de l'état actuel
local function diffuser(etat, tempsRestant, message)
	majEtat:FireAllClients(etat, tempsRestant, message)
end
```

`FireAllClients` est un **broadcast** : le serveur pousse la même information à tous les clients connectés — pense à un canal Mercure/WebSocket qui notifie tous les navigateurs abonnés. Le client ne calcule jamais le temps restant lui-même : il **reçoit** `tempsRestant` chaque seconde via `compteARebours`, qui boucle de `duree` à 1 en diffusant puis `task.wait(1)`. Si un client triche sur son affichage, il ne triche que pour ses propres yeux — la vraie horloge est sur le serveur.

### Les TODO : l'échafaudage du projet

Relis les commentaires `-- TODO phase 4/5/7`. La boucle tourne **dès aujourd'hui**, à vide : les états s'enchaînent, les messages se diffusent, et chaque phase future viendra remplir un trou identifié. C'est un squelette d'application dont chaque sprint remplit un lot — et surtout, à chaque ajout, tu testes immédiatement dans un système qui tournait déjà. Un bug ne peut venir que de la dernière pièce posée.

Dernier détail : quand tu ajouteras la fin anticipée (« tous les cachés trouvés », phase 5), c'est une **transition supplémentaire** de CHASSE vers RÉSULTATS. Dans une boucle séquentielle, ça se traduit par une condition de sortie dans `compteARebours` — garde ça en tête, tu y reviendras.

## À retenir

- Machine à états = un seul état à la fois + transitions définies. C'est l'antidote aux « dix booléens contradictoires ».
- Dans `BoucleDeJeu`, la position dans le `while true do` **est** l'état courant — pas besoin de plus pour un cycle fixe.
- Chaque chemin de la boucle doit contenir un `task.wait()`, sinon le serveur gèle.
- `FireAllClients` = broadcast serveur → tous les clients ; le client affiche le temps reçu, il ne le calcule jamais. Le serveur décide, le client affiche.
- Les TODO sont l'échafaudage : la boucle tourne à vide dès maintenant, chaque phase remplit son trou et se teste isolément.

## Mise en pratique

**Ouvre `PropHunt.rbxl`, fais la phase 3.3 de ta roadmap** ([/projets/prop-hunt](/projets/prop-hunt), PHASE 3, étapes 3.3 et 3.4) :

1. Dans `ServerScriptService/Serveur`, crée le `Script` `BoucleDeJeu` et recopie le code complet de la roadmap : récupération de `Config` par `require`, création du RemoteEvent `MiseAJourEtat` par code, fonctions `diffuser` et `compteARebours`, puis la boucle principale avec ses quatre états et ses TODO.
2. Si tu as fait le refactor de la leçon 4, remplace `_G.repartirEquipes()` par `EquipesModule.repartir()` — sinon garde `_G` comme dans la roadmap (les équipes arrivent à la leçon 6 : en attendant, tu peux commenter cette ligne pour que la boucle tourne).
3. Réduis temporairement les durées dans `Config` (`DUREE_PLANQUE = 5`, `DUREE_CHASSE = 8`, `DUREE_RESULTATS = 3`) pour observer plusieurs cycles sans attendre 5 minutes. Remets les vraies valeurs ensuite.
4. Ajoute un `print(etat, tempsRestant)` dans `diffuser` le temps du test, pour voir la machine vivre dans l'Output.

**Résultat attendu** : le jeu enchaîne ATTENTE → PLANQUE → CHASSE → RÉSULTATS → PLANQUE... indéfiniment, tout seul, avec les messages diffusés chaque seconde.

**Test de validation (roadmap)** : lance en mode Test `Clients and Servers` avec 2 joueurs. L'Output défile : le jeu enchaîne les états en boucle, indéfiniment. Piège à vérifier : chaque branche de ta boucle contient bien un `task.wait()`.
