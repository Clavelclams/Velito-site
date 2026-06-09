/**
 * Quiz — banque de questions hardcodées (MVP).
 *
 * Pour le MVP démo, on hardcode 15 questions multi-thèmes (culture G, sport,
 * Amiens, jeux vidéo). Plus tard, on extraira ça dans une table Supabase pour
 * que les animateurs puissent ajouter leurs propres questions.
 *
 * Format : 1 question, 4 réponses (A,B,C,D), une seule correcte.
 *
 * Design :
 *  - On ne révèle PAS la réponse correcte au client tant que le host n'a pas
 *    cliqué "Reveal". Côté joueur, on envoie seulement [question, choices].
 *  - Le scoring tient compte du temps : plus tu réponds vite, plus tu gagnes
 *    de points (max 1000, min 200 si t'as répondu juste à la dernière seconde).
 */

export interface QuizQuestion {
  id: string;
  /** La question elle-même. */
  question: string;
  /** 4 propositions de réponse. */
  choices: {
    A: string;
    B: string;
    C: string;
    D: string;
  };
  /** La bonne réponse (clé A/B/C/D). */
  correct: "A" | "B" | "C" | "D";
  /** Thème pour le tag visuel (optionnel). */
  theme?: string;
}

export const QUIZ_QUESTIONS: QuizQuestion[] = [
  // ─── CULTURE GÉNÉRALE ───
  {
    id: "cg-1",
    question: "Quelle est la capitale de l'Australie ?",
    choices: { A: "Sydney", B: "Melbourne", C: "Canberra", D: "Perth" },
    correct: "C",
    theme: "Culture G",
  },
  {
    id: "cg-2",
    question: "Combien de planètes compose le système solaire ?",
    choices: { A: "7", B: "8", C: "9", D: "10" },
    correct: "B",
    theme: "Culture G",
  },
  {
    id: "cg-3",
    question: "Quel élément chimique a pour symbole Au ?",
    choices: { A: "Argent", B: "Cuivre", C: "Aluminium", D: "Or" },
    correct: "D",
    theme: "Culture G",
  },

  // ─── AMIENS / HAUTS-DE-FRANCE ───
  {
    id: "amiens-1",
    question: "Quel est le surnom d'Amiens grâce à ses canaux ?",
    choices: {
      A: "La Venise du Nord",
      B: "La Petite Venise",
      C: "L'Île de France",
      D: "La Cité d'Eau",
    },
    correct: "B",
    theme: "Amiens",
  },
  {
    id: "amiens-2",
    question: "Quel grand auteur français est né à Amiens ?",
    choices: { A: "Victor Hugo", B: "Émile Zola", C: "Jules Verne", D: "Marcel Proust" },
    correct: "C",
    theme: "Amiens",
  },
  {
    id: "amiens-3",
    question: "Quelle spécialité culinaire est typique d'Amiens ?",
    choices: { A: "Le Maroilles", B: "Le Macaron", C: "La Carbonade", D: "Le Welsh" },
    correct: "B",
    theme: "Amiens",
  },

  // ─── SPORT ───
  {
    id: "sport-1",
    question: "Quel pays a remporté la Coupe du Monde de foot 2022 ?",
    choices: { A: "France", B: "Argentine", C: "Brésil", D: "Allemagne" },
    correct: "B",
    theme: "Sport",
  },
  {
    id: "sport-2",
    question: "Combien de joueurs dans une équipe de basket sur le terrain ?",
    choices: { A: "4", B: "5", C: "6", D: "7" },
    correct: "B",
    theme: "Sport",
  },
  {
    id: "sport-3",
    question: "Quel club de foot a remporté le plus de Ligue des Champions ?",
    choices: { A: "FC Barcelone", B: "Bayern Munich", C: "Real Madrid", D: "Liverpool" },
    correct: "C",
    theme: "Sport",
  },

  // ─── JEUX VIDÉO / GAMING ───
  {
    id: "gaming-1",
    question: "Quel personnage est le héros de la série The Legend of Zelda ?",
    choices: { A: "Zelda", B: "Link", C: "Ganondorf", D: "Sheik" },
    correct: "B",
    theme: "Gaming",
  },
  {
    id: "gaming-2",
    question: "Quel jeu vidéo a popularisé le battle royale ?",
    choices: { A: "Fortnite", B: "PUBG", C: "Apex Legends", D: "Call of Duty" },
    correct: "B",
    theme: "Gaming",
  },
  {
    id: "gaming-3",
    question: "Quelle entreprise a créé la PlayStation ?",
    choices: { A: "Nintendo", B: "Microsoft", C: "Sega", D: "Sony" },
    correct: "D",
    theme: "Gaming",
  },

  // ─── MUSIQUE / POP CULTURE ───
  {
    id: "music-1",
    question: "Quel groupe a sorti l'album Thriller ?",
    choices: {
      A: "The Jacksons",
      B: "Michael Jackson",
      C: "The Beatles",
      D: "Queen",
    },
    correct: "B",
    theme: "Musique",
  },
  {
    id: "music-2",
    question: "Quel rappeur français a sorti Or Noir ?",
    choices: { A: "Booba", B: "Kaaris", C: "Damso", D: "PNL" },
    correct: "B",
    theme: "Musique",
  },
  {
    id: "music-3",
    question: "Quel chanteur incarne Aladdin dans le film Disney de 1992 ?",
    choices: { A: "Phil Collins", B: "Brad Kane", C: "Robin Williams", D: "Peabo Bryson" },
    correct: "B",
    theme: "Musique",
  },

  // ════════════════════════════════════════════════════════════════
  // PACK COMPLÉMENTAIRE — 10 questions par thème (sprint Moxy 09/06/2026)
  // ════════════════════════════════════════════════════════════════

  // ─── CULTURE GÉNÉRALE (7 de plus → 10 total) ───
  {
    id: "cg-4",
    question: "Quel est le plus long fleuve du monde ?",
    choices: { A: "Le Nil", B: "L'Amazone", C: "Le Yangzi Jiang", D: "Le Mississippi" },
    correct: "B",
    theme: "Culture G",
  },
  {
    id: "cg-5",
    question: "Qui a peint La Joconde ?",
    choices: { A: "Michel-Ange", B: "Raphaël", C: "Léonard de Vinci", D: "Botticelli" },
    correct: "C",
    theme: "Culture G",
  },
  {
    id: "cg-6",
    question: "Combien d'os possède le corps humain adulte ?",
    choices: { A: "186", B: "206", C: "256", D: "306" },
    correct: "B",
    theme: "Culture G",
  },
  {
    id: "cg-7",
    question: "Quelle est la monnaie officielle du Japon ?",
    choices: { A: "Le Won", B: "Le Yuan", C: "Le Yen", D: "Le Baht" },
    correct: "C",
    theme: "Culture G",
  },
  {
    id: "cg-8",
    question: "En quelle année est tombé le mur de Berlin ?",
    choices: { A: "1987", B: "1989", C: "1991", D: "1993" },
    correct: "B",
    theme: "Culture G",
  },
  {
    id: "cg-9",
    question: "Quel est l'élément chimique le plus abondant dans l'univers ?",
    choices: { A: "Oxygène", B: "Carbone", C: "Hydrogène", D: "Hélium" },
    correct: "C",
    theme: "Culture G",
  },
  {
    id: "cg-10",
    question: "Qui a écrit Les Misérables ?",
    choices: { A: "Émile Zola", B: "Victor Hugo", C: "Honoré de Balzac", D: "Gustave Flaubert" },
    correct: "B",
    theme: "Culture G",
  },

  // ─── SPORT (7 de plus → 10 total) ───
  {
    id: "sport-4",
    question: "Combien de joueurs dans une équipe de basket sur le terrain ?",
    choices: { A: "4", B: "5", C: "6", D: "7" },
    correct: "B",
    theme: "Sport",
  },
  {
    id: "sport-5",
    question: "Quel pays a remporté la Coupe du monde de foot 2022 ?",
    choices: { A: "France", B: "Brésil", C: "Argentine", D: "Croatie" },
    correct: "C",
    theme: "Sport",
  },
  {
    id: "sport-6",
    question: "Dans quel sport entend-on l'expression 'love' pour zéro ?",
    choices: { A: "Golf", B: "Tennis", C: "Cricket", D: "Badminton" },
    correct: "B",
    theme: "Sport",
  },
  {
    id: "sport-7",
    question: "Combien dure un match de boxe pro maximum (rounds) ?",
    choices: { A: "10", B: "12", C: "15", D: "20" },
    correct: "B",
    theme: "Sport",
  },
  {
    id: "sport-8",
    question: "Qui détient le record de 7 ballons d'or au foot ?",
    choices: { A: "Cristiano Ronaldo", B: "Lionel Messi", C: "Zinédine Zidane", D: "Pelé" },
    correct: "B",
    theme: "Sport",
  },
  {
    id: "sport-9",
    question: "Dans quel sport utilise-t-on un volant ?",
    choices: { A: "Tennis", B: "Squash", C: "Badminton", D: "Ping-pong" },
    correct: "C",
    theme: "Sport",
  },
  {
    id: "sport-10",
    question: "Combien de joueurs sur un terrain de rugby à XV (par équipe) ?",
    choices: { A: "13", B: "14", C: "15", D: "16" },
    correct: "C",
    theme: "Sport",
  },

  // ─── AMIENS / HAUTS-DE-FRANCE (7 de plus → 10 total) ───
  {
    id: "amiens-4",
    question: "Quelle rivière traverse Amiens ?",
    choices: { A: "La Seine", B: "La Somme", C: "L'Oise", D: "L'Aisne" },
    correct: "B",
    theme: "Amiens",
  },
  {
    id: "amiens-5",
    question: "Comment s'appellent les jardins flottants d'Amiens ?",
    choices: {
      A: "Les Hortillonnages",
      B: "Les Marais",
      C: "Les Jardins de la Somme",
      D: "Le Quartier Saint-Leu",
    },
    correct: "A",
    theme: "Amiens",
  },
  {
    id: "amiens-6",
    question: "Quelle spécialité culinaire est typique d'Amiens ?",
    choices: { A: "Macaron", B: "Carolo", C: "Andouillette", D: "Maroilles" },
    correct: "A",
    theme: "Amiens",
  },
  {
    id: "amiens-7",
    question: "Comment surnomme-t-on la cathédrale d'Amiens ?",
    choices: {
      A: "La Cathédrale du Nord",
      B: "Notre-Dame du Nord",
      C: "La Bible de pierre",
      D: "Sainte-Marie-aux-Cieux",
    },
    correct: "C",
    theme: "Amiens",
  },
  {
    id: "amiens-8",
    question: "Quel club de foot représente Amiens en Ligue 2 / National ?",
    choices: { A: "AS Amiens", B: "Amiens SC", C: "FC Amiens", D: "RC Amiens" },
    correct: "B",
    theme: "Amiens",
  },
  {
    id: "amiens-9",
    question: "Quel département est Amiens chef-lieu ?",
    choices: { A: "Nord", B: "Pas-de-Calais", C: "Somme", D: "Oise" },
    correct: "C",
    theme: "Amiens",
  },
  {
    id: "amiens-10",
    question: "Jules Verne a vécu à Amiens. Quel livre y a-t-il écrit en grande partie ?",
    choices: {
      A: "Vingt mille lieues sous les mers",
      B: "Le Tour du monde en 80 jours",
      C: "Michel Strogoff",
      D: "Voyage au centre de la Terre",
    },
    correct: "B",
    theme: "Amiens",
  },

  // ─── GAMING (7 de plus → 10 total) ───
  {
    id: "gaming-4",
    question: "Quel est le jeu vidéo le plus vendu de tous les temps ?",
    choices: { A: "GTA V", B: "Minecraft", C: "Tetris", D: "Fortnite" },
    correct: "B",
    theme: "Gaming",
  },
  {
    id: "gaming-5",
    question: "Quel studio a créé The Witcher 3 ?",
    choices: { A: "Bethesda", B: "CD Projekt Red", C: "Bioware", D: "Ubisoft" },
    correct: "B",
    theme: "Gaming",
  },
  {
    id: "gaming-6",
    question: "Quelle console Nintendo est sortie en 2017 ?",
    choices: { A: "Wii U", B: "3DS", C: "Switch", D: "Switch 2" },
    correct: "C",
    theme: "Gaming",
  },
  {
    id: "gaming-7",
    question: "Comment s'appelle l'antagoniste principal de la saga Zelda ?",
    choices: { A: "Bowser", B: "Ganondorf", C: "Eggman", D: "Sephiroth" },
    correct: "B",
    theme: "Gaming",
  },
  {
    id: "gaming-8",
    question: "Quel jeu a popularisé le genre Battle Royale ?",
    choices: { A: "Fortnite", B: "PUBG", C: "Apex Legends", D: "Call of Duty" },
    correct: "B",
    theme: "Gaming",
  },
  {
    id: "gaming-9",
    question: "Qui est le créateur de Mario ?",
    choices: { A: "Hideo Kojima", B: "Shigeru Miyamoto", C: "Hironobu Sakaguchi", D: "Yu Suzuki" },
    correct: "B",
    theme: "Gaming",
  },
  {
    id: "gaming-10",
    question: "Dans quel jeu trouve-t-on un personnage nommé Kratos ?",
    choices: { A: "Diablo", B: "Devil May Cry", C: "God of War", D: "Dark Souls" },
    correct: "C",
    theme: "Gaming",
  },

  // ─── MUSIQUE (7 de plus → 10 total) ───
  {
    id: "music-4",
    question: "Quel artiste a sorti l'album 'Mr Morale & The Big Steppers' ?",
    choices: { A: "Drake", B: "J. Cole", C: "Kendrick Lamar", D: "Travis Scott" },
    correct: "C",
    theme: "Musique",
  },
  {
    id: "music-5",
    question: "Quel rappeur français a sorti QALF ?",
    choices: { A: "PNL", B: "Damso", C: "Ninho", D: "Booba" },
    correct: "B",
    theme: "Musique",
  },
  {
    id: "music-6",
    question: "Quel groupe a chanté Bohemian Rhapsody ?",
    choices: { A: "Led Zeppelin", B: "The Rolling Stones", C: "Queen", D: "Pink Floyd" },
    correct: "C",
    theme: "Musique",
  },
  {
    id: "music-7",
    question: "Quel artiste a sorti l'album 'Renaissance' en 2022 ?",
    choices: { A: "Rihanna", B: "Beyoncé", C: "Taylor Swift", D: "Dua Lipa" },
    correct: "B",
    theme: "Musique",
  },
  {
    id: "music-8",
    question: "Quel chanteur français est connu sous le nom de Slimane ?",
    choices: { A: "Slimane Nebchi", B: "Slimane Kassa", C: "Slimane Allache", D: "Slimane Mokadem" },
    correct: "A",
    theme: "Musique",
  },
  {
    id: "music-9",
    question: "Combien de membres composaient le groupe Daft Punk ?",
    choices: { A: "1", B: "2", C: "3", D: "4" },
    correct: "B",
    theme: "Musique",
  },
  {
    id: "music-10",
    question: "Quel rappeur a popularisé le mouvement 'plk' dans le rap français ?",
    choices: { A: "PLK", B: "Maes", C: "Niska", D: "SCH" },
    correct: "A",
    theme: "Musique",
  },

  // ════════════════════════════════════════════════════════════════
  // ─── NOUVEAU THÈME : CINÉMA & SÉRIES (10 questions) ───
  // ════════════════════════════════════════════════════════════════
  {
    id: "cine-1",
    question: "Quel acteur joue Iron Man dans le Marvel Cinematic Universe ?",
    choices: { A: "Chris Evans", B: "Robert Downey Jr.", C: "Mark Ruffalo", D: "Chris Hemsworth" },
    correct: "B",
    theme: "Cinéma",
  },
  {
    id: "cine-2",
    question: "Dans quelle ville se déroule la série Breaking Bad ?",
    choices: { A: "Phoenix", B: "Albuquerque", C: "El Paso", D: "Las Vegas" },
    correct: "B",
    theme: "Cinéma",
  },
  {
    id: "cine-3",
    question: "Quel film a remporté l'Oscar du meilleur film en 2020 ?",
    choices: { A: "1917", B: "Joker", C: "Parasite", D: "Once Upon a Time in Hollywood" },
    correct: "C",
    theme: "Cinéma",
  },
  {
    id: "cine-4",
    question: "Qui a réalisé le film Inception ?",
    choices: {
      A: "Steven Spielberg",
      B: "Christopher Nolan",
      C: "James Cameron",
      D: "Martin Scorsese",
    },
    correct: "B",
    theme: "Cinéma",
  },
  {
    id: "cine-5",
    question: "Dans la série Squid Game, combien de joueurs participent au départ ?",
    choices: { A: "356", B: "456", C: "556", D: "656" },
    correct: "B",
    theme: "Cinéma",
  },
  {
    id: "cine-6",
    question: "Quel acteur joue Jack dans le film Titanic ?",
    choices: { A: "Brad Pitt", B: "Leonardo DiCaprio", C: "Matt Damon", D: "Tom Cruise" },
    correct: "B",
    theme: "Cinéma",
  },
  {
    id: "cine-7",
    question: "Quel est le titre du premier film Harry Potter ?",
    choices: {
      A: "La Chambre des Secrets",
      B: "La Coupe de Feu",
      C: "À l'École des Sorciers",
      D: "Le Prince de Sang-Mêlé",
    },
    correct: "C",
    theme: "Cinéma",
  },
  {
    id: "cine-8",
    question: "Dans Game of Thrones, quelle famille a pour devise 'Winter is coming' ?",
    choices: { A: "Lannister", B: "Targaryen", C: "Stark", D: "Baratheon" },
    correct: "C",
    theme: "Cinéma",
  },
  {
    id: "cine-9",
    question: "Quel est le surnom de l'acteur Vin Diesel dans la saga Fast & Furious ?",
    choices: { A: "Dom", B: "Brian", C: "Hobbs", D: "Letty" },
    correct: "A",
    theme: "Cinéma",
  },
  {
    id: "cine-10",
    question: "Quel film d'animation Pixar parle d'un cuisinier rat ?",
    choices: { A: "Les Indestructibles", B: "Ratatouille", C: "Là-haut", D: "Vice-Versa" },
    correct: "B",
    theme: "Cinéma",
  },
];

/** Liste des thèmes disponibles (en ordre d'affichage dans le picker). */
export const QUIZ_THEMES = [
  "Mix", // Tous thèmes mélangés (défaut)
  "Culture G",
  "Sport",
  "Amiens",
  "Gaming",
  "Musique",
  "Cinéma",
] as const;
export type QuizTheme = (typeof QUIZ_THEMES)[number];

/**
 * Filtre les questions par thème.
 * "Mix" = toutes les questions. Sinon filtre par theme exact.
 */
export function getQuestionsByTheme(theme: QuizTheme): QuizQuestion[] {
  if (theme === "Mix") return QUIZ_QUESTIONS;
  return QUIZ_QUESTIONS.filter((q) => q.theme === theme);
}

/** Durée par défaut d'une question (en secondes). */
export const QUESTION_TIME_LIMIT_SEC = 20;
/** Durée d'affichage du reveal avant question suivante. */
export const REVEAL_DURATION_SEC = 5;

/**
 * Calcule le score d'une réponse — combine 3 facteurs :
 *  1. Correctness : 0 si faux, sinon base score
 *  2. Vitesse temps : plus tu réponds vite, plus le score est haut (200→800)
 *  3. Ordre d'arrivée : bonus pour le 1er qui répond bien (+200), malus pour le dernier (-100)
 *
 * @param correct       Si la réponse est juste
 * @param elapsedMs     Temps écoulé entre la question et la réponse
 * @param rank          Ordre d'arrivée (1 = premier, totalPlayers = dernier)
 * @param totalPlayers  Nombre total de joueurs ayant répondu juste
 * @param timeLimitSec  Limite de temps (par défaut 20s)
 */
export function calculateScore(
  correct: boolean,
  elapsedMs: number,
  rank: number = 1,
  totalPlayers: number = 1,
  timeLimitSec: number = QUESTION_TIME_LIMIT_SEC
): number {
  if (!correct) return 0;

  // Score de base = 200, score max temps = 800 → fourchette 200→1000
  const timeLimitMs = timeLimitSec * 1000;
  const timeRatio = Math.max(0, Math.min(1, 1 - elapsedMs / timeLimitMs));
  const baseScore = 200 + Math.round(800 * timeRatio);

  // Bonus 1er qui répond juste (+200), malus dernier (-100), interpolation au milieu
  let positionBonus = 0;
  if (totalPlayers >= 2) {
    if (rank === 1) positionBonus = 200;
    else if (rank === totalPlayers) positionBonus = -100;
    else {
      // Interpolation linéaire pour les positions intermédiaires
      const positionRatio = (rank - 1) / (totalPlayers - 1);
      positionBonus = Math.round(200 - positionRatio * 300);
    }
  }

  return Math.max(0, baseScore + positionBonus);
}
