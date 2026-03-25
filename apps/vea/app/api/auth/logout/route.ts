/**
 * API Route — Logout
 * POST /api/auth/logout
 *
 * 👉 Ce que fait cette route :
 * 1. Supprime le cookie "user_session" (utilisateurs classiques)
 * 2. Supprime le cookie "admin_auth" (admins)
 * 3. Retourne { success: true }
 *
 * On supprime LES DEUX cookies à chaque logout, comme ça :
 * - Un user classique qui se déconnecte → son cookie est supprimé
 * - Un admin qui se déconnecte → les deux sont supprimés
 * Pas de risque à supprimer un cookie qui n'existe pas.
 */

import { NextResponse } from "next/server";
import { clearSessionCookie } from "@/lib/auth";

export async function POST() {
  const response = NextResponse.json({ success: true });

  // 👉 Supprime le cookie user
  clearSessionCookie(response);

  // 👉 Supprime aussi le cookie admin (au cas où)
  response.cookies.set("admin_auth", "", {
    httpOnly: true,
    sameSite: "lax",
    maxAge: 0,
    path: "/",
  });

  return response;
}
