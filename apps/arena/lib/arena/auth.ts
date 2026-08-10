/**
 * Vérification des droits staff ARENA — branchée sur le modèle de droits
 * PARTAGÉ de l'écosystème : shared.organizations + shared.user_permissions
 * (scope hiérarchique owner > editor > viewer, même table que VEA/VENA).
 *
 * Décision Lot 1 (feuille de route §Lot 1 « Rôles et permissions ») :
 * arena n'a PAS son propre système de membres. Être staff arena d'une
 * organisation = avoir owner ou editor sur cette organisation dans shared.
 * Un seul système de droits à auditer pour tout l'écosystème.
 *
 * PRINCIPE (défense jury) : chaque Server Action d'écriture appelle
 * `requireStaff()` AVANT de toucher la base avec service_role. La RLS
 * (arena.est_staff(), même logique côté Postgres) reste le filet en lecture.
 */
import { createClient } from "../supabase/server";
import type { OrganisationAvecRole, ScopePartage } from "./types";

export interface ContexteStaff {
  userId: string;
  /** Toutes les organisations où l'utilisateur est staff (owner/editor). */
  organisations: OrganisationAvecRole[];
}

/**
 * La config Supabase est-elle présente dans l'environnement ?
 * Une env manquante est un ÉTAT PRÉVISIBLE (app pas branchée), pas un bug —
 * détectée AVANT de créer un client pour afficher un écran explicite au lieu
 * d'une 500 (incident /admin du 10/08/2026).
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
 * Multi-organisations : un même compte peut être staff de plusieurs orgas
 * (ex. Clavel : vea ET vena) — on retourne la liste complète, et chaque
 * action vérifie que le tournoi appartient à L'UNE d'elles.
 *
 * Ne lève JAMAIS pour un problème de config/réseau : log serveur + null.
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

  // 1. Les permissions staff de l'utilisateur (table partagée, schéma shared).
  const { data: perms, error } = await supabase
    .schema("shared")
    .from("user_permissions")
    .select("organization_id, scope")
    .eq("user_id", user.id)
    .in("scope", ["owner", "editor"]);

  if (error || !perms || perms.length === 0) return null;

  // 2. Les organisations correspondantes (id, slug, name).
  const orgIds = perms.map((p) => p.organization_id as string);
  const { data: orgs } = await supabase
    .schema("shared")
    .from("organizations")
    .select("id, slug, name")
    .in("id", orgIds);

  if (!orgs || orgs.length === 0) return null;

  const scopeParOrg = new Map(
    perms.map((p) => [p.organization_id as string, p.scope as ScopePartage])
  );
  const organisations: OrganisationAvecRole[] = orgs.map((o) => ({
    id: o.id as string,
    slug: o.slug as string,
    name: o.name as string,
    scope: scopeParOrg.get(o.id as string) ?? "editor",
  }));

  return { userId: user.id, organisations };
}

/** L'utilisateur du contexte est-il staff de CETTE organisation ? */
export function estStaffDe(ctx: ContexteStaff, organisationId: string): boolean {
  return ctx.organisations.some((o) => o.id === organisationId);
}

/** Comme getContexteStaff mais lève si non autorisé (pour les Server Actions). */
export async function requireStaff(): Promise<ContexteStaff> {
  const ctx = await getContexteStaff();
  if (!ctx) {
    throw new Error(
      "Accès refusé : connecte-toi via le hub Velito avec un compte staff."
    );
  }
  return ctx;
}
