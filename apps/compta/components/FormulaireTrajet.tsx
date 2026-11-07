"use client";

/**
 * Saisie d'un trajet IK (07/11/2026). Le montant s'affiche en direct avec le
 * MÊME calcul que le serveur (services/ik, entier, arrondi par trajet).
 * [07/11/2026] Le taux n'a AUCUNE valeur par défaut : le champ part vide et
 * l'association le saisit. On affiche seulement, en aide, le dernier taux
 * qu'elle a elle-même saisi ; après un enregistrement, le taux tapé reste
 * dans le champ pour enchaîner les trajets. La case « aller-retour » est
 * informative : elle ne double jamais la distance.
 */
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { formaterCentimes } from "@/lib/services/montants";
import { distanceVersCentikm, montantTrajet, tauxVersDixmillimes } from "@/lib/services/ik";
import { enregistrerTrajetAction } from "@/app/[entiteId]/ik/actions";
import { BOUTON, CHAMP, ETIQUETTE } from "@/components/FormulaireNoteFrais";

export function FormulaireTrajet({
  entiteId,
  dernierTaux,
  beneficiaires,
  aujourdHui,
}: {
  entiteId: string;
  /** Dernier taux saisi par l'association (« 0,321 »), affiché en aide ; "" si aucun. */
  dernierTaux: string;
  beneficiaires: string[];
  aujourdHui: string;
}) {
  const router = useRouter();
  const vide = { beneficiaire: "", date: aujourdHui, depart: "", arrivee: "", motif: "", distance: "", allerRetour: false, taux: "", commentaire: "" };
  const [f, setF] = useState(vide);
  const [erreur, setErreur] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [enCours, demarrer] = useTransition();
  const maj = (k: Exclude<keyof typeof f, "allerRetour">) => (e: { target: { value: string } }) => {
    setMessage(null);
    setF({ ...f, [k]: e.target.value });
  };
  const km = distanceVersCentikm(f.distance);
  const taux = tauxVersDixmillimes(f.taux);
  const apercu = km !== null && taux !== null ? montantTrajet(km, taux) : null;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        setErreur(null);
        setMessage(null);
        demarrer(async () => {
          const r = await enregistrerTrajetAction(entiteId, null, f);
          if (!r.success) {
            setErreur(r.error ?? "Enregistrement impossible.");
            return;
          }
          setMessage(r.avertissement ?? "Trajet enregistré.");
          // On garde la personne, la date et le taux : souvent plusieurs trajets à la suite.
          setF({ ...vide, beneficiaire: f.beneficiaire, date: f.date, taux: f.taux });
          router.refresh();
        });
      }}
      className="grid grid-cols-1 gap-3 rounded-lg border border-compta-border bg-compta-surface p-4 sm:grid-cols-3"
    >
      <label className={ETIQUETTE}>
        Personne
        <input value={f.beneficiaire} onChange={maj("beneficiaire")} required maxLength={120} list="ik-beneficiaires" className={CHAMP} />
        <datalist id="ik-beneficiaires">
          {beneficiaires.map((b) => (
            <option key={b} value={b} />
          ))}
        </datalist>
      </label>
      <label className={ETIQUETTE}>
        Date
        <input type="date" value={f.date} onChange={maj("date")} required className={CHAMP} />
      </label>
      <label className={ETIQUETTE}>
        Motif
        <input value={f.motif} onChange={maj("motif")} required maxLength={200} placeholder="Tournoi, réunion, achat…" className={CHAMP} />
      </label>
      <label className={ETIQUETTE}>
        Départ
        <input value={f.depart} onChange={maj("depart")} required maxLength={120} className={CHAMP} />
      </label>
      <label className={ETIQUETTE}>
        Arrivée
        <input value={f.arrivee} onChange={maj("arrivee")} required maxLength={120} className={CHAMP} />
      </label>
      <label className={ETIQUETTE}>
        Km réellement parcourus
        <input value={f.distance} onChange={maj("distance")} required inputMode="decimal" placeholder="Retour compris s'il a été fait" className={CHAMP} />
      </label>
      <label className={ETIQUETTE}>
        Taux retenu par l&apos;association (€ par km)
        <input value={f.taux} onChange={maj("taux")} required inputMode="decimal" placeholder="à saisir" className={CHAMP} />
        {dernierTaux && <span className="mt-1 block font-normal">Dernier taux saisi : {dernierTaux} €/km</span>}
      </label>
      <label className="flex items-center gap-2 pt-5 text-sm">
        <input type="checkbox" checked={f.allerRetour} onChange={(e) => setF({ ...f, allerRetour: e.target.checked })} />
        Aller-retour (information seulement, la distance n&apos;est pas doublée)
      </label>
      <div className="pt-5 text-sm">
        Montant : <span className="font-semibold tabular-nums">{apercu === null ? "à compléter" : formaterCentimes(apercu)}</span>
      </div>
      <label className={`${ETIQUETTE} sm:col-span-3`}>
        Commentaire
        <input value={f.commentaire} onChange={maj("commentaire")} maxLength={1000} className={CHAMP} />
      </label>
      <div className="flex flex-wrap items-center gap-3 sm:col-span-3">
        <button type="submit" disabled={enCours} className={BOUTON}>
          Enregistrer le trajet
        </button>
        {message && <span className={`text-sm ${message.startsWith("Doublon") ? "text-compta-depense" : "text-compta-recette"}`}>{message}</span>}
        {erreur && <span className="text-sm text-compta-depense">{erreur}</span>}
      </div>
    </form>
  );
}
