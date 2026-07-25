/**
 * Page de pilotage d'un tournoi — le poste de commande du staff le jour J.
 *
 * Tout est Server Component + Server Actions (zéro JavaScript client custom) :
 *  - participants : ajout jour J, check-in/désinscription du bracket
 *  - cycle de vie : ouvrir → démarrer (génère le bracket) → terminer
 *  - matchs : saisie du score puis validation (double étape) round par round
 *
 * NOTE Next 16 : `params` est une Promise dans les routes dynamiques → await.
 */
import { notFound } from "next/navigation";
import { getContexteStaff } from "@/lib/arena/auth";
import { getServiceClient } from "@/lib/supabase/service";
import {
  ajouterJoueurStaff,
  changerStatutTournoi,
  demarrerTournoi,
  saisirScore,
  toggleCheckIn,
  validerScore,
} from "@/lib/arena/actions";
import type {
  Joueur,
  MatchRow,
  Participation,
  Tournoi,
} from "@/lib/arena/types";
import { nomRound } from "@/lib/arena/affichage";
import BandeauErreur from "@/components/BandeauErreur";

const btn =
  "rounded-lg px-4 py-2 text-sm font-semibold transition-colors disabled:opacity-40";
const inputCls =
  "rounded-lg border border-arena-border bg-arena-bg px-3 py-1.5 text-sm focus:border-arena-violet focus:outline-none";

export default async function PageTournoi({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ erreur?: string }>;
}) {
  const { id } = await params;
  const { erreur } = await searchParams;
  const ctx = await getContexteStaff();
  if (!ctx) return null; // écran de connexion géré par le layout

  const db = getServiceClient();

  const { data: tournoiData } = await db
    .from("arena_tournois")
    .select("*")
    .eq("id", id)
    .eq("organisation_id", ctx.organisation.id)
    .maybeSingle();
  if (!tournoiData) notFound();
  const tournoi = tournoiData as Tournoi;

  const { data: partData } = await db
    .from("arena_participations")
    .select("*, joueur:arena_joueurs(*)")
    .eq("tournoi_id", id)
    .order("created_at", { ascending: true });
  const participations = (partData ?? []) as Participation[];

  const { data: matchsData } = await db
    .from("arena_matchs")
    .select("*")
    .eq("tournoi_id", id)
    .order("round", { ascending: true })
    .order("position", { ascending: true });
  const matchs = (matchsData ?? []) as MatchRow[];

  // Index pseudo par id joueur pour l'affichage des matchs.
  const pseudos = new Map<string, string>();
  for (const p of participations) {
    if (p.joueur) pseudos.set(p.joueur_id, (p.joueur as Joueur).pseudo);
  }
  const pseudo = (jid: string | null) =>
    jid ? (pseudos.get(jid) ?? "?") : "—";

  const nbRounds = matchs.length ? Math.max(...matchs.map((m) => m.round)) : 0;
  const nbCheckIn = participations.filter((p) => p.check_in).length;
  const finale = matchs.find((m) => m.round === nbRounds);
  const champion =
    tournoi.statut !== "BROUILLON" && finale?.statut === "VALIDE"
      ? pseudo(finale.gagnant_id)
      : null;

  return (
    <div className="space-y-10">
      <BandeauErreur message={erreur} />

      {/* ---------- En-tête + cycle de vie ---------- */}
      <div>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black">{tournoi.titre}</h1>
            <p className="text-sm text-gray-400">
              {tournoi.jeu} ·{" "}
              {new Date(tournoi.date_debut).toLocaleString("fr-FR")}
              {tournoi.lieu ? ` · ${tournoi.lieu}` : ""} ·{" "}
              <span className="font-semibold text-gray-300">
                {tournoi.statut}
              </span>
            </p>
            <p className="mt-1 text-sm">
              <a
                href={`/t/${tournoi.qr_token}`}
                className="text-arena-lilac underline hover:text-white"
              >
                Page publique
              </a>
              {" · "}
              <a
                href={`/admin/tournois/${tournoi.id}/qr`}
                className="text-arena-lilac underline hover:text-white"
              >
                QR code à imprimer
              </a>
            </p>
          </div>

          <div className="flex gap-2">
            {tournoi.statut === "BROUILLON" && (
              <form action={changerStatutTournoi}>
                <input type="hidden" name="tournoi_id" value={tournoi.id} />
                <input type="hidden" name="statut" value="OUVERT" />
                <button
                  className={`${btn} bg-arena-green/90 text-black hover:bg-arena-green`}
                >
                  Ouvrir les inscriptions
                </button>
              </form>
            )}
            {tournoi.statut === "OUVERT" && (
              <form action={demarrerTournoi}>
                <input type="hidden" name="tournoi_id" value={tournoi.id} />
                <button
                  className={`${btn} bg-arena-violet text-white hover:bg-arena-violet/80`}
                  disabled={nbCheckIn < 2}
                  title={
                    nbCheckIn < 2
                      ? "Au moins 2 joueurs check-in requis"
                      : "Génère le bracket et lance le tournoi"
                  }
                >
                  Démarrer ({nbCheckIn} check-in)
                </button>
              </form>
            )}
            {tournoi.statut === "EN_COURS" && (
              <form action={changerStatutTournoi}>
                <input type="hidden" name="tournoi_id" value={tournoi.id} />
                <input type="hidden" name="statut" value="TERMINE" />
                <button
                  className={`${btn} border border-arena-border text-gray-300 hover:text-white`}
                >
                  Clôturer le tournoi
                </button>
              </form>
            )}
          </div>
        </div>

        {champion && (
          <p className="mt-4 rounded-lg border border-arena-gold/40 bg-arena-gold/10 p-3 font-semibold text-arena-gold">
            🏆 Champion : {champion}
          </p>
        )}
      </div>

      {/* ---------- Participants ---------- */}
      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-widest text-gray-500">
          Participants ({participations.length}, dont {nbCheckIn} check-in)
        </h2>

        {(tournoi.statut === "BROUILLON" || tournoi.statut === "OUVERT") && (
          <form action={ajouterJoueurStaff} className="mb-4 flex gap-2">
            <input type="hidden" name="tournoi_id" value={tournoi.id} />
            <input
              name="pseudo"
              required
              minLength={2}
              placeholder="Pseudo du joueur (ajout jour J)"
              className={`${inputCls} flex-1`}
            />
            <button
              className={`${btn} bg-arena-violet text-white hover:bg-arena-violet/80`}
            >
              Ajouter + check-in
            </button>
          </form>
        )}

        {participations.length === 0 ? (
          <p className="text-sm text-gray-500">Personne pour l&apos;instant.</p>
        ) : (
          <ul className="grid gap-2 sm:grid-cols-2">
            {participations.map((p) => (
              <li
                key={p.id}
                className="flex items-center justify-between rounded-lg border border-arena-border bg-arena-surface px-3 py-2"
              >
                <span className="text-sm font-semibold">
                  {(p.joueur as Joueur | undefined)?.pseudo ?? "?"}
                </span>
                {tournoi.statut === "OUVERT" || tournoi.statut === "BROUILLON" ? (
                  <form action={toggleCheckIn}>
                    <input type="hidden" name="tournoi_id" value={tournoi.id} />
                    <input type="hidden" name="participation_id" value={p.id} />
                    <input
                      type="hidden"
                      name="vers"
                      value={p.check_in ? "false" : "true"}
                    />
                    <button
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        p.check_in
                          ? "bg-arena-green/10 text-arena-green"
                          : "bg-white/5 text-gray-500 hover:text-gray-300"
                      }`}
                    >
                      {p.check_in ? "✓ Check-in" : "Absent"}
                    </button>
                  </form>
                ) : (
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      p.check_in
                        ? "bg-arena-green/10 text-arena-green"
                        : "bg-white/5 text-gray-500"
                    }`}
                  >
                    {p.check_in ? "✓" : "—"}
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* ---------- Bracket / matchs ---------- */}
      {matchs.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-widest text-gray-500">
            Bracket — élimination simple
          </h2>

          <div className="space-y-6">
            {Array.from({ length: nbRounds }, (_, i) => i + 1).map((round) => (
              <div key={round}>
                <h3 className="mb-2 text-sm font-bold text-arena-lilac">
                  {nomRound(round, nbRounds)}
                </h3>
                <ul className="space-y-2">
                  {matchs
                    .filter((m) => m.round === round)
                    .map((m) => (
                      <li
                        key={m.id}
                        className="rounded-lg border border-arena-border bg-arena-surface p-3"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div className="text-sm">
                            <span
                              className={
                                m.gagnant_id &&
                                m.gagnant_id === m.joueur1_id
                                  ? "font-bold text-arena-green"
                                  : "font-semibold"
                              }
                            >
                              {pseudo(m.joueur1_id)}
                            </span>
                            <span className="mx-2 text-gray-500">
                              {m.score_j1 ?? ""} vs {m.score_j2 ?? ""}
                            </span>
                            <span
                              className={
                                m.gagnant_id &&
                                m.gagnant_id === m.joueur2_id
                                  ? "font-bold text-arena-green"
                                  : "font-semibold"
                              }
                            >
                              {m.is_bye ? "(bye)" : pseudo(m.joueur2_id)}
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            {m.statut === "VALIDE" ? (
                              <span className="rounded-full bg-arena-green/10 px-3 py-1 text-xs font-semibold text-arena-green">
                                Validé
                              </span>
                            ) : m.joueur1_id && m.joueur2_id ? (
                              <>
                                <form
                                  action={saisirScore}
                                  className="flex items-center gap-1.5"
                                >
                                  <input
                                    type="hidden"
                                    name="tournoi_id"
                                    value={tournoi.id}
                                  />
                                  <input
                                    type="hidden"
                                    name="match_id"
                                    value={m.id}
                                  />
                                  <input
                                    name="score_j1"
                                    type="number"
                                    min={0}
                                    required
                                    defaultValue={m.score_j1 ?? undefined}
                                    className={`${inputCls} w-16`}
                                    aria-label="Score joueur 1"
                                  />
                                  <input
                                    name="score_j2"
                                    type="number"
                                    min={0}
                                    required
                                    defaultValue={m.score_j2 ?? undefined}
                                    className={`${inputCls} w-16`}
                                    aria-label="Score joueur 2"
                                  />
                                  <button
                                    className={`${btn} border border-arena-border text-gray-300 hover:text-white`}
                                  >
                                    Saisir
                                  </button>
                                </form>
                                {m.statut === "TERMINE" && (
                                  <form action={validerScore}>
                                    <input
                                      type="hidden"
                                      name="tournoi_id"
                                      value={tournoi.id}
                                    />
                                    <input
                                      type="hidden"
                                      name="match_id"
                                      value={m.id}
                                    />
                                    <button
                                      className={`${btn} bg-arena-green/90 text-black hover:bg-arena-green`}
                                    >
                                      Valider
                                    </button>
                                  </form>
                                )}
                              </>
                            ) : (
                              <span className="text-xs text-gray-500">
                                En attente du round précédent
                              </span>
                            )}
                          </div>
                        </div>
                      </li>
                    ))}
                </ul>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
