/**
 * /admin/rattachements : demandes « ce pseudo, c'est moi » (12/11/2026).
 *
 * Un joueur connecté réclame un pseudo créé au bureau. Le staff vérifie que
 * c'est bien lui (il le connaît, il l'a vu jouer) et accepte ou refuse.
 *
 * On ne montre que les demandes portant sur des joueurs qui ont joué dans
 * une organisation du staff connecté : le staff d'une autre asso ne peut ni
 * voir ni trancher. Les actions refont ce contrôle (verifierLienStaffJoueur).
 *
 * L'adresse mail du demandeur est affichée : c'est elle qui permet au staff
 * de reconnaître la personne. Elle n'apparaît que sur cette page staff.
 */
import { getContexteStaff } from "@/lib/arena/auth";
import { accepterRattachement, refuserRattachement } from "@/lib/arena/actions";
import { getServiceClient } from "@/lib/supabase/service";
import BandeauErreur from "@/components/BandeauErreur";

export const dynamic = "force-dynamic";

const btn = "rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors";

export default async function PageRattachements({
  searchParams,
}: {
  searchParams: Promise<{ erreur?: string }>;
}) {
  const { erreur } = await searchParams;
  const ctx = await getContexteStaff();
  if (!ctx) return null; // le layout /admin a déjà affiché l'écran de connexion
  const db = getServiceClient();

  const { data: demandesData } = await db
    .schema("arena")
    .from("demandes_rattachement")
    .select("id, joueur_id, user_id, created_at, joueur:joueurs(pseudo)")
    .eq("statut", "EN_ATTENTE")
    .order("created_at", { ascending: true });

  const demandes = (demandesData ?? []) as unknown as {
    id: string;
    joueur_id: string;
    user_id: string;
    created_at: string;
    joueur: { pseudo: string } | null;
  }[];

  // Filtre « joueurs de mes organisations » : une seule requête pour toutes
  // les demandes, au lieu d'une par ligne.
  const orgIds = ctx.organisations.map((o) => o.id);
  const joueurIds = [...new Set(demandes.map((d) => d.joueur_id))];
  let miens = new Set<string>();
  if (joueurIds.length > 0) {
    const { data: parts } = await db
      .schema("arena")
      .from("participations")
      .select("joueur_id, tournoi:tournois!inner(organisation_id, titre)")
      .in("joueur_id", joueurIds)
      .in("tournoi.organisation_id", orgIds);
    miens = new Set((parts ?? []).map((p) => p.joueur_id as string));
  }
  const visibles = demandes.filter((d) => miens.has(d.joueur_id));

  // Adresse du demandeur (auth.users n'est lisible qu'avec service_role).
  const emails = new Map<string, string>();
  await Promise.all(
    visibles.map(async (d) => {
      const { data } = await db.auth.admin.getUserById(d.user_id);
      if (data?.user?.email) emails.set(d.user_id, data.user.email);
    })
  );

  return (
    <div className="space-y-6">
      <BandeauErreur message={erreur} />
      <div>
        <h1 className="text-2xl font-black">Demandes de rattachement</h1>
        <p className="mt-1 text-sm text-arena-muted">
          Un joueur connecté dit « ce pseudo, c&apos;est moi ». Accepte seulement
          si tu reconnais la personne : elle récupère tout le palmarès du
          pseudo.
        </p>
      </div>

      {visibles.length === 0 ? (
        <p className="text-sm text-arena-faint">Aucune demande en attente.</p>
      ) : (
        <ul className="space-y-3">
          {visibles.map((d) => (
            <li
              key={d.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-arena-border bg-arena-surface px-4 py-3 shadow-carte"
            >
              <div className="text-sm">
                <p className="font-semibold">
                  Pseudo : {d.joueur?.pseudo ?? "?"}
                </p>
                <p className="text-arena-muted">
                  Demandé par {emails.get(d.user_id) ?? "compte inconnu"} le{" "}
                  {new Date(d.created_at).toLocaleDateString("fr-FR")}
                </p>
              </div>
              <div className="flex gap-2">
                <form action={accepterRattachement}>
                  <input type="hidden" name="demande_id" value={d.id} />
                  <button className={`${btn} bg-arena-green text-white hover:bg-arena-green/90`}>
                    Accepter
                  </button>
                </form>
                <form action={refuserRattachement}>
                  <input type="hidden" name="demande_id" value={d.id} />
                  <button className={`${btn} border border-arena-border text-arena-muted hover:text-arena-ink`}>
                    Refuser
                  </button>
                </form>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
