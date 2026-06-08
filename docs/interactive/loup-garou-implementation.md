# Loup-Garou — adaptation à l'archi Velito Interactive

**Statut** : Spec d'implémentation V2 (post-V1 du 25/06/2026)
**À lire après** : `loup-garou-spec.md` (spec produit/règles du jeu)
**Auteur** : Clavel NDEMA MOUSSA — Juin 2026

---

## 0. Ce que ce document apporte

La spec produit (`loup-garou-spec.md`) décrit le QUOI. Ce document décrit le COMMENT, en partant de l'archi Velito Interactive existante (Next.js 16 App Router + Supabase Postgres + Realtime + cookie SSO hub.velito.fr).

Il couvre aussi le **Mode Voiture** : un cas d'usage spécifique aux trajets VEA (déplacements basket, tournois esport, sorties), sans TV publique, avec narration audio en haut-parleur Bluetooth voiture.

---

## 1. Réutilisation du socle V1

Ce qui est **gardé tel quel** depuis le socle V1 :

- `interactive.sessions` : on garde la table, `game_type = 'loup_garou'`
- `interactive.session_players` : on garde la table, juste pseudo + avatar
- RPC `interactive.generate_session_code()` : QR + code 6 caractères
- `current_state jsonb` : encore utilisable, mais beaucoup plus riche pour LG
- Realtime channels Supabase (par sessionId)
- Système d'avatars Wii-style (déjà fait)
- Cookie SSO `.velito.fr` pour l'auth host

Ce qui **doit être ajouté** :

- Nouveau schéma SQL `interactive_lg` (séparation propre) OU tables `interactive.lg_*`
- Pattern RLS "données privées par joueur" — différent de V1 où tout est public
- Machine à états par phase, persistée serveur (pas client comme Quiz)
- Resolver de résolution nocturne (côté Postgres ou Server Action)
- Optionnel : système TTS pour le Mode Voiture

---

## 2. Schéma SQL — proposition

### 2.1 Stratégie générale

**Schéma séparé `interactive_lg`** plutôt que d'étendre `interactive`. Raison : les RLS de Loup-Garou sont totalement différentes (privé par joueur), mélanger les deux dans un même schéma augmente le risque de fuite. Le schéma `interactive_lg` n'expose RIEN par défaut, contrairement à `interactive` qui est en lecture publique.

### 2.2 Tables principales

```sql
-- État d'une partie Loup-Garou (1 ligne par session)
CREATE TABLE interactive_lg.games (
  session_id      uuid PRIMARY KEY REFERENCES interactive.sessions(id) ON DELETE CASCADE,
  phase           text NOT NULL,  -- 'lobby' | 'setup' | 'night_X' | 'day_X' | 'ended'
  phase_step      text,           -- sous-étape : 'savior', 'seer', 'wolves', 'witch', 'reveal', 'debate', 'vote'
  night_number    int DEFAULT 0,
  day_number      int DEFAULT 0,
  mayor_player_id uuid REFERENCES interactive.session_players(id),
  cupid_lovers    uuid[],         -- 0 ou 2 ids
  winner_camp     text,           -- 'village' | 'wolves' | 'white_wolf' | 'lovers' (null tant que pas fini)
  phase_started_at timestamptz,
  phase_duration_sec int,
  created_at      timestamptz DEFAULT now()
);

-- Rôle SECRET de chaque joueur (RLS stricte : seulement le joueur et le host voient)
CREATE TABLE interactive_lg.player_roles (
  player_id        uuid PRIMARY KEY REFERENCES interactive.session_players(id) ON DELETE CASCADE,
  session_id       uuid NOT NULL REFERENCES interactive.sessions(id) ON DELETE CASCADE,
  role             text NOT NULL,    -- 'wolf' | 'white_wolf' | 'villager' | 'seer' | 'witch' | etc.
  alive            boolean DEFAULT true,
  can_vote         boolean DEFAULT true,  -- l'Idiot grillé perd son vote
  death_reason     text,             -- 'wolves' | 'witch' | 'hunter' | 'lover' | 'village_vote' | 'bear' (si V2.2)
  death_night      int,
  death_day        int,
  -- État spécifique à certains rôles
  witch_life_potion_used    boolean DEFAULT false,
  witch_death_potion_used   boolean DEFAULT false,
  savior_last_protected     uuid,   -- pour la contrainte "pas 2 nuits de suite"
  hunter_shot_taken         boolean DEFAULT false,
  -- Position dans l'ordre (pour le Montreur d'Ours)
  seat_order       int NOT NULL
);

-- Log des événements du jeu (1 ligne par action significative)
-- Sert à : auditer, rejouer une phase, debug
CREATE TABLE interactive_lg.events (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id   uuid NOT NULL REFERENCES interactive.sessions(id) ON DELETE CASCADE,
  night_number int,
  day_number   int,
  event_type   text NOT NULL,  -- 'ROLE_ASSIGNED', 'WOLF_VOTE', 'SEER_PEEK', 'WITCH_POTION', 'CUPID_LINK', 'BEAR_GROWL', 'DAY_VOTE', 'DEATH'
  actor_id     uuid REFERENCES interactive.session_players(id),
  target_id    uuid REFERENCES interactive.session_players(id),
  payload      jsonb,          -- détails additionnels (potion type, role peeked, etc.)
  created_at   timestamptz DEFAULT now()
);

-- Votes en cours (nuit des loups + jour du village)
-- 1 ligne par (vote_round, voter) — UPSERT à chaque changement d'avis
CREATE TABLE interactive_lg.votes (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id     uuid NOT NULL REFERENCES interactive.sessions(id) ON DELETE CASCADE,
  vote_round     text NOT NULL,  -- 'night_X_wolves' | 'day_X_village' | 'day_0_mayor'
  voter_id       uuid NOT NULL REFERENCES interactive.session_players(id),
  target_id      uuid REFERENCES interactive.session_players(id),
  created_at     timestamptz DEFAULT now(),
  updated_at     timestamptz DEFAULT now(),
  UNIQUE (vote_round, voter_id)
);
```

### 2.3 RLS — le cœur de la sécurité

```sql
-- player_roles : un joueur ne voit QUE sa propre ligne, le host voit tout
ALTER TABLE interactive_lg.player_roles ENABLE ROW LEVEL SECURITY;

-- Lecture par le host de la session
CREATE POLICY roles_select_host
  ON interactive_lg.player_roles
  FOR SELECT
  USING (
    auth.uid() IN (
      SELECT host_user_id FROM interactive.sessions WHERE id = session_id
    )
  );

-- PROBLÈME : les joueurs sont anonymes (pas de auth.uid()).
-- SOLUTION : un token joueur stocké côté localStorage + RPC qui valide.
-- On expose UN RPC SELECT au lieu d'une lecture directe :
CREATE OR REPLACE FUNCTION interactive_lg.get_my_role(
  p_player_id uuid,
  p_player_token text
) RETURNS TABLE(
  role text,
  alive boolean,
  can_vote boolean,
  witch_life_potion_used boolean,
  witch_death_potion_used boolean
) AS $$
BEGIN
  -- Vérifie que le token correspond bien à ce joueur
  IF NOT EXISTS (
    SELECT 1 FROM interactive.session_players sp
    WHERE sp.id = p_player_id AND sp.player_token = p_player_token
  ) THEN
    RAISE EXCEPTION 'Invalid player token';
  END IF;

  RETURN QUERY
    SELECT pr.role, pr.alive, pr.can_vote,
           pr.witch_life_potion_used, pr.witch_death_potion_used
    FROM interactive_lg.player_roles pr
    WHERE pr.player_id = p_player_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**Requis** : ajouter `player_token uuid DEFAULT gen_random_uuid()` à `interactive.session_players` pour identifier un anon de façon non-tricheable.

### 2.4 Realtime

- `interactive_lg.games` → broadcast UPDATE quand phase change
- `interactive_lg.events` → broadcast INSERT pour les annonces publiques (mort, grognement ours, résultat vote)
- `interactive_lg.player_roles` → **PAS** publié en Realtime (donnée privée). Le joueur poll son rôle via le RPC.

---

## 3. Machine à états

### 3.1 Le défi

Quiz et Petit Bac sont des cycles simples : `question → submit → reveal → next`. Loup-Garou a un cycle imbriqué avec sous-phases ordonnées et asymétriques. **L'ordre nocturne est une règle du jeu, pas un détail d'implémentation.**

### 3.2 Représentation

Un seul `phase` ne suffit pas. Il faut `phase + phase_step` :

```typescript
type Phase = 'lobby' | 'setup' | 'night' | 'day' | 'ended';

type NightStep =
  | 'savior'      // Salvateur protège
  | 'seer'        // Voyante sonde
  | 'wolves'      // Loups votent
  | 'white_wolf'  // Loup Blanc (nuits paires)
  | 'witch'       // Sorcière
  | 'resolution'; // Serveur résout

type DayStep =
  | 'bear_growl'  // Annonce ours
  | 'reveal'      // Annonce morts de la nuit
  | 'debate'      // Discussion libre
  | 'vote'        // Vote village
  | 'execution';  // Résolution du vote
```

### 3.3 Transitions

Toutes les transitions de phase sont **côté serveur**, dans des Server Actions. Le client ne déclenche JAMAIS un changement de phase directement — il agit (vote, peek, potion), et le serveur décide si la phase peut avancer.

Critères pour avancer automatiquement :
- Tous les joueurs concernés ont agi
- OU le timer a expiré

Le serveur tranche **toujours** au timer, même si un joueur AFK. C'est la règle du #7 de ta spec.

---

## 4. Composants Next.js — vue d'ensemble

```
apps/interactive/
├── app/
│   ├── host/
│   │   ├── HostLoupGarouGame.tsx        # Composant TV principal
│   │   ├── loup-garou-actions.ts        # Server actions (startGame, nextPhase, etc.)
│   │   └── loup-garou/
│   │       ├── LoupGarouLobby.tsx       # Pré-distribution rôles
│   │       ├── LoupGarouNight.tsx       # Narration nuit + timer
│   │       ├── LoupGarouDay.tsx         # Débat + vote agrégé
│   │       └── LoupGarouEnd.tsx         # Camp gagnant + récap
│   ├── play/[code]/
│   │   ├── PlayLoupGarouGame.tsx        # Composant téléphone principal
│   │   └── loup-garou/
│   │       ├── RoleCard.tsx             # Affiche ton rôle secret
│   │       ├── NightSleepScreen.tsx     # "Tu dors 🌙" (joueurs hors phase)
│   │       ├── SeerPeek.tsx             # Voyante choisit une cible
│   │       ├── WitchPotions.tsx         # Sorcière 2 boutons potions
│   │       ├── WolfVote.tsx             # Loups votent
│   │       ├── HunterShot.tsx           # Chasseur tire en mourant
│   │       ├── CupidLink.tsx            # Cupidon choisit amoureux
│   │       ├── MayorVote.tsx            # Élection du maire
│   │       └── DayVote.tsx              # Vote village
└── lib/games/
    ├── loup-garou-roles.ts              # Définitions de rôles + helpers
    ├── loup-garou-state.ts              # Types de l'état partie
    └── loup-garou-resolver.ts           # Résolution nocturne pure (testable)
```

---

## 5. Resolver — la pièce critique

Le `loup-garou-resolver.ts` est une **fonction pure** (entrée → sortie déterministe) qui calcule les morts d'une nuit. C'est la pièce qu'il faut **tester en unitaire à fond** parce que c'est là que toutes les règles s'imbriquent.

```typescript
interface NightInput {
  wolves_target: uuid | null;
  white_wolf_target: uuid | null;
  witch_life_used_on: uuid | null;
  witch_death_used_on: uuid | null;
  savior_protected: uuid | null;
  lovers: [uuid, uuid] | null;
  hunter_id: uuid | null;
  all_players: PlayerRole[];
}

interface NightOutput {
  deaths: Array<{
    player_id: uuid;
    cause: 'wolves' | 'witch' | 'hunter' | 'lover' | 'white_wolf';
    triggered_by: uuid | null;
  }>;
  hunter_must_shoot: uuid | null; // si le chasseur meurt, il a une action à faire
  winner_camp: 'village' | 'wolves' | 'white_wolf' | 'lovers' | null;
}

export function resolveNight(input: NightInput): NightOutput {
  // 1. Victime des loups ?
  let wolves_kill = input.wolves_target;
  if (wolves_kill === input.savior_protected) wolves_kill = null;
  if (wolves_kill === input.witch_life_used_on) wolves_kill = null;

  // 2. Victime du Loup Blanc (déjà filtrée par "nuit paire" côté caller)
  const white_wolf_kill = input.white_wolf_target;

  // 3. Victime de la potion de mort
  const witch_kill = input.witch_death_used_on;

  // 4. Construire la liste des morts directes
  const direct_deaths = [wolves_kill, white_wolf_kill, witch_kill].filter(Boolean);

  // 5. Cascade des amoureux
  // ...
}
```

**Stratégie tests** : `loup-garou-resolver.test.ts` avec **30+ cas** couvrant les croisements (Sorcière ressuscite la victime du Chasseur qui tire sur un Amoureux, etc.). C'est ici que se cachent les bugs de règle.

---

## 6. Mode Voiture — section dédiée

### 6.1 Pourquoi un mode spécial

Le contexte voiture introduit des contraintes que la version bar/MJC n'a pas :
- **Pas de TV publique** disponible
- **Conducteur** = ne doit JAMAIS regarder son écran en roulant
- **Audio** est le seul canal partagé (haut-parleur Bluetooth voiture)
- **Ergonomie ratio temps/intérêt** : 30 min de partie quand on a 1h30 de trajet, OK ; pas 2h
- **Connectivité 4G** instable en zone rurale

### 6.2 Architecture

**Pas de séparation host/players visuelle.** Tout le monde est sur son téléphone. Un téléphone "host" est désigné — typiquement celui du conducteur si pas en mouvement, ou un passager — et c'est celui qui :
- Affiche le code à crier (au lieu de QR)
- Diffuse l'audio TTS sur les haut-parleurs (jack ou Bluetooth voiture)
- Pilote les transitions de phase

Côté techniquement c'est le même HostLoupGarouGame, juste avec un flag `audio_only: true` dans `interactive_lg.games`.

### 6.3 Narration audio

Deux niveaux d'ambition :

**MVP — Web Speech API** (gratuit, dispo natif sur tous les navigateurs)
```typescript
const utterance = new SpeechSynthesisUtterance(
  "Le village s'endort. Les loups, réveillez-vous et choisissez votre victime."
);
utterance.lang = 'fr-FR';
utterance.rate = 0.95;
utterance.pitch = 0.85;
speechSynthesis.speak(utterance);
```
Limite : la voix par défaut Android/iOS est OK mais pas excellente. Aucun coût.

**V3 — Pré-rendu audio** : générer toutes les phrases narratives avec ElevenLabs / Coqui / Google Cloud TTS, stocker en MP3 sur Supabase Storage, jouer via `<audio>` HTML. Meilleure qualité, ambiance plus pro. Coût : ~5€/mois pour ElevenLabs si pas trop de variantes.

### 6.4 Écran joueur en voiture

**Trois principes ergonomiques** :
1. **Sombre + grand texte** : on lit par dessus l'épaule du voisin, ou dans le noir.
2. **Vibration au lieu de notification visuelle** : `navigator.vibrate(200)` quand c'est ton tour. Le joueur sait sans regarder.
3. **Pas de chrono visible quand tu n'agis pas** : juste "Repos. La nuit continue." Réduit la fatigue visuelle.

```tsx
// Exemple : écran "tu dors" pour joueurs non concernés
<div className="grid min-h-screen place-items-center bg-black text-white">
  <div className="text-center">
    <p className="text-9xl">🌙</p>
    <p className="mt-6 font-display text-2xl">Tu dors…</p>
    <p className="mt-2 text-xs text-white/40">La nuit continue.</p>
  </div>
</div>
```

### 6.5 Sécurité conducteur

**Règle non-négociable** : le conducteur **n'a pas de rôle de joueur**. Soit il est juste host (téléphone fixé sur le tableau de bord, regarde la route et appuie sur "Phase suivante" si besoin), soit il est totalement spectateur audio.

Implémenter une checkbox au démarrage : "Je conduis — pas de rôle pour moi" qui retire ce téléphone du tirage de rôles.

### 6.6 Tolérance réseau

En zone rurale, la 4G peut chuter à 200 kbps ou tomber 30s. Conséquences :
- Pas de Realtime fiable → les phases peuvent ne pas se synchroniser
- Risque : un joueur croit qu'on est en "vote village" alors qu'on est passé en "nuit"

Mitigations :
- **Polling de secours** : si le Realtime channel décroche, on fallback sur un fetch toutes les 5s
- **Cache local** de la dernière phase connue avec timestamp ; si reconnect, on rejoue les events manqués
- **Indicateur de connexion** visible : petit point vert/rouge en coin d'écran

Pour MVP voiture, on accepte que ça soit imparfait. On documente "marche bien en zone urbaine, dégradé en zone rurale". Pas la peine de coder du offline-first pour le V2 initial.

### 6.7 Cas d'usage VEA précis

**Trajet basket** (~1h Amiens-Lille par exemple) :
- Joueuses installées, conducteur Clavel
- Clavel lance la session sur SON tel, partage le code à l'oral
- Les filles se connectent depuis leur tel
- Clavel coche "Je conduis", la partie démarre
- Audio sortant sur l'auto-radio via Bluetooth
- Première partie 25 min, deuxième partie 20 min, troisième partie 30 min
- 1h15 occupées, ambiance assurée

**Sortie VEA** (mini-bus tournoi esport) :
- Pareil, mais 8 joueurs → ambiance plus dense
- Possibilité de mode "spectateur audio" pour le pilote si plusieurs adultes

---

## 7. Plan de livraison en sprints

### Sprint 0 — Playtest papier (1 semaine)

**OBLIGATOIRE avant toute ligne de code.**

- 3 parties papier avec le bureau VEA + 2 sorties basket
- Carnet de notes : timings réels, rôles sous-utilisés/trop forts, points de friction
- Décision finale sur le sous-ensemble de rôles V2.0a

Livrable : un mémo `loup-garou-playtest-juin-2026.md` dans `docs/interactive/`.

### Sprint 1 — V2.0a (1 semaine de dev)

5 rôles : Loup, Villageois, Voyante, Sorcière, Maire.
Pas de Loup Blanc, pas de Chasseur, pas de Cupidon.
Pas encore de Mode Voiture (juste mode bar/MJC).

Livrable : une partie de 15 min jouable à 5-7 joueurs.

### Sprint 2 — V2.0b (4-5 jours)

Ajout : Chasseur, Cupidon, Idiot du Village.
Ces 3 rôles touchent peu au resolver, donc additionnels propres.

### Sprint 3 — Mode Voiture (3-4 jours)

- Flag `audio_only` + UI mode sombre/silencieux
- TTS Web Speech API
- Checkbox "Je conduis"
- Tests sur trajet réel Amiens-Lille

### Sprint 4 — V2.0c (5 jours)

Ajout : Loup Blanc (= 3e camp + condition victoire), Montreur d'Ours, Bouc Émissaire.
**Sprint critique** : c'est ici qu'on touche la condition de victoire et le voisinage dynamique.

### Sprint 5 — V2.1 (1-2 semaines)

Salvateur, Voleur, bonus Bouc Émissaire. Polish, tests à grande échelle.

---

## 8. Décisions à prendre AVANT de coder

| Décision | Recommandation | Pourquoi |
|---|---|---|
| Schéma SQL séparé `interactive_lg` ? | OUI | Sécurité RLS, séparation propre |
| Token joueur anon (player_token) ? | OUI | Sans ça, n'importe qui peut lire le rôle de n'importe qui |
| Narration auto ou meneur humain ? | **Meneur humain** en V2, auto en V3 | Évite 1 semaine de prod audio en V2 |
| TTS Web Speech ou MP3 pré-rendus ? | Web Speech en MVP, MP3 V3 | Coût zéro pour démarrer |
| Set V2.0 à 11 rôles ou progressif ? | **Progressif** (V2.0a = 5 rôles) | Sinon tu te noies dans le debug |
| Resolver côté Postgres ou Node ? | **Node** (Server Action) | Plus facile à tester unitaire, refactor possible |
| Mode Voiche partage avec V1 ? | Non en V2 — réserver Voice Mode à LG | Quiz et Petit Bac ne le justifient pas. |

---

## 9. Risques identifiés

1. **Le resolver nocturne est buggé** → partie inachevable. **Mitigation** : 30+ tests unitaires sur cas tordus.
2. **Un joueur fuite son rôle** (capture d'écran + envoi via WhatsApp). **Mitigation** : aucune technique. C'est un jeu social, on assume la confiance. À documenter dans les CGU.
3. **AFK fige la partie** → règle d'or : le timer décide. Tester explicitement le cas "Voyante AFK".
4. **Mode Voiture en zone blanche** → partie se fige. Mitigation : polling de secours + cache local. Accepter une dégradation honnête.
5. **Sur-engagement** : tu codes 4 semaines et personne ne joue parce que tu n'as pas validé l'envie. **Mitigation** : Sprint 0 obligatoire.

---

## 10. Ce qui n'est PAS dans ce document

- Le **branding** (couleurs, icônes, musique d'ambiance) : à voir avec velito-webdesign
- L'**i18n** (français only en V2)
- Le **mode tournoi** (plusieurs parties classées, leaderboard inter-parties)
- Les **packs de variantes** (Loup-Garou Halloween, Loup-Garou Inversé, etc.)
- Le **multi-host** (plusieurs animateurs sur une session)

À adresser uniquement quand le V2 vanilla tourne et trouve son public.

---

*Spec technique d'implémentation. À conserver à côté de `loup-garou-spec.md` dans `docs/interactive/`. Tout écart à cette archi doit être justifié dans un mémo séparé.*
