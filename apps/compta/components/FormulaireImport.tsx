"use client";

/**
 * Import d'un relevé bancaire CSV — composant CLIENT.
 *
 * Étapes, toutes en direct dans la page (pas de rechargement) :
 *  1. coller le CSV ou charger un fichier ;
 *  2. régler séparateur / en-tête / format de date et MAPPER les colonnes ;
 *  3. prévisualiser (lignes valides vs en erreur) ;
 *  4. importer → les lignes valides partent en base en statut « à vérifier ».
 *
 * Le parsing utilise le MÊME service pur que le serveur (import-csv.ts) : ce
 * qu'on prévisualise est exactement ce que le serveur revalidera.
 */
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  decouperCsv,
  detecterSeparateur,
  construireLignesImport,
  type FormatDate,
  type OptionsImport,
} from "@/lib/services/import-csv";
import { formaterCentimes } from "@/lib/services/montants";
import { eurosVersCentimes } from "@/lib/services/montants";
import { importerTransactionsAction } from "@/app/[entiteId]/import/actions";

export function FormulaireImport({ entiteId }: { entiteId: string }) {
  const router = useRouter();
  const [texte, setTexte] = useState("");
  const [separateur, setSeparateur] = useState(";");
  const [aEntete, setAEntete] = useState(true);
  const [formatDate, setFormatDate] = useState<FormatDate>("JJ/MM/AAAA");
  const [colDate, setColDate] = useState(0);
  const [colLibelle, setColLibelle] = useState(1);
  const [colMontant, setColMontant] = useState(2);
  const [message, setMessage] = useState<string | null>(null);
  const [enCours, demarrer] = useTransition();

  // Recalcule la matrice + les lignes à chaque changement (aperçu en direct).
  const matrice = useMemo(
    () => (texte.trim() ? decouperCsv(texte, separateur) : []),
    [texte, separateur],
  );

  const nbColonnes = matrice[0]?.length ?? 0;
  const enTetes = useMemo(() => {
    if (matrice.length === 0) return [];
    if (aEntete) return matrice[0]!;
    return matrice[0]!.map((_, i) => `Colonne ${i + 1}`);
  }, [matrice, aEntete]);

  const options: OptionsImport = {
    separateur,
    aEntete,
    formatDate,
    colonneDate: colDate,
    colonneLibelle: colLibelle,
    colonneMontant: colMontant,
  };

  const lignes = useMemo(
    () => (matrice.length ? construireLignesImport(matrice, options, entiteId) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [matrice, aEntete, formatDate, colDate, colLibelle, colMontant, entiteId],
  );

  const valides = lignes.filter((l) => l.ok);
  const enErreur = lignes.filter((l) => !l.ok);

  function chargerFichier(e: React.ChangeEvent<HTMLInputElement>) {
    const fichier = e.target.files?.[0];
    if (!fichier) return;
    const lecteur = new FileReader();
    lecteur.onload = () => {
      const contenu = String(lecteur.result ?? "");
      setTexte(contenu);
      setSeparateur(detecterSeparateur(contenu)); // pré-règle le séparateur
    };
    lecteur.readAsText(fichier, "utf-8");
  }

  function importer() {
    setMessage(null);
    demarrer(async () => {
      const saisies = valides.map((l) => l.saisie!);
      const r = await importerTransactionsAction(entiteId, saisies);
      if (r.success) {
        router.push(`/${entiteId}/transactions`);
      } else {
        setMessage(r.error ?? "Import impossible.");
      }
    });
  }

  const styleChamp =
    "rounded-md border border-compta-border bg-white px-3 py-2 text-sm outline-none focus:border-compta-accent";

  return (
    <div className="space-y-6">
      {/* ---- 1. Source ---- */}
      <div className="space-y-3 rounded-lg border border-compta-border bg-compta-surface p-5">
        <label className="block">
          <span className="mb-1 block text-sm font-medium">
            Colle le contenu du relevé CSV
          </span>
          <textarea
            value={texte}
            onChange={(e) => {
              setTexte(e.target.value);
              if (e.target.value.trim()) setSeparateur(detecterSeparateur(e.target.value));
            }}
            rows={6}
            placeholder="Date;Libellé;Montant&#10;03/07/2026;Subvention;500,00&#10;10/07/2026;Achat;-45,90"
            className={`w-full font-mono text-xs ${styleChamp}`}
          />
        </label>
        <div className="text-sm text-compta-text-muted">
          ou{" "}
          <label className="cursor-pointer text-compta-accent hover:underline">
            charge un fichier .csv
            <input type="file" accept=".csv,text/csv" onChange={chargerFichier} className="hidden" />
          </label>
        </div>
      </div>

      {matrice.length > 0 && (
        <>
          {/* ---- 2. Réglages + mapping ---- */}
          <div className="grid gap-4 rounded-lg border border-compta-border bg-compta-surface p-5 sm:grid-cols-2">
            <label className="flex flex-col gap-1">
              <span className="text-sm font-medium">Séparateur</span>
              <select value={separateur} onChange={(e) => setSeparateur(e.target.value)} className={styleChamp}>
                <option value=";">point-virgule ( ; )</option>
                <option value=",">virgule ( , )</option>
              </select>
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-sm font-medium">Format de date</span>
              <select
                value={formatDate}
                onChange={(e) => setFormatDate(e.target.value as FormatDate)}
                className={styleChamp}
              >
                <option value="JJ/MM/AAAA">JJ/MM/AAAA</option>
                <option value="AAAA-MM-JJ">AAAA-MM-JJ</option>
              </select>
            </label>

            <label className="flex items-center gap-2 sm:col-span-2">
              <input type="checkbox" checked={aEntete} onChange={(e) => setAEntete(e.target.checked)} />
              <span className="text-sm">La première ligne est un en-tête (à ignorer)</span>
            </label>

            <ChoixColonne label="Colonne Date" valeur={colDate} onChange={setColDate} enTetes={enTetes} nb={nbColonnes} styleChamp={styleChamp} />
            <ChoixColonne label="Colonne Libellé" valeur={colLibelle} onChange={setColLibelle} enTetes={enTetes} nb={nbColonnes} styleChamp={styleChamp} />
            <ChoixColonne label="Colonne Montant (signé)" valeur={colMontant} onChange={setColMontant} enTetes={enTetes} nb={nbColonnes} styleChamp={styleChamp} />
          </div>

          {/* ---- 3. Aperçu ---- */}
          <div className="rounded-lg border border-compta-border bg-compta-surface p-5">
            <p className="mb-3 text-sm">
              <span className="font-semibold text-compta-recette">{valides.length}</span> ligne(s) prête(s),{" "}
              <span className="font-semibold text-compta-depense">{enErreur.length}</span> en erreur.
            </p>

            <div className="max-h-72 overflow-auto rounded-md border border-compta-border">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-compta-bg text-left text-compta-text-muted">
                  <tr>
                    <th className="px-2 py-1.5 font-medium">Date</th>
                    <th className="px-2 py-1.5 font-medium">Libellé</th>
                    <th className="px-2 py-1.5 text-right font-medium">Montant</th>
                    <th className="px-2 py-1.5 font-medium">État</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-compta-border">
                  {lignes.slice(0, 50).map((l) => (
                    <tr key={l.numero} className={l.ok ? "" : "bg-compta-depense/5"}>
                      <td className="px-2 py-1.5">{l.saisie?.dateTransaction ?? "—"}</td>
                      <td className="px-2 py-1.5">{l.saisie?.libelle ?? l.brut[colLibelle] ?? ""}</td>
                      <td
                        className={`px-2 py-1.5 text-right tabular-nums ${
                          l.saisie?.type === "recette" ? "text-compta-recette" : "text-compta-depense"
                        }`}
                      >
                        {l.saisie ? formaterCentimes(eurosVersCentimes(l.saisie.montantTtc) ?? 0) : ""}
                      </td>
                      <td className="px-2 py-1.5">
                        {l.ok ? (
                          <span className="text-compta-recette">OK</span>
                        ) : (
                          <span className="text-compta-depense">{l.erreur}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {lignes.length > 50 && (
              <p className="mt-2 text-xs text-compta-text-muted">
                Aperçu limité à 50 lignes — l&apos;import traitera les {lignes.length}.
              </p>
            )}
          </div>

          {message && (
            <p className="text-sm text-compta-depense" role="alert">
              {message}
            </p>
          )}

          {/* ---- 4. Import ---- */}
          <div className="flex items-center justify-end gap-3">
            <span className="text-xs text-compta-text-muted">
              Les lignes importées arrivent en statut « à vérifier » (à catégoriser).
            </span>
            <button
              type="button"
              onClick={importer}
              disabled={enCours || valides.length === 0}
              className="rounded-md bg-compta-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-compta-accent-hover disabled:opacity-50"
            >
              {enCours ? "Import…" : `Importer ${valides.length} ligne(s)`}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

/** Sélecteur d'une colonne du CSV (par index, libellé = en-tête). */
function ChoixColonne({
  label,
  valeur,
  onChange,
  enTetes,
  nb,
  styleChamp,
}: {
  label: string;
  valeur: number;
  onChange: (n: number) => void;
  enTetes: string[];
  nb: number;
  styleChamp: string;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-sm font-medium">{label}</span>
      <select value={valeur} onChange={(e) => onChange(Number(e.target.value))} className={styleChamp}>
        {Array.from({ length: nb }, (_, i) => (
          <option key={i} value={i}>
            {enTetes[i] || `Colonne ${i + 1}`}
          </option>
        ))}
      </select>
    </label>
  );
}
