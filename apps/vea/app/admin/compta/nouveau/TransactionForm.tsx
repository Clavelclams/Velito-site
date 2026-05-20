/**
 * TransactionForm — Client Component pour saisir une transaction
 *
 * Champs : date, type (recette/dépense), catégorie, montant, description,
 * justificatif (lien vers un document), statut, saison.
 *
 * Soumission via Server Action createTransactionAction.
 */
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  createTransactionAction,
  type TransactionType,
  type TransactionCategorie,
  type TransactionStatut,
} from "../actions";

interface DocumentOption {
  id: string;
  nom: string;
  type: string;
}

interface TransactionFormProps {
  documents: DocumentOption[];
}

const CATEGORIES_RECETTE: { value: TransactionCategorie; label: string }[] = [
  { value: "subvention", label: "Subvention" },
  { value: "cotisation", label: "Cotisation" },
  { value: "prestation", label: "Prestation (animation payée)" },
  { value: "don", label: "Don" },
  { value: "autre", label: "Autre" },
];

const CATEGORIES_DEPENSE: { value: TransactionCategorie; label: string }[] = [
  { value: "animation", label: "Animation / event" },
  { value: "materiel", label: "Matériel (PC, manettes, écrans)" },
  { value: "transport", label: "Transport (péage, essence, train)" },
  { value: "restauration", label: "Restauration (repas, snacks)" },
  { value: "communication", label: "Communication (impression, hébergement)" },
  { value: "frais_bancaires", label: "Frais bancaires" },
  { value: "assurance", label: "Assurance" },
  { value: "autre", label: "Autre" },
];

export default function TransactionForm({ documents }: TransactionFormProps) {
  const router = useRouter();
  const [type, setType] = useState<TransactionType>("depense");
  const [categorie, setCategorie] = useState<TransactionCategorie>("animation");
  const [montant, setMontant] = useState("");
  const [dateTransaction, setDateTransaction] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [description, setDescription] = useState("");
  const [documentId, setDocumentId] = useState<string>("");
  const [statut, setStatut] = useState<TransactionStatut>("effectue");
  const [saison, setSaison] = useState("2026/27");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Switch catégorie quand le type change (pour avoir une valeur cohérente)
  function handleTypeChange(newType: TransactionType) {
    setType(newType);
    const defaultCat = newType === "recette" ? "subvention" : "animation";
    setCategorie(defaultCat as TransactionCategorie);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const montantNum = parseFloat(montant.replace(",", "."));
    if (isNaN(montantNum) || montantNum <= 0) {
      setError("Montant invalide.");
      return;
    }
    if (!description.trim()) {
      setError("Description requise.");
      return;
    }

    startTransition(async () => {
      const result = await createTransactionAction({
        date_transaction: dateTransaction,
        type,
        categorie,
        montant: montantNum,
        description,
        document_id: documentId || null,
        statut,
        saison,
      });

      if (!result.success) {
        setError(result.error ?? "Erreur");
        return;
      }
      router.push("/admin/compta");
      router.refresh();
    });
  }

  const categories = type === "recette" ? CATEGORIES_RECETTE : CATEGORIES_DEPENSE;
  const inputClass =
    "w-full bg-white border border-vea-border rounded-lg px-4 py-3 text-vea-text text-sm placeholder-vea-text-dim focus:outline-none focus:border-vea-accent focus:ring-2 focus:ring-vea-accent/15 transition-all";
  const labelClass =
    "block text-xs font-semibold text-vea-text-muted uppercase tracking-wider mb-1.5";

  return (
    <form onSubmit={handleSubmit} className="card-clean p-6 space-y-5">
      {/* Type : recette / dépense */}
      <div>
        <label className={labelClass}>
          Type <span className="text-vea-accent">*</span>
        </label>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => handleTypeChange("recette")}
            className={`px-4 py-3 rounded-lg border-2 text-sm font-bold transition-all ${
              type === "recette"
                ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                : "border-vea-border bg-white text-vea-text-muted hover:border-emerald-300"
            }`}
          >
            + Recette
          </button>
          <button
            type="button"
            onClick={() => handleTypeChange("depense")}
            className={`px-4 py-3 rounded-lg border-2 text-sm font-bold transition-all ${
              type === "depense"
                ? "border-red-500 bg-red-50 text-red-700"
                : "border-vea-border bg-white text-vea-text-muted hover:border-red-300"
            }`}
          >
            − Dépense
          </button>
        </div>
      </div>

      {/* Montant + Date */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="montant" className={labelClass}>
            Montant (€) <span className="text-vea-accent">*</span>
          </label>
          <input
            type="text"
            inputMode="decimal"
            id="montant"
            value={montant}
            onChange={(e) => setMontant(e.target.value.replace(/[^0-9.,]/g, "").slice(0, 12))}
            className={inputClass}
            placeholder="Ex : 150,50"
          />
        </div>
        <div>
          <label htmlFor="date_transaction" className={labelClass}>
            Date <span className="text-vea-accent">*</span>
          </label>
          <input
            type="date"
            id="date_transaction"
            value={dateTransaction}
            onChange={(e) => setDateTransaction(e.target.value)}
            className={inputClass}
          />
        </div>
      </div>

      {/* Catégorie */}
      <div>
        <label htmlFor="categorie" className={labelClass}>
          Catégorie
        </label>
        <select
          id="categorie"
          value={categorie}
          onChange={(e) => setCategorie(e.target.value as TransactionCategorie)}
          className={inputClass}
        >
          {categories.map((c) => (
            <option key={c.value} value={c.value}>{c.label}</option>
          ))}
        </select>
      </div>

      {/* Description */}
      <div>
        <label htmlFor="description" className={labelClass}>
          Description <span className="text-vea-accent">*</span>
        </label>
        <textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value.slice(0, 1000))}
          maxLength={1000}
          rows={3}
          className={inputClass}
          placeholder="Ex : Achat manettes Xbox Series chez Game Cash pour Tour du Marais 12/05"
        />
      </div>

      {/* Justificatif (document lié) */}
      <div>
        <label htmlFor="document_id" className={labelClass}>
          Justificatif (document uploadé, optionnel)
        </label>
        <select
          id="document_id"
          value={documentId}
          onChange={(e) => setDocumentId(e.target.value)}
          className={inputClass}
        >
          <option value="">— Pas de justificatif lié —</option>
          {documents.map((d) => (
            <option key={d.id} value={d.id}>
              [{d.type}] {d.nom}
            </option>
          ))}
        </select>
        <p className="text-[10px] text-vea-text-dim mt-1 italic">
          Si tu veux lier un justificatif (ticket, facture), uploade-le d&apos;abord via Dépôt documents.
        </p>
      </div>

      {/* Statut + Saison */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="statut" className={labelClass}>
            Statut
          </label>
          <select
            id="statut"
            value={statut}
            onChange={(e) => setStatut(e.target.value as TransactionStatut)}
            className={inputClass}
          >
            <option value="effectue">Effectué (déjà passé en banque)</option>
            <option value="planifie">Planifié (prévu mais pas encore passé)</option>
            <option value="annule">Annulé</option>
          </select>
        </div>
        <div>
          <label htmlFor="saison" className={labelClass}>
            Saison
          </label>
          <select
            id="saison"
            value={saison}
            onChange={(e) => setSaison(e.target.value)}
            className={inputClass}
          >
            <option value="2026/27">2026/27 — L&apos;Éveil</option>
            <option value="2025/26">2025/26 — antérieure</option>
            <option value="2027/28">2027/28 — L&apos;Ascension</option>
          </select>
        </div>
      </div>

      {/* Erreur */}
      {error && (
        <div className="border border-vea-accent/30 bg-vea-accent-soft rounded-lg px-4 py-3 text-sm text-vea-accent">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="btn-primary w-full disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {isPending ? "Enregistrement..." : "Enregistrer la transaction"}
      </button>
    </form>
  );
}
