/**
 * Tableau de bord d'une entité — Server Component (Bloc 1.6).
 *
 * Charge les transactions + les catégories, calcule les indicateurs via le
 * service (fonctions pures) et les affiche. La page n'agrège rien elle-même :
 * elle appelle le service et met en forme. L'entité est déjà validée par le
 * layout parent.
 */
import Link from "next/link";
import { listerTransactions } from "@/lib/repositories/transactions";
import { listerCategories } from "@/lib/repositories/categories";
import { createClient } from "@/lib/supabase/server";
import { formaterCentimes } from "@/lib/services/montants";
import {
  solde,
  filtrerMois,
  totauxParType,
  repartitionParCategorie,
} from "@/lib/services/tableau-de-bord";
import { RepartitionCategories } from "@/components/RepartitionCategories";

/** Libellé "juillet 2026" pour le mois affiché. */
function libelleMois(annee: number, mois: number): string {
  const noms = [
    "janvier", "février", "mars", "avril", "mai", "juin",
    "juillet", "août", "septembre", "octobre", "novembre", "décembre",
  ];
  return `${noms[mois - 1]} ${annee}`;
}

export default async function TableauDeBordPage({
  params,
}: {
  params: Promise<{ entiteId: string }>;
}) {
  const { entiteId } = await params;
  const supabase = await createClient();

  const [transactions, categories] = await Promise.all([
    listerTransactions(supabase, entiteId),
    listerCategories(supabase, entiteId, false),
  ]);

  const nomsCategories: Record<string, string> = {};
  for (const c of categories) nomsCategories[c.id] = c.nom;

  // Mois en cours (heure serveur).
  const maintenant = new Date();
  const annee = maintenant.getFullYear();
  const mois = maintenant.getMonth() + 1; // getMonth() est 0-indexé

  const soldeGlobal = solde(transactions);
  const txMois = filtrerMois(transactions, annee, mois);
  const totMois = totauxParType(txMois);
  const repartitionDepenses = repartitionParCategorie(
    transactions,
    "depense",
    nomsCategories,
  );

  if (transactions.length === 0) {
    return (
      <section>
        <div className="rounded-lg border border-dashed border-compta-border bg-compta-surface p-6 text-sm text-compta-text-muted">
          Pas encore de données. Saisis ta première{" "}
          <Link
            href={`/${entiteId}/transactions/nouvelle`}
            className="font-medium text-compta-accent hover:underline"
          >
            transaction
          </Link>{" "}
          pour voir apparaître ton solde et tes indicateurs.
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-8">
      {/* ---- Cartes d'indicateurs ---- */}
      <div className="grid gap-4 sm:grid-cols-3">
        {/* Solde global */}
        <div className="rounded-lg border border-compta-border bg-compta-surface p-5">
          <p className="text-sm text-compta-text-muted">Solde</p>
          <p
            className={`mt-1 text-2xl font-bold tabular-nums ${
              soldeGlobal >= 0 ? "text-compta-recette" : "text-compta-depense"
            }`}
          >
            {formaterCentimes(soldeGlobal)}
          </p>
          <p className="mt-1 text-xs text-compta-text-muted">
            recettes − dépenses, tout l&apos;historique
          </p>
        </div>

        {/* Recettes du mois */}
        <div className="rounded-lg border border-compta-border bg-compta-surface p-5">
          <p className="text-sm text-compta-text-muted">
            Recettes · {libelleMois(annee, mois)}
          </p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-compta-recette">
            {formaterCentimes(totMois.recettes)}
          </p>
        </div>

        {/* Dépenses du mois */}
        <div className="rounded-lg border border-compta-border bg-compta-surface p-5">
          <p className="text-sm text-compta-text-muted">
            Dépenses · {libelleMois(annee, mois)}
          </p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-compta-depense">
            {formaterCentimes(totMois.depenses)}
          </p>
        </div>
      </div>

      {/* ---- Répartition des dépenses ---- */}
      <RepartitionCategories
        titre="Répartition des dépenses (tout l'historique)"
        lignes={repartitionDepenses}
        couleurBarre="bg-compta-depense"
      />
    </section>
  );
}
