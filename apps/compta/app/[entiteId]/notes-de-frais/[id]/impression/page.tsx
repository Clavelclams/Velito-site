/**
 * Note de frais imprimable (A4) pour signature — Server Component (07/11/2026).
 * Prépare les données (noms de catégories, détail IK, règlement) ; le
 * composant client se contente de les mettre en page et d'appeler
 * window.print. Le menu est masqué à l'impression (CSS du composant).
 */
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getEntite } from "@/lib/repositories/entites";
import { listerCategories } from "@/lib/repositories/categories";
import { getTransaction } from "@/lib/repositories/transactions";
import { getNote, listerLignesNote, listerTrajets } from "@/lib/repositories/notes-de-frais";
import { formaterCentimes } from "@/lib/services/montants";
import { centikmDepuisBase, formaterDistance, formaterTaux } from "@/lib/services/ik";
import { LIBELLES_STATUT_NOTE, totalNote } from "@/lib/services/notes-de-frais";
import { ImpressionNoteFrais, type DonneesImpression } from "@/components/ImpressionNoteFrais";

const NATURE = { saisie: "Ticket", operation: "Opération importée", ik: "Indemnité kilométrique" } as const;
const dateFr = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;

export default async function ImpressionNoteFraisPage({ params }: { params: Promise<{ entiteId: string; id: string }> }) {
  const { entiteId, id } = await params;
  const supabase = await createClient();
  const note = await getNote(supabase, id);
  if (!note || note.entite_id !== entiteId) notFound();

  const [entite, lignes, categories] = await Promise.all([
    getEntite(supabase, entiteId),
    listerLignesNote(supabase, id),
    listerCategories(supabase, entiteId, false),
  ]);
  const noms = new Map(categories.map((c) => [c.id, c.nom]));
  const idsTrajets = new Set(lignes.filter((l) => l.trajet_id).map((l) => l.trajet_id as string));
  const trajets = idsTrajets.size > 0 ? (await listerTrajets(supabase, entiteId)).filter((t) => idsTrajets.has(t.id)) : [];

  let reglement: string | null = null;
  if (note.statut === "remboursee" && note.transaction_remboursement_id) {
    const op = await getTransaction(supabase, note.transaction_remboursement_id);
    if (op) reglement = `Remboursée le ${dateFr(op.date_transaction)} par l'opération « ${op.libelle} » de ${formaterCentimes(op.montant_ttc_centimes)}.`;
  } else if (note.statut === "abandonnee" && note.date_renonciation) {
    reglement = `Abandonnée : renonciation écrite au remboursement du ${dateFr(note.date_renonciation)}. La créance du membre est éteinte par son don.`;
  } else if (note.statut === "refusee" && note.motif_refus) {
    reglement = `Refusée : ${note.motif_refus}`;
  }

  const d: DonneesImpression = {
    structure: entite?.nom ?? "",
    numero: note.numero,
    statut: LIBELLES_STATUT_NOTE[note.statut],
    beneficiaire: note.beneficiaire,
    objet: note.objet,
    date: note.date_note,
    commentaire: note.commentaire,
    lignes: lignes.map((l) => ({
      date: l.date_depense,
      libelle: l.libelle,
      categorie: l.categorie_id ? (noms.get(l.categorie_id) ?? "") : "À classer",
      nature: NATURE[l.origine],
      montantCentimes: Number(l.montant_ttc_centimes),
    })),
    trajets: trajets.map((t) => ({
      date: t.date_trajet,
      trajet: `${t.depart} → ${t.arrivee}`,
      motif: t.motif,
      distance: formaterDistance(centikmDepuisBase(t.distance_km)),
      allerRetour: t.aller_retour,
      taux: formaterTaux(t.taux_km_dixmillimes),
      montantCentimes: Number(t.montant_centimes),
    })),
    totalCentimes: totalNote(lignes),
    reglement,
  };

  return <ImpressionNoteFrais d={d} retour={`/${entiteId}/notes-de-frais/${note.id}`} />;
}
