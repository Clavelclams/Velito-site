/**
 * Page PUBLIQUE d'un tournoi — accessible via QR code ou lien /t/[qr_token].
 *
 * Sécurité par design :
 *  - Client Supabase ANONYME → la RLS s'applique : un tournoi BROUILLON est
 *    invisible ici, sans aucun `if` applicatif à maintenir.
 *  - Le qr_token (uuid) sert d'identifiant public : impossible à deviner,
 *    et il ne révèle pas l'id interne du tournoi.
 *
 * Pendant un tournoi EN_COURS, la page se rafraîchit toute seule (AutoRefresh)
 * pour que les joueurs suivent le bracket sur leur téléphone.
 */
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Joueur, MatchRow, Participation, Tournoi } from "@/lib/arena/types";
import { nomRound } from "@/lib/arena/affichage";
import AutoRefresh from "./AutoRefresh";

export default async function PagePubliqueTournoi({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const supabase = await createClient();

  const { data: tournoiData } = await supabase
    .schema("arena")
    .from("tournois")
    .select("*")
    .eq("qr_token", token)
    .maybeSingle();
  if (!tournoiData) notFound();
  const tournoi = tournoiData as Tournoi;

  const [{ data: partData }, { data: matchsData }] = await Promise.all([
    supabase
      .schema("arena")
      .from("participations")
      .select("*, joueur:joueurs(*)")
      .eq("tournoi_id", tournoi.id),
    supabase
      .schema("arena")
      .from("matchs")
      .select("*")
      .eq("tournoi_id", tournoi.id)
      .order("round", { ascending: true })
      .order("position", { ascending: true }),
  ]);

  const participations = (partData ?? []) as Participation[];
  const matchs = (matchsData ?? []) as MatchRow[];

  const pseudos = new Map<string, string>();
  for (const p of participations) {
    if (p.joueur) pseudos.set(p.joueur_id, (p.joueur as Joueur).pseudo);
  }
  const pseudo = (jid: string | null) => (jid ? (pseudos.get(jid) ?? "?") : "—");

  const nbRounds = matchs.length ? Math.max(...matchs.map((m) => m.round)) : 0;
  const finale = matchs.find((m) => m.round === nbRounds);
  const champion = finale?.statut === "VALIDE" ? pseudo(finale.gagnant_id) : null;

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      {tournoi.statut === "EN_COURS" && <AutoRefresh />}

      <header className="mb-8 text-center">
        <p className="text-xs font-semibold uppercase tracking-widest text-arena-lilac">
          ARENA · Velito
        </p>
        <h1 className="mt-1 text-3xl font-black">{tournoi.titre}</h1>
        <p className="mt-2 text-sm text-gray-400">
          {tournoi.jeu} · {new Date(tournoi.date_debut).toLocaleString("fr-FR")}
          {tournoi.lieu ? ` · ${tournoi.lieu}` : ""}
        </p>
        <p className="mt-2 text-sm">
          <span className="rounded-full bg-white/5 px-3 py-1 font-semibold text-gray-300">
            {tournoi.statut === "EN_COURS"
              ? "🔴 En cours — mise à jour automatique"
              : tournoi.statut === "OUVERT"
                ? "Inscriptions ouvertes"
                : tournoi.statut}
          </span>
        </p>
      </header>

      {champion && (
        <p className="mb-8 rounded-lg border border-arena-gold/40 bg-arena-gold/10 p-4 text-center text-lg font-bold text-arena-gold">
          🏆 Champion : {champion}
        </p>
      )}

      {matchs.length > 0 ? (
        <section className="space-y-6">
          {Array.from({ length: nbRounds }, (_, i) => i + 1).map((round) => (
            <div key={round}>
              <h2 className="mb-2 text-sm font-bold text-arena-lilac">
                {nomRound(round, nbRounds)}
              </h2>
              <ul className="space-y-2">
                {matchs
                  .filter((m) => m.round === round)
                  .map((m) => (
                    <li
                      key={m.id}
                      className="flex items-center justify-between rounded-lg border border-arena-border bg-arena-surface px-4 py-3 text-sm"
                    >
                      <span
                        className={
                          m.gagnant_id && m.gagnant_id === m.joueur1_id
                            ? "font-bold text-arena-green"
                            : ""
                        }
                      >
                        {pseudo(m.joueur1_id)}
                      </span>
                      <span className="mx-3 font-mono text-gray-400">
                        {m.statut === "VALIDE" || m.statut === "TERMINE"
                          ? `${m.score_j1 ?? "·"} — ${m.score_j2 ?? "·"}`
                          : "vs"}
                      </span>
                      <span
                        className={
                          m.gagnant_id && m.gagnant_id === m.joueur2_id
                            ? "font-bold text-arena-green"
                            : ""
                        }
                      >
                        {m.is_bye ? "(bye)" : pseudo(m.joueur2_id)}
                      </span>
                    </li>
                  ))}
              </ul>
            </div>
          ))}
        </section>
      ) : (
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-widest text-gray-500">
            Joueurs inscrits ({participations.length})
          </h2>
          {participations.length === 0 ? (
            <p className="text-sm text-gray-500">
              Pas encore d&apos;inscrits — le bracket apparaîtra ici au
              lancement du tournoi.
            </p>
          ) : (
            <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {participations.map((p) => {
                const ps = (p.joueur as Joueur | undefined)?.pseudo;
                return (
                  <li key={p.id}>
                    <a
                      href={ps ? `/joueurs/${encodeURIComponent(ps)}` : "#"}
                      className="block rounded-lg border border-arena-border bg-arena-surface px-3 py-2 text-center text-sm font-semibold transition-colors hover:border-arena-violet/50"
                    >
                      {ps ?? "?"}
                    </a>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      )}

      <footer className="mt-12 text-center text-xs text-gray-600">
        <a href={`/api/export/${tournoi.qr_token}`} className="underline hover:text-gray-400">
          Exporter les résultats (JSON)
        </a>
        {" · "}
        <a href="/" className="underline hover:text-gray-400">
          Tous les tournois
        </a>
      </footer>
    </div>
  );
}
