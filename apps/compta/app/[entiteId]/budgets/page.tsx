/**
 * Budgets : prévu contre réalisé d'un exercice (Server Component, 07/11/2026).
 *
 * L'exercice se choisit dans l'URL (?exercice=2026, année civile). Réalisé =
 * opérations de la catégorie sur l'exercice, virements internes exclus, tous
 * statuts confondus (les non validées sont comptées à part). Calculs : service
 * pur budgets ; le prévu se modifie sur la ligne (composant client).
 */
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { listerCategories } from "@/lib/repositories/categories";
import { roleSurEntite } from "@/lib/repositories/membres";
import { bornesAnneesOperations, listerBudgets, listerExercicesBudgetes, listerOperationsBudget } from "@/lib/repositories/budgets";
import { formaterCentimes } from "@/lib/services/montants";
import { EXERCICE_MAX, EXERCICE_MIN, lireExercice, prevuRealise } from "@/lib/services/budgets";
import { BoutonCopierBudget, TableauBudget } from "@/components/TableauBudget";

function montant(c: number | null) {
  return c === null ? "—" : formaterCentimes(c);
}

export default async function BudgetsPage({
  params,
  searchParams,
}: {
  params: Promise<{ entiteId: string }>;
  searchParams: Promise<{ exercice?: string }>;
}) {
  const { entiteId } = await params;
  const { exercice: brut } = await searchParams;
  const anneeCourante = new Date().getFullYear();
  const exercice = lireExercice(brut, anneeCourante);
  const supabase = await createClient();

  const [categories, budgets, operations, role, budgetes, bornes] = await Promise.all([
    listerCategories(supabase, entiteId, false),
    listerBudgets(supabase, entiteId, [exercice]),
    listerOperationsBudget(supabase, entiteId, exercice, exercice),
    roleSurEntite(supabase, entiteId),
    listerExercicesBudgetes(supabase, entiteId),
    bornesAnneesOperations(supabase, entiteId),
  ]);
  const donnees = prevuRealise(categories, budgets, operations, exercice);
  const modifiable = role === "proprietaire" || role === "tresorier";

  // [07/11/2026] Années proposées : celles qui ont des opérations ou un
  // budget, l'année en cours et la suivante (préparer le budget à venir).
  const annees = new Set<number>([anneeCourante, anneeCourante + 1, exercice, ...budgetes]);
  if (bornes) for (let a = bornes.premiere; a <= bornes.derniere; a++) annees.add(a);
  const choix = [...annees].filter((a) => a >= EXERCICE_MIN && a <= EXERCICE_MAX).sort((a, b) => b - a);

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Budget {exercice}</h2>
          <p className="text-sm text-compta-text-muted">
            Prévu contre réalisé par catégorie. Le réalisé compte toutes les opérations de l&apos;année, validées ou
            non, sans les virements internes. Une catégorie sans enveloppe affiche un tiret.
          </p>
        </div>
        <Link
          href={`/${entiteId}/budgets/comparaison`}
          className="rounded-md border border-compta-border px-3 py-1.5 text-sm text-compta-text-muted hover:border-compta-accent hover:text-compta-accent"
        >
          Comparer les années
        </Link>
      </div>

      <div className="flex flex-wrap gap-2">
        {choix.map((a) => (
          <Link
            key={a}
            href={`/${entiteId}/budgets?exercice=${a}`}
            className={`rounded-full border px-3 py-1 text-xs ${
              a === exercice
                ? "border-compta-accent bg-compta-accent text-white"
                : "border-compta-border text-compta-text-muted hover:border-compta-accent"
            }`}
          >
            {a}
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-lg border border-compta-border bg-compta-surface p-4">
          <p className="text-xs uppercase text-compta-text-muted">Solde prévu</p>
          <p className="text-xl font-semibold tabular-nums">{montant(donnees.soldePrevu)}</p>
          <p className="text-xs text-compta-text-muted">Recettes prévues moins dépenses prévues</p>
        </div>
        <div className="rounded-lg border border-compta-border bg-compta-surface p-4">
          <p className="text-xs uppercase text-compta-text-muted">Solde réalisé</p>
          <p
            className={`text-xl font-semibold tabular-nums ${
              donnees.soldeRealise < 0 ? "text-compta-depense" : "text-compta-recette"
            }`}
          >
            {formaterCentimes(donnees.soldeRealise)}
          </p>
          <p className="text-xs text-compta-text-muted">Recettes moins dépenses de l&apos;exercice</p>
        </div>
        <div className="rounded-lg border border-compta-border bg-compta-surface p-4">
          <p className="text-xs uppercase text-compta-text-muted">Opérations non validées</p>
          <p className="text-xl font-semibold tabular-nums">
            {donnees.totaux.recette.nbNonValidees + donnees.totaux.depense.nbNonValidees}
          </p>
          <p className="text-xs text-compta-text-muted">
            Comptées dans le réalisé.{" "}
            <Link href={`/${entiteId}/a-traiter`} className="text-compta-accent hover:underline">
              Les traiter
            </Link>
          </p>
        </div>
      </div>

      {modifiable && (
        <div className="space-y-1">
          <BoutonCopierBudget entiteId={entiteId} exercice={exercice} />
          <p className="text-xs text-compta-text-muted">
            Crée seulement les enveloppes qui manquent en {exercice}, avec les montants de {exercice - 1}. Rien
            d&apos;existant n&apos;est écrasé.
          </p>
        </div>
      )}

      {categories.length === 0 ? (
        <p className="text-sm text-compta-text-muted">
          Aucune catégorie pour l&apos;instant.{" "}
          <Link href={`/${entiteId}/categories`} className="text-compta-accent hover:underline">
            Crée tes catégories
          </Link>{" "}
          pour poser un budget.
        </p>
      ) : (
        <TableauBudget entiteId={entiteId} donnees={donnees} modifiable={modifiable} />
      )}

      {modifiable && (
        <p className="text-xs text-compta-text-muted">
          Tape un montant puis Entrée pour enregistrer le prévu. Vide le champ pour retirer l&apos;enveloppe. Les
          catégories archivées gardent leur historique mais ne se budgètent plus.
        </p>
      )}
    </section>
  );
}
