---
titre: "Valider comme un pro : les 6 contrôles serveur d'une action de jeu"
parcours: "roblox-gamedev"
ordre: 8
niveau: "solide"
duree: 35
date: 2026-08-11
---

## Le cours

Tu connais déjà les RemoteEvents et le principe « ne jamais faire confiance au client ». Cette leçon passe au niveau supérieur : la **checklist complète** des validations d'une action de jeu, appliquée à la capture du Prop Hunt. C'est la phase où la sécurité serveur/client devient concrète — et c'est un savoir directement transposable à ton métier.

### Le modèle de menace

Quand le client envoie `remote:FireServer(cible)`, retiens ceci : **un exploiteur n'utilise pas ton LocalScript**. Il appelle le RemoteEvent directement, avec les arguments de son choix, à la fréquence de son choix. Ton joli code client (le clic, la visée) est une suggestion, pas une barrière — exactement comme la validation JS d'un formulaire : confort côté client, mais la vraie validation est dans le contrôleur Symfony, parce qu'un `curl` contourne le navigateur. Le `OnServerEvent` est ton contrôleur : tout ce qu'il ne vérifie pas est exploitable.

### Les six contrôles de TenterCapture

Le handler de ta roadmap enchaîne six vérifications, chacune répondant à une attaque précise :

```lua
remote.OnServerEvent:Connect(function(player, cible)

	-- ① Rôle : le joueur est-il bien un chercheur ?
	if player.Team ~= Teams["Chercheurs"] then return end

	-- ② Anti-spam : cooldown d'une seconde par joueur
	local maintenant = tick()
	if cooldowns[player] and maintenant - cooldowns[player] < 1 then
		return
	end
	cooldowns[player] = maintenant

	-- ③ Type : l'argument est-il ce qu'on attend ?
	if typeof(cible) ~= "Instance" or not cible:IsA("BasePart") then
		return
	end

	-- ④ Existence : remonter jusqu'au joueur propriétaire du prop
	local modele = cible:FindFirstAncestorOfClass("Model")
	if not modele then return end
	local persoCible = modele
	if modele.Name == "PropActuel" then
		persoCible = modele.Parent
	end
	local joueurTouche = Players:GetPlayerFromCharacter(persoCible)
	if not joueurTouche then return end

	-- ⑤ Camp : la cible est-elle dans l'équipe adverse ?
	if joueurTouche.Team ~= Teams["Cachés"] then return end

	-- ⑥ Distance : la règle métier la plus importante
	local distance = (racineA.Position - racineB.Position).Magnitude
	if distance > DISTANCE_MAX then return end

	-- ✅ Capture légitime
end)
```

**① Rôle** — sans lui, un caché élimine ses coéquipiers. C'est ton contrôle de permissions, le `is_granted('ROLE_ADMIN')` du jeu. **② Cooldown** — un exploiteur peut tirer sur ce Remote des centaines de fois par seconde ; c'est du rate limiting. Note la table `cooldowns[player] = tick()` et son nettoyage dans `PlayerRemoving` — sans lui, fuite mémoire (leçon 10). **③ Type** — le client peut envoyer `nil`, un nombre, une string : `typeof` puis `IsA`, on ne suppose rien. C'est la validation d'entrée, ton `filter_var`/contraintes de formulaire. **④ Existence** — la Part cliquée correspond-elle à un vrai joueur ? On remonte la hiérarchie via `FindFirstAncestorOfClass("Model")`, on reconnaît le contrat `PropActuel` de la phase 4, et `GetPlayerFromCharacter` fait le lien Model → Player. C'est ta vérification « l'id existe en base ». **⑤ Camp** — cible dans l'équipe adverse uniquement : cohérence métier. **⑥ Distance** — LA plus importante : sans elle, un exploiteur élimine toute la map depuis son spawn. C'est une règle métier pure, celle que seul le serveur peut faire respecter.

### L'ordre des contrôles n'est pas un hasard

Regarde : les contrôles les moins chers et les plus discriminants d'abord (rôle, cooldown), les plus coûteux ensuite (remontée de hiérarchie, calcul de distance). Un spammeur est éjecté dès la ligne 2 sans que le serveur ne calcule quoi que ce soit. Même logique qu'un middleware d'authentification qui rejette avant d'atteindre le contrôleur. Et remarque le style : **early return** silencieux. On ne répond rien au client en cas d'échec — pas de message d'erreur qui aiderait un exploiteur à cartographier tes défenses.

### La grille de correspondance à mémoriser

| Vérification | Équivalent web |
|---|---|
| ① Bonne équipe | Contrôle de rôle / permissions |
| ② Cooldown | Rate limiting |
| ③ Type de l'argument | Validation du type d'entrée |
| ④⑤ Cible valide | Vérification d'existence en base |
| ⑥ Distance | Règle métier |

Cette grille est ta checklist réutilisable : l'arrachage de Rush Magasin (phase 3) refait exactement les mêmes contrôles — possession, immunité, distance. **Le client demande. Le serveur décide.** Toujours.

## À retenir

- Un exploiteur appelle le RemoteEvent directement : ton LocalScript est une suggestion, `OnServerEvent` est le vrai contrôleur.
- Les 6 contrôles : rôle, cooldown, type, existence, camp, distance — et leur ordre va du moins cher au plus coûteux.
- La vérification de distance est la plus importante : sans elle, on capture toute la map depuis le spawn.
- Early return silencieux : ne renvoie jamais d'indice à un client invalide.
- Toute table indexée par `player` (cooldowns...) se nettoie dans `PlayerRemoving`.

## Mise en pratique

**Ouvre `PropHunt.rbxl`, fais la phase 5 de ta roadmap** ([/projets/prop-hunt](/projets/prop-hunt), PHASE 5 — La chasse) :

1. **5.1** : la fonction `bloquerJoueur(player, bloque)` (WalkSpeed/JumpPower à 0 puis 16/50), appelée sur les chercheurs au début de la PLANQUE, levée au début de la CHASSE (les TODO de `BoucleDeJeu`).
2. **5.2** : insère le `RemoteEvent` `TenterCapture` dans `ReplicatedStorage/Remotes`.
3. **5.3** : le LocalScript `Capture` dans `StarterPlayerScripts/Client` : `UserInputService.InputBegan`, clic gauche, `souris.Target`, `remote:FireServer(cible)`.
4. **5.4** : dans `ServerScriptService/Serveur`, le `Script` `GestionCapture` avec les **six contrôles dans l'ordre**, `DISTANCE_MAX = 30`, la mise à mort (`humanoid.Health = 0`), et le nettoyage `cooldowns[player] = nil` dans `PlayerRemoving`.
5. **5.6** : la fin anticipée — compte les cachés vivants après chaque capture et fais sortir la CHASSE si le compteur tombe à zéro (la transition supplémentaire vue en leçon 5).

**Résultat attendu** : les chercheurs sont figés pendant la planque, puis peuvent démasquer les cachés au clic, uniquement de près, uniquement des vrais joueurs-props.

**Test de validation (roadmap)** : test en 3 joueurs. Le chercheur clique sur un prop de près → le joueur est éliminé. Il clique de loin → rien. Il clique sur un vrai meuble du décor → rien. Bonus de vérification : fais cliquer un caché sur un autre caché → rien non plus (contrôle ①).
