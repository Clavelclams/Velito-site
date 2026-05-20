/**
 * TournoisSection — Affiche la liste des tournois ou le user a represente VEA.
 *
 * Server Component (pas d'interactivite). Recoit en props la liste deja fetched
 * depuis page.tsx pour eviter un double round-trip Supabase.
 *
 * Si le user n'a participe a aucun tournoi enregistre : section masquee (return null)
 * pour ne pas polluer le profil avec un bloc vide.
 *
 * Indique au passage le bouton "Voir tous les tournois VEA" qui mene a la
 * page admin (visible uniquement pour les editor+) ou au futur /tournois public.
 */

interface TournoiParticipation {
  tournoi_id: string;
  role_dans_equipe: string;
  pseudo_utilise: string | null;
  tournois: {
    id: string;
    nom: string;
    jeu: string;
    date_debut: string;
    mode: string;
    format: string;
    resultat: string | null;
    representation_vea: boolean;
    cash_prize: number | null;
  } | null;
}

interface TournoisSectionProps {
  participations: TournoiParticipation[];
  /** Si TRUE, on affiche le lien "Gerer les tournois" qui mene a /admin/tournois. */
  isAdmin: boolean;
}

export default function TournoisSection({
  participations,
  isAdmin,
}: TournoisSectionProps) {
  // Filtre les participations valides (tournoi != null) et representation_vea=true
  const valides = participations.filter(
    (p) => p.tournois !== null && p.tournois.representation_vea
  );

  if (valides.length === 0) {
    return null;
  }

  // Stats
  const totalTournois = valides.length;
  const victoires = valides.filter((p) => p.tournois?.resultat === "champion").length;
  const cashPrizeTotal = valides.reduce(
    (sum, p) => sum + Number(p.tournois?.cash_prize ?? 0),
    0
  );

  return (
    <section className="mt-8">
      <div className="card-clean p-6">
        <div className="flex items-baseline justify-between mb-4 flex-wrap gap-2">
          <h2 className="text-xl font-black text-vea-text">
            Mes <span className="text-vea-accent">tournois</span> VEA
          </h2>
          {isAdmin && (
            <a
              href="/admin/tournois"
              className="text-xs text-vea-accent hover:underline font-semibold"
            >
              Gérer les tournois →
            </a>
          )}
        </div>

        <p className="text-xs text-vea-text-muted mb-4 leading-relaxed">
          Compétitions où tu as représenté VEA. Ces tournois donnent un palmarès
          visible sur ton profil mais ne comptent pas dans l&apos;XP bénévolat
          (différent du système terrain).
        </p>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-5">
          <div className="text-center p-3 rounded-lg bg-vea-bg border border-vea-border">
            <div className="text-xl font-black text-vea-accent">{totalTournois}</div>
            <p className="text-[10px] uppercase tracking-widest text-vea-text-muted mt-1">
              Participations
            </p>
          </div>
          <div className="text-center p-3 rounded-lg bg-vea-bg border border-vea-border">
            <div className="text-xl font-black text-amber-600">{victoires}</div>
            <p className="text-[10px] uppercase tracking-widest text-vea-text-muted mt-1">
              Victoires
            </p>
          </div>
          <div className="text-center p-3 rounded-lg bg-vea-bg border border-vea-border">
            <div className="text-xl font-black text-vea-text">{cashPrizeTotal}€</div>
            <p className="text-[10px] uppercase tracking-widest text-vea-text-muted mt-1">
              Cash prize
            </p>
          </div>
        </div>

        {/* Liste */}
        <div className="space-y-2">
          {valides.map((p) => {
            const t = p.tournois!;
            return (
              <div
                key={p.tournoi_id}
                className="p-3 rounded-lg border border-vea-border bg-white flex items-start justify-between gap-3 flex-wrap"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2 mb-1 flex-wrap">
                    <span className="text-[10px] uppercase tracking-widest font-bold px-2 py-0.5 rounded bg-vea-accent-soft text-vea-accent">
                      {t.jeu}
                    </span>
                    <span className="text-[10px] uppercase tracking-widest text-vea-text-dim">
                      {t.mode === "online" ? "En ligne" : "Présentiel"}
                    </span>
                    {p.role_dans_equipe === "capitaine" && (
                      <span className="text-[10px] uppercase tracking-widest font-bold text-vea-accent">
                        Capitaine
                      </span>
                    )}
                    {t.resultat === "champion" && (
                      <span className="text-[10px] uppercase tracking-widest font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-700">
                        Champion
                      </span>
                    )}
                  </div>
                  <p className="text-sm font-bold text-vea-text leading-tight">
                    {t.nom}
                  </p>
                  <p className="text-xs text-vea-text-muted mt-0.5">
                    {new Date(t.date_debut).toLocaleDateString("fr-FR", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                    {p.pseudo_utilise && (
                      <>
                        {" · pseudo "}
                        <span className="font-mono text-vea-text-dim">
                          {p.pseudo_utilise}
                        </span>
                      </>
                    )}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
