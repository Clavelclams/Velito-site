/**
 * GET /admin/defis/{id}/export — les scores du défi en CSV (17/11/2026), pour
 * le cumul de l'APSL 80 et le rapport d'activité. Staff seulement (contrôle
 * refait ici : une route n'hérite pas du layout /admin).
 * Une ligne par équipe (« G3 Rouge »), puis le total de la matinée.
 */
import { notFound } from "next/navigation";
import { estStaffDe, getContexteStaff } from "@/lib/arena/auth";
import { chargerDefiParId } from "@/lib/arena/defi-donnees";
import { lignesCsv } from "@/lib/arena/defi";
import { entetesCsv, genererCsv } from "@/lib/arena/csv";
import { slugFichier } from "@/lib/arena/chargement-public";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await getContexteStaff();
  if (!ctx) return new Response("Connexion staff requise.", { status: 401 });
  const complet = await chargerDefiParId(id);
  if (!complet || !estStaffDe(ctx, complet.defi.organisation_id)) notFound();
  const { defi, rotations, equipes } = complet;
  return new Response(genererCsv(lignesCsv(rotations, equipes, defi.unite)), {
    headers: entetesCsv(`defi-${slugFichier(defi.titre)}-scores.csv`),
  });
}
