"use client";

/**
 * Création ou modification d'un client (09/11/2026). Pour un professionnel,
 * le SIREN est exigé à l'émission d'une facture (réforme de la facturation
 * électronique) ; il reste facultatif à la saisie. Le serveur revalide tout.
 */
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { ClientFacturation } from "@/types/facturation";
import type { SaisieClient } from "@/lib/services/facturation";
import { creerClientAction, modifierClientAction, supprimerClientAction } from "@/app/[entiteId]/clients/actions";
import { BOUTON, CHAMP, ETIQUETTE } from "@/components/FormulaireNoteFrais";

export function FormulaireClient({ entiteId, client }: { entiteId: string; client?: ClientFacturation }) {
  const router = useRouter();
  const [f, setF] = useState<SaisieClient>({
    typeClient: client?.type_client ?? "professionnel",
    nom: client?.nom ?? "",
    siren: client?.siren ?? "",
    numeroTvaIntra: client?.numero_tva_intra ?? "",
    adresseFacturation: client?.adresse_facturation ?? "",
    adresseLivraison: client?.adresse_livraison ?? "",
    email: client?.email ?? "",
    commentaire: client?.commentaire ?? "",
  });
  const [erreur, setErreur] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [enCours, demarrer] = useTransition();
  const maj = (k: keyof SaisieClient) => (e: { target: { value: string } }) => {
    setOk(false);
    setF((x) => ({ ...x, [k]: e.target.value }));
  };
  const pro = f.typeClient === "professionnel";

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        setErreur(null);
        demarrer(async () => {
          const r = client ? await modifierClientAction(entiteId, client.id, f) : await creerClientAction(entiteId, f);
          if (!r.success) {
            setErreur(r.error ?? "Enregistrement impossible.");
            return;
          }
          if (!client) {
            setF({ typeClient: "professionnel", nom: "", siren: "", numeroTvaIntra: "", adresseFacturation: "", adresseLivraison: "", email: "", commentaire: "" });
          }
          setOk(true);
          router.refresh();
        });
      }}
      className="grid grid-cols-1 gap-3 rounded-lg border border-compta-border bg-compta-surface p-4 sm:grid-cols-3"
    >
      <label className={ETIQUETTE}>
        Type
        <select value={f.typeClient} onChange={maj("typeClient")} className={CHAMP}>
          <option value="professionnel">Professionnel</option>
          <option value="particulier">Particulier</option>
        </select>
      </label>
      <label className={ETIQUETTE}>
        Nom ou raison sociale
        <input value={f.nom} onChange={maj("nom")} required maxLength={200} className={CHAMP} />
      </label>
      <label className={ETIQUETTE}>
        E-mail
        <input type="email" value={f.email} onChange={maj("email")} maxLength={200} className={CHAMP} />
      </label>
      {pro && (
        <>
          <label className={ETIQUETTE}>
            SIREN (exigé pour facturer un professionnel)
            <input value={f.siren} onChange={maj("siren")} inputMode="numeric" className={CHAMP} />
          </label>
          <label className={ETIQUETTE}>
            N° de TVA intracommunautaire (facultatif)
            <input value={f.numeroTvaIntra} onChange={maj("numeroTvaIntra")} className={CHAMP} />
          </label>
          <div />
        </>
      )}
      <label className={`${ETIQUETTE} sm:col-span-3`}>
        Adresse de facturation
        <textarea value={f.adresseFacturation} onChange={maj("adresseFacturation")} rows={2} maxLength={500} className={CHAMP} />
      </label>
      <label className={`${ETIQUETTE} sm:col-span-3`}>
        Adresse de livraison (seulement si différente)
        <textarea value={f.adresseLivraison} onChange={maj("adresseLivraison")} rows={2} maxLength={500} className={CHAMP} />
      </label>
      <label className={`${ETIQUETTE} sm:col-span-3`}>
        Commentaire interne (n&apos;apparaît sur aucun document)
        <input value={f.commentaire} onChange={maj("commentaire")} maxLength={1000} className={CHAMP} />
      </label>
      <div className="flex flex-wrap items-center gap-3 sm:col-span-3">
        <button type="submit" disabled={enCours} className={BOUTON}>
          {client ? "Enregistrer" : "Ajouter le client"}
        </button>
        {client && (
          <button
            type="button"
            disabled={enCours}
            onClick={() => {
              if (!window.confirm("Supprimer ce client ? Impossible s'il figure sur un devis ou une facture.")) return;
              setErreur(null);
              demarrer(async () => {
                const r = await supprimerClientAction(entiteId, client.id);
                if (r && !r.success) setErreur(r.error ?? "Suppression impossible.");
              });
            }}
            className="text-xs text-compta-depense underline-offset-2 hover:underline disabled:opacity-50"
          >
            Supprimer le client
          </button>
        )}
        {ok && <span className="text-sm text-compta-recette">Enregistré.</span>}
        {erreur && <span className="text-sm text-compta-depense">{erreur}</span>}
      </div>
    </form>
  );
}
