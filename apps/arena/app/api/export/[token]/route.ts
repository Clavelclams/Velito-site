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
import { libelleTour } from "@/lib/arena/mon-match";

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
  const { tournoi, participants, matchs, equipes, nom, nbRounds } = donnees;
  const parEquipes = (tournoi.taille_equipe ?? 1) > 1;

  const exportData = {
    format: "arena-export-v2",
    exporte_le: new Date().toISOString(),
    tournoi: {
      titre: tournoi.titre,
      jeu: tournoi.jeu,
      discipline: tournoi.discipline ?? "ESPORT",
      format: tournoi.format,
      taille_equipe: tournoi.taille_equipe ?? 1,
      statut: tournoi.statut,
      date_debut: tournoi.date_debut,
      lieu: tournoi.lieu,
    },
    participants: participants.map((p) => ({
      pseudo: p.pseudo,
      check_in: p.check_in,
    })),
    // Vide en esport individuel : le champ existe quand même, pour qu'un
    // consommateur n'ait pas deux formats à gérer.
    equipes: equipes.map((e) => ({ nom: e.nom, membres: e.membres })),
    matchs: matchs
      // Les byes sont un artefact du bracket, pas un résultat.
      .filter((m) => !m.is_bye)
      .map((m) => {
        const c1 = parEquipes ? m.equipe1_id : m.joueur1_id;
        const c2 = parEquipes ? m.equipe2_id : m.joueur2_id;
        const g = parEquipes ? m.equipe_gagnante_id : m.gagnant_id;
        return {
          tour: libelleTour(m, nbRounds),
          round: m.round,
          position: m.position,
          bracket: m.bracket ?? "W",
          poule: m.poule ?? null,
          camp1: c1 ? nom(c1) : null,
          camp2: c2 ? nom(c2) : null,
          score_camp1: m.score_j1,
          score_camp2: m.score_j2,
          gagnant: g ? nom(g) : null,
          terrain: m.terrain ?? null,
          statut: m.statut,
          // Champs v1 conservés (esport individuel uniquement).
          joueur1: m.joueur1_id ? nom(m.joueur1_id) : null,
          joueur2: m.joueur2_id ? nom(m.joueur2_id) : null,
          score_j1: m.score_j1,
          score_j2: m.score_j2,
        };
      }),
  };

  return new NextResponse(JSON.stringify(exportData, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="arena-${slugFichier(tournoi.titre)}.json"; filename*=UTF-8''${encodeURIComponent(`arena-${slugFichier(tournoi.titre)}.json`)}`,
      // Un export reflète l'instant où on clique : jamais de cache partagé.
      "Cache-Control": "no-store",
    },
  });
}
