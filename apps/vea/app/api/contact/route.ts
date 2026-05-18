/**
 * /api/contact — Handler POST pour le formulaire de contact VEA.
 *
 * Stack : Resend (https://resend.com) — service email transactionnel.
 * Pour activer en prod :
 *   1. Creer un compte sur resend.com
 *   2. Verifier le domaine velitoesport.com (DNS SPF/DKIM)
 *   3. Recuperer une cle API et la mettre dans .env.local :
 *      RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxx
 *      VEA_CONTACT_TO=Vea@velitoesport.com   (ou velitoesport@gmail.com)
 *      VEA_CONTACT_FROM=contact@velitoesport.com
 *
 * En dev sans domaine verifie : utilise "onboarding@resend.dev" comme FROM
 * et l'adresse du compte Resend comme TO uniquement.
 *
 * Securite : pas de rate-limit ici (V1). A ajouter en V1.5 (upstash redis
 * ou supabase ratelimit) avant que les bots commencent a spammer.
 */
import { NextRequest, NextResponse } from "next/server";

interface ContactPayload {
  prenom: string;
  nom: string;
  email: string;
  message: string;
}

function isValidPayload(data: unknown): data is ContactPayload {
  if (typeof data !== "object" || data === null) return false;
  const d = data as Record<string, unknown>;
  return (
    typeof d.prenom === "string" &&
    typeof d.nom === "string" &&
    typeof d.email === "string" &&
    typeof d.message === "string"
  );
}

function escapeHtml(input: string): string {
  // Empeche l'injection HTML dans le mail (le message brut user peut contenir
  // n'importe quoi). On garde les sauts de ligne via <br/>.
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export async function POST(req: NextRequest) {
  let data: unknown;
  try {
    data = await req.json();
  } catch {
    return NextResponse.json(
      { error: "JSON invalide" },
      { status: 400 }
    );
  }

  if (!isValidPayload(data)) {
    return NextResponse.json(
      { error: "Champs requis manquants" },
      { status: 400 }
    );
  }

  const { prenom, nom, email, message } = data;

  // Validation longueur — anti-spam basique
  if (
    prenom.trim().length < 2 ||
    nom.trim().length < 2 ||
    message.trim().length < 10 ||
    message.length > 5000 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  ) {
    return NextResponse.json(
      { error: "Champs invalides" },
      { status: 400 }
    );
  }

  const apiKey = process.env.RESEND_API_KEY;
  const toEmail = process.env.VEA_CONTACT_TO ?? "Vea@velitoesport.com";
  const fromEmail =
    process.env.VEA_CONTACT_FROM ?? "VEA Contact <onboarding@resend.dev>";

  if (!apiKey) {
    // Mode degrade : on log pour pas perdre le message, mais on retourne
    // une erreur claire pour que le user sache que c'est pas configure.
    console.error("[/api/contact] RESEND_API_KEY manquante. Message recu :", {
      prenom,
      nom,
      email,
      message,
    });
    return NextResponse.json(
      { error: "Service email non configure cote serveur" },
      { status: 503 }
    );
  }

  const subject = `[VEA Contact] ${prenom} ${nom}`;
  const html = `
    <h2>Nouveau message via le formulaire VEA</h2>
    <p><strong>De :</strong> ${escapeHtml(prenom)} ${escapeHtml(nom)}</p>
    <p><strong>Email :</strong> <a href="mailto:${escapeHtml(email)}">${escapeHtml(email)}</a></p>
    <hr/>
    <p>${escapeHtml(message).replace(/\n/g, "<br/>")}</p>
  `;

  try {
    const resp = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [toEmail],
        reply_to: email,
        subject,
        html,
      }),
    });

    if (!resp.ok) {
      const errText = await resp.text();
      console.error("[/api/contact] Resend error:", resp.status, errText);
      return NextResponse.json(
        { error: "Echec d'envoi du mail" },
        { status: 502 }
      );
    }
  } catch (err) {
    console.error("[/api/contact] Exception fetch Resend:", err);
    return NextResponse.json(
      { error: "Erreur reseau lors de l'envoi" },
      { status: 502 }
    );
  }

  return NextResponse.json({ ok: true });
}
