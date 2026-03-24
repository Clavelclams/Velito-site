/**
 * API Route — Login générique
 * POST /api/auth/login
 *
 * Point d'entrée unique pour TOUS les utilisateurs (users classiques + admins).
 *
 * Comment ça marche :
 * 1. On reçoit { email, password } dans le body JSON
 * 2. On check si c'est un admin (compare avec ADMIN_EMAIL / ADMIN_PASSWORD du .env)
 * 3. Si admin → set cookie "admin_auth" + retourne { success: true, role: "admin" }
 * 4. Si pas admin → pour l'instant, on refuse (pas encore de table User)
 *    En V2, on cherchera dans la table User avec bcrypt.compare()
 *
 * Le champ `role` dans la réponse permet au front de décider où rediriger :
 * - "admin" → /admin
 * - "user"  → / (site vitrine, futur espace perso)
 */

import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email et mot de passe requis" },
        { status: 400 }
      );
    }

    // ===== CHECK ADMIN =====
    const adminEmail = process.env.ADMIN_EMAIL;
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (adminEmail && adminPassword && email === adminEmail && password === adminPassword) {
      const response = NextResponse.json({
        success: true,
        role: "admin",
      });

      // Cookie httpOnly → pas accessible en JS côté client
      // sameSite: "lax" → protection CSRF basique
      // maxAge: 24h
      response.cookies.set("admin_auth", "authenticated", {
        httpOnly: true,
        sameSite: "lax",
        maxAge: 60 * 60 * 24,
        path: "/",
      });

      return response;
    }

    // ===== CHECK USER CLASSIQUE (V2 — pas encore implémenté) =====
    // En V2, on fera :
    // const user = await prisma.user.findUnique({ where: { email } });
    // if (user && await bcrypt.compare(password, user.passwordHash)) {
    //   response.cookies.set("user_auth", user.id, { ... });
    //   return NextResponse.json({ success: true, role: "user" });
    // }

    // ===== AUCUN MATCH =====
    return NextResponse.json(
      { error: "Email ou mot de passe incorrect" },
      { status: 401 }
    );
  } catch {
    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500 }
    );
  }
}
