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
import { estStaffDe, getContexteStaff } from "@/lib/arena/auth";
import { getServiceClient } from "@/lib/supabase/service";
import {
  ajouterJoueurStaff,
  changerStatutTournoi,
  creerEquipe,
  demarrerTournoi,
  enregistrerRepartition,
  genererPhaseFinale,
  saisirScore,
  signalerLitige,
  supprimerEquipe,
  toggleCheckIn,
  validerScore,
} from "@/lib/arena/actions";
import ClassementsPoules from "@/components/ClassementsPoules";
import RepartitionJoueurs from "@/components/RepartitionJoueurs";
import type {
  Joueur,
  MatchRow,
  Participation,
  Tournoi,
} from "@/lib/arena/types";
import { grouperMatchsParSection, matchFinal, nomFormat } from "@/lib/arena/affichage";
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
    .schema("arena")
    .from("tournois")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (!tournoiData) notFound();
  const tournoi = tournoiData as Tournoi;
  // Contrôle d'appartenance : le tournoi doit être à l'une de SES orgas.
  if (!estStaffDe(ctx, tournoi.organisation_id)) notFound();

  const { data: partData } = await db
    .schema("arena")
    .from("participations")
    .select("*, joueur:joueurs(*)")
    .eq("tournoi_id", id)
    .order("created_at", { ascending: true });
  // Tri par ordre manuel s'il existe, sinon par ordre d'arrivée. Le tri se
  // fait ici et non en SQL volontairement : tant que la migration 005 n'est
  // pas jouée, la colonne `ordre` n'existe pas et un ORDER BY dessus ferait
  // échouer la requête entière, donc afficherait une liste vide au staff.
  // En JavaScript, une colonne absente vaut `undefined` et on retombe
  // simplement sur l'ordre d'inscription.
  const participations = ((partData ?? []) as Participation[])
    .slice()
    .sort(
      (a, b) =>
        (a.ordre ?? Number.MAX_SAFE_INTEGER) - (b.ordre ?? Number.MAX_SAFE_INTEGER)
    );

  const { data: matchsData } = await db
    .schema("arena")
    .from("matchs")
    .select("*")
    .eq("tournoi_id", id)
    .order("round", { ascending: true })
    .order("position", { ascending: true });
  const matchs = (matchsData ?? []) as MatchRow[];

  // ---- Données de la zone « placement des joueurs » ----
  // Un tournoi par équipes (padel en double, five) répartit les joueurs entre
  // les équipes ; un tournoi individuel se contente d'un ordre de placement,
  // qui sert de tête de série au moment du tirage.
  const estParEquipes = (tournoi.taille_equipe ?? 1) > 1;

  const { data: equipesData } = estParEquipes
    ? await db
        .schema("arena")
        .from("equipes")
        .select("id, nom, membres:equipes_membres(joueur_id)")
        .eq("tournoi_id", id)
        .order("nom", { ascending: true })
    : { data: null };

  const equipes = (equipesData ?? []) as {
    id: string;
    nom: string;
    membres: { joueur_id: string }[];
  }[];

  const equipeParJoueur = new Map<string, string>();
  for (const e of equipes) {
    for (const m of e.membres ?? []) equipeParJoueur.set(m.joueur_id, e.id);
  }

  const colonnesRepartition = estParEquipes
    ? equipes.map((e) => ({
        id: e.id,
        titre: e.nom,
        effectifCible: tournoi.taille_equipe,
      }))
    : // Tournoi individuel : une seule colonne de mise en avant. Ce qui est
      // réellement enregistré est l'ORDRE affiché, rien d'autre. Le libellé
      // le dit tel quel : tant que demarrerTournoi ne consomme pas cet ordre,
      // promettre un « tirage prioritaire » serait un mensonge d'interface.
      [{ id: "MISE_EN_AVANT", titre: "Haut de liste" }];

  // Index pseudo par id joueur pour l'affichage des matchs.
  const pseudos = new Map<string, string>();
  for (const p of participations) {
    if (p.joueur) pseudos.set(p.joueur_id, (p.joueur as Joueur).pseudo);
  }
  // Un identifiant de camp est soit un joueur, soit une équipe : on interroge
  // les deux index. Le reste de la page n'a plus à savoir de quel type de
  // tournoi il s'agit.
  const nomsEquipes = new Map(equipes.map((e) => [e.id, e.nom]));
  const pseudo = (jid: string | null) =>
    jid ? (pseudos.get(jid) ?? nomsEquipes.get(jid) ?? "?") : "À venir";

  /** Les deux camps d'un match : équipes si présentes, joueurs sinon. */
  const camps = (m: MatchRow) => ({
    c1: m.equipe1_id ?? m.joueur1_id,
    c2: m.equipe2_id ?? m.joueur2_id,
    gagnant: m.equipe_gagnante_id ?? m.gagnant_id,
  });

  const nbCheckIn = participations.filter((p) => p.check_in).length;
  const finale = matchFinal(matchs);
  const champion =
    tournoi.statut !== "BROUILLON" && finale?.statut === "VALIDE"
      ? pseudo(finale.equipe_gagnante_id ?? finale.gagnant_id)
      : null;

  return (
    <div className="space-y-10">
      <BandeauErreur message={erreur} />

      {/* ---------- En-tête + cycle de vie ---------- */}
      <div>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black">{tournoi.titre}</h1>
            <p className="text-sm text-arena-muted">
              {tournoi.jeu} ·{" "}
              {new Date(tournoi.date_debut).toLocaleString("fr-FR")}
              {tournoi.lieu ? ` · ${tournoi.lieu}` : ""} ·{" "}
              <span className="font-semibold text-arena-muted">
                {tournoi.statut}
              </span>
            </p>
            <p className="mt-1 text-sm">
              <a
                href={`/t/${tournoi.qr_token}`}
                className="text-arena-lilac underline hover:text-arena-ink"
              >
                Page publique
              </a>
              {" · "}
              <a
                href={`/admin/tournois/${tournoi.id}/qr`}
                className="text-arena-lilac underline hover:text-arena-ink"
              >
                QR code à imprimer
              </a>
            </p>
          </div>

          <div className="flex w-full flex-wrap gap-2 sm:w-auto">
            {tournoi.statut === "BROUILLON" && (
              <form action={changerStatutTournoi}>
                <input type="hidden" name="tournoi_id" value={tournoi.id} />
                <input type="hidden" name="statut" value="OUVERT" />
                <button
                  className={`${btn} bg-arena-green text-white hover:bg-arena-green/90`}
                >
                  Ouvrir les inscriptions
                </button>
              </form>
            )}
            {tournoi.statut === "OUVERT" && (
              <form action={demarrerTournoi}>
                <input type="hidden" name="tournoi_id" value={tournoi.id} />
                <button
                  className={`${btn} bg-arena-violet text-white hover:bg-arena-violet-fonce`}
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
                  className={`${btn} border border-arena-border text-arena-muted hover:text-arena-ink`}
                >
                  Clôturer le tournoi
                </button>
              </form>
            )}
            {/* Poules : la phase finale est une SECONDE génération, une fois
                toutes les poules validées (les qualifiés n'existent pas avant). */}
            {tournoi.statut === "EN_COURS" &&
              tournoi.format === "POULES_FINALE" &&
              !tournoi.phase_finale_generee && (
                <form action={genererPhaseFinale}>
                  <input type="hidden" name="tournoi_id" value={tournoi.id} />
                  <button
                    className={`${btn} bg-arena-violet text-white hover:bg-arena-violet-fonce`}
                    title="Calcule les classements de poules et crée le bracket final"
                  >
                    Lancer la phase finale
                  </button>
                </form>
              )}
          </div>
        </div>

        {champion && (
          <p className="mt-4 rounded-lg border border-arena-gold/30 bg-arena-gold-pale p-3 font-semibold text-arena-gold">
            🏆 Champion : {champion}
          </p>
        )}
      </div>

      {/* ---------- Participants ---------- */}
      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-widest text-arena-faint">
          Participants ({participations.length}, dont {nbCheckIn} check-in)
        </h2>

        {(tournoi.statut === "BROUILLON" || tournoi.statut === "OUVERT") && (
          // La `key` change à chaque ajout : React démonte puis remonte le
          // formulaire, ce qui vide le champ non contrôlé. Sans ça le pseudo
          // précédent reste affiché et le staff écrit à la suite — bug réel
          // constaté au test du 12/08/2026 (« Fanny » + « Gaspard » ont créé
          // un joueur « FannyGaspard »). Alternative écartée : passer le champ
          // en composant client avec useState, pour ne pas ajouter d'état
          // client là où une clé suffit.
          <form
            key={`ajout-joueur-${participations.length}`}
            action={ajouterJoueurStaff}
            className="mb-4 flex gap-2"
          >
            <input type="hidden" name="tournoi_id" value={tournoi.id} />
            <input
              name="pseudo"
              required
              minLength={2}
              placeholder="Pseudo du joueur (ajout jour J)"
              className={`${inputCls} flex-1`}
            />
            <button
              className={`${btn} bg-arena-violet text-white hover:bg-arena-violet-fonce`}
            >
              Ajouter + check-in
            </button>
          </form>
        )}

        {participations.length === 0 ? (
          <p className="text-sm text-arena-faint">Personne pour l&apos;instant.</p>
        ) : (
          <ul className="grid gap-2 sm:grid-cols-2">
            {participations.map((p) => (
              <li
                key={p.id}
                className="flex items-center justify-between rounded-lg border border-arena-border bg-arena-surface shadow-carte px-3 py-2"
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
                          ? "bg-arena-green-pale text-arena-green"
                          : "bg-arena-surface text-arena-faint hover:text-arena-ink"
                      }`}
                    >
                      {p.check_in ? "✓ Check-in" : "Absent"}
                    </button>
                  </form>
                ) : (
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      p.check_in
                        ? "bg-arena-green-pale text-arena-green"
                        : "bg-arena-surface text-arena-faint"
                    }`}
                  >
                    {p.check_in ? "✓" : "·"}
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}

        {/* ---------- Équipes (tournois sport) ----------
            Créées vides puis remplies par glisser-déposer : le jour J les
            équipes se forment au fil des arrivées, exiger une saisie complète
            d'un coup bloquerait le staff jusqu'au dernier arrivant. */}
        {estParEquipes &&
          (tournoi.statut === "BROUILLON" || tournoi.statut === "OUVERT") && (
            <div className="mt-6 border-t border-arena-border pt-6">
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-widest text-arena-faint">
                Équipes ({equipes.length}) · {tournoi.taille_equipe} joueurs
                chacune
              </h3>

              <form
                key={`equipe-${equipes.length}`}
                action={creerEquipe}
                className="mb-4 flex flex-wrap gap-2"
              >
                <input type="hidden" name="tournoi_id" value={tournoi.id} />
                <input
                  name="nom"
                  required
                  maxLength={40}
                  placeholder="Nom de l&apos;équipe (Les Kangourous…)"
                  className={`${inputCls} min-w-[12rem] flex-1`}
                />
                <button
                  className={`${btn} bg-arena-violet text-white hover:bg-arena-violet-fonce`}
                >
                  Ajouter une équipe
                </button>
              </form>

              {equipes.length === 0 ? (
                <p className="text-sm text-arena-faint">
                  Crée d&apos;abord les équipes : le bracket les opposera entre
                  elles, pas les joueurs un par un.
                </p>
              ) : (
                <ul className="flex flex-wrap gap-2">
                  {equipes.map((e) => (
                    <li key={e.id}>
                      <form
                        action={supprimerEquipe}
                        className="flex items-center gap-1.5 rounded-full border border-arena-border bg-arena-surface py-1 pl-3 pr-1.5 text-sm"
                      >
                        <input type="hidden" name="tournoi_id" value={tournoi.id} />
                        <input type="hidden" name="equipe_id" value={e.id} />
                        <span className="font-semibold">{e.nom}</span>
                        <span className="text-arena-faint">
                          {(e.membres ?? []).length}/{tournoi.taille_equipe}
                        </span>
                        <button
                          title={`Supprimer l\u2019équipe ${e.nom}`}
                          className="rounded-full px-2 text-arena-faint hover:text-arena-red"
                        >
                          ×
                        </button>
                      </form>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

        {/* ---------- Placement des joueurs ----------
            Visible uniquement tant que le bracket n'est pas généré : après le
            lancement, réordonner n'aurait plus aucun effet. Pour un tournoi
            individuel les colonnes sont les groupes de tête de série ; pour un
            tournoi par équipes, ce sont les équipes. */}
        {(tournoi.statut === "BROUILLON" || tournoi.statut === "OUVERT") &&
          participations.length > 0 && (
            <div className="mt-6 border-t border-arena-border pt-6">
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-widest text-arena-faint">
                {estParEquipes ? "Composition des équipes" : "Ordre des joueurs"}
              </h3>
              {/* ⚠️ La `key` n'est pas décorative — bug constaté en prod le
                  13/08/2026. RepartitionJoueurs est un composant CLIENT qui
                  initialise son état avec `useState(joueurs)`. En React, un
                  useState n'est lu QU'AU PREMIER RENDU : quand une Server
                  Action ajoute un joueur et revalide la page, le composant
                  reçoit bien de nouvelles props, mais garde son ancien état.
                  Résultat observé : on ajoutait 4 joueurs et la zone de
                  répartition n'en montrait qu'un seul jusqu'au rechargement.
                  Faire changer la `key` force React à démonter puis remonter
                  le composant, donc à relire l'état initial. Alternative
                  écartée : un useEffect de synchronisation, qui rendrait deux
                  fois et créerait une source de vérité en double. */}
              <RepartitionJoueurs
                key={`repartition-${participations.length}-${equipes
                  .map((e) => `${e.id}:${(e.membres ?? []).length}`)
                  .join("|")}`}
                colonnes={colonnesRepartition}
                joueurs={participations.map((p) => ({
                  id: p.joueur_id,
                  pseudo: (p.joueur as Joueur | undefined)?.pseudo ?? "?",
                  colonneId: equipeParJoueur.get(p.joueur_id) ?? null,
                }))}
                titreNonAssignes={
                  estParEquipes ? "Sans équipe" : "Ordre d'inscription"
                }
                enregistrer={enregistrerRepartition.bind(null, tournoi.id)}
              />
            </div>
          )}
      </section>

      {/* ---------- Classements de poules ---------- */}
      <ClassementsPoules
        matchs={matchs}
        pseudo={pseudo}
        nbQualifies={tournoi.nb_qualifies_par_poule ?? 2}
      />

      {/* ---------- Bracket / matchs ---------- */}
      {matchs.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-widest text-arena-faint">
            Bracket · {nomFormat(tournoi.format)}
          </h2>

          <div className="space-y-6">
            {grouperMatchsParSection(matchs).map((groupe) => (
              <div key={groupe.titre}>
                <h3 className="mb-2 text-sm font-bold text-arena-lilac">
                  {groupe.titre}
                </h3>
                <ul className="space-y-2">
                  {groupe.matchs.map((m) => (
                      <li
                        key={m.id}
                        className="rounded-lg border border-arena-border bg-arena-surface shadow-carte p-3"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div className="text-sm">
                            <span
                              className={
                                camps(m).gagnant &&
                                camps(m).gagnant === camps(m).c1
                                  ? "font-bold text-arena-green"
                                  : "font-semibold"
                              }
                            >
                              {pseudo(camps(m).c1)}
                            </span>
                            <span className="mx-2 text-arena-faint">
                              {m.score_j1 ?? ""} vs {m.score_j2 ?? ""}
                            </span>
                            <span
                              className={
                                camps(m).gagnant &&
                                camps(m).gagnant === camps(m).c2
                                  ? "font-bold text-arena-green"
                                  : "font-semibold"
                              }
                            >
                              {m.is_bye ? "(bye)" : pseudo(camps(m).c2)}
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            {m.statut === "VALIDE" ? (
                              <span className="rounded-full bg-arena-green-pale px-3 py-1 text-xs font-semibold text-arena-green">
                                Validé
                              </span>
                            ) : camps(m).c1 && camps(m).c2 ? (
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
                                    className={`${btn} border border-arena-border text-arena-muted hover:text-arena-ink`}
                                  >
                                    Saisir
                                  </button>
                                </form>
                                {m.statut === "TERMINE" && (
                                  <>
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
                                        className={`${btn} bg-arena-green text-white hover:bg-arena-green/90`}
                                      >
                                        Valider
                                      </button>
                                    </form>
                                    {/* Litige : à ouvrir AVANT validation (règlement §3) */}
                                    <form action={signalerLitige}>
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
                                        title="Ouvrir un litige sur ce score (avant validation)"
                                        className={`${btn} border border-arena-red/30 text-arena-red hover:bg-arena-red-pale`}
                                      >
                                        ⚠
                                      </button>
                                    </form>
                                  </>
                                )}
                                {m.statut === "LITIGIEUX" && (
                                  <span
                                    title="Litige ouvert : re-saisis le score arbitré puis valide"
                                    className="rounded-full bg-arena-red-pale px-3 py-1 text-xs font-semibold text-arena-red"
                                  >
                                    ⚠ Litige
                                  </span>
                                )}
                              </>
                            ) : (
                              <span className="text-xs text-arena-faint">
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
