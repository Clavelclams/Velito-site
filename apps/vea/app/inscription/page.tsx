/**
 * Page /inscription — REDIRECTION (refonte 21/05/2026).
 *
 * Historique : ancien formulaire d'inscription branché sur le backend Prisma
 * (/api/participants/register), désactivé depuis la migration vers le scan QR.
 * La page affichait encore le formulaire mais aucune inscription ne partait
 * (endpoint déprécié) → confusion totale pour les visiteurs.
 *
 * Désormais l'inscription "membre" se fait via la création de compte (/signup,
 * Supabase Auth) qui donne accès au profil, à la progression, aux badges, etc.
 * On redirige donc /inscription → /signup côté serveur (301-like via Next).
 *
 * Note : la pré-inscription "one-shot" à un événement (sans compte) se fait
 * uniquement via le scan QR sur place (/scan/[token]), pas ici.
 */
import { redirect } from "next/navigation";

export default function InscriptionRedirect() {
  redirect("/signup");
}
