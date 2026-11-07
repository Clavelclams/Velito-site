/**
 * Route de téléchargement de l'INDEX DES PIÈCES du dossier d'AG (GET, 07/11/2026).
 *
 * Même format que l'export comptable (CSV Excel français : « ; », virgule
 * décimale, BOM UTF-8) et même contrôle d'accès que
 * export/telecharger/route.ts : le middleware exige une session, getEntite
 * (via la RLS) refuse une entité qui n'est pas à moi, avec un 404 neutre.
 * Les lignes viennent du même service que le document imprimé.
 */
import { getEntite } from "@/lib/repositories/entites";
import { chargerEntreesDossierAg } from "@/lib/repositories/dossier-ag";
import { createClient } from "@/lib/supabase/server";
import {
  construireDossierAg,
  genererCsvIndexPieces,
  lireExercice,
  nomFichierIndexPieces,
} from "@/lib/services/dossier-ag";

export async function GET(request: Request, { params }: { params: Promise<{ entiteId: string }> }) {
  const { entiteId } = await params;
  const supabase = await createClient();

  const entite = await getEntite(supabase, entiteId);
  if (!entite) {
    return new Response("Entité introuvable.", { status: 404 });
  }

  const aujourdHui = new Date().toISOString().slice(0, 10);
  const exercice = lireExercice(new URL(request.url).searchParams.get("exercice"), aujourdHui);
  const dossier = construireDossierAg(await chargerEntreesDossierAg(supabase, entite, exercice, aujourdHui));

  // BOM UTF-8 (﻿) : indispensable pour qu'Excel affiche les accents.
  const csv = "﻿" + genererCsvIndexPieces(dossier.index);

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${nomFichierIndexPieces(entite.nom, exercice)}"`,
      "Cache-Control": "no-store",
    },
  });
}
