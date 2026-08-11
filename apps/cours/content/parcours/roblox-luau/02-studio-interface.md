---
titre: "Roblox Studio : l'interface et le mode test"
parcours: "roblox-luau"
ordre: 2
niveau: "debutant"
duree: 20
date: 2026-07-27
---

## Le cours

Studio peut impressionner à l'ouverture : des panneaux partout, des dizaines de boutons. Bonne nouvelle : **quatre zones suffisent** pour tout ce parcours. C'est comme les DevTools de Chrome — il y a vingt onglets, tu en utilises trois.

**1. La Viewport** (le grand espace au milieu). C'est la vue 3D de ton monde, l'équivalent de la fenêtre du navigateur qui affiche ta page. Navigation : **clic droit maintenu + `Z Q S D`** pour te déplacer comme dans un FPS, **molette** pour zoomer, **clic gauche** pour sélectionner un objet. Astuce que le doc suppose connue : sélectionne un objet puis appuie sur **F** pour centrer la caméra dessus — indispensable quand tu perds un objet dans le décor.

**2. L'Explorer** (à droite). L'arborescence de ton jeu, **ta zone la plus importante**. C'est ton inspecteur DOM : chaque objet du jeu y apparaît, avec ses parents et ses enfants. Si tu ne le vois pas : onglet `View` → `Explorer`. On le décortique à la leçon 3.

**3. Properties** (sous l'Explorer). Les propriétés de l'objet sélectionné : position, taille, couleur, transparence... C'est le panneau « Styles » des DevTools, sauf qu'ici tu modifies l'objet réel, pas une copie temporaire. Onglet `View` → `Properties`.

**4. L'Output** (en bas). La console. Tes messages `print`, tes erreurs. C'est ta console JS, ton `var_dump`, tes logs Symfony — tout en un. Onglet `View` → `Output`. **Garde-la toujours ouverte** : une erreur silencieuse est une erreur que tu chercheras pendant une heure.

**Tester ton jeu.** Trois boutons, trois usages distincts :

- **Play (F5)** : tu apparais dans le jeu avec ton personnage. Serveur + client tournent ensemble sur ta machine. C'est ton `symfony server:start` + le navigateur ouvert en même temps.
- **Run** : le jeu tourne, mais **sans** personnage. Utile pour vérifier la physique (est-ce que mes plateformes tiennent ?) ou observer des scripts serveur sans être dans la partie.
- **Stop (Shift+F5)** : arrêt, retour à l'édition.

⚠️ **Le piège du mode Play, à graver tout de suite** : quand tu appuies sur Play, Studio lance une **copie** de ton jeu. Toutes les modifications faites pendant le test — une Part déplacée, une couleur changée, un script édité — sont **annulées** au Stop. C'est exactement comme modifier le HTML dans les DevTools : ça change ce que tu vois, mais le fichier source, lui, n'a pas bougé ; au rechargement, tout est perdu. **Ne construis jamais ta map en mode Play.** Le symptôme classique du débutant : « j'ai passé 20 minutes à placer mes plateformes, tout a disparu ». C'était en mode Play. Vérifie toujours que le bouton Stop n'est pas actif avant de construire.

Dernier réflexe à prendre : **sauvegarde souvent** (`Ctrl+S`). Studio est stable, mais un crash après deux heures de construction non sauvegardée, ça marque. Considère `Ctrl+S` comme ton `git commit` : petit, fréquent, sans réfléchir.

Pour construire, trois outils dans l'onglet `Home` : **Move** (déplacer sur les axes), **Scale** (redimensionner), **Rotate** (pivoter). Sélectionne une Part, choisis l'outil, tire sur les poignées colorées. Chaque couleur correspond à un axe (X, Y, Z) — tu retrouveras ça dans la leçon 6 avec `Vector3`.

## À retenir

- Quatre zones suffisent : **Viewport** (la vue 3D), **Explorer** (l'arborescence, comme le DOM), **Properties** (les styles de l'objet), **Output** (la console — toujours ouverte).
- **Play (F5)** = serveur + client + ton personnage ; **Run** = le jeu sans toi ; **Stop (Shift+F5)** = arrêt.
- ⚠️ Tout ce que tu modifies **en mode Play est perdu au Stop** — comme éditer le DOM dans les DevTools. On ne construit jamais en Play.
- `Ctrl+S` souvent : c'est ton commit.

## Mise en pratique

Objectif : poser les trois premières plateformes de ton obby.

1. Ouvre ton projet `MonObby` (template Baseplate de la leçon 1). Vérifie que **Explorer**, **Properties** et **Output** sont visibles (onglet `View` sinon).
2. Onglet `Home` → clique sur **Part** : un bloc apparaît dans la Viewport. Sélectionne-le, puis dans **Properties**, coche **Anchored** (sinon il tombera — on verra pourquoi leçon 6).
3. Avec l'outil **Move**, place cette Part en hauteur, à distance de saut du bord de la Baseplate. Avec **Scale**, donne-lui une taille de plateforme (environ 8 × 1 × 8).
4. Dans **Properties**, change sa couleur (`BrickColor`) : choisis un vert. Ce sera la première plateforme du parcours.
5. Duplique-la deux fois (`Ctrl+D`), et place les deux copies de plus en plus loin et de plus en plus haut, pour former un début d'escalier de saut.
6. Appuie sur **Play** et essaie d'enchaîner les trois sauts. Ajuste les distances si c'est infaisable — mais souviens-toi : **Stop d'abord**, ajustement ensuite, sinon tes réglages seront perdus.
7. `Ctrl+S` pour sauvegarder.

**Résultat attendu** : trois plateformes vertes ancrées, franchissables en sautant depuis la Baseplate, sauvegardées. Ton obby a son premier tronçon.
