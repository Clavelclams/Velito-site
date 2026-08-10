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
 * La config Supabase est-elle présente dans l'environnement ?
 *
 * Pourquoi ce helper : une env manquante est un ÉTAT PRÉVISIBLE du déploiement
 * (app pas encore branchée), pas un bug. On le détecte AVANT de créer un
 * client, pour afficher un écran explicite au lieu de laisser une exception
 * remonter en erreur 500 (cause de l'incident /admin du 10/08/2026).
 */
export function configSupabasePresente(): boolean {
  return Boolean(
    (process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL) &&
      (process.env.SUPABASE_ANON_KEY ??
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
  );
}

/**
 * Retourne le contexte staff de l'utilisateur connecté, ou null.
 * V1 = mono-orga : on prend la première organisation dont il est membre.
 *
 * Ne lève JAMAIS d'exception pour un problème de config ou de réseau : un
 * layout qui rend une page publique d'accès ne doit pas pouvoir produire une
 * 500. On logge côté serveur (visible dans les Runtime Logs Vercel) et on
 * retourne null → l'UI affiche l'écran de connexion / configuration.
 */
export async function getContexteStaff(): Promise<ContexteStaff | null> {
  if (!configSupabasePresente()) {
    console.error(
      "[arena/auth] Config Supabase absente : SUPABASE_URL / SUPABASE_ANON_KEY non définies."
    );
    return null;
  }

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
