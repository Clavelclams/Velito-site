"use client";

/**
 * Création ou modification de l'en-tête d'une note de frais (07/11/2026).
 * Le numéro n'est jamais saisi : la base l'attribue (NDF-AAAA-NNN). Le
 * serveur revalide tout.
 */
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { NoteFrais } from "@/types/notes-de-frais";
import { creerNoteAction, modifierNoteAction } from "@/app/[entiteId]/notes-de-frais/actions";

export const CHAMP = "w-full rounded-md border border-compta-border bg-white px-3 py-2 text-sm outline-none focus:border-compta-accent";
export const ETIQUETTE = "block text-xs font-medium text-compta-text-muted";
export const BOUTON =
  "whitespace-nowrap rounded-md bg-compta-accent px-4 py-2 text-sm font-medium text-white hover:bg-compta-accent-hover disabled:opacity-50";
export const BOUTON_SECONDAIRE =
  "whitespace-nowrap rounded-md border border-compta-border bg-white px-4 py-2 text-sm font-medium hover:border-compta-accent hover:text-compta-accent disabled:opacity-50";

export function FormulaireNoteFrais({
  entiteId,
  note,
  beneficiaires = [],
  aujourdHui,
}: {
  entiteId: string;
  note?: NoteFrais;
  /** Noms déjà utilisés, proposés à la saisie (liste libre). */
  beneficiaires?: string[];
  aujourdHui: string;
}) {
  const router = useRouter();
  const [f, setF] = useState({
    beneficiaire: note?.beneficiaire ?? "",
    objet: note?.objet ?? "",
    date: note?.date_note ?? aujourdHui,
    commentaire: note?.commentaire ?? "",
  });
  const [erreur, setErreur] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [enCours, demarrer] = useTransition();
  const maj = (k: keyof typeof f) => (e: { target: { value: string } }) => {
    setOk(false);
    setF({ ...f, [k]: e.target.value });
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        setErreur(null);
        demarrer(async () => {
          const r = note ? await modifierNoteAction(entiteId, note.id, f) : await creerNoteAction(entiteId, f);
          if (!r.success) {
            setErreur(r.error ?? "Enregistrement impossible.");
            return;
          }
          if (!note && "id" in r && r.id) router.push(`/${entiteId}/notes-de-frais/${r.id}`);
          else {
            setOk(true);
            router.refresh();
          }
        });
      }}
      className="grid grid-cols-1 gap-3 rounded-lg border border-compta-border bg-compta-surface p-4 sm:grid-cols-3"
    >
      <label className={ETIQUETTE}>
        Bénéficiaire (qui a avancé l&apos;argent)
        <input value={f.beneficiaire} onChange={maj("beneficiaire")} required maxLength={120} list="ndf-beneficiaires" className={CHAMP} />
        <datalist id="ndf-beneficiaires">
          {beneficiaires.map((b) => (
            <option key={b} value={b} />
          ))}
        </datalist>
      </label>
      <label className={ETIQUETTE}>
        Objet
        <input value={f.objet} onChange={maj("objet")} required maxLength={200} placeholder="Tournoi, achat de matériel…" className={CHAMP} />
      </label>
      <label className={ETIQUETTE}>
        Date de la note
        <input type="date" value={f.date} onChange={maj("date")} required className={CHAMP} />
      </label>
      <label className={`${ETIQUETTE} sm:col-span-3`}>
        Commentaire
        <textarea value={f.commentaire} onChange={maj("commentaire")} rows={2} maxLength={1000} className={CHAMP} />
      </label>
      <div className="flex items-center gap-3 sm:col-span-3">
        <button type="submit" disabled={enCours} className={BOUTON}>
          {note ? "Enregistrer" : "Créer la note"}
        </button>
        {ok && <span className="text-sm text-compta-recette">Enregistré.</span>}
        {erreur && <span className="text-sm text-compta-depense">{erreur}</span>}
      </div>
    </form>
  );
}
