---
titre: "Serveur vs Client : LE concept central"
parcours: "roblox-luau"
ordre: 7
niveau: "intermediaire"
duree: 25
date: 2026-07-27
---

## Le cours

**C'est la leçon la plus importante du parcours.** Si tu ne retiens qu'une chose de tout ce cours, que ce soit celle-là. C'est ce qui sépare un jeu jouable d'un jeu piraté en 48h — et c'est aussi une compétence directement transférable à ton métier de développeur.

**Le principe.** Quand ton jeu tourne en ligne : **1 serveur** tourne dans un datacenter Roblox et fait autorité sur la vérité du jeu ; **N clients**, un par joueur, tournent sur leurs machines et se contentent d'afficher le monde et de gérer les entrées. C'est exactement ton architecture web : le serveur PHP décide, le navigateur affiche. C'est ton middleware Next.js qui vérifie la session avant de servir la page — jamais le composant client qui décide seul s'il a le droit. C'est tes policies Supabase qui tranchent côté base, quoi que raconte le front.

**Les deux types de scripts**, déjà croisés en leçon 3, prennent ici tout leur sens :

| | `Script` | `LocalScript` |
|---|---|---|
| Tourne sur | Le serveur | La machine du joueur |
| Voit | Tous les joueurs | Un seul joueur |
| Placer dans | `ServerScriptService`, `Workspace` | `StarterPlayerScripts`, `StarterGui` |
| Peut être trafiqué ? | **Non** | **Oui** |
| Pour quoi | Règles, score, argent, dégâts, sauvegarde | Interface, caméra, entrées clavier, effets visuels |

**Pourquoi c'est vital.** Un joueur peut **exécuter du code arbitraire sur son propre client**. Des outils d'exploit existent, ils sont répandus, gratuits, documentés — et les gamins de 14 ans savent s'en servir. Un exploiteur peut lire tout ce qui est répliqué chez lui, modifier ses LocalScripts, changer n'importe quelle valeur locale. Exactement comme n'importe qui peut ouvrir tes DevTools, modifier ton JS, éditer le HTML, rejouer tes requêtes. Tu ne peux pas l'empêcher — ni sur le web, ni sur Roblox. Tu peux seulement faire en sorte que **ça ne serve à rien**.

Regarde la différence :

```lua
-- ❌ LocalScript : catastrophe
argentDuJoueur = argentDuJoueur + 100
-- Le joueur modifie cette valeur à volonté et devient millionnaire
```

```lua
-- ✅ Script serveur : le joueur ne peut rien y faire
local leaderstats = player.leaderstats
leaderstats.Argent.Value = leaderstats.Argent.Value + 100
```

Le premier cas, c'est stocker le solde du panier dans un `<input type="hidden">` et le lire tel quel au checkout. Le second, c'est recalculer le prix côté serveur à partir de la BDD. Tu connais déjà ce réflexe en PHP — c'est **le même**.

**La règle d'or** :

> **Toute donnée qui compte — argent, score, inventaire, vie, progression — doit vivre et être modifiée sur le SERVEUR. Le client ne fait qu'afficher et demander.**

Précision importante : quand un exploiteur modifie une valeur **répliquée** chez lui (sa vie affichée, la position d'un objet), ça ne change que **sa** copie locale. Le serveur, lui, garde la vraie valeur, et les autres joueurs voient la version du serveur. Le danger n'est donc pas qu'il « triche dans son coin » — c'est quand ton code **serveur** fait confiance à ce que le client raconte. On verra ça en détail avec les RemoteEvents (leçon 8).

**Ce qui va sur le client.** Le client n'est pas inutile — il est indispensable pour la réactivité : l'interface (menus, HUD, boutons), la caméra, les entrées clavier/souris, les effets visuels et sonores purement décoratifs, les animations d'UI. Tout ce qui est **cosmétique ou réactif**. Rien de ce qui est **décisif**. Même partage des rôles qu'entre ton JS front (feedback instantané, validation de confort) et ton back (validation qui compte).

Retiens la formule, elle reviendra jusqu'à la fin du parcours : **le serveur décide, le client affiche.**

## À retenir

- 1 serveur qui fait autorité, N clients qui affichent — la même architecture que PHP/navigateur ou Supabase/front.
- `Script` = serveur, infalsifiable. `LocalScript` = machine du joueur, **modifiable par lui** comme ton JS dans les DevTools.
- Un exploiteur peut exécuter du code arbitraire sur son client : c'est un fait, pas un risque théorique.
- **Règle d'or : toute donnée qui compte (argent, score, vie, progression) vit et se modifie sur le serveur.** Le client affiche et demande.
- Sur le client : UI, caméra, entrées, effets cosmétiques. Rien de décisif.

## Mise en pratique

Objectif : voir la différence serveur/client de tes propres yeux, avec le test multijoueur.

1. Dans `StarterPlayer → StarterPlayerScripts`, insère un **LocalScript** nommé `TestClient` avec :
   `print("CLIENT : je tourne sur la machine de " .. game.Players.LocalPlayer.Name)`
2. Dans `ServerScriptService`, crée un **Script** nommé `TestServeur` avec :

```lua
game.Players.PlayerAdded:Connect(function(player)
	print("SERVEUR : " .. player.Name .. " a rejoint, je le vois depuis le datacenter")
end)
```

3. Lance **Play** et regarde l'Output : les deux messages s'affichent, avec des étiquettes différentes (bleu/vert selon le contexte). En mode Play, serveur et client tournent tous les deux sur ta machine — c'est trompeur, d'où l'étape suivante.
4. **Stop.** Onglet `Test` → zone `Clients and Servers` → choisis `2 Players` → **Start**. Studio ouvre trois fenêtres : un serveur et deux clients.
5. Observe : dans la fenêtre **serveur**, l'Output montre deux messages « SERVEUR : ... a rejoint ». Dans chaque fenêtre **client**, un seul message « CLIENT », avec le nom du joueur de cette fenêtre. Le LocalScript tourne une fois **par joueur** ; le Script serveur tourne **une seule fois** et voit tout le monde.
6. Dans une fenêtre client, marche dans la lave (leçon 6) : tu meurs dans **les deux** fenêtres clients. La mort est décidée par le serveur (ton script lave est un Script), donc répliquée à tous. C'est la preuve visuelle de la règle d'or.
7. Ferme les fenêtres de test (`Cleanup` si proposé), `Ctrl+S`.

**Résultat attendu** : tu as vu physiquement où s'exécute chaque type de script — un serveur qui voit tous les joueurs, des clients qui ne voient qu'eux-mêmes — et vérifié que la lave, gérée côté serveur, s'applique à tout le monde.
