/**
 * Export JSON des données structurées d'une facture ou d'un avoir ÉMIS
 * (GET, 09/11/2026).
 *
 * Champs nommés d'après les concepts de la norme EN 16931, pour une future
 * transmission par la plateforme agréée choisie par la structure. AUCUNE
 * connexion à une plateforme : on renvoie un fichier, c'est tout.
 * Sécurité : le middleware exige une session ; la RLS ne renvoie rien d'une
 * autre structure (réponse 404 neutre).
 */
import { createClient } from "@/lib/supabase/server";
import { getFacture, listerLignesFacture, listerPaiementsEntite } from "@/lib/repositories/facturation";
import { donneesStructurees, nomFichierJson } from "@/lib/services/facturation";

export async function GET(_request: Request, { params }: { params: Promise<{ entiteId: string; id: string }> }) {
  const { entiteId, id } = await params;
  const supabase = await createClient();
  const f = await getFacture(supabase, id);
  if (!f || f.entite_id !== entiteId) {
    return new Response("Document introuvable.", { status: 404 });
  }
  const [lignes, paiements, origine] = await Promise.all([
    listerLignesFacture(supabase, id),
    listerPaiementsEntite(supabase, entiteId),
    f.facture_origine_id ? getFacture(supabase, f.facture_origine_id) : Promise.resolve(null),
  ]);
  const encaisse = paiements.filter((p) => p.facture_id === id).reduce((s, p) => s + Number(p.montant_centimes), 0);
  const r = donneesStructurees(f, lignes, origine ? { numero: origine.numero, date_emission: origine.date_emission } : null, encaisse);
  if (!r.ok) {
    return new Response(r.erreurs[0], { status: 409 });
  }
  return new Response(JSON.stringify(r.valeur, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="${nomFichierJson(f.numero as string)}"`,
      "Cache-Control": "no-store",
    },
  });
}
