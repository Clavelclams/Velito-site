/**
 * GET /api/v1/classement — le classement public (14/11/2026).
 * ?discipline=ESPORT|SPORT (optionnel), ?limite=1..200 (défaut 100).
 * Même calcul que la page /classement (lib/arena/chargement-classement.ts) :
 * points de participation (champion +3, finaliste +2, top 4 +1), jamais
 * l'ELO, et jamais un mineur en mode restreint.
 */
import { getAnonClient } from "@/lib/supabase/anon";
import { chargerClassement } from "@/lib/arena/chargement-classement";
import { entierBorne } from "@/lib/arena/api-cles";
import { preflight, repondre, verifierAcces } from "@/lib/arena/api-v1";
import type { Discipline } from "@/lib/arena/types";

export async function GET(request: Request) {
  const acces = await verifierAcces(request);
  if (!acces.ok) return acces.reponse;

  const p = new URL(request.url).searchParams;
  const brut = p.get("discipline");
  const discipline: Discipline | null = brut === "ESPORT" || brut === "SPORT" ? brut : null;
  const limite = entierBorne(p.get("limite"), 100, 1, 200);

  const lignes = await chargerClassement(getAnonClient(), discipline);
  return repondre(
    {
      discipline: discipline ?? "TOUS",
      bareme: { champion: 3, finaliste: 2, demi_finaliste: 1 },
      classement: lignes.slice(0, limite).map((l, i) => ({
        rang: i + 1,
        pseudo: l.pseudo,
        points: l.points,
        titres: l.titres,
        finales: l.finales,
        tournois: l.tournoisComptes,
      })),
      total: lignes.length,
    },
    acces
  );
}

export function OPTIONS() {
  return preflight();
}
