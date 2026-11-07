"use client";

/**
 * Une ligne de l'écran « À traiter » (07/11/2026) : catégorie, commentaire,
 * puis « Classer », « Valider » ou « Virement interne ». Chaque bouton appelle
 * une server action ; le serveur revérifie tout (service traitement).
 */
import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Transaction } from "@/types/database";
import { formaterCentimes } from "@/lib/services/montants";
import { classerAction, convertirEnVirementAction } from "@/app/[entiteId]/a-traiter/actions";

function dateFr(iso: string): string {
  return `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;
}

export function LigneATraiter({
  entiteId,
  transaction: t,
  nomCompte,
  categories,
  autresComptes,
}: {
  entiteId: string;
  transaction: Transaction;
  nomCompte: string | null;
  categories: { id: string; nom: string }[];
  autresComptes: { id: string; nom: string }[];
}) {
  const router = useRouter();
  const [categorieId, setCategorieId] = useState(t.categorie_id ?? "");
  const [commentaire, setCommentaire] = useState(t.commentaire ?? "");
  const [autreCompte, setAutreCompte] = useState("");
  const [modeVirement, setModeVirement] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, demarrer] = useTransition();

  const champ = "rounded-md border border-compta-border bg-white px-2 py-1.5 text-sm outline-none focus:border-compta-accent";
  const bouton = "rounded-md px-3 py-1.5 text-sm font-medium disabled:opacity-50";

  function lancer(fn: () => Promise<{ success: boolean; error?: string }>) {
    setErreur(null);
    demarrer(async () => {
      const r = await fn();
      if (r.success) router.refresh();
      else setErreur(r.error ?? "Action impossible.");
    });
  }

  const commentaireModifie = commentaire !== (t.commentaire ?? "");

  return (
    <li className="space-y-3 rounded-lg border border-compta-border bg-compta-surface p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <Link href={`/${entiteId}/transactions/${t.id}`} className="font-medium hover:text-compta-accent">
            {t.libelle}
          </Link>
          <p className="text-xs text-compta-text-muted">
            {dateFr(t.date_transaction)} · {nomCompte ?? "compte inconnu"} · {t.statut === "a_classer" ? "À classer" : "À valider"}
          </p>
        </div>
        <span className={`whitespace-nowrap tabular-nums font-semibold ${t.type === "recette" ? "text-compta-recette" : "text-compta-depense"}`}>
          {t.type === "recette" ? "+" : "−"}
          {formaterCentimes(t.montant_ttc_centimes)}
        </span>
      </div>

      <textarea
        value={commentaire}
        onChange={(e) => setCommentaire(e.target.value)}
        rows={2}
        maxLength={1000}
        aria-label="Commentaire"
        placeholder="Commentaire (ce qui a été vérifié, ce qui reste à trancher)"
        className={`w-full text-xs ${champ}`}
      />

      <div className="flex flex-wrap items-center gap-2">
        <select value={categorieId} onChange={(e) => setCategorieId(e.target.value)} aria-label="Catégorie" className={champ}>
          <option value="">Catégorie…</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nom}
            </option>
          ))}
        </select>
        <button
          type="button"
          disabled={enCours || (categorieId === (t.categorie_id ?? "") && !commentaireModifie)}
          onClick={() => lancer(() => classerAction(entiteId, t.id, categorieId || null, "classer", commentaire))}
          className={`${bouton} border border-compta-border hover:border-compta-accent`}
        >
          Enregistrer
        </button>
        <button
          type="button"
          disabled={enCours || !categorieId}
          onClick={() => lancer(() => classerAction(entiteId, t.id, categorieId, "valider", commentaire))}
          className={`${bouton} bg-compta-accent text-white hover:bg-compta-accent-hover`}
        >
          Valider
        </button>
        {t.compte_tresorerie_id && autresComptes.length > 0 && (
          <button
            type="button"
            disabled={enCours}
            onClick={() => setModeVirement((v) => !v)}
            className={`${bouton} text-compta-text-muted hover:text-compta-accent`}
          >
            Virement interne…
          </button>
        )}
      </div>

      {modeVirement && (
        <div className="flex flex-wrap items-center gap-2 rounded-md bg-compta-bg p-3 text-sm">
          <span>
            {t.type === "depense" ? `De ${nomCompte} vers` : `Vers ${nomCompte}, depuis`}
          </span>
          <select value={autreCompte} onChange={(e) => setAutreCompte(e.target.value)} aria-label="Autre compte" className={champ}>
            <option value="">Compte…</option>
            {autresComptes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nom}
              </option>
            ))}
          </select>
          <button
            type="button"
            disabled={enCours || !autreCompte}
            onClick={() => lancer(() => convertirEnVirementAction(entiteId, t.id, autreCompte))}
            className={`${bouton} bg-compta-accent text-white hover:bg-compta-accent-hover`}
          >
            Transformer en virement
          </button>
          <span className="w-full text-xs text-compta-text-muted">
            Ni recette ni dépense de l&apos;association : l&apos;argent change seulement de compte. Pour annuler : supprime le virement, puis réimporte le relevé.
          </span>
        </div>
      )}

      {erreur && <p className="text-sm text-compta-depense">{erreur}</p>}
    </li>
  );
}
