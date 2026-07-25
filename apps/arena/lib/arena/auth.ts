/**
 * Vérification des droits staff ARENA.
 *
 * PRINCIPE (à savoir défendre en jury) :
 * chaque Server Action d'écriture appelle `requireStaff()` AVANT de toucher
 * la base avec le client service_role. Si l'utilisateur n'est pas connecté
 * OU n'est pas membre d'une organisation → on refuse. C'est le "gate" unique
 * de sécurité applicative côté serveur (la RLS reste le filet côté DB).
 */
import { createClient } from "../supabase/server";
import type { MembreOrga, Organisation } from "./types";

export interface ContexteStaff {
  userId: string;
  membre: MembreOrga;
  organisation: Organisation;
}

/**
 * Retourne le contexte staff de l'utilisateur connecté, ou null.
 * V1 = mono-orga : on prend la première organisation dont il est membre.
 */
export async function getContexteStaff(): Promise<ContexteStaff | null> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: membre } = await supabase
    .from("arena_membres_orga")
    .select("*, organisation:arena_organisations(*)")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  if (!membre) return null;

  const { organisation, ...membreSeul } = membre as MembreOrga & {
    organisation: Organisation;
  };

  return { userId: user.id, membre: membreSeul, organisation };
}

/** Comme getContexteStaff mais lève une erreur si non autorisé (pour les actions). */
export async function requireStaff(): Promise<ContexteStaff> {
  const ctx = await getContexteStaff();
  if (!ctx) {
    throw new Error(
      "Accès refusé : connecte-toi via le hub Velito avec un compte staff ARENA."
    );
  }
  return ctx;
}
