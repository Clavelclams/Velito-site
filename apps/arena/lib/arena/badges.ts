/**
 * Badges esport — attribution AUTOMATIQUE à la clôture d'un tournoi.
 *
 * Principe (feuille de route Lot 4) : les badges se gagnent, ils ne se
 * décernent pas à la main. L'attribution est déclenchée par la transition
 * EN_COURS → TERMINE (voir actions.ts) et est idempotente : re-clôturer ou
 * rejouer l'attribution ne crée jamais de doublon (PK joueur+badge).
 *
 * Catalogue V1 volontairement court — un badge doit se raconter en une
 * phrase. Le catalogue est upserté à la volée (pas de seed manuel à gérer).
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { pointsDuTournoi } from "./classement";
import type { MatchRow } from "./types";

const CATALOGUE = [
  { code: "PREMIER_TOURNOI", nom: "Première arène", description: "A participé à son premier tournoi ARENA." },
  { code: "CHAMPION", nom: "Champion", description: "A remporté un tournoi." },
  { code: "FINALISTE", nom: "Finaliste", description: "A atteint une finale." },
] as const;

/**
 * Attribue les badges du tournoi qui vient d'être clôturé.
 * `db` est le client service_role (appelé uniquement depuis une Server Action
 * après requireStaff). Ne lève pas : un échec de badge ne doit JAMAIS bloquer
 * la clôture d'un tournoi (best-effort, loggé côté serveur).
 */
export async function attribuerBadgesTournoi(
  db: SupabaseClient,
  tournoiId: string,
  matchs: MatchRow[],
  participantsCheckIn: string[],
  /**
   * Composition des équipes pour un tournoi de sport. Sans elle, le vainqueur
   * d'un tournoi de padel serait un identifiant d'ÉQUIPE, qu'on tenterait
   * d'insérer dans badges_joueurs.joueur_id : la clé étrangère refuserait, et
   * personne n'aurait son badge.
   */
  membresParEquipe?: Map<string, string[]>
): Promise<void> {
  try {
    // 1. Catalogue à jour (idempotent — ignoreDuplicates sur le code unique).
    await db
      .schema("arena")
      .from("badges")
      .upsert([...CATALOGUE], { onConflict: "code", ignoreDuplicates: true });

    const { data: catalogueData } = await db
      .schema("arena")
      .from("badges")
      .select("id, code");
    const idParCode = new Map(
      (catalogueData ?? []).map((b) => [b.code as string, b.id as string])
    );

    const attributions: { joueur_id: string; badge_id: string; tournoi_id: string }[] = [];
    const ajouter = (joueurId: string | null, code: string) => {
      const badgeId = idParCode.get(code);
      if (joueurId && badgeId) {
        attributions.push({ joueur_id: joueurId, badge_id: badgeId, tournoi_id: tournoiId });
      }
    };

    // 2. PREMIER_TOURNOI : tous les participants check-in. La PK (joueur,badge)
    // + ignoreDuplicates garantit que seul le VRAI premier tournoi le pose.
    for (const joueurId of participantsCheckIn) ajouter(joueurId, "PREMIER_TOURNOI");

    // 3. CHAMPION / FINALISTE d'après le résultat sportif (logique pure testée).
    // Champion = 3 pts, finaliste (perdant de la finale) = exactement 2 pts.
    // On ne donne PAS "Finaliste" au champion : afficher les deux badges
    // ensemble ressemble à un bug côté joueur (constaté au test du 12/08).
    const pts = pointsDuTournoi(matchs);
    for (const [campId, p] of pts) {
      // Un camp est un joueur (esport) ou une équipe (sport) : dans le second
      // cas, les deux membres de la paire reçoivent le même badge.
      for (const joueurId of membresParEquipe?.get(campId) ?? [campId]) {
        if (p >= 3) ajouter(joueurId, "CHAMPION");
        else if (p === 2) ajouter(joueurId, "FINALISTE");
      }
    }

    if (attributions.length > 0) {
      await db
        .schema("arena")
        .from("badges_joueurs")
        .upsert(attributions, {
          onConflict: "joueur_id,badge_id",
          ignoreDuplicates: true,
        });
    }
  } catch (e) {
    console.error("[arena/badges] attribution échouée (non bloquant) :", e);
  }
}
