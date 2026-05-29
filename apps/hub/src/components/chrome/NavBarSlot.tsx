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
 */
import { createClient } from "@/lib/supabase/server";
import NavBar from "./NavBar";

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

  return <NavBar userEmail={userEmail} />;
}
