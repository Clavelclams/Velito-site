"use client";

/**
 * Import d'un relevé PDF Crédit Mutuel — composant CLIENT (07/11/2026).
 *
 * 1. choisir le PDF → le serveur le lit et renvoie un aperçu (rien n'est écrit) ;
 * 2. vérifier : soldes, contrôle, lignes déjà présentes ;
 * 3. importer → le serveur RELIT le même fichier et écrit.
 *
 * Le fichier reste dans l'état du composant entre les deux étapes : on le
 * renvoie tel quel, le serveur ne fait pas confiance à l'aperçu.
 */
import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formaterCentimes } from "@/lib/services/montants";
import {
  analyserReleveAction,
  importerReleveAction,
  type ApercuReleve,
} from "@/app/[entiteId]/tresorerie/[compteId]/releve/actions";

function dateFr(iso: string): string {
  return `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;
}

export function ImportReleveCm({
  entiteId,
  compteId,
  lectureSeule = false,
}: {
  entiteId: string;
  compteId: string;
  /** [07/11/2026] Lecteur : la zone d'import n'est pas rendue. */
  lectureSeule?: boolean;
}) {
  const router = useRouter();
  const [fichier, setFichier] = useState<File | null>(null);
  const [apercu, setApercu] = useState<ApercuReleve | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [bilan, setBilan] = useState<string | null>(null);
  const [enCours, demarrer] = useTransition();

  function envoyer(f: File) {
    const fd = new FormData();
    fd.append("releve", f);
    return fd;
  }

  function analyser(f: File) {
    setFichier(f);
    setApercu(null);
    setErreur(null);
    setBilan(null);
    demarrer(async () => {
      const r = await analyserReleveAction(entiteId, compteId, envoyer(f));
      if (r.success && r.apercu) setApercu(r.apercu);
      else setErreur(r.error ?? "Lecture impossible.");
    });
  }

  function importer() {
    if (!fichier) return;
    setErreur(null);
    demarrer(async () => {
      const r = await importerReleveAction(entiteId, compteId, envoyer(fichier));
      if (!r.success) {
        setErreur(r.error ?? "Import impossible.");
        return;
      }
      setBilan(
        `${r.inserees} opération(s) ajoutée(s)` +
          (r.dejaPresentes ? `, ${r.dejaPresentes} déjà présente(s) ignorée(s)` : "") +
          (r.soldeInitialDefini ? ". Solde initial du compte repris de ce relevé" : "") +
          ".",
      );
      setApercu(null);
      setFichier(null);
      router.refresh();
    });
  }

  const juste = apercu?.ecartCentimes === 0;

  // [07/11/2026] Après tous les hooks (ordre constant) : rien pour le lecteur.
  if (lectureSeule) return null;

  return (
    <div className="space-y-5">
      <label className="block rounded-lg border border-dashed border-compta-border bg-compta-surface p-5 text-sm">
        <span className="mb-2 block font-medium">Relevé PDF</span>
        <input
          type="file"
          accept="application/pdf,.pdf"
          disabled={enCours}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) analyser(f);
            e.target.value = "";
          }}
          className="block w-full text-sm"
        />
        {enCours && <span className="mt-2 block text-compta-text-muted">Lecture en cours…</span>}
      </label>

      {erreur && <p className="rounded-md bg-compta-depense/10 p-3 text-sm text-compta-depense">{erreur}</p>}
      {bilan && (
        <p className="rounded-md bg-compta-recette/10 p-3 text-sm text-compta-recette">
          {bilan}{" "}
          <Link href={`/${entiteId}/tresorerie/${compteId}`} className="underline">
            Voir le contrôle du compte
          </Link>
        </p>
      )}

      {apercu && (
        <div className="space-y-4">
          <div className={`rounded-lg border p-4 text-sm ${juste ? "border-compta-recette/40 bg-compta-recette/5" : "border-compta-depense/40 bg-compta-depense/5"}`}>
            <p className="font-medium">{apercu.nomFichier}</p>
            <p className="mt-1 tabular-nums">
              Ouverture {formaterCentimes(apercu.ouverture.soldeCentimes)} au {dateFr(apercu.ouverture.date)} · crédits{" "}
              {formaterCentimes(apercu.totalCreditsCentimes)} · débits {formaterCentimes(apercu.totalDebitsCentimes)} · clôture{" "}
              {formaterCentimes(apercu.cloture.soldeCentimes)} au {dateFr(apercu.cloture.date)}
            </p>
            <p className={`mt-1 font-medium ${juste ? "text-compta-recette" : "text-compta-depense"}`}>
              {juste
                ? "Le relevé tombe juste."
                : `Écart de ${formaterCentimes(apercu.ecartCentimes)} : le relevé est mal lu, l'import est bloqué. Garde ce PDF : c'est un cas de lecture à corriger.`}
            </p>
          </div>

          <div className="overflow-x-auto rounded-lg border border-compta-border">
            <table className="w-full text-sm">
              <thead className="bg-compta-bg text-left text-xs uppercase text-compta-text-muted">
                <tr>
                  <th className="px-3 py-2 font-medium">Date</th>
                  <th className="px-3 py-2 font-medium">Libellé</th>
                  <th className="px-3 py-2 text-right font-medium">Montant</th>
                  <th className="px-3 py-2 font-medium">Classement</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-compta-border bg-compta-surface">
                {apercu.lignes.map((l, i) => (
                  <tr key={i} className={l.dejaPresente ? "opacity-50" : ""}>
                    <td className="whitespace-nowrap px-3 py-2">
                      {dateFr(l.date)}
                      {l.date !== l.dateImprimee && (
                        <span className="block text-xs text-compta-text-muted">imprimé {dateFr(l.dateImprimee)}</span>
                      )}
                    </td>
                    <td className="px-3 py-2">{l.libelle}</td>
                    <td className={`whitespace-nowrap px-3 py-2 text-right tabular-nums ${l.type === "recette" ? "text-compta-recette" : "text-compta-depense"}`}>
                      {l.type === "recette" ? "+" : "−"}
                      {formaterCentimes(l.montantCentimes)}
                    </td>
                    <td className="px-3 py-2 text-xs text-compta-text-muted">
                      {l.dejaPresente ? "Déjà importée" : l.categorie ? `${l.categorie} (à valider)` : "À classer"}
                    </td>
                  </tr>
                ))}
                {apercu.lignes.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-3 py-4 text-center text-compta-text-muted">
                      Aucun mouvement ce mois-ci : seul le solde sera enregistré.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={importer}
              disabled={!juste || enCours}
              className="rounded-md bg-compta-accent px-4 py-2 text-sm font-medium text-white hover:bg-compta-accent-hover disabled:opacity-50"
            >
              {apercu.nouvelles > 0 ? `Importer ${apercu.nouvelles} opération(s)` : "Enregistrer les soldes du relevé"}
            </button>
            {apercu.dejaPresentes > 0 && (
              <span className="text-sm text-compta-text-muted">{apercu.dejaPresentes} déjà présente(s), ignorée(s).</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
