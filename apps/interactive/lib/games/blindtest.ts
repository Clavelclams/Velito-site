/**
 * Blind Test — Reconnais le morceau le plus vite (multi-choice).
 *
 * Source des extraits : iTunes Search API (gratuit, pas de clé requise).
 *   https://itunes.apple.com/search?term=despacito&limit=1&entity=song
 *
 * Réponse JSON contient :
 *   - previewUrl  : MP3 30s diffusable
 *   - artworkUrl100 (qu'on remplace par 600x600bb pour du HD)
 *   - trackName + artistName : pour le reveal
 *
 * Mécanique :
 *   - 12 morceaux par partie
 *   - 20s par morceau : on joue la preview, 4 boutons A/B/C/D
 *   - Mécanique cocher/changeable comme Quiz (1er clic timestamp figé)
 *   - Scoring vitesse + bonus 1er rang
 */

export interface BlindTrack {
  /** ID interne pour debug. */
  id: string;
  /** Query iTunes Search ("artiste + titre" donne les meilleurs résultats). */
  query: string;
  /** Bonne réponse affichée au reveal — titre lisible. */
  correctLabel: string;
  /** 3 leurres affichés à côté du bon. */
  decoys: [string, string, string];
  /** Thème (pour groupage visuel). */
  theme?: string;
}

/**
 * Banque V1 — 20 morceaux ULTRA reconnaissables (international + français).
 * Si une query iTunes ne renvoie pas de previewUrl (rare), le serveur la skip
 * et pioche une autre. Faut donc avoir plus de 12 morceaux dans la banque.
 */
export const BLIND_TRACKS: BlindTrack[] = [
  // ─── Hits internationaux ─────────────────────────────────────────────────
  {
    id: "despacito",
    query: "Luis Fonsi Despacito",
    correctLabel: "Despacito — Luis Fonsi",
    decoys: [
      "Bailando — Enrique Iglesias",
      "Mi Gente — J Balvin",
      "Échame La Culpa — Luis Fonsi",
    ],
    theme: "Latino",
  },
  {
    id: "blinding-lights",
    query: "The Weeknd Blinding Lights",
    correctLabel: "Blinding Lights — The Weeknd",
    decoys: [
      "Levitating — Dua Lipa",
      "Save Your Tears — The Weeknd",
      "Dance Monkey — Tones and I",
    ],
    theme: "Pop",
  },
  {
    id: "shape-of-you",
    query: "Ed Sheeran Shape of You",
    correctLabel: "Shape of You — Ed Sheeran",
    decoys: [
      "Perfect — Ed Sheeran",
      "Senorita — Shawn Mendes",
      "Closer — Chainsmokers",
    ],
    theme: "Pop",
  },
  {
    id: "bad-guy",
    query: "Billie Eilish Bad Guy",
    correctLabel: "Bad Guy — Billie Eilish",
    decoys: [
      "Ocean Eyes — Billie Eilish",
      "Driver's License — Olivia Rodrigo",
      "Royals — Lorde",
    ],
    theme: "Pop",
  },
  {
    id: "old-town-road",
    query: "Lil Nas X Old Town Road",
    correctLabel: "Old Town Road — Lil Nas X",
    decoys: [
      "Industry Baby — Lil Nas X",
      "Sicko Mode — Travis Scott",
      "Lucid Dreams — Juice WRLD",
    ],
    theme: "Hip-Hop",
  },
  {
    id: "dance-monkey",
    query: "Tones and I Dance Monkey",
    correctLabel: "Dance Monkey — Tones and I",
    decoys: [
      "Lovely — Billie Eilish",
      "Watermelon Sugar — Harry Styles",
      "Memories — Maroon 5",
    ],
    theme: "Pop",
  },

  // ─── Classiques rock / variété ──────────────────────────────────────────
  {
    id: "bohemian-rhapsody",
    query: "Queen Bohemian Rhapsody",
    correctLabel: "Bohemian Rhapsody — Queen",
    decoys: [
      "Stairway to Heaven — Led Zeppelin",
      "Hotel California — Eagles",
      "Sweet Child O' Mine — Guns N' Roses",
    ],
    theme: "Classique rock",
  },
  {
    id: "billie-jean",
    query: "Michael Jackson Billie Jean",
    correctLabel: "Billie Jean — Michael Jackson",
    decoys: [
      "Beat It — Michael Jackson",
      "Smooth Criminal — Michael Jackson",
      "Bad — Michael Jackson",
    ],
    theme: "Classique pop",
  },
  {
    id: "wonderwall",
    query: "Oasis Wonderwall",
    correctLabel: "Wonderwall — Oasis",
    decoys: [
      "Don't Look Back in Anger — Oasis",
      "Champagne Supernova — Oasis",
      "Creep — Radiohead",
    ],
    theme: "Classique rock",
  },
  {
    id: "smells-like-teen-spirit",
    query: "Nirvana Smells Like Teen Spirit",
    correctLabel: "Smells Like Teen Spirit — Nirvana",
    decoys: [
      "Come As You Are — Nirvana",
      "In Bloom — Nirvana",
      "Black Hole Sun — Soundgarden",
    ],
    theme: "Classique rock",
  },

  // ─── Rap / Hip-Hop FR ───────────────────────────────────────────────────
  {
    id: "jul-bande-organisee",
    query: "Bande Organisée 13 Organisé",
    correctLabel: "Bande Organisée — 13 Organisé",
    decoys: [
      "Boumboum — Jul",
      "DZ Mafia — Hooss",
      "Tchikita — Jul",
    ],
    theme: "Rap FR",
  },
  {
    id: "soolking-liberte",
    query: "Soolking Liberté",
    correctLabel: "Liberté — Soolking",
    decoys: [
      "Dalida — Soolking",
      "Suavemente — Soolking",
      "Guerilla — Soolking",
    ],
    theme: "Rap FR",
  },
  {
    id: "orelsan-basique",
    query: "Orelsan Basique",
    correctLabel: "Basique — Orelsan",
    decoys: [
      "La terre est ronde — Orelsan",
      "Suicide social — Orelsan",
      "Tout va bien — Orelsan",
    ],
    theme: "Rap FR",
  },
  {
    id: "ninho-mariposa",
    query: "Ninho Mariposa",
    correctLabel: "Mariposa — Ninho",
    decoys: [
      "Lettre à une femme — Ninho",
      "Maman ne le sait pas — Ninho",
      "Sorbet citron — Ninho",
    ],
    theme: "Rap FR",
  },
  {
    id: "maes-madrina",
    query: "Maes Madrina",
    correctLabel: "Madrina — Maes",
    decoys: [
      "DESPRI — Maes",
      "Blanche — Maes",
      "Pyrex — Maes",
    ],
    theme: "Rap FR",
  },

  // ─── Variété FR / pop FR ────────────────────────────────────────────────
  {
    id: "stromae-alors-on-danse",
    query: "Stromae Alors on danse",
    correctLabel: "Alors on danse — Stromae",
    decoys: [
      "Papaoutai — Stromae",
      "Formidable — Stromae",
      "Tous les mêmes — Stromae",
    ],
    theme: "Variété FR",
  },
  {
    id: "aya-nakamura-djadja",
    query: "Aya Nakamura Djadja",
    correctLabel: "Djadja — Aya Nakamura",
    decoys: [
      "Pookie — Aya Nakamura",
      "Copines — Aya Nakamura",
      "Comportement — Aya Nakamura",
    ],
    theme: "Variété FR",
  },
  {
    id: "angele-balance-ton-quoi",
    query: "Angèle Balance Ton Quoi",
    correctLabel: "Balance ton quoi — Angèle",
    decoys: [
      "Bruxelles je t'aime — Angèle",
      "La loi de Murphy — Angèle",
      "Tout oublier — Angèle",
    ],
    theme: "Variété FR",
  },

  // ─── Anciens classiques toujours sing-along ─────────────────────────────
  {
    id: "abba-dancing-queen",
    query: "ABBA Dancing Queen",
    correctLabel: "Dancing Queen — ABBA",
    decoys: [
      "Waterloo — ABBA",
      "Mamma Mia — ABBA",
      "Take a Chance on Me — ABBA",
    ],
    theme: "Disco",
  },
  {
    id: "africa-toto",
    query: "Toto Africa",
    correctLabel: "Africa — Toto",
    decoys: [
      "Sweet Dreams — Eurythmics",
      "Take On Me — A-ha",
      "Don't Stop Believin' — Journey",
    ],
    theme: "80s",
  },
];

/** Durée d'un round (en secondes). */
export const BLINDTEST_QUESTION_TIME_LIMIT_SEC = 20;
/** Durée du reveal avant question suivante. */
export const BLINDTEST_REVEAL_DURATION_SEC = 6;
/** Nombre de rounds par partie. */
export const BLINDTEST_TOTAL_ROUNDS = 12;

/**
 * Métadonnées iTunes enrichies (récupérées au lancement).
 */
export interface BlindTrackEnriched {
  id: string;
  query: string;
  correctLabel: string;
  decoys: [string, string, string];
  theme?: string;
  /** URL MP3 30s. */
  previewUrl: string;
  /** URL JPG cover album (600x600). */
  artworkUrl: string;
}

/**
 * Round d'une partie : on stocke la métadonnée enrichie + l'ordre des boutons
 * (mélange bon + leurres) avec l'index de la bonne réponse.
 */
export interface BlindTestRound {
  track: BlindTrackEnriched;
  /** 4 labels affichés sur les boutons A/B/C/D (ordre mélangé). */
  options: [string, string, string, string];
  /** Index dans options de la bonne réponse (0-3). */
  correctIndex: number;
}

/** État Blind Test stocké dans sessions.current_state. */
export interface BlindTestState {
  phase: "question" | "reveal" | "final";
  roundIndex: number;
  totalRounds: number;
  /** Tous les rounds pré-calculés au start (avec previewUrl + artwork). */
  rounds: BlindTestRound[];
  questionStartedAt?: string;
  revealStartedAt?: string;
  timeLimitSec?: number;
  revealDurationSec?: number;
}

/**
 * Fetch iTunes Search API pour une query, retourne previewUrl + artwork.
 * Si pas de preview → returns null.
 */
export async function fetchITunesTrack(
  query: string
): Promise<{ previewUrl: string; artworkUrl: string } | null> {
  try {
    const url = new URL("https://itunes.apple.com/search");
    url.searchParams.set("term", query);
    url.searchParams.set("entity", "song");
    url.searchParams.set("limit", "5");
    url.searchParams.set("country", "FR");

    const res = await fetch(url.toString());
    if (!res.ok) return null;
    const data = (await res.json()) as {
      results: Array<{
        previewUrl?: string;
        artworkUrl100?: string;
      }>;
    };

    for (const r of data.results ?? []) {
      if (r.previewUrl) {
        const artworkUrl =
          r.artworkUrl100?.replace("100x100bb", "600x600bb") ??
          r.artworkUrl100 ??
          "";
        return { previewUrl: r.previewUrl, artworkUrl };
      }
    }
    return null;
  } catch (e) {
    console.warn("[fetchITunesTrack] error:", e);
    return null;
  }
}

/**
 * Calcule le score d'une bonne réponse — comme Quiz : vitesse + bonus rang.
 */
export function calculateBlindTestScore(
  correct: boolean,
  elapsedMs: number,
  rank: number = 1,
  totalPlayers: number = 1,
  timeLimitSec: number = BLINDTEST_QUESTION_TIME_LIMIT_SEC
): number {
  if (!correct) return 0;
  const timeLimitMs = timeLimitSec * 1000;
  const timeRatio = Math.max(0, Math.min(1, 1 - elapsedMs / timeLimitMs));
  const baseScore = 200 + Math.round(800 * timeRatio);

  let positionBonus = 0;
  if (totalPlayers >= 2) {
    if (rank === 1) positionBonus = 200;
    else if (rank === totalPlayers) positionBonus = -100;
    else {
      const positionRatio = (rank - 1) / (totalPlayers - 1);
      positionBonus = Math.round(200 - positionRatio * 300);
    }
  }
  return Math.max(0, baseScore + positionBonus);
}

/**
 * Mélange un tableau (Fisher-Yates). Utilisé pour randomiser l'ordre des
 * 4 boutons à chaque question.
 */
export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}
