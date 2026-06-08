# Loup-Garou — Velito Interactive

**Statut** : Backlog V2 (post-livraison V1 du 25/06/2026)
**Dernière mise à jour** : Juin 2026
**Auteur** : Clavel NDEMA MOUSSA

---

## Pitch

Le jeu de bluff et de déduction sociale classique, en version sans cartes physiques. Chaque joueur reçoit son rôle secret sur son smartphone, la TV joue le rôle du narrateur et orchestre les phases jour/nuit, et le groupe débat à voix haute pour démasquer les loups. Conçu pour bars, MJC — et trajets en voiture (cas d'usage d'origine : occuper un groupe de jeunes en déplacement).

## Joueurs et durée

- **Minimum** : 5 joueurs (en dessous, le bluff ne fonctionne pas).
- **Maximum V2** : 18 joueurs.
- **Recommandé** : 7 à 12.
- **Durée d'une partie** : 15 à 30 min. Une soirée enchaîne plusieurs parties — les morts rejouent à la suivante.

---

## 1. Les rôles

### Camp des Loups — éliminer tous les villageois

- **Loup-Garou.** Se réveille la nuit, vote avec les autres loups pour désigner une victime. Règle indicative : ~1 loup pour 4-5 joueurs.

### Camp solo — ni Village, ni Loups

- **Loup Blanc.** Se réveille chaque nuit avec les loups (il les connaît, ils le connaissent) et vote avec eux. Une nuit sur deux, il se réveille une seconde fois, seul, après les loups, et peut dévorer un autre loup. Il ne gagne que s'il est le dernier survivant — il doit donc trahir son propre camp. Troisième camp à lui seul.

### Camp du Village — éliminer tous les loups

- **Simple Villageois.** Aucun pouvoir. Sa parole et son vote.
- **Voyante.** Chaque nuit, regarde le rôle d'un joueur (info privée sur son tel).
- **Sorcière.** 2 potions à usage unique : potion de vie (ressuscite la victime des loups) et potion de mort (élimine un joueur). Joue après avoir vu qui les loups ont attaqué.
- **Chasseur.** S'il meurt (jour ou nuit), il tire une dernière balle et emporte un joueur de son choix.
- **Cupidon.** Première nuit uniquement, désigne deux amoureux (peut s'inclure). Si l'un meurt, l'autre meurt de chagrin. Les amoureux gagnent ensemble.
- **Salvateur / Garde.** Chaque nuit, protège un joueur de l'attaque des loups. Ne peut pas protéger la même personne deux nuits de suite.
- **Voleur.** Au tout début, peut échanger son rôle avec celui d'un autre joueur (variante : pioche parmi 2 rôles non distribués). Devient ce nouveau rôle pour toute la partie.
- **Montreur d'Ours.** Aucune action nocturne. Chaque matin, le serveur vérifie ses deux voisins directs vivants : si au moins un est loup, l'ours grogne (annonce publique sur la TV). Sinon, silence. Détecteur de proximité, pas d'identité.
- **Idiot du Village.** S'il est désigné par le vote de jour, son rôle est révélé et il ne meurt pas — mais perd définitivement son droit de vote. Cette grâce vaut uniquement contre l'exécution villageoise : la nuit (loups, sorcière, chasseur, chagrin), il meurt normalement.
- **Bouc Émissaire.** Aucune action nocturne. Si un vote de jour aboutit à une égalité non tranchable, c'est lui qui meurt à la place de "personne". Bonus V2.1 : avant de mourir, désigne qui sera privé de vote le lendemain.

### Rôle transverse — élu, non distribué

- **Maire / Capitaine.** Élu par le village au premier jour. Vote double, tranche les égalités de jour.

---

## 2. Déroulé d'une partie

### Phase 0 — Mise en place (une seule fois)

1. Distribution aléatoire et secrète des rôles par le serveur.
2. Nuit préparatoire :
   - Cupidon désigne les deux amoureux (~60s).
   - Voleur fait son échange éventuel (~30s) ; le joueur volé découvre son nouveau rôle.
3. Élection du Maire par le village (~60s).

### Phase Nuit (récurrente) — l'ordre de résolution EST la règle

1. **Salvateur** — protège une cible (~30s).
2. **Voyante** — sonde le rôle d'un joueur (~30s), réponse privée.
3. **Loups (+ Loup Blanc)** — votent une victime ensemble (~60s). Plus de voix meurt ; égalité → personne ne meurt (force la coordination des loups).
4. **Loup Blanc** (nuits paires uniquement) — se réveille seul après les loups, peut dévorer un loup (~30s).
5. **Sorcière** — voit la victime des loups, décide d'utiliser potion de vie et/ou potion de mort (~30s).
6. **Résolution serveur** — calcule les morts réels :
   - Victime des loups SAUF si protégée (Salvateur) ou ressuscitée (Sorcière)
   - Victime de la potion de mort
   - Victime du Loup Blanc
   - Déclenchement amoureux (si l'un meurt, l'autre meurt)
   - Déclenchement Chasseur (s'il meurt, il tire une balle)

### Phase Jour (récurrente)

1. **Grognement de l'ours** — le serveur vérifie le voisinage du Montreur d'Ours ; la TV annonce "🐻 L'ours grogne !" ou reste silencieuse.
2. **Révélation** — la TV annonce les morts de la nuit et révèle leurs rôles.
3. **Débat (~120s)** — accusations, défenses. Si tous ont voté avant la fin, le chrono s'arrête.
4. **Vote du village** — chacun vote sur son tel le joueur à éliminer.
5. **Résolution du vote** (voir ordre de priorité ci-dessous).
6. **Exécution** — l'éliminé est révélé. Déclenchements en cascade.

### Ordre de priorité de la résolution du vote de jour

Règle du jeu à part entière :

1. Compter les voix, en ignorant les joueurs privés de vote (Idiot révélé…).
2. Le Maire départage (voix double).
3. Si le désigné est l'Idiot du Village (non encore grillé) → il survit, perd son vote, personne ne meurt ce tour.
4. Si égalité persiste malgré le Maire → le Bouc Émissaire meurt s'il est vivant ; sinon personne ne meurt.
5. Exécution → déclenchements en cascade (Chasseur, amoureux).

### Conditions de victoire (vérifiées après chaque mort)

- **Village** gagne si tous les loups (et le Loup Blanc) sont morts.
- **Loups** gagnent s'ils sont en nombre égal ou supérieur aux villageois (et le Loup Blanc éliminé).
- **Loup Blanc** gagne s'il est le dernier survivant.
- **Amoureux** gagnent s'il ne reste qu'eux deux, même de camps opposés.

---

## 3. Répartition TV / Smartphone

### TV — écran public (ne montre JAMAIS d'info secrète)

- QR + code/PIN d'entrée, liste des joueurs en lobby.
- Narration de chaque phase (texte + idéalement audio).
- Timer de la phase en cours.
- Annonces publiques : grognement de l'ours, morts révélés, résultats de vote, fin de partie.

### Smartphone — vue privée, propre à chaque joueur

- Saisie du pseudo à l'entrée.
- Carte de rôle secrète (différence majeure avec les 4 jeux V1).
- Pendant sa phase active : interface d'action de son rôle.
- Hors de sa phase : écran neutre ("La nuit, tu dors… 🌙") qui ne révèle rien.
- Élection du Maire et votes de jour.
- Feedback privé : "Tu as survécu" / "Tu es mort".

---

## 4. Rôle de l'animateur

La distribution des rôles est automatique et secrète, gérée par le serveur — l'animateur ne distribue rien à la main.

Deux philosophies de narration, à trancher au dev :

- **Narration automatique par la TV** : l'app narre, l'animateur ne fait que lancer et modérer. Plus vendable en bar, mais demande de produire toute la narration.
- **Meneur humain** : un animateur lit la narration depuis le panel Animation. Plus simple à coder, mais dépend d'un humain qui connaît le jeu.

Dans les deux cas, le panel animateur permet : lancer/pauser une phase, relancer une phase buggée, kicker un joueur déconnecté, forcer la résolution au bout du timer.

**Point critique** : un joueur AFK ne doit jamais figer la partie — le serveur tranche systématiquement à l'expiration du timer.

---

## 5. Notes d'architecture (justifient le classement V2)

1. **État privé par joueur.** Les 4 jeux V1 ont des données publiques (`session_players SELECT USING (true)`). Loup-Garou exige des données visibles uniquement par leur propriétaire (rôle, vision de la Voyante). Nécessite un schéma de jeu séparé avec policies RLS restrictives.
2. **Machine à états à phases ordonnées et asymétriques**, là où les 4 jeux V1 sont un cycle "prompt → submit parallèle → score". L'ordre de résolution nocturne ne tolère aucune erreur de séquencement.
3. **État de partie riche et persistant** : morts, protégés, amoureux, rôle après échange du Voleur, potions restantes, compteur de nuits (Loup Blanc), droit de vote par joueur. Table `session_events` JSONB typée peut encaisser ça (`ROLE_ASSIGNED`, `WOLF_VOTE`, `WHITE_WOLF_KILL`, `SEER_PEEK`, `WITCH_POTION`, `CUPID_LINK`, `BEAR_GROWL`, `DAY_VOTE`…).
4. **Propriété centrale "droit de vote par joueur"** (`peut_voter: boolean`). L'Idiot et le bonus du Bouc Émissaire la modifient ; plusieurs règles la lisent. À modéliser proprement dès le départ.
5. **Voisinage dynamique** (Montreur d'Ours) : ordre stable des joueurs + recalcul du voisinage quand des joueurs meurent.
6. **Condition de victoire à trois camps** (Loup Blanc) : plus binaire Village/Loups, une branche supplémentaire teste le survivant unique.
7. **Gestion AFK / déconnexion** : le serveur doit toujours pouvoir trancher au bout du timer. Pattern de résilience plus exigeant que les autres jeux.
8. **Réutilise quand même le socle V1** : timer serveur, soumission par joueur, agrégation de votes, lobby QR+PIN. Pas 100% from scratch.

---

## 6. Priorisation

- **V1 (25/06/2026)** : inchangé. Loup-Garou n'y est pas.
- **V2** : Loup-Garou = candidat n°1. Terrain de test : trajets basket + soirée VEA.
- **V2.0 — set minimal jouable** : Loups, Villageois, Voyante, Sorcière, Chasseur, Cupidon, Maire, Montreur d'Ours, Loup Blanc, Bouc Émissaire (pouvoir de base), Idiot du Village.
- **V2.1 — profondeur** : Salvateur, Voleur, bonus du Bouc Émissaire (retrait de votes le lendemain), variante "amoureux d'un loup" du Montreur d'Ours, autres variantes de règles.

---

## 7. Prérequis avant développement

1. V1 d'Interactive livrée et stabilisée (les 4 jeux tournent en conditions réelles, le socle session/staff/realtime est éprouvé).
2. Architecture "état privé par joueur" tranchée : nouveau schéma SQL (`interactive_lg.*` ?) avec policies RLS restrictives, ou extension du schéma `interactive` actuel avec un pattern différent.
3. Choix narration auto vs meneur humain tranché (impacte la prod de contenu audio).
4. Premier playtest sans code : faire tourner une partie en voiture/à VEA avec des cartes papier pour valider les timings et l'équilibrage des rôles avant d'écrire une ligne.

---

*Document de référence pour l'ajout du jeu Loup-Garou au module Velito Interactive (interactive.velito.fr). À conserver dans `docs/interactive/`.*
