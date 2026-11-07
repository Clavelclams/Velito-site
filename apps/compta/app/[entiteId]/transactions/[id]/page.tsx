/**
 * Écran d'édition d'une transaction — Server Component.
 *
 * Charge la transaction (getTransaction → notFound si absente/pas à moi), les
 * catégories actives, et les justificatifs, puis affiche le formulaire (mode
 * édition) + la gestion des pièces jointes.
 */
import { notFound } from "next/navigation";
import Link from "next/link";
import { getTransaction } from "@/lib/repositories/transactions";
import { listerCategories } from "@/lib/repositories/categories";
import { listerParTransaction } from "@/lib/repositories/justificatifs";
import { createClient } from "@/lib/supabase/server";
import { listerComptesTresorerie } from "@/lib/repositories/tresorerie";
import { FormulaireTransaction } from "@/components/FormulaireTransaction";
import { GestionJustificatifs } from "@/components/GestionJustificatifs";
import type { Categorie } from "@/types/database";
import { peutEcrire } from "@/lib/droits";
import { formaterCentimes } from "@/lib/services/montants";
import { LIBELLES_STATUT } from "@/lib/services/tresorerie";

export default async function EditionTransactionPage({
  params,
}: {
  params: Promise<{ entiteId: string; id: string }>;
}) {
  const { entiteId, id } = await params;
  const supabase = await createClient();

  const [transaction, categoriesActives, justificatifs, comptes, ecriture] = await Promise.all([
    getTransaction(supabase, id),
    listerCategories(supabase, entiteId, true),
    listerParTransaction(supabase, id),
    listerComptesTresorerie(supabase, entiteId),
    peutEcrire(supabase, entiteId),
  ]);

  if (!transaction) {
    notFound();
  }

  // Si la transaction pointe vers une catégorie archivée (absente des actives),
  // on la récupère et on l'ajoute pour qu'elle reste sélectionnable.
  let categories: Categorie[] = categoriesActives;
  if (
    transaction.categorie_id &&
    !categoriesActives.some((c) => c.id === transaction.categorie_id)
  ) {
    const toutes = await listerCategories(supabase, entiteId, false);
    const manquante = toutes.find((c) => c.id === transaction.categorie_id);
    if (manquante) categories = [...categoriesActives, manquante];
  }

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">{ecriture ? "Modifier la transaction" : "Transaction"}</h2>
        <Link
          href={`/${entiteId}/transactions`}
          className="text-sm text-compta-text-muted transition-colors hover:text-compta-accent"
        >
          ← Retour à la liste
        </Link>
      </div>

      {transaction.virement_id ? (
        // [07/11/2026] Lot 6 : une jambe de virement ne s'édite pas seule
        // (on casserait l'égalité sortie = entrée). On la gère depuis Trésorerie.
        <div className="rounded-lg border border-compta-border bg-compta-surface p-5 text-sm">
          C&apos;est une jambe d&apos;un <strong>virement interne</strong>. Pour
          le corriger, supprime le virement depuis la page{" "}
          <Link href={`/${entiteId}/tresorerie`} className="text-compta-accent hover:underline">
            Trésorerie
          </Link>{" "}
          et saisis-le à nouveau : les deux mouvements partent ensemble.
        </div>
      ) : !ecriture ? (
        // [07/11/2026] Lecteur : fiche en lecture à la place du formulaire.
        <dl className="grid grid-cols-1 gap-3 rounded-lg border border-compta-border bg-compta-surface p-5 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-xs uppercase text-compta-text-muted">Date</dt>
            <dd>{transaction.date_transaction.split("-").reverse().join("/")}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase text-compta-text-muted">Libellé</dt>
            <dd>{transaction.libelle}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase text-compta-text-muted">
              {transaction.type === "recette" ? "Recette TTC" : "Dépense TTC"}
            </dt>
            <dd className="tabular-nums">
              {formaterCentimes(transaction.montant_ttc_centimes)}
              {transaction.montant_tva_centimes > 0 && (
                <span className="ml-2 text-xs text-compta-text-muted">
                  dont TVA {formaterCentimes(transaction.montant_tva_centimes)}
                </span>
              )}
            </dd>
          </div>
          <div>
            <dt className="text-xs uppercase text-compta-text-muted">Catégorie</dt>
            <dd>{categories.find((c) => c.id === transaction.categorie_id)?.nom ?? "Non classée"}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase text-compta-text-muted">Compte</dt>
            <dd>{comptes.find((c) => c.id === transaction.compte_tresorerie_id)?.nom ?? "Compte inconnu"}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase text-compta-text-muted">Statut</dt>
            <dd>{LIBELLES_STATUT[transaction.statut]}</dd>
          </div>
          {transaction.commentaire && (
            <div className="sm:col-span-2">
              <dt className="text-xs uppercase text-compta-text-muted">Commentaire</dt>
              <dd className="whitespace-pre-line">{transaction.commentaire}</dd>
            </div>
          )}
        </dl>
      ) : (
        <FormulaireTransaction
          entiteId={entiteId}
          categories={categories}
          transaction={transaction}
          comptes={comptes
            .filter((c) => c.active || c.id === transaction.compte_tresorerie_id)
            .map((c) => ({ id: c.id, nom: c.nom }))}
        />
      )}

      {/* Provenance : jamais modifiable, c'est la trace de l'origine (règle Nova). */}
      {transaction.source_fichier && (
        <p className="rounded-lg border border-compta-border bg-compta-surface p-5 text-sm text-compta-text-muted">
          Provenance : {transaction.source_fichier}
          {transaction.source_ref ? ` (${transaction.source_ref})` : ""}
        </p>
      )}

      <GestionJustificatifs
        entiteId={entiteId}
        transactionId={transaction.id}
        justificatifs={justificatifs}
        lectureSeule={!ecriture}
      />
    </section>
  );
}
