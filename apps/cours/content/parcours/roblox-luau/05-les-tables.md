---
titre: "Les tables : la structure de données universelle"
parcours: "roblox-luau"
ordre: 5
niveau: "debutant"
duree: 25
date: 2026-07-27
---

## Le cours

En Luau, il n'y a **qu'une seule structure de données** : la table. Elle joue tous les rôles à la fois : le tableau JS, l'objet JS, le tableau associatif PHP, le dictionnaire. Là où le web te fait jongler entre `Array`, objets et `Map`, Luau te donne un seul outil. C'est déroutant deux minutes, puis très confortable.

**Table en mode liste (tableau).**

```lua
local armes = {"Épée", "Arc", "Bouclier"}

print(armes[1])       -- Épée   ← INDEX 1, pas 0
print(#armes)         -- 3      ← le # donne la longueur

table.insert(armes, "Bâton")     -- ajoute à la fin (ton push)
table.remove(armes, 2)           -- retire l'élément 2 (Arc)

for index, arme in ipairs(armes) do
	print(index .. " : " .. arme)
end
```

Rappel de la leçon 4 qui prend tout son sens ici : **le premier élément est `armes[1]`**. Écrire `armes[0]` ne provoque même pas d'erreur — ça renvoie silencieusement `nil`, et ton bug apparaîtra trois lignes plus loin. C'est plus sournois qu'en JS où `array[array.length]` renvoie aussi `undefined` : ici c'est la case zéro, celle que tes réflexes visent en premier.

**Table en mode dictionnaire (objet).**

```lua
local joueur = {
	nom = "Clavel",
	niveau = 12,
	vie = 100
}

print(joueur.nom)        -- Clavel
print(joueur["nom"])     -- Clavel (même chose)

joueur.vie = 75          -- modifier
joueur.equipe = "Rouge"  -- ajouter une clé, à la volée
```

C'est exactement ton objet JS ou ton tableau associatif PHP : accès par point ou par crochets, ajout de clés à la volée. Pour parcourir : `for cle, valeur in pairs(joueur) do ... end`.

**`ipairs` vs `pairs`** — la distinction à connaître par cœur :

- **`ipairs`** : pour les **listes**. Parcourt 1, 2, 3... dans l'ordre, et **s'arrête au premier trou**. Si `t[3]` est `nil`, `t[4]` ne sera jamais visité.
- **`pairs`** : pour les **dictionnaires**. Parcourt toutes les clés, mais **l'ordre n'est pas garanti** — comme les clés d'un objet JS dont tu ne devrais jamais présumer l'ordre.

Règle simple : liste numérotée → `ipairs` ; clés nommées → `pairs`. Si tu utilises `pairs` sur une liste, ça marche mais l'ordre peut te surprendre ; si tu utilises `ipairs` sur un dictionnaire, tu n'obtiens rien du tout.

**Tables imbriquées** — et c'est là que ça devient puissant :

```lua
local inventaire = {
	{nom = "Épée", degats = 25},
	{nom = "Arc", degats = 15}
}

print(inventaire[1].nom)      -- Épée
print(inventaire[2].degats)   -- 15
```

C'est ton JSON, en gros. Une table Luau imbriquée = la réponse d'une API REST = une ligne Supabase avec ses relations = un tableau associatif PHP multidimensionnel. Si tu as compris les tableaux associatifs PHP, tu as compris les tables Luau. Et c'est exactement ce format que tu enverras plus tard au DataStore (leçon 10) : sauvegarder les données d'un joueur, c'est sauvegarder une table.

Dernier point utile pour la suite : les tables servent aussi de **données de configuration**. Plutôt que de coder en dur dix plateformes une par une, tu décris ta map dans une table (positions, couleurs) et une boucle la construit. Données séparées de la logique — le même principe que tes fixtures ou ton seed de base de données. C'est ce que tu vas faire tout de suite.

## À retenir

- Une seule structure : la **table**. Elle fait tableau, objet, dictionnaire — tout.
- Liste : index **à partir de 1**, `#t` pour la longueur, `table.insert` / `table.remove`. `t[0]` renvoie `nil` sans erreur : piège silencieux.
- `ipairs` pour les listes (ordre garanti, s'arrête au premier trou) ; `pairs` pour les dictionnaires (toutes les clés, ordre non garanti).
- Table imbriquée = ton JSON. Tableaux associatifs PHP compris = tables Luau comprises.
- Séparer les données (une table de config) de la logique (une boucle qui la lit) : même réflexe qu'un seed de BDD.

## Mise en pratique

Objectif : générer les plateformes suivantes de ton obby à partir d'une table de configuration.

1. Dans `ServerScriptService`, crée un Script nommé `GenerateurPlateformes`.
2. Tape ce script :

```lua
local configs = {
	{position = Vector3.new(0, 12, -40), couleur = "Bright yellow"},
	{position = Vector3.new(8, 15, -48), couleur = "Bright orange"},
	{position = Vector3.new(0, 18, -56), couleur = "Bright red"}
}

for index, config in ipairs(configs) do
	local plateforme = Instance.new("Part")
	plateforme.Name = "PlateformeGeneree" .. index
	plateforme.Size = Vector3.new(8, 1, 8)
	plateforme.Position = config.position
	plateforme.BrickColor = BrickColor.new(config.couleur)
	plateforme.Anchored = true
	plateforme.Parent = workspace.Obby
end

print(#configs .. " plateformes générées")
```

3. Lance **Play** : trois nouvelles plateformes colorées doivent apparaître en hauteur, dans le prolongement de ton parcours, et l'Output affiche « 3 plateformes générées ». Vérifie dans l'Explorer : elles sont bien dans `Obby`. (Elles n'existent qu'en Play pour l'instant — c'est normal, elles sont créées par le script à chaque lancement.)
4. Ajuste les `Vector3.new(x, y, z)` de la table pour que les sauts soient faisables depuis `Plateforme3` (souviens-toi : **Y est la hauteur**). Teste, ajuste, reteste.
5. Ajoute une 4e entrée dans la table `configs` sans toucher à la boucle. Relance : quatre plateformes. C'est toute la puissance de la séparation données/logique.
6. **Stop**, `Ctrl+S`.

**Résultat attendu** : ton obby se prolonge avec des plateformes générées par code depuis une table, et ajouter une plateforme = ajouter une ligne de données, pas une ligne de logique.
