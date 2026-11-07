/**
 * Pointage d'un compte sur ses relevés — Server Component (07/11/2026).
 *
 * Le mois se choisit dans l'URL (?mois=2025-03). On liste les lignes du
 * compte pour ce mois ; chacune se pointe (date du relevé + référence) ou se
 * dépointe. Si le relevé du mois CONCORDE (contrôle mensuel), un bouton pointe
 * d'un coup toutes les lignes datées au plus tard de ce relevé.
 *
 * Le pointage n'est exigé à la clôture que pour un compte courant ou un
 * livret ; pour une caisse, le comptage suffit.
 */
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCompteTresorerie, listerSoldesObserves } from "@/lib/repositories/tresorerie";
import { estExerciceCloture, listerLignesJusquAu } from "@/lib/repositories/cloture";
import { roleSurEntite } from "@/lib/repositories/membres";
import { formaterCentimes } from "@/lib/services/montants";
import { controleMensuel, finDeMois, LIBELLES_NATURE } from "@/lib/services/tresorerie";
import { estCompteBancaire, estMoisValide, estPointee, lignesAPointerDuMois, referenceReleve } from "@/lib/services/cloture";
import { BoutonPointerMois, LignePointage } from "@/components/PointageLigne";

const MOIS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];

function dateFr(iso: string): string {
  return `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;
}

function decaler(mois: string, delta: number): string {
  const d = new Date(Date.UTC(Number(mois.slice(0, 4)), Number(mois.slice(5, 7)) - 1 + delta, 1));
  return d.toISOString().slice(0, 7);
}

export default async function PointagePage({
  params,
  searchParams,
}: {
  params: Promise<{ entiteId: string; compteId: string }>;
  searchParams: Promise<{ mois?: string }>;
}) {
  const { entiteId, compteId } = await params;
  const { mois: brut } = await searchParams;
  const supabase = await createClient();

  const compte = await getCompteTresorerie(supabase, compteId);
  // Compte inconnu, pas à moi (RLS) ou d'une autre entité : 404 neutre.
  if (!compte || compte.entite_id !== entiteId) notFound();

  const aujourdHui = new Date().toISOString().slice(0, 10);
  const mois = estMoisValide(brut ?? "") ? (brut as string) : decaler(aujourdHui.slice(0, 7), -1);
  const annee = Number(mois.slice(0, 4));
  const numero = Number(mois.slice(5, 7));

  const [lignes, observations, cloture, role] = await Promise.all([
    listerLignesJusquAu(supabase, entiteId, finDeMois(annee, numero)),
    listerSoldesObserves(supabase, entiteId),
    estExerciceCloture(supabase, entiteId, annee),
    roleSurEntite(supabase, entiteId),
  ]);
  const lectureSeule = cloture || role === "lecteur";

  const controle = controleMensuel(compte, lignes, observations, annee, aujourdHui)[numero - 1]!;
  const duMois = lignes.filter((t) => t.compte_tresorerie_id === compte.id && t.date_transaction.startsWith(mois));
  const nbPointees = duMois.filter(estPointee).length;
  const lot = lignesAPointerDuMois(lignes, compte.id, mois, controle);

  // Proposition par défaut : le relevé du mois s'il est saisi, sinon la fin du mois.
  const dateProposee = controle.observe?.date ?? finDeMois(annee, numero);
  const referenceProposee = referenceReleve(dateProposee, controle.observe?.reference ?? null);

  return (
    <section className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">Pointage : {compte.nom}</h2>
          <p className="text-sm text-compta-text-muted">
            {LIBELLES_NATURE[compte.nature]} · {MOIS[numero - 1]} {annee} · {nbPointees} / {duMois.length} ligne(s) pointée(s)
          </p>
        </div>
        <Link
          href={`/${entiteId}/tresorerie/${compte.id}?annee=${annee}`}
          className="text-sm text-compta-text-muted hover:text-compta-accent"
        >
          Retour au contrôle mensuel
        </Link>
      </div>

      <div className="flex items-center gap-3 text-sm">
        <Link href={`/${entiteId}/tresorerie/${compte.id}/pointage?mois=${decaler(mois, -1)}`} className="text-compta-accent hover:underline">
          Mois précédent
        </Link>
        <span className="text-compta-text-muted">·</span>
        <Link href={`/${entiteId}/tresorerie/${compte.id}/pointage?mois=${decaler(mois, 1)}`} className="text-compta-accent hover:underline">
          Mois suivant
        </Link>
      </div>

      <p className="text-sm text-compta-text-muted">
        Pointer une ligne, c&apos;est noter que tu l&apos;as vue sur le relevé (sa date et sa référence).
        Ce n&apos;est ni la valider ni la justifier : les trois se font à part.
        {!estCompteBancaire(compte.nature) && " Pour une caisse, le pointage n'est pas exigé à la clôture : le comptage suffit."}
      </p>

      {cloture && (
        <p className="rounded-md bg-compta-accent/10 px-3 py-2 text-sm">
          Exercice {annee} clôturé : le pointage est figé. Rouvre l&apos;exercice depuis la page{" "}
          <Link href={`/${entiteId}/cloture?exercice=${annee}`} className="text-compta-accent hover:underline">
            Clôture
          </Link>{" "}
          pour le modifier.
        </p>
      )}

      <div className="rounded-lg border border-compta-border bg-compta-surface p-4 text-sm">
        {controle.observe ? (
          <p>
            Relevé du {dateFr(controle.observe.date)} : {formaterCentimes(controle.observe.solde)}
            {controle.etat === "concorde" ? (
              <span className="text-compta-recette"> · concorde avec les lignes saisies.</span>
            ) : (
              <span className="text-compta-depense">
                {" "}
                · ne concorde pas{controle.ecart !== null ? ` (écart de ${formaterCentimes(controle.ecart)})` : ""} : pointe ligne par ligne, ou corrige d&apos;abord l&apos;écart.
              </span>
            )}
          </p>
        ) : (
          <p className="text-compta-text-muted">
            Aucun relevé saisi pour ce mois : le pointage groupé n&apos;est pas possible.{" "}
            <Link href={`/${entiteId}/tresorerie`} className="text-compta-accent hover:underline">
              Saisir un solde de relevé
            </Link>
          </p>
        )}
        {!lectureSeule && lot.ok && (
          <div className="mt-3">
            <BoutonPointerMois entiteId={entiteId} compteId={compte.id} mois={mois} nombre={lot.valeur.ids.length} />
          </div>
        )}
      </div>

      {duMois.length === 0 ? (
        <p className="rounded-lg border border-dashed border-compta-border bg-compta-surface p-6 text-sm text-compta-text-muted">
          Aucune ligne sur ce compte en {MOIS[numero - 1]} {annee}.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-compta-border">
          <table className="w-full text-sm">
            <thead className="bg-compta-bg text-left text-xs uppercase text-compta-text-muted">
              <tr>
                <th className="px-3 py-2 font-medium">Date</th>
                <th className="px-3 py-2 font-medium">Libellé</th>
                <th className="px-3 py-2 text-right font-medium">Montant</th>
                <th className="px-3 py-2 font-medium">Pointage</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-compta-border bg-compta-surface align-top">
              {duMois.map((t) => (
                <tr key={t.id}>
                  <td className="whitespace-nowrap px-3 py-2">{dateFr(t.date_transaction)}</td>
                  <td className="px-3 py-2">
                    <Link href={`/${entiteId}/transactions/${t.id}`} className="hover:text-compta-accent">
                      {t.libelle}
                    </Link>
                    {t.virement_id && <span className="block text-xs text-compta-text-muted">Virement interne</span>}
                  </td>
                  <td className={`whitespace-nowrap px-3 py-2 text-right tabular-nums ${t.type === "recette" ? "text-compta-recette" : "text-compta-depense"}`}>
                    {t.type === "recette" ? "+" : "−"}
                    {formaterCentimes(t.montant_ttc_centimes)}
                  </td>
                  <td className="px-3 py-2">
                    <LignePointage
                      entiteId={entiteId}
                      compteId={compte.id}
                      transactionId={t.id}
                      pointeLe={t.pointe_le}
                      pointeRef={t.pointe_ref}
                      dateProposee={dateProposee < t.date_transaction ? finDeMois(annee, numero) : dateProposee}
                      referenceProposee={referenceProposee}
                      lectureSeule={lectureSeule}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
