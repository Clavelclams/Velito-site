/**
 * Server actions du jeu Quiz côté host (animateur).
 *
 * Flow d'une partie Quiz :
 *  1. status = 'playing' + game_type = 'quiz' + phase = 'question' (index 0)
 *  2. Joueurs voient la question + 4 réponses, soumettent (INSERT player_answers)
 *  3. Timer écoulé OU host clique "Reveal" → revealAnswerAction
 *  4. Calcul des scores + update player_answers.is_correct/points
 *  5. Host clique "Question suivante" → startNextQuestionAction
 *  6. À la dernière question → endGameAction → status='ended'
 *
 * Pourquoi le serveur calcule les scores (pas le client) :
 *  - Empêche la triche (un client malveillant pourrait s'envoyer 9999 points)
 *  - Source unique de vérité pour le scoreboard
 *  - Auth.uid() = host garantit que seul lui peut écrire les points
 */
"use server";

import { createClient } from "@/lib/supabase/server";
import {
  QUIZ_QUESTIONS,
  QUESTION_TIME_LIMIT_SEC,
  REVEAL_DURATION_SEC,
  calculateScore,
  getQuestionsByTheme,
  type QuizTheme,
} from "@/lib/games/quiz-questions";

interface ActionResult {
  success: boolean;
  error?: string;
}

interface SessionState {
  phase: "choose_game" | "question" | "reveal" | "final";
  questionIndex: number;
  questionStartedAt?: string;
  /** Timestamp ISO du début de la phase reveal (utilisé pour l'auto-next). */
  revealStartedAt?: string;
  timeLimitSec?: number;
  /** Durée du reveal en secondes (auto-next quand expiré). */
  revealDurationSec?: number;
  /** Thème sélectionné. 'Mix' = toutes les questions. */
  theme?: QuizTheme;
}

/**
 * Retourne les questions filtrées par thème depuis le state.
 * Fallback sur QUIZ_QUESTIONS complet si pas de thème (rétro-compat).
 */
function getQuestionsForState(state: SessionState | null) {
  if (!state?.theme) return QUIZ_QUESTIONS;
  return getQuestionsByTheme(state.theme);
}

/**
 * Lance le Quiz : passe la session en status='playing', game_type='quiz',
 * et affiche la première question.
 */
export async function startQuizAction(
  sessionId: string,
  theme: QuizTheme = "Mix"
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Non connecté." };

  // Vérif qu'il y a bien des questions pour ce thème
  const themeQuestions = getQuestionsByTheme(theme);
  if (themeQuestions.length === 0) {
    return { success: false, error: `Aucune question pour le thème "${theme}".` };
  }

  const newState: SessionState = {
    phase: "question",
    questionIndex: 0,
    questionStartedAt: new Date().toISOString(),
    timeLimitSec: QUESTION_TIME_LIMIT_SEC,
    theme,
  };

  const { error } = await supabase
    .schema("interactive" as never)
    .from("sessions")
    .update({
      status: "playing",
      game_type: "quiz",
      started_at: new Date().toISOString(),
      current_state: newState,
    } as never)
    .eq("id", sessionId);

  if (error) {
    console.error("[startQuizAction] update error:", error.message);
    return { success: false, error: "Impossible de démarrer le Quiz." };
  }
  return { success: true };
}

/**
 * Révèle la bonne réponse + calcule les scores pour la question courante.
 */
export async function revealAnswerAction(sessionId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Non connecté." };

  // 1. Lit la session pour récupérer current_state
  const { data: sessionRow, error: sessionErr } = await supabase
    .schema("interactive" as never)
    .from("sessions")
    .select("current_state")
    .eq("id", sessionId)
    .single();

  if (sessionErr || !sessionRow) {
    return { success: false, error: "Session introuvable." };
  }

  const state = (sessionRow as { current_state: SessionState }).current_state;
  if (!state || state.phase !== "question") {
    return { success: false, error: "Pas en phase question." };
  }

  const questions = getQuestionsForState(state);
  const question = questions[state.questionIndex];
  if (!question) {
    return { success: false, error: "Question introuvable." };
  }

  const questionStartedAt = state.questionStartedAt
    ? new Date(state.questionStartedAt).getTime()
    : Date.now();

  // 2. Récupère toutes les réponses de cette question, triées par temps de réponse
  // → permet de connaître le rang (1er, 2e, ..., dernier) pour le bonus/malus
  const { data: answers, error: ansErr } = await supabase
    .schema("interactive" as never)
    .from("player_answers")
    .select("id, player_id, answer, answered_at")
    .eq("session_id", sessionId)
    .eq("question_index", state.questionIndex)
    .order("answered_at", { ascending: true });

  if (ansErr) {
    console.error("[revealAnswerAction] answers fetch error:", ansErr.message);
    return { success: false, error: "Erreur lecture réponses." };
  }

  // 3. Calcul des scores : on filtre les bonnes réponses pour ranker entre elles,
  //    puis on traite les fausses séparément (score 0).
  const rows = (answers ?? []) as Array<{
    id: string;
    player_id: string;
    answer: string;
    answered_at: string;
  }>;

  const correctAnswers = rows.filter((a) => a.answer === question.correct);
  const totalCorrect = correctAnswers.length;

  for (const a of rows) {
    const isCorrect = a.answer === question.correct;
    const elapsedMs = new Date(a.answered_at).getTime() - questionStartedAt;

    // Pour les bonnes réponses : rank = position dans correctAnswers (déjà triées)
    let points = 0;
    if (isCorrect) {
      const rank = correctAnswers.findIndex((c) => c.id === a.id) + 1;
      points = calculateScore(
        isCorrect,
        elapsedMs,
        rank,
        totalCorrect,
        state.timeLimitSec
      );
    }

    await supabase
      .schema("interactive" as never)
      .from("player_answers")
      .update({ is_correct: isCorrect, points } as never)
      .eq("id", a.id);

    // Met à jour le score cumulatif du joueur
    if (points !== 0) {
      const { data: playerData } = await supabase
        .schema("interactive" as never)
        .from("session_players")
        .select("score")
        .eq("id", a.player_id)
        .single();

      const currentScore = (playerData as { score: number } | null)?.score ?? 0;

      await supabase
        .schema("interactive" as never)
        .from("session_players")
        .update({ score: Math.max(0, currentScore + points) } as never)
        .eq("id", a.player_id);
    }
  }

  // 4. UPDATE session : passe en phase 'reveal' avec un timer auto pour next
  const newState: SessionState = {
    ...state,
    phase: "reveal",
    revealStartedAt: new Date().toISOString(),
    revealDurationSec: REVEAL_DURATION_SEC,
  };
  const { error: updateErr } = await supabase
    .schema("interactive" as never)
    .from("sessions")
    .update({ current_state: newState } as never)
    .eq("id", sessionId);

  if (updateErr) {
    console.error("[revealAnswerAction] state update error:", updateErr.message);
    return { success: false, error: "Erreur mise à jour état." };
  }
  return { success: true };
}

/**
 * Passe à la question suivante. Si c'était la dernière → endGame.
 */
export async function nextQuestionAction(sessionId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Non connecté." };

  const { data: sessionRow, error: sessionErr } = await supabase
    .schema("interactive" as never)
    .from("sessions")
    .select("current_state")
    .eq("id", sessionId)
    .single();

  if (sessionErr || !sessionRow) {
    return { success: false, error: "Session introuvable." };
  }

  const state = (sessionRow as { current_state: SessionState }).current_state;
  const nextIndex = (state?.questionIndex ?? 0) + 1;
  const questions = getQuestionsForState(state);

  // Si on a épuisé les questions → fin du jeu
  if (nextIndex >= questions.length) {
    return await endGameAction(sessionId);
  }

  const newState: SessionState = {
    phase: "question",
    questionIndex: nextIndex,
    questionStartedAt: new Date().toISOString(),
    timeLimitSec: QUESTION_TIME_LIMIT_SEC,
    theme: state?.theme, // préserve le thème entre questions
  };

  const { error } = await supabase
    .schema("interactive" as never)
    .from("sessions")
    .update({ current_state: newState } as never)
    .eq("id", sessionId);

  if (error) {
    console.error("[nextQuestionAction] update error:", error.message);
    return { success: false, error: "Erreur lancement question suivante." };
  }
  return { success: true };
}

/**
 * Termine le Quiz : status='ended', phase='final' pour afficher l'écran victoire.
 */
export async function endGameAction(sessionId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Non connecté." };

  // Récupère le state actuel pour préserver le thème dans le state final
  const { data: existingRow } = await supabase
    .schema("interactive" as never)
    .from("sessions")
    .select("current_state")
    .eq("id", sessionId)
    .single();
  // Le ?. retourne undefined si la row n'existe pas — on normalise en null
  // pour matcher la signature de getQuestionsForState(SessionState | null).
  const existingState =
    (existingRow as { current_state: SessionState } | null)?.current_state ?? null;
  const questions = getQuestionsForState(existingState);

  const newState: SessionState = {
    phase: "final",
    questionIndex: questions.length,
    theme: existingState?.theme,
  };

  const { error } = await supabase
    .schema("interactive" as never)
    .from("sessions")
    .update({
      status: "ended",
      ended_at: new Date().toISOString(),
      current_state: newState,
    } as never)
    .eq("id", sessionId);

  if (error) {
    console.error("[endGameAction] update error:", error.message);
    return { success: false, error: "Erreur fin de partie." };
  }
  return { success: true };
}
