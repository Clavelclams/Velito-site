---
titre: "C'est quoi Roblox, techniquement ?"
parcours: "roblox-luau"
ordre: 1
niveau: "debutant"
duree: 15
date: 2026-07-27
---

## Le cours

Avant d'écrire une ligne de code, il faut comprendre ce que tu manipules. Beaucoup de gens galèrent sur Roblox parce qu'ils croient faire « un jeu » alors qu'ils font en réalité **une application client-serveur temps réel**. Toi, tu as un avantage énorme : tu connais déjà cette architecture par cœur.

Ton site VENA, c'est : `Navigateur (client) ←→ HTTP ←→ Serveur PHP ←→ MySQL`. Un jeu Roblox, c'est : `Client Roblox (joueur) ←→ Réseau ←→ Serveur Roblox ←→ DataStore`. C'est **la même architecture**. Quand tu utilises Supabase, ton front envoie des requêtes, et les Row Level Security policies décident côté serveur ce qui est permis — Roblox fonctionne pareil : le client demande, le serveur tranche. Les mêmes règles de sécurité s'appliquent : **on ne fait jamais confiance au client**. La seule différence, c'est le rythme : au lieu d'envoyer un formulaire de temps en temps, tu synchronises des positions de personnages 60 fois par seconde. C'est du temps réel permanent, comme si chaque joueur avait un WebSocket ouvert en continu.

**Les trois briques** que tu vas manipuler :

- **Roblox Studio** : l'éditeur. Tu y construis la map, écris le code, testes. C'est ton VS Code + un navigateur + un serveur local, le tout dans une seule application. Gratuit.
- **Luau** : le langage de programmation, une version améliorée de Lua. Il joue le rôle de ton JavaScript et de ton PHP à la fois : le même langage sert côté client et côté serveur (comme quand tu fais du Next.js, où JS tourne des deux côtés).
- **Les serveurs Roblox** : ils hébergent ton jeu et gèrent le multijoueur. C'est ton hébergeur — sauf que tu n'as rien à configurer, ni Vercel, ni nom de domaine, ni certificat SSL.

**Ce que Roblox fait à ta place**, et c'est énorme : le rendu 3D (tu ne touches jamais à OpenGL ou WebGL), la physique (gravité, collisions), le réseau (la synchronisation des positions entre joueurs est automatique), les personnages (marcher, sauter, les animations de base sont fournies), l'hébergement (tu publies, Roblox lance des serveurs à la demande, avec un « scaling » automatique dont rêverait n'importe quelle infra), et les paiements (la monétisation en Robux est intégrée, pas besoin de Stripe). Compare avec le web : pour VENA, tu as dû gérer l'hébergement, la base, le déploiement. Ici, Roblox est à la fois ton framework, ton hébergeur et ta plateforme de distribution.

Ton boulot se limite donc à **la logique du jeu** : les règles. Qui gagne des points, quand, ce qui se passe quand on touche telle plateforme. C'est exactement la couche « métier » d'une appli — ce que tu écris dans tes contrôleurs Symfony. Et c'est pour ça qu'on peut sortir un truc jouable en deux semaines.

**Ce que ça coûte** : rien. Studio est gratuit, publier est gratuit, l'hébergement est gratuit, même avec des milliers de joueurs. Roblox se rémunère en prenant une commission sur les Robux dépensés dans les jeux. Ton seul investissement, c'est ton temps.

Dans ce parcours, tu vas construire un **mini-obby** (un parcours d'obstacles) de A à Z : plateformes, pièges, interface, sauvegarde, publication. Chaque leçon ajoute une brique. À la fin, tu auras un jeu en ligne, jouable par n'importe qui — et surtout, tu comprendras chaque ligne.

## À retenir

- Un jeu Roblox = une application **client-serveur temps réel**, la même architecture que le web (navigateur ↔ serveur ↔ BDD).
- Les trois briques : **Studio** (l'éditeur), **Luau** (le langage), **les serveurs Roblox** (l'hébergement).
- Roblox gère la 3D, la physique, le réseau et l'hébergement : ton travail, c'est **la logique du jeu** uniquement.
- Tout est gratuit : Studio, la publication, l'hébergement.
- Règle d'or dès maintenant : **on ne fait jamais confiance au client** — comme en PHP, comme avec Supabase.

## Mise en pratique

Objectif : installer l'atelier et poser la première pierre de ton obby.

1. Va sur `create.roblox.com`, crée un compte Roblox si tu n'en as pas, puis télécharge et installe **Roblox Studio** (Windows ou Mac).
2. Lance Studio, connecte-toi, puis clique sur **New** → choisis le template **Baseplate** (une plateforme grise vide).
3. Observe l'écran sans rien toucher : repère la grande vue 3D au centre, le panneau **Explorer** à droite, et la barre d'outils en haut. Ne t'inquiète pas des détails, c'est l'objet de la leçon 2.
4. Appuie sur **F5** (Play) : ton personnage apparaît sur la plateforme. Déplace-toi avec `Z Q S D`, saute avec `Espace`.
5. Appuie sur **Shift+F5** (Stop) pour arrêter le test.
6. Sauvegarde ton projet : `File` → `Save to Roblox As...`, nomme-le `MonObby`. Il est stocké dans le cloud Roblox, comme un repo distant.

**Résultat attendu** : Studio est installé, tu as un projet `MonObby` sauvegardé sur ton compte, et tu as marché sur ta Baseplate avec ton personnage. C'est le terrain sur lequel tout le parcours va se construire.
