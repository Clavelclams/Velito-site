/**
 * GET /admin/tournois/[id]/export — la liste des PARTICIPANTS en CSV, STAFF.
 *
 * Usage réel : pointer les arrivées sur papier quand le wifi lâche, préparer
 * les feuilles de match, transmettre la liste à la mairie ou au partenaire
 * qui prête la salle. Le staff a déjà ces données à l'écran — il lui manquait
 * juste un format qui s'imprime.
 *
 * Sécurité : même modèle que les Server Actions — getContexteStaff() puis
 * contrôle d'appartenance à l'organisation. Un route handler n'est PAS couvert
 * par le gate du layout /admin (le layout ne protège que du rendu de pages),
 * donc la vérification est refaite ici, comme dans chaque action.
 */
import { notFound } from "next/navigation";
import { estStaffDe, getContexteStaff } from "@/lib/arena/auth";
import { getServiceClient } from "@/lib/supabase/service";
import { entetesCsv, genererCsv } from "@/lib/arena/csv";
import type { Joueur, Participation, Tournoi } from "@/lib/arena/types";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const ctx = await getContexteStaff();
  // 404 et non 403 : ne pas confirmer à un anonyme que ce tournoi existe.
  if (!ctx) notFound();

  const db = getServiceClient();
  const { data: tournoiData } = await db
    .schema("arena")
    .from("tournois")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (!tournoiData) notFound();
  const tournoi = tournoiData as Tournoi;
  if (!estStaffDe(ctx, tournoi.organisation_id)) notFound();

  const [{ data: partData }, { data: equipesData }] = await Promise.all([
    db
      .schema("arena")
      .from("participations")
      .select("*, joueur:joueurs(pseudo)")
      .eq("tournoi_id", id)
      .order("created_at", { ascending: true }),
    db
      .schema("arena")
      .from("equipes")
      .select("id, nom, membres:equipes_membres(joueur_id)")
      .eq("tournoi_id", id),
  ]);

  const equipeDe = new Map<string, string>();
  for (const e of (equipesData ?? []) as {
    id: string;
    nom: string;
    membres: { joueur_id: string }[];
  }[]) {
    for (const mb of e.membres ?? []) equipeDe.set(mb.joueur_id, e.nom);
  }

  const participations = (partData ?? []) as unknown as (Participation & {
    joueur: Pick<Joueur, "pseudo"> | null;
  })[];

  const lignes: string[][] = [
    ["Pseudo", "Check-in", "Équipe", "Tête de série"],
    ...participations.map((p) => [
      p.joueur?.pseudo ?? "?",
      p.check_in ? "oui" : "non",
      equipeDe.get(p.joueur_id) ?? "",
      // ordre est 0-indexé en base ; à l'export on parle aux humains.
      p.ordre === null || p.ordre === undefined ? "" : String(p.ordre + 1),
    ]),
  ];

  const slug = tournoi.titre.replace(/[\\/:*?"<>|]/g, "-").slice(0, 60);
  return new Response(genererCsv(lignes), {
    headers: entetesCsv(`arena-${slug}-participants.csv`),
  });
}
