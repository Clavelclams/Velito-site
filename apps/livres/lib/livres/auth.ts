/**
 * Droits des bénévoles (13/11/2026).
 *
 * Pas de système de membres à part : est « bénévole admin » toute personne
 * owner ou editor de l'organisation VEA dans shared.user_permissions, la même
 * table que VEA, Arena et le hub. Un seul endroit où donner ou retirer un
 * accès dans tout l'écosystème.
 *
 * Les actions serveur appellent requireAdmin() AVANT d'écrire avec
 * service_role. La page /admin appelle getAdmin() pour afficher ou non.
 */
import { createClient } from "../supabase/server";

export const ORGANISATION_ADMIN = "vea";

export async function getAdmin(): Promise<{ userId: string } | null> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;
    const { data } = await supabase
      .schema("shared")
      .from("user_permissions")
      .select("scope, organizations!inner(slug)")
      .eq("user_id", user.id)
      .eq("organizations.slug", ORGANISATION_ADMIN)
      .in("scope", ["owner", "editor"])
      .limit(1);
    return data && data.length > 0 ? { userId: user.id } : null;
  } catch (e) {
    console.error("[livres/auth] getAdmin", e);
    return null;
  }
}

export async function requireAdmin(): Promise<{ userId: string }> {
  const a = await getAdmin();
  if (!a) throw new Error("Réservé aux bénévoles de Velito Esport Amiens.");
  return a;
}

/** Utilisateur connecté (pour savoir s'il faut proposer de se connecter). */
export async function estConnecte(): Promise<boolean> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    return Boolean(user);
  } catch {
    return false;
  }
}
