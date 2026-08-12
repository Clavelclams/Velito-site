---
titre: "Publier et faire vivre : la sortie n'est pas la fin, c'est le début"
parcours: "roblox-gamedev"
ordre: 14
niveau: "expert"
duree: 25
date: 2026-08-11
---

## Le cours

Dernière leçon, et le geste que 95 % des gens qui ouvrent Studio ne font jamais : **publier**. Puis le geste que 95 % de ceux qui publient ne font jamais : **faire vivre**.

### Publier : la mécanique

`File` → `Publish to Roblox`. Titre, description, miniature, genre (Party pour tes deux jeux). Deux réglages de ta roadmap : `Max Players` à **12** pour le Prop Hunt (trop de monde rend le jeu illisible — la capacité serveur est un paramètre de game design, pas une case technique) et **16** pour Rush Magasin. Et l'option intelligente : commence en **privé avec un lien d'invitation**, joue tes tests réels, puis passe en Public quand c'est propre. Un déploiement en préprod avant la prod, littéralement.

La **page du jeu est ta vitrine** : sur Roblox, la décision de cliquer se prend en une seconde, sur la miniature et le titre. Miniature : une capture du moment le plus parlant — le banc qui court, le rush où tout le monde se percute. Titre : court, évocateur, parodique pour Rush (**RUSH!**, **DERNIER EN CAISSE**). Description : le pitch en une phrase — ta roadmap Rush l'a déjà écrit (« Attrape un article. Garde-le. Passe en caisse. Sinon tu es éliminé. »). Et le rappel légal qui vaut retrait de jeu : **jamais de marque réelle** nulle part — ni dans le titre, ni la miniature, ni les articles. Parodie tout (leçon 11).

### Le test « sans rien expliquer »

Le protocole de ta phase 8 : invite 3-4 personnes, regarde-les jouer **sans dire un mot**. Ce que tu observes vaut plus que toutes tes hypothèses : ce qu'ils ne comprennent pas (échec du HUD ou du feedback), ce qui les fait rire (ton trésor, à amplifier), ce qui les frustre (ta dette, à corriger). Puis la discipline de tri de la roadmap : **corrige uniquement ce qui bloque la compréhension ou casse le jeu**. Tout le reste part en v2 — le contrat de périmètre tient jusqu'au bout.

Et l'avertissement à encadrer : le nombre de joueurs sera de **zéro au début. C'est normal, ça n'a aucune importance.** Tu as fini un jeu — c'est déjà plus que ce que 95 % des gens qui ouvrent Studio arrivent à faire, et c'est une pièce de portfolio complète : conception, périmètre, sécurité, publication, itération.

### Faire vivre : la mise à jour de contenu

Un jeu Roblox vivant est un jeu **mis à jour**. C'est là que ton architecture paie : grâce au Catalogue (leçon 11), une mise à jour de contenu de Rush coûte 20 minutes — un Model, six lignes, republier. Prends le rythme : **une petite mise à jour de contenu par semaine** (un article, un prop, une accroche de saison). Régularité modeste > refonte héroïque annuelle. Colle à l'actualité : canicule → l'article « Climatiseur » ressort ; fêtes → un article de saison. C'est exactement la logique éditoriale d'un site : le contenu frais fait revenir.

### Le réflexe TikTok

La découverte sur Roblox passe massivement par les réseaux — ta roadmap Rush a même fait de « ça se filme » un argument de conception du jeu. Le réflexe : **filme tes playtests** (l'enregistrement d'écran suffit). Les moments qui font rire en jeu font rire en vidéo : l'arrachage devant la caisse, le banc qui panique, le sprint à trois sur la dernière place. Clips courts, verticaux, le moment fort dans les deux premières secondes. Tu n'as pas besoin d'être influenceur : tu as besoin que le jeu produise ses propres clips — et tu l'as conçu pour.

### La suite

Les phases 9/10 de tes roadmaps (« Après ») listent la suite dans l'ordre du meilleur rendement : contenu d'abord, sons ensuite, gros systèmes en dernier — et les envies notées dans « Idées v2 » depuis la leçon 1 sont ton backlog trié. Tu sais désormais mener un projet de bout en bout : cadrer, construire par phases jouables, sécuriser, équilibrer, publier, itérer. C'est la boucle complète — celle d'un jeu, et celle de n'importe quelle application que tu livreras en tant que CDA.

## À retenir

- Publie d'abord en privé avec lien d'invitation, passe en Public après les tests réels — préprod puis prod.
- La page du jeu est ta vitrine : miniature du moment le plus parlant, titre court, pitch en une phrase. Jamais de marque réelle nulle part.
- Test réel = observer sans rien expliquer ; ne corrige que ce qui bloque la compréhension ou casse le jeu, le reste part en v2.
- Zéro joueur au début : normal, sans importance. Un jeu fini et publié vaut plus que tous les prototypes du monde.
- Faire vivre = une petite mise à jour de contenu par semaine (le Catalogue rend ça possible en 20 minutes) + filmer les playtests pour les clips.

## Mise en pratique

**Ouvre `PropHunt.rbxl`, fais la phase 8 de ta roadmap** ([/projets/prop-hunt](/projets/prop-hunt), PHASE 8 — Publication) :

1. **8.1** : `File` → `Publish to Roblox`. Titre, description (le pitch en une phrase), miniature (capture d'un caché-banc en pleine partie), genre Party. Garde en **privé** pour l'instant, avec lien d'invitation.
2. **8.2** : sur le site, `Max Players` à 12.
3. **8.3** : invite 3-4 personnes via le lien. Regarde-les jouer **sans rien expliquer**. Feuille d'observation (leçon 12) : incompréhensions / rires / frustrations.
4. **8.4** : trie tes notes — corrige uniquement ce qui bloque la compréhension ou casse le jeu ; tout le reste va dans « Idées v2 ». Republie, puis passe en **Public**.
5. Filme un des playtests et coupe un clip de 15 secondes du meilleur moment — même si tu ne le publies pas : c'est le réflexe à installer.
6. Quand Rush Magasin aura traversé sa phase 8 d'équilibrage, déroule sa phase 9 avec ce même protocole (Max Players 16, titre parodique, et filme — ce jeu est conçu pour ça).

**Résultat attendu** : le Prop Hunt est en ligne, public, joué par d'autres que toi, avec une liste v2 triée et un premier clip en réserve.

**Test de validation (le contrat de périmètre, depuis la leçon 1)** : trois personnes lancent une partie, jouent deux manches complètes, comprennent les règles sans explication, et rigolent au moins une fois. Si c'est le cas : le projet est réussi, le contrat est rempli. Bienvenue chez les gens qui finissent leurs jeux.
