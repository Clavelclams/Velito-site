# FAUSSAIRE — Fiche de conception V1

> Nouveau jeu Velito Interactive. Dessin + rôles cachés : tous les civils
> dessinent le même mot en temps limité, les traîtres (imposteurs et
> Mister White) doivent passer inaperçus. 3 tours max, votes, reveals
> immersifs à la TV.
>
> Statut : **conception validée par Clavel (10/07/2026) — pas encore codé.**
> À développer après déploiement + validation des correctifs playtest 07/2026.
> Inspirations mécaniques (les mécaniques de jeu ne sont pas protégeables ;
> aucun nom repris) : jeux de dessin à rôle caché + jeux de déduction sociale.

---

## 1. Concept en une phrase

Tout le monde dessine "le mot" sur son téléphone en même temps, en très peu
de temps — sauf que certains ne savent pas ce que c'est, et tout le monde
s'accuse entre les tours.

## 2. Les rôles

| Rôle | Ce qu'il voit sur son téléphone | Objectif |
|---|---|---|
| **Civil** | Le mot (ex : "phare") | Éliminer TOUS les traîtres avant la fin du tour 3 |
| **Imposteur** | Un mot PROCHE (ex : "fusée") | Survivre jusqu'à la fin du tour 3 |
| **Mister White** | Rien ("Tu n'as PAS de mot. Improvise.") | Survivre jusqu'à la fin du tour 3 |

Décisions actées (Clavel, 10/07/2026) :

- **Pas de victoire en devinant le mot.** Survivre est la SEULE victoire des
  traîtres. ⚠️ Conséquence à surveiller au playtest : rien ne dissuade un
  civil de dessiner trop explicitement — la protection du mot repose à 100 %
  sur le temps de dessin court (§4) et le choix de mots abstraits (§8).
  Si les MW se font griller systématiquement au tour 1, c'est le premier
  curseur à revoir.
- **Composition choisie par l'hôte au lobby** : nombre de Mister White (≥1)
  et d'imposteurs (≥0), le reste civils.

### Garde-fous de composition (imposés par l'app)

| Joueurs | Traîtres max (MW + imposteurs) | Reco par défaut |
|---|---|---|
| 4–5 | 1 | 1 MW |
| 6–7 | 2 | 1 MW + 1 imposteur |
| 8–9 | 3 | 1 MW + 2 imposteurs |
| 10+ | 4 | 2 MW + 2 imposteurs |

*Règle : traîtres ≤ ⌊joueurs/3⌋, sinon les civils n'ont mathématiquement
plus le temps de tous les éliminer en 3 votes.*

## 3. Déroulé d'une partie (3 tours MAX)

```
LOBBY → ATTRIBUTION DES RÔLES (secret, sur téléphone)
  ↓
TOUR 1 : DESSIN (tous en même temps, chacun sa toile, temps court)
  → DÉBAT (TV affiche la grille des toiles) → VOTE (1 éliminé) → REVEAL ROULETTE
  ↓
TOUR 2 : DESSIN (on CONTINUE sa toile du tour 1)
  → DÉBAT → VOTE (1 éliminé) → REVEAL ROULETTE
  ↓
TOUR 3 : DESSIN (dernière couche)
  → DÉBAT → VOTE FINAL MULTIPLE (chacun coche TOUS ses suspects)
  → REVEAL FINAL (roulette pour chaque accusé) → ÉCRAN DE VICTOIRE
```

Détails actés :

- **On ne repart jamais d'une toile vierge** : chaque tour AJOUTE au dessin
  du tour précédent. C'est ce qui permet aux traîtres de "s'adapter" — ils
  voient la grille des toiles à la TV pendant les débats et imitent au tour
  suivant.
- **Tours 1 et 2 : vote simple** — chacun désigne UN joueur sur son
  téléphone, le plus voté est éliminé (égalité : personne ne saute — la
  tension monte). L'éliminé ne dessine plus mais continue de voter ❓(Q2).
- **Tour 3 : vote final MULTIPLE** — chacun coche sur son téléphone TOUS les
  joueurs restants qu'il pense traîtres. Tout joueur coché par une majorité
  des votants est éliminé. Puis reveal général et verdict.

## 4. Le chrono de dessin — LE réglage critique

C'est l'unique mécanisme qui empêche un civil de dessiner le mot en entier
(décision §2 : pas d'autre garde-fou). Valeurs de départ, à ajuster :

| Paramètre | V1 | Pourquoi |
|---|---|---|
| Temps de dessin par tour | **15 s** | Assez pour 2-3 formes, pas pour une scène complète |
| Temps de débat | 60 s (l'hôte peut couper court) | C'est LE moment du jeu |
| Temps de vote | 20 s | Vite, sous pression |

## 5. Conditions de victoire (actées)

| Situation | Vainqueurs |
|---|---|
| Tous les traîtres éliminés (à n'importe quel tour) | **Civils** — la partie s'arrête immédiatement |
| Au moins un traître vivant après le reveal final du tour 3 | **Traîtres** (tous, y compris ceux éliminés ❓ Q3) |

Proposition de points (à valider) : victoire civils → +100 par civil vivant,
+50 par civil éliminé ; victoire traîtres → +150 par traître vivant, +75 par
traître éliminé. Bonus +25 à chaque joueur dont le vote a éliminé un traître.

## 6. Les reveals immersifs (demande explicite : "un truc immersif")

Moment signature du jeu à la TV :

1. Les votes tombent un par un à l'écran (compteur par avatar, son de tampon).
2. **ROULETTE** : les avatars des joueurs défilent dans une roue qui ralentit
   (réutiliser le pattern d'animation à suspense de `LetterReveal` du P'tit
   Bac : easing quadratique, ça existe déjà) et s'arrête sur l'éliminé.
3. Carte de rôle qui se **retourne** : CIVIL (bleu, son triste — "vous avez
   tué un innocent") / IMPOSTEUR (orange, reveal de SON mot) / MISTER WHITE
   (blanc glacial, silence puis sting sonore).
4. Au reveal final : les deux mots (civil + imposteur) sont affichés, et la
   grille des toiles est rejouée en accéléré (les snapshots du moteur Dessin
   servent déjà à ça).

## 7. Réutilisation technique (pourquoi ce jeu est "pas cher" à coder)

| Brique | Vient de | Adaptation |
|---|---|---|
| Canvas + snapshots + payload límite | Dessin (`draw.ts`, moteur existant) | Multi-tours : on conserve la toile entre les rounds |
| Rôles secrets distribués sur téléphone | Loup-Garou | Simplifié (3 rôles au lieu de N) |
| Votes + décompte + élimination | Loup-Garou | Vote multiple au tour 3 (nouveau) |
| Animation à suspense | `LetterReveal` (P'tit Bac) | Roulette d'avatars |
| Realtime, sessions, lobby, scores | Socle Interactive | Rien à changer |

**Le seul VRAI développement nouveau** : la machine à états du jeu
(6 phases × 3 tours), le vote multiple, et l'écran roulette.
Estimation honnête : effort comparable au Loup-Garou. **Prérequis process :
ajouter `faussaire` PARTOUT dès le jour 1** — whitelist `actions.ts`, type
union, CHECK constraint SQL, routing lobby/host (leçon du bug Laser 07/2026).

## 8. Banque de mots (paires civil ↔ imposteur)

Le mot imposteur doit être assez proche pour que son dessin soit plausible,
assez différent pour le trahir si on le pousse à préciser. ~30 paires V1 :

| Civil | Imposteur | | Civil | Imposteur |
|---|---|---|---|---|
| Phare | Fusée | | Guitare | Raquette de tennis |
| Chat | Tigre | | Croissant | Banane |
| Pizza | Camembert | | Lune | Ballon de foot |
| Château | Église | | Moustache | Sourcil |
| Abeille | Mouche | | Montgolfière | Glace à l'italienne |
| Douche | Cascade | | Tour Eiffel | Pylône électrique |
| Escargot | Tourbillon | | Lunettes | Vélo (vu de face) |
| Igloo | Tente | | Micro | Glace en cornet |
| Palmier | Feu d'artifice | | Serpent | Rivière |
| Roi | Joker | | Cactus | Hérisson |
| Ancre | Hameçon | | Nuage | Mouton |
| Éclair (orage) | Zigzag/Z | | Couronne | Soleil levant |
| Poulpe | Araignée | | Baguette | Épée |
| Cerf-volant | Losange | | Tornade | Cornet de glace |
| Bonhomme de neige | Chamallow | | Volcan | Montagne |

*(Éviter les mots à détail signature évident — "Tour Eiffel" est limite,
gardé pour tester : son dessin minimal ressemble à un pylône.)*

## 9. Modèle de données (esquisse)

- `sessions.game_type = 'faussaire'` + `current_state` JSON :
  `{ phase, tour, motCivil, motImposteur, roles: {playerId: role},
  elimines: [playerId], votes du tour }` — ⚠️ comme au Loup-Garou, les rôles
  ne doivent JAMAIS transiter vers les clients non concernés : distribution
  par requête filtrée par joueur (chacun ne lit que SON rôle), pas de state
  complet broadcast.
- Réutilise `draw_snapshots` (ou équivalent) pour les toiles, avec `tour`.
- Table `faussaire_votes (session_id, tour, votant_id, cible_id)` — au tour 3,
  plusieurs lignes par votant.

## 10. Questions ouvertes (à trancher avant de coder)

1. **Q1 — Vote final** : formulation retenue = "coche tous ceux que tu penses
   traîtres" (majorité = éliminé). L'alternative lue dans la demande ("vote
   pour qui tu penses être CIVIL", les non-désignés sautent) donne un jeu
   plus punitif. → Confirmer la version cochage des suspects.
2. **Q2 — Les éliminés votent-ils encore ?** Reco : oui (ils s'ennuient
   sinon), mais leur vote compte simple. Alternative : spectateurs muets.
3. **Q3 — Un traître éliminé partage-t-il la victoire des traîtres ?**
   Reco : oui (esprit d'équipe), points réduits (§5).
4. **Q4 — L'imposteur sait-il qu'il est imposteur ?** Deux écoles : il sait
   (il voit "IMPOSTEUR" + son mot) ou il croit être civil (chaos maximal,
   mais frustrant). Reco V1 : il sait.

## 11. Place dans la roadmap

1. Déployer + valider les correctifs playtest 07/2026 (en cours).
2. Trancher les 4 questions ouvertes (5 min de discussion).
3. Développer Faussaire (effort ~Loup-Garou), playtest interne, itérer sur
   le chrono de 15 s.
4. Ce chantier est indépendant de Compta (produit prod ≠ outil interne) mais
   ne doit pas servir d'excuse pour ne pas finir Compta Lot 1.

*Fin de fiche — Faussaire V1, 10/07/2026*
