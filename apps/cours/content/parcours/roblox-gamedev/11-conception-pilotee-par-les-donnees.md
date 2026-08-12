---
titre: "Conception pilotée par les données : le Catalogue est un CMS, le contenu n'est pas du code"
parcours: "roblox-gamedev"
ordre: 11
niveau: "solide"
duree: 25
date: 2026-08-11
---

## Le cours

Ta roadmap Rush l'annonce : c'est **le concept le plus réutilisable de tout le projet**. Le principe tient en une phrase : le code ne doit jamais savoir qu'il manipule « une clim ». Il manipule « l'article de la manche », et cet article est une **donnée**.

### Contenu ≠ moteur

Tu connais déjà cette séparation par cœur : c'est un CMS. Le moteur de ton site Symfony ne connaît pas tes articles de blog — il connaît une table `article` avec des colonnes, et il rend ce qu'il y trouve. Ajouter un article ne demande aucun déploiement de code. Le `Catalogue` de Rush Magasin applique exactement ce modèle :

```lua
-- ReplicatedStorage/Modules/Catalogue (ModuleScript)
local Catalogue = {}

Catalogue.Articles = {
	{
		id = "clim",
		nom = "Climatiseur",
		modele = "Clim",              -- nom du Model dans ReplicatedStorage/Articles
		accroche = "38°C dehors. Dernière clim du magasin.",
		couleur = Color3.fromRGB(120, 200, 255)
	},
	{
		id = "console",
		nom = "PlaySphere 6",
		modele = "Console",
		accroche = "Sortie mondiale. 12 exemplaires en stock.",
		couleur = Color3.fromRGB(60, 90, 220)
	},
	{
		id = "nutella",
		nom = "Pot géant Choconoisette",
		modele = "PotGeant",
		accroche = "-70%. Ça a mal tourné l'an dernier.",
		couleur = Color3.fromRGB(90, 50, 20)
	},
}

function Catalogue.auHasard()
	return Catalogue.Articles[math.random(1, #Catalogue.Articles)]
end

return Catalogue
```

Chaque entrée est un **enregistrement** avec un schéma implicite : `id`, `nom`, `modele`, `accroche`, `couleur`. C'est ta table SQL, en table Luau. Et comme en base, la discipline de schéma compte : toutes les entrées ont les mêmes champs, le moteur peut compter dessus.

### Le moteur consomme, il ne connaît pas

```lua
local Catalogue = require(ReplicatedStorage.Modules.Catalogue)

local articleDuJour = Catalogue.auHasard()
poserArticles(nombreArticles, articleDuJour.modele)
_G.diffuser("PREPARATION", 10, articleDuJour.accroche)
```

Regarde ce que le moteur utilise : `articleDuJour.modele` pour savoir quoi cloner, `articleDuJour.accroche` pour savoir quoi afficher. **Aucun `if id == "clim"` nulle part.** Le jour où le moteur contient un `if` spécifique à un contenu, la séparation est morte — c'est le code smell équivalent à un `if ($article->getId() === 42)` dans un contrôleur. Si un article a besoin d'un comportement spécial, ce comportement devient... une donnée de plus (un champ `vitesse` ou `poids` que le moteur lit génériquement).

### Ce que ça achète

Pour ajouter un article, deux gestes : construire un Model dans `ReplicatedStorage/Articles`, ajouter six lignes au catalogue. **Aucune modification du moteur** — donc aucun risque de casser le ramassage, l'arrachage ou la caisse. C'est ce qui rend possible la mise à jour du jeu en 20 minutes quand un truc est à la mode : canicule → article « Climatiseur » en tête d'accroche ; sortie d'une console → parodie dans le catalogue le soir même. La durée de vie du jeu est dans ses données, pas dans son code. Et rappelle-toi l'avertissement marque de ta roadmap : les contenus parodient (**PlaySphere 6**, **Choconoisette**), jamais de marque réelle — un signalement suffit à faire retirer le jeu.

Le lien avec la fenêtre de validation : `Catalogue.auHasard()` tire l'article, mais c'est le **serveur** qui tire. Le catalogue est dans `ReplicatedStorage` (les clients peuvent lire noms et couleurs pour le HUD — parfait), mais la décision de quel article apparaît, combien, où, reste dans la boucle serveur. Données partagées, décisions serveur.

### Généralise le réflexe

Ce pattern s'applique dès qu'une liste de « choses » partage un comportement : les props du gymnase (un `Catalogue` de props avec nom et rareté), des niveaux, des succès, des messages d'ambiance. La question à te poser devant chaque nouvelle feature : « est-ce du moteur ou du contenu ? ». Si c'est du contenu, ça va dans une table de données, et le moteur reste stupide et générique. Tu reconnais le principe : c'est la **conception pilotée par les données** (data-driven design), et c'est le même mouvement que sortir la config du code (leçon 4) — appliqué cette fois au contenu du jeu.

## À retenir

- Le moteur manipule « l'article de la manche », jamais « la clim » : le contenu est une donnée, comme dans un CMS.
- Chaque entrée du Catalogue est un enregistrement à schéma constant (`id`, `nom`, `modele`, `accroche`, `couleur`) — ta table SQL en table Luau.
- Un `if id == "..."` dans le moteur = séparation morte. Un comportement spécial devient un champ de données supplémentaire.
- Ajouter du contenu = un Model + six lignes, zéro modification du moteur : mise à jour du jeu en 20 minutes.
- Parodie systématique (PlaySphere 6, Choconoisette) — jamais de marque réelle.

## Mise en pratique

**Ouvre `RushMagasin.rbxl`, fais la phase 6 de ta roadmap Rush** ([/projets/rush-magasin](/projets/rush-magasin), PHASE 6 — L'article du jour) :

1. **6.2** : crée le ModuleScript `Catalogue` dans `ReplicatedStorage/Modules` avec les trois articles de la roadmap (`clim`, `console`, `nutella`) et la fonction `Catalogue.auHasard()`.
2. **6.5** : construis les trois Models dans `ReplicatedStorage/Articles` — assemblage de Parts simple : la clim est un pavé blanc avec une grille, la console un pavé noir avec une LED, le pot géant un cylindre marron. `PrimaryPart` définie, `Anchored = false`, `CanCollide = false`.
3. **6.3** : branche le catalogue dans la boucle : au début de chaque partie, `Catalogue.auHasard()`, puis `poserArticles(nombre, articleDuJour.modele)` et diffusion de l'accroche pendant PREPARATION.
4. Affiche `nom` et `accroche` dans le HUD (zone « Article du jour », haut gauche) — le client lit les champs, le serveur a décidé lequel.
5. **Le test du concept** : ajoute un quatrième article de ton invention (parodie obligatoire) en chronométrant. Si tu touches à autre chose que le catalogue et le dossier `Articles`, ta séparation a une fuite.

**Résultat attendu** : chaque partie tire un article différent, avec son nom et son accroche affichés — et ajouter un article prend moins de 20 minutes.

**Test de validation (roadmap)** : chaque partie tire un article différent, avec son nom et son accroche affichés. Vérifie qu'aucun `if` du moteur ne mentionne un id d'article.
