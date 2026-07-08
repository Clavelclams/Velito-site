/**
 * Route de TÉLÉCHARGEMENT du FEC — Route Handler (GET).
 * Charge les écritures, leurs lignes et le plan comptable, puis délègue la
 * mise en forme au service pur `genererFec`. Sécurité : getEntite (RLS) → 404
 * si l'entité n'est pas à moi.
 */
import { getEntite } from "@/lib/repositories/entites";
import { listerComptes } from "@/lib/repositories/comptes";
import {
  listerEcritures,
  listerToutesLignes,
} from "@/lib/repositories/ecritures";
import { createClient } from "@/lib/supabase/server";
import { genererFec, nomFichierFec } from "@/lib/services/fec";
import type { LigneEcriture, Compte } from "@/types/database";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ entiteId: string }> },
) {
  const { entiteId } = await params;
  const supabase = await createClient();

  const entite = await getEntite(supabase, entiteId);
  if (!entite) return new Response("Entité introuvable.", { status: 404 });

  const [ecritures, lignes, comptes] = await Promise.all([
    listerEcritures(supabase, entiteId),
    listerToutesLignes(supabase, entiteId),
    listerComptes(supabase, entiteId, false),
  ]);

  // Regroupe les lignes par écriture et indexe les comptes.
  const lignesParEcriture = new Map<string, LigneEcriture[]>();
  for (const l of lignes) {
    const arr = lignesParEcriture.get(l.ecriture_id) ?? [];
    arr.push(l);
    lignesParEcriture.set(l.ecriture_id, arr);
  }
  const comptesParId = new Map<string, Compte>(comptes.map((c) => [c.id, c]));

  const contenu = genererFec(ecritures, lignesParEcriture, comptesParId);
  const nom = nomFichierFec("", new Date().toISOString().slice(0, 10));

  return new Response(contenu, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Content-Disposition": `attachment; filename="${nom}"`,
      "Cache-Control": "no-store",
    },
  });
}
