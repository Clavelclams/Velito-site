/**
 * Écran « Transactions sans justificatif » — Server Component (Bloc 2.4).
 *
 * Utile pour l'audit associatif et le contrôle fiscal : repérer les dépenses
 * dont la pièce manque. On charge les transactions, l'ensemble de celles qui
 * ont au moins un justificatif, et le service pur fait la différence.
 *
 * [07/11/2026] sql/10 (clôture) : une ligne est justifiée par une pièce OU
 * par une exception motivée (10 caractères au moins), saisissable ici. Les
 * virements internes sont dispensés et n'apparaissent plus. ?exercice=2025
 * limite la liste à une année (lien depuis la checklist de clôture).
 */
import Link from "next/link";
import { listerCategories } from "@/lib/repositories/categories";
import { idsAvecPiece, listerLignesJusquAu } from "@/lib/repositories/cloture";
import { exercicesProposes, lignesSansJustification } from "@/lib/services/cloture";
import { formaterCentimes } from "@/lib/services/montants";
import { createClient } from "@/lib/supabase/server";
import { ExceptionJustificatif } from "@/components/ExceptionJustificatif";

function dateFr(iso: string): string {
  return `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;
}

export default async function SansJustificatifPage({
  params,
  searchParams,
}: {
  params: Promise<{ entiteId: string }>;
  searchParams: Promise<{ exercice?: string }>;
}) {
  const { entiteId } = await params;
  const { exercice: brut } = await searchParams;
  const exercice = /^\d{4}$/.test(brut ?? "") ? Number(brut) : null;
  const supabase = await createClient();

  const [lignes, categories] = await Promise.all([
    listerLignesJusquAu(supabase, entiteId, exercice === null ? "9999-12-31" : `${exercice}-12-31`),
    listerCategories(supabase, entiteId, false),
  ]);
  const candidates = lignes.filter((t) => !t.virement_id && (exercice === null || t.date_transaction.startsWith(`${exercice}-`)));
  const avecPiece = await idsAvecPiece(supabase, candidates.map((t) => t.id));
  // Les plus récentes d'abord, comme la liste des transactions.
  const manquantes = lignesSansJustification(candidates, avecPiece, exercice).reverse();

  const nomsCategories = new Map(categories.map((c) => [c.id, c.nom]));
  const aujourdHui = new Date().toISOString().slice(0, 10);
  const annees = exercicesProposes(lignes, aujourdHui);
  const puce = (actif: boolean) =>
    `rounded-full border px-3 py-1 text-xs ${actif ? "border-compta-accent bg-compta-accent text-white" : "border-compta-border text-compta-text-muted hover:border-compta-accent"}`;

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Transactions sans justificatif</h2>
          <p className="mt-1 text-sm text-compta-text-muted">
            {manquantes.length} transaction{manquantes.length > 1 ? "s" : ""} sans pièce jointe ni exception
            {exercice !== null ? ` en ${exercice}` : ""}. Ouvre-en une pour ajouter le ticket ou la facture ; si la
            pièce n&apos;existe pas, explique pourquoi.
          </p>
        </div>
        <Link
          href={`/${entiteId}/transactions`}
          className="text-sm text-compta-text-muted transition-colors hover:text-compta-accent"
        >
          ← Toutes les transactions
        </Link>
      </div>

      <div className="flex flex-wrap gap-2">
        <Link href={`/${entiteId}/transactions/sans-justificatif`} className={puce(exercice === null)}>
          Toutes les années
        </Link>
        {annees.map((a) => (
          <Link key={a} href={`/${entiteId}/transactions/sans-justificatif?exercice=${a}`} className={puce(exercice === a)}>
            {a}
          </Link>
        ))}
      </div>

      {manquantes.length === 0 ? (
        <div className="rounded-lg border border-dashed border-compta-border bg-compta-surface p-6 text-sm text-compta-recette">
          Toutes les transactions ont un justificatif ou une exception motivée.
        </div>
      ) : (
        <ul className="divide-y divide-compta-border rounded-lg border border-compta-border bg-compta-surface">
          {manquantes.map((t) => (
            <li key={t.id} className="space-y-2 px-4 py-3 text-sm">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <Link href={`/${entiteId}/transactions/${t.id}`} className="font-medium hover:text-compta-accent">
                    {t.libelle}
                  </Link>
                  <p className="text-xs text-compta-text-muted">
                    {dateFr(t.date_transaction)} · {t.categorie_id ? nomsCategories.get(t.categorie_id) ?? "Catégorie" : "Sans catégorie"}
                  </p>
                </div>
                <span className={`whitespace-nowrap tabular-nums font-semibold ${t.type === "recette" ? "text-compta-recette" : "text-compta-depense"}`}>
                  {t.type === "recette" ? "+" : "−"}
                  {formaterCentimes(t.montant_ttc_centimes)}
                </span>
              </div>
              <ExceptionJustificatif entiteId={entiteId} transactionId={t.id} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
