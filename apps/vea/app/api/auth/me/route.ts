/**
 * API Route — Session utilisateur
 * GET /api/auth/me
 *
 * 👉 Ce que fait cette route :
 * 1. Lit le cookie "user_session" → récupère l'userId
 * 2. Si pas de cookie → retourne { user: null } (pas connecté)
 * 3. Si cookie trouvé → cherche le User dans la BDD
 * 4. Si user trouvé → retourne ses infos publiques
 * 5. Si user pas trouvé (cookie invalide) → retourne { user: null }
 *
 * 👉 QUAND est-ce appelé ?
 * Le hook useAuth() côté client appelle cette route au chargement de chaque page.
 * Ça permet de savoir si l'utilisateur est connecté et d'afficher son nom, etc.
 *
 * 👉 SÉCURITÉ :
 * On ne retourne JAMAIS le passwordHash.
 * On utilise `select` pour choisir uniquement les champs sûrs.
 */

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSessionUserId } from "@/lib/auth";

export async function GET() {
  try {
    // 👉 Lit le cookie de session
    const userId = await getSessionUserId();

    if (!userId) {
      // Pas de cookie → pas connecté (ce n'est PAS une erreur, juste un visiteur)
      return NextResponse.json({ user: null });
    }

    // 👉 On cherche le user dans la BDD avec uniquement les champs publics
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        prenom: true,
        nom: true,
        pseudo: true,
        role: true,
        createdAt: true,
      },
    });

    if (!user) {
      // 👉 Le cookie contient un userId qui n'existe plus en BDD
      // Ça peut arriver si le user a été supprimé
      return NextResponse.json({ user: null });
    }

    return NextResponse.json({ user });
  } catch {
    return NextResponse.json({ user: null });
  }
}
