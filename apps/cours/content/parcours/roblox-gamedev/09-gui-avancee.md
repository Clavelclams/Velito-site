---
titre: "GUI avancée : UDim2, HUD lisible dans la panique, feedback spectaculaire"
parcours: "roblox-gamedev"
ordre: 9
niveau: "solide"
duree: 30
date: 2026-08-11
---

## Le cours

Ton jeu tourne, mais les joueurs sont aveugles : timer, rôle, cachés restants — tout vit dans l'Output. Cette leçon construit le HUD, et surtout t'apprend à concevoir une interface **pour un joueur en panique**, ce qui est très différent d'une page web.

### UDim2 : échelle vs pixels

Toute position et taille d'un élément GUI Roblox s'exprime en `UDim2` :

```lua
UDim2.new(échelleX, décalageX, échelleY, décalageY)
```

Deux systèmes cohabitent dans le même type : l'**échelle** (proportion de l'écran, 0.5 = la moitié) et le **décalage** (pixels fixes). C'est exactement `%` vs `px` en CSS, fusionnés dans une seule valeur — tu peux même les combiner (`UDim2.new(0.5, -100, 0, 20)` : à la moitié moins 100px).

```lua
label.Size = UDim2.new(0.3, 0, 0.1, 0)      -- 30% de large, 10% de haut
label.Position = UDim2.new(0.35, 0, 0.05, 0)
```

Règle de ta roadmap : **l'échelle en priorité**. Un HUD en pixels fixes conçu sur ton écran déborde sur un téléphone — et une énorme partie des joueurs Roblox sont sur mobile. C'est ton réflexe responsive appliqué au jeu. Complément utile : `AnchorPoint = Vector2.new(0.5, 0)` fait de la position le point d'ancrage du **centre haut** de l'élément — le `transform: translateX(-50%)` de Roblox, parfait pour centrer le timer.

### Le circuit StarterGui → PlayerGui

Piège classique documenté dans ta roadmap : `StarterGui` est un **modèle**. À la connexion (et à chaque respawn par défaut), son contenu est **copié** dans `player.PlayerGui`. Ton LocalScript lit donc toujours `PlayerGui`, jamais `StarterGui` :

```lua
local hud = player:WaitForChild("PlayerGui"):WaitForChild("HUD")
```

Modifier `StarterGui` en jeu ne change rien à l'écran — tu modifierais le template, pas l'instance. Pense blueprint/instance : la classe et l'objet.

### Brancher le HUD sur la machine à états

Le client ne calcule rien : il **reçoit** l'état diffusé par `BoucleDeJeu` et l'affiche. Le script de la roadmap :

```lua
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

`string.format("%02d:%02d", ...)` — le `printf` que tu connais — affiche `03:07` au lieu de `3:7`. Et note la structure : un seul point d'entrée (`OnClientEvent`), qui met à jour toute l'interface. Ton HUD est une **vue** pilotée par les événements du serveur — du MVC où le modèle vit sur le serveur.

### Concevoir pour la panique

Une page web se lit assis, au calme. Un HUD de party game se lit **en une demi-seconde, en pleine course**. La roadmap de Rush Magasin en tire trois règles qui valent pour tous tes jeux :

- **Textes courts, gros, en majuscules** : « FILE EN CAISSE ! », pas « Veuillez vous diriger vers la caisse ».
- **Code couleur constant** : vert = sauvé/sécurité, rouge = danger, blanc = neutre. Le joueur apprend le code une fois, puis le lit sans lire.
- **Une seule info importante à la fois** : hiérarchise. Le timer et la consigne dominent ; le reste est périphérique.

### Le feedback spectaculaire

Un événement de jeu silencieux **tombe à plat** — la roadmap le dit du passage en caisse, c'est vrai de la capture aussi. Quand quelque chose d'important arrive : un son (ceux de Roblox suffisent), un flash de couleur, un message diffusé à tous. Le feedback n'est pas de la décoration : c'est l'information qui fait comprendre le jeu sans tutoriel — la condition même de ta définition de « fini » (« comprennent les règles sans explication »). Un `TweenService` sur la taille d'un label (grossit puis revient) coûte trois lignes et transforme la sensation.

## À retenir

- `UDim2.new(échelleX, décalageX, échelleY, décalageY)` : échelle = `%`, décalage = `px`. Échelle en priorité — pense mobile.
- `StarterGui` est le template, `PlayerGui` l'instance copiée à la connexion : le LocalScript lit toujours `PlayerGui`.
- Le HUD est une vue événementielle : un `OnClientEvent` central reçoit l'état du serveur et met tout à jour. Le client n'invente aucune donnée.
- HUD de party game : court, gros, majuscules, code couleur constant, une info dominante à la fois.
- Tout événement important mérite un feedback son + visuel : silencieux, il tombe à plat.

## Mise en pratique

**Ouvre `PropHunt.rbxl`, fais la phase 6 de ta roadmap, puis enchaîne la phase 7 pour boucler la v1** ([/projets/prop-hunt](/projets/prop-hunt)) :

1. **6.1** : dans `StarterGui`, un `ScreenGui` nommé `HUD` avec trois `TextLabel` : `Timer` (haut centre), `Etat` (sous le timer), `Restants` (haut droite). Positionne tout en **échelle**.
2. **6.3** : le LocalScript `HUD` dans `StarterPlayerScripts/Client` avec le code de la roadmap (format `%02d:%02d`, couleurs par état).
3. Alimente `Restants` : diffuse le nombre de cachés vivants depuis le serveur (ajoute-le aux arguments de `diffuser` ou à un RemoteEvent dédié) — le serveur compte, le client affiche.
4. **Phase 7** : le `Script` `Leaderstats` (dossier `leaderstats` + `IntValue` `Points` dans `PlayerAdded`), `+15` au chercheur dans `GestionCapture`, `+10` par caché survivant pendant RÉSULTATS, et le bilan de manche diffusé (« 3 cachés ont survécu » / « Tous trouvés ! »).

**Résultat attendu** : une v1 complète et jouable — timer, messages colorés, compteur de cachés, points au classement Roblox.

**Test de validation (roadmap, phases 6 et 7)** : le timer décompte en temps réel, le message et sa couleur changent à chaque phase ; les points montent et le classement Roblox les affiche, le cycle s'enchaîne proprement. Vérifie le piège : ton LocalScript lit bien `PlayerGui`, pas `StarterGui`.
