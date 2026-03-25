/**
 * Auth Utilities — Fonctions partagées pour l'authentification
 *
 * 👉 Ce fichier centralise :
 * - Le nom du cookie de session
 * - La durée de session
 * - La création/lecture/suppression du cookie
 *
 * Comme ça, si on change le nom du cookie ou la durée,
 * on le fait ICI et pas dans 5 fichiers différents.
 */

import { NextResponse } from "next/server";
import { cookies } from "next/headers";

// ===== CONSTANTES =====

// 👉 Nom du cookie pour les users classiques (différent de "admin_auth" pour les admins)
export const USER_COOKIE_NAME = "user_session";

// 👉 Durée de session : 7 jours en secondes
// 60 secondes × 60 minutes × 24 heures × 7 jours = 604800 secondes
export const SESSION_MAX_AGE = 60 * 60 * 24 * 7;

// ===== FONCTIONS =====

/**
 * 👉 Ajoute le cookie de session sur une réponse NextResponse
 *
 * @param response - La réponse HTTP sur laquelle on pose le cookie
 * @param userId - L'ID de l'utilisateur (stocké dans le cookie)
 *
 * httpOnly: true → JavaScript côté client NE PEUT PAS lire ce cookie
 *                   (protection contre les attaques XSS)
 * sameSite: "lax" → Le cookie est envoyé sur les navigations normales
 *                    mais PAS sur les requêtes cross-site (protection CSRF basique)
 * secure: true en prod → Le cookie ne voyage que sur HTTPS
 * path: "/" → Le cookie est disponible sur TOUTES les pages du site
 */
export function setSessionCookie(response: NextResponse, userId: string) {
  response.cookies.set(USER_COOKIE_NAME, userId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: SESSION_MAX_AGE,
    path: "/",
  });
}

/**
 * 👉 Lit le cookie de session depuis la requête entrante
 * Retourne l'userId ou null si pas de cookie
 */
export async function getSessionUserId(): Promise<string | null> {
  const cookieStore = await cookies();
  const session = cookieStore.get(USER_COOKIE_NAME);
  return session?.value ?? null;
}

/**
 * 👉 Supprime le cookie de session (logout)
 * On met maxAge: 0 → le navigateur supprime le cookie immédiatement
 */
export function clearSessionCookie(response: NextResponse) {
  response.cookies.set(USER_COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 0,
    path: "/",
  });
}
