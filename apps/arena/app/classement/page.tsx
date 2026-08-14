/**
 * Classement public — points cumulés sur les tournois TERMINÉS.
 * Barème : champion +3, finaliste +2, top 4 +1 (décision actée, cf.
 * lib/arena/classement.ts — logique pure testée).
 *
 * Depuis l'arrivée du module sport (padel, five…), la page couvre LES DEUX
 * verticales. Un seul barème pour tout le monde : c'est un classement de
 * PARTICIPATION, pas de force (la force, c'est l'ELO, serveur-seul).
 * Un filtre Tous / Esport / Sport est proposé en liens GET — zéro JavaScript,
 * même choix technique que la recherche de l'accueil : une URL par vue,
 * partageable et lisible par les moteurs.
 *
 * Client anonyme → RLS : seuls les tournois publiés et les joueurs non
 * anonymisés sont visibles. Les mineurs en mode restreint (profil_public =
 * false) sont exclus de l'affichage — exigence RGPD, filtrée ICI et par la RLS.
 */
import { createClient } from "@/lib/supabase/server";
import { calculerClassement } from "@/lib/arena/classement";
import type { Discipline, Joueur, MatchRow, Tournoi } from "@/lib/arena/types";
import EnteteSite from "@/components/EnteteSite";
import PiedSite from "@/components/PiedSite";

export const metadata = {
  title: "Classement · ARENA",
  description:
    "Classement des joueurs ARENA, esport et sport : points cumulés sur les tournois terminés (champion +3, finaliste +2, top 4 +1).",
};

/** Les trois vues possibles du classement. */
const FILTRES: { cle: string; libelle: string; discipline: Discipline | null }[] = [
  { cle: "tous", libelle: "Tous", discipline: null },
  { cle: "esport", libelle: "Esport", discipline: "ESPORT" },
  { cle: "sport", libelle: "Sport", discipline: "SPORT" },
];

export default async function PageClassement({
  searchParams,
}: {
  searchParams: Promise<{ v?: string }>;
}) {
  const { v } = await searchParams;
  // Valeur inconnue dans l'URL → retour à « Tous », jamais d'erreur : une URL
  // tapée à la main ne doit pas casser une page publique.
  const filtre = FILTRES.find((f) => f.cle === v) ?? FILTRES[0]!;

  let lignes: ReturnType<typeof calculerClassement> = [];
  const pseudos = new Map<string, { pseudo: string; public: boolean }>();

  try {
    const supabase = await createClient();

    let requete = supabase
      .schema("arena")
      .from("tournois")
      .select("id, discipline")
      .eq("statut", "TERMINE");
    if (filtre.discipline) {
      requete = requete.eq("discipline", filtre.discipline);
    }
    const { data: tournois } = await requete;

    if (tournois && tournois.length > 0) {
      const ids = tournois.map((t) => (t as Pick<Tournoi, "id">).id);
      const [{ data: matchsData }, { data: joueursData }, { data: equipesData }] =
        await Promise.all([
          supabase.schema("arena").from("matchs").select("*").in("tournoi_id", ids),
          supabase
            .schema("arena")
            .from("joueurs")
            .select("id, pseudo, profil_public"),
          // Compositions d'équipes : au padel, les points du tournoi vont à
          // chaque membre de la paire vainqueur, pas à un identifiant d'équipe
          // qui n'aurait aucun sens dans un classement de JOUEURS.
          supabase
            .schema("arena")
            .from("equipes")
            .select("id, membres:equipes_membres(joueur_id)")
            .in("tournoi_id", ids),
        ]);

      const membresParEquipe = new Map(
        ((equipesData ?? []) as { id: string; membres: { joueur_id: string }[] }[]).map(
          (e) => [e.id, (e.membres ?? []).map((mb) => mb.joueur_id)]
        )
      );

      for (const j of (joueursData ?? []) as Pick<
        Joueur,
        "id" | "pseudo" | "profil_public"
      >[]) {
        pseudos.set(j.id, { pseudo: j.pseudo, public: j.profil_public });
      }

      const parTournoi = new Map<string, MatchRow[]>();
      for (const m of (matchsData ?? []) as MatchRow[]) {
        const liste = parTournoi.get(m.tournoi_id) ?? [];
        liste.push(m);
        parTournoi.set(m.tournoi_id, liste);
      }
      lignes = calculerClassement([...parTournoi.values()], membresParEquipe).filter(
        // Mode restreint mineurs : jamais dans un classement public.
        (l) => pseudos.get(l.joueurId)?.public !== false
      );
    }
  } catch {
    // Env absente → liste vide, la page reste servable.
  }

  return (
    <>
      <EnteteSite />
      <main className="mx-auto max-w-2xl px-4 py-12">
      <header className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-widest text-arena-lilac">
          ARENA · Esport &amp; sport
        </p>
        <h1 className="mt-1 text-3xl font-black">Classement</h1>
        <p className="mt-2 text-sm text-arena-muted">
          Points cumulés sur les tournois terminés : champion +3, finaliste +2,
          top 4 +1. Les résultats ne se perdent plus.
        </p>
      </header>

      {/* Filtre par verticale : de simples liens GET. La vue courante n'est
          pas un lien (c'est là qu'on est), les autres oui. */}
      <nav aria-label="Filtrer le classement" className="mb-6 flex gap-2">
        {FILTRES.map((f) =>
          f.cle === filtre.cle ? (
            <span
              key={f.cle}
              aria-current="page"
              className="rounded-full bg-arena-violet px-4 py-1.5 text-sm font-semibold text-white"
            >
              {f.libelle}
            </span>
          ) : (
            <a
              key={f.cle}
              href={f.cle === "tous" ? "/classement" : `/classement?v=${f.cle}`}
              className="rounded-full border border-arena-border px-4 py-1.5 text-sm font-semibold text-arena-muted transition-colors hover:border-arena-violet/50 hover:text-arena-ink"
            >
              {f.libelle}
            </a>
          )
        )}
      </nav>

      {lignes.length === 0 ? (
        <div className="rounded-lg border border-arena-border bg-arena-surface shadow-carte p-8 text-center text-arena-faint">
          {filtre.discipline
            ? "Aucun tournoi terminé dans cette catégorie pour l'instant."
            : "Aucun tournoi terminé pour l'instant. Le classement démarrera avec le premier champion."}
        </div>
      ) : (
        <ol className="space-y-2">
          {lignes.map((l, i) => (
            <li key={l.joueurId}>
              <a
                href={`/joueurs/${encodeURIComponent(pseudos.get(l.joueurId)?.pseudo ?? "")}`}
                className="flex items-center justify-between rounded-lg border border-arena-border bg-arena-surface shadow-carte px-4 py-3 transition-colors hover:border-arena-violet/50"
              >
                <span className="flex items-center gap-3">
                  <span
                    className={`w-8 text-center font-mono text-sm ${
                      i === 0
                        ? "text-arena-gold"
                        : i < 3
                          ? "text-arena-lilac"
                          : "text-arena-faint"
                    }`}
                  >
                    #{i + 1}
                  </span>
                  <span className="font-bold">
                    {pseudos.get(l.joueurId)?.pseudo ?? "?"}
                  </span>
                  {l.titres > 0 && (
                    <span className="text-xs text-arena-gold">
                      {"🏆".repeat(Math.min(l.titres, 3))}
                    </span>
                  )}
                </span>
                <span className="text-sm text-arena-muted">
                  <span className="font-bold text-arena-ink">{l.points}</span> pts ·{" "}
                  {l.tournoisComptes} tournoi{l.tournoisComptes > 1 ? "s" : ""}
                </span>
              </a>
            </li>
          ))}
        </ol>
      )}

      </main>
      <PiedSite />
    </>
  );
}
