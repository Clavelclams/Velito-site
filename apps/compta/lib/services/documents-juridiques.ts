/**
 * SERVICE DOCUMENTS JURIDIQUES — gabarits, PUR (Bloc 4.1/4.2).
 *
 * Produit le TEXTE de documents juridiques standards à partir de variables :
 *  - décision de l'associé unique (SASU) approuvant les comptes ;
 *  - rapport de gestion allégé.
 * Aucune logique comptable ici (le résultat vient déjà calculé) : ce sont des
 * TRAMES à relire et signer, pas des actes produits automatiquement. Fonctions
 * pures → testables ; le rendu HTML autonome (imprimable) est aussi pur.
 *
 * Les « …… » sont des blancs à compléter à la main (lieu, précisions) : mieux
 * vaut un trou visible qu'une valeur inventée.
 */
import { formaterCentimes } from "@/lib/services/montants";

export interface SectionDoc {
  titre?: string;
  paragraphes: string[];
}

export interface ParamsDecision {
  entiteNom: string;
  formeSociale: string; // ex : "SASU"
  capital?: string; // ex : "500 €"
  associeNom: string;
  exerciceDebut: string; // ISO
  exerciceFin: string; // ISO
  dateDecision: string; // ISO
  resultatCentimes: number;
}

function dateFr(iso: string): string {
  const [a, m, j] = iso.split("-");
  return `${j}/${m}/${a}`;
}

/** Décision de l'associé unique approuvant les comptes (SASU). */
export function decisionAssocieUnique(p: ParamsDecision): SectionDoc[] {
  const benefice = p.resultatCentimes >= 0;
  const resultatTexte = formaterCentimes(Math.abs(p.resultatCentimes));
  const capital = p.capital ? `au capital de ${p.capital}` : "……";

  return [
    {
      paragraphes: [
        `${p.entiteNom} — ${p.formeSociale} ${capital}`,
        `Siège social : ……`,
        `Décision de l'associé unique en date du ${dateFr(p.dateDecision)}`,
      ],
    },
    {
      titre: "Approbation des comptes annuels",
      paragraphes: [
        `L'associé unique, ${p.associeNom}, après avoir pris connaissance des comptes annuels de l'exercice clos le ${dateFr(p.exerciceFin)} (ouvert le ${dateFr(p.exerciceDebut)}),`,
        `approuve les comptes annuels dudit exercice tels qu'ils lui ont été présentés, faisant apparaître un ${benefice ? "bénéfice" : "perte"} de ${resultatTexte}.`,
      ],
    },
    {
      titre: "Affectation du résultat",
      paragraphes: [
        benefice
          ? `L'associé unique décide d'affecter le bénéfice de ${resultatTexte} de la manière suivante : …… (report à nouveau et/ou réserves).`
          : `L'associé unique décide d'affecter la perte de ${resultatTexte} au compte « report à nouveau » débiteur.`,
      ],
    },
    {
      titre: "Quitus",
      paragraphes: [
        `L'associé unique donne quitus entier et sans réserve au président pour sa gestion au titre de l'exercice écoulé.`,
      ],
    },
    {
      paragraphes: [
        `Fait à ……, le ${dateFr(p.dateDecision)}.`,
        `${p.associeNom}, associé unique`,
        `Signature :`,
      ],
    },
  ];
}

/** Rapport de gestion allégé (trame). */
export function rapportGestionAllege(p: ParamsDecision): SectionDoc[] {
  const benefice = p.resultatCentimes >= 0;
  const resultatTexte = formaterCentimes(Math.abs(p.resultatCentimes));
  return [
    {
      paragraphes: [
        `${p.entiteNom} — ${p.formeSociale}`,
        `Rapport de gestion — exercice clos le ${dateFr(p.exerciceFin)}`,
      ],
    },
    {
      titre: "Activité de l'exercice",
      paragraphes: [
        `Au cours de l'exercice ouvert le ${dateFr(p.exerciceDebut)} et clos le ${dateFr(p.exerciceFin)}, la société a poursuivi son activité de …….`,
      ],
    },
    {
      titre: "Résultat et situation financière",
      paragraphes: [
        `L'exercice se solde par un ${benefice ? "bénéfice" : "perte"} de ${resultatTexte}.`,
        `La situation financière de la société à la clôture est …… (à compléter : trésorerie, dettes, capitaux propres).`,
      ],
    },
    {
      titre: "Perspectives",
      paragraphes: [`Pour l'exercice à venir, la société envisage …….`],
    },
    {
      paragraphes: [
        `Fait à ……, le ${dateFr(p.dateDecision)}.`,
        `${p.associeNom}, président`,
      ],
    },
  ];
}

/** Assemble un document HTML AUTONOME (avec styles d'impression) à imprimer. */
export function documentVersHtml(titre: string, sections: SectionDoc[]): string {
  const corps = sections
    .map((s) => {
      const t = s.titre ? `<h2>${echapper(s.titre)}</h2>` : "";
      const p = s.paragraphes.map((x) => `<p>${echapper(x)}</p>`).join("");
      return `<section>${t}${p}</section>`;
    })
    .join("");

  return `<!DOCTYPE html>
<html lang="fr"><head><meta charset="utf-8"><title>${echapper(titre)}</title>
<style>
  @page { margin: 2.5cm; }
  body { font-family: Georgia, "Times New Roman", serif; color: #111; line-height: 1.5; max-width: 21cm; margin: 2rem auto; padding: 0 1.5rem; }
  h1 { font-size: 1.3rem; text-align: center; margin-bottom: 2rem; }
  h2 { font-size: 1rem; margin-top: 1.5rem; text-transform: uppercase; letter-spacing: 0.03em; }
  p { margin: 0.4rem 0; text-align: justify; }
  section { margin-bottom: 1rem; }
  @media print { body { margin: 0; } .noprint { display: none; } }
</style></head>
<body><h1>${echapper(titre)}</h1>${corps}</body></html>`;
}

function echapper(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
