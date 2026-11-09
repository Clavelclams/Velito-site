"use client";

/**
 * Paramètres du vendeur pour les devis et factures (09/11/2026).
 *
 * Chaque mention est un champ ; vide = inconnu (NULL), jamais inventé. Deux
 * textes peuvent être PRÉREMPLIS comme suggestion modifiable : la mention de
 * TVA (selon le régime choisi, seulement si le champ est vide) et
 * l'indemnité forfaitaire de recouvrement. Le serveur revalide tout.
 */
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { ParametresFacturation } from "@/types/facturation";
import { centimesVersSaisie } from "@/lib/services/montants";
import { LIBELLES_REGIME, MENTION_INDEMNITE_SUGGEREE, RAPPEL_EXPERT, suggestionMentionTva, type SaisieParametres } from "@/lib/services/facturation";
import { enregistrerParametresAction } from "@/app/[entiteId]/facturation/parametres/actions";
import { BOUTON, BOUTON_SECONDAIRE, CHAMP, ETIQUETTE } from "@/components/FormulaireNoteFrais";

export function FormulaireParametresFacturation({
  entiteId,
  parametres,
  estSociete,
}: {
  entiteId: string;
  parametres: ParametresFacturation | null;
  /** Société : capital social et ville du RCS sont des mentions obligatoires. */
  estSociete: boolean;
}) {
  const router = useRouter();
  const p = parametres;
  const [f, setF] = useState<SaisieParametres>({
    denomination: p?.denomination ?? "",
    formeJuridique: p?.forme_juridique ?? "",
    capitalSocial: p?.capital_social_centimes != null ? centimesVersSaisie(Number(p.capital_social_centimes)) : "",
    adresse: p?.adresse ?? "",
    siren: p?.siren ?? "",
    siret: p?.siret ?? "",
    villeRcs: p?.ville_rcs ?? "",
    numeroTvaIntra: p?.numero_tva_intra ?? "",
    regimeTva: p?.regime_tva ?? "",
    mentionTva: p?.mention_tva ?? "",
    conditionsPaiement: p?.conditions_paiement ?? "",
    penalitesRetard: p?.penalites_retard ?? "",
    indemniteRecouvrement: p?.indemnite_recouvrement ?? "",
    iban: p?.iban ?? "",
    email: p?.email ?? "",
  });
  const [erreur, setErreur] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [enCours, demarrer] = useTransition();
  const maj = (k: keyof SaisieParametres) => (e: { target: { value: string } }) => {
    setOk(false);
    setF((x) => ({ ...x, [k]: e.target.value }));
  };

  // [09/11/2026] Changer de régime propose la mention correspondante SEULEMENT
  // si le champ est vide : un texte déjà saisi n'est jamais écrasé.
  const changerRegime = (e: { target: { value: string } }) => {
    const regime = e.target.value;
    setOk(false);
    setF((x) => ({
      ...x,
      regimeTva: regime,
      mentionTva: x.mentionTva.trim() ? x.mentionTva : (suggestionMentionTva(regime as ParametresFacturation["regime_tva"]) ?? ""),
    }));
  };
  const suggestion = suggestionMentionTva(f.regimeTva as ParametresFacturation["regime_tva"]);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        setErreur(null);
        demarrer(async () => {
          const r = await enregistrerParametresAction(entiteId, f);
          if (!r.success) {
            setErreur(r.error ?? "Enregistrement impossible.");
            return;
          }
          setOk(true);
          router.refresh();
        });
      }}
      className="space-y-5 rounded-lg border border-compta-border bg-compta-surface p-4"
    >
      <fieldset className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <legend className="mb-2 text-sm font-semibold">Identité</legend>
        <label className={ETIQUETTE}>
          Dénomination
          <input value={f.denomination} onChange={maj("denomination")} maxLength={200} className={CHAMP} />
        </label>
        <label className={ETIQUETTE}>
          Forme juridique
          <input value={f.formeJuridique} onChange={maj("formeJuridique")} maxLength={100} placeholder="SASU, association loi 1901…" className={CHAMP} />
        </label>
        <label className={ETIQUETTE}>
          Capital social (€){estSociete ? "" : " (sans objet pour une association)"}
          <input value={f.capitalSocial} onChange={maj("capitalSocial")} inputMode="decimal" className={CHAMP} />
        </label>
        <label className={`${ETIQUETTE} sm:col-span-3`}>
          Adresse (une ligne par ligne d&apos;adresse)
          <textarea value={f.adresse} onChange={maj("adresse")} rows={3} maxLength={500} className={CHAMP} />
        </label>
        <label className={ETIQUETTE}>
          SIREN (9 chiffres)
          <input value={f.siren} onChange={maj("siren")} inputMode="numeric" className={CHAMP} />
        </label>
        <label className={ETIQUETTE}>
          SIRET (14 chiffres)
          <input value={f.siret} onChange={maj("siret")} inputMode="numeric" className={CHAMP} />
        </label>
        <label className={ETIQUETTE}>
          Ville du RCS{estSociete ? "" : " (sans objet pour une association)"}
          <input value={f.villeRcs} onChange={maj("villeRcs")} maxLength={100} className={CHAMP} />
        </label>
        <label className={ETIQUETTE}>
          E-mail de contact (facultatif)
          <input type="email" value={f.email} onChange={maj("email")} maxLength={200} className={CHAMP} />
        </label>
      </fieldset>

      <fieldset className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <legend className="mb-2 text-sm font-semibold">TVA</legend>
        <label className={ETIQUETTE}>
          Régime de TVA
          <select value={f.regimeTva} onChange={changerRegime} className={CHAMP}>
            <option value="">À compléter</option>
            {Object.entries(LIBELLES_REGIME).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </label>
        <label className={ETIQUETTE}>
          N° de TVA intracommunautaire (facultatif)
          <input value={f.numeroTvaIntra} onChange={maj("numeroTvaIntra")} className={CHAMP} />
        </label>
        <div />
        <label className={`${ETIQUETTE} sm:col-span-3`}>
          Mention de TVA affichée sur les documents
          <input value={f.mentionTva} onChange={maj("mentionTva")} maxLength={300} className={CHAMP} />
        </label>
        <div className="flex flex-wrap items-center gap-3 text-xs text-compta-text-muted sm:col-span-3">
          {suggestion && f.mentionTva !== suggestion && (
            <button type="button" className={BOUTON_SECONDAIRE} onClick={() => setF((x) => ({ ...x, mentionTva: suggestion }))}>
              Proposer « {suggestion} »
            </button>
          )}
          <span>{RAPPEL_EXPERT} En franchise ou sans TVA, chaque ligne doit avoir un taux de 0.</span>
        </div>
      </fieldset>

      <fieldset className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <legend className="mb-2 text-sm font-semibold">Paiement</legend>
        <label className={`${ETIQUETTE} sm:col-span-2`}>
          Conditions de paiement
          <input value={f.conditionsPaiement} onChange={maj("conditionsPaiement")} maxLength={500} placeholder="Paiement à réception, à 30 jours…" className={CHAMP} />
        </label>
        <label className={`${ETIQUETTE} sm:col-span-2`}>
          Taux des pénalités de retard (texte, exigé pour un client professionnel)
          <input value={f.penalitesRetard} onChange={maj("penalitesRetard")} maxLength={500} className={CHAMP} />
        </label>
        <label className={`${ETIQUETTE} sm:col-span-2`}>
          Indemnité forfaitaire pour frais de recouvrement (texte, exigé pour un client professionnel)
          <input value={f.indemniteRecouvrement} onChange={maj("indemniteRecouvrement")} maxLength={500} className={CHAMP} />
        </label>
        <div className="flex flex-wrap items-center gap-3 text-xs text-compta-text-muted sm:col-span-2">
          {!f.indemniteRecouvrement.trim() && (
            <button type="button" className={BOUTON_SECONDAIRE} onClick={() => setF((x) => ({ ...x, indemniteRecouvrement: MENTION_INDEMNITE_SUGGEREE }))}>
              Préremplir l&apos;indemnité
            </button>
          )}
          <span>{RAPPEL_EXPERT}</span>
        </div>
        <label className={`${ETIQUETTE} sm:col-span-2`}>
          IBAN (facultatif, affiché sur la facture)
          <input value={f.iban} onChange={maj("iban")} className={CHAMP} />
        </label>
      </fieldset>

      <div className="flex items-center gap-3">
        <button type="submit" disabled={enCours} className={BOUTON}>
          Enregistrer
        </button>
        {ok && <span className="text-sm text-compta-recette">Enregistré.</span>}
        {erreur && <span className="text-sm text-compta-depense">{erreur}</span>}
      </div>
    </form>
  );
}
