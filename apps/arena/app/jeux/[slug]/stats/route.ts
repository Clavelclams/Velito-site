/**
 * GET /jeux/[slug]/stats?pseudo=…&plateforme=… — redirection 302 vers le
 * profil du joueur sur le tracker de référence du jeu.
 *
 * Pourquoi une redirection serveur et pas un lien construit en JavaScript :
 *  - le formulaire de la fiche jeu reste un <form method="get"> natif ;
 *  - la LISTE BLANCHE des destinations vit dans lib/arena/trackers.ts, testée —
 *    on ne redirige jamais vers une URL venue de l'utilisateur, uniquement
 *    vers une URL que NOTRE code a construite pour un tracker connu. Un « open
 *    redirect » (rediriger vers n'importe quoi) servirait au phishing ; ici
 *    c'est impossible par construction.
 *
 * Si le pseudo est vide, le jeu inconnu ou la plateforme invalide, on renvoie
 * le joueur sur la fiche du jeu plutôt que vers une 404 chez un tiers.
 */
import { lienProfilTracker } from "@/lib/arena/trackers";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const url = new URL(req.url);
  const pseudo = url.searchParams.get("pseudo") ?? "";
  const plateforme = url.searchParams.get("plateforme") ?? undefined;

  const destination = lienProfilTracker(slug, pseudo, plateforme);
  return Response.redirect(destination ?? new URL(`/jeux/${slug}`, url).href, 302);
}
