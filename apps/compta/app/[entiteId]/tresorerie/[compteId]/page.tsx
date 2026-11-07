/**
 * Contrôle mensuel d'un compte — Server Component (Lot 6, 07/11/2026).
 *
 * Douze lignes par année : ouverture, recettes, dépenses, clôture calculée,
 * solde lu sur le relevé et écart. Règle reprise du CDC Nova : « pour chaque
 * compte et chaque mois, ouverture + recettes − dépenses = clôture ; comparer
 * au relevé ; les mois sans mouvement doivent eux aussi être documentés ».
 *
 * L'année se choisit dans l'URL (?annee=2025). Le calcul est le service pur
 * controleMensuel ; « aujourd'hui » lui est passé en paramètre.
 *
 * Ce contrôle ne VERROUILLE rien encore : la clôture d'exercice (instantané,
 * verrouillage, réouverture motivée) est le lot suivant.
 */
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { listerTransactions } from "@/lib/repositories/transactions";
import { getCompteTresorerie, listerSoldesObserves } from "@/lib/repositories/tresorerie";
import { formaterCentimes } from "@/lib/services/montants";
import { controleMensuel, LIBELLES_NATURE, type EtatMois } from "@/lib/services/tresorerie";
import { FormulaireSoldeInitial } from "@/components/FormulaireSoldeInitial";

const MOIS = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];

const ETATS: Record<EtatMois, { libelle: string; classe: string }> = {
  concorde: { libelle: "Concorde", classe: "text-compta-recette" },
  ecart: { libelle: "Écart", classe: "text-compta-depense font-semibold" },
  non_observe: { libelle: "Relevé à saisir", classe: "text-compta-accent" },
  a_venir: { libelle: "En cours", classe: "text-compta-text-muted" },
  avant_ouverture: { libelle: "Avant ouverture", classe: "text-compta-text-muted" },
  solde_initial_inconnu: { libelle: "Solde initial inconnu", classe: "text-compta-accent" },
};

function montant(c: number | null): string {
  return c === null ? "—" : formaterCentimes(c);
}

export default async function ControleComptePage({
  params,
  searchParams,
}: {
  params: Promise<{ entiteId: string; compteId: string }>;
  searchParams: Promise<{ annee?: string }>;
}) {
  const { entiteId, compteId } = await params;
  const { annee: anneeBrute } = await searchParams;
  const supabase = await createClient();

  const compte = await getCompteTresorerie(supabase, compteId);
  // Compte inconnu, pas à moi (RLS) ou d'une autre entité : 404 neutre.
  if (!compte || compte.entite_id !== entiteId) notFound();

  const [transactions, observations] = await Promise.all([
    listerTransactions(supabase, entiteId),
    listerSoldesObserves(supabase, entiteId),
  ]);

  const aujourdHui = new Date().toISOString().slice(0, 10);
  const anneeCourante = Number(aujourdHui.slice(0, 4));
  const annee = /^\d{4}$/.test(anneeBrute ?? "") ? Number(anneeBrute) : anneeCourante;

  // Années proposées : de la plus ancienne opération du compte à l'année en cours.
  const datesCompte = transactions.filter((t) => t.compte_tresorerie_id === compte.id).map((t) => t.date_transaction);
  const premiere = datesCompte.length ? Number(datesCompte.sort()[0]!.slice(0, 4)) : anneeCourante;
  const annees: number[] = [];
  for (let a = anneeCourante; a >= Math.min(premiere, anneeCourante); a--) annees.push(a);

  const lignes = controleMensuel(compte, transactions, observations, annee, aujourdHui);
  const totalRecettes = lignes.reduce((s, l) => s + l.recettes, 0);
  const totalDepenses = lignes.reduce((s, l) => s + l.depenses, 0);
  const nbEcarts = lignes.filter((l) => l.etat === "ecart").length;
  const nbASaisir = lignes.filter((l) => l.etat === "non_observe").length;

  return (
    <section className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">{compte.nom}</h2>
          <p className="text-sm text-compta-text-muted">
            {LIBELLES_NATURE[compte.nature]} · contrôle mensuel {annee}
          </p>
        </div>
        <Link href={`/${entiteId}/tresorerie`} className="text-sm text-compta-text-muted hover:text-compta-accent">
          ← Trésorerie
        </Link>
      </div>

      <div className="flex flex-wrap gap-2">
        {annees.map((a) => (
          <Link
            key={a}
            href={`/${entiteId}/tresorerie/${compte.id}?annee=${a}`}
            className={`rounded-full border px-3 py-1 text-xs ${
              a === annee ? "border-compta-accent bg-compta-accent text-white" : "border-compta-border text-compta-text-muted hover:border-compta-accent"
            }`}
          >
            {a}
          </Link>
        ))}
      </div>

      {compte.solde_initial_centimes === null && (
        <div className="space-y-3 rounded-lg border border-compta-accent/30 bg-compta-accent/5 p-4 text-sm">
          <p>
            Le <strong>solde initial</strong> de ce compte n&apos;est pas connu : les recettes et dépenses
            de chaque mois s&apos;affichent, mais aucun solde ne peut être calculé ni comparé à un relevé.
            Reprends le solde du premier relevé disponible.
          </p>
          <FormulaireSoldeInitial entiteId={entiteId} compteId={compte.id} />
        </div>
      )}

      <p className="text-sm text-compta-text-muted">
        {nbEcarts > 0 ? `${nbEcarts} mois avec un écart. ` : ""}
        {nbASaisir > 0 ? `${nbASaisir} mois sans relevé saisi. ` : ""}
        Un écart ne se corrige pas en inventant une ligne : retrouve l&apos;opération manquante ou la
        mauvaise lecture du relevé, et note l&apos;explication en commentaire.
      </p>

      <div className="overflow-x-auto rounded-lg border border-compta-border">
        <table className="w-full text-sm">
          <thead className="bg-compta-bg text-left text-xs uppercase text-compta-text-muted">
            <tr>
              <th className="px-3 py-2 font-medium">Mois</th>
              <th className="px-3 py-2 text-right font-medium">Ouverture</th>
              <th className="px-3 py-2 text-right font-medium">Recettes</th>
              <th className="px-3 py-2 text-right font-medium">Dépenses</th>
              <th className="px-3 py-2 text-right font-medium">Clôture</th>
              <th className="px-3 py-2 text-right font-medium">Relevé</th>
              <th className="px-3 py-2 text-right font-medium">Écart</th>
              <th className="px-3 py-2 font-medium">État</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-compta-border bg-compta-surface">
            {lignes.map((l) => (
              <tr key={l.mois}>
                <td className="px-3 py-2">
                  {MOIS[l.mois - 1]}
                  <span className="block text-xs text-compta-text-muted">
                    {l.nbOperations} op.{l.nbNonValidees > 0 ? ` · ${l.nbNonValidees} à traiter` : ""}
                  </span>
                </td>
                <td className="px-3 py-2 text-right tabular-nums">{montant(l.ouverture)}</td>
                <td className="px-3 py-2 text-right tabular-nums text-compta-recette">{formaterCentimes(l.recettes)}</td>
                <td className="px-3 py-2 text-right tabular-nums text-compta-depense">{formaterCentimes(l.depenses)}</td>
                <td className="px-3 py-2 text-right tabular-nums">{montant(l.cloture)}</td>
                <td className="px-3 py-2 text-right tabular-nums">
                  {l.observe ? (
                    <>
                      {formaterCentimes(l.observe.solde)}
                      <span className="block text-xs text-compta-text-muted">au {l.observe.date.slice(8)}/{l.observe.date.slice(5, 7)}</span>
                    </>
                  ) : (
                    "—"
                  )}
                </td>
                <td className={`px-3 py-2 text-right tabular-nums ${l.ecart ? "text-compta-depense" : ""}`}>{montant(l.ecart)}</td>
                <td className={`px-3 py-2 text-xs ${ETATS[l.etat].classe}`}>{ETATS[l.etat].libelle}</td>
              </tr>
            ))}
          </tbody>
          <tfoot className="bg-compta-bg text-sm font-medium">
            <tr>
              <td className="px-3 py-2">Total {annee}</td>
              <td />
              <td className="px-3 py-2 text-right tabular-nums text-compta-recette">{formaterCentimes(totalRecettes)}</td>
              <td className="px-3 py-2 text-right tabular-nums text-compta-depense">{formaterCentimes(totalDepenses)}</td>
              <td colSpan={4} />
            </tr>
          </tfoot>
        </table>
      </div>
    </section>
  );
}
