# CDC / Game Design Doc — game.velito.fr V1

> **Titre de travail : LE BLOCK** (alternatives : *Quartier Libre*, *La Débrouille*). À trancher avant la mise en ligne.
> Jeu navigateur solo/PvE tour par tour, inspiré des mécaniques de Goodgame Gangster — univers original, aucun asset ni nom repris.
> Statut : cadrage validé le 06/07/2026. Projet plaisir/apprentissage **timeboxé** — ne passe jamais avant MABB Manager (CDA avril 2027) ni la vente de sites VENA.

---

## 1. Concept en une phrase

Tu débarques dans un quartier fictif inspiré d'Amiens, tu pars de rien, et tu montes ta réputation à la débrouille : missions, business, respect — avec les vrais potes de Clavel transformés en personnages dessinés.

## 2. Univers & ton

- **Cadre** : un quartier fictif ("Le Block") librement inspiré d'Amiens — noms de lieux inventés mais clins d'œil locaux (la gare, le stade, le kebab du coin...).
- **Ton** : débrouille, respect, humour. Business de rue légal ou gris (livraisons, organisation de soirées, studio photo improvisé, revente de sneakers...). **Pas de glorification de violence ni de drogue** — c'est ce qui différencie du clone mafia, et c'est cohérent avec l'image VENA/VEA auprès des jeunes et des institutions.
- **Personnages** : PNJ basés sur les proches de Clavel (donneurs de missions, commerçants, rivaux amicaux). Version cartoon dessinée à partir de photos.
  - ⚠️ **Prérequis bloquant** : autorisation écrite de droit à l'image signée par CHAQUE personne avant d'intégrer son perso (usage, durée, transformation cartoon, cas de monétisation future, droit de retrait). Aucun perso en ligne sans papier signé.

## 3. Boucle de gameplay V1 (le cœur)

```
Énergie (régénère avec le temps)
   └─> Faire une MISSION (coûte de l'énergie)
          └─> Gain : Cash + XP + Respect (+ drop d'objet rare)
                 └─> Level up → points de stats → missions plus dures débloquées
                        └─> Cash → ÉQUIPEMENT (améliore les chances de succès)
                        └─> Cash → BUSINESS (revenu passif à collecter)
                               └─> Plus de cash → plus d'équipement/business → nouveaux secteurs du Block
```

Session type visée : 5-10 minutes, 2-3 fois par jour (l'énergie limitée crée le rythme de retour, comme Goodgame).

## 4. Systèmes V1 — règles précises

### 4.1 Personnage (GamePlayer)
- Lié 1-1 au compte SSO Velito existant (`User`). Pas de nouveau système d'auth.
- Création : pseudo de rue + choix d'un avatar de départ.
- **4 stats** : Force, Charisme, Cervelle, Endurance. Départ : 5 points à répartir sur une base de 1 partout.
- Endurance augmente l'énergie max (`énergieMax = 100 + 5 × Endurance`).

### 4.2 Énergie
- Régénération : **+1 toutes les 5 min** (0 → plein en ~8h, aligné sur les standards du genre).
- Calcul **côté serveur uniquement** à partir de `energyUpdatedAt` : on ne stocke jamais un compteur qui "tourne", on calcule `min(max, energy + floor((now - energyUpdatedAt)/5min))` à chaque lecture. Zéro cron nécessaire en V1.

### 4.3 Missions (PvE)
- Chaque mission appartient à un **secteur** du Block et a : coût énergie, difficulté, stat dominante, récompenses.
- **Résolution serveur** : `chanceSuccès = clamp(30% + 8% × (statJoueur + bonusÉquipement − difficulté), 5%, 95%)`.
  - Succès → cash + XP + respect (+ chance de drop d'objet).
  - Échec → énergie consommée quand même, petite XP de consolation (20%). Pas de punition supplémentaire en V1 (pas d'hôpital/prison — V2 éventuel).
- Exemple d'échelle secteur 1 (à équilibrer en jeu) :

| Mission | Énergie | Difficulté | Stat | Cash | XP |
|---|---|---|---|---|---|
| Livrer des colis pour le kebab | 5 | 1 | Endurance | 50 | 10 |
| Coller les affiches du concert | 5 | 1 | Charisme | 40 | 12 |
| Négocier une paire de sneakers | 8 | 2 | Charisme | 120 | 20 |
| Réparer le PC du cybercafé | 8 | 2 | Cervelle | 110 | 22 |
| Organiser le tournoi du foyer | 12 | 3 | Cervelle | 250 | 40 |

### 4.4 Progression
- XP par niveau : `xpRequis(n) = 100 × n^1.5` (arrondi). Level up → **+3 points de stats** à répartir.
- **Respect** = score de réputation cumulatif (jamais dépensé) → débloque les secteurs : secteur 2 à 500 respect, secteur 3 à 2 500, etc.
- V1 : **3 secteurs**, ~15 missions au total. C'est assez pour valider la boucle.

### 4.5 Équipement (GameItem)
- Slots : Tenue, Véhicule, Accessoire (3 slots, simple).
- Un objet donne un bonus fixe à une stat pour le calcul des missions (pas de durabilité en V1).
- Obtention : boutique (cash) + drops rares de missions.

### 4.6 Business (revenu passif)
- Achetables au cash (ex. stand de bouffe, studio photo, borne d'arcade au foyer).
- Génèrent `X cash/heure`, **à collecter manuellement** (cap 8h de stock → incite à revenir, évite l'inflation).
- Même principe que l'énergie : calcul à la lecture depuis `lastCollectedAt`, pas de cron.

### 4.7 Classement
- Leaderboard simple par Respect (lecture seule). C'est la seule dimension "multijoueur" de la V1 — zéro interaction directe entre joueurs.

## 5. Hors scope V1 (verrouillé — on n'ouvre pas)

PvP (même asynchrone), clans/familles, chat, échanges entre joueurs, événements temporels, temps réel/websockets, app mobile, monétisation, mini-jeux du "portail". **Le portail multi-jeux attend d'avoir un 2e jeu.** Chaque idée nouvelle va dans un fichier `IDEES_V2.md`, pas dans le code.

## 6. Modèle de données (Prisma — schéma partagé, préfixe Game)

```prisma
model GamePlayer {
  id              String   @id @default(cuid())
  userId          String   @unique          // FK vers User (SSO)
  pseudo          String   @unique
  cash            Int      @default(100)
  respect         Int      @default(0)
  xp              Int      @default(0)
  level           Int      @default(1)
  statForce       Int      @default(1)
  statCharisme    Int      @default(1)
  statCervelle    Int      @default(1)
  statEndurance   Int      @default(1)
  statPoints      Int      @default(5)      // points non répartis
  energy          Int      @default(100)
  energyUpdatedAt DateTime @default(now())
  createdAt       DateTime @default(now())
  user            User     @relation(fields: [userId], references: [id])
  items           GamePlayerItem[]
  businesses      GamePlayerBusiness[]
  attempts        GameMissionAttempt[]
}

model GameSector {
  id             String  @id @default(cuid())
  nom            String
  ordre          Int
  respectRequis  Int     @default(0)
  missions       GameMission[]
}

model GameMission {
  id          String @id @default(cuid())
  sectorId    String
  nom         String
  description String
  energyCost  Int
  difficulty  Int
  statType    GameStat        // enum FORCE | CHARISME | CERVELLE | ENDURANCE
  rewardCash  Int
  rewardXp    Int
  rewardRespect Int @default(5)
  dropItemId  String?         // objet rare éventuel
  sector      GameSector @relation(fields: [sectorId], references: [id])
}

model GameMissionAttempt {          // journal = anti-triche + stats + matière CDA
  id        String   @id @default(cuid())
  playerId  String
  missionId String
  success   Boolean
  cashGained Int
  xpGained   Int
  createdAt DateTime @default(now())
  player    GamePlayer @relation(fields: [playerId], references: [id])
}

model GameItem {
  id        String   @id @default(cuid())
  nom       String
  slot      GameSlot        // TENUE | VEHICULE | ACCESSOIRE
  statType  GameStat
  bonus     Int
  prix      Int
  enBoutique Boolean @default(true)
}

model GamePlayerItem {
  id       String @id @default(cuid())
  playerId String
  itemId   String
  equipped Boolean @default(false)
  player   GamePlayer @relation(fields: [playerId], references: [id])
  item     GameItem   @relation(fields: [itemId], references: [id])
}

model GameBusiness {
  id          String @id @default(cuid())
  nom         String
  prix        Int
  cashPerHour Int
}

model GamePlayerBusiness {
  id              String   @id @default(cuid())
  playerId        String
  businessId      String
  lastCollectedAt DateTime @default(now())
  player          GamePlayer   @relation(fields: [playerId], references: [id])
  business        GameBusiness @relation(fields: [businessId], references: [id])
}
```

8 modèles, 2 enums. Les missions/objets/business sont du **contenu en base** (seed), pas du code — tu ajoutes du contenu sans redéployer.

## 7. Règle d'architecture non négociable : le serveur décide de tout

Le client (navigateur) **envoie des intentions** ("je tente la mission X"), le serveur **résout et répond**. Jamais de calcul de gain, d'énergie ou de chance côté client — sinon triche triviale via la console. Concrètement :

1. Route/Server Action `POST tenter-mission` → vérifie session SSO → recharge le joueur en BDD → recalcule l'énergie depuis `energyUpdatedAt` → vérifie coût/secteur → tire le succès → **transaction Prisma** (débit énergie + crédit gains + écriture `GameMissionAttempt`) → renvoie le résultat.
2. Idem pour acheter/équiper/collecter.
3. C'est exactement le genre de choix que le jury CDA adore te faire justifier : couches, validation serveur, transactions, journalisation.

## 8. Écrans V1

1. **Landing** `game.velito.fr` — pitch + visuel + bouton "Jouer" (login SSO).
2. **Création de perso** — pseudo + répartition des 5 points.
3. **Tableau de bord** — avatar, stats, énergie (barre), cash, respect, raccourcis.
4. **Missions** — par secteur, avec % de chance affiché, résultat animé.
5. **Boutique / Inventaire** — acheter, équiper.
6. **Business** — acheter, collecter.
7. **Classement** — top Respect.

Direction artistique : à cadrer avec le skill velito-webdesign le moment venu. Les persos dessinés arrivent au jalon 5 — **placeholder avant** (silhouettes), pour ne pas bloquer le dev sur l'art.

## 9. Jalons (chacun = livrable jouable, dans l'ordre, pas de saut)

| # | Jalon | Contenu | Done quand... |
|---|---|---|---|
| M1 | Squelette | `apps/game` dans le monorepo, SSO branché, création de perso, dashboard statique | Je me connecte et je vois mon perso |
| M2 | La boucle | Énergie + missions secteur 1 + XP/level up + transactions serveur | Je peux jouer 10 min et progresser |
| M3 | Économie | Boutique, inventaire, équipement, bonus dans le calcul | Un objet change mes % de succès |
| M4 | Rétention | Business passifs + secteurs 2-3 + classement | Une raison de revenir demain |
| M5 | Identité | Persos dessinés (autorisations signées), DA, landing propre, mise en ligne `game.velito.fr` | Montrable dans le portfolio |

**Règle : on ne commence pas un jalon tant que le précédent n'est pas jouable.** Si le projet s'arrête à M2, il reste un projet démontrable au jury — c'est voulu.

## 10. Ce que ce projet prouve pour le CDA

Conception BDD (8 tables liées, enums, contraintes), logique métier serveur (résolution probabiliste, transactions, anti-triche), auth centralisée réutilisée (SSO maison), journalisation (`GameMissionAttempt`), seed/contenu data-driven, monorepo/CI existants. À documenter au fil de l'eau dans le carnet CDA.
