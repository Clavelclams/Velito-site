---
titre: "CFrame et Vector3 en profondeur : maîtriser l'espace 3D"
parcours: "roblox-gamedev"
ordre: 2
niveau: "intermediaire"
duree: 30
date: 2026-08-11
---

## Le cours

Tu as déjà manipulé des `Position` et des `Size`. Mais pour construire un gymnase propre et, plus tard, coller un prop sur un joueur ou placer un carton « devant, à hauteur de poitrine », il faut comprendre ce qui se cache derrière : `Vector3` et `CFrame`.

### Vector3 : un point ou une flèche

Un `Vector3`, c'est trois nombres `(X, Y, Z)`. Selon le contexte, il représente **une position** (un point dans le monde) ou **un déplacement** (une flèche). Les studs sont l'unité de Roblox ; un personnage fait environ 5 studs de haut. En Y, c'est la hauteur.

```lua
local a = Vector3.new(10, 0, 5)
local b = Vector3.new(13, 4, 5)

-- Soustraire deux positions donne le déplacement de a vers b
local deplacement = b - a          -- Vector3.new(3, 4, 0)

-- .Magnitude = la longueur de cette flèche (Pythagore en 3D)
print(deplacement.Magnitude)       -- 5
```

Cette ligne, tu la reverras en phase 5 de ta roadmap : `(racineA.Position - racineB.Position).Magnitude` est **le** calcul de distance entre deux joueurs, celui qui empêche un exploiteur de capturer depuis l'autre bout de la map.

### CFrame : position ET orientation

Un `Vector3` dit **où** est un objet. Un `CFrame` (Coordinate Frame) dit **où il est ET vers où il regarde**. C'est une matrice de transformation — le même concept que `transform: translate() rotate()` en CSS, mais en 3D et omniprésent.

```lua
local part = workspace.Banc

part.Position = Vector3.new(0, 5, 0)          -- position seule, orientation inchangée
part.CFrame = CFrame.new(0, 5, 0)             -- position + remise à zéro de l'orientation

-- Orienter : on compose avec des rotations (angles en radians)
part.CFrame = CFrame.new(0, 5, 0) * CFrame.Angles(0, math.rad(90), 0)
```

Le point clé : la **multiplication de CFrames compose des transformations**, et l'ordre compte, exactement comme l'ordre des fonctions dans `transform` en CSS. `A * B` signifie « applique B **dans le repère local** de A ».

### Coordonnées relatives : la superpuissance

C'est l'idée la plus importante de cette leçon. Dans la phase 2 de Rush Magasin, l'article se place ainsi :

```lua
-- Le placer devant le joueur, à hauteur de poitrine
article:PivotTo(racine.CFrame * CFrame.new(0, 0.5, -2))
```

`racine.CFrame * CFrame.new(0, 0.5, -2)` = « pars de la position ET de l'orientation du joueur, monte de 0.5, avance de 2 devant lui ». En Roblox, **-Z est le devant**. Si le joueur se tourne, « devant » tourne avec lui — impossible à faire proprement avec des additions de `Vector3`, qui travaillent en coordonnées mondiales absolues. Un `CFrame` a d'ailleurs un `.LookVector` : la flèche unitaire qui pointe devant lui.

### PivotTo : déplacer un Model entier

`Position` et `CFrame` existent sur les `BasePart`. Mais un banc, un panier de basket, un prop sont des **Models** composés de plusieurs Parts. Pour déplacer le tout d'un bloc :

```lua
prop:PivotTo(racine.CFrame)   -- place le Model entier sur le joueur
```

`PivotTo` déplace toutes les Parts du Model en conservant leurs positions relatives. C'est la méthode moderne — elle remplace l'ancien `SetPrimaryPartCFrame` que tu croiseras dans de vieux tutos. Tu l'utilises déjà dans `transformerEnProp` (phase 4) et dans `poserArticles` (Rush, phase 2).

### Construire vite et droit dans Studio

Pour la phase 1, trois réflexes d'atelier :

- **Move/Rotate avec snap** : règle l'incrément (1 stud, 45°) dans l'onglet Model. Un mur aligné au stud près s'emboîte ; un mur posé à l'œil laisse des fentes par lesquelles on voit à travers.
- **Ctrl+D puis déplacement** : pour dupliquer un banc et le répéter le long d'un mur.
- **Properties → Size et Position saisis au clavier** : pour la structure (sol `100 x 1 x 60`, murs `1 x 20 x 60`), tape les valeurs exactes au lieu de tirer les poignées.

Et le rappel non négociable : tout le décor en `Anchored = true`, sinon la map s'effondre au Play.

## À retenir

- `Vector3` = position ou déplacement ; `(a - b).Magnitude` = distance entre deux points — le calcul anti-exploit de la phase 5.
- `CFrame` = position **+** orientation. `A * B` applique B dans le repère local de A ; l'ordre de multiplication compte.
- `racine.CFrame * CFrame.new(0, 0.5, -2)` = « devant le joueur, quelle que soit son orientation » ; -Z est le devant.
- `Model:PivotTo(cframe)` déplace un Model entier d'un bloc — la méthode moderne, celle de `transformerEnProp`.
- Construis avec le snap et des valeurs saisies dans Properties, tout en `Anchored = true`.

## Mise en pratique

**Ouvre `PropHunt.rbxl`, fais la phase 1 de ta roadmap** ([/projets/prop-hunt](/projets/prop-hunt), PHASE 1 — Le gymnase gris) :

1. **1.1 La structure** : sol `100 x 1 x 60` studs, quatre murs (`1 x 20 x 60` et `100 x 20 x 1`), un plafond. Tout `Anchored = true`, valeurs tapées dans Properties.
2. **1.2 Le mobilier** : 20 à 30 objets assemblés en Parts simples — 2 paniers de basket (poteau + panneau + cercle), bancs le long des murs, plots (cylindres), chariots à ballons, poubelles, caisses, table de marque. Utilise Ctrl+D et le snap.
3. **1.3 Organiser** : chaque meuble en `Group as Model` renommé (`Banc`, `PanierBasket`...), le tout dans un Folder `Gymnase` du Workspace.
4. **1.4 Vérifier** : sélectionne tout le décor → `Anchored` coché partout.

**Résultat attendu** : un gymnase gris, fermé, meublé, moche assumé, dans lequel on peut courir et se cacher derrière du mobilier.

**Test de validation (roadmap)** : tu appuies sur Play, tu apparais dans le gymnase, tu cours, rien ne tombe, rien ne traverse le sol.

**Rappel du piège** : 2 sessions maximum. Pas de textures, pas de logos, pas de gradins — phase 9.
