/**
 * /admin/demandes — Liste des demandes de devis (prestations VEA).
 * [16/10/2026] + candidatures de stage (type 'stage', page /stages), avec
 * onglets Tous / Devis / Stages.
 *
 * Source : vea.demandes_prestation. Réservé éditeurs+ VEA.
 * C'est la cible des notifications cloche "Nouvelle demande de devis".
 */
import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { hasPermission } from "@/lib/supabase/permissions";

export const dynamic = "force-dynamic";

// [16/10/2026] Clés alignées sur le CHECK SQL (avant : "traite" et "archive",
// qui n'existent pas en base, donc devis_envoye, accepte et annule n'avaient
// jamais de couleur).
const STATUT_STYLE: Record<string, string> = {
  nouveau: "bg-vea-accent text-white",
  en_cours: "bg-blue-100 text-blue-700",
  devis_envoye: "bg-amber-100 text-amber-800",
  accepte: "bg-emerald-100 text-emerald-700",
  refuse: "bg-zinc-200 text-zinc-600",
  annule: "bg-vea-bg text-vea-text-dim",
};

const STATUT_LABEL: Record<string, string> = {
  nouveau: "nouveau",
  en_cours: "en cours",
  devis_envoye: "devis envoyé",
  accepte: "accepté",
  refuse: "refusé",
  annule: "archivé",
};

// [16/10/2026] Onglets par type de demande (?type=devis | stage, rien = tous).
const ONGLETS = [
  { value: "", label: "Tous" },
  { value: "devis", label: "Devis" },
  { value: "stage", label: "Stages" },
];

export default async function AdminDemandesPage({
  searchParams,
}: {
  searchParams: Promise<{ archivees?: string; type?: string }>;
}) {
  const { archivees, type } = await searchParams;
  const showArchived = archivees === "1";
  const filtreType = type === "devis" || type === "stage" ? type : "";

  // Construit un lien qui garde les autres filtres de l'URL.
  const lien = (params: { archivees?: boolean; type?: string }) => {
    const sp = new URLSearchParams();
    if (params.archivees ?? showArchived) sp.set("archivees", "1");
    const t = params.type ?? filtreType;
    if (t) sp.set("type", t);
    const s = sp.toString();
    return s ? `/admin/demandes?${s}` : "/admin/demandes";
  };

  const canEdit = await hasPermission("vea", "editor");
  if (!canEdit) redirect("/admin?denied=demandes");

  const supabase = await createClient();
  let query = supabase
    .schema("vea")
    .from("demandes_prestation")
    .select(
      "id, type, structure_nom, referent_prenom, referent_nom, pack_envisage, date_souhaitee, lieu_ville, email, statut, created_at, formation, etablissement, stage_debut, stage_fin, chevauche_periode_prise",
    )
    .order("created_at", { ascending: false });
  // Par défaut on cache les archivées (statut 'annule') ; ?archivees=1 les montre.
  query = showArchived ? query.eq("statut", "annule") : query.neq("statut", "annule");
  if (filtreType) query = query.eq("type", filtreType);
  const { data } = await query;

  type Row = {
    id: string;
    type: string;
    structure_nom: string | null;
    formation: string | null;
    etablissement: string | null;
    stage_debut: string | null;
    stage_fin: string | null;
    chevauche_periode_prise: boolean | null;
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
            <span className="text-vea-accent">Demandes</span>
          </h1>
          <p className="text-sm text-vea-text-muted">
            {demandes.length} demande{demandes.length > 1 ? "s" : ""} au total
            {nouvelles > 0 && (
              <> · <strong className="text-vea-accent">{nouvelles} nouvelle{nouvelles > 1 ? "s" : ""}</strong></>
            )}
            . Devis : réponse annoncée sous 48-72h.
          </p>
          <nav aria-label="Filtrer par type" className="mt-4 flex gap-2 flex-wrap">
            {ONGLETS.map((o) => (
              <Link
                key={o.value}
                href={lien({ type: o.value })}
                aria-current={filtreType === o.value ? "page" : undefined}
                className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-colors ${
                  filtreType === o.value
                    ? "bg-vea-accent text-white border-vea-accent"
                    : "border-vea-border text-vea-text-muted hover:border-vea-accent/40"
                }`}
              >
                {o.label}
              </Link>
            ))}
          </nav>
          <div className="mt-3">
            <Link
              href={lien({ archivees: !showArchived })}
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
                    <span className="text-[10px] uppercase tracking-widest font-bold px-2 py-0.5 rounded border border-vea-border text-vea-text-muted">
                      {d.type === "stage" ? "stage" : "devis"}
                    </span>
                    <h3 className="text-sm font-bold text-vea-text">
                      {d.type === "stage" ? `${d.referent_prenom} ${d.referent_nom}` : d.structure_nom}
                    </h3>
                    <span
                      className={`text-[10px] uppercase tracking-widest font-bold px-2 py-0.5 rounded ${STATUT_STYLE[d.statut ?? "nouveau"] ?? "bg-vea-bg text-vea-text-dim"}`}
                    >
                      {STATUT_LABEL[d.statut ?? "nouveau"] ?? d.statut}
                    </span>
                    {d.type === "stage" && d.chevauche_periode_prise && (
                      <span className="text-[10px] uppercase tracking-widest font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-800">
                        période prise
                      </span>
                    )}
                  </div>
                  {d.type === "stage" ? (
                    <p className="text-xs text-vea-text-muted">
                      {d.formation}
                      {d.etablissement ? ` · ${d.etablissement}` : ""}
                      {d.stage_debut && d.stage_fin
                        ? ` · du ${new Date(d.stage_debut).toLocaleDateString("fr-FR")} au ${new Date(d.stage_fin).toLocaleDateString("fr-FR")}`
                        : ""}
                    </p>
                  ) : (
                    <p className="text-xs text-vea-text-muted">
                      {d.referent_prenom} {d.referent_nom}
                      {d.pack_envisage ? ` · pack ${d.pack_envisage}` : ""}
                      {d.lieu_ville ? ` · ${d.lieu_ville}` : ""}
                      {d.date_souhaitee
                        ? ` · souhaité le ${new Date(d.date_souhaitee).toLocaleDateString("fr-FR")}`
                        : ""}
                    </p>
                  )}
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
