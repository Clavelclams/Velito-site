"use client";

/**
 * Formulaire de transaction — composant CLIENT, bimode :
 *   - CRÉATION si `transaction` n'est pas fourni ;
 *   - ÉDITION si `transaction` est fourni (champs pré-remplis + suppression).
 *
 * Il gère l'état local (les champs tapés) et appelle la server action. Il ne
 * calcule AUCUN montant : il envoie les chaînes brutes ("12,50") au service,
 * qui convertit en centimes. La conversion vit à un seul endroit (montants.ts).
 *
 * Les catégories proposées se filtrent selon le type choisi (recette vs
 * dépense) : on ne propose jamais une catégorie de dépense pour une recette.
 */
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Categorie, Transaction, TypeFlux } from "@/types/database";
import { centimesVersSaisie } from "@/lib/services/montants";
import {
  creerTransactionAction,
  modifierTransactionAction,
  supprimerTransactionAction,
} from "@/app/[entiteId]/transactions/actions";

/** Date du jour au format AAAA-MM-JJ (valeur par défaut du champ date). */
function aujourdHui(): string {
  return new Date().toISOString().slice(0, 10);
}

export function FormulaireTransaction({
  entiteId,
  categories,
  transaction,
}: {
  entiteId: string;
  categories: Categorie[];
  transaction?: Transaction;
}) {
  const router = useRouter();
  const edition = transaction !== undefined;

  // État initial : valeurs de la transaction en édition, sinon valeurs neuves.
  const [type, setType] = useState<TypeFlux>(transaction?.type ?? "depense");
  const [dateTransaction, setDate] = useState(
    transaction?.date_transaction ?? aujourdHui(),
  );
  const [libelle, setLibelle] = useState(transaction?.libelle ?? "");
  const [montantTtc, setTtc] = useState(
    transaction ? centimesVersSaisie(transaction.montant_ttc_centimes) : "",
  );
  const [montantTva, setTva] = useState(
    transaction && transaction.montant_tva_centimes > 0
      ? centimesVersSaisie(transaction.montant_tva_centimes)
      : "",
  );
  const [categorieId, setCategorieId] = useState<string>(
    transaction?.categorie_id ?? "",
  );
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, demarrer] = useTransition();
  const [suppressionEnCours, demarrerSuppression] = useTransition();

  // Catégories du type actuellement choisi seulement.
  const categoriesDuType = useMemo(
    () => categories.filter((c) => c.type === type),
    [categories, type],
  );

  function changerType(nouveau: TypeFlux) {
    setType(nouveau);
    setCategorieId(""); // la catégorie choisie n'a plus de sens si le type change
  }

  function soumettre(e: React.FormEvent) {
    e.preventDefault();
    setErreur(null);
    demarrer(async () => {
      const saisie = {
        entiteId,
        categorieId: categorieId || null,
        type,
        dateTransaction,
        libelle,
        montantTtc,
        montantTva,
      };
      const r = edition
        ? await modifierTransactionAction(transaction!.id, saisie)
        : await creerTransactionAction(saisie);
      if (r.success) {
        router.push(`/${entiteId}/transactions`);
      } else {
        setErreur(r.error ?? "Une erreur est survenue.");
      }
    });
  }

  function supprimer() {
    if (!transaction) return;
    if (!window.confirm("Supprimer définitivement cette transaction ?")) return;
    setErreur(null);
    demarrerSuppression(async () => {
      const r = await supprimerTransactionAction(entiteId, transaction.id);
      if (r.success) {
        router.push(`/${entiteId}/transactions`);
      } else {
        setErreur(r.error ?? "Suppression impossible.");
      }
    });
  }

  const styleChamp =
    "w-full rounded-md border border-compta-border bg-white px-3 py-2 text-sm outline-none focus:border-compta-accent";

  return (
    <form
      onSubmit={soumettre}
      className="space-y-4 rounded-lg border border-compta-border bg-compta-surface p-5"
    >
      {/* Type : segmenté recette / dépense */}
      <div className="flex gap-2">
        {(["depense", "recette"] as TypeFlux[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => changerType(t)}
            className={`flex-1 rounded-md border px-3 py-2 text-sm font-medium transition-colors ${
              type === t
                ? t === "recette"
                  ? "border-compta-recette bg-compta-recette/10 text-compta-recette"
                  : "border-compta-depense bg-compta-depense/10 text-compta-depense"
                : "border-compta-border text-compta-text-muted hover:bg-compta-bg"
            }`}
          >
            {t === "recette" ? "Recette" : "Dépense"}
          </button>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {/* Date */}
        <label>
          <span className="mb-1 block text-sm font-medium">Date</span>
          <input
            type="date"
            value={dateTransaction}
            onChange={(e) => setDate(e.target.value)}
            className={styleChamp}
          />
        </label>

        {/* Catégorie (optionnelle) */}
        <label>
          <span className="mb-1 block text-sm font-medium">
            Catégorie <span className="text-compta-text-muted">(optionnel)</span>
          </span>
          <select
            value={categorieId}
            onChange={(e) => setCategorieId(e.target.value)}
            className={styleChamp}
          >
            <option value="">— non catégorisée —</option>
            {categoriesDuType.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nom}
              </option>
            ))}
          </select>
        </label>
      </div>

      {/* Libellé */}
      <label className="block">
        <span className="mb-1 block text-sm font-medium">Libellé</span>
        <input
          type="text"
          value={libelle}
          onChange={(e) => setLibelle(e.target.value)}
          placeholder="ex : Facture Leclerc, Subvention CAF…"
          maxLength={255}
          className={styleChamp}
        />
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        {/* Montant TTC */}
        <label>
          <span className="mb-1 block text-sm font-medium">Montant TTC (€)</span>
          <input
            type="text"
            inputMode="decimal"
            value={montantTtc}
            onChange={(e) => setTtc(e.target.value)}
            placeholder="12,50"
            className={styleChamp}
          />
        </label>

        {/* Montant TVA */}
        <label>
          <span className="mb-1 block text-sm font-medium">
            dont TVA (€) <span className="text-compta-text-muted">(0 si vide)</span>
          </span>
          <input
            type="text"
            inputMode="decimal"
            value={montantTva}
            onChange={(e) => setTva(e.target.value)}
            placeholder="0"
            className={styleChamp}
          />
        </label>
      </div>

      {erreur && (
        <p className="text-sm text-compta-depense" role="alert">
          {erreur}
        </p>
      )}

      <div className="flex items-center justify-between gap-3">
        {/* Suppression : seulement en édition, à gauche, visuellement à part. */}
        {edition ? (
          <button
            type="button"
            onClick={supprimer}
            disabled={suppressionEnCours}
            className="text-sm text-compta-depense underline-offset-2 transition-colors hover:underline disabled:opacity-50"
          >
            {suppressionEnCours ? "Suppression…" : "Supprimer"}
          </button>
        ) : (
          <span />
        )}

        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => router.push(`/${entiteId}/transactions`)}
            className="rounded-md border border-compta-border px-4 py-2 text-sm transition-colors hover:bg-compta-bg"
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={enCours}
            className="rounded-md bg-compta-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-compta-accent-hover disabled:opacity-50"
          >
            {enCours
              ? "Enregistrement…"
              : edition
                ? "Enregistrer les modifications"
                : "Enregistrer"}
          </button>
        </div>
      </div>
    </form>
  );
}
