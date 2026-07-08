# CDC — Jeu « LASER » (inspiré de Blind Shot, adapté au format Interactive)

> Cahier des charges d'un NOUVEAU jeu pour Velito Interactive. Nom de code :
> **LASER** (provisoire). `game_type = 'laser'`.
> Rédigé le 2026-07-07, **révisé** après identification de la source : le jeu
> Roblox **Blind Shot** (déc. 2024). On en garde l'ESPRIT, pas le code.
>
> Archi (comme les 8 jeux existants) : **host** (TV, pilote) + **play**
> (`/play/[code]`, mobile de chaque joueur) + **realtime Supabase** + **logique
> pure testable** dans `lib/games/laser.ts`.

---

## 0. La source & ce qu'on garde / ce qu'on adapte

**Blind Shot (Roblox)** : joueurs **invisibles** ; chaque arme projette un
**laser** ; toucher = éliminer ; la **plateforme rétrécit**. C'est un **shooter
temps réel**.

**Ce qu'on GARDE (l'ADN) :**
- Joueurs **invisibles pendant le placement** — on ne voit rien des autres.
- Visée = **rayon directionnel** (un laser, pas un point).
- **Une touche = élimination** (pas de points de vie).
- **Zone qui rétrécit** + **dernier debout gagne**.

**Ce qu'on ADAPTE (contrainte plateforme) :** Interactive n'est pas un moteur
temps réel — c'est **TV + manette mobile, par manches**. Donc pas de déplacement
continu : chaque manche = **placement + visée à l'aveugle**, puis **reveal
simultané** — au décompte, **avatars ET lasers apparaissent en même temps** sur
la TV. C'est fidèle à la tension « blind » sans nécessiter de netcode temps réel.

**Règles SIMPLES (décision Clavel 08/07) :** pas de PV, **pas de malus de raté**
(rater = rien), pas de mêlée finale, pas de power-ups en v1.

---

## 1. Le pitch (30 s)

Arène carrée, joueurs **invisibles**. Chaque manche, en secret : tu **te places**
et tu **oriente ton laser** dans une direction. Au décompte → **REVEAL sur la
TV** : tous les avatars et leurs lasers apparaissent d'un coup. **Ton rayon
touche un adversaire → il est éliminé. Tu rates → rien, tant pis.** La **zone
rétrécit** (hors zone = éliminé). **Dernier debout gagne.**

Premier jeu **PvP à élimination** de la plateforme.

---

## 2. Choix de conception (FIGÉS)

| Décision | Choix | Pourquoi |
|---|---|---|
| **Visée** | **RAYON directionnel** (position + angle) | Le laser qui traverse = tout l'intérêt. |
| **Reveal** | Avatars **ET** lasers apparaissent **ensemble** au décompte | Invisibles pendant le placement, révélés d'un coup. |
| **Toucher** | 1 touche = **éliminé** (pas de PV) | Simple, lisible, tendu. |
| **Raté** | **Aucune** conséquence | On garde ça simple (décision Clavel). |
| **Zone** | Rétrécit ; **hors zone = éliminé** | Force le regroupement → plus de lasers qui se croisent. |
| **Repère** | Carré **normalisé 0→1** | Même logique TV / téléphones. |
| **Secret** | Positions + visées **jamais** diffusées avant le reveal (RLS) | Anti-triche : le voisin ne voit pas où tu es. |

---

## 3. Règles détaillées (v1)

**Mise en place.** Session `laser`, lobby standard. Arène = `[0,1]²`. Zone active
de départ = tout le carré.

**Une manche.**
1. **Phase `aim`** (défaut 15 s) : chaque joueur VIVANT place sa **position**
   `(px,py)` DANS la zone active et choisit un **angle de tir** `θ` (direction du
   laser). Verrouillage manuel ou auto en fin de timer. Rien de visible des autres.
2. **Phase `reveal`** (défaut 6 s, TV) : au décompte, **avatars + lasers
   apparaissent ensemble** et « tirent » simultanément. Chaque laser = un
   **segment** partant de la position du tireur, direction `θ`, jusqu'au bord.
   - **Touché → éliminé** : le laser du tireur T touche la cible C si la
     **distance du point C au segment-laser de T** est `< RAYON_TOUCHE` (T ≠ C).
     Toute cible touchée par ≥ 1 laser est **éliminée** (une fois, peu importe le
     nombre de lasers).
   - **Raté** : le laser ne touche personne → **aucune conséquence**.
   - **Hors zone** : joueur hors de la zone active → **éliminé**.
   - **Absent** (pas de coup joué) : **éliminé**.
3. **Rétrécissement** de la zone pour la manche suivante.
4. **Fin** : ≥ 2 vivants → nouvelle manche ; 1 vivant → **il gagne** ; 0 vivant
   (élimination mutuelle) → **égalité** entre les derniers vivants d'avant.

**Classement** = ordre d'élimination inversé (vainqueur 1er), via
`eliminated_round`.

---

## 4. Anti-triche & équité

- **RLS `laser_moves`** : un joueur ne peut **lire** que sa propre ligne tant que
  la session n'est pas en `reveal`/`final` (le laser du voisin reste secret).
- **Résolution 100 % serveur** (`revealLaserRoundAction`) : le client n'affiche
  que le résultat déjà calculé. Impossible de tricher sur les touches.
- **Bornage serveur** : position rejetée/clampée si hors `[0,1]` ou hors zone
  active ; angle normalisé `[0, 2π[`.

---

## 5. Algorithmes — le cœur testable `lib/games/laser.ts` (PUR) ✅ FAIT

> **Lot A codé et testé le 08/07/2026 : 32/32 tests verts, tsc 0 erreur.**

**Zone**
```
zonePourManche(round): { min, max }   // carré centré, rétréci, borné à ZONE_MIN_HALF
estDansZone(p, zone): boolean
```

**Laser = segment**
```
distance(a, b): number
extremiteLaser(pos, angle): Point      // point où le rayon sort de l'arène [0,1]²
distancePointSegment(p, a, b): number  // distance d'un point à un segment
laserTouche(tireurPos, angle, ciblePos, rayon): boolean
```
`laserTouche` = `distancePointSegment(ciblePos, tireurPos, extremiteLaser(...)) < rayon`.

**Résolution d'une manche (fonction maîtresse)**
```
resoudreManche(joueurs /*id,pos?,angle?,aJoue*/, zone, rayon):
  → { elimines: id[], survivants: id[], touchesPar: Map<cible,tireur[]>, lasers: LaserTrace[] }
  Élimination (union) : touché ≥1 fois | hors zone | absent.
  Aucun malus de raté, jamais d'auto-touche.
```
**Cas testés :** touche simple ; raté sans conséquence ; ne se touche pas
soi-même ; double touche (2 tireurs → 1 élimination) ; hors zone ; absent ;
duel aligné (2 éliminés, 0 survivant) ; distance = rayon exact (non touché,
strict `<`).

**Constantes** : `RAYON_TOUCHE=0.05`, `AIM_DURATION_SEC=15`,
`REVEAL_DURATION_SEC=6`, `ZONE_SHRINK_PER_ROUND=0.06`, `ZONE_MIN_HALF=0.12`,
`LASER_MIN_PLAYERS=3`.

---

## 6. Machine à états (`sessions.current_state`)

```
interface LaserState {
  phase: "aim" | "reveal" | "final";
  round: number;
  zone: { min: number; max: number };
  aimStartedAt?: string; aimDurationSec?: number;
  revealStartedAt?: string; revealDurationSec?: number;
  lastResolution?: {                     // pour l'animation TV
    lasers: { id, from, to, touche: boolean }[];
    positions: { playerId, x, y }[];
    eliminated: playerId[];
  };
  winners?: playerId[];
}
```
> Interface exacte : `LaserState` exportée depuis `lib/games/laser.ts`.

---

## 7. Modèle de données (SQL)

```
-- game_type : ajouter 'laser' à la contrainte canonique.
create table interactive.laser_moves (
  id         uuid primary key default gen_random_uuid(),
  session_id uuid not null references interactive.sessions(id) on delete cascade,
  round      int  not null,
  player_id  uuid not null references interactive.session_players(id) on delete cascade,
  pos_x real not null, pos_y real not null,     -- position (0..1)
  angle real not null,                          -- direction du laser (rad)
  created_at timestamptz not null default now(),
  unique (session_id, round, player_id)
);
alter table interactive.session_players
  add column if not exists eliminated_round int; -- NULL = encore en vie
```
**RLS `laser_moves`** : insert = sa ligne ; select = sa ligne OU session en
`reveal`/`final`.

---

## 8. Écrans

**Host (TV)** `HostLaserGame.tsx` : arène + zone active + décompte ; au reveal,
tous les **lasers** s'allument (lignes rouges qui traversent), les touchés
clignotent/perdent un PV, les éliminés « tombent », la zone rétrécit. **Les corps
restent discrets** (invisibilité) — on met en scène les **lasers**, c'est ça le
spectacle. Final = `WinnerCelebration` + classement.

**Play (mobile)** `PlayLaserGame.tsx` : carré tactile — pose ton pion (contraint
à la zone) + **fais pivoter la direction du laser** (drag pour l'angle). Aperçu
de TON laser seulement. Bouton **Verrouiller**. Éliminé → écran spectateur.

**Dashboard/landing** : carte LASER (id `laser`, `available: true`).

---

## 9. Plan de build (lots vérifiés)

1. **Lot A — Logique pure** `lib/games/laser.ts` (+ tests). ✅ **FAIT** (32/32).
2. **Lot B — SQL** `sql/interactive-laser-v1.sql` : `laser_moves` +
   `eliminated_round` + RLS secret-avant-reveal + `'laser'`. ✅ **FAIT** (pglast OK).
3. **Lot C — Server actions** `app/host/laser-actions.ts` : start / reveal
   (résolution serveur) / next / end. ✅ **FAIT** (tsc OK).
4. **Lot D — Play (mobile)** `PlayLaserGame.tsx` : placement + angle + verrou. ✅ **FAIT**.
5. **Lot E — Host (TV)** `HostLaserGame.tsx` : arène, décompte, lasers au reveal,
   final. ✅ **FAIT**.
6. **Lot F — Câblage** : dashboard + lobby + routing host/play
   (`game_type === 'laser'`). ✅ **FAIT**. (Landing : volontairement PAS ajouté
   tant que le jeu n'est pas validé en vrai.)

Vérifiable ici : **Lot A** (tests) + typage (tsc) + syntaxe SQL (pglast).
**À jouer pour valider** : realtime, tactile mobile, animation TV.

## Reste à faire côté Clavel (non codable ici)

1. **Appliquer le SQL** `sql/interactive-laser-v1.sql` dans Supabase (SQL Editor),
   APRÈS `interactive-game-type-canonical-v1.sql`.
2. **Tester une vraie partie** : dashboard → carte Laser → session → 3+ tels →
   placer/viser/verrouiller → révéler → vérifier éliminations + zone qui rétrécit.
3. Ajuster au ressenti : `RAYON_TOUCHE`, `AIM_DURATION_SEC`, vitesse de
   rétrécissement (`ZONE_SHRINK_PER_ROUND`) — tout est dans `lib/games/laser.ts`.
4. Choisir le **nom définitif** (si autre que « Laser » → renommer `game_type`
   partout + carte dashboard).

---

## 10. Décisions — tranchées

- Toucher = élimination directe (pas de PV). ✅
- Raté = aucune conséquence. ✅
- Hors zone = éliminé. ✅
- Min joueurs = 3 (`LASER_MIN_PLAYERS`). ✅
- Double touche = 1 élimination. ✅

**Reste à figer :** le **nom définitif** (LASER ? À L'AVEUGLE ? autre) → alignera
`game_type` (aujourd'hui `'laser'`).

Prochaine étape : **Lot B (SQL)** puis Lot C (actions serveur). Dis « go Lot B ».

---

## 11. Note propriété intellectuelle

On s'inspire des **règles/mécaniques** de Blind Shot (non protégeables), mais on
ne copie **ni le code, ni les assets, ni le nom**. Design, identité visuelle et
implémentation sont 100 % Velito. (Cf. politique : pas de clone d'assets.)
