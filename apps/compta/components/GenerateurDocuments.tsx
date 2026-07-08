"use client";

/**
 * Générateur de documents juridiques — composant CLIENT.
 * Remplit les variables (dates, associé) et ouvre le document dans une
 * fenêtre autonome prête à imprimer en PDF. Le texte vient du service pur
 * `documents-juridiques` (même code testé). Le résultat est pré-rempli depuis
 * la comptabilité (lecture seule ici — à ajuster à la main sur le document
 * si besoin, puisque le résultat FISCAL peut différer).
 */
import { useState } from "react";
import {
  decisionAssocieUnique,
  rapportGestionAllege,
  documentVersHtml,
  type ParamsDecision,
} from "@/lib/services/documents-juridiques";
import { formaterCentimes } from "@/lib/services/montants";

type TypeDoc = "decision" | "rapport";

export function GenerateurDocuments({
  entiteNom,
  formeSociale,
  resultatCentimes,
}: {
  entiteNom: string;
  formeSociale: string;
  resultatCentimes: number;
}) {
  const annee = new Date().getFullYear() - 1; // exercice N-1 par défaut
  const [typeDoc, setTypeDoc] = useState<TypeDoc>("decision");
  const [exerciceDebut, setDebut] = useState(`${annee}-01-01`);
  const [exerciceFin, setFin] = useState(`${annee}-12-31`);
  const [dateDecision, setDateDecision] = useState(new Date().toISOString().slice(0, 10));
  const [associeNom, setAssocieNom] = useState("");

  function ouvrir() {
    const params: ParamsDecision = {
      entiteNom,
      formeSociale,
      associeNom: associeNom.trim() || "……",
      exerciceDebut,
      exerciceFin,
      dateDecision,
      resultatCentimes,
    };
    const sections =
      typeDoc === "decision" ? decisionAssocieUnique(params) : rapportGestionAllege(params);
    const titre =
      typeDoc === "decision"
        ? "Décision de l'associé unique — Approbation des comptes"
        : "Rapport de gestion";

    const html = documentVersHtml(titre, sections);
    const w = window.open("", "_blank", "width=800,height=900");
    if (!w) return;
    w.document.write(html);
    w.document.close();
    w.focus();
    // Laisse le rendu se faire avant d'ouvrir la boîte d'impression.
    setTimeout(() => w.print(), 400);
  }

  const styleChamp =
    "w-full rounded-md border border-compta-border bg-white px-3 py-2 text-sm outline-none focus:border-compta-accent";

  return (
    <div className="space-y-4 rounded-lg border border-compta-border bg-compta-surface p-5">
      <div className="flex gap-2">
        {(
          [
            ["decision", "Approbation des comptes"],
            ["rapport", "Rapport de gestion"],
          ] as [TypeDoc, string][]
        ).map(([t, libelle]) => (
          <button
            key={t}
            type="button"
            onClick={() => setTypeDoc(t)}
            className={`flex-1 rounded-md border px-3 py-2 text-sm font-medium transition-colors ${
              typeDoc === t
                ? "border-compta-accent bg-compta-accent/10 text-compta-accent"
                : "border-compta-border text-compta-text-muted hover:bg-compta-bg"
            }`}
          >
            {libelle}
          </button>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label>
          <span className="mb-1 block text-sm font-medium">Exercice — du</span>
          <input type="date" value={exerciceDebut} onChange={(e) => setDebut(e.target.value)} className={styleChamp} />
        </label>
        <label>
          <span className="mb-1 block text-sm font-medium">au</span>
          <input type="date" value={exerciceFin} onChange={(e) => setFin(e.target.value)} className={styleChamp} />
        </label>
        <label>
          <span className="mb-1 block text-sm font-medium">Date de la décision</span>
          <input type="date" value={dateDecision} onChange={(e) => setDateDecision(e.target.value)} className={styleChamp} />
        </label>
        <label>
          <span className="mb-1 block text-sm font-medium">Nom de l&apos;associé / président</span>
          <input
            type="text"
            value={associeNom}
            onChange={(e) => setAssocieNom(e.target.value)}
            placeholder="Prénom NOM"
            className={styleChamp}
          />
        </label>
      </div>

      <p className="text-sm text-compta-text-muted">
        Résultat repris de la comptabilité :{" "}
        <span
          className={`font-medium ${resultatCentimes >= 0 ? "text-compta-recette" : "text-compta-depense"}`}
        >
          {formaterCentimes(resultatCentimes)}
        </span>{" "}
        <span className="text-xs italic">(indicatif — le résultat fiscal peut différer)</span>
      </p>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={ouvrir}
          className="rounded-md bg-compta-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-compta-accent-hover"
        >
          Ouvrir le document (impression / PDF)
        </button>
      </div>
    </div>
  );
}
