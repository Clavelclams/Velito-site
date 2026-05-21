/**
 * actions.ts — Server Action du module SIGNALEMENT (bug-report) VENA.
 *
 * Flux : l'utilisateur CONNECTÉ remplit catégorie + description (+ pièce jointe
 * optionnelle), on valide tout côté serveur, on upload le fichier dans le bucket
 * privé `signalements` (rangé sous son user_id), puis on insère dans
 * shared.signalements.
 *
 * SÉCURITÉ :
 *   - Envoi réservé aux connectés (anti-spam) → si pas de session, on renvoie
 *     needAuth:true (le front invite à se connecter).
 *   - Pièce jointe : 1 fichier, image (jpg/png/webp) ou PDF, 5 Mo max. Double
 *     validation type MIME déclaré + extension. Nom de fichier régénéré (UUID),
 *     jamais le nom d'origine → pas d'injection via le nom.
 *   - Aucune injection SQL possible (requêtes paramétrées Supabase).
 *   - try/catch global : ne throw jamais (pas de page 500).
 */
"use server";

import { createClient } from "@/lib/supabase/server";

const CATEGORIES = ["bug_technique", "souci_projet", "souci_vea", "autre"] as const;

// Type MIME autorisé -> extensions acceptées (doivent concorder toutes les deux).
const ALLOWED_TYPES: Record<string, string[]> = {
  "image/jpeg": [".jpg", ".jpeg"],
  "image/png": [".png"],
  "image/webp": [".webp"],
  "application/pdf": [".pdf"],
};
const MAX_SIZE = 5 * 1024 * 1024; // 5 Mo

export interface SignalementResult {
  success: boolean;
  error?: string;
  needAuth?: boolean;
}

export async function submitSignalementAction(
  formData: FormData
): Promise<SignalementResult> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return {
        success: false,
        needAuth: true,
        error: "Connecte-toi pour envoyer un signalement.",
      };
    }

    const categorie = String(formData.get("categorie") ?? "").trim();
    const projet = String(formData.get("projet") ?? "").trim().slice(0, 120);
    const description = String(formData.get("description") ?? "").trim();
    const app = String(formData.get("app") ?? "vena").trim().slice(0, 20) || "vena";

    if (!(CATEGORIES as readonly string[]).includes(categorie)) {
      return { success: false, error: "Choisis une catégorie." };
    }
    if (description.length < 5 || description.length > 5000) {
      return {
        success: false,
        error: "Décris le problème (entre 5 et 5000 caractères).",
      };
    }

    // --- Pièce jointe optionnelle ---
    let attachmentPath: string | null = null;
    const file = formData.get("file");
    if (file && file instanceof File && file.size > 0) {
      if (file.size > MAX_SIZE) {
        return { success: false, error: "Fichier trop lourd (5 Mo maximum)." };
      }
      const type = file.type;
      const ext = "." + (file.name.split(".").pop() ?? "").toLowerCase();
      const allowedExts = ALLOWED_TYPES[type];
      if (!allowedExts || !allowedExts.includes(ext)) {
        return {
          success: false,
          error:
            "Pièce jointe non autorisée : seulement une photo (JPG, PNG, WEBP) ou un PDF.",
        };
      }
      // Nom régénéré : jamais le nom d'origine. Rangé sous le user_id (isolation).
      const safeName = `${user.id}/${crypto.randomUUID()}${ext}`;
      const { error: upErr } = await supabase.storage
        .from("signalements")
        .upload(safeName, file, { contentType: type, upsert: false });
      if (upErr) {
        console.error("[signalement] upload échoué :", upErr);
        return {
          success: false,
          error: "Échec de l'envoi du fichier. Réessaye sans pièce jointe.",
        };
      }
      attachmentPath = safeName;
    }

    const { error } = await supabase
      .schema("shared")
      .from("signalements")
      .insert({
        user_id: user.id,
        email: user.email ?? null,
        app,
        categorie,
        projet: projet || null,
        description,
        attachment_path: attachmentPath,
      });

    if (error) {
      console.error("[signalement] insert échoué :", error);
      return {
        success: false,
        error: "Impossible d'enregistrer le signalement. Réessaye dans un moment.",
      };
    }

    return { success: true };
  } catch (e) {
    console.error("[submitSignalementAction] exception :", e);
    return {
      success: false,
      error: "Erreur technique. Réessaye dans quelques minutes.",
    };
  }
}
