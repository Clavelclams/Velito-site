/**
 * /admin/compta — Dashboard trésorerie VEA
 *
 * V1 minimaliste :
 *   - 3 cards stats globales (solde courant, recettes saison, dépenses saison)
 *   - Tableau de la balance par saison (lecture depuis vea.compta_balance_par_saison)
 *   - Tableau des 20 dernières transactions
 *   - Filtres par type + catégorie + saison
 *
 * V2 (plus tard) :
 *   - Graphique recettes/dépenses par mois (Chart.js ou Recharts)
 *   - Export CSV pour le comptable
 *   - Alertes seuils (solde < X €)
 *   - Récap par catégorie (camembert)
 *
 * Permission : hasTreasurerAccess() (owner/editor/treasurer).
 */
import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { hasTreasurerAccess } from "@/lib/supabase/permissions";

export const dynamic = "force-dynamic";

const CATEGORIES = [
  { value: "subvention", label: "Subvention" },
  { value: "cotisation", label: "Cotisation" },
  { value: "prestation", label: "Prestation" },
  { value: "don", label: "Don" },
  { value: "animation", label: "Animation" },
  { value: "materiel", label: "Matériel" },
  { value: "transport", label: "Transport" },
  { value: "restauration", label: "Restauration" },
  { value: "communication", label: "Communication" },
  { value: "frais_bancaires", label: "Frais bancaires" },
  { value: "assurance", label: "Assurance" },
  { value: "autre", label: "Autre" },
];

const STATUTS = [
  { value: "effectue", label: "Effectué", color: "emerald" },
  { value: "planifie", label: "Planifié", color: "amber" },
  { value: "annule", label: "Annulé", color: "gray" },
];

interface PageProps {
  searchParams: Promise<{
    type?: string;
    categorie?: string;
    saison?: string;
    statut?: string;
  }>;
}

interface Transaction {
  id: string;
  date_transaction: string;
  type: string;
  categorie: string;
  montant: number;
  description: string;
  document_id: string | null;
  statut: string;
  saison: string;
}

interface BalanceRow {
  saison: string;
  nb_transactions_effectuees: number;
  recettes: number | null;
  depenses: number | null;
  solde: number;
  recettes_planifiees: number | null;
  depenses_planifiees: number | null;
}

function fmtMontant(n: number | null | undefined): string {
  if (n === null || n === undefined) return "0,00 €";
  return `${Number(n).toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;
}

function statutClasses(statut: string): string {
  const s = STATUTS.find((x) => x.value === statut);
  if (s?.color === "emerald") return "bg-emerald-100 text-emerald-700 border-emerald-200";
  if (s?.color === "amber") return "bg-amber-100 text-amber-700 border-amber-200";
  return "bg-vea-bg text-vea-text-dim border-vea-border";
}

export default async function AdminComptaPage({ searchParams }: PageProps) {
  const canEdit = await hasTreasurerAccess();
  if (!canEdit) redirect("/admin?denied=compta");

  const sp = await searchParams;
  const filterType = sp.type ?? "";
  const filterCategorie = sp.categorie ?? "";
  const filterStatut = sp.statut ?? "";
  const filterSaison = sp.saison ?? "2026/27";

  const supabase = await createClient();

  // Balance par saison (vue agrégée)
  const { data: balancesRaw } = await supabase
    .schema("vea")
    .from("compta_balance_par_saison")
    .select("*")
    .order("saison", { ascending: false });
  const balances = (balancesRaw ?? []) as unknown as BalanceRow[];
  const currentBalance = balances.find((b) => b.saison === filterSaison) ?? balances[0];

  // Transactions filtrées (limité à 20 pour la liste)
  let txQuery = supabase
    .schema("vea")
    .from("compta_transactions")
    .select("id, date_transaction, type, categorie, montant, description, document_id, statut, saison")
    .order("date_transaction", { ascending: false })
    .limit(20);
  if (filterType) txQuery = txQuery.eq("type", filterType);
  if (filterCategorie) txQuery = txQuery.eq("categorie", filterCategorie);
  if (filterStatut) txQuery = txQuery.eq("statut", filterStatut);
  if (filterSaison) txQuery = txQuery.eq("saison", filterSaison);

  const { data: txRaw } = await txQuery;
  const transactions = (txRaw ?? []) as Transaction[];

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
            <span className="badge-red mb-3 inline-block">Admin VEA · Trésorerie</span>
            <h1 className="text-3xl sm:text-4xl font-black text-vea-text mb-2">
              Compta <span className="text-vea-accent">VEA</span>
            </h1>
            <p className="text-sm text-vea-text-muted leading-relaxed max-w-2xl">
              Recettes (subventions, cotisations, prestations) et dépenses
              (animations, matériel, transports). Lien direct vers les
              justificatifs uploadés via Dépôt documents.
            </p>
          </div>
          <Link href="/admin/compta/nouveau" className="btn-primary text-sm shrink-0">
            + Nouvelle transaction
          </Link>
        </div>

        {/* Cards stats saison courante */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
          <div className="card-clean p-5 text-center">
            <div className="text-3xl font-black text-vea-text mb-1">
              {fmtMontant(currentBalance?.solde ?? 0)}
            </div>
            <p className="text-[10px] uppercase tracking-widest text-vea-text-muted">
              Solde {filterSaison}
            </p>
            <p className="text-[9px] text-vea-text-dim mt-1 italic">
              Recettes − dépenses effectuées
            </p>
          </div>
          <div className="card-clean p-5 text-center">
            <div className="text-3xl font-black text-emerald-600 mb-1">
              {fmtMontant(currentBalance?.recettes ?? 0)}
            </div>
            <p className="text-[10px] uppercase tracking-widest text-vea-text-muted">
              Recettes
            </p>
            {Number(currentBalance?.recettes_planifiees ?? 0) > 0 && (
              <p className="text-[9px] text-amber-700 mt-1 italic">
                + {fmtMontant(currentBalance?.recettes_planifiees)} planifiées
              </p>
            )}
          </div>
          <div className="card-clean p-5 text-center">
            <div className="text-3xl font-black text-red-600 mb-1">
              {fmtMontant(currentBalance?.depenses ?? 0)}
            </div>
            <p className="text-[10px] uppercase tracking-widest text-vea-text-muted">
              Dépenses
            </p>
            {Number(currentBalance?.depenses_planifiees ?? 0) > 0 && (
              <p className="text-[9px] text-amber-700 mt-1 italic">
                + {fmtMontant(currentBalance?.depenses_planifiees)} planifiées
              </p>
            )}
          </div>
        </div>

        {/* Balance historique par saison */}
        {balances.length > 0 && (
          <div className="card-clean p-4 mb-6 overflow-x-auto">
            <p className="text-xs font-bold text-vea-text-dim uppercase tracking-widest mb-3">
              Historique par saison
            </p>
            <table className="w-full text-sm min-w-[500px]">
              <thead>
                <tr className="border-b border-vea-border text-left">
                  <th className="py-2 text-vea-text-muted text-xs uppercase tracking-widest">Saison</th>
                  <th className="py-2 text-vea-text-muted text-xs uppercase tracking-widest text-right">Recettes</th>
                  <th className="py-2 text-vea-text-muted text-xs uppercase tracking-widest text-right">Dépenses</th>
                  <th className="py-2 text-vea-text-muted text-xs uppercase tracking-widest text-right">Solde</th>
                </tr>
              </thead>
              <tbody>
                {balances.map((b) => (
                  <tr key={b.saison} className="border-b border-vea-border/30">
                    <td className="py-2 font-bold text-vea-text">{b.saison}</td>
                    <td className="py-2 text-right text-emerald-600">{fmtMontant(b.recettes)}</td>
                    <td className="py-2 text-right text-red-600">{fmtMontant(b.depenses)}</td>
                    <td className={`py-2 text-right font-bold ${Number(b.solde) >= 0 ? "text-vea-text" : "text-red-600"}`}>
                      {fmtMontant(b.solde)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Filtres */}
        <form className="card-clean p-4 mb-4 flex flex-wrap items-center gap-2">
          <span className="text-xs uppercase tracking-widest font-bold text-vea-text-dim">
            Filtres
          </span>
          <select
            name="saison"
            defaultValue={filterSaison}
            className="text-xs px-3 py-1.5 rounded border border-vea-border bg-white text-vea-text"
          >
            {balances.length === 0 && <option value="2026/27">2026/27</option>}
            {balances.map((b) => (
              <option key={b.saison} value={b.saison}>{b.saison}</option>
            ))}
          </select>
          <select
            name="type"
            defaultValue={filterType}
            className="text-xs px-3 py-1.5 rounded border border-vea-border bg-white text-vea-text"
          >
            <option value="">Recette + dépense</option>
            <option value="recette">Recettes</option>
            <option value="depense">Dépenses</option>
          </select>
          <select
            name="categorie"
            defaultValue={filterCategorie}
            className="text-xs px-3 py-1.5 rounded border border-vea-border bg-white text-vea-text"
          >
            <option value="">Toutes catégories</option>
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
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
        </form>

        {/* Liste transactions */}
        {transactions.length === 0 ? (
          <div className="card-clean p-10 text-center">
            <p className="text-sm text-vea-text-muted">
              Aucune transaction pour cette saison / ces filtres.
            </p>
            <Link href="/admin/compta/nouveau" className="btn-primary text-sm mt-4 inline-block">
              Saisir la première
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {transactions.map((t) => {
              const catLabel = CATEGORIES.find((c) => c.value === t.categorie)?.label ?? t.categorie;
              const statutLabel = STATUTS.find((s) => s.value === t.statut)?.label ?? t.statut;
              const sign = t.type === "recette" ? "+" : "−";
              const color = t.type === "recette" ? "text-emerald-600" : "text-red-600";
              return (
                <Link
                  key={t.id}
                  href={`/admin/compta/${t.id}`}
                  className="card-clean p-4 flex items-start justify-between gap-3 hover:border-vea-accent transition-all"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2 mb-1 flex-wrap">
                      <span className="text-[10px] uppercase tracking-widest font-bold px-2 py-0.5 rounded bg-vea-accent-soft text-vea-accent">
                        {catLabel}
                      </span>
                      <span
                        className={`text-[10px] uppercase tracking-widest font-bold px-2 py-0.5 rounded border ${statutClasses(t.statut)}`}
                      >
                        {statutLabel}
                      </span>
                      <span className="text-[10px] text-vea-text-dim">
                        {new Date(t.date_transaction).toLocaleDateString("fr-FR", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </span>
                    </div>
                    <p className="text-sm text-vea-text leading-tight line-clamp-1">{t.description}</p>
                  </div>
                  <div className={`text-lg font-black shrink-0 ${color}`}>
                    {sign} {fmtMontant(Number(t.montant))}
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        <p className="text-[10px] text-vea-text-dim italic mt-6 text-center">
          V1 lecture + saisie. V2 à venir : graphique mois, export CSV, alertes
          seuils, récap par catégorie.
        </p>
      </div>
    </div>
  );
}
