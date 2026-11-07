/**
 * Bénévolat et contributions en nature — Server Component (07/11/2026).
 *
 * Contributions volontaires en nature : heures de bénévolat valorisées, dons
 * en nature, frais abandonnés. Présentées À PART des comptes (jamais un
 * encaissement). Seules les fiches « Vérifié » comptent dans les totaux.
 * L'exercice se choisit dans l'URL (?exercice=2026).
 */
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getEntite } from "@/lib/repositories/entites";
import { listerContributions } from "@/lib/repositories/subventions";
import { formaterCentimes } from "@/lib/services/montants";
import { LIBELLES_STATUT_CONTRIBUTION, LIBELLES_TYPE_CONTRIBUTION, syntheseContributions } from "@/lib/services/benevolat";
import { ActionsContribution, AjoutContribution, RepriseVea } from "@/components/PanneauBenevolat";
import { peutEcrire } from "@/lib/droits";

function dateFr(iso: string) {
  return `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;
}

function duree(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h} h ${String(m).padStart(2, "0")}` : `${h} h`;
}

export default async function BenevolatPage({
  params,
  searchParams,
}: {
  params: Promise<{ entiteId: string }>;
  searchParams: Promise<{ exercice?: string }>;
}) {
  const { entiteId } = await params;
  const { exercice: brut } = await searchParams;
  const supabase = await createClient();
  const [entite, fiches, ecriture] = await Promise.all([
    getEntite(supabase, entiteId),
    listerContributions(supabase, entiteId),
    peutEcrire(supabase, entiteId),
  ]);

  const anneeCourante = new Date().getFullYear();
  const exercice = /^\d{4}$/.test(brut ?? "") ? Number(brut) : anneeCourante;
  const annees = [...new Set([anneeCourante, ...fiches.map((f) => Number(f.date_contribution.slice(0, 4)))])].sort((a, b) => b - a);
  const syn = syntheseContributions(fiches, exercice);
  const duEx = fiches.filter((f) => f.date_contribution.startsWith(String(exercice)));

  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Bénévolat et contributions en nature</h2>
        <p className="text-sm text-compta-text-muted">
          Valorisées à part des comptes : ce ne sont pas des recettes. Seules les fiches vérifiées comptent.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {annees.map((a) => (
          <Link
            key={a}
            href={`/${entiteId}/benevolat?exercice=${a}`}
            className={`rounded-full border px-3 py-1 text-xs ${
              a === exercice ? "border-compta-accent bg-compta-accent text-white" : "border-compta-border text-compta-text-muted hover:border-compta-accent"
            }`}
          >
            {a}
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          ["Bénévolat", syn.parType.heures_benevoles, `${syn.heures.toLocaleString("fr-FR")} h vérifiées`],
          ["Dons en nature", syn.parType.don_nature, ""],
          ["Frais abandonnés", syn.parType.frais_abandonnes, ""],
          ["Total vérifié", syn.total, syn.aVerifier ? `${syn.aVerifier} fiche(s) à vérifier` : ""],
        ].map(([titre, valeur, note]) => (
          <div key={titre as string} className="rounded-lg border border-compta-border bg-compta-surface p-3">
            <p className="text-xs text-compta-text-muted">{titre}</p>
            <p className="text-lg font-semibold tabular-nums">{formaterCentimes(valeur as number)}</p>
            {note && <p className="text-xs text-compta-text-muted">{note}</p>}
          </div>
        ))}
      </div>

      {entite?.type_juridique === "association" && <RepriseVea entiteId={entiteId} exercice={exercice} lectureSeule={!ecriture} />}

      <div className="overflow-x-auto rounded-lg border border-compta-border">
        <table className="w-full text-sm">
          <thead className="bg-compta-bg text-left text-xs uppercase text-compta-text-muted">
            <tr>
              <th className="px-3 py-2 font-medium">Date</th>
              <th className="px-3 py-2 font-medium">Contribution</th>
              <th className="px-3 py-2 text-right font-medium">Valeur</th>
              <th className="px-3 py-2 font-medium">Statut</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-compta-border bg-compta-surface">
            {duEx.map((f) => (
              <tr key={f.id} className={f.statut === "annule" ? "opacity-50" : ""}>
                <td className="whitespace-nowrap px-3 py-2">{dateFr(f.date_contribution)}</td>
                <td className="px-3 py-2">
                  {f.libelle}
                  <span className="block text-xs text-compta-text-muted">
                    {LIBELLES_TYPE_CONTRIBUTION[f.type]}
                    {f.minutes !== null && ` · ${duree(f.minutes)}`}
                    {f.taux_horaire_centimes !== null && ` à ${formaterCentimes(f.taux_horaire_centimes)}/h`}
                    {f.nb_personnes !== null && ` · ${f.nb_personnes} personne(s)`}
                  </span>
                </td>
                <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums">{formaterCentimes(f.valeur_centimes)}</td>
                <td className="px-3 py-2 text-xs">{LIBELLES_STATUT_CONTRIBUTION[f.statut]}</td>
                <td className="px-3 py-2">
                  <ActionsContribution entiteId={entiteId} id={f.id} statut={f.statut} type={f.type} lectureSeule={!ecriture} />
                </td>
              </tr>
            ))}
            {duEx.length === 0 && (
              <tr>
                <td colSpan={5} className="px-3 py-4 text-center text-compta-text-muted">
                  Aucune fiche pour {exercice}.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* [07/11/2026] Lecteur : ni titre ni formulaire d'ajout. */}
      {ecriture && (
        <div className="space-y-2">
          <h3 className="font-semibold">Ajouter une fiche</h3>
          <AjoutContribution entiteId={entiteId} />
        </div>
      )}
    </section>
  );
}
