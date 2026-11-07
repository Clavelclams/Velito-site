"use client";

/**
 * Formulaires de la page Clôture (07/11/2026) : clôturer avec un motif,
 * rouvrir avec un motif d'au moins 10 caractères. Le bouton « Clôturer »
 * n'est actif que si la checklist est verte, mais c'est un confort : le
 * serveur puis la base revérifient tout (actions.ts, cloturer_exercice).
 */
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { cloturerExerciceAction, rouvrirExerciceAction } from "@/app/[entiteId]/cloture/actions";
import { MOTIF_MAX, MOTIF_REOUVERTURE_MIN } from "@/lib/services/cloture";

const champ = "w-full rounded-md border border-compta-border bg-white px-3 py-2 text-sm outline-none focus:border-compta-accent";
const bouton =
  "rounded-md bg-compta-accent px-4 py-2 text-sm font-medium text-white hover:bg-compta-accent-hover disabled:cursor-not-allowed disabled:opacity-50";

export function FormulaireCloture({
  entiteId,
  exercice,
  signature,
  toutVert,
  lectureSeule = false,
}: {
  entiteId: string;
  exercice: number;
  /** Signature calculée à l'affichage : renvoyée telle quelle au serveur. */
  signature: string;
  toutVert: boolean;
  /** [07/11/2026] Lecteur : le formulaire n'est pas rendu. */
  lectureSeule?: boolean;
}) {
  const router = useRouter();
  const [motif, setMotif] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, demarrer] = useTransition();

  // [07/11/2026] Après les hooks (ordre constant) : rien pour le lecteur.
  if (lectureSeule) return null;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!window.confirm(`Clôturer l'exercice ${exercice} ? Plus aucune ligne de ${exercice} ne pourra être ajoutée, modifiée ni supprimée tant qu'il ne sera pas rouvert.`)) return;
        setErreur(null);
        demarrer(async () => {
          const r = await cloturerExerciceAction(entiteId, exercice, motif, signature);
          if (r.success) router.refresh();
          else setErreur(r.error ?? "Clôture impossible.");
        });
      }}
      className="space-y-3"
    >
      <label className="block text-sm font-medium" htmlFor="motif-cloture">
        Motif de la clôture
      </label>
      <textarea
        id="motif-cloture"
        value={motif}
        onChange={(e) => setMotif(e.target.value)}
        rows={2}
        maxLength={MOTIF_MAX}
        placeholder={`Ex. : comptes ${exercice} revus avec le bureau, relevés de décembre rapprochés`}
        className={champ}
      />
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={enCours || !toutVert || motif.trim() === ""} className={bouton}>
          {enCours ? "Clôture en cours…" : `Clôturer ${exercice}`}
        </button>
        {!toutVert && <span className="text-sm text-compta-text-muted">Corrige d&apos;abord les points en rouge.</span>}
      </div>
      {erreur && <p className="text-sm text-compta-depense">{erreur}</p>}
    </form>
  );
}

export function FormulaireReouverture({
  entiteId,
  exercice,
  lectureSeule = false,
}: {
  entiteId: string;
  exercice: number;
  /** [07/11/2026] Lecteur : le formulaire n'est pas rendu. */
  lectureSeule?: boolean;
}) {
  const router = useRouter();
  const [motif, setMotif] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, demarrer] = useTransition();
  const assezLong = motif.trim().length >= MOTIF_REOUVERTURE_MIN;

  // [07/11/2026] Après les hooks (ordre constant) : rien pour le lecteur.
  if (lectureSeule) return null;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!window.confirm(`Rouvrir l'exercice ${exercice} ? La clôture reste dans l'historique ; il faudra clôturer de nouveau.`)) return;
        setErreur(null);
        demarrer(async () => {
          const r = await rouvrirExerciceAction(entiteId, exercice, motif);
          if (r.success) router.refresh();
          else setErreur(r.error ?? "Réouverture impossible.");
        });
      }}
      className="space-y-3"
    >
      <label className="block text-sm font-medium" htmlFor="motif-reouverture">
        Motif de la réouverture ({MOTIF_REOUVERTURE_MIN} caractères au moins)
      </label>
      <textarea
        id="motif-reouverture"
        value={motif}
        onChange={(e) => setMotif(e.target.value)}
        rows={2}
        maxLength={MOTIF_MAX}
        placeholder="Ex. : facture de décembre retrouvée, à rattacher"
        className={champ}
      />
      <button
        type="submit"
        disabled={enCours || !assezLong}
        className="rounded-md border border-compta-depense px-4 py-2 text-sm font-medium text-compta-depense hover:bg-compta-depense hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
      >
        {enCours ? "Réouverture en cours…" : `Rouvrir ${exercice}`}
      </button>
      {erreur && <p className="text-sm text-compta-depense">{erreur}</p>}
    </form>
  );
}
