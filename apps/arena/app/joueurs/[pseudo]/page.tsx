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
import type { Joueur, MatchRow, Tournoi } from "@/lib/arena/types";
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
  const [{ data: partData }, { data: badgesData }] = await Promise.all([
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

  // Résultats sportifs : points par tournoi terminé où il a joué.
  const tournoisTermines = participations
    .map((p) => p.tournoi)
    .filter((t): t is Tournoi => t !== null && t.statut === "TERMINE");

  let points = 0;
  let titres = 0;
  if (tournoisTermines.length > 0) {
    const { data: matchsData } = await supabase
      .schema("arena")
      .from("matchs")
      .select("*")
      .in(
        "tournoi_id",
        tournoisTermines.map((t) => t.id)
      );
    const parTournoi = new Map<string, MatchRow[]>();
    for (const m of (matchsData ?? []) as MatchRow[]) {
      const liste = parTournoi.get(m.tournoi_id) ?? [];
      liste.push(m);
      parTournoi.set(m.tournoi_id, liste);
    }
    for (const matchs of parTournoi.values()) {
      const p = pointsDuTournoi(matchs).get(joueur.id) ?? 0;
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
