/**
 * /admin/demandes — Liste des demandes de devis (prestations VEA).
 *
 * Source : vea.demandes_prestation. Réservé éditeurs+ VEA.
 * C'est la cible des notifications cloche "Nouvelle demande de devis".
 */
import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { hasPermission } from "@/lib/supabase/permissions";

export const dynamic = "force-dynamic";

const STATUT_STYLE: Record<string, string> = {
  nouveau: "bg-vea-accent text-white",
  en_cours: "bg-blue-100 text-blue-700",
  traite: "bg-emerald-100 text-emerald-700",
  archive: "bg-vea-bg text-vea-text-dim",
  refuse: "bg-zinc-200 text-zinc-600",
};

export default async function AdminDemandesPage({
  searchParams,
}: {
  searchParams: Promise<{ archivees?: string }>;
}) {
  const { archivees } = await searchParams;
  const showArchived = archivees === "1";

  const canEdit = await hasPermission("vea", "editor");
  if (!canEdit) redirect("/admin?denied=demandes");

  const supabase = await createClient();
  let query = supabase
    .schema("vea")
    .from("demandes_prestation")
    .select(
      "id, structure_nom, referent_prenom, referent_nom, pack_envisage, date_souhaitee, lieu_ville, email, statut, created_at",
    )
    .order("created_at", { ascending: false });
  // Par défaut on cache les archivées (statut 'annule') ; ?archivees=1 les montre.
  query = showArchived ? query.eq("statut", "annule") : query.neq("statut", "annule");
  const { data } = await query;

  type Row = {
    id: string;
    structure_nom: string;
    referent_prenom: string;
    referent_nom: string;
    pack_envisage: string | null;
    date_souhaitee: string | null;
    lieu_ville: string | null;
    email: string | null;
    statut: string | null;
    created_at: string;
  };
  const demandes = (data ?? []) as Row[];
  const nouvelles = demandes.filter((d) => (d.statut ?? "nouveau") === "nouveau").length;

  return (
    <div className="min-h-screen bg-vea-bg pt-28 pb-20 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="mb-6">
          <Link href="/admin" className="text-xs text-vea-text-dim hover:text-vea-accent">
            ← Retour /admin
          </Link>
        </div>

        <div className="mb-8">
          <span className="badge-red mb-3 inline-block">Admin VEA</span>
          <h1 className="text-3xl sm:text-4xl font-black text-vea-text mb-2">
            Demandes de <span className="text-vea-accent">devis</span>
          </h1>
          <p className="text-sm text-vea-text-muted">
            {demandes.length} demande{demandes.length > 1 ? "s" : ""} au total
            {nouvelles > 0 && (
              <> · <strong className="text-vea-accent">{nouvelles} nouvelle{nouvelles > 1 ? "s" : ""}</strong></>
            )}
            . SLA annoncé : réponse sous 48-72h.
          </p>
          <div className="mt-3">
            <Link
              href={showArchived ? "/admin/demandes" : "/admin/demandes?archivees=1"}
              className="text-xs text-vea-accent hover:underline font-semibold"
            >
              {showArchived ? "← Voir les demandes actives" : "Voir les archivées →"}
            </Link>
          </div>
        </div>

        {demandes.length === 0 ? (
          <div className="card-clean p-8 text-center">
            <p className="text-sm text-vea-text-muted">Aucune demande pour le moment.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {demandes.map((d) => (
              <Link
                key={d.id}
                href={`/admin/demandes/${d.id}`}
                className="card-clean p-4 flex items-start justify-between gap-4 flex-wrap hover:border-vea-accent/40 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <h3 className="text-sm font-bold text-vea-text">{d.structure_nom}</h3>
                    <span
                      className={`text-[10px] uppercase tracking-widest font-bold px-2 py-0.5 rounded ${STATUT_STYLE[d.statut ?? "nouveau"] ?? "bg-vea-bg text-vea-text-dim"}`}
                    >
                      {d.statut ?? "nouveau"}
                    </span>
                  </div>
                  <p className="text-xs text-vea-text-muted">
                    {d.referent_prenom} {d.referent_nom}
                    {d.pack_envisage ? ` · pack ${d.pack_envisage}` : ""}
                    {d.lieu_ville ? ` · ${d.lieu_ville}` : ""}
                    {d.date_souhaitee
                      ? ` · souhaité le ${new Date(d.date_souhaitee).toLocaleDateString("fr-FR")}`
                      : ""}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-[10px] text-vea-text-dim">
                    reçu le {new Date(d.created_at).toLocaleDateString("fr-FR")}
                  </p>
                  <span className="text-xs text-vea-accent font-semibold">Voir →</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
