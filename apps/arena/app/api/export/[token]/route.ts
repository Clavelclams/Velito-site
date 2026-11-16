/**
 * Export JSON public d'un tournoi — GET /api/export/[qr_token]
 *
 * Pourquoi c'est important (cadrage §Vision, doctrine de complémentarité) :
 * ARENA promet que les résultats appartiennent aux orgas et aux joueurs. Cet
 * export est la preuve concrète : n'importe qui peut récupérer les données
 * d'un tournoi publié, dans un format ouvert, gratuitement — là où les
 * plateformes pro facturent l'accès programmatique.
 *
 * Format « arena-export-v2 » (09/09/2026) : ajoute les ÉQUIPES et leurs
 * membres, le nom du tour (Finale, Demi-finale, Poule A…), le terrain, et
 * résout les camps qu'ils soient joueurs ou équipes. La v1 ignorait les
 * équipes : un match de padel sortait avec deux camps vides.
 * Les champs de la v1 sont conservés (compatibilité).
 *
 * Sécurité : client ANONYME → RLS → un tournoi BROUILLON renvoie 404 ; un
 * joueur anonymisé apparaît comme « Anonyme ». Les données sont chargées par
 * le même module que l'export CSV (lib/arena/chargement-public.ts) : les
 * deux exports disent toujours la même chose.
 */
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { chargerTournoiPublic, slugFichier } from "@/lib/arena/chargement-public";
import { construireExportV2 } from "@/lib/arena/export-json";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const supabase = await createClient();

  const donnees = await chargerTournoiPublic(supabase, token);
  if (!donnees) {
    return NextResponse.json({ erreur: "Tournoi introuvable" }, { status: 404 });
  }
  const { tournoi } = donnees;
  // [14/11/2026] Construction déplacée dans lib/arena/export-json.ts,
  // partagée avec l'API /api/v1/tournois/[token].
  const exportData = construireExportV2(donnees);

  return new NextResponse(JSON.stringify(exportData, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="arena-${slugFichier(tournoi.titre)}.json"; filename*=UTF-8''${encodeURIComponent(`arena-${slugFichier(tournoi.titre)}.json`)}`,
      // Un export reflète l'instant où on clique : jamais de cache partagé.
      "Cache-Control": "no-store",
    },
  });
}
