/**
 * GET /t/{token}/ecran/etat — l'état de l'écran du défi, en JSON, relu par
 * l'écran toutes les 3 secondes (17/11/2026).
 *
 * Pourquoi un rafraîchissement et pas Supabase Realtime : les tables du
 * défi n'ont volontairement aucun droit pour le client anonyme (migration
 * 015), et un écran de gymnase sur un Wi-Fi capricieux se remet tout seul
 * d'une coupure avec un simple fetch répété, là où une connexion websocket
 * peut rester bloquée sans le dire. 3 s de délai, c'est invisible sur une
 * manche de 4 minutes.
 */
import { chargerDefiParToken } from "@/lib/arena/defi-donnees";
import { construireEtatEcran } from "@/lib/arena/defi-ecran";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  try {
    const complet = await chargerDefiParToken(token);
    if (!complet) return Response.json({ erreur: "introuvable" }, { status: 404, headers: { "Cache-Control": "no-store" } });
    return Response.json(construireEtatEcran(complet, Date.now()), {
      headers: { "Cache-Control": "no-store", "X-Robots-Tag": "noindex" },
    });
  } catch {
    return Response.json({ erreur: "indisponible" }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
