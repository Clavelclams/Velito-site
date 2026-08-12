/**
 * Classement esport public — points cumulés sur les tournois TERMINÉS.
 * Barème : champion +3, finaliste +2, top 4 +1 (décision actée, cf.
 * lib/arena/classement.ts — logique pure testée).
 *
 * Client anonyme → RLS : seuls les tournois publiés et les joueurs non
 * anonymisés sont visibles. Les mineurs en mode restreint (profil_public =
 * false) sont exclus de l'affichage — exigence RGPD, filtrée ICI et par la RLS.
 */
import { createClient } from "@/lib/supabase/server";
import { calculerClassement } from "@/lib/arena/classement";
import type { Joueur, MatchRow, Tournoi } from "@/lib/arena/types";
import EnteteSite from "@/components/EnteteSite";
import PiedSite from "@/components/PiedSite";

export const metadata = {
  title: "Classement · ARENA",
  description:
    "Classement des joueurs ARENA : points cumulés sur les tournois esport (champion +3, finaliste +2, top 4 +1).",
};

export default async function PageClassement() {
  let lignes: ReturnType<typeof calculerClassement> = [];
  const pseudos = new Map<string, { pseudo: string; public: boolean }>();

  try {
    const supabase = await createClient();

    const { data: tournois } = await supabase
      .schema("arena")
      .from("tournois")
      .select("id")
      .eq("statut", "TERMINE");

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
          ARENA · Esport
        </p>
        <h1 className="mt-1 text-3xl font-black">Classement</h1>
        <p className="mt-2 text-sm text-arena-muted">
          Points cumulés sur les tournois terminés : champion +3, finaliste +2,
          top 4 +1. Les résultats ne se perdent plus.
        </p>
      </header>

      {lignes.length === 0 ? (
        <div className="rounded-lg border border-arena-border bg-arena-surface shadow-carte p-8 text-center text-arena-faint">
          Aucun tournoi terminé pour l&apos;instant. Le classement démarrera avec
          le premier champion.
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
