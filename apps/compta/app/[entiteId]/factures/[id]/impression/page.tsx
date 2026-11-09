/**
 * Facture ou avoir imprimable (A4) : Server Component (09/11/2026).
 *
 * Document émis : vendeur et client viennent des INSTANTANÉS figés à
 * l'émission, jamais des fiches actuelles. Brouillon : fiches actuelles,
 * bandeau « brouillon sans numéro ». Une mention absente s'imprime « à
 * compléter ». Le composant client met en page et appelle window.print.
 */
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getEntite } from "@/lib/repositories/entites";
import { getClient, getFacture, getParametres, listerLignesFacture } from "@/lib/repositories/facturation";
import {
  champMentionTva,
  champsAcheteur,
  champsPaiement,
  champsVendeur,
  LIBELLES_NATURE,
  mentionsManquantes,
  totauxFacture,
  vueLignes,
  vueTotaux,
} from "@/lib/services/facturation";
import { ImpressionFacturation, type DonneesImpressionFacturation } from "@/components/ImpressionFacturation";

const dateFr = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;

export default async function ImpressionFacturePage({ params }: { params: Promise<{ entiteId: string; id: string }> }) {
  const { entiteId, id } = await params;
  const supabase = await createClient();
  const f = await getFacture(supabase, id);
  if (!f || f.entite_id !== entiteId) notFound();
  const [lignes, entite] = await Promise.all([listerLignesFacture(supabase, id), getEntite(supabase, entiteId)]);
  const brouillon = f.statut === "brouillon";
  const avoir = f.sens === "avoir";
  const typeJuridique = entite?.type_juridique ?? "association";

  // [09/11/2026] Émis : instantanés ; brouillon : fiches du jour.
  const vendeur = brouillon ? await getParametres(supabase, entiteId) : f.vendeur;
  const acheteur = brouillon ? await getClient(supabase, f.client_id) : f.acheteur;
  const origine = f.facture_origine_id ? await getFacture(supabase, f.facture_origine_id) : null;
  const pro = acheteur?.type_client === "professionnel";

  const d: DonneesImpressionFacturation = {
    titre: avoir ? "Avoir" : "Facture",
    numero: f.numero,
    brouillon,
    vendeurNom: vendeur?.denomination ?? null,
    vendeur: champsVendeur(vendeur, typeJuridique),
    acheteurNom: acheteur?.nom ?? null,
    acheteur: champsAcheteur(acheteur, true),
    infos: [
      { libelle: "Date d'émission", valeur: f.date_emission ? dateFr(f.date_emission) : null, requis: true },
      { libelle: "Date de la prestation ou de la livraison", valeur: f.date_prestation ? dateFr(f.date_prestation) : null, requis: true },
      { libelle: "Nature de l'opération", valeur: f.nature_operation ? LIBELLES_NATURE[f.nature_operation] : null, requis: true },
      ...(avoir ? [] : [{ libelle: "Date d'échéance", valeur: f.date_echeance ? dateFr(f.date_echeance) : null, requis: true }]),
      { libelle: "Objet", valeur: f.objet, requis: false },
      { libelle: "", valeur: f.tva_sur_debits ? "Option pour le paiement de la taxe d'après les débits" : null, requis: false },
    ],
    reference: origine ? `Avoir sur la facture ${origine.numero ?? ""}${origine.date_emission ? ` du ${dateFr(origine.date_emission)}` : ""}` : null,
    lignes: vueLignes(lignes),
    totaux: vueTotaux(totauxFacture(f, lignes)),
    mentionTva: champMentionTva(vendeur),
    paiement: avoir ? [] : champsPaiement(vendeur, pro, true),
    notes: f.notes,
    accord: null,
    aCompleter: brouillon
      ? mentionsManquantes({ type: f.sens, ...f }, lignes, vendeur, acheteur, typeJuridique).map((m) => m.libelle)
      : [],
  };

  return <ImpressionFacturation d={d} retour={`/${entiteId}/factures/${f.id}`} />;
}
