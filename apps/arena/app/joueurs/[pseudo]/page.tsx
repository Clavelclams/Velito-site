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
        .select("id, membres:equipes_membres(joueur_id)")
        .in("tournoi_id", ids),
    ]);
    const mesEquipes = new Set(
      ((equipesData ?? []) as { id: string; membres: { joueur_id: string }[] }[])
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
