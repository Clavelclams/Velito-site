/**
 * ACCÈS AUX DONNÉES — les quiz.
 *
 * Même philosophie que fiches.ts : le contenu est en FICHIERS (ici du JSON),
 * pas en base. Un quiz par fiche : content/quiz/<slug-de-la-fiche>.json,
 * produit par l'usine à fiches (les conversations Claude des projets).
 *
 * Pourquoi JSON et pas Markdown ? Un quiz est une donnée STRUCTURÉE
 * (questions, choix, index de la bonne réponse) : JSON.parse suffit,
 * aucun parsing maison, et la validation ci-dessous rejette proprement
 * tout fichier malformé au lieu de casser la page.
 *
 * Ce module utilise fs → SERVEUR UNIQUEMENT. Ne jamais l'importer dans un
 * composant "use client" (passer les données en props, comme pour FicheMeta).
 */
import fs from "node:fs";
import path from "node:path";

export interface QuestionQuiz {
  /** L'énoncé de la question. */
  question: string;
  /** Les choix proposés (2 à 5). */
  choix: string[];
  /** Index (0-based) de la bonne réponse dans `choix`. */
  bonne: number;
  /** Le feedback « prof » : POURQUOI c'est la bonne réponse — affiché après coup. */
  explication: string;
}

export interface Quiz {
  /** Slug de la fiche à laquelle ce quiz est rattaché. */
  fiche: string;
  questions: QuestionQuiz[];
}

const DOSSIER_QUIZ = path.join(process.cwd(), "content", "quiz");

/** Valide une question : toute question invalide est ignorée (pas de crash). */
function estQuestionValide(q: unknown): q is QuestionQuiz {
  if (typeof q !== "object" || q === null) return false;
  const o = q as Record<string, unknown>;
  return (
    typeof o.question === "string" &&
    o.question.length > 0 &&
    Array.isArray(o.choix) &&
    o.choix.length >= 2 &&
    o.choix.length <= 5 &&
    o.choix.every((c) => typeof c === "string") &&
    typeof o.bonne === "number" &&
    Number.isInteger(o.bonne) &&
    o.bonne >= 0 &&
    o.bonne < o.choix.length &&
    typeof o.explication === "string" &&
    o.explication.length > 0
  );
}

/** Le quiz d'une fiche, ou null s'il n'existe pas (toutes les fiches n'en ont pas). */
export function getQuiz(slug: string): Quiz | null {
  // Même garde anti path-traversal que getFiche : le slug peut venir d'une URL.
  if (!/^[a-z0-9-]+$/.test(slug)) return null;

  const chemin = path.join(DOSSIER_QUIZ, `${slug}.json`);
  if (!fs.existsSync(chemin)) return null;

  try {
    const brut = JSON.parse(fs.readFileSync(chemin, "utf8")) as {
      questions?: unknown[];
    };
    const questions = Array.isArray(brut.questions)
      ? brut.questions.filter(estQuestionValide)
      : [];
    // Un quiz sans aucune question valide = pas de quiz.
    return questions.length > 0 ? { fiche: slug, questions } : null;
  } catch {
    // JSON malformé : on log côté serveur et la fiche s'affiche sans quiz.
    console.error(`[quiz] JSON invalide : content/quiz/${slug}.json`);
    return null;
  }
}

/** Tous les quiz existants (pour la Révision du jour et les stats du dashboard). */
export function listerQuiz(): Quiz[] {
  if (!fs.existsSync(DOSSIER_QUIZ)) return [];
  return fs
    .readdirSync(DOSSIER_QUIZ)
    .filter((f) => f.endsWith(".json"))
    .map((f) => getQuiz(f.replace(/\.json$/, "")))
    .filter((q): q is Quiz => q !== null);
}
