/**
 * actions.ts — Server Action pour /contact VENA.
 *
 * submitContactAction : valide les champs côté serveur (défense en
 * profondeur) puis INSERT dans vena.demandes_contact.
 *
 * Public anon : la table a une policy RLS qui autorise INSERT avec rgpd_consent=true.
 *
 * TODO V2 : Resend pour confirmation au demandeur + alerte à clavelclams12@gmail.com.
 *           Sync Notion CRM VENA via MCP (cf vena-prospecting-agent skill).
 */
"use server";

import { createClient } from "@/lib/supabase/server";

export interface ContactInput {
  prenom: string;
  nom: string;
  email: string;
  telephone: string;
  structure: string;
  fonction: string;
  service_demande: string;
  budget_envisage: string;
  delai: string;
  message: string;
  source_decouverte: string;
  rgpd_consent: boolean;
}

interface ActionResult {
  success: boolean;
  error?: string;
  demandeId?: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Échappe le HTML — le contenu vient du visiteur, inséré dans des emails.
function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export async function submitContactAction(
  input: ContactInput
): Promise<ActionResult> {
  if (!input.rgpd_consent) {
    return { success: false, error: "Consentement RGPD requis." };
  }
  if (!input.prenom?.trim() || !input.nom?.trim()) {
    return { success: false, error: "Prénom et nom requis." };
  }
  if (!input.email?.trim() || !EMAIL_RE.test(input.email)) {
    return { success: false, error: "Email invalide." };
  }
  if (!input.service_demande?.trim()) {
    return { success: false, error: "Service requis." };
  }
  if (!input.message?.trim() || input.message.trim().length < 10) {
    return {
      success: false,
      error: "Message requis (au moins 10 caractères).",
    };
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .schema("vena")
    .from("demandes_contact")
    .insert({
      prenom: input.prenom.trim().slice(0, 100),
      nom: input.nom.trim().slice(0, 100),
      email: input.email.trim().toLowerCase().slice(0, 200),
      telephone: input.telephone?.trim().slice(0, 30) || null,
      structure: input.structure?.trim().slice(0, 200) || null,
      fonction: input.fonction?.trim().slice(0, 100) || null,
      service_demande: input.service_demande,
      budget_envisage: input.budget_envisage?.trim().slice(0, 200) || null,
      delai: input.delai?.trim().slice(0, 100) || null,
      message: input.message.trim().slice(0, 3000),
      source_decouverte: input.source_decouverte?.trim() || null,
      rgpd_consent: input.rgpd_consent,
      statut: "nouveau",
    })
    .select("id")
    .single();

  if (error) {
    console.error("[submitContactAction] error:", error);
    return {
      success: false,
      error:
        "Impossible d'enregistrer ta demande. Réessaye dans quelques minutes ou écris-nous directement à contact@velito.fr.",
    };
  }

  // === Emails via Resend — best-effort : la demande est déjà enregistrée,
  // on ne bloque pas le visiteur si l'envoi échoue. ===
  const apiKey = process.env.RESEND_API_KEY;
  if (apiKey) {
    const toBureau = process.env.VENA_CONTACT_TO ?? "contact@velito.fr";
    const fromEmail =
      process.env.VENA_CONTACT_FROM ?? "VENA <onboarding@resend.dev>";

    const prenom = escapeHtml(input.prenom.trim());
    const nom = escapeHtml(input.nom.trim());
    const clientEmail = input.email.trim().toLowerCase();
    const structure = escapeHtml(input.structure?.trim() || "—");

    // 1) Alerte au bureau (reply_to = email du demandeur)
    const htmlBureau = `
      <h2>Nouvelle demande de devis VENA</h2>
      <p><strong>Demandeur :</strong> ${prenom} ${nom}${
        input.fonction ? " — " + escapeHtml(input.fonction.trim()) : ""
      }</p>
      <p><strong>Structure :</strong> ${structure}</p>
      <p><strong>Email :</strong> <a href="mailto:${escapeHtml(clientEmail)}">${escapeHtml(clientEmail)}</a><br/>
         <strong>Tel :</strong> ${escapeHtml(input.telephone?.trim() || "—")}</p>
      <hr/>
      <p><strong>Service :</strong> ${escapeHtml(input.service_demande)}</p>
      <p><strong>Budget :</strong> ${escapeHtml(input.budget_envisage?.trim() || "—")} &middot; <strong>Délai :</strong> ${escapeHtml(input.delai?.trim() || "—")}</p>
      <p><strong>Message :</strong><br/>${escapeHtml(input.message.trim()).replace(/\n/g, "<br/>")}</p>
      ${
        input.source_decouverte
          ? `<p><strong>Découvert via :</strong> ${escapeHtml(input.source_decouverte.trim())}</p>`
          : ""
      }
    `;

    // 2) Accusé de réception au demandeur
    const htmlClient = `
      <p>Bonjour ${prenom},</p>
      <p>Merci, on a bien reçu ta demande${
        input.structure ? ` concernant <strong>${structure}</strong>` : ""
      }.</p>
      <p>VENA revient vers toi sous 48 à 72h avec une proposition adaptée à ton besoin.</p>
      <p>À très vite,<br/>— VENA · Velito Expertise Numérique Amiens</p>
    `;

    try {
      await Promise.allSettled([
        fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: fromEmail,
            to: [toBureau],
            reply_to: clientEmail,
            subject: `[VENA Devis] ${input.prenom.trim()} ${input.nom.trim()}${
              input.structure ? " — " + input.structure.trim() : ""
            }`,
            html: htmlBureau,
          }),
        }),
        fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: fromEmail,
            to: [clientEmail],
            reply_to: toBureau,
            subject: "On a bien reçu ta demande — VENA",
            html: htmlClient,
          }),
        }),
      ]);
    } catch (e) {
      console.warn("[Resend] envoi emails devis VENA échoué (non bloquant) :", e);
    }
  }

  return { success: true, demandeId: data.id };
}
