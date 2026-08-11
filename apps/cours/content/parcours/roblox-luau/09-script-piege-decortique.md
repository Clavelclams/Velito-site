---
titre: "Décorticage complet du script piège"
parcours: "roblox-luau"
ordre: 9
niveau: "intermediaire"
duree: 25
date: 2026-07-27
---

## Le cours

Ta lave de la leçon 6 tue net : brutal mais simple. Un vrai piège d'obby inflige des **dégâts partiels** — et là, un problème sournois apparaît. Voici le script complet, puis chaque ligne décortiquée :

```lua
local piege = script.Parent
local dejaTouche = false

piege.BrickColor = BrickColor.new("Really red")

local function auContact(autrePartie)
	local perso = autrePartie.Parent
	local humanoid = perso:FindFirstChildWhichIsA("Humanoid")

	if humanoid and not dejaTouche then
		dejaTouche = true
		humanoid:TakeDamage(25)
		task.wait(1)
		dejaTouche = false
	end
end

piege.Touched:Connect(auContact)
```

**`local piege = script.Parent`** — Le Script est placé **dans** la Part : son parent, c'est la Part. Pratique standard : le script se trouve lui-même, ce qui le rend copiable-collable sur n'importe quelle Part sans modification (tu l'as vécu en dupliquant ta lave). Avec `workspace.Part` en dur, il ne marcherait que pour cette Part précise — comme un composant réutilisable versus un sélecteur codé en dur.

**`local dejaTouche = false`** — Un **verrou**, et il est indispensable. `.Touched` ne se déclenche pas une fois : le moteur physique détecte des dizaines de micro-collisions par seconde entre ton pied et la surface. Sans verrou : `Touched → -25 PV`, quatre fois en 0,1 seconde → mort instantanée. Avec verrou : premier contact → dégâts → verrou fermé 1 seconde → verrou rouvert. On perd 25 PV par seconde maximum. Ce pattern s'appelle un **debounce**. Tu le retrouveras partout en développement Roblox — et il existe en JS pour exactement les mêmes raisons (événements `scroll`, `resize`, `input` qui spamment). Tu l'as même déjà écrit en leçon 8 : le rate limit du super-saut est un debounce par joueur.

**`piege.BrickColor = BrickColor.new("Really red")`** — Colore la Part par code. `BrickColor` est une palette de couleurs nommées propre à Roblox (héritage des vraies briques). Pour de la couleur libre : `piege.Color = Color3.fromRGB(255, 0, 0)` — ça, c'est ton CSS.

**`local function auContact(autrePartie)`** — Roblox appelle cette fonction en lui passant **la partie qui a touché**. Point crucial : ce sera un membre du corps — `LeftFoot`, `RightHand`, `HumanoidRootPart` — **jamais le personnage entier**. Comme un `event.target` qui pointe sur le `<span>` cliqué, pas sur la carte entière.

**`local perso = autrePartie.Parent`** — Donc on remonte d'un cran. Un personnage est un Model contenant `Humanoid`, `Head`, `LeftFoot`, etc. `LeftFoot.Parent` = le personnage. C'est ton `event.target.parentElement`.

**`local humanoid = perso:FindFirstChildWhichIsA("Humanoid")`** — **La ligne la plus intelligente du script.** Elle répond à : « ce qui m'a touché, est-ce un être vivant ? ». `.Touched` se déclenche pour **tout** : joueur, PNJ, caillou, balle, débris. Sans ce test, ton script plante ou fait n'importe quoi. La présence d'un `Humanoid` est le marqueur universel : s'il y en a un, c'est un personnage ; sinon, on ignore. Pourquoi `FindFirstChildWhichIsA` et pas `FindFirstChild("Humanoid")` ? Le premier cherche par **type** (la classe de l'Instance), le second par **nom**. Chercher par type est plus robuste : ça marche même si l'objet a été renommé — `querySelector("div")` versus `getElementById("div1")`, en somme.

**`if humanoid and not dejaTouche then`** — Deux conditions : `humanoid` existe (souviens-toi : `nil` est faux, donc `if humanoid` teste l'existence) et le verrou est ouvert. Syntaxe `and` / `not`, pas `&&` / `!`.

**`humanoid:TakeDamage(25)`** — Deux-points → méthode. `TakeDamage` respecte les **ForceField** (le bouclier temporaire au spawn), contrairement à `humanoid.Health = humanoid.Health - 25` qui traverse les protections. Toujours passer par la méthode métier plutôt que modifier la donnée brute — un setter qui applique les règles, pas un accès direct au champ.

**`task.wait(1)` puis `dejaTouche = false`** — Pause d'une seconde, puis réouverture du verrou. Détail important : la fonction est **suspendue**, mais le reste du jeu continue. Chaque déclenchement de `.Touched` s'exécute dans sa propre coroutine — le serveur n'est jamais bloqué.

**`piege.Touched:Connect(auContact)`** — On branche. Note : `auContact` **sans parenthèses** — on passe la fonction elle-même. Avec `auContact()`, tu l'exécuterais immédiatement et passerais son résultat (`nil`) à Connect. Erreur classique, identique en JS avec `addEventListener("click", maFonction())`.

## À retenir

- `script.Parent` rend un script **réutilisable** : il se réfère à la Part qui le contient, où qu'elle soit.
- `.Touched` spamme des dizaines d'événements par seconde → **debounce obligatoire** (un booléen verrou + `task.wait`). Même pattern qu'en JS sur `scroll`/`input`.
- `.Touched` renvoie un membre du corps, jamais le personnage : on remonte avec `.Parent`, puis on vérifie `FindFirstChildWhichIsA("Humanoid")` — chercher par **type**, plus robuste que par nom.
- `humanoid:TakeDamage(25)` plutôt que modifier `Health` à la main : la méthode respecte les protections (ForceField).
- `Connect(auContact)` sans parenthèses : on passe la fonction, on ne l'appelle pas.

## Mise en pratique

Objectif : remplacer une lave mortelle par un vrai piège à dégâts, puis prouver l'utilité du debounce.

1. Dans ton obby, sélectionne une de tes deux `Lave` (leçon 6). Renomme-la `Piege`, passe son `BrickColor` en orange (`Neon` conservé) : ce piège blesse, il ne tue plus.
2. Ouvre son script et remplace tout le contenu par le script piège complet du cours (tape-le, ne le copie pas machinalement).
3. Lance **Play**, marche sur le piège et reste dessus. Ouvre l'Output et observe : tu perds 25 PV par seconde environ, pas plus. Tu survis si tu repars vite. Meurs sur place pour vérifier le respawn, puis **Stop**.
4. Expérience contrôlée : commente les lignes du verrou en mettant `--` devant `dejaTouche = true`, `task.wait(1)` et `dejaTouche = false`. Relance, touche le piège : mort quasi instantanée — c'est le spam de `.Touched` sans debounce. Décommente tout.
5. Ajoute un `print("Contact de : " .. autrePartie.Name)` en première ligne de `auContact` et relance : tu verras défiler `LeftFoot`, `RightHand`... la preuve que c'est un membre qui touche, jamais le personnage.
6. Enlève le print de debug, **Stop**, `Ctrl+S`. Garde ta deuxième lave mortelle telle quelle : un obby varie ses dangers.

**Résultat attendu** : ton obby a un piège à 25 dégâts avec debounce fonctionnel et une lave mortelle, et tu as constaté expérimentalement ce qui se passe sans verrou. Tu sais désormais lire ce script ligne par ligne — et le réécrire de mémoire.
