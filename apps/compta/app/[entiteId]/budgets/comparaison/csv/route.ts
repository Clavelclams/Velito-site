/**
 * Route de TÉLÉCHARGEMENT du CSV de la comparaison annuelle (GET, 07/11/2026).
 *
 * Même principe que export/telecharger : on renvoie un FICHIER, pas du HTML.
 * Sécurité : le middleware exige une session ; getEntite (via RLS) refuse une
 * entité dont je ne suis pas membre, réponse 404 neutre. Les opérations sont
 * lues avec le même client, donc filtrées par la même RLS.
 */
import { getEntite } from "@/lib/repositories/entites";
import { listerCategories } from "@/lib/repositories/categories";
import { listerOperationsBudget } from "@/lib/repositories/budgets";
import { createClient } from "@/lib/supabase/server";
import { comparaisonAnnuelle, genererCsvComparaison, lireAnnees, nomFichierComparaison } from "@/lib/services/budgets";

export async function GET(request: Request, { params }: { params: Promise<{ entiteId: string }> }) {
  const { entiteId } = await params;
  const supabase = await createClient();

  const entite = await getEntite(supabase, entiteId);
  if (!entite) {
    return new Response("Entité introuvable.", { status: 404 });
  }

  const url = new URL(request.url);
  const annees = lireAnnees(url.searchParams.getAll("annees"), new Date().getFullYear());

  const [categories, operations] = await Promise.all([
    listerCategories(supabase, entiteId, false),
    listerOperationsBudget(supabase, entiteId, annees[0]!, annees[annees.length - 1]!),
  ]);

  // BOM UTF-8 (﻿) : indispensable pour qu'Excel affiche les accents.
  const csv = "﻿" + genererCsvComparaison(comparaisonAnnuelle(categories, operations, annees));

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${nomFichierComparaison(entite.nom, annees)}"`,
      "Cache-Control": "no-store",
    },
  });
}
