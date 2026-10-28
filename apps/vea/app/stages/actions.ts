/**
 * actions.ts — Server Action de la page /stages.
 *
 * submitCandidatureStageAction : revalide tout côté serveur (le formulaire
 * peut être contourné), recalcule le chevauchement avec les périodes prises,
 * puis INSERT dans vea.demandes_prestation avec type = 'stage'.
 * Même circuit que les devis : le trigger SQL notifie les dirigeants, la
 * candidature apparaît dans /admin/demandes.
 *
 * Accès : public (INSERT anon autorisé par la policy, cas type = 'stage').
 *
 * [16/10/2026] Créé. Le chevauchement ne bloque PAS l'envoi : le candidat peut
 * proposer d'autres dates dans son message. On l'enregistre juste en base
 * (chevauche_periode_prise) pour le repérer dans l'admin.
 */
"use server";

import { createClient } from "@/lib/supabase/server";
import { periodesEnConflit, estDateValide, aujourdhuiParis } from "@/lib/stages.config";

export interface CandidatureStageInput {
  prenom: string;
  nom: string;
  email: string;
  telephone: string;
  etablissement: string;
  formation: string;
  stage_debut: string; // "AAAA-MM-JJ"
  stage_fin: string; // "AAAA-MM-JJ"
  motivation: string;
  mineur: boolean;
  email_parent: string;
  rgpd_consent: boolean;
  /** Champ piège invisible : un humain le laisse vide, un robot le remplit. */
  site_web: string;
}

interface ActionResult {
  success: boolean;
  error?: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Le contenu vient du visiteur et part dans des emails HTML : on l'échappe.
// (Même fonction que app/prestations/actions.ts.)
function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export async function submitCandidatureStageAction(
  input: CandidatureStageInput,
): Promise<ActionResult> {
  // [16/10/2026] Robot détecté : on fait semblant que tout va bien, sans rien
  // enregistrer. Lui renvoyer une erreur l'aiderait à s'adapter.
  if (input.site_web?.trim()) return { success: true };

  // === Validation serveur ===
  if (!input.rgpd_consent) return { success: false, error: "Tu dois accepter l'utilisation de tes données." };
  if (!input.prenom?.trim() || !input.nom?.trim()) return { success: false, error: "Prénom et nom requis." };
  if (!input.email?.trim() || !EMAIL_RE.test(input.email.trim())) return { success: false, error: "Email invalide." };
  if (!input.telephone?.trim() || input.telephone.replace(/\D/g, "").length < 10) {
    return { success: false, error: "Numéro de téléphone invalide." };
  }
  if (!input.etablissement?.trim()) return { success: false, error: "Établissement requis." };
  if (!input.formation?.trim()) return { success: false, error: "Formation et niveau requis." };

  const debut = input.stage_debut?.trim() ?? "";
  const fin = input.stage_fin?.trim() ?? "";
  if (!estDateValide(debut) || !estDateValide(fin)) return { success: false, error: "Dates de stage invalides." };
  if (fin < debut) return { success: false, error: "La date de fin est avant la date de début." };
  if (debut < aujourdhuiParis()) return { success: false, error: "La date de début est déjà passée." };

  if (!input.motivation?.trim()) return { success: false, error: "Écris quelques mots de motivation." };

  if (input.mineur && (!input.email_parent?.trim() || !EMAIL_RE.test(input.email_parent.trim()))) {
    return { success: false, error: "Email du parent ou du responsable légal invalide." };
  }

  // Recalculé ici et pas repris du navigateur : la valeur stockée doit être fiable.
  const chevauche = periodesEnConflit({ debut, fin }).length > 0;

  // === INSERT ===
  const supabase = await createClient();
  const { error } = await supabase
    .schema("vea")
    .from("demandes_prestation")
    .insert({
      type: "stage",
      referent_prenom: input.prenom.trim().slice(0, 100),
      referent_nom: input.nom.trim().slice(0, 100),
      email: input.email.trim().toLowerCase().slice(0, 200),
      telephone: input.telephone.trim().slice(0, 30),
      etablissement: input.etablissement.trim().slice(0, 200),
      formation: input.formation.trim().slice(0, 200),
      stage_debut: debut,
      stage_fin: fin,
      motivation: input.motivation.trim().slice(0, 1000),
      mineur: Boolean(input.mineur),
      // Pas d'email parent stocké pour un majeur (donnée minimale).
      email_parent: input.mineur ? input.email_parent.trim().toLowerCase().slice(0, 200) : null,
      chevauche_periode_prise: chevauche,
      rgpd_consent: true,
      statut: "nouveau",
    });
  // Pas de .select() après l'insert : l'anonyme n'a pas le droit de relire la
  // ligne (bug du 21/05 sur les devis).

  if (error) {
    console.error("[submitCandidatureStageAction] error:", error);
    return {
      success: false,
      error: "Impossible d'enregistrer ta candidature. Réessaie dans quelques minutes ou écris-nous à contact@velito.fr.",
    };
  }

  // === Emails via Resend, best-effort (la candidature est déjà enregistrée) ===
  const apiKey = process.env.RESEND_API_KEY;
  if (apiKey) {
    const toBureau = process.env.VEA_CONTACT_TO ?? "contact@velito.fr";
    const fromEmail = process.env.VEA_CONTACT_FROM ?? "VEA <onboarding@resend.dev>";
    const candidatEmail = input.email.trim().toLowerCase();
    const prenom = escapeHtml(input.prenom.trim());
    const nomComplet = `${prenom} ${escapeHtml(input.nom.trim())}`;

    const htmlBureau = `
      <h2>Nouvelle candidature de stage</h2>
      <p><strong>${nomComplet}</strong>${input.mineur ? " (mineur)" : ""}</p>
      <p>${escapeHtml(input.formation.trim())}, ${escapeHtml(input.etablissement.trim())}</p>
      <p><strong>Dates :</strong> du ${escapeHtml(debut)} au ${escapeHtml(fin)}${chevauche ? " <strong>(période déjà prise)</strong>" : ""}</p>
      <p><strong>Motivation :</strong><br/>${escapeHtml(input.motivation.trim()).replace(/\n/g, "<br/>")}</p>
      <p>Détail et suivi dans l'admin : /admin/demandes</p>
    `;
    const htmlCandidat = `
      <p>Bonjour ${prenom},</p>
      <p>On a bien reçu ta candidature de stage chez Velito Esport Amiens. Merci !</p>
      <p>On la lit et on revient vers toi par mail. Si ton profil correspond, on te demandera ton CV à ce moment-là.</p>
      <p>À bientôt,<br/>L'équipe VEA</p>
    `;

    try {
      await Promise.allSettled([
        fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            from: fromEmail,
            to: [toBureau],
            reply_to: candidatEmail,
            subject: `[VEA Stage] ${input.prenom.trim()} ${input.nom.trim()}`,
            html: htmlBureau,
          }),
        }),
        fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            from: fromEmail,
            to: [candidatEmail],
            reply_to: toBureau,
            subject: "On a bien reçu ta candidature de stage, VEA",
            html: htmlCandidat,
          }),
        }),
      ]);
    } catch (e) {
      console.warn("[Resend] emails candidature stage non envoyés (non bloquant) :", e);
    }
  }

  return { success: true };
}
