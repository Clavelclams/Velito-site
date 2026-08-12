---
titre: "Fiabilité et performance : DataStore, pcall, .Touched et anti-exploit"
parcours: "roblox-gamedev"
ordre: 13
niveau: "expert"
duree: 35
date: 2026-08-11
---

## Le cours

Tes deux jeux fonctionnent. Cette leçon les rend **robustes** : capables de tourner des heures, avec des joueurs qui spamment, se déconnectent brutalement, et un DataStore qui a le droit de tomber en panne. C'est la différence entre « ça marche chez moi » et « ça tourne en prod ».

### DataStore : un service distant, avec quotas

Tu as vu le DataStore basique. En production, deux réalités s'imposent. D'abord, **c'est un appel réseau** vers un service externe qui peut échouer — panne, maintenance, latence. Comme tout appel API en web, il s'enveloppe dans une gestion d'erreur. En Luau, c'est `pcall` (protected call) :

```lua
local ok, resultat = pcall(function()
	return store:GetAsync("points_" .. player.UserId)
end)

if ok then
	points.Value = resultat or 0
else
	warn("Chargement échoué pour " .. player.Name .. " : " .. tostring(resultat))
	-- Stratégie : valeurs par défaut, et NE PAS écraser la sauvegarde plus tard
end
```

`pcall` renvoie `ok` (booléen) et le résultat **ou** le message d'erreur — ton try/catch. Sans lui, une panne DataStore fait planter le script entier. La subtilité qui distingue un pro : si le **chargement** a échoué, ne sauvegarde pas en fin de session — tu écraserais la vraie progression du joueur avec les valeurs par défaut. Garde un drapeau `chargementReussi[player]`.

Ensuite, les **quotas** : le nombre de requêtes DataStore par minute est limité (il croît avec le nombre de joueurs). Sauvegarder à chaque point gagné explose le quota et fait rejeter des requêtes. La stratégie standard : sauvegarder **aux moments qui comptent** — à `PlayerRemoving`, et un auto-save périodique (toutes les 1 à 2 minutes) pour limiter la perte en cas de crash serveur. Dernier maillon : `game:BindToClose(fonction)` — quand le serveur s'éteint (mise à jour, crash), Roblox t'accorde quelques secondes pour une dernière sauvegarde de tous les présents. Sans lui, un arrêt serveur peut effacer la session de tout le monde.

### .Touched : un événement qui mitraille

Tes deux jeux reposent sur `.Touched` (ramassage, caisse, arrachage). Sache ce que ça coûte : `.Touched` se déclenche **à chaque contact physique de chaque Part** — un joueur qui court sur un tapis de caisse génère des dizaines d'événements par seconde, multipliés par le nombre de joueurs. Deux conséquences. Un : ton handler doit être **bon marché et sortir vite** — d'où l'ordre des gardes de `ZoneCaisse.Touched` (le `if valides[joueur] then return end` en premier, ton debounce, avant tout travail). Deux : ne branche `.Touched` que sur ce qui en a besoin, et débranche ce qui ne sert plus — un `article.Touched` connecté a disparu avec l'article s'il est `Destroy()`, mais une `Connection` gardée dans une variable sur un objet qui survit doit être `:Disconnect()`. Les connexions oubliées sont l'autre grande famille de fuites, à côté des tables par joueur (leçon 10).

### Physique : la facture des masses et collisions

Réflexes récapitulatifs, tous déjà croisés : `Massless = true` sur tout ce qui est soudé à un personnage (sinon le porteur ralentit) ; `CanCollide = false` sur les props, articles et zones (chaque paire de Parts collidables a un coût, et un prop collidable coince les joueurs) ; `Anchored = true` sur tout le décor (une Part libre est simulée en permanence). Un jeu qui rame avec 12 joueurs a presque toujours l'un de ces trois réglages manquant quelque part.

### L'anti-exploit : récapitulatif du parcours

Tu as maintenant tous les morceaux du modèle de sécurité. La synthèse tient en quatre lignes :

1. **Topologie** : la logique décisive vit dans `ServerScriptService` — invisible et intrafraudable. Tout le reste (`ReplicatedStorage`, scripts clients) est lisible par n'importe qui.
2. **Frontière** : chaque RemoteEvent est une porte d'entrée publique. Les six contrôles (rôle, cooldown, type, existence, camp, distance) s'appliquent à **chaque** porte — capture du Prop Hunt, vol et caisse du Rush.
3. **Données** : le client n'écrit jamais une donnée de jeu ; il demande, le serveur décide et diffuse.
4. **Silence** : les rejets ne renvoient rien — aucun indice à l'attaquant.

L'audit de sécurité de ton jeu, c'est lister les Remotes et vérifier la checklist sur chacun — exactement comme auditer les routes d'une API.

## À retenir

- Tout appel DataStore dans un `pcall` ; si le chargement a échoué, on ne sauvegarde pas par-dessus (drapeau `chargementReussi`).
- Quotas : sauvegarde à `PlayerRemoving` + auto-save périodique + `BindToClose` pour l'arrêt serveur. Jamais à chaque point gagné.
- `.Touched` mitraille : debounce en première ligne du handler, et `:Disconnect()` sur les connexions qui survivent à leur objet.
- Physique : `Massless` sur le soudé, `CanCollide = false` sur props/zones, `Anchored` sur le décor — les trois réglages qui font ramer un serveur quand ils manquent.
- Audit anti-exploit = lister les RemoteEvents et vérifier les six contrôles sur chacun, comme les routes d'une API.

## Mise en pratique

**Durcis tes deux jeux — ouvre `PropHunt.rbxl` puis `RushMagasin.rbxl` et déroule cette checklist** (elle prolonge la phase 7.4 du Prop Hunt et prépare les publications) :

1. **DataStore (Prop Hunt, sauvegarde des Points)** : implémente chargement à `PlayerAdded` et sauvegarde à `PlayerRemoving`, chaque appel dans un `pcall` avec `warn` en cas d'échec ; drapeau `chargementReussi` qui bloque la sauvegarde si le chargement a raté ; auto-save toutes les 120 secondes ; `BindToClose` qui sauvegarde tous les joueurs présents. Vérifie que « Enable Studio Access to API Services » est actif (phase 0).
2. **Audit `.Touched` (Rush)** : relis `brancherArticle` et `ZoneCaisse.Touched` — les gardes bon marché sortent en premier ? Ajoute un compteur de débogage temporaire (`print` du nombre d'appels sur 10 secondes) sur la zone caisse pour **voir** la mitraille, puis retire-le.
3. **Audit physique (les deux jeux)** : parcours props, articles et zones — `Massless`, `CanCollide`, `Anchored` conformes partout, y compris les Parts imbriquées.
4. **Audit anti-exploit (les deux jeux)** : liste chaque RemoteEvent (`TenterCapture`, `MiseAJourEtat`...) dans ton journal de bord et coche les six contrôles pour chacun. `MiseAJourEtat` est serveur → client : vérifie qu'aucun code serveur n'écoute ce que le client pourrait y envoyer.
5. **Test de chaos** : en mode Test multi-joueurs, déconnecte brutalement des joueurs pendant chaque état de chaque jeu.

**Résultat attendu** : aucune erreur en Output pendant le test de chaos, les points survivent à une reconnexion, et ton journal contient l'audit des Remotes.

**Test de validation** : coupe l'accès API (décoche Studio Access to API Services) et lance : le jeu doit continuer à tourner avec des valeurs par défaut et des `warn` propres — jamais un crash. Rétablis l'accès ensuite.
