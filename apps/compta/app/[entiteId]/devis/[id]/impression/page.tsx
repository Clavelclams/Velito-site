/**
 * Devis imprimable (A4) : Server Component (09/11/2026). Prépare toutes les
 * données (mentions, lignes, totaux) ; le composant client met en page et
 * appelle window.print. Une mention absente s'imprime « à compléter ».
 */
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getEntite } from "@/lib/repositories/entites";
import { getClient, getDevis, getParametres, listerLignesDevis } from "@/lib/repositories/facturation";
import {
  calculerTotaux,
  champMentionTva,
  champsAcheteur,
  champsPaiement,
  champsVendeur,
  mentionsManquantes,
  vueLignes,
  vueTotaux,
} from "@/lib/services/facturation";
import { ImpressionFacturation, type DonneesImpressionFacturation } from "@/components/ImpressionFacturation";

const dateFr = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;

export default async function ImpressionDevisPage({ params }: { params: Promise<{ entiteId: string; id: string }> }) {
  const { entiteId, id } = await params;
  const supabase = await createClient();
  const devis = await getDevis(supabase, id);
  if (!devis || devis.entite_id !== entiteId) notFound();
  const [lignes, client, parametres, entite] = await Promise.all([
    listerLignesDevis(supabase, id),
    getClient(supabase, devis.client_id),
    getParametres(supabase, entiteId),
    getEntite(supabase, entiteId),
  ]);
  const typeJuridique = entite?.type_juridique ?? "association";
  const pro = client?.type_client === "professionnel";

  const d: DonneesImpressionFacturation = {
    titre: "Devis",
    numero: devis.numero,
    brouillon: devis.statut === "brouillon",
    vendeurNom: parametres?.denomination ?? null,
    vendeur: champsVendeur(parametres, typeJuridique),
    acheteurNom: client?.nom ?? null,
    acheteur: champsAcheteur(client, false),
    infos: [
      { libelle: "Date du devis", valeur: dateFr(devis.date_devis), requis: true },
      { libelle: "Valable jusqu'au", valeur: dateFr(devis.date_fin_validite), requis: true },
      { libelle: "Objet", valeur: devis.objet, requis: false },
    ],
    reference: null,
    lignes: vueLignes(lignes),
    totaux: vueTotaux(calculerTotaux(lignes)),
    mentionTva: champMentionTva(parametres),
    paiement: champsPaiement(parametres, pro, false),
    notes: devis.notes,
    accord: { date: devis.date_acceptation ? dateFr(devis.date_acceptation) : null, signataire: devis.signataire_accord },
    aCompleter: mentionsManquantes({ type: "devis" }, lignes, parametres, client, typeJuridique).map((m) => m.libelle),
  };

  return <ImpressionFacturation d={d} retour={`/${entiteId}/devis/${devis.id}`} />;
}
