"use client";

/**
 * Opérations rattachées à un dossier de subvention (07/11/2026) : détacher
 * celles qui sont liées, rattacher des opérations de l'exercice (recherche
 * par libellé). Le « financement lié » est distinct de la catégorie.
 */
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { formaterCentimes } from "@/lib/services/montants";
import { lierOperationsAction } from "@/app/[entiteId]/subventions/actions";

interface Op {
  id: string;
  date: string;
  libelle: string;
  type: "recette" | "depense";
  montantCentimes: number;
}

function dateFr(iso: string) {
  return `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;
}

function Ligne({ op, action, libelle, enCours }: { op: Op; action: () => void; libelle: string; enCours: boolean }) {
  return (
    <li className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
      <span className="min-w-0">
        <span className="block truncate">{op.libelle}</span>
        <span className="text-xs text-compta-text-muted">{dateFr(op.date)}</span>
      </span>
      <span className="flex shrink-0 items-center gap-3">
        <span className={`tabular-nums ${op.type === "recette" ? "text-compta-recette" : "text-compta-depense"}`}>
          {op.type === "recette" ? "+" : "−"}
          {formaterCentimes(op.montantCentimes)}
        </span>
        <button type="button" disabled={enCours} onClick={action} className="text-xs text-compta-accent hover:underline disabled:opacity-50">
          {libelle}
        </button>
      </span>
    </li>
  );
}

export function OperationsSubvention({
  entiteId,
  subventionId,
  liees,
  candidates,
}: {
  entiteId: string;
  subventionId: string;
  liees: Op[];
  candidates: Op[];
}) {
  const router = useRouter();
  const [recherche, setRecherche] = useState("");
  const [seulementRecettes, setSeulementRecettes] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, demarrer] = useTransition();

  const filtrees = useMemo(() => {
    const r = recherche.trim().toLowerCase();
    return candidates
      .filter((c) => (seulementRecettes ? c.type === "recette" : true))
      .filter((c) => (r ? c.libelle.toLowerCase().includes(r) : true))
      .slice(0, 50);
  }, [candidates, recherche, seulementRecettes]);

  function lier(ids: string[], lier: boolean) {
    setErreur(null);
    demarrer(async () => {
      const r = await lierOperationsAction(entiteId, subventionId, ids, lier);
      if (r.success) router.refresh();
      else setErreur(r.error ?? "Action impossible.");
    });
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-semibold">Opérations liées ({liees.length})</h3>
        {liees.length === 0 ? (
          <p className="text-sm text-compta-text-muted">Aucune. Rattache ci-dessous le versement reçu et, si tu veux, les dépenses financées.</p>
        ) : (
          <ul className="divide-y divide-compta-border rounded-lg border border-compta-border bg-compta-surface">
            {liees.map((op) => (
              <Ligne key={op.id} op={op} enCours={enCours} libelle="Détacher" action={() => lier([op.id], false)} />
            ))}
          </ul>
        )}
      </div>

      <div className="space-y-2">
        <h3 className="font-semibold">Rattacher une opération</h3>
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <input
            value={recherche}
            onChange={(e) => setRecherche(e.target.value)}
            placeholder="Rechercher un libellé (ex. FDVA, MAIRIE)"
            className="rounded-md border border-compta-border bg-white px-3 py-2 text-sm outline-none focus:border-compta-accent"
          />
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={seulementRecettes} onChange={(e) => setSeulementRecettes(e.target.checked)} />
            Recettes seulement
          </label>
        </div>
        {filtrees.length === 0 ? (
          <p className="text-sm text-compta-text-muted">Aucune opération non rattachée ne correspond (exercice du dossier et suivant).</p>
        ) : (
          <ul className="divide-y divide-compta-border rounded-lg border border-compta-border bg-compta-surface">
            {filtrees.map((op) => (
              <Ligne key={op.id} op={op} enCours={enCours} libelle="Rattacher" action={() => lier([op.id], true)} />
            ))}
          </ul>
        )}
        {erreur && <p className="text-sm text-compta-depense">{erreur}</p>}
      </div>
    </div>
  );
}
