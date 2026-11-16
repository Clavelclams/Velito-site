/**
 * GET /api/v1/tournois/{token} — un tournoi complet (14/11/2026) :
 * participants, équipes, matchs, scores, sets, terrains.
 * Même format que l'export JSON public (« arena-export-v2 », construit par
 * lib/arena/export-json.ts) : un seul format à documenter et à maintenir.
 */
import { getAnonClient } from "@/lib/supabase/anon";
import { chargerTournoiPublic } from "@/lib/arena/chargement-public";
import { construireExportV2 } from "@/lib/arena/export-json";
import { introuvable, preflight, repondre, urlTournoi, verifierAcces } from "@/lib/arena/api-v1";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const acces = await verifierAcces(request);
  if (!acces.ok) return acces.reponse;

  const { token } = await params;
  // Le token est un UUID (colonne qr_token) : tout autre chose est rejeté
  // avant d'interroger la base, qui répondrait par une erreur de type.
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(token)) {
    return introuvable("Tournoi introuvable.");
  }

  const donnees = await chargerTournoiPublic(getAnonClient(), token);
  if (!donnees) return introuvable("Tournoi introuvable (ou pas encore publié).");

  return repondre({ ...construireExportV2(donnees), url: urlTournoi(request, token) }, acces);
}

export function OPTIONS() {
  return preflight();
}
