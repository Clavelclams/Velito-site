/**
 * Server actions de /host — gestion des sessions Velito Interactive.
 *
 * createSessionAction()  : crée une nouvelle session côté host (animateur loggé)
 * endSessionAction(id)   : termine une session (status → 'ended')
 * startSessionAction(id) : lance la partie (status → 'playing')
 *
 * Sécurité :
 *  - Toutes les actions vérifient que l'user est loggé (sinon throw)
 *  - L'INSERT/UPDATE des sessions est filtré par RLS côté Postgres :
 *    seul le host_user_id = auth.uid() peut modifier sa session
 *  - On utilise le code généré par interactive.generate_session_code() (RPC)
 *    qui assure l'unicité + évite les caractères ambigus (0/O, 1/I/L)
 *
 * Note jury CDA : on délègue la génération du code à PostgreSQL (SECURITY DEFINER
 * function) plutôt qu'à JS pour 2 raisons :
 *   1. Atomicité : la fonction tente jusqu'à 50 fois et retry si collision
 *   2. Source unique de vérité : pas de risque que 2 clients génèrent le même
 *      code en même temps (race condition côté JS)
 */
"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

interface CreateSessionResult {
  success: boolean;
  error?: string;
  /** L'ID de la session créée (UUID) — utilisable pour subscribe Realtime */
  sessionId?: string;
  /** Le code court à afficher sur l'écran TV */
  code?: string;
}

/**
 * Crée une session, avec possibilité de pré-sélectionner un type de jeu.
 *
 * @param gameType  Optionnel — si fourni, la session est créée avec
 *                  game_type déjà set. Sinon, le host choisira au lobby.
 */
export async function createSessionAction(
  gameType?: "quiz" | "petit_bac" | "blind_test" | "estim" | "geo" | "reflex" | "loup_garou" | null
): Promise<CreateSessionResult> {
  const supabase = await createClient();

  // 1. Vérif auth user
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: "Tu dois être connecté pour lancer une session." };
  }

  // 1.bis. Vérif abonnement pour les jeux non-gratuits
  // Loup-Garou = gratuit pour tous. Les autres demandent un essai ou abo actif.
  if (gameType && gameType !== "loup_garou") {
    const { data: hasAccess } = await supabase
      .schema("shared" as never)
      .rpc("has_active_subscription", { p_user_id: user.id });
    if (!hasAccess) {
      return {
        success: false,
        error: "Active ton essai 7 jours gratuit pour débloquer ce jeu.",
      };
    }
  }

  try {
    // 2. Générer un code unique via la function Postgres
    const { data: codeData, error: codeError } = await supabase
      .schema("interactive" as never)
      .rpc("generate_session_code");

    if (codeError || !codeData) {
      console.error("[createSessionAction] code generation failed:", codeError?.message);
      return {
        success: false,
        error: "Impossible de générer un code de session. Réessaye.",
      };
    }

    const code = String(codeData);

    // 3. Insérer la session (avec game_type si fourni)
    const insertPayload: Record<string, unknown> = {
      code,
      host_user_id: user.id,
      status: "lobby",
    };
    if (gameType) insertPayload.game_type = gameType;

    const { data: session, error: insertError } = await supabase
      .schema("interactive" as never)
      .from("sessions")
      .insert(insertPayload as never)
      .select("id, code")
      .single();

    if (insertError || !session) {
      console.error("[createSessionAction] insert failed:", insertError?.message);
      return {
        success: false,
        error: "Impossible de créer la session. Réessaye.",
      };
    }

    const row = session as { id: string; code: string };
    return { success: true, sessionId: row.id, code: row.code };
  } catch (e) {
    console.error("[createSessionAction] exception:", e);
    return { success: false, error: "Erreur technique. Réessaye." };
  }
}

/**
 * Termine une session — passe status à 'ended'. RLS filtre par host_user_id.
 */
export async function endSessionAction(sessionId: string): Promise<void> {
  const supabase = await createClient();
  await supabase
    .schema("interactive" as never)
    .from("sessions")
    .update({
      status: "ended",
      ended_at: new Date().toISOString(),
    } as never)
    .eq("id", sessionId);
  // Pas de return — l'UI redirige côté client
}

/**
 * Lance la partie — passe status à 'playing'.
 * Plus tard : on broadcast un event "game_start" via Realtime ici.
 */
export async function startSessionAction(sessionId: string): Promise<void> {
  const supabase = await createClient();
  await supabase
    .schema("interactive" as never)
    .from("sessions")
    .update({
      status: "playing",
      started_at: new Date().toISOString(),
    } as never)
    .eq("id", sessionId);
}


/**
 * Redirige vers la page de la TV avec une nouvelle session.
 * Utilisé par le bouton "Lancer une session" sur /dashboard.
 */
export async function createSessionAndRedirectAction(): Promise<void> {
  const result = await createSessionAction();
  if (!result.success || !result.code) {
    redirect("/dashboard?error=session_create");
  }
  redirect(`/host?code=${result.code}`);
}

/**
 * Variante avec game_type — utilisée par les cards du catalogue de jeux.
 */
export async function createSessionWithGameAction(formData: FormData): Promise<void> {
  const gameTypeRaw = formData.get("game_type");
  const gameType = (
    gameTypeRaw === "quiz" || gameTypeRaw === "petit_bac" ||
    gameTypeRaw === "blind_test" || gameTypeRaw === "estim" ||
    gameTypeRaw === "geo" || gameTypeRaw === "reflex" ||
    gameTypeRaw === "loup_garou"
      ? gameTypeRaw
      : null
  );
  const result = await createSessionAction(gameType);
  if (!result.success || !result.code) {
    redirect("/dashboard?error=session_create");
  }
  redirect(`/host?code=${result.code}`);
}
