/**
 * API Route — Login admin
 * POST /api/admin/login
 *
 * 👉 Compare email + mot de passe avec les variables d'environnement
 * 👉 Si correct → set un cookie "admin_auth" et renvoie success
 * 👉 C'est une auth TRÈS basique (V1). En V2 on passera sur un vrai système
 *    avec JWT, bcrypt, et la table User du schema Prisma.
 *
 * ⚠️ En prod, JAMAIS stocker un mot de passe en clair dans le .env.
 *    C'est OK pour le dev local uniquement.
 */

import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    const adminEmail = process.env.ADMIN_EMAIL;
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (!adminEmail || !adminPassword) {
      return NextResponse.json(
        { error: "Configuration admin manquante" },
        { status: 500 }
      );
    }

    if (email !== adminEmail || password !== adminPassword) {
      return NextResponse.json(
        { error: "Email ou mot de passe incorrect" },
        { status: 401 }
      );
    }

    // 👉 On crée la réponse et on set le cookie
    const response = NextResponse.json({ success: true });

    // 👉 httpOnly = le cookie n'est pas accessible en JavaScript côté client
    // 👉 sameSite: "lax" = protection CSRF basique
    // 👉 maxAge = durée de vie en secondes (ici 24h)
    response.cookies.set("admin_auth", "authenticated", {
      httpOnly: true,
      sameSite: "lax",
      maxAge: 60 * 60 * 24, // 24 heures
      path: "/",
    });

    return response;
  } catch {
    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500 }
    );
  }
}
