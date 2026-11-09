"use client";

/**
 * Création ou modification de l'en-tête d'un devis (09/11/2026). Le numéro
 * n'est jamais saisi : la base l'attribue (DEV-AAAA-NNN). Validité : une
 * durée en jours OU une date de fin. Le serveur revalide tout.
 */
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Devis } from "@/types/facturation";
import type { SaisieDevis } from "@/lib/services/facturation";
import { creerDevisAction, modifierDevisAction } from "@/app/[entiteId]/devis/actions";
import { BOUTON, CHAMP, ETIQUETTE } from "@/components/FormulaireNoteFrais";

export function FormulaireDevis({
  entiteId,
  devis,
  clients,
  aujourdHui,
}: {
  entiteId: string;
  devis?: Devis;
  clients: { id: string; nom: string }[];
  aujourdHui: string;
}) {
  const router = useRouter();
  const [f, setF] = useState<SaisieDevis>({
    clientId: devis?.client_id ?? clients[0]?.id ?? "",
    objet: devis?.objet ?? "",
    date: devis?.date_devis ?? aujourdHui,
    dateFin: devis?.date_fin_validite ?? "",
    dureeJours: devis ? "" : "30",
    notes: devis?.notes ?? "",
  });
  const [erreur, setErreur] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [enCours, demarrer] = useTransition();
  const maj = (k: keyof SaisieDevis) => (e: { target: { value: string } }) => {
    setOk(false);
    setF((x) => ({ ...x, [k]: e.target.value }));
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        setErreur(null);
        demarrer(async () => {
          const r = devis ? await modifierDevisAction(entiteId, devis.id, f) : await creerDevisAction(entiteId, f);
          if (!r.success) {
            setErreur(r.error ?? "Enregistrement impossible.");
            return;
          }
          if (!devis && "id" in r && r.id) router.push(`/${entiteId}/devis/${r.id}`);
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
        <select value={f.clientId} onChange={maj("clientId")} required className={CHAMP}>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nom}
            </option>
          ))}
        </select>
      </label>
      <label className={`${ETIQUETTE} sm:col-span-2`}>
        Objet
        <input value={f.objet} onChange={maj("objet")} maxLength={200} placeholder="Création d'un site, animation…" className={CHAMP} />
      </label>
      <label className={ETIQUETTE}>
        Date du devis
        <input type="date" value={f.date} onChange={maj("date")} required className={CHAMP} />
      </label>
      <label className={ETIQUETTE}>
        Durée de validité (jours)
        <input value={f.dureeJours} onChange={maj("dureeJours")} inputMode="numeric" disabled={Boolean(f.dateFin)} className={CHAMP} />
      </label>
      <label className={ETIQUETTE}>
        ou date de fin de validité
        <input type="date" value={f.dateFin} onChange={maj("dateFin")} className={CHAMP} />
      </label>
      <label className={`${ETIQUETTE} sm:col-span-3`}>
        Notes (conditions particulières, affichées sur le devis)
        <textarea value={f.notes} onChange={maj("notes")} rows={2} maxLength={2000} className={CHAMP} />
      </label>
      <div className="flex items-center gap-3 sm:col-span-3">
        <button type="submit" disabled={enCours || !f.clientId} className={BOUTON}>
          {devis ? "Enregistrer" : "Créer le devis"}
        </button>
        {ok && <span className="text-sm text-compta-recette">Enregistré.</span>}
        {erreur && <span className="text-sm text-compta-depense">{erreur}</span>}
      </div>
    </form>
  );
}
