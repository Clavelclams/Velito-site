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

  // 20/05/2026 : stats /admin decomposees pour etre plus parlantes.
  // Avant : "Participants 101" comptait TOUT (87 Old VEA seedes sans compte
  // + 13 NSP + 1 nouveau). Trompeur car melange les actifs et les anciens
  // a faire migrer.
  // Maintenant : 4 cards decompose :
  //   - Membres avec compte (user_id NOT NULL) = les actifs sur le site
  //   - Pre-inscrits guest (pre_inscrit = TRUE) = a fusionner plus tard
  //   - Old VEA en attente (sans compte, pas pre-inscrit) = a faire inscrire
  //   - Events a venir non annules
  const nowIso = new Date().toISOString();

  const [
    { count: membresAvecCompte },
    { count: preInscritsGuest },
    { count: oldVeaEnAttente },
    { count: eventsAVenirCount },
  ] = await Promise.all([
    supabase
      .schema("vea")
      .from("participants")
      .select("*", { count: "exact", head: true })
      .not("user_id", "is", null),
    supabase
      .schema("vea")
      .from("participants")
      .select("*", { count: "exact", head: true })
      .eq("pre_inscrit", true),
    supabase
      .schema("vea")
      .from("participants")
      .select("*", { count: "exact", head: true })
      .is("user_id", null)
      .eq("pre_inscrit", false),
    supabase
      .schema("vea")
      .from("evenements")
      .select("*", { count: "exact", head: true })
      .gte("date", nowIso)
      .neq("statut", "annule"),
  ]);

  return (
    <AdminDashboard
      userEmail={user.email ?? ""}
      supabaseStats={{
        membresAvecCompte: membresAvecCompte ?? 0,
        preInscritsGuest: preInscritsGuest ?? 0,
        oldVeaEnAttente: oldVeaEnAttente ?? 0,
        eventsAVenir: eventsAVenirCount ?? 0,
      }}
    />
  );
}
