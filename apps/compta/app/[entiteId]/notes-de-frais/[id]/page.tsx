/**
 * Fiche d'une note de frais — Server Component (07/11/2026).
 *
 * En-tête, lignes (ajout libre ou depuis une opération importée sans
 * compte), trajets IK rattachés, total, puis les actions permises par le
 * statut : soumettre, valider, refuser, rembourser (opération bancaire
 * réelle), abandonner (date de renonciation), préparer une correction.
 * Les calculs sont des services purs ; les écritures passent par actions.ts.
 */
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { listerCategories } from "@/lib/repositories/categories";
import { roleSurEntite } from "@/lib/repositories/membres";
import { listerComptesTresorerie } from "@/lib/repositories/tresorerie";
import { getTransaction } from "@/lib/repositories/transactions";
import {
  getNote,
  listerDepensesSurCompte,
  listerLignesEntite,
  listerLignesNote,
  listerNotes,
  listerOperationsSansCompte,
  listerTrajets,
  trouverCompteAvances,
} from "@/lib/repositories/notes-de-frais";
import { formaterCentimes } from "@/lib/services/montants";
import { centikmDepuisBase, formaterDistance, formaterTaux } from "@/lib/services/ik";
import {
  candidatesLigne,
  candidatesRemboursement,
  estModifiable,
  idsPris,
  LIBELLES_STATUT_NOTE,
  NOM_COMPTE_AVANCES,
  totalNote,
} from "@/lib/services/notes-de-frais";
import { FormulaireNoteFrais } from "@/components/FormulaireNoteFrais";
import { LignesNoteFrais } from "@/components/LignesNoteFrais";
import { ActionsNoteFrais } from "@/components/ActionsNoteFrais";

const dateFr = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;

/** Ce que veut dire chaque statut, en une phrase, pour celui qui lit la fiche. */
const EXPLICATION: Record<string, string> = {
  brouillon: "Brouillon : complète les lignes, puis soumets la note.",
  a_verifier: "À vérifier : contrôle les justificatifs et la catégorie de chaque ligne, puis valide ou refuse.",
  validee: `Validée : les dépenses sont en compta, sur le compte « ${NOM_COMPTE_AVANCES} ». L'association doit cette somme au membre jusqu'au remboursement ou à l'abandon.`,
  remboursee: "Remboursée : le virement du relevé a soldé l'avance. Il est compté comme virement interne, pas comme une seconde dépense.",
  refusee: "Refusée : rien n'est entré en compta. Les opérations et trajets de cette note peuvent servir dans une autre note.",
  abandonnee:
    "Abandonnée : le membre a renoncé par écrit au remboursement. Sa créance envers l'association est éteinte par son don, enregistré en « Frais abandonnés » dans Bénévolat. Aucun encaissement n'a été créé.",
};

export default async function NoteFraisPage({ params }: { params: Promise<{ entiteId: string; id: string }> }) {
  const { entiteId, id } = await params;
  const supabase = await createClient();
  const note = await getNote(supabase, id);
  if (!note || note.entite_id !== entiteId) notFound();

  const [lignes, categories, role, toutesNotes] = await Promise.all([
    listerLignesNote(supabase, id),
    listerCategories(supabase, entiteId, false),
    roleSurEntite(supabase, entiteId),
    listerNotes(supabase, entiteId),
  ]);
  const peutEcrire = role === "proprietaire" || role === "tresorier";
  const modifiable = estModifiable(note) && peutEcrire;
  const total = totalNote(lignes);
  const aujourdHui = new Date().toISOString().slice(0, 10);

  // Trajets rattachés (détail des IK).
  const idsTrajets = new Set(lignes.filter((l) => l.trajet_id).map((l) => l.trajet_id as string));
  const trajets = idsTrajets.size > 0 ? (await listerTrajets(supabase, entiteId)).filter((t) => idsTrajets.has(t.id)) : [];

  // Opérations sans compte disponibles (pas déjà dans une note non refusée).
  let operations: { id: string; date: string; libelle: string; montantCentimes: number }[] = [];
  if (modifiable) {
    const [sansCompte, toutesLignes] = await Promise.all([listerOperationsSansCompte(supabase, entiteId), listerLignesEntite(supabase, entiteId)]);
    operations = candidatesLigne(sansCompte, idsPris(toutesLignes, toutesNotes, "transaction_id"))
      .slice(0, 300)
      .map((t) => ({ id: t.id, date: t.date_transaction, libelle: t.libelle, montantCentimes: t.montant_ttc_centimes }));
  }

  // Remboursement : dépenses bancaires depuis la plus ancienne dépense de la note.
  let candidates: { id: string; date: string; libelle: string; compte: string; montantCentimes: number }[] = [];
  if (note.statut === "validee" && peutEcrire) {
    const depuis = [note.date_note, ...lignes.map((l) => l.date_depense)].sort()[0] ?? note.date_note;
    const [depenses, comptes, avances] = await Promise.all([
      listerDepensesSurCompte(supabase, entiteId, depuis),
      listerComptesTresorerie(supabase, entiteId),
      trouverCompteAvances(supabase, entiteId),
    ]);
    const noms = new Map(comptes.map((c) => [c.id, c.nom]));
    candidates = candidatesRemboursement(depenses, comptes, avances?.id ?? null, total)
      .slice(0, 300)
      .map((t) => ({
        id: t.id,
        date: t.date_transaction,
        libelle: t.libelle,
        compte: noms.get(t.compte_tresorerie_id as string) ?? "Compte",
        montantCentimes: t.montant_ttc_centimes,
      }));
  }

  const remboursement = note.transaction_remboursement_id ? await getTransaction(supabase, note.transaction_remboursement_id) : null;
  const original = note.correction_de ? toutesNotes.find((n) => n.id === note.correction_de) : undefined;
  const corrections = toutesNotes.filter((n) => n.correction_de === note.id);
  const depensesActives = categories.filter((c) => c.type === "depense" && c.active).map((c) => ({ id: c.id, nom: c.nom }));
  // Une ligne peut pointer une catégorie archivée : on la garde dans la liste pour l'affichage.
  const categoriesAffichees = [
    ...depensesActives,
    ...categories.filter((c) => c.type === "depense" && !c.active && lignes.some((l) => l.categorie_id === c.id)).map((c) => ({ id: c.id, nom: `${c.nom} (archivée)` })),
  ];

  return (
    <section className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">
            {note.numero} · {note.beneficiaire}
          </h2>
          <p className="text-sm text-compta-text-muted">
            {note.objet} · {dateFr(note.date_note)} · <span className="font-medium text-compta-text">{LIBELLES_STATUT_NOTE[note.statut]}</span>
          </p>
        </div>
        <div className="flex flex-col items-end gap-1 text-sm">
          <Link href={`/${entiteId}/notes-de-frais`} className="text-compta-text-muted hover:text-compta-accent">
            ← Notes de frais
          </Link>
          <Link href={`/${entiteId}/notes-de-frais/${note.id}/impression`} className="text-compta-text-muted hover:text-compta-accent">
            Version imprimable
          </Link>
        </div>
      </div>

      <p className="rounded-md bg-compta-accent/10 px-3 py-2 text-sm">{EXPLICATION[note.statut]}</p>

      {note.statut === "refusee" && note.motif_refus && (
        <p className="text-sm">
          <span className="font-medium">Motif du refus :</span> {note.motif_refus}
        </p>
      )}
      {original && (
        <p className="text-sm">
          Cette note corrige{" "}
          <Link href={`/${entiteId}/notes-de-frais/${original.id}`} className="font-medium text-compta-accent hover:underline">
            {original.numero}
          </Link>
          {original.statut !== "refusee" &&
            ". Les dépenses de l'original sont déjà en compta : ne garde ici que ce qui doit s'y ajouter, sinon elles seraient comptées deux fois."}
        </p>
      )}
      {corrections.length > 0 && (
        <p className="text-sm">
          Corrigée par{" "}
          {corrections.map((c, i) => (
            <span key={c.id}>
              {i > 0 && ", "}
              <Link href={`/${entiteId}/notes-de-frais/${c.id}`} className="font-medium text-compta-accent hover:underline">
                {c.numero}
              </Link>
            </span>
          ))}
          .
        </p>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div className="rounded-lg border border-compta-border bg-compta-surface p-3">
          <p className="text-xs text-compta-text-muted">Total de la note</p>
          <p className="text-lg font-semibold tabular-nums">{formaterCentimes(total)}</p>
        </div>
        <div className="rounded-lg border border-compta-border bg-compta-surface p-3">
          <p className="text-xs text-compta-text-muted">Lignes</p>
          <p className="text-lg font-semibold tabular-nums">{lignes.length}</p>
        </div>
        <div className="rounded-lg border border-compta-border bg-compta-surface p-3">
          <p className="text-xs text-compta-text-muted">Dont IK</p>
          <p className="text-lg font-semibold tabular-nums">
            {formaterCentimes(totalNote(lignes.filter((l) => l.origine === "ik")))}
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <h3 className="font-semibold">Lignes</h3>
        <LignesNoteFrais
          entiteId={entiteId}
          noteId={note.id}
          modifiable={modifiable}
          lignes={lignes.map((l) => ({
            id: l.id,
            origine: l.origine,
            date: l.date_depense,
            libelle: l.libelle,
            categorieId: l.categorie_id,
            montantCentimes: Number(l.montant_ttc_centimes),
          }))}
          categories={categoriesAffichees}
          operations={operations}
          dateParDefaut={note.date_note}
        />
        <p className="text-xs text-compta-text-muted">
          Carburant et péages sont des dépenses sur justificatif. Les indemnités kilométriques se saisissent dans{" "}
          <Link href={`/${entiteId}/ik`} className="text-compta-accent hover:underline">
            IK
          </Link>{" "}
          puis se rattachent à la note.
        </p>
      </div>

      {trajets.length > 0 && (
        <div className="space-y-2">
          <h3 className="font-semibold">Trajets IK rattachés</h3>
          <ul className="space-y-1 text-sm">
            {trajets.map((t) => (
              <li key={t.id}>
                {dateFr(t.date_trajet)} · {t.depart} → {t.arrivee} · {formaterDistance(centikmDepuisBase(t.distance_km))} km réels
                {t.aller_retour ? " (aller-retour)" : ""} × {formaterTaux(t.taux_km_dixmillimes)} €/km ={" "}
                <span className="tabular-nums">{formaterCentimes(Number(t.montant_centimes))}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {remboursement && (
        <p className="text-sm">
          <span className="font-medium">Remboursée par :</span> {dateFr(remboursement.date_transaction)} · {remboursement.libelle} ·{" "}
          {formaterCentimes(remboursement.montant_ttc_centimes)} (virement interne vers « {NOM_COMPTE_AVANCES} »).
        </p>
      )}
      {note.statut === "abandonnee" && note.date_renonciation && (
        <p className="text-sm">
          <span className="font-medium">Renonciation écrite du :</span> {dateFr(note.date_renonciation)}. Fiche « Frais abandonnés » à
          vérifier dans{" "}
          <Link href={`/${entiteId}/benevolat`} className="text-compta-accent hover:underline">
            Bénévolat
          </Link>
          .
        </p>
      )}

      {peutEcrire && (
        <div className="space-y-2">
          <h3 className="font-semibold">Actions</h3>
          <ActionsNoteFrais
            entiteId={entiteId}
            noteId={note.id}
            statut={note.statut}
            totalCentimes={total}
            candidates={candidates}
            aujourdHui={aujourdHui}
          />
        </div>
      )}

      {modifiable && (
        <div className="space-y-2">
          <h3 className="font-semibold">En-tête de la note</h3>
          <FormulaireNoteFrais entiteId={entiteId} note={note} aujourdHui={aujourdHui} />
        </div>
      )}
    </section>
  );
}
