---
titre: "La hiérarchie : tout est un objet"
parcours: "roblox-luau"
ordre: 3
niveau: "debutant"
duree: 20
date: 2026-07-27
---

## Le cours

Dans Roblox, **tout est un objet**, et tous les objets vivent dans un seul grand arbre : celui que t'affiche l'Explorer. Si tu as compris le DOM, tu as déjà compris l'Explorer.

En HTML, tu écris un `<body>` qui contient une `<div>` qui contient un `<p>`. Dans Roblox, tu as `game` (la racine, ton `document`) qui contient `Workspace`, qui contient `Baseplate` et tes Parts, qui peuvent contenir des Scripts. **Exactement la même logique** : un arbre, des parents, des enfants. Et comme en JS tu fais `document.getElementById()` ou `querySelector()`, ici tu navigues avec `.Parent` (remonter d'un cran), `:FindFirstChild("Nom")` (chercher un enfant) et `:WaitForChild("Nom")` (chercher et attendre qu'il existe — pense au chargement asynchrone d'une page). Un objet déplacé dans l'arbre change de comportement, comme un nœud DOM déplacé change de rendu.

Sous `game`, les enfants directs sont des **Services** : des conteneurs spécialisés, chacun avec un rôle précis. C'est comparable aux dossiers imposés d'un projet Symfony (`src/`, `public/`, `config/`) : la structure n'est pas décorative, elle **détermine qui a accès à quoi**.

| Service | Rôle | Analogie web |
|---|---|---|
| **Workspace** | Tout ce qui existe physiquement en 3D. Visible par tous. | Le `<body>` |
| **Players** | La liste des joueurs connectés | Ta table `users` |
| **ServerScriptService** | Scripts serveur. **Inaccessible aux joueurs.** | Ton code PHP côté serveur |
| **ReplicatedStorage** | Contenu partagé serveur ↔ client | Ton dossier `/public` |
| **ServerStorage** | Stockage serveur uniquement, invisible aux clients | Ton `.env`, tes clés `service_role` |
| **StarterGui** | L'interface (menus, HUD) copiée à chaque joueur | Ton HTML/CSS |
| **StarterPlayer** | Réglages et scripts appliqués à chaque joueur qui arrive | — |
| **Lighting** | Éclairage, ambiance, brouillard, heure du jour | — |

**Retiens surtout ça** : `ServerScriptService` et `ServerStorage` sont **inaccessibles aux joueurs**. `Workspace`, `ReplicatedStorage` et `StarterGui` sont **répliqués chez chaque client**, donc lisibles et exploitables par n'importe quel joueur malveillant. Même réflexe qu'avec Supabase : la clé `anon` peut traîner dans le front, la clé `service_role` jamais. Ici, un script contenant ta logique sensible dans `Workspace` = ta clé secrète dans le code client. On creusera ça en leçon 7, c'est LE sujet.

**Les objets de base** que tu vas manipuler :

- **Part** : un bloc. La brique élémentaire de toute construction.
- **Model** : un dossier qui regroupe des Parts (une maison = un Model contenant 40 Parts). L'équivalent d'une `<div>` qui structure : ça n'affiche rien en soi, ça organise.
- **Script** : du code qui tourne **côté serveur**.
- **LocalScript** : du code qui tourne **côté joueur** (sur sa machine).
- **ModuleScript** : du code réutilisable, importé par d'autres scripts — ton `import`/`require`, comme un module JS ou un service Symfony injecté.
- **Humanoid** : l'objet qui transforme un modèle en personnage vivant (vie, vitesse, animations).

La distinction Script / LocalScript / ModuleScript n'est pas un détail d'organisation : **l'endroit où tu poses un script et son type déterminent où il s'exécute et qui peut le lire**. Un Script dans `ServerScriptService` tourne sur le serveur, invisible des joueurs. Un LocalScript dans `StarterGui` est copié chez chaque joueur et tourne sur sa machine — il peut donc être lu et modifié par lui. C'est ton middleware Next.js versus ton code navigateur : même langage, mondes d'exécution différents, niveaux de confiance différents.

Dernier réflexe : **nomme tout**. Dix Parts appelées « Part », c'est dix `<div>` sans classe — illisible dans trois jours et impossible à cibler en code.

## À retenir

- L'Explorer = le DOM : un arbre d'objets avec `game` comme racine ; on navigue avec `.Parent`, `:FindFirstChild()`, `:WaitForChild()`.
- Les Services sont des conteneurs à rôle fixe ; l'emplacement d'un objet détermine **qui peut y accéder**.
- `ServerScriptService` / `ServerStorage` = côté serveur, inaccessibles aux joueurs. `Workspace` / `ReplicatedStorage` / `StarterGui` = répliqués chez les clients, donc lisibles par eux.
- **Script** = serveur, **LocalScript** = machine du joueur, **ModuleScript** = code partagé importable.
- Renomme chaque objet dès sa création — une Part s'appelle `Plateforme1`, pas `Part`.

## Mise en pratique

Objectif : organiser ton obby dans l'Explorer et écrire ton tout premier script.

1. Ouvre `MonObby`. Dans l'Explorer, clique-droit sur `Workspace` → `Insert Object` → **Model**. Renomme-le `Obby` (clic droit → Rename, ou F2).
2. Sélectionne tes trois plateformes de la leçon 2 (clic + Ctrl-clic) et glisse-les **dans** le Model `Obby`. Renomme-les `Plateforme1`, `Plateforme2`, `Plateforme3`. Ton arbre doit montrer : `Workspace → Obby → Plateforme1/2/3`.
3. Survole `ServerScriptService` dans l'Explorer, clique sur le `+` → **Script**. Renomme-le `Demarrage`.
4. Double-clique dessus : l'éditeur de code s'ouvre. Remplace le contenu par :
   `print("Le serveur de MonObby est lancé !")`
5. Vérifie que l'**Output** est ouvert, puis lance **Play** (F5).
6. Regarde l'Output : ton message doit s'afficher en blanc. Note la mention `Server` à côté — ce script a tourné côté serveur.
7. **Stop**, puis `Ctrl+S`.

**Résultat attendu** : un Model `Obby` propre contenant trois plateformes bien nommées, et un script serveur `Demarrage` qui affiche son message dans l'Output au lancement. Tu viens d'exécuter ton premier code Luau — côté serveur, comme il se doit.
