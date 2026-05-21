/**
 * Permissions helper VENA — même socle que VEA (shared.user_permissions).
 *
 * Une permission = (user_id, organization_id, scope) sur l'org "vena".
 * Hiérarchie : owner(3) > editor(2) > viewer(1).
 *
 * Usage Server Component / Route Handler :
 *   if (!(await hasPermission("vena", "editor"))) redirect("/login");
 */
import { createClient } from "./server";

export type Scope = "owner" | "editor" | "viewer";

const SCOPE_LEVELS: Record<Scope, number> = {
  viewer: 1,
  editor: 2,
  owner: 3,
};

export async function hasPermission(
  orgSlug: string,
  requiredScope: Scope
): Promise<boolean> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;

  const { data: org } = await supabase
    .schema("shared")
    .from("organizations")
    .select("id")
    .eq("slug", orgSlug)
    .maybeSingle();
  if (!org) return false;

  const { data: perm } = await supabase
    .schema("shared")
    .from("user_permissions")
    .select("scope")
    .eq("user_id", user.id)
    .eq("organization_id", org.id)
    .maybeSingle();
  if (!perm) return false;

  const userLevel = SCOPE_LEVELS[perm.scope as Scope] ?? 0;
  return userLevel >= SCOPE_LEVELS[requiredScope];
}

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
