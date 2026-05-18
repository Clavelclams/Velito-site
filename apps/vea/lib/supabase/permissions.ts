/**
 * Permissions helper — verifie qu un utilisateur a le scope requis sur une org.
 *
 * Architecture (cf. shared.user_permissions) :
 *   - Une permission = (user_id, organization_id, scope)
 *   - Scope hierarchique : owner > editor > viewer
 *   - owner peut tout faire ; editor peut creer/modifier ; viewer lit seulement
 *
 * Usage cote Server Component / Route Handler :
 *   if (!await hasPermission('vea', 'editor')) redirect('/admin/login')
 *
 * V2 (plus tard) : ajouter une 4e fonction `hasScope('vea', 'finance')` pour
 * les tags metier (finance, content, members...) stockes dans une colonne
 * extra_scopes text[] qu on rajoutera a shared.user_permissions.
 */
import { createClient } from "./server";

export type Scope = "owner" | "editor" | "viewer";

// Hierarchie : owner = 3 > editor = 2 > viewer = 1
// hasPermission(org, 'viewer') passe pour owner/editor/viewer.
// hasPermission(org, 'owner') passe SEULEMENT pour owner.
const SCOPE_LEVELS: Record<Scope, number> = {
  viewer: 1,
  editor: 2,
  owner: 3,
};

/**
 * Verifie qu un user authentifie a au moins `requiredScope` sur l org `orgSlug`.
 * Retourne false si pas connecte, org inexistante, ou pas de permission.
 */
export async function hasPermission(
  orgSlug: string,
  requiredScope: Scope
): Promise<boolean> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;

  // schema('shared') pour pointer sur shared.organizations et shared.user_permissions
  const { data: org, error: orgError } = await supabase
    .schema("shared")
    .from("organizations")
    .select("id")
    .eq("slug", orgSlug)
    .maybeSingle();

  if (orgError || !org) return false;

  const { data: perm, error: permError } = await supabase
    .schema("shared")
    .from("user_permissions")
    .select("scope")
    .eq("user_id", user.id)
    .eq("organization_id", org.id)
    .maybeSingle();

  if (permError || !perm) return false;

  const userLevel = SCOPE_LEVELS[perm.scope as Scope] ?? 0;
  const requiredLevel = SCOPE_LEVELS[requiredScope];
  return userLevel >= requiredLevel;
}

/**
 * Retourne le scope effectif de l user sur une org, ou null si aucune
 * permission. Utile pour afficher conditionnellement des boutons UI.
 */
export async function getUserScope(orgSlug: string): Promise<Scope | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: org } = await supabase
    .schema("shared")
    .from("organizations")
    .select("id")
    .eq("slug", orgSlug)
    .maybeSingle();
  if (!org) return null;

  const { data: perm } = await supabase
    .schema("shared")
    .from("user_permissions")
    .select("scope")
    .eq("user_id", user.id)
    .eq("organization_id", org.id)
    .maybeSingle();

  return (perm?.scope as Scope) ?? null;
}
