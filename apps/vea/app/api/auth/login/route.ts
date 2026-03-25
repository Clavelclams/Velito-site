/**
 * API Route — Login générique
 * POST /api/auth/login
 *
 * 👉 Point d'entrée unique pour TOUS les utilisateurs (users classiques + admins).
 *
 * Comment ça marche :
 * 1. On reçoit { email, password } dans le body JSON
 * 2. On check si c'est un admin (compare avec ADMIN_EMAIL / ADMIN_PASSWORD du .env)
 * 3. Si admin → set cookie "admin_auth" + retourne { success: true, role: "admin" }
 * 4. Si pas admin → on cherche dans la table User avec bcrypt.compare()
 * 5. Si user trouvé → set cookie "user_session" + retourne { success: true, role, user }
 * 6. Aucun match → erreur 401
 *
 * Le champ `role` dans la réponse permet au front de décider où rediriger :
 * - "admin" → /admin
 * - "ADMIN_VEA" → /admin (admin via BDD)
 * - "USER"  → /membre (espace membre)
 */

import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";
import { setSessionCookie } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email et mot de passe requis" },
        { status: 400 }
      );
    }

    // ===== CHECK ADMIN (.env) =====
    // 👉 On garde le login admin via .env pour le SUPERADMIN
    // C'est un fallback : même si la BDD est vide, le superadmin peut se connecter
    const adminEmail = process.env.ADMIN_EMAIL;
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (adminEmail && adminPassword && email === adminEmail && password === adminPassword) {
      const response = NextResponse.json({
        success: true,
        role: "admin",
      });

      // 👉 Cookie admin séparé (comme avant)
      response.cookies.set("admin_auth", "authenticated", {
        httpOnly: true,
        sameSite: "lax",
        maxAge: 60 * 60 * 24, // 24h
        path: "/",
      });

      return response;
    }

    // ===== CHECK USER (table User avec bcrypt) =====
    // 👉 On cherche le user par email (en lowercase pour éviter les doublons)
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (!user) {
      // 👉 On ne dit PAS "email introuvable" pour ne pas révéler
      // quels emails sont inscrits (sécurité basique)
      return NextResponse.json(
        { error: "Email ou mot de passe incorrect" },
        { status: 401 }
      );
    }

    // 👉 bcrypt.compare() compare le mot de passe en clair avec le hash stocké
    // Si ça matche → true, sinon → false
    // On ne peut PAS faire passwordHash === password (le hash est différent à chaque fois)
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

    if (!isPasswordValid) {
      return NextResponse.json(
        { error: "Email ou mot de passe incorrect" },
        { status: 401 }
      );
    }

    // ===== SUCCÈS — User connecté =====
    const response = NextResponse.json({
      success: true,
      role: user.role,
      user: {
        id: user.id,
        email: user.email,
        prenom: user.prenom,
        nom: user.nom,
        pseudo: user.pseudo,
        role: user.role,
      },
    });

    // 👉 On pose le cookie de session avec l'ID du user
    setSessionCookie(response, user.id);

    // 👉 Si c'est un ADMIN_VEA, on pose aussi le cookie admin
    // pour que le middleware admin le laisse passer sur /admin
    if (user.role === "ADMIN_VEA" || user.role === "SUPERADMIN") {
      response.cookies.set("admin_auth", "authenticated", {
        httpOnly: true,
        sameSite: "lax",
        maxAge: 60 * 60 * 24,
        path: "/",
      });
    }

    return response;
  } catch {
    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500 }
    );
  }
}
