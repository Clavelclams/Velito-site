/**
 * Dossier de subvention — Server Component (07/11/2026).
 *
 * Suivi (demandé, notifié, encaissé, employé, reste), fiche modifiable, et
 * opérations liées : les recettes font l'encaissé, les dépenses montrent
 * l'emploi des fonds (compte rendu financier). On rattache des opérations de
 * l'exercice du dossier (et du suivant, un versement arrivant souvent tard).
 */
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSubvention } from "@/lib/repositories/subventions";
import { listerTransactions } from "@/lib/repositories/transactions";
import { formaterCentimes } from "@/lib/services/montants";
import { LIBELLES_STATUT_SUBVENTION, suiviSubvention } from "@/lib/services/subventions";
import { FormulaireSubvention } from "@/components/FormulaireSubvention";
import { OperationsSubvention } from "@/components/OperationsSubvention";
import { BoutonConfirmer } from "@/components/BoutonConfirmer";
import { supprimerSubventionAction } from "../actions";

export default async function DossierSubventionPage({ params }: { params: Promise<{ entiteId: string; id: string }> }) {
  const { entiteId, id } = await params;
  const supabase = await createClient();
  const dossier = await getSubvention(supabase, id);
  if (!dossier || dossier.entite_id !== entiteId) notFound();

  const transactions = await listerTransactions(supabase, entiteId);
  const aujourdHui = new Date().toISOString().slice(0, 10);
  const suivi = suiviSubvention(dossier, transactions, aujourdHui);

  const liees = transactions.filter((t) => t.subvention_id === dossier.id);
  const annees = [String(dossier.exercice), String(dossier.exercice + 1)];
  const candidates = transactions.filter(
    (t) => !t.subvention_id && !t.virement_id && annees.includes(t.date_transaction.slice(0, 4)),
  );
  const vue = (t: (typeof transactions)[number]) => ({
    id: t.id,
    date: t.date_transaction,
    libelle: t.libelle,
    type: t.type,
    montantCentimes: t.montant_ttc_centimes,
  });

  const carte = (titre: string, valeur: number | null, classe = "") => (
    <div className="rounded-lg border border-compta-border bg-compta-surface p-3">
      <p className="text-xs text-compta-text-muted">{titre}</p>
      <p className={`text-lg font-semibold tabular-nums ${classe}`}>
        {valeur === null ? <span className="text-sm text-compta-accent">à compléter</span> : formaterCentimes(valeur)}
      </p>
    </div>
  );

  return (
    <section className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">
            {dossier.financeur} · {dossier.action}
          </h2>
          <p className="text-sm text-compta-text-muted">
            Exercice {dossier.exercice} · {LIBELLES_STATUT_SUBVENTION[dossier.statut]}
            {suivi.echeanceDepassee && <span className="text-compta-depense"> · échéance dépassée</span>}
          </p>
        </div>
        <Link href={`/${entiteId}/subventions`} className="text-sm text-compta-text-muted hover:text-compta-accent">
          ← Subventions
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {carte("Demandé", suivi.demande)}
        {carte("Notifié", suivi.notifie)}
        {carte("Encaissé", suivi.encaisse, "text-compta-recette")}
        {carte("Reste à encaisser", suivi.resteAEncaisser)}
        {carte("Dépenses liées", suivi.employe, "text-compta-depense")}
      </div>

      <OperationsSubvention
        entiteId={entiteId}
        subventionId={dossier.id}
        liees={liees.map(vue)}
        candidates={candidates.map(vue)}
      />

      <div className="space-y-2">
        <h3 className="font-semibold">Fiche du dossier</h3>
        <FormulaireSubvention entiteId={entiteId} dossier={dossier} />
      </div>

      <BoutonConfirmer
        action={supprimerSubventionAction.bind(null, entiteId, dossier.id)}
        question="Supprimer ce dossier ? Les opérations rattachées restent, seul le lien disparaît."
        libelle="Supprimer le dossier"
      />
    </section>
  );
}
