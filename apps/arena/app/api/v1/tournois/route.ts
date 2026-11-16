/**
 * GET /api/v1/tournois — liste des tournois publiés (14/11/2026).
 *
 * Paramètres (tous optionnels, une valeur inconnue est ignorée, jamais une
 * erreur) :
 *   statut       OUVERT | EN_COURS | TERMINE | ANNULE
 *   jeu          libellé exact (« Padel », « Rocket League »…)
 *   discipline   ESPORT | SPORT
 *   organisation moi → seulement les tournois de l'organisation de la clé
 *   limite       1 à 100 (défaut 50) ;  page  à partir de 1
 *
 * Client ANONYME : un brouillon n'existe pas pour l'API, même avec la clé de
 * son organisation. Le qr_token rendu est celui de la page publique, déjà
 * imprimé sur les QR codes : il n'ouvre rien de plus que la page.
 */
import { getAnonClient } from "@/lib/supabase/anon";
import { entierBorne } from "@/lib/arena/api-cles";
import { preflight, repondre, urlTournoi, verifierAcces } from "@/lib/arena/api-v1";
import type { Tournoi } from "@/lib/arena/types";

const STATUTS = ["OUVERT", "EN_COURS", "TERMINE", "ANNULE"];
const DISCIPLINES = ["ESPORT", "SPORT"];

export async function GET(request: Request) {
  const acces = await verifierAcces(request);
  if (!acces.ok) return acces.reponse;

  const p = new URL(request.url).searchParams;
  const limite = entierBorne(p.get("limite"), 50, 1, 100);
  const page = entierBorne(p.get("page"), 1, 1, 10000);

  let requete = getAnonClient()
    .schema("arena")
    .from("tournois")
    .select("titre, jeu, discipline, format, statut, date_debut, lieu, taille_equipe, qr_token", { count: "exact" })
    .order("date_debut", { ascending: false })
    .range((page - 1) * limite, page * limite - 1);

  const statut = p.get("statut");
  if (statut && STATUTS.includes(statut)) requete = requete.eq("statut", statut);
  const discipline = p.get("discipline");
  if (discipline && DISCIPLINES.includes(discipline)) requete = requete.eq("discipline", discipline);
  const jeu = p.get("jeu");
  if (jeu) requete = requete.eq("jeu", jeu.slice(0, 80));
  if (p.get("organisation") === "moi") requete = requete.eq("organisation_id", acces.organisationId);

  const { data, count, error } = await requete;
  if (error) {
    console.error("[api/v1/tournois]", error.code, error.message);
    return repondre({ tournois: [], total: 0, page, limite }, acces);
  }

  type Ligne = Pick<
    Tournoi,
    "titre" | "jeu" | "discipline" | "format" | "statut" | "date_debut" | "lieu" | "taille_equipe" | "qr_token"
  >;
  return repondre(
    {
      tournois: ((data ?? []) as Ligne[]).map((t) => ({
        token: t.qr_token,
        titre: t.titre,
        jeu: t.jeu,
        discipline: t.discipline ?? "ESPORT",
        format: t.format,
        taille_equipe: t.taille_equipe ?? 1,
        statut: t.statut,
        date_debut: t.date_debut,
        lieu: t.lieu,
        url: urlTournoi(request, t.qr_token),
        detail: `/api/v1/tournois/${t.qr_token}`,
      })),
      total: count ?? 0,
      page,
      limite,
    },
    acces
  );
}

export function OPTIONS() {
  return preflight();
}
