/**
 * Page Admin VEA — verification permissions multi-org.
 *
 * Si pas connecte ou pas la permission vea/editor, on redirige.
 * Le middleware fait deja la 1ere protection, ce check est une double-securite.
 */
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { hasPermission, getUserScope } from "@/lib/supabase/permissions";
import AdminDashboard from "./AdminDashboard";

export default async function AdminPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?redirect=/admin");
  }

  const scope = await getUserScope("vea");
  const canEdit = await hasPermission("vea", "editor");

  if (!canEdit) {
    // L'user est connecte mais n'a pas les droits admin VEA
    // -> on l'envoie sur son espace membre normal
    return (
      <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-vea-bg">
        <div className="card-clean p-8 max-w-md w-full text-center">
          <span className="badge-red mb-4 inline-block">Acces restreint</span>
          <h1 className="text-2xl font-bold text-vea-text mb-3">
            Espace reserve aux <span className="text-vea-accent">admins VEA</span>
          </h1>
          <p className="text-sm text-vea-text-muted mb-2">
            Connecte avec <span className="font-mono">{user.email}</span>
          </p>
          <p className="text-xs text-vea-text-dim mb-6">
            Ton compte n&apos;a pas les permissions necessaires (scope actuel :{" "}
            <strong>{scope ?? "aucun"}</strong> sur vea).
          </p>
          <a href="/profil" className="btn-primary inline-block">
            Aller a mon profil
          </a>
        </div>
      </div>
    );
  }

  return <AdminDashboard userEmail={user.email ?? ""} />;
}
