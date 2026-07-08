/**
 * Route de TÉLÉCHARGEMENT du CSV — Route Handler (GET).
 *
 * Pourquoi une route et pas une page : on ne renvoie pas du HTML mais un
 * FICHIER (en-tête Content-Disposition: attachment). Le navigateur télécharge
 * sans quitter la page d'export. Un simple <form method="get"> suffit à
 * l'appeler avec les bornes de période en query string — zéro JS client.
 *
 * Sécurité : le middleware exige déjà une session ; getEntite (via RLS) refuse
 * une entité qui n'est pas à moi → 404 neutre. On ne peut donc pas exporter
 * les données d'un autre en devinant une URL.
 */
import { getEntite } from "@/lib/repositories/entites";
import { listerTransactions } from "@/lib/repositories/transactions";
import { listerCategories } from "@/lib/repositories/categories";
import { createClient } from "@/lib/supabase/server";
import {
  filtrerParPeriode,
  genererCsv,
  nomFichierExport,
} from "@/lib/services/export";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ entiteId: string }> },
) {
  const { entiteId } = await params;
  const supabase = await createClient();

  const entite = await getEntite(supabase, entiteId);
  if (!entite) {
    return new Response("Entité introuvable.", { status: 404 });
  }

  // Bornes optionnelles ("" → undefined = pas de limite de ce côté).
  const url = new URL(request.url);
  const debut = url.searchParams.get("debut") || undefined;
  const fin = url.searchParams.get("fin") || undefined;

  const [transactions, categories] = await Promise.all([
    listerTransactions(supabase, entiteId),
    listerCategories(supabase, entiteId, false),
  ]);

  const nomsCategories: Record<string, string> = {};
  for (const c of categories) nomsCategories[c.id] = c.nom;

  const lignes = filtrerParPeriode(transactions, debut, fin);

  // BOM UTF-8 (\uFEFF) : indispensable pour qu'Excel affiche les accents.
  const csv = "\uFEFF" + genererCsv(lignes, nomsCategories);

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${nomFichierExport(entite.nom)}"`,
      // Pas de cache : le contenu dépend des données du moment.
      "Cache-Control": "no-store",
    },
  });
}
