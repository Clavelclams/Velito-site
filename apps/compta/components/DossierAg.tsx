"use client";

/**
 * Dossier d'AG : affichage imprimable (composant CLIENT, 07/11/2026).
 *
 * Reçoit l'objet déjà calculé par le service pur `dossier-ag` (aucun calcul
 * ici, que de la mise en forme). Client uniquement pour le bouton
 * « Imprimer ou enregistrer en PDF » (window.print).
 *
 * Impression (mêmes principes que documentVersHtml) : format A4 via @page,
 * une section par page, en-têtes de tableau répétés sur chaque page. Le texte
 * est inséré par React, qui échappe déjà tout contenu : pas de HTML construit
 * à la main, donc rien à échapper nous-mêmes.
 */
import type { DossierAg as Dossier, EtatPiece } from "@/lib/services/dossier-ag";
import { dateFr, LIBELLE_NON_CLASSE, LIBELLES_ETAT_MOIS, libellePiece } from "@/lib/services/dossier-ag";
import { formaterCentimes } from "@/lib/services/montants";
import { LIBELLES_STATUT } from "@/lib/services/tresorerie";
import type { EtatMois } from "@/lib/services/tresorerie";

/**
 * [07/11/2026] Règles d'impression GLOBALES, posées par ce composant parce
 * que le menu vient du layout (que ce module ne modifie pas) :
 *  - `nav` et les éléments `.dossier-ag-ecran` (barre d'outils) disparaissent ;
 *  - l'en-tête du layout (fil d'ariane, nom) et ses marges aussi, ciblés via
 *    :has() sur le conteneur direct du dossier : la page de garde le remplace ;
 *  - chaque section commence une nouvelle page, `thead` se répète, une ligne
 *    de tableau n'est jamais coupée en deux.
 */
const CSS_IMPRESSION = `
@page { size: A4; margin: 1.6cm 1.4cm; }
@media print {
  nav, .dossier-ag-ecran { display: none !important; }
  div:has(> .dossier-ag) > header { display: none !important; }
  div:has(> .dossier-ag) { max-width: none !important; margin: 0 !important; padding: 0 !important; }
  html, body { background: #fff !important; }
  .dossier-ag { font-size: 10pt; color: #000; }
  .dossier-ag-papier { border: none !important; box-shadow: none !important; padding: 0 !important; }
  .dossier-ag-section { break-before: page; page-break-before: always; }
  .dossier-ag-section:first-child { break-before: auto; page-break-before: auto; }
  .dossier-ag table { width: 100%; border-collapse: collapse; }
  .dossier-ag thead { display: table-header-group; }
  .dossier-ag tfoot { display: table-footer-group; }
  .dossier-ag tr, .dossier-ag .dossier-ag-bloc { break-inside: avoid; page-break-inside: avoid; }
  .dossier-ag h2, .dossier-ag h3 { break-after: avoid; page-break-after: avoid; }
  .dossier-ag * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
}
`;

const MOIS_COURTS = ["Janv.", "Févr.", "Mars", "Avr.", "Mai", "Juin", "Juil.", "Août", "Sept.", "Oct.", "Nov.", "Déc."];

const CLASSE_ETAT: Record<EtatMois, string> = {
  concorde: "text-compta-recette",
  ecart: "font-semibold text-compta-depense",
  non_observe: "text-compta-accent",
  a_venir: "text-compta-text-muted",
  avant_ouverture: "text-compta-text-muted",
  solde_initial_inconnu: "text-compta-accent",
};

/** Un inconnu s'écrit « à compléter », jamais 0. */
function montant(c: number | null) {
  return c === null ? <span className="italic text-compta-accent">à compléter</span> : formaterCentimes(c);
}

/** 780 minutes → « 13 h », 750 → « 12 h 30 ». */
function duree(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h} h` : `${h} h ${String(m).padStart(2, "0")}`;
}

function classePiece(p: EtatPiece): string {
  if (p.type === "manquante") return "font-medium text-compta-depense";
  if (p.type === "exception") return "text-compta-accent";
  return "";
}

const th = "border-b border-compta-border px-2 py-1.5 text-left text-xs font-semibold uppercase text-compta-text-muted";
const thD = `${th} text-right`;
const td = "border-b border-compta-border px-2 py-1.5 align-top";
const tdD = `${td} text-right whitespace-nowrap`;

function Section({ titre, numero, children }: { titre: string; numero: number; children: React.ReactNode }) {
  return (
    <section className="dossier-ag-section space-y-4 pt-10 first:pt-0">
      <h2 className="border-b-2 border-compta-text pb-1 text-lg font-bold">
        {numero}. {titre}
      </h2>
      {children}
    </section>
  );
}

export interface ClotureDossier {
  cloture_le: string;
  motif: string | null;
}

export function DossierAg({
  dossier,
  entiteId,
  exercicesDisponibles,
  cloture,
}: {
  dossier: Dossier;
  entiteId: string;
  exercicesDisponibles: number[];
  /** [07/11/2026] Branchée plus tard sur la table cloture_exercice ; null ou absente = non clôturé. */
  cloture?: ClotureDossier | null;
}) {
  const { garde, tresorerie, resultat, subventions, contributions, controles, index } = dossier;

  return (
    <div className="dossier-ag space-y-6">
      <style>{CSS_IMPRESSION}</style>

      {/* ---- Barre d'outils (écran seulement) ---- */}
      <div className="dossier-ag-ecran space-y-3">
        <div>
          <h2 className="text-lg font-semibold">Dossier d&apos;AG</h2>
          <p className="mt-1 text-sm text-compta-text-muted">
            Le dossier de fin d&apos;exercice à présenter à l&apos;assemblée générale et aux financeurs. Choisis
            l&apos;exercice, relis, puis imprime-le ou enregistre-le en PDF depuis ton navigateur.
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-3 rounded-lg border border-compta-border bg-compta-surface p-4">
          <form method="get" className="flex items-end gap-2">
            <label>
              <span className="mb-1 block text-sm font-medium">Exercice</span>
              <select
                name="exercice"
                defaultValue={String(garde.exercice)}
                className="rounded-md border border-compta-border bg-white px-3 py-2 text-sm outline-none focus:border-compta-accent"
              >
                {exercicesDisponibles.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="submit"
              className="rounded-md border border-compta-border px-3 py-2 text-sm font-medium hover:bg-compta-bg"
            >
              Afficher
            </button>
          </form>
          <div className="ml-auto flex flex-wrap gap-2">
            <a
              href={`/${entiteId}/dossier-ag/csv?exercice=${garde.exercice}`}
              className="rounded-md border border-compta-border px-3 py-2 text-sm font-medium hover:bg-compta-bg"
            >
              Index des pièces (CSV)
            </a>
            <button
              type="button"
              onClick={() => window.print()}
              className="rounded-md bg-compta-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-compta-accent-hover"
            >
              Imprimer ou enregistrer en PDF
            </button>
          </div>
        </div>
      </div>

      {/* ---- Le document ---- */}
      <article className="dossier-ag-papier rounded-lg border border-compta-border bg-white p-8 text-sm text-compta-text">
        {/* 1. Page de garde */}
        <section className="dossier-ag-section flex min-h-[60vh] flex-col justify-center space-y-6 text-center print:min-h-[24cm]">
          <p className="text-sm uppercase tracking-widest text-compta-text-muted">Dossier de fin d&apos;exercice</p>
          <h1 className="text-3xl font-bold">{garde.nomStructure}</h1>
          <p className="text-base">{garde.formeJuridique}</p>
          <p className="text-xl font-semibold">
            Exercice {garde.exercice}
            <span className="block text-sm font-normal text-compta-text-muted">
              du {dateFr(garde.debut)} au {dateFr(garde.fin)}
            </span>
          </p>
          <p className="text-sm text-compta-text-muted">Édité le {dateFr(garde.dateEdition)}</p>
          <p className="mx-auto max-w-lg border border-compta-border p-4 text-sm italic">{garde.mention}</p>
          <ol className="mx-auto mt-4 list-decimal text-left text-sm text-compta-text-muted">
            <li>Trésorerie</li>
            <li>Compte de résultat simplifié</li>
            <li>Subventions de l&apos;exercice</li>
            <li>Contributions volontaires en nature</li>
            <li>Contrôles</li>
            <li>Index des pièces</li>
            <li>Clôture de l&apos;exercice</li>
          </ol>
        </section>

        {/* 2. Trésorerie */}
        <Section numero={1} titre="Trésorerie">
          {tresorerie.comptes.length === 0 ? (
            <p>Aucun compte réel n&apos;est enregistré pour cet exercice.</p>
          ) : (
            <table className="w-full">
              <thead>
                <tr>
                  <th className={th}>Compte</th>
                  <th className={thD}>Solde d&apos;ouverture</th>
                  <th className={thD}>Recettes</th>
                  <th className={thD}>Dépenses</th>
                  <th className={thD}>Virements reçus</th>
                  <th className={thD}>Virements émis</th>
                  <th className={thD}>Solde au {dateFr(garde.fin)}</th>
                </tr>
              </thead>
              <tbody>
                {tresorerie.comptes.map((c) => (
                  <tr key={c.id}>
                    <td className={td}>
                      <span className="font-medium">{c.nom}</span>
                      <span className="block text-xs text-compta-text-muted">{c.nature}</span>
                    </td>
                    <td className={tdD}>
                      {montant(c.soldeDebut)}
                      <span className="block text-xs text-compta-text-muted">au {dateFr(c.dateSoldeDebut)}</span>
                    </td>
                    <td className={tdD}>{formaterCentimes(c.recettes)}</td>
                    <td className={tdD}>{formaterCentimes(c.depenses)}</td>
                    <td className={tdD}>{formaterCentimes(c.virementsRecus)}</td>
                    <td className={tdD}>{formaterCentimes(c.virementsEmis)}</td>
                    <td className={tdD}>{montant(c.soldeFin)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <p className="text-xs text-compta-text-muted">
            Recettes et dépenses hors virements internes. Les soldes repartent du dernier solde lu sur un relevé, puis
            ajoutent les mouvements enregistrés. Un solde marqué « à compléter » ne peut pas être calculé : le solde
            initial du compte n&apos;est pas connu.
          </p>
          {tresorerie.sansCompte.nb > 0 && (
            <p className="text-xs">
              {tresorerie.sansCompte.nb} opération(s) de l&apos;exercice sans compte renseigné (recettes{" "}
              {formaterCentimes(tresorerie.sansCompte.recettes)}, dépenses {formaterCentimes(tresorerie.sansCompte.depenses)})
              ne figurent dans aucun compte ci-dessus.
            </p>
          )}

          <div className="dossier-ag-bloc">
            <h3 className="mb-2 font-semibold">Dernier relevé de l&apos;exercice</h3>
            <table className="w-full">
              <thead>
                <tr>
                  <th className={th}>Compte</th>
                  <th className={th}>Date</th>
                  <th className={th}>Référence</th>
                  <th className={thD}>Solde lu</th>
                  <th className={thD}>Écart (lu − calculé)</th>
                </tr>
              </thead>
              <tbody>
                {tresorerie.comptes.map((c) => (
                  <tr key={c.id}>
                    <td className={td}>{c.nom}</td>
                    {c.dernierReleve ? (
                      <>
                        <td className={td}>{dateFr(c.dernierReleve.date)}</td>
                        <td className={td}>{c.dernierReleve.reference ?? ""}</td>
                        <td className={tdD}>{formaterCentimes(c.dernierReleve.solde)}</td>
                        <td className={`${tdD} ${c.dernierReleve.ecart ? "font-semibold text-compta-depense" : ""}`}>
                          {c.dernierReleve.ecart === 0 ? "concorde" : montant(c.dernierReleve.ecart)}
                        </td>
                      </>
                    ) : (
                      <td className={td} colSpan={4}>
                        Aucun relevé saisi sur l&apos;exercice.
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div>
            <h3 className="mb-2 font-semibold">Virements internes</h3>
            <p className="mb-2 text-xs text-compta-text-muted">
              Mouvements entre deux comptes de la structure : ni recettes, ni dépenses, exclus du compte de résultat.
            </p>
            {tresorerie.virements.length === 0 ? (
              <p>Aucun virement interne sur l&apos;exercice.</p>
            ) : (
              <table className="w-full">
                <thead>
                  <tr>
                    <th className={th}>Date</th>
                    <th className={th}>Libellé</th>
                    <th className={th}>De</th>
                    <th className={th}>Vers</th>
                    <th className={thD}>Montant</th>
                  </tr>
                </thead>
                <tbody>
                  {tresorerie.virements.map((v) => (
                    <tr key={v.virementId}>
                      <td className={td}>{dateFr(v.date)}</td>
                      <td className={td}>{v.libelle}</td>
                      <td className={td}>{v.compteSource ?? <span className="italic text-compta-accent">à compléter</span>}</td>
                      <td className={td}>
                        {v.compteDestination ?? <span className="italic text-compta-accent">à compléter</span>}
                      </td>
                      <td className={tdD}>{formaterCentimes(v.montant)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </Section>

        {/* 3. Compte de résultat */}
        <Section numero={2} titre="Compte de résultat simplifié">
          {(
            [
              ["Recettes", resultat.recettes],
              ["Dépenses", resultat.depenses],
            ] as const
          ).map(([titre, s]) => (
            <table key={titre} className="w-full">
              <thead>
                <tr>
                  <th className={th}>{titre}</th>
                  <th className={thD}>Lignes</th>
                  <th className={thD}>Montant</th>
                </tr>
              </thead>
              <tbody>
                {s.lignes.map((l) => (
                  <tr key={l.categorieId}>
                    <td className={td}>{l.libelle}</td>
                    <td className={tdD}>{l.nbLignes}</td>
                    <td className={tdD}>{formaterCentimes(l.montant)}</td>
                  </tr>
                ))}
                {s.nonClasse.nbLignes > 0 && (
                  <tr className="italic">
                    <td className={td}>{LIBELLE_NON_CLASSE} (lignes sans catégorie)</td>
                    <td className={tdD}>{s.nonClasse.nbLignes}</td>
                    <td className={tdD}>{formaterCentimes(s.nonClasse.montant)}</td>
                  </tr>
                )}
                {s.lignes.length === 0 && s.nonClasse.nbLignes === 0 && (
                  <tr>
                    <td className={td} colSpan={3}>
                      Aucune opération.
                    </td>
                  </tr>
                )}
              </tbody>
              <tfoot>
                <tr className="font-semibold">
                  <td className={td}>Total des {titre.toLowerCase()}</td>
                  <td className={tdD} />
                  <td className={tdD}>{formaterCentimes(s.total)}</td>
                </tr>
              </tfoot>
            </table>
          ))}
          <div className="dossier-ag-bloc flex justify-between border-2 border-compta-text px-3 py-2 text-base font-bold">
            <span>Résultat de l&apos;exercice (recettes − dépenses)</span>
            <span className={resultat.resultat >= 0 ? "text-compta-recette" : "text-compta-depense"}>
              {formaterCentimes(resultat.resultat)}
            </span>
          </div>
          <p className="text-xs text-compta-text-muted">
            Montants TTC enregistrés, regroupés par catégorie. Les virements internes ({resultat.nbVirementsExclus}{" "}
            ligne(s)) sont exclus. Les lignes « {LIBELLE_NON_CLASSE} » n&apos;ont pas encore de catégorie : elles
            comptent dans les totaux et restent à classer.
          </p>
        </Section>

        {/* 4. Subventions */}
        <Section numero={3} titre="Subventions de l'exercice">
          {subventions.lignes.length === 0 ? (
            <p>Aucun dossier de subvention rattaché à l&apos;exercice {garde.exercice}.</p>
          ) : (
            <table className="w-full">
              <thead>
                <tr>
                  <th className={th}>Financeur et action</th>
                  <th className={th}>Statut</th>
                  <th className={thD}>Demandé</th>
                  <th className={thD}>Notifié</th>
                  <th className={thD}>Encaissé</th>
                  <th className={thD}>Reste à encaisser</th>
                </tr>
              </thead>
              <tbody>
                {subventions.lignes.map((s) => (
                  <tr key={s.id}>
                    <td className={td}>
                      <span className="font-medium">{s.financeur}</span>
                      <span className="block text-xs text-compta-text-muted">{s.action}</span>
                    </td>
                    <td className={td}>{s.libelleStatut}</td>
                    <td className={tdD}>{montant(s.demande)}</td>
                    <td className={tdD}>{montant(s.notifie)}</td>
                    <td className={tdD}>{formaterCentimes(s.encaisse)}</td>
                    <td className={tdD}>{montant(s.resteAEncaisser)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="font-semibold">
                  <td className={td} colSpan={2}>
                    Totaux (hors dossiers refusés)
                  </td>
                  <td className={tdD}>{formaterCentimes(subventions.totaux.demande)}</td>
                  <td className={tdD}>
                    {formaterCentimes(subventions.totaux.notifie)}
                    {subventions.totaux.notifieInconnu > 0 && (
                      <span className="block text-xs font-normal italic text-compta-accent">
                        + {subventions.totaux.notifieInconnu} à compléter
                      </span>
                    )}
                  </td>
                  <td className={tdD}>{formaterCentimes(subventions.totaux.encaisse)}</td>
                  <td className={tdD}>
                    {formaterCentimes(subventions.resteAEncaisser)}
                    {subventions.resteInconnu > 0 && (
                      <span className="block text-xs font-normal italic text-compta-accent">
                        + {subventions.resteInconnu} à compléter
                      </span>
                    )}
                  </td>
                </tr>
              </tfoot>
            </table>
          )}
          <p className="text-xs text-compta-text-muted">
            Le demandé, le notifié et l&apos;encaissé sont trois montants distincts. L&apos;encaissé est la somme des
            recettes rattachées au dossier ; le notifié total ne retient que les dossiers notifiés ou soldés.
          </p>
        </Section>

        {/* 5. Contributions volontaires en nature */}
        <Section numero={4} titre="Contributions volontaires en nature">
          <table className="w-full">
            <thead>
              <tr>
                <th className={th}>Type</th>
                <th className={thD}>Fiches</th>
                <th className={thD}>Quantité</th>
                <th className={thD}>Valeur</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className={td}>Heures de bénévolat</td>
                <td className={tdD}>{contributions.heures.nbFiches}</td>
                <td className={tdD}>{duree(contributions.heures.minutes)}</td>
                <td className={tdD}>{formaterCentimes(contributions.heures.valeur)}</td>
              </tr>
              <tr>
                <td className={td}>Dons en nature</td>
                <td className={tdD}>{contributions.dons.nbFiches}</td>
                <td className={tdD} />
                <td className={tdD}>{formaterCentimes(contributions.dons.valeur)}</td>
              </tr>
              <tr>
                <td className={td}>Frais abandonnés</td>
                <td className={tdD}>{contributions.fraisAbandonnes.nbFiches}</td>
                <td className={tdD} />
                <td className={tdD}>{formaterCentimes(contributions.fraisAbandonnes.valeur)}</td>
              </tr>
            </tbody>
            <tfoot>
              <tr className="font-semibold">
                <td className={td} colSpan={3}>
                  Total des contributions vérifiées
                </td>
                <td className={tdD}>{formaterCentimes(contributions.total)}</td>
              </tr>
            </tfoot>
          </table>
          <p>
            {contributions.tauxHoraires.length === 0
              ? "Taux horaire utilisé : aucune heure vérifiée sur l'exercice."
              : contributions.tauxHoraires.length === 1
                ? `Taux horaire utilisé : ${formaterCentimes(contributions.tauxHoraires[0]!)} par heure.`
                : `Taux horaires utilisés : ${contributions.tauxHoraires.map((t) => formaterCentimes(t)).join(", ")} par heure.`}
          </p>
          <p className="text-xs text-compta-text-muted">
            Seules les fiches au statut « Vérifié » sont comptées.
            {contributions.nonVerifiees > 0 &&
              ` ${contributions.nonVerifiees} fiche(s) de l'exercice restent en brouillon ou à vérifier et n'y figurent pas.`}{" "}
            Ces contributions sont présentées à part : elles ne sont pas des recettes et ne modifient ni la trésorerie
            ni le résultat.
          </p>
        </Section>

        {/* 6. Contrôles */}
        <Section numero={5} titre="Contrôles">
          <div className="dossier-ag-bloc">
            <h3 className="mb-2 font-semibold">Contrôle mensuel des comptes</h3>
            {controles.comptes.length === 0 ? (
              <p>Aucun compte réel enregistré.</p>
            ) : (
              <table className="w-full table-fixed text-[10px] leading-tight">
                <thead>
                  <tr>
                    <th className={`${th} w-24`}>Compte</th>
                    {MOIS_COURTS.map((m) => (
                      <th key={m} className={`${th} px-1 text-center`}>
                        {m}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {controles.comptes.map((c) => (
                    <tr key={c.id}>
                      <td className={`${td} font-medium`}>{c.nom}</td>
                      {c.mois.map((m) => (
                        <td key={m.mois} className={`${td} px-1 text-center ${CLASSE_ETAT[m.etat]}`}>
                          {LIBELLES_ETAT_MOIS[m.etat]}
                          {m.etat === "ecart" && m.ecart !== null && (
                            <span className="block whitespace-nowrap">{formaterCentimes(m.ecart)}</span>
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            <p className="mt-1 text-xs text-compta-text-muted">
              Pour chaque mois, le solde lu sur le dernier relevé est comparé au solde calculé à la même date.
            </p>
          </div>

          <div className="dossier-ag-bloc">
            <h3 className="mb-2 font-semibold">État des opérations (hors virements internes)</h3>
            <table className="w-full">
              <tbody>
                {(["a_classer", "a_verifier", "validee"] as const).map((s) => (
                  <tr key={s}>
                    <td className={td}>{LIBELLES_STATUT[s]}</td>
                    <td className={tdD}>{controles.statuts[s]}</td>
                  </tr>
                ))}
                <tr className="font-semibold">
                  <td className={td}>Dépenses sans justificatif</td>
                  <td className={tdD}>{controles.depensesSansJustificatif}</td>
                </tr>
                {controles.colonneExceptionPresente && (
                  <tr>
                    <td className={td}>Dépenses sans pièce couvertes par une exception motivée</td>
                    <td className={tdD}>{controles.depensesEnException}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Section>

        {/* 7. Index des pièces */}
        <Section numero={6} titre="Index des pièces">
          {index.length === 0 ? (
            <p>Aucune opération sur l&apos;exercice.</p>
          ) : (
            <table className="w-full text-xs">
              <thead>
                <tr>
                  <th className={th}>Date</th>
                  <th className={th}>Libellé</th>
                  <th className={th}>Catégorie</th>
                  <th className={thD}>Montant</th>
                  <th className={th}>Pièce</th>
                </tr>
              </thead>
              <tbody>
                {index.map((l) => (
                  <tr key={l.id}>
                    <td className={`${td} whitespace-nowrap`}>{dateFr(l.date)}</td>
                    <td className={td}>
                      {l.libelle}
                      <span className="block text-compta-text-muted">{LIBELLES_STATUT[l.statut]}</span>
                    </td>
                    <td className={td}>{l.categorie}</td>
                    <td className={`${tdD} ${l.type === "recette" ? "text-compta-recette" : "text-compta-depense"}`}>
                      {l.type === "recette" ? "+" : "−"} {formaterCentimes(l.montant)}
                    </td>
                    <td className={`${td} ${classePiece(l.piece)}`}>{libellePiece(l.piece)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Section>

        {/* 8. Clôture */}
        <Section numero={7} titre="Clôture de l'exercice">
          {cloture ? (
            <div className="space-y-1">
              <p>Exercice clôturé le {dateFr(cloture.cloture_le.slice(0, 10))}.</p>
              {cloture.motif && <p>Motif : {cloture.motif}</p>}
            </div>
          ) : (
            <p className="font-medium">Exercice non clôturé.</p>
          )}
          <p className="text-xs text-compta-text-muted">{garde.mention}</p>
        </Section>
      </article>
    </div>
  );
}
