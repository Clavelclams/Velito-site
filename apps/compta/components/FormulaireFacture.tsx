"use client";

/**
 * Création ou modification de l'en-tête d'un BROUILLON de facture ou
 * d'avoir (09/11/2026). Aucun numéro ici : la base attribue le numéro légal
 * à l'émission. Tout peut rester vide en brouillon ; l'émission exige les
 * mentions obligatoires. Le serveur revalide tout.
 */
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Facture } from "@/types/facturation";
import { LIBELLES_NATURE, type SaisieFacture } from "@/lib/services/facturation";
import { creerFactureAction, modifierFactureAction } from "@/app/[entiteId]/factures/actions";
import { BOUTON, CHAMP, ETIQUETTE } from "@/components/FormulaireNoteFrais";

export function FormulaireFacture({
  entiteId,
  facture,
  clients,
}: {
  entiteId: string;
  facture?: Facture;
  clients: { id: string; nom: string }[];
}) {
  const router = useRouter();
  const [f, setF] = useState<SaisieFacture>({
    clientId: facture?.client_id ?? clients[0]?.id ?? "",
    objet: facture?.objet ?? "",
    dateEmission: facture?.date_emission ?? "",
    datePrestation: facture?.date_prestation ?? "",
    dateEcheance: facture?.date_echeance ?? "",
    natureOperation: facture?.nature_operation ?? "",
    tvaSurDebits: facture?.tva_sur_debits ?? false,
    notes: facture?.notes ?? "",
  });
  const [erreur, setErreur] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [enCours, demarrer] = useTransition();
  const maj = (k: keyof SaisieFacture) => (e: { target: { value: string } }) => {
    setOk(false);
    setF((x) => ({ ...x, [k]: e.target.value }));
  };
  const avoir = facture?.sens === "avoir";

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        setErreur(null);
        demarrer(async () => {
          const r = facture ? await modifierFactureAction(entiteId, facture.id, f) : await creerFactureAction(entiteId, f);
          if (!r.success) {
            setErreur(r.error ?? "Enregistrement impossible.");
            return;
          }
          if (!facture && "id" in r && r.id) router.push(`/${entiteId}/factures/${r.id}`);
          else {
            setOk(true);
            router.refresh();
          }
        });
      }}
      className="grid grid-cols-1 gap-3 rounded-lg border border-compta-border bg-compta-surface p-4 sm:grid-cols-3"
    >
      <label className={ETIQUETTE}>
        Client
        {/* Un avoir s'adresse au client de la facture d'origine : pas de changement. */}
        <select value={f.clientId} onChange={maj("clientId")} required disabled={avoir} className={CHAMP}>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nom}
            </option>
          ))}
        </select>
      </label>
      <label className={`${ETIQUETTE} sm:col-span-2`}>
        Objet
        <input value={f.objet} onChange={maj("objet")} maxLength={200} className={CHAMP} />
      </label>
      <label className={ETIQUETTE}>
        Date d&apos;émission (vide = à fixer avant d&apos;émettre)
        <input type="date" value={f.dateEmission} onChange={maj("dateEmission")} className={CHAMP} />
      </label>
      <label className={ETIQUETTE}>
        Date de la prestation ou de la livraison
        <input type="date" value={f.datePrestation} onChange={maj("datePrestation")} className={CHAMP} />
      </label>
      {!avoir && (
        <label className={ETIQUETTE}>
          Date d&apos;échéance
          <input type="date" value={f.dateEcheance} onChange={maj("dateEcheance")} className={CHAMP} />
        </label>
      )}
      <label className={ETIQUETTE}>
        Nature de l&apos;opération
        <select value={f.natureOperation} onChange={maj("natureOperation")} className={CHAMP}>
          <option value="">À compléter</option>
          {Object.entries(LIBELLES_NATURE).map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </select>
      </label>
      <label className="flex items-center gap-2 text-sm sm:col-span-2">
        <input
          type="checkbox"
          checked={f.tvaSurDebits}
          onChange={(e) => {
            setOk(false);
            setF((x) => ({ ...x, tvaSurDebits: e.target.checked }));
          }}
        />
        Option pour le paiement de la TVA d&apos;après les débits
      </label>
      <label className={`${ETIQUETTE} sm:col-span-3`}>
        Notes (affichées sur le document)
        <textarea value={f.notes} onChange={maj("notes")} rows={2} maxLength={2000} className={CHAMP} />
      </label>
      <div className="flex items-center gap-3 sm:col-span-3">
        <button type="submit" disabled={enCours || !f.clientId} className={BOUTON}>
          {facture ? "Enregistrer le brouillon" : "Créer le brouillon"}
        </button>
        {ok && <span className="text-sm text-compta-recette">Enregistré.</span>}
        {erreur && <span className="text-sm text-compta-depense">{erreur}</span>}
      </div>
    </form>
  );
}
