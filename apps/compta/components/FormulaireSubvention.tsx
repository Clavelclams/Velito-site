"use client";

/**
 * Création ou modification d'un dossier de subvention (07/11/2026).
 * Les montants vides restent « inconnus » (jamais 0). Le serveur revalide tout.
 */
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Subvention } from "@/types/database";
import { LIBELLES_STATUT_SUBVENTION } from "@/lib/services/subventions";
import { enregistrerSubventionAction } from "@/app/[entiteId]/subventions/actions";

function euros(c: number | null): string {
  return c === null ? "" : (c / 100).toFixed(2).replace(".", ",");
}

export function FormulaireSubvention({
  entiteId,
  dossier,
  lectureSeule = false,
}: {
  entiteId: string;
  dossier?: Subvention;
  /** [07/11/2026] Lecteur : le formulaire n'est pas rendu (la page affiche la fiche en lecture). */
  lectureSeule?: boolean;
}) {
  const router = useRouter();
  const [f, setF] = useState({
    financeur: dossier?.financeur ?? "",
    action: dossier?.action ?? "",
    exercice: String(dossier?.exercice ?? new Date().getFullYear()),
    statut: dossier?.statut ?? "a_preparer",
    montantDemande: euros(dossier?.montant_demande_centimes ?? null),
    montantNotifie: euros(dossier?.montant_notifie_centimes ?? null),
    dateDepot: dossier?.date_depot ?? "",
    dateNotification: dossier?.date_notification ?? "",
    echeance: dossier?.echeance ?? "",
    commentaire: dossier?.commentaire ?? "",
  });
  const [erreur, setErreur] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [enCours, demarrer] = useTransition();
  const maj = (k: keyof typeof f) => (e: { target: { value: string } }) => {
    setOk(false);
    setF({ ...f, [k]: e.target.value });
  };
  const champ = "w-full rounded-md border border-compta-border bg-white px-3 py-2 text-sm outline-none focus:border-compta-accent";
  const etiquette = "block text-xs font-medium text-compta-text-muted";

  // [07/11/2026] Après les hooks (ordre constant) : rien pour le lecteur.
  if (lectureSeule) return null;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        setErreur(null);
        demarrer(async () => {
          const r = await enregistrerSubventionAction(entiteId, dossier?.id ?? null, f);
          if (!r.success) {
            setErreur(r.error ?? "Enregistrement impossible.");
            return;
          }
          if (!dossier && r.id) router.push(`/${entiteId}/subventions/${r.id}`);
          else {
            setOk(true);
            router.refresh();
          }
        });
      }}
      className="grid grid-cols-1 gap-3 rounded-lg border border-compta-border bg-compta-surface p-4 sm:grid-cols-2"
    >
      <label className={etiquette}>
        Financeur
        <input value={f.financeur} onChange={maj("financeur")} required maxLength={120} placeholder="FDVA, Ville, CAF, ANS…" className={champ} />
      </label>
      <label className={etiquette}>
        Action financée
        <input value={f.action} onChange={maj("action")} required maxLength={200} placeholder="Fonctionnement, projet…" className={champ} />
      </label>
      <label className={etiquette}>
        Exercice
        <input value={f.exercice} onChange={maj("exercice")} inputMode="numeric" className={champ} />
      </label>
      <label className={etiquette}>
        Statut
        <select value={f.statut} onChange={maj("statut")} className={champ}>
          {Object.entries(LIBELLES_STATUT_SUBVENTION).map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </select>
      </label>
      <label className={etiquette}>
        Montant demandé (€, vide si inconnu)
        <input value={f.montantDemande} onChange={maj("montantDemande")} inputMode="decimal" className={champ} />
      </label>
      <label className={etiquette}>
        Montant notifié (€, vide si inconnu)
        <input value={f.montantNotifie} onChange={maj("montantNotifie")} inputMode="decimal" className={champ} />
      </label>
      <label className={etiquette}>
        Date de dépôt
        <input type="date" value={f.dateDepot} onChange={maj("dateDepot")} className={champ} />
      </label>
      <label className={etiquette}>
        Date de notification
        <input type="date" value={f.dateNotification} onChange={maj("dateNotification")} className={champ} />
      </label>
      <label className={etiquette}>
        Échéance (compte rendu, justification)
        <input type="date" value={f.echeance} onChange={maj("echeance")} className={champ} />
      </label>
      <label className={`${etiquette} sm:col-span-2`}>
        Commentaire
        <textarea value={f.commentaire} onChange={maj("commentaire")} rows={2} maxLength={1000} className={champ} />
      </label>
      <div className="flex items-center gap-3 sm:col-span-2">
        <button
          type="submit"
          disabled={enCours}
          className="rounded-md bg-compta-accent px-4 py-2 text-sm font-medium text-white hover:bg-compta-accent-hover disabled:opacity-50"
        >
          {dossier ? "Enregistrer" : "Créer le dossier"}
        </button>
        {ok && <span className="text-sm text-compta-recette">Enregistré.</span>}
        {erreur && <span className="text-sm text-compta-depense">{erreur}</span>}
      </div>
    </form>
  );
}
