/**
 * Profil joueur public — LE « CV esport », fil conducteur du produit :
 * « un joueur, un profil, des résultats qui ne se perdent pas ».
 *
 * Client anonyme → RLS. Un joueur anonymisé (droit à l'effacement) renvoie
 * 404 : la RLS le masque, la page n'a même pas à le savoir. Un mineur en
 * mode restreint reste consultable par pseudo direct (pseudonyme seul,
 * aucune donnée personnelle) mais n'apparaît dans aucun classement.
 */
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { pointsDuTournoi } from "@/lib/arena/classement";
import { calculerStatsJoueur, type TournoiJoue } from "@/lib/arena/stats";
import { libelleRang } from "@/lib/toornament";
import type { Joueur, MatchRow, ResultatExterne, Tournoi } from "@/lib/arena/types";
import EnteteSite from "@/components/EnteteSite";
import PiedSite from "@/components/PiedSite";

interface BadgeAffiche {
  nom: string;
  description: string | null;
}

export default async function PageJoueur({
  params,
}: {
  params: Promise<{ pseudo: string }>;
}) {
  const { pseudo: pseudoBrut } = await params;
  const pseudo = decodeURIComponent(pseudoBrut);

  const supabase = await createClient();

  const { data: joueurData } = await supabase
    .schema("arena")
    .from("joueurs")
    .select("*")
    .eq("pseudo", pseudo)
    .maybeSingle();
  if (!joueurData) notFound();
  const joueur = joueurData as Joueur;

  // Participations → tournois visibles (RLS filtre les brouillons).
  const [{ data: partData }, { data: badgesData }, { data: externesData }] =
    await Promise.all([
      supabase
        .schema("arena")
        .from("participations")
        .select("tournoi_id, check_in, tournoi:tournois(*)")
        .eq("joueur_id", joueur.id),
      supabase
        .schema("arena")
        .from("badges_joueurs")
        .select("badge:badges(nom, description)")
        .eq("joueur_id", joueur.id),
      // Palmarès externe (Toornament) : lecture publique, RLS migration 006.
      // `catch` implicite inutile : si la table n'existe pas encore (migration
      // non jouée), data vaut null et la section ne s'affiche pas.
      supabase
        .schema("arena")
        .from("resultats_externes")
        .select("*")
        .eq("joueur_id", joueur.id)
        .order("date_fin", { ascending: false }),
    ]);

  // Cast via unknown : sans types générés, Supabase ne sait pas qu'un embed
  // par FK est un to-one (objet) et l'infère en tableau — on connaît le schéma.
  const participations = (partData ?? []) as unknown as {
    tournoi_id: string;
    check_in: boolean;
    tournoi: Tournoi | null;
  }[];
  const badges = ((badgesData ?? []) as unknown as { badge: BadgeAffiche | null }[])
    .map((b) => b.badge)
    .filter((b): b is BadgeAffiche => b !== null);
  const resultatsExternes = (externesData ?? []) as ResultatExterne[];

  // Résultats sportifs : points par tournoi terminé où il a joué.
  const tournoisTermines = participations
    .map((p) => p.tournoi)
    .filter((t): t is Tournoi => t !== null && t.statut === "TERMINE");

  let points = 0;
  let titres = 0;
  let stats: ReturnType<typeof calculerStatsJoueur> | null = null;
  const pseudosStats = new Map<string, string>();
  if (tournoisTermines.length > 0) {
    const ids = tournoisTermines.map((t) => t.id);
    const [{ data: matchsData }, { data: equipesData }] = await Promise.all([
      supabase.schema("arena").from("matchs").select("*").in("tournoi_id", ids),
      // Équipes du joueur dans ces tournois : au padel, pointsDuTournoi rend
      // des points par ÉQUIPE. Sans cette correspondance, un champion de padel
      // afficherait 0 point sur son propre profil (bug repéré le 14/08/2026
      // après le premier tournoi padel : la carte /classement était juste,
      // le profil non — deux lectures du même barème doivent partager la
      // même résolution équipe → joueur).
      supabase
        .schema("arena")
        .from("equipes")
        .select("id, tournoi_id, membres:equipes_membres(joueur_id)")
        .in("tournoi_id", ids),
    ]);
    const equipes = (equipesData ?? []) as {
      id: string;
      tournoi_id: string;
      membres: { joueur_id: string }[];
    }[];
    const mesEquipes = new Set(
      equipes
        .filter((e) => (e.membres ?? []).some((mb) => mb.joueur_id === joueur.id))
        .map((e) => e.id)
    );
    const parTournoi = new Map<string, MatchRow[]>();
    for (const m of (matchsData ?? []) as MatchRow[]) {
      const liste = parTournoi.get(m.tournoi_id) ?? [];
      liste.push(m);
      parTournoi.set(m.tournoi_id, liste);
    }
    for (const matchs of parTournoi.values()) {
      const pts = pointsDuTournoi(matchs);
      // Points gagnés en individuel + points gagnés via une de ses équipes.
      let p = pts.get(joueur.id) ?? 0;
      for (const [campId, val] of pts) {
        if (mesEquipes.has(campId)) p += val;
      }
      points += p;
      if (p >= 3) titres += 1;
    }

    // ---- Stats maison (module pur lib/arena/stats.ts) ----
    // Un TournoiJoue par tournoi terminé : le jeu, les matchs, qui je suis
    // dedans (mon id + mon équipe éventuelle) et la composition des équipes
    // pour résoudre adversaires et partenaires jusqu'aux JOUEURS.
    const equipesParTournoi = new Map<string, typeof equipes>();
    for (const e of equipes) {
      const liste = equipesParTournoi.get(e.tournoi_id) ?? [];
      liste.push(e);
      equipesParTournoi.set(e.tournoi_id, liste);
    }
    const tournoisJoues: TournoiJoue[] = tournoisTermines.map((tr) => {
      const eqs = equipesParTournoi.get(tr.id) ?? [];
      return {
        jeu: tr.jeu,
        matchs: parTournoi.get(tr.id) ?? [],
        mesIds: [
          joueur.id,
          eqs.find((e) => (e.membres ?? []).some((mb) => mb.joueur_id === joueur.id))
            ?.id ?? null,
        ],
        membresParEquipe: new Map(
          eqs.map((e) => [e.id, (e.membres ?? []).map((mb) => mb.joueur_id)])
        ),
      };
    });
    stats = calculerStatsJoueur(tournoisJoues);

    // Pseudos des adversaires/partenaires affichés. Client ANONYME → RLS, et
    // filtre profil_public : un mineur en mode restreint n'apparaît dans
    // aucun palmarès d'autrui — même règle que le classement (RGPD).
    const idsAffiches = [
      ...stats.adversaires.slice(0, 6).map((a) => a.joueurId),
      ...stats.partenaires.slice(0, 6).map((pa) => pa.joueurId),
    ];
    if (idsAffiches.length > 0) {
      const { data: joueursData } = await supabase
        .schema("arena")
        .from("joueurs")
        .select("id, pseudo, profil_public")
        .in("id", idsAffiches);
      for (const j of (joueursData ?? []) as Pick<
        Joueur,
        "id" | "pseudo" | "profil_public"
      >[]) {
        if (j.profil_public) pseudosStats.set(j.id, j.pseudo);
      }
    }
  }

  const historique = participations
    .map((p) => p.tournoi)
    .filter((t): t is Tournoi => t !== null)
    .sort((a, b) => (a.date_debut < b.date_debut ? 1 : -1));

  return (
    <>
      <EnteteSite />
      <main className="mx-auto max-w-2xl px-4 py-12">
      <header className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-widest text-arena-lilac">
          ARENA · Profil joueur
        </p>
        <h1 className="mt-1 text-3xl font-black">{joueur.pseudo}</h1>
        <p className="mt-3 flex gap-4 text-sm text-arena-muted">
          <span>
            <span className="font-bold text-arena-ink">{points}</span> pts
          </span>
          <span>
            <span className="font-bold text-arena-ink">{titres}</span> titre
            {titres > 1 ? "s" : ""}
          </span>
          <span>
            <span className="font-bold text-arena-ink">{historique.length}</span>{" "}
            tournoi{historique.length > 1 ? "s" : ""}
          </span>
        </p>
      </header>

      {badges.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-widest text-arena-faint">
            Badges
          </h2>
          <ul className="flex flex-wrap gap-2">
            {badges.map((b) => (
              <li
                key={b.nom}
                title={b.description ?? undefined}
                className="rounded-full border border-arena-gold/30 bg-arena-gold-pale px-3 py-1 text-sm font-semibold text-arena-gold"
              >
                {b.nom}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Stats maison : calculées sur NOS tournois uniquement (module pur
          lib/arena/stats.ts). Les joueurs en mode restreint sont absents des
          listes adversaires/partenaires — pseudosStats ne les contient pas. */}
      {stats && stats.matchsJoues > 0 && (
        <section className="mb-8">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-widest text-arena-faint">
            Stats
          </h2>

          <p className="mb-3 text-sm text-arena-muted">
            <span className="font-bold text-arena-ink">{stats.matchsJoues}</span>{" "}
            match{stats.matchsJoues > 1 ? "s" : ""} ·{" "}
            <span className="font-bold text-arena-green">{stats.victoires} V</span>{" "}
            /{" "}
            <span className="font-bold text-arena-ink">{stats.defaites} D</span>
            {stats.winrate !== null && (
              <>
                {" "}
                ·{" "}
                <span className="font-bold text-arena-ink">
                  {stats.winrate} %
                </span>{" "}
                de victoires
              </>
            )}
          </p>

          <ul className="space-y-1.5">
            {stats.parJeu.slice(0, 5).map((l) => (
              <li
                key={l.jeu}
                className="flex items-center justify-between rounded-lg border border-arena-border bg-arena-surface shadow-carte px-4 py-2 text-sm"
              >
                <span className="font-semibold">{l.jeu}</span>
                <span className="text-arena-muted">
                  {l.victoires} V / {l.defaites} D ·{" "}
                  <span className="font-bold text-arena-ink">{l.winrate} %</span>
                </span>
              </li>
            ))}
          </ul>

          {(() => {
            // N'afficher que les joueurs à profil public (résolus plus haut).
            const rivaux = stats.adversaires
              .filter((a) => pseudosStats.has(a.joueurId))
              .slice(0, 3);
            const coequipiers = stats.partenaires
              .filter((pa) => pseudosStats.has(pa.joueurId))
              .slice(0, 3);
            if (rivaux.length === 0 && coequipiers.length === 0) return null;
            return (
              <div className="mt-3 space-y-1 text-sm text-arena-muted">
                {rivaux.length > 0 && (
                  <p>
                    Adversaires fréquents :{" "}
                    {rivaux.map((a, i) => (
                      <span key={a.joueurId}>
                        {i > 0 && ", "}
                        <a
                          href={`/joueurs/${encodeURIComponent(pseudosStats.get(a.joueurId) ?? "")}`}
                          className="font-semibold text-arena-ink underline hover:text-arena-violet"
                        >
                          {pseudosStats.get(a.joueurId)}
                        </a>{" "}
                        <span className="text-arena-faint">
                          ({a.victoires}-{a.rencontres - a.victoires})
                        </span>
                      </span>
                    ))}
                  </p>
                )}
                {coequipiers.length > 0 && (
                  <p>
                    Partenaires d&apos;équipe :{" "}
                    {coequipiers.map((pa, i) => (
                      <span key={pa.joueurId}>
                        {i > 0 && ", "}
                        <a
                          href={`/joueurs/${encodeURIComponent(pseudosStats.get(pa.joueurId) ?? "")}`}
                          className="font-semibold text-arena-ink underline hover:text-arena-violet"
                        >
                          {pseudosStats.get(pa.joueurId)}
                        </a>{" "}
                        <span className="text-arena-faint">
                          ({pa.tournois} tournoi{pa.tournois > 1 ? "s" : ""})
                        </span>
                      </span>
                    ))}
                  </p>
                )}
              </div>
            );
          })()}
        </section>
      )}

      {/* Palmarès externe : résultats ajoutés par le staff (ou, si une clé
          API existe, vérifiés automatiquement à l'import) — JAMAIS comptés
          dans les points ARENA. La transparence tient au lien source affiché
          sur chaque ligne : vérifiable par n'importe qui, en un clic. */}
      {resultatsExternes.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-widest text-arena-faint">
            Palmarès externe
          </h2>
          <ul className="space-y-2">
            {resultatsExternes.map((r) => (
              <li key={r.id}>
                <a
                  href={r.url}
                  rel="noopener noreferrer"
                  className="flex items-center justify-between gap-3 rounded-lg border border-arena-border bg-arena-surface shadow-carte px-4 py-3 transition-colors hover:border-arena-violet/50"
                >
                  <span>
                    <span className="font-bold">{r.nom_tournoi}</span>
                    <span className="ml-2 text-sm text-arena-muted">
                      {r.jeu ? `${r.jeu} · ` : ""}
                      {r.date_fin
                        ? new Date(r.date_fin).toLocaleDateString("fr-FR")
                        : "date inconnue"}
                    </span>
                  </span>
                  <span className="whitespace-nowrap rounded-full bg-arena-violet/10 px-3 py-1 text-xs font-semibold text-arena-violet">
                    {libelleRang(r.rang, r.nb_participants)} · Toornament
                  </span>
                </a>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-arena-faint">
            Résultats obtenus sur Toornament, ajoutés par le staff — hors
            classement ARENA, lien source vérifiable sur chaque ligne.
          </p>
        </section>
      )}

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-widest text-arena-faint">
          Parcours
        </h2>
        {historique.length === 0 ? (
          <p className="text-sm text-arena-faint">
            Aucun tournoi public pour l&apos;instant.
          </p>
        ) : (
          <ul className="space-y-2">
            {historique.map((t) => (
              <li key={t.id}>
                <a
                  href={`/t/${t.qr_token}`}
                  className="flex items-center justify-between rounded-lg border border-arena-border bg-arena-surface shadow-carte px-4 py-3 transition-colors hover:border-arena-violet/50"
                >
                  <span>
                    <span className="font-bold">{t.titre}</span>
                    <span className="ml-2 text-sm text-arena-muted">
                      {t.jeu} ·{" "}
                      {new Date(t.date_debut).toLocaleDateString("fr-FR")}
                    </span>
                  </span>
                  <span className="rounded-full bg-arena-surface px-3 py-1 text-xs font-semibold text-arena-muted">
                    {t.statut === "TERMINE" ? "Terminé" : t.statut}
                  </span>
                </a>
              </li>
            ))}
          </ul>
        )}
      </section>

      </main>
      <PiedSite />
    </>
  );
}
