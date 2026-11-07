"use client";

/**
 * Bénévolat et contributions en nature — formulaires (07/11/2026) :
 *  - reprendre les heures pointées sur vea.velito.fr (association seulement) ;
 *  - ajouter une fiche à la main (heures, don en nature, frais abandonnés) ;
 *  - changer le statut d'une fiche (vérifier, annuler) ou la supprimer.
 * Le taux horaire est toujours choisi par l'association : aucun taux par défaut.
 */
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { StatutContribution, TypeContribution } from "@/types/database";
import { LIBELLES_TYPE_CONTRIBUTION } from "@/lib/services/benevolat";
import {
  ajouterContributionAction,
  changerStatutContributionAction,
  reprendreHeuresVeaAction,
  supprimerContributionAction,
} from "@/app/[entiteId]/benevolat/actions";

const champ = "rounded-md border border-compta-border bg-white px-3 py-2 text-sm outline-none focus:border-compta-accent";
const bouton = "rounded-md bg-compta-accent px-4 py-2 text-sm font-medium text-white hover:bg-compta-accent-hover disabled:opacity-50";

export function RepriseVea({
  entiteId,
  exercice,
  lectureSeule = false,
}: {
  entiteId: string;
  exercice: number;
  /** [07/11/2026] Lecteur : la reprise n'est pas rendue. */
  lectureSeule?: boolean;
}) {
  const router = useRouter();
  const [taux, setTaux] = useState("");
  const [message, setMessage] = useState<{ ok: boolean; texte: string } | null>(null);
  const [enCours, demarrer] = useTransition();
  // [07/11/2026] Après les hooks (ordre constant) : rien pour le lecteur.
  if (lectureSeule) return null;
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        setMessage(null);
        demarrer(async () => {
          const r = await reprendreHeuresVeaAction(entiteId, String(exercice), taux);
          setMessage({ ok: r.success, texte: r.success ? r.message ?? "Fait." : r.error ?? "Reprise impossible." });
          if (r.success) router.refresh();
        });
      }}
      className="space-y-2 rounded-lg border border-compta-border bg-compta-surface p-4 text-sm"
    >
      <p className="font-medium">Reprendre les heures pointées sur vea.velito.fr ({exercice})</p>
      <p className="text-xs text-compta-text-muted">
        Une fiche par événement : total des heures « aider » et nombre de bénévoles, sans aucun nom. Les fiches
        arrivent « À vérifier ». Relancer ne crée pas de doublon.
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <input value={taux} onChange={(e) => setTaux(e.target.value)} inputMode="decimal" placeholder="Taux horaire retenu (€)" className={champ} />
        <button type="submit" disabled={enCours} className={bouton}>
          Reprendre
        </button>
      </div>
      {message && <p className={message.ok ? "text-compta-recette" : "text-compta-depense"}>{message.texte}</p>}
    </form>
  );
}

export function AjoutContribution({
  entiteId,
  lectureSeule = false,
}: {
  entiteId: string;
  /** [07/11/2026] Lecteur : le formulaire d'ajout n'est pas rendu. */
  lectureSeule?: boolean;
}) {
  const router = useRouter();
  const vide = { type: "heures_benevoles", date: "", libelle: "", duree: "", tauxHoraire: "", nbPersonnes: "", valeur: "", dateRenonciation: "", commentaire: "" };
  const [f, setF] = useState(vide);
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, demarrer] = useTransition();
  const maj = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });
  const heures = f.type === "heures_benevoles";

  // [07/11/2026] Après les hooks (ordre constant) : rien pour le lecteur.
  if (lectureSeule) return null;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        setErreur(null);
        demarrer(async () => {
          const r = await ajouterContributionAction(entiteId, f);
          if (r.success) {
            setF({ ...vide, type: f.type, tauxHoraire: f.tauxHoraire });
            router.refresh();
          } else setErreur(r.error ?? "Enregistrement impossible.");
        });
      }}
      className="grid grid-cols-1 gap-2 rounded-lg border border-compta-border bg-compta-surface p-4 text-sm sm:grid-cols-2"
    >
      <select value={f.type} onChange={maj("type")} aria-label="Type" className={champ}>
        {Object.entries(LIBELLES_TYPE_CONTRIBUTION).map(([v, l]) => (
          <option key={v} value={v}>
            {l}
          </option>
        ))}
      </select>
      <input type="date" value={f.date} onChange={maj("date")} aria-label="Date" className={champ} required />
      <input value={f.libelle} onChange={maj("libelle")} placeholder="Description (événement, objet donné…)" maxLength={255} className={`${champ} sm:col-span-2`} required />
      {heures ? (
        <>
          <input value={f.duree} onChange={maj("duree")} placeholder="Durée totale (3, 2,5 ou 2h30)" className={champ} />
          <input value={f.tauxHoraire} onChange={maj("tauxHoraire")} inputMode="decimal" placeholder="Taux horaire retenu (€)" className={champ} />
          <input value={f.nbPersonnes} onChange={maj("nbPersonnes")} inputMode="numeric" placeholder="Nombre de bénévoles (facultatif)" className={champ} />
        </>
      ) : (
        <input value={f.valeur} onChange={maj("valeur")} inputMode="decimal" placeholder="Valeur (€)" className={champ} />
      )}
      {f.type === "frais_abandonnes" && (
        <label className="text-xs text-compta-text-muted">
          Date de la renonciation écrite au remboursement
          <input type="date" value={f.dateRenonciation} onChange={maj("dateRenonciation")} className={`${champ} w-full`} />
        </label>
      )}
      <textarea value={f.commentaire} onChange={maj("commentaire")} rows={2} maxLength={1000} placeholder="Commentaire (preuve, méthode de valorisation…)" className={`${champ} sm:col-span-2`} />
      <div className="flex items-center gap-3 sm:col-span-2">
        <button type="submit" disabled={enCours} className={bouton}>
          Ajouter
        </button>
        {erreur && <span className="text-compta-depense">{erreur}</span>}
      </div>
    </form>
  );
}

export function ActionsContribution({
  entiteId,
  id,
  statut,
  type,
  lectureSeule = false,
}: {
  entiteId: string;
  id: string;
  statut: StatutContribution;
  type: TypeContribution;
  /** [07/11/2026] Lecteur : aucun bouton (vérifier, annuler, supprimer). */
  lectureSeule?: boolean;
}) {
  const router = useRouter();
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, demarrer] = useTransition();
  const lancer = (fn: () => Promise<{ success: boolean; error?: string }>) => {
    setErreur(null);
    demarrer(async () => {
      const r = await fn();
      if (r.success) router.refresh();
      else setErreur(r.error ?? "Action impossible.");
    });
  };
  const lien = "text-xs text-compta-accent hover:underline disabled:opacity-50";
  // [07/11/2026] Après les hooks (ordre constant) : rien pour le lecteur.
  if (lectureSeule) return null;
  return (
    <span className="flex flex-wrap items-center justify-end gap-3">
      {statut !== "verifie" && statut !== "annule" && (
        <button type="button" disabled={enCours} className={lien} onClick={() => lancer(() => changerStatutContributionAction(entiteId, id, "verifie"))}>
          Vérifier
        </button>
      )}
      {statut === "verifie" && (
        <button type="button" disabled={enCours} className={lien} onClick={() => lancer(() => changerStatutContributionAction(entiteId, id, "a_verifier"))}>
          Revoir
        </button>
      )}
      {statut !== "annule" && (
        <button type="button" disabled={enCours} className={lien} onClick={() => lancer(() => changerStatutContributionAction(entiteId, id, "annule"))}>
          Annuler
        </button>
      )}
      <button
        type="button"
        disabled={enCours}
        className="text-xs text-compta-depense hover:underline disabled:opacity-50"
        onClick={() => {
          if (window.confirm(type === "heures_benevoles" ? "Supprimer cette fiche ? Une reprise VEA pourra la recréer." : "Supprimer cette fiche ?"))
            lancer(() => supprimerContributionAction(entiteId, id));
        }}
      >
        Supprimer
      </button>
      {erreur && <span className="w-full text-right text-xs text-compta-depense">{erreur}</span>}
    </span>
  );
}
