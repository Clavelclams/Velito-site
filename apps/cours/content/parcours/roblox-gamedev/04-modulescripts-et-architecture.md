---
titre: "ModuleScripts et architecture : sortir de _G, centraliser la configuration"
parcours: "roblox-gamedev"
ordre: 4
niveau: "intermediaire"
duree: 30
date: 2026-08-11
---

## Le cours

Ton `GestionEquipes` de la roadmap expose sa fonction via `_G.repartirEquipes`. La note de la roadmap le dit elle-même : ça marche, mais c'est une mauvaise pratique. Cette leçon explique pourquoi, et t'apprend l'outil propre : le **ModuleScript**.

### Le problème de _G

`_G` est une table globale partagée par tous les scripts d'un même côté (serveur ou client). C'est l'équivalent exact d'une variable globale JS accrochée à `window` : ça dépanne, puis ça pourrit le projet.

- **Aucune traçabilité** : qui a écrit `_G.repartirEquipes` ? Quel script ? Impossible à savoir sans tout lire. Avec `require`, la dépendance est explicite en tête de fichier — comme un `use` en PHP ou un `import` en JS.
- **Problème de timing** : si `BoucleDeJeu` s'exécute avant que `GestionEquipes` ait rempli `_G`, tu appelles `nil` et ça plante — parfois. Un bug intermittent, le pire genre.
- **Aucune autocomplétion, aucune vérification** : une faute de frappe dans le nom te donne `nil` en silence.

### Le ModuleScript : un fichier qui renvoie une valeur

Un `ModuleScript` ne s'exécute pas tout seul. Il est chargé par d'autres scripts via `require()`, et il **renvoie une valeur** — presque toujours une table :

```lua
-- ReplicatedStorage/Modules/Config (ModuleScript)
local Config = {}

Config.JOUEURS_MINIMUM = 2
Config.DUREE_PLANQUE = 30
Config.DUREE_CHASSE = 270      -- 4min30
Config.DUREE_RESULTATS = 10

Config.POINTS_SURVIE = 10      -- caché non trouvé
Config.POINTS_CAPTURE = 15     -- chercheur qui trouve

return Config
```

```lua
-- N'importe quel autre script :
local Config = require(ReplicatedStorage.Modules.Config)
print(Config.DUREE_PLANQUE)   -- 30
```

Propriété capitale : le module est **exécuté une seule fois**, au premier `require`. Tous les appels suivants reçoivent **la même table**, pas une copie. C'est un singleton — le même comportement qu'un service Symfony injecté partout, ou qu'un module ES6 importé dans dix fichiers. Conséquence : un module peut aussi porter un **état partagé** (une table `porteurs`, des compteurs) que plusieurs scripts serveur lisent et modifient ensemble. C'est comme ça qu'on sort de `_G` proprement.

### Pourquoi une Config centralisée

Tout l'équilibrage de ton jeu — durées, points, cooldowns — vit dans **un seul fichier**. Quand tu voudras tester « planque de 20s au lieu de 30 », tu changeras une ligne, sans fouiller la boucle de jeu. C'est la séparation configuration/code que tu pratiques déjà avec les `.env` et les `parameters` Symfony. Dans Rush Magasin, la phase 8 (équilibrage) ne sera possible **que** parce que tous les curseurs sont dans `Config.lua` : tourner un curseur ne doit jamais demander de relire le moteur.

Où le ranger ? Dans `ReplicatedStorage/Modules` : les modules y sont accessibles au serveur **et** aux clients (le HUD pourra lire des durées, par exemple). Attention à la règle de sécurité de ta roadmap : tout ce qui est dans `ReplicatedStorage` est **lisible par n'importe quel joueur**. Une Config de gameplay, oui. Une logique décisive ou un secret, jamais — ça reste dans `ServerScriptService`.

### Un module de fonctions

Un module peut exposer des fonctions, pas seulement des valeurs :

```lua
-- ServerScriptService/Serveur/EquipesModule (ModuleScript)
local Players = game:GetService("Players")
local Teams = game:GetService("Teams")

local EquipesModule = {}

function EquipesModule.repartir()
	-- ... le corps de repartirEquipes de la phase 2 ...
end

return EquipesModule
```

```lua
-- Dans BoucleDeJeu :
local EquipesModule = require(script.Parent.EquipesModule)
EquipesModule.repartir()   -- au lieu de _G.repartirEquipes()
```

La dépendance est déclarée, le timing est garanti (`require` attend que le module soit chargé), l'autocomplétion fonctionne. Note : un ModuleScript **serveur** se range dans `ServerScriptService` — le ranger dans `ReplicatedStorage` exposerait sa logique aux exploiteurs.

Dernière mise en garde : les `require` circulaires (A requiert B qui requiert A) provoquent un blocage. Si deux modules ont besoin l'un de l'autre, c'est un signe que le découpage est mauvais — extrais la partie commune dans un troisième module.

## À retenir

- `_G` = variable globale sauvage : dépendances invisibles, bugs de timing, fautes de frappe silencieuses. Comme accrocher tout à `window` en JS.
- Un ModuleScript renvoie une table via `return` ; on le charge avec `require()` — l'équivalent de `import`/`use`.
- Le module est exécuté **une seule fois** : tous les `require` partagent la même table (singleton), ce qui permet aussi un état partagé propre.
- Config centralisée = tout l'équilibrage dans un fichier, comme un `.env` : on tourne un curseur sans toucher au moteur.
- `ReplicatedStorage` est lisible par tous les joueurs : la config de gameplay oui, la logique décisive non — elle reste dans `ServerScriptService`.

## Mise en pratique

**Ouvre `PropHunt.rbxl`, fais la phase 3.2 de ta roadmap** ([/projets/prop-hunt](/projets/prop-hunt), PHASE 3, étape 3.2) :

1. Dans `ReplicatedStorage/Modules`, crée un `ModuleScript` nommé `Config` et recopie la table de la roadmap (`JOUEURS_MINIMUM`, `DUREE_PLANQUE`, `DUREE_CHASSE`, `DUREE_RESULTATS`, `POINTS_SURVIE`, `POINTS_CAPTURE`), avec le `return Config` final.
2. Teste-le immédiatement : un `Script` jetable dans `ServerScriptService` qui fait `require` et `print(Config.DUREE_PLANQUE)`. Vérifie `30` dans l'Output, puis supprime le script de test.
3. **Refactor bonus (la version pro)** : transforme `GestionEquipes` en ModuleScript `EquipesModule` dans `ServerScriptService/Serveur`, exposant `EquipesModule.repartir()`. Garde le branchement `PlayerAdded` dans un `Script` classique qui `require` le module. Si tu fais ce refactor, pense qu'en phase 3.3 tu appelleras `EquipesModule.repartir()` là où le code de la roadmap écrit `_G.repartirEquipes()` — les deux sont équivalents, le module est juste la version propre annoncée par la note de la phase 2.

**Résultat attendu** : toutes les valeurs d'équilibrage vivent dans `Config`, et plus aucune durée n'est codée en dur ailleurs.

**Test de validation** : change `DUREE_PLANQUE` à 5 dans `Config`, relance : tout ce qui dépend de cette durée suit, sans qu'aucun autre fichier n'ait été modifié.
