/**
 * /admin/rapports — Liste filtrable des rapports / PV / convocations
 *
 * Server Component avec filtres URL (type + statut).
 * Permission editor+ pour voir tout. Le redacteur voit ses propres brouillons
 * meme s'il n'est pas editor (cas marginal mais geré par RLS).
 */
import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { hasPermission } from "@/lib/supabase/permissions";

export const dynamic = "force-dynamic";

const TYPES = [
  { value: "PV_CA", label: "PV de CA" },
  { value: "PV_AG", label: "PV d'AG" },
  { value: "convocation", label: "Convocation" },
  { value: "rapport_activite", label: "Rapport d'activité" },
  { value: "CR_reunion", label: "CR de réunion" },
  { value: "autre", label: "Autre" },
];

const STATUTS = [
  { value: "brouillon", label: "Brouillon", color: "gray" },
  { value: "valide", label: "Validé", color: "amber" },
  { value: "publie", label: "Publié", color: "emerald" },
  { value: "archive", label: "Archivé", color: "neutral" },
];

interface PageProps {
  searchParams: Promise<{ type?: string; statut?: string }>;
}

interface RapportRow {
  id: string;
  type: string;
  titre: string;
  date_reunion: string;
  redacteur_id: string;
  statut: string;
  created_at: string;
  updated_at: string;
}

function statutClasses(statut: string): string {
  const s = STATUTS.find((x) => x.value === statut);
  if (s?.color === "emerald") return "bg-emerald-100 text-emerald-700 border-emerald-200";
  if (s?.color === "amber") return "bg-amber-100 text-amber-700 border-amber-200";
  if (s?.color === "gray") return "bg-vea-bg text-vea-text-dim border-vea-border";
  return "bg-vea-bg text-vea-text-dim border-vea-border";
}

export default async function AdminRapportsPage({ searchParams }: PageProps) {
  const canEdit = await hasPermission("vea", "editor");
  if (!canEdit) redirect("/admin?denied=rapports");

  const sp = await searchParams;
  const filterType = sp.type ?? "";
  const filterStatut = sp.statut ?? "";

  const supabase = await createClient();

  let query = supabase
    .schema("vea")
    .from("rapports")
    .select("id, type, titre, date_reunion, redacteur_id, statut, created_at, updated_at")
    .order("date_reunion", { ascending: false });

  if (filterType) query = query.eq("type", filterType);
  if (filterStatut) query = query.eq("statut", filterStatut);

  const { data: rapportsRaw } = await query;
  const rapports = (rapportsRaw ?? []) as RapportRow[];

  // Stats globales
  const { data: statsRaw } = await supabase
    .schema("vea")
    .from("rapports")
    .select("statut");
  const stats = {
    total: statsRaw?.length ?? 0,
    brouillon: statsRaw?.filter((r) => r.statut === "brouillon").length ?? 0,
    valide: statsRaw?.filter((r) => r.statut === "valide").length ?? 0,
    publie: statsRaw?.filter((r) => r.statut === "publie").length ?? 0,
  };

  return (
    <div className="min-h-screen bg-vea-bg pt-28 pb-20 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="mb-6">
          <Link href="/admin" className="text-xs text-vea-text-dim hover:text-vea-accent">
            ← Retour /admin
          </Link>
        </div>

        <div className="mb-8 flex items-start justify-between gap-4 flex-wrap">
          <div>
            <span className="badge-red mb-3 inline-block">Admin VEA</span>
            <h1 className="text-3xl sm:text-4xl font-black text-vea-text mb-2">
              Rapports & <span className="text-vea-accent">Réunions</span>
            </h1>
            <p className="text-sm text-vea-text-muted leading-relaxed max-w-2xl">
              PV de CA, PV d&apos;AG, convocations, rapports d&apos;activité,
              CR de réunion. Rédaction en Markdown directement dans le site,
              workflow brouillon → validé → publié.
            </p>
          </div>
          <Link href="/admin/rapports/nouveau" className="btn-primary text-sm shrink-0">
            + Nouveau rapport
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <div className="card-clean p-4 text-center">
            <div className="text-2xl font-black text-vea-text">{stats.total}</div>
            <p className="text-[10px] uppercase tracking-widest text-vea-text-muted mt-1">Total</p>
          </div>
          <div className="card-clean p-4 text-center">
            <div className="text-2xl font-black text-vea-text-dim">{stats.brouillon}</div>
            <p className="text-[10px] uppercase tracking-widest text-vea-text-muted mt-1">Brouillons</p>
          </div>
          <div className="card-clean p-4 text-center">
            <div className="text-2xl font-black text-amber-600">{stats.valide}</div>
            <p className="text-[10px] uppercase tracking-widest text-vea-text-muted mt-1">Validés</p>
          </div>
          <div className="card-clean p-4 text-center">
            <div className="text-2xl font-black text-emerald-600">{stats.publie}</div>
            <p className="text-[10px] uppercase tracking-widest text-vea-text-muted mt-1">Publiés</p>
          </div>
        </div>

        {/* Filtres */}
        <form className="card-clean p-4 mb-6 flex flex-wrap items-center gap-3">
          <span className="text-xs uppercase tracking-widest font-bold text-vea-text-dim">
            Filtres
          </span>
          <select
            name="type"
            defaultValue={filterType}
            className="text-xs px-3 py-1.5 rounded border border-vea-border bg-white text-vea-text"
          >
            <option value="">Tous types</option>
            {TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
          <select
            name="statut"
            defaultValue={filterStatut}
            className="text-xs px-3 py-1.5 rounded border border-vea-border bg-white text-vea-text"
          >
            <option value="">Tous statuts</option>
            {STATUTS.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
          <button
            type="submit"
            className="text-[10px] uppercase tracking-widest font-bold px-3 py-1.5 rounded-full bg-vea-accent text-white hover:bg-vea-accent-hover transition-colors"
          >
            Filtrer
          </button>
          {(filterType || filterStatut) && (
            <Link
              href="/admin/rapports"
              className="text-[10px] uppercase tracking-widest font-bold px-3 py-1.5 rounded-full border border-vea-border text-vea-text-dim hover:border-vea-accent hover:text-vea-accent transition-colors"
            >
              Reset
            </Link>
          )}
        </form>

        {/* Liste */}
        {rapports.length === 0 ? (
          <div className="card-clean p-10 text-center">
            <p className="text-sm text-vea-text-muted">
              {filterType || filterStatut
                ? "Aucun rapport ne correspond aux filtres."
                : "Aucun rapport pour le moment."}
            </p>
            <Link href="/admin/rapports/nouveau" className="btn-primary text-sm mt-4 inline-block">
              Rédiger le premier
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {rapports.map((r) => {
              const typeLabel = TYPES.find((t) => t.value === r.type)?.label ?? r.type;
              const statutLabel = STATUTS.find((s) => s.value === r.statut)?.label ?? r.statut;
              return (
                <Link
                  key={r.id}
                  href={`/admin/rapports/${r.id}`}
                  className="card-clean p-4 flex items-start justify-between gap-3 hover:border-vea-accent transition-all"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2 mb-1 flex-wrap">
                      <span className="text-[10px] uppercase tracking-widest font-bold px-2 py-0.5 rounded bg-vea-accent-soft text-vea-accent">
                        {typeLabel}
                      </span>
                      <span
                        className={`text-[10px] uppercase tracking-widest font-bold px-2 py-0.5 rounded border ${statutClasses(r.statut)}`}
                      >
                        {statutLabel}
                      </span>
                      <span className="text-[10px] text-vea-text-dim">
                        {new Date(r.date_reunion).toLocaleDateString("fr-FR", {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        })}
                      </span>
                    </div>
                    <p className="text-sm font-bold text-vea-text leading-tight">{r.titre}</p>
                    <p className="text-[10px] text-vea-text-dim mt-1 italic">
                      Mis à jour le{" "}
                      {new Date(r.updated_at).toLocaleDateString("fr-FR", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                  <span className="text-vea-text-dim text-lg shrink-0">→</span>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
