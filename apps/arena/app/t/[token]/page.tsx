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
import { grouperMatchsParSection, matchFinal } from "@/lib/arena/affichage";
import { libelleTour, trouverMonMatch } from "@/lib/arena/mon-match";
import ClassementsPoules from "@/components/ClassementsPoules";
import AutoRefresh from "./AutoRefresh";
import EnteteSite from "@/components/EnteteSite";
import PiedSite from "@/components/PiedSite";

/**
 * Compare deux pseudos sans tenir compte de la casse ni des accents.
 * Un joueur qui tape « lea » doit retrouver « Léa » : en plein tournoi, sur un
 * téléphone, exiger l'orthographe exacte reviendrait à ne servir à rien.
 */
function memePseudo(a: string, b: string): boolean {
  const n = (s: string) =>
    s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();
  return n(a) === n(b) && n(a).length > 0;
}

export default async function PagePubliqueTournoi({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ moi?: string }>;
}) {
  const { token } = await params;
  const { moi: pseudoRecherche } = await searchParams;
  const supabase = await createClient();

  const { data: tournoiData } = await supabase
    .schema("arena")
    .from("tournois")
    .select("*")
    .eq("qr_token", token)
    .maybeSingle();
  if (!tournoiData) notFound();
  const tournoi = tournoiData as Tournoi;

  const [{ data: partData }, { data: matchsData }, { data: equipesData }] =
    await Promise.all([
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
    // Équipes : requête inutile en esport, mais elle coûte moins cher qu'une
    // condition qui obligerait à faire deux appels en série.
    supabase
      .schema("arena")
      .from("equipes")
      .select("id, nom, membres:equipes_membres(joueur_id)")
      .eq("tournoi_id", tournoi.id)
      .order("nom", { ascending: true }),
  ]);

  const participations = (partData ?? []) as Participation[];
  const matchs = (matchsData ?? []) as MatchRow[];

  const pseudos = new Map<string, string>();
  for (const p of participations) {
    if (p.joueur) pseudos.set(p.joueur_id, (p.joueur as Joueur).pseudo);
  }
  const equipes = (equipesData ?? []) as {
    id: string;
    nom: string;
    membres: { joueur_id: string }[];
  }[];
  const nomsEquipes = new Map(equipes.map((e) => [e.id, e.nom]));

  // Un identifiant de camp désigne un joueur (esport) ou une équipe (sport).
  // On interroge les deux index : le reste de la page ignore la différence.
  const pseudo = (jid: string | null) =>
    jid ? (pseudos.get(jid) ?? nomsEquipes.get(jid) ?? "?") : "À venir";

  /** Composition d'une équipe, affichée sous son nom sur la page publique. */
  const membresDe = (equipeId: string | null) =>
    equipeId
      ? (equipes.find((e) => e.id === equipeId)?.membres ?? [])
          .map((mb) => pseudos.get(mb.joueur_id) ?? "?")
          .join(", ")
      : "";

  const camps = (m: MatchRow) => ({
    c1: m.equipe1_id ?? m.joueur1_id,
    c2: m.equipe2_id ?? m.joueur2_id,
    gagnant: m.equipe_gagnante_id ?? m.gagnant_id,
  });

  const finale = matchFinal(matchs);
  const champion =
    finale?.statut === "VALIDE"
      ? pseudo(finale.equipe_gagnante_id ?? finale.gagnant_id)
      : null;

  // ---- « Mon match » : la réponse à LA question du jour J ----
  // Recherche par pseudo dans les participants DÉJÀ chargés : aucune requête
  // supplémentaire, et donc aucun moyen d'énumérer la base de joueurs depuis
  // cette page publique — on ne peut trouver que les inscrits de CE tournoi.
  const participationMoi = pseudoRecherche
    ? participations.find((p) =>
        memePseudo((p.joueur as Joueur | undefined)?.pseudo ?? "", pseudoRecherche)
      )
    : undefined;

  // En sport, le camp du match est l'ÉQUIPE : il faut donc aussi savoir dans
  // laquelle le joueur se trouve. En esport, cette recherche ne donne rien et
  // c'est normal.
  const monEquipeId = participationMoi
    ? (equipes.find((e) =>
        (e.membres ?? []).some((mb) => mb.joueur_id === participationMoi.joueur_id)
      )?.id ?? null)
    : null;

  const monMatch = participationMoi
    ? trouverMonMatch(matchs, [participationMoi.joueur_id, monEquipeId])
    : null;

  // Profondeur du tableau principal, pour nommer « finale » / « demi-finale »
  // au lieu d'un numéro de tour qui ne parle à personne.
  const roundsW = matchs
    .filter((m) => (m.bracket ?? "W") === "W")
    .map((m) => m.round);
  const nbRounds = roundsW.length > 0 ? Math.max(...roundsW) : 0;

  return (
    <>
      <EnteteSite />
      <main className="mx-auto max-w-2xl px-4 py-10">
      {tournoi.statut === "EN_COURS" && <AutoRefresh />}

      <header className="mb-8 text-center">
        <p className="text-xs font-semibold uppercase tracking-widest text-arena-lilac">
          ARENA · Velito
        </p>
        <h1 className="mt-1 text-3xl font-black">{tournoi.titre}</h1>
        <p className="mt-2 text-sm text-arena-muted">
          {tournoi.jeu} · {new Date(tournoi.date_debut).toLocaleString("fr-FR")}
          {tournoi.lieu ? ` · ${tournoi.lieu}` : ""}
        </p>
        <p className="mt-2 text-sm">
          <span className="rounded-full bg-arena-surface px-3 py-1 font-semibold text-arena-muted">
            {tournoi.statut === "EN_COURS"
              ? "🔴 En cours, mise à jour automatique"
              : tournoi.statut === "OUVERT"
                ? "Inscriptions ouvertes"
                : tournoi.statut}
          </span>
        </p>
      </header>

      {champion && (
        <p className="mb-8 rounded-lg border border-arena-gold/30 bg-arena-gold-pale p-4 text-center text-lg font-bold text-arena-gold">
          🏆 Champion : {champion}
        </p>
      )}

      {/* ---- MON MATCH ----
          Un <form method="get"> natif : zéro JavaScript, une URL partageable
          (/t/xxx?moi=Lea) qu'un joueur peut mettre en favori pour retrouver
          sa situation d'un seul geste pendant tout le tournoi. Même choix
          technique que la recherche de l'accueil. */}
      {matchs.length > 0 && (
        <section className="mb-8 rounded-lg border border-arena-violet/30 bg-arena-violet/5 p-4">
          <h2 className="mb-3 text-sm font-bold uppercase tracking-widest text-arena-violet">
            Mon match
          </h2>

          <form method="get" className="flex flex-wrap gap-2">
            <input
              type="text"
              name="moi"
              defaultValue={pseudoRecherche ?? ""}
              placeholder="Ton pseudo"
              aria-label="Ton pseudo"
              className="min-h-[44px] flex-1 rounded-lg border border-arena-border bg-arena-surface px-3 py-2 text-sm focus:border-arena-violet focus:outline-none"
            />
            <button
              type="submit"
              className="min-h-[44px] rounded-lg bg-arena-violet px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-arena-violet-fonce"
            >
              Voir
            </button>
          </form>

          {pseudoRecherche && !participationMoi && (
            <p className="mt-3 text-sm text-arena-muted">
              Aucun inscrit ne s&apos;appelle « {pseudoRecherche} » dans ce
              tournoi. Vérifie l&apos;orthographe auprès du staff.
            </p>
          )}

          {monMatch && participationMoi && (
            <div className="mt-3 text-sm">
              {monMatch.situation === "A_JOUER" && monMatch.prochain && (
                <p className="text-base">
                  <span className="font-bold">
                    {libelleTour(monMatch.prochain, nbRounds)}
                  </span>{" "}
                  contre{" "}
                  <span className="font-bold text-arena-violet">
                    {pseudo(monMatch.adversaireId)}
                  </span>
                  {monMatch.prochain.statut === "LITIGIEUX" && (
                    <span className="text-arena-gold"> · litige en cours</span>
                  )}
                </p>
              )}

              {/* Le terrain : la question qui suit immédiatement « contre qui ».
                  Affiché en gros, séparément, parce que c'est ce que le joueur
                  cherche en traversant le complexe. */}
              {monMatch.situation === "A_JOUER" && monMatch.prochain?.terrain && (
                <p className="mt-1 text-base font-bold">
                  📍 {monMatch.prochain.terrain}
                </p>
              )}

              {monMatch.situation === "EN_ATTENTE" && monMatch.prochain && (
                <p className="text-base">
                  Qualifié pour{" "}
                  <span className="font-bold">
                    {libelleTour(monMatch.prochain, nbRounds)}
                  </span>{" "}
                  — <span className="text-arena-muted">adversaire pas encore
                  connu, reste dans le coin.</span>
                </p>
              )}

              {monMatch.situation === "ELIMINE" && (
                <p className="text-base text-arena-muted">
                  Éliminé pour cette fois. Merci d&apos;être venu jouer.
                </p>
              )}

              {monMatch.situation === "TERMINE" && (
                <p className="text-base text-arena-muted">
                  {champion && memePseudo(champion, pseudo(participationMoi.joueur_id))
                    ? "🏆 Champion. Bravo."
                    : "Tous tes matchs sont joués."}
                </p>
              )}

              {monMatch.situation === "INCONNU" && (
                <p className="text-base text-arena-muted">
                  Inscrit, mais le tirage ne t&apos;a pas encore placé.
                </p>
              )}

              {(monMatch.victoires > 0 || monMatch.defaites > 0) && (
                <p className="mt-2 text-xs text-arena-faint">
                  {monMatch.victoires} victoire{monMatch.victoires > 1 ? "s" : ""} ·{" "}
                  {monMatch.defaites} défaite{monMatch.defaites > 1 ? "s" : ""}
                  {monEquipeId ? ` · équipe ${pseudo(monEquipeId)}` : ""}
                </p>
              )}
            </div>
          )}
        </section>
      )}

      <div className="mb-8">
        <ClassementsPoules
          matchs={matchs}
          pseudo={pseudo}
          nbQualifies={tournoi.nb_qualifies_par_poule ?? 2}
        />
      </div>

      {matchs.length > 0 ? (
        <section className="space-y-6">
          {grouperMatchsParSection(matchs).map((groupe) => (
            <div key={groupe.titre}>
              <h2 className="mb-2 text-sm font-bold text-arena-lilac">
                {groupe.titre}
              </h2>
              <ul className="space-y-2">
                {groupe.matchs.map((m) => (
                    <li
                      key={m.id}
                      className="flex items-center justify-between rounded-lg border border-arena-border bg-arena-surface shadow-carte px-4 py-3 text-sm"
                    >
                      <span
                        className={
                          camps(m).gagnant && camps(m).gagnant === camps(m).c1
                            ? "font-bold text-arena-green"
                            : ""
                        }
                      >
                        {pseudo(camps(m).c1)}
                        {m.equipe1_id && (
                          <span className="block text-xs font-normal text-arena-faint">
                            {membresDe(m.equipe1_id)}
                          </span>
                        )}
                      </span>
                      <span className="mx-3 text-center font-mono text-arena-muted">
                        <span className="block">
                          {m.statut === "VALIDE" || m.statut === "TERMINE"
                            ? `${m.score_j1 ?? "·"} - ${m.score_j2 ?? "·"}`
                            : "vs"}
                        </span>
                        {/* Terrain : n'apparaît que s'il est assigné, et
                            seulement tant que le match n'est pas joué — une
                            fois le résultat acquis, savoir où il s'est déroulé
                            n'intéresse plus personne. */}
                        {m.terrain && m.statut !== "VALIDE" && (
                          <span className="block whitespace-nowrap text-xs font-sans text-arena-violet">
                            📍 {m.terrain}
                          </span>
                        )}
                      </span>
                      <span
                        className={
                          camps(m).gagnant && camps(m).gagnant === camps(m).c2
                            ? "font-bold text-arena-green"
                            : ""
                        }
                      >
                        {m.is_bye ? "(bye)" : pseudo(camps(m).c2)}
                        {m.equipe2_id && (
                          <span className="block text-xs font-normal text-arena-faint">
                            {membresDe(m.equipe2_id)}
                          </span>
                        )}
                      </span>
                    </li>
                  ))}
              </ul>
            </div>
          ))}
        </section>
      ) : (
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-widest text-arena-faint">
            Joueurs inscrits ({participations.length})
          </h2>
          {participations.length === 0 ? (
            <p className="text-sm text-arena-faint">
              Pas encore d&apos;inscrits. Le bracket apparaîtra ici au lancement du
              tournoi.
            </p>
          ) : (
            <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {participations.map((p) => {
                const ps = (p.joueur as Joueur | undefined)?.pseudo;
                return (
                  <li key={p.id}>
                    <a
                      href={ps ? `/joueurs/${encodeURIComponent(ps)}` : "#"}
                      className="block rounded-lg border border-arena-border bg-arena-surface shadow-carte px-3 py-2 text-center text-sm font-semibold transition-colors hover:border-arena-violet/50"
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

      {/* Export brut : garanti par le règlement (« les résultats sont
          exportables »). Utile aussi pour un bilan de subvention. */}
      <p className="mt-12 text-center text-xs text-arena-faint">
        <a
          href={`/api/export/${tournoi.qr_token}`}
          className="underline hover:text-arena-violet"
        >
          Exporter les résultats de ce tournoi (JSON)
        </a>
      </p>
      </main>
      <PiedSite />
    </>
  );
}
