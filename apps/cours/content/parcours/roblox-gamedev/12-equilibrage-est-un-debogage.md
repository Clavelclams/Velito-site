---
titre: "L'équilibrage est un débogage : curseurs, méthode et lecture d'un playtest"
parcours: "roblox-gamedev"
ordre: 12
niveau: "expert"
duree: 25
date: 2026-08-11
---

## Le cours

Ton jeu tourne. Est-il **bon** ? Cette question-là ne se résout pas en écrivant du code, mais elle se résout avec une méthode que tu connais déjà : celle du débogage. L'équilibrage, c'est du debug dont les symptômes sont des émotions.

### Les curseurs : ton tableau de bord

Grâce aux leçons 4 et 11, tout l'équilibrage de Rush Magasin vit dans `Config.lua`. La roadmap en fait un tableau de bord avec, pour chaque curseur, les symptômes des deux extrêmes :

| Paramètre | Départ | Trop bas | Trop haut |
|---|---|---|---|
| `DUREE_RUSH` | 45s | Personne n'a le temps | Plus de tension |
| `DUREE_CAISSE` | 20s | Injouable | Les porteurs sont trop tranquilles |
| `COOLDOWN_VOL` | 2s | Ping-pong illisible | Le premier arrivé gagne |
| `DUREE_ETOURDI` | 0.6s | On sent rien | Frustrant |
| `ARTICLES_MOINS` | 2 | Trop lent | Élimine trop vite |
| `VITESSE_PORTEUR` | 14 | Le porteur est une proie | Impossible à rattraper |

Lis ce tableau comme une doc de monitoring : chaque paramètre a une valeur nominale et des symptômes d'alerte dans les deux directions. Note le `VITESSE_PORTEUR` : ralentir légèrement le porteur (16 → 14) change tout le jeu — l'arrachage devient viable, les joueurs sans article gardent un espoir. Deux studs par seconde séparent « le premier qui attrape a gagné » d'un jeu tendu jusqu'à la caisse. Les grands équilibrages tiennent souvent dans de petits nombres.

### La règle d'or : un paramètre à la fois

C'est la règle n°4 de ta roadmap Rush, et c'est **exactement** ta méthode de débogage : quand tu traques un bug, tu ne changes pas trois choses avant de relancer — sinon, laquelle a agi ? Pareil ici. Tu baisses `COOLDOWN_VOL` **et** tu ralentis le porteur **et** tu allonges `DUREE_CAISSE`, le playtest suivant est meilleur... et tu ne sais pas pourquoi. Tu ne peux ni le reproduire sur l'autre jeu, ni revenir en arrière intelligemment. Un changement, un test, une conclusion. C'est la démarche expérimentale : une variable, les autres constantes.

Tiens un journal d'équilibrage (ton journal de bord fait l'affaire) : date, paramètre modifié, ancienne → nouvelle valeur, effet observé. Après dix sessions, ce journal est ta connaissance du jeu — l'équivalent d'un historique de commits avec de bons messages.

### Lire un playtest : rires, râles, ennui

La roadmap donne la grille d'observation. Fais jouer 4 à 6 personnes réelles et note trois choses :

1. **Où ils rigolent** → à amplifier. Le rire est ton métrique de succès (il est dans ta définition de « fini »).
2. **Où ils râlent** → à corriger. Attention à la nuance : le râle de tension (« NOOON il m'a pris mon carton ! ») est un **bon** signe — c'est le jeu qui fonctionne. Le râle d'injustice (« je pouvais rien faire ») est le symptôme à corriger. Distinguer les deux est la compétence clé du game designer.
3. **Où ils s'ennuient** → à raccourcir. L'ennui ne s'exprime pas : il se voit (téléphone sorti, regard ailleurs). C'est le signal le plus silencieux et le plus mortel.

Pendant le playtest, **tu n'expliques rien et tu ne défends rien**. Si tu dois expliquer, l'interface a échoué (leçon 9) ; si tu défends une mécanique critiquée, tu n'apprends rien. Observe, note, corrige après. C'est un test utilisateur, avec la même éthique : on teste le jeu, pas les joueurs.

### Du symptôme au diagnostic

La roadmap donne l'exemple canonique. Symptôme : « le premier qui attrape gagne toujours. » Diagnostic : la défense est trop forte par rapport à l'attaque. Remèdes possibles — baisser `COOLDOWN_VOL`, ralentir davantage le porteur, ou allonger la distance rayon-caisse (oui, **la géométrie de la map est un curseur d'équilibrage** : c'est pour ça que la phase 1 de Rush faisait chronométrer le trajet sas → caisses). Chaque remède se teste séparément, un playtest chacun. L'équilibrage ne s'arrête jamais vraiment — mais avec cette méthode, chaque session te rapproche au lieu de te faire tourner en rond.

## À retenir

- Chaque curseur de `Config` a une valeur nominale et des symptômes d'alerte dans les deux extrêmes — apprends le tableau comme une doc de monitoring.
- **Un seul paramètre modifié à la fois**, sinon tu ne sais pas ce qui a produit l'effet. C'est du débogage : une variable, un test, une conclusion.
- Grille de playtest : rires → amplifier, râles → corriger (distingue râle de tension et râle d'injustice), ennui → raccourcir.
- Pendant un playtest, tu n'expliques rien et tu ne défends rien : tu observes et tu notes.
- La géométrie de la map (distance rayon → caisse) est un curseur d'équilibrage au même titre que les valeurs de `Config`.

## Mise en pratique

**Ouvre `RushMagasin.rbxl`, termine la phase 7 (HUD) si ce n'est pas fait, puis fais la phase 8 de ta roadmap Rush** ([/projets/rush-magasin](/projets/rush-magasin), PHASE 8 — Équilibrage) :

1. Vérifie que **tous** les curseurs du tableau existent dans `Config.lua` (`DUREE_RUSH`, `DUREE_CAISSE`, `COOLDOWN_VOL`, `DUREE_ETOURDI`, `ARTICLES_MOINS`, `VITESSE_PORTEUR`) et que le moteur les lit — aucune valeur en dur.
2. **8.1** : implémente le malus de vitesse du porteur (16 → 14 dans `donnerArticle`, retour à 16 quand l'article est perdu). Teste avec et sans, à valeurs identiques par ailleurs : note la différence.
3. **8.2** : organise un playtest avec 4 à 6 personnes réelles. Prépare ta feuille d'observation à trois colonnes (rires / râles / ennui) et remplis-la sans intervenir.
4. Choisis LE symptôme le plus fort du playtest, formule un diagnostic, change **un** paramètre, refais tester. Consigne tout dans le journal de bord (date, paramètre, valeurs, effet).
5. Répète le cycle au moins trois fois sur la session.

**Résultat attendu** : un jeu tendu, pas frustrant — et un journal d'équilibrage qui justifie chaque valeur de ta `Config`.

**Test de validation (roadmap)** : le symptôme « le premier qui attrape gagne toujours » a disparu : lors du dernier playtest, au moins un article a changé de main pendant la course vers la caisse, et la partie s'est jouée jusqu'au bout sans râle d'injustice.
