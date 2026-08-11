---
titre: "Débugger, éviter les pièges classiques et publier ton obby"
parcours: "roblox-luau"
ordre: 11
niveau: "solide"
duree: 30
date: 2026-07-27
---

## Le cours

Dernière ligne droite : savoir lire une erreur, connaître les pièges qui attrapent tous les débutants, et publier.

**Anatomie d'une erreur.** Dans l'Output :

```
Workspace.Part.Script:7: attempt to index nil with 'FindFirstChild'
```

Décodage : `Workspace.Part.Script` = **où** (le chemin exact du script fautif — clique dessus, ça t'y emmène) ; `:7` = **quelle ligne** ; `attempt to index nil` = **quoi** — tu as essayé d'utiliser un objet qui n'existe pas. C'est ta stack trace, en plus court qu'en Symfony : une ligne, trois infos, tout y est. **Lis-la toujours en entier avant de toucher au code.**

**Les erreurs les plus fréquentes**, et leur traduction :

| Message | Traduction | Solution |
|---|---|---|
| `attempt to index nil with 'X'` | L'objet avant le `.X` n'existe pas | Vérifie le chemin, ajoute un `if objet then` |
| `attempt to call a nil value` | Tu appelles une fonction qui n'existe pas | Faute de frappe, ou `.` au lieu de `:` |
| `attempt to perform arithmetic on a string` | Tu additionnes du texte | `tonumber()` pour convertir |
| `Infinite yield possible on 'WaitForChild("X")'` | L'objet X n'arrive jamais | Le nom est faux, ou l'objet n'existe pas |

La première est ta `Cannot read properties of null` de JS, la deuxième son `is not a function`. Mêmes causes, mêmes remèdes.

**La méthode des print.** Sème des `print("On arrive ici")` aux étapes clés, lance, regarde jusqu'où ça va : le dernier print affiché te dit où ça casse. Complète avec `print(typeof(variable))` (savoir ce que c'est), `print(objet:GetFullName())` (le chemin complet d'un objet) et `warn("valeur suspecte : ", x)` (orange, visible). Ce n'est pas élégant, mais c'est redoutablement efficace et tout le monde le fait — c'est ton `console.log` / `dd()`.

**Le test multijoueur** (`Test` → `Clients and Servers` → 2 joueurs → `Start`), déjà pratiqué en leçon 7, est **le seul moyen de vérifier ta séparation serveur/client**. Si un effet n'apparaît que dans une fenêtre alors qu'il devrait être partagé, ton code est dans un LocalScript alors qu'il devait être serveur. À refaire avant chaque publication.

**Les huit erreurs classiques du débutant** — tu les as presque toutes déjà croisées dans ce parcours : 1. **La logique de jeu dans un LocalScript** — le péché originel : le jeu marche en solo, se fait piller dès le premier joueur curieux. Argent, score, dégâts : serveur (leçon 7). 2. **Oublier le debounce** — `.Touched` spamme (leçon 9). 3. **Oublier `Anchored = true`** — « ma map a disparu » (leçon 6). 4. **Confondre `.` et `:`** — `part.Destroy()` échoue (leçon 6). 5. **Coder avant de construire** — la scène d'abord, le code anime ensuite. 6. **Copier des scripts du Toolbox** — on y revient. 7. **Construire en mode Play** — tout est effacé au Stop (leçon 2). 8. **Voir trop gros** — un obby de 10 étapes fini vaut infiniment mieux qu'un MMORPG à 5 %.

**Le Toolbox et ses backdoors — sécurité, encore.** Le Toolbox (la bibliothèque de modèles gratuits) est truffé de modèles contenant des **backdoors** : des scripts cachés qui donnent le contrôle de ton jeu à quelqu'un d'autre. C'est de la supply chain attack, exactement comme un package npm vérolé : tu installes une dépendance, elle exécute du code chez toi avec tous les droits. Les modèles gratuits sont un vecteur d'attaque connu. Si tu en prends un, ouvre-le dans l'Explorer et **inspecte chaque script à l'intérieur** (cherche les Scripts imbriqués, souvent nommés innocemment) — ton audit de dépendances, version manuelle.

**Publier.** `File` → `Publish to Roblox`. Ton jeu est en ligne, hébergé, jouable. Publie **même si personne n'y joue** : le passage par la publication t'apprend des choses que Studio ne t'apprend pas. Pour la suite : la doc officielle `create.roblox.com/docs` et le **DevForum Roblox**. Évite la majorité des tutos YouTube de plus de 2 ans (`wait()`, pratiques non sécurisées serveur/client).

## À retenir

- Une erreur = **où** (chemin cliquable) + **ligne** + **quoi**. `attempt to index nil` = l'objet avant le point n'existe pas.
- La méthode des print : le dernier `print` affiché localise la casse. `typeof()` et `GetFullName()` en renfort.
- Le test multijoueur 2 joueurs est le seul vrai contrôle de ta séparation serveur/client — à faire avant chaque publication.
- Le Toolbox est un vecteur d'attaque (backdoors) : inspecter chaque script d'un modèle importé, comme on audite un package npm.
- Un petit jeu **fini et publié** vaut mieux qu'un grand projet à 5 %. Le serveur décide, le client affiche — jusque dans ton dernier script.

## Mise en pratique

Objectif : finaliser, débugger et publier ton obby.

1. Passe en revue la checklist qualité : toutes les plateformes `Anchored`, le piège avec debounce (leçon 9), la lave, le bouton super-saut validé serveur (leçon 8), l'arrivée qui incrémente `Étapes` et la sauvegarde DataStore (leçon 10). Complète ton parcours à 8-10 plateformes si besoin, avec les techniques des leçons 2 et 5.
2. Exercice de debug volontaire : dans un nouveau Script jetable dans `ServerScriptService`, tape `print(workspace.Obby.PlateformeFantome.Name)`. Lance, lis l'erreur dans l'Output : identifie le chemin, la ligne, le message (`attempt to index nil`). Clique sur l'erreur pour sauter au script. Supprime ce script jetable.
3. Lance un test **2 joueurs** (`Test` → `Clients and Servers`) : vérifie que la mort dans la lave, les dégâts du piège et le compteur d'étapes sont visibles depuis les deux fenêtres clients. Si un comportement n'apparaît que chez un joueur, traque le LocalScript fautif.
4. Ajoute la touche finale : dans `ServerScriptService`, un Script `Bienvenue` avec

```lua
game.Players.PlayerAdded:Connect(function(player)
	print("Bienvenue dans MonObby, " .. player.Name .. " !")
end)
```

5. `File` → `Publish to Roblox` (mets à jour si déjà publié en leçon 10). Puis sur `create.roblox.com`, ouvre ton expérience → `Settings` → passe-la en **Public**.
6. Ouvre Roblox (le jeu, pas Studio) depuis ton compte, lance ton obby depuis sa page, et finis-le en conditions réelles. Envoie le lien à quelqu'un pour un vrai test à deux.

**Résultat attendu** : ton obby est **publié et public** — plateformes, lave, piège à debounce, super-saut validé serveur, arrivée, leaderboard persistant. Tu as un jeu en ligne complet, dont tu peux expliquer chaque ligne de code et chaque choix serveur/client. Exactement ce qu'on attend d'un développeur.
