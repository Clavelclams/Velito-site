/**
 * Budgets : comparaison annuelle du réalisé (Server Component, 07/11/2026).
 *
 * ?annees=2023,2024,2025 : une ligne par catégorie (même nomenclature), une
 * colonne par année. Une année où la structure n'a aucune opération affiche
 * « — » sur toute la colonne, jamais 0. Les catégories archivées gardent leurs
 * montants. Choix des années par un simple formulaire GET (sans JavaScript).
 */
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { listerCategories } from "@/lib/repositories/categories";
import { bornesAnneesOperations, listerOperationsBudget } from "@/lib/repositories/budgets";
import { formaterCentimes } from "@/lib/services/montants";
import {
  comparaisonAnnuelle,
  EXERCICE_MAX,
  EXERCICE_MIN,
  LIBELLES_SENS,
  lireAnnees,
  type LigneComparaison,
} from "@/lib/services/budgets";

function montant(c: number | null) {
  return c === null ? "—" : formaterCentimes(c);
}

function Lignes({ titre, lignes, totaux }: { titre: string; lignes: LigneComparaison[]; totaux: (number | null)[] }) {
  return (
    <>
      <tr className="bg-compta-bg">
        <td colSpan={totaux.length + 1} className="px-3 py-2 text-xs font-semibold uppercase text-compta-text-muted">
          {titre}
        </td>
      </tr>
      {lignes.map((l) => (
        <tr key={l.categorieId ?? `sans-${l.sens}`}>
          <td className="px-3 py-2">
            <span className={l.categorieId === null ? "italic text-compta-text-muted" : ""}>{l.nom}</span>
            {!l.active && <span className="ml-2 text-xs text-compta-text-muted">archivée</span>}
          </td>
          {l.montants.map((m, i) => (
            <td key={i} className="px-3 py-2 text-right tabular-nums">
              {montant(m)}
            </td>
          ))}
        </tr>
      ))}
      <tr className="font-semibold">
        <td className="px-3 py-2">Total {titre.toLowerCase()}</td>
        {totaux.map((m, i) => (
          <td key={i} className="px-3 py-2 text-right tabular-nums">
            {montant(m)}
          </td>
        ))}
      </tr>
    </>
  );
}

export default async function ComparaisonBudgetsPage({
  params,
  searchParams,
}: {
  params: Promise<{ entiteId: string }>;
  searchParams: Promise<{ annees?: string | string[] }>;
}) {
  const { entiteId } = await params;
  const { annees: brut } = await searchParams;
  const anneeCourante = new Date().getFullYear();
  const annees = lireAnnees(brut, anneeCourante);
  const supabase = await createClient();

  const [categories, operations, bornes] = await Promise.all([
    listerCategories(supabase, entiteId, false),
    listerOperationsBudget(supabase, entiteId, annees[0]!, annees[annees.length - 1]!),
    bornesAnneesOperations(supabase, entiteId),
  ]);
  const comp = comparaisonAnnuelle(categories, operations, annees);

  // Années proposées : de la première opération à l'année en cours, plus celles demandées.
  const proposees = new Set<number>([anneeCourante, ...annees]);
  if (bornes) for (let a = bornes.premiere; a <= Math.max(bornes.derniere, anneeCourante); a++) proposees.add(a);
  const choix = [...proposees].filter((a) => a >= EXERCICE_MIN && a <= EXERCICE_MAX).sort((a, b) => a - b);
  const lienCsv = `/${entiteId}/budgets/comparaison/csv?annees=${annees.join(",")}`;

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Comparaison annuelle</h2>
          <p className="text-sm text-compta-text-muted">
            Réalisé par catégorie et par année, sans les virements internes. Une année sans aucune opération
            affiche un tiret, jamais 0.
          </p>
        </div>
        <Link
          href={`/${entiteId}/budgets`}
          className="rounded-md border border-compta-border px-3 py-1.5 text-sm text-compta-text-muted hover:border-compta-accent hover:text-compta-accent"
        >
          Retour au budget
        </Link>
      </div>

      <form method="get" className="flex flex-wrap items-center gap-3 rounded-lg border border-compta-border bg-compta-surface p-3">
        <span className="text-xs font-medium text-compta-text-muted">Années à comparer</span>
        {choix.map((a) => (
          <label key={a} className="flex items-center gap-1 text-sm">
            <input type="checkbox" name="annees" value={a} defaultChecked={annees.includes(a)} className="accent-compta-accent" />
            {a}
          </label>
        ))}
        <button
          type="submit"
          className="rounded-md bg-compta-accent px-3 py-1.5 text-sm font-medium text-white hover:bg-compta-accent-hover"
        >
          Comparer
        </button>
        <a href={lienCsv} className="text-sm text-compta-accent hover:underline">
          Télécharger le CSV
        </a>
      </form>

      {comp.anneesAbsentes.length > 0 && (
        <p className="text-sm text-compta-text-muted">
          Aucune opération en {comp.anneesAbsentes.join(", ")} : la colonne reste vide plutôt que d&apos;afficher un
          résultat nul.
        </p>
      )}

      <div className="overflow-x-auto rounded-lg border border-compta-border">
        <table className="w-full text-sm">
          <thead className="bg-compta-bg text-left text-xs uppercase text-compta-text-muted">
            <tr>
              <th className="px-3 py-2 font-medium">Catégorie</th>
              {comp.annees.map((a) => (
                <th key={a} className="px-3 py-2 text-right font-medium">
                  <Link href={`/${entiteId}/budgets?exercice=${a}`} className="hover:text-compta-accent">
                    {a}
                  </Link>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-compta-border bg-compta-surface">
            <Lignes titre={LIBELLES_SENS.recette} lignes={comp.recettes} totaux={comp.totaux.recette} />
            <Lignes titre={LIBELLES_SENS.depense} lignes={comp.depenses} totaux={comp.totaux.depense} />
          </tbody>
          <tfoot className="bg-compta-bg font-semibold">
            <tr>
              <td className="px-3 py-2">Résultat (recettes moins dépenses)</td>
              {comp.resultat.map((r, i) => (
                <td
                  key={i}
                  className={`px-3 py-2 text-right tabular-nums ${
                    r === null ? "" : r < 0 ? "text-compta-depense" : "text-compta-recette"
                  }`}
                >
                  {montant(r)}
                </td>
              ))}
            </tr>
          </tfoot>
        </table>
      </div>
    </section>
  );
}
