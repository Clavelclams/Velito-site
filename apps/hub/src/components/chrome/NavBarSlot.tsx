/**
 * NavBarSlot — Server Component qui lit le cookie session Supabase et injecte
 * l'email du user (ou null) dans <NavBar>.
 *
 * On garde NavBar en Client Component (search + mobile menu = state).
 * Ce wrapper exécute `supabase.auth.getUser()` côté serveur, donc le HTML
 * arrive déjà avec le bon état (zéro flash "Se connecter" → "Mon compte").
 *
 * Si la lecture échoue (cookie absent, Supabase down…), on renvoie null et
 * NavBar affiche son état déconnecté. On ne crashe jamais l'UI pour ça.
 *
 * Lien "Cours" : cours.velito.fr est un espace PERSONNEL (mes fiches CDA).
 * N'importe qui peut créer un compte sur le hub — "authentifié" ne veut donc
 * pas dire "autorisé". On refait donc ICI, côté serveur, le même test de
 * liste blanche que le middleware de cours : un visiteur lambda ne voit même
 * pas que le sous-domaine existe. Le middleware de cours reste la vraie
 * barrière ; ce test-ci ne fait que cacher un lien inutile (et une info).
 */
import { createClient } from "@/lib/supabase/server";
import NavBar from "./NavBar";

/** Retourne l'URL de cours si CET email y a droit, sinon null. */
function urlCoursPour(email: string | null): string | null {
  const url = process.env.NEXT_PUBLIC_COURS_URL;
  if (!url || !email) return null;

  const autorises = (process.env.COURS_EMAILS_AUTORISES ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

  // Liste vide = variable non configurée sur cette app → on n'affiche rien.
  // (On préfère un lien manquant à un lien affiché à tout le monde.)
  if (autorises.length === 0) return null;

  return autorises.includes(email.toLowerCase()) ? url : null;
}

export default async function NavBarSlot() {
  let userEmail: string | null = null;

  try {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    userEmail = data.user?.email ?? null;
  } catch (e) {
    // On loggue mais on continue en mode déconnecté.
    console.error("[NavBarSlot] auth.getUser() a échoué :", e);
  }

  return <NavBar userEmail={userEmail} coursUrl={urlCoursPour(userEmail)} />;
}
