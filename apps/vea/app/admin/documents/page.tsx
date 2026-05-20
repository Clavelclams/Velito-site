/**
 * /admin/documents — Liste filtrable des documents uploadés
 *
 * Permission editor+ sur vea.
 *
 * Pour l'instant V1 :
 *   - Liste tous les documents triés par created_at DESC
 *   - Filtres par type + statut (via searchParams)
 *   - Affiche uploader + participant concerné + lien vers détail
 *
 * V2 plus tard :
 *   - Recherche full-text
 *   - Filtre par dates
 *   - Bulk actions (valider plusieurs d'un coup)
 *   - Stats (€ total non-validé, etc.)
 */
import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { hasPermission } from "@/lib/supabase/permissions";

export const dynamic = "force-dynamic";

const TYPES = [
  { value: "ticket", label: "Ticket" },
  { value: "facture", label: "Facture" },
  { value: "justificatif", label: "Justificatif" },
  { value: "peage", label: "Péage" },
  { value: "courrier", label: "Courrier" },
  { value: "contrat", label: "Contrat" },
  { value: "autre", label: "Autre" },
];

const STATUTS = [
  { value: "en_attente", label: "En attente", color: "amber" },
  { value: "valide", label: "Validé", color: "emerald" },
  { value: "rejete", label: "Rejeté", color: "red" },
  { value: "archive", label: "Archivé", color: "gray" },
];

interface PageProps {
  searchParams: Promise<{ type?: string; statut?: string }>;
}

interface DocumentRow {
  id: string;
  nom: string;
  type: string;
  participant_id: string | null;
  uploader_id: string;
  mime_type: string;
  taille_octets: number;
  statut: string;
  created_at: string;
  participants: { prenom: string; nom: string; est_mineur: boolean | null } | null;
}

function displayName(p: { prenom: string; nom: string; est_mineur: boolean | null } | null): string {
  if (!p) return "—";
  if (p.est_mineur) {
    const initiale = (p.nom ?? "").trim().charAt(0).toUpperCase();
    return `${p.prenom} ${initiale}.`;
  }
  return `${p.prenom} ${p.nom}`;
}

function formatBytes(octets: number): string {
  if (octets < 1024) return `${octets} o`;
  if (octets < 1024 * 1024) return `${(octets / 1024).toFixed(1)} Ko`;
  return `${(octets / (1024 * 1024)).toFixed(1)} Mo`;
}

function statutBadgeClasses(statut: string): string {
  const found = STATUTS.find((s) => s.value === statut);
  if (!found) return "bg-vea-bg text-vea-text-dim border-vea-border";
  switch (found.color) {
    case "amber":
      return "bg-amber-100 text-amber-700 border-amber-200";
    case "emerald":
      return "bg-emerald-100 text-emerald-700 border-emerald-200";
    case "red":
      return "bg-red-100 text-red-700 border-red-200";
    default:
      return "bg-vea-bg text-vea-text-dim border-vea-border";
  }
}

export default async function AdminDocumentsPage({ searchParams }: PageProps) {
  const canEdit = await hasPermission("vea", "editor");
  if (!canEdit) redirect("/admin?denied=documents");

  const sp = await searchParams;
  const filterType = sp.type ?? "";
  const filterStatut = sp.statut ?? "";

  const supabase = await createClient();

  let query = supabase
    .schema("vea")
    .from("documents")
    .select(
      "id, nom, type, participant_id, uploader_id, mime_type, taille_octets, statut, created_at, participants(prenom, nom, est_mineur)"
    )
    .order("created_at", { ascending: false });

  if (filterType) query = query.eq("type", filterType);
  if (filterStatut) query = query.eq("statut", filterStatut);

  const { data: documentsRaw } = await query;
  const documents = (documentsRaw ?? []) as unknown as DocumentRow[];

  // Stats globales (avant filtre)
  const { data: statsRaw } = await supabase
    .schema("vea")
    .from("documents")
    .select("statut");
  const stats = {
    total: statsRaw?.length ?? 0,
    en_attente: statsRaw?.filter((d) => d.statut === "en_attente").length ?? 0,
    valide: statsRaw?.filter((d) => d.statut === "valide").length ?? 0,
    rejete: statsRaw?.filter((d) => d.statut === "rejete").length ?? 0,
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
              Dépôt <span className="text-vea-accent">documents</span>
            </h1>
            <p className="text-sm text-vea-text-muted leading-relaxed max-w-2xl">
              Tickets, factures, justificatifs, péages, courriers. Une fois
              uploadé, un dirigeant doit valider pour traitement (remboursement,
              archivage, etc.).
            </p>
          </div>
          <Link href="/admin/documents/nouveau" className="btn-primary text-sm shrink-0">
            + Uploader un document
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <div className="card-clean p-4 text-center">
            <div className="text-2xl font-black text-vea-text">{stats.total}</div>
            <p className="text-[10px] uppercase tracking-widest text-vea-text-muted mt-1">
              Total
            </p>
          </div>
          <div className="card-clean p-4 text-center">
            <div className="text-2xl font-black text-amber-600">{stats.en_attente}</div>
            <p className="text-[10px] uppercase tracking-widest text-vea-text-muted mt-1">
              En attente
            </p>
          </div>
          <div className="card-clean p-4 text-center">
            <div className="text-2xl font-black text-emerald-600">{stats.valide}</div>
            <p className="text-[10px] uppercase tracking-widest text-vea-text-muted mt-1">
              Validés
            </p>
          </div>
          <div className="card-clean p-4 text-center">
            <div className="text-2xl font-black text-red-600">{stats.rejete}</div>
            <p className="text-[10px] uppercase tracking-widest text-vea-text-muted mt-1">
              Rejetés
            </p>
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
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
          <select
            name="statut"
            defaultValue={filterStatut}
            className="text-xs px-3 py-1.5 rounded border border-vea-border bg-white text-vea-text"
          >
            <option value="">Tous statuts</option>
            {STATUTS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
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
              href="/admin/documents"
              className="text-[10px] uppercase tracking-widest font-bold px-3 py-1.5 rounded-full border border-vea-border text-vea-text-dim hover:border-vea-accent hover:text-vea-accent transition-colors"
            >
              Reset
            </Link>
          )}
        </form>

        {/* Liste */}
        {documents.length === 0 ? (
          <div className="card-clean p-10 text-center">
            <p className="text-sm text-vea-text-muted">
              {filterType || filterStatut
                ? "Aucun document ne correspond aux filtres."
                : "Aucun document uploadé pour le moment."}
            </p>
            <Link href="/admin/documents/nouveau" className="btn-primary text-sm mt-4 inline-block">
              Uploader le premier
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {documents.map((d) => {
              const typeLabel = TYPES.find((t) => t.value === d.type)?.label ?? d.type;
              const statutLabel = STATUTS.find((s) => s.value === d.statut)?.label ?? d.statut;
              return (
                <Link
                  key={d.id}
                  href={`/admin/documents/${d.id}`}
                  className="card-clean p-4 flex items-start justify-between gap-3 hover:border-vea-accent transition-all"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2 mb-1 flex-wrap">
                      <span className="text-[10px] uppercase tracking-widest font-bold px-2 py-0.5 rounded bg-vea-accent-soft text-vea-accent">
                        {typeLabel}
                      </span>
                      <span
                        className={`text-[10px] uppercase tracking-widest font-bold px-2 py-0.5 rounded border ${statutBadgeClasses(d.statut)}`}
                      >
                        {statutLabel}
                      </span>
                    </div>
                    <p className="text-sm font-bold text-vea-text leading-tight">{d.nom}</p>
                    <p className="text-xs text-vea-text-muted mt-1">
                      {d.participants && (
                        <>
                          Concerne <strong>{displayName(d.participants)}</strong> ·{" "}
                        </>
                      )}
                      {formatBytes(d.taille_octets)} ·{" "}
                      {new Date(d.created_at).toLocaleDateString("fr-FR", {
                        day: "numeric",
                        month: "long",
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
