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
];

/** Durée par défaut d'une question (en secondes). */
export const QUESTION_TIME_LIMIT_SEC = 20;

/**
 * Calcule le score d'une réponse en fonction du temps écoulé.
 * Plus tu réponds vite, plus tu gagnes — incite à ne pas attendre les autres.
 *
 * @param correct  Si la réponse est juste (sinon 0).
 * @param elapsedMs  Temps écoulé entre l'affichage de la question et la réponse.
 * @param timeLimitSec  Limite de temps (par défaut 20s).
 */
export function calculateScore(
  correct: boolean,
  elapsedMs: number,
  timeLimitSec: number = QUESTION_TIME_LIMIT_SEC
): number {
  if (!correct) return 0;
  const timeLimitMs = timeLimitSec * 1000;
  const ratio = Math.max(0, Math.min(1, 1 - elapsedMs / timeLimitMs));
  // Entre 200 (réponse au dernier moment) et 1000 (réponse instantanée)
  return Math.round(200 + 800 * ratio);
}
