/**
 * Page publique d'accueil ARENA.
 *
 * Server Component : tout est lu avec le client ANONYME, donc la RLS
 * s'applique. Un tournoi en brouillon est invisible ici sans un seul `if`
 * applicatif, et un mineur en profil restreint n'apparaît dans aucun classement.
 *
 * ---------------------------------------------------------------------------
 * PARTI PRIS (refonte du 12/08/2026, après comparaison avec toornament.com)
 * ---------------------------------------------------------------------------
 * Trois défauts constatés en production :
 *
 *  1. AUCUNE MARQUE VISIBLE. Pas de logo, pas de barre de navigation. Un
 *     visiteur qui arrive par un QR code ne sait pas où il est ni où aller.
 *     → Barre collante avec le symbole Velito sur toutes les pages.
 *
 *  2. ON NE COMPRENAIT PAS CE QU'ON POUVAIT FAIRE. Rien ne disait qu'ARENA
 *     gère aussi le padel et le five. Toornament règle exactement ce problème
 *     avec une grille de disciplines dès le premier écran, avant même la
 *     moindre explication : on VOIT ce qui se joue ici.
 *     → Grille de disciplines en deux familles, esport et sport physique.
 *
 *  3. TOUT BLANC = PLAT. Toornament alterne bandeau sombre, corps clair, pied
 *     de page sombre. Ce n'est pas décoratif : l'alternance découpe la page en
 *     chapitres et donne une impression de densité même avec peu de contenu.
 *     → Bandeau et pied de page en violet nuit, corps clair entre les deux.
 *
 * Ce qu'on NE copie PAS à Toornament : les jaquettes de jeux (droits d'auteur,
 * cf. lib/arena/disciplines.ts), le bandeau « ils nous font confiance » (on
 * n'a pas Riot ni Microsoft comme clients, et un faux logo se voit), et la
 * grille tarifaire (ARENA est gratuit, c'est même l'argument).
 *
 * Enfin : tout ce qui remplit cette page vient de la BASE. Les chiffres sont
 * comptés, les champions calculés par les mêmes fonctions que les autres
 * écrans. Chaque section disparaît quand elle est vide. Une page gonflée au
 * faux contenu se repère tout de suite et décrédibilise le reste.
 */
import { createClient } from "@/lib/supabase/server";
import { calculerClassement } from "@/lib/arena/classement";
import { matchFinal } from "@/lib/arena/affichage";
import { DISCIPLINES_ESPORT, DISCIPLINES_SPORT } from "@/lib/arena/disciplines";
import type { Joueur, MatchRow, Tournoi } from "@/lib/arena/types";
import EnteteSite from "@/components/EnteteSite";
import PiedSite from "@/components/PiedSite";
import { MarqueArena } from "@/components/Marque";
import MotifDiscipline, { type CleMotif } from "@/components/MotifDiscipline";
import {
  IconeCalendrier,
  IconeJoueurs,
  IconeManette,
  IconeQr,
  IconeTrophee,
  IconeValide,
  PastilleDirect,
} from "@/components/Icones";

const dateCourte = (iso: string) =>
  new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "long" });

const dateLongue = (iso: string) =>
  new Date(iso).toLocaleString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  });

/**
 * Normalise pour la recherche : minuscules, sans accents, espaces resserrés.
 * « PADEL », « padel » et « pâdel » doivent trouver la même chose.
 * normalize("NFD") décompose « é » en « e » + accent, la regex retire ensuite
 * les accents (bloc Unicode des diacritiques combinants).
 */
function normaliser(texte: string): string {
  return texte
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export default async function ArenaHome({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const recherche = normaliser(q ?? "");
  let tournois: Tournoi[] = [];
  let podium: { pseudo: string; points: number; titres: number }[] = [];
  let championParTournoi = new Map<string, string>();
  let nbJoueurs = 0;
  let nbMatchsJoues = 0;

  try {
    const supabase = await createClient();

    const [{ data: tournoisData }, { data: joueursData }] = await Promise.all([
      supabase
        .schema("arena")
        .from("tournois")
        .select("*")
        .neq("statut", "BROUILLON")
        .order("date_debut", { ascending: false })
        .limit(30),
      supabase.schema("arena").from("joueurs").select("id, pseudo, profil_public"),
    ]);

    tournois = (tournoisData ?? []) as Tournoi[];

    const joueurs = (joueursData ?? []) as Pick<
      Joueur,
      "id" | "pseudo" | "profil_public"
    >[];
    nbJoueurs = joueurs.length;
    const infoJoueur = new Map(joueurs.map((j) => [j.id, j]));

    const idsTermines = tournois
      .filter((t) => t.statut === "TERMINE")
      .map((t) => t.id);

    if (idsTermines.length > 0) {
      const [{ data: matchsData }, { data: equipesData }] = await Promise.all([
        supabase.schema("arena").from("matchs").select("*").in("tournoi_id", idsTermines),
        // Équipes des tournois de sport : elles portent le nom du vainqueur et
        // la composition qui sert à redistribuer les points aux joueurs.
        supabase
          .schema("arena")
          .from("equipes")
          .select("id, nom, membres:equipes_membres(joueur_id)")
          .in("tournoi_id", idsTermines),
      ]);

      const equipes = (equipesData ?? []) as {
        id: string;
        nom: string;
        membres: { joueur_id: string }[];
      }[];
      const nomDuCamp = (campId: string) =>
        infoJoueur.get(campId)?.pseudo ??
        equipes.find((e) => e.id === campId)?.nom;
      const membresParEquipe = new Map(
        equipes.map((e) => [e.id, (e.membres ?? []).map((mb) => mb.joueur_id)])
      );

      const parTournoi = new Map<string, MatchRow[]>();
      for (const m of (matchsData ?? []) as MatchRow[]) {
        const liste = parTournoi.get(m.tournoi_id) ?? [];
        liste.push(m);
        parTournoi.set(m.tournoi_id, liste);
      }

      nbMatchsJoues = (matchsData ?? []).filter(
        (m) => (m as MatchRow).statut === "VALIDE"
      ).length;

      // Champion de chaque tournoi : même fonction que la page publique du
      // tournoi, donc impossible qu'un écran contredise l'autre.
      championParTournoi = new Map(
        [...parTournoi.entries()].flatMap(([tournoiId, matchs]) => {
          const finale = matchFinal(matchs);
          // Le vainqueur est un joueur en esport, une équipe en sport.
          const gagnant =
            finale?.statut === "VALIDE"
              ? (finale.equipe_gagnante_id ?? finale.gagnant_id)
              : null;
          const nom = gagnant ? nomDuCamp(gagnant) : undefined;
          return nom ? [[tournoiId, nom] as [string, string]] : [];
        })
      );

      podium = calculerClassement([...parTournoi.values()], membresParEquipe)
        .filter((l) => infoJoueur.get(l.joueurId)?.profil_public !== false)
        .slice(0, 3)
        .map((l) => ({
          pseudo: infoJoueur.get(l.joueurId)?.pseudo ?? "?",
          points: l.points,
          titres: l.titres,
        }));
    }
  } catch {
    // Variables d'environnement absentes (tout premier déploiement) : la page
    // reste servable avec ses états vides plutôt que de renvoyer une 500.
  }

  // Filtrage de la recherche EN MÉMOIRE, pas en SQL avec un ILIKE : la page
  // charge de toute façon les 30 derniers tournois pour remplir ses
  // compteurs, filtrer côté base ajouterait un aller-retour pour rien. À
  // partir de quelques centaines de tournois il faudra une recherche plein
  // texte Postgres, pas avant.
  const correspond = (t: Tournoi) =>
    !recherche ||
    normaliser(`${t.titre} ${t.jeu} ${t.lieu ?? ""}`).includes(recherche);

  const trouves = tournois.filter(correspond);
  const enCours = trouves.filter((t) => t.statut === "EN_COURS");
  const ouverts = trouves.filter((t) => t.statut === "OUVERT");
  const termines = trouves
    .filter((t) => t.statut === "TERMINE")
    .slice(0, recherche ? 30 : 6);
  const aucunTournoi = tournois.length === 0;
  const sansResultat = recherche.length > 0 && trouves.length === 0;

  // Nombre de tournois déjà organisés par discipline : une pastille qui affiche
  // « 2 tournois » prouve que la discipline est vivante, là où une pastille
  // vide n'annonce qu'une intention. On n'invente rien, on compte.
  const parDiscipline = new Map<string, number>();
  for (const t of tournois) {
    parDiscipline.set(t.jeu, (parDiscipline.get(t.jeu) ?? 0) + 1);
  }

  const chiffres = [
    { valeur: tournois.length, libelle: tournois.length > 1 ? "tournois" : "tournoi" },
    { valeur: nbJoueurs, libelle: nbJoueurs > 1 ? "joueurs" : "joueur" },
    { valeur: nbMatchsJoues, libelle: nbMatchsJoues > 1 ? "matchs validés" : "match validé" },
  ];

  /**
   * Affiche de discipline. Cliquer dessus LANCE LA RECHERCHE sur cette
   * discipline : la vignette n'est donc pas décorative, c'est un filtre. Sans
   * ça, on affiche quatorze cases sur lesquelles il ne se passe rien, ce qui
   * est pire que de ne rien afficher.
   */
  const Affiche = ({
    court,
    jeu,
    couleur,
    motif,
  }: {
    court: string;
    jeu: string;
    couleur: string;
    motif: CleMotif;
  }) => {
    const nb = parDiscipline.get(jeu) ?? 0;
    return (
      <a
        href={`/?q=${encodeURIComponent(jeu)}#tournois`}
        className={`group relative flex aspect-[3/4] flex-col justify-end overflow-hidden rounded-xl bg-gradient-to-br ${couleur} p-3 ring-1 ring-inset ring-white/15 transition-transform hover:-translate-y-1 hover:ring-white/40`}
      >
        {/* L'illustration déborde volontairement du cadre : c'est ce qui donne
            l'impression d'une jaquette plutôt que d'un pictogramme centré. */}
        <MotifDiscipline
          cle={motif}
          className="absolute -right-5 -top-4 h-28 w-28 text-white/25 transition-transform duration-300 group-hover:scale-110"
        />
        <span className="relative font-titre text-sm font-bold leading-tight text-white drop-shadow">
          {court}
        </span>
        <span className="relative mt-1 text-[11px] font-semibold text-white/75">
          {nb > 0 ? `${nb} tournoi${nb > 1 ? "s" : ""}` : "Bientôt"}
        </span>
      </a>
    );
  };

  return (
    <div>
      <EnteteSite variante="nuit" />

      {/* ============ BANDEAU D'ACCUEIL (fond nuit) ============ */}
      <header className="relative overflow-hidden bg-arena-nuit text-white">
        {/* Halo violet très diffus : donne de la profondeur au fond nuit sans
            aucune image à charger. Purement décoratif, donc masqué aux
            technologies d'assistance. */}
        <div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-[-14rem] h-[32rem] w-[52rem] -translate-x-1/2 rounded-full bg-arena-violet/25 blur-3xl"
        />

        <div className="relative mx-auto max-w-6xl px-4 py-16 text-center sm:py-24">
          <div className="flex justify-center text-white">
            <MarqueArena taille="grande" />
          </div>

          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-white/80 sm:text-xl">
            Tout ce qu&apos;il faut pour organiser une compétition amateur.
            <span className="block font-semibold text-white">
              Esport et sport physique, à Amiens.
            </span>
          </p>

          {/* ---- Grille des disciplines ---- */}
          <section className="mt-12 text-left">
            <h2 className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-white/60">
              <IconeManette className="h-4 w-4" />
              Esport
            </h2>
            <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-5 lg:grid-cols-10">
              {DISCIPLINES_ESPORT.map((d) => (
                <Affiche key={d.jeu} {...d} />
              ))}
            </div>

            <h2 className="mb-3 mt-8 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-white/60">
              <IconeJoueurs className="h-4 w-4" />
              Sport physique
            </h2>
            <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-5 lg:grid-cols-10">
              {DISCIPLINES_SPORT.map((d) => (
                <Affiche key={d.jeu} {...d} />
              ))}
            </div>
          </section>

          {/* Recherche : un <form method="get"> natif, donc ZÉRO JavaScript.
              Le navigateur construit lui-même /?q=..., Next re-rend la page
              côté serveur, et l'URL obtenue est partageable et indexable.
              Un champ contrôlé en React aurait demandé un composant client
              pour un résultat strictement identique. */}
          <form
            action="/"
            method="get"
            role="search"
            className="mx-auto mt-10 flex max-w-xl gap-2"
          >
            <label htmlFor="q" className="sr-only">
              Rechercher un tournoi, un jeu ou un lieu
            </label>
            <input
              id="q"
              name="q"
              type="search"
              defaultValue={q ?? ""}
              placeholder="Rechercher : Padel, Rocket League, Étouvie…"
              className="min-w-0 flex-1 rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-white placeholder:text-white/50 focus:border-white/50 focus:outline-none"
            />
            <button className="rounded-xl bg-white px-5 py-3 font-semibold text-arena-nuit transition-colors hover:bg-white/90">
              Chercher
            </button>
          </form>

          <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
            <a
              href="#tournois"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-6 py-3 font-semibold text-arena-nuit transition-colors hover:bg-white/90"
            >
              Voir les tournois
            </a>
            <a
              href="/classement"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/25 px-6 py-3 font-semibold text-white transition-colors hover:bg-white/10"
            >
              <IconeTrophee className="h-5 w-5" />
              Classement des joueurs
            </a>
          </div>

          {/* Les chiffres ne s'affichent que s'il y a réellement quelque chose
              à compter : un « 0 joueur » en gros ne donne envie à personne. */}
          {!aucunTournoi && (
            <dl className="mx-auto mt-12 grid max-w-lg grid-cols-3 gap-6 border-t border-white/10 pt-8">
              {chiffres.map((c) => (
                <div key={c.libelle}>
                  <dt className="sr-only">{c.libelle}</dt>
                  <dd>
                    <span className="block font-titre text-3xl font-bold">
                      {c.valeur}
                    </span>
                    <span className="text-sm text-white/60">{c.libelle}</span>
                  </dd>
                </div>
              ))}
            </dl>
          )}
        </div>
      </header>

      <main id="tournois" className="mx-auto max-w-6xl px-4 py-14 sm:py-20">
        {recherche && (
          <p className="mb-8 flex flex-wrap items-center gap-3 rounded-xl border border-arena-border bg-arena-surface px-4 py-3 text-sm shadow-carte">
            <span>
              <strong>{trouves.length}</strong>{" "}
              {trouves.length > 1 ? "tournois trouvés" : "tournoi trouvé"} pour
              {" « "}
              <strong>{q}</strong>
              {" »"}
            </span>
            <a
              href="/#tournois"
              className="font-semibold text-arena-violet underline-offset-4 hover:underline"
            >
              Effacer la recherche
            </a>
          </p>
        )}

        {sansResultat && (
          <section className="mb-14 rounded-2xl border border-dashed border-arena-border bg-arena-surface px-6 py-12 text-center">
            <p className="font-titre text-xl font-bold">
              Aucun tournoi ne correspond
            </p>
            <p className="mx-auto mt-2 max-w-md text-arena-muted">
              Essaie un autre mot, ou regarde tous les tournois. Une discipline
              sans tournoi pour l&apos;instant, ça veut juste dire qu&apos;on
              n&apos;en a pas encore organisé.
            </p>
          </section>
        )}

        {/* ============ EN DIRECT ============ */}
        {enCours.length > 0 && (
          <section className="mb-14">
            <h2 className="mb-4 flex items-center gap-2.5 text-sm font-bold uppercase tracking-widest text-arena-red">
              <PastilleDirect />
              En direct
            </h2>
            <div className="grid gap-4 md:grid-cols-2">
              {enCours.map((t) => (
                <a
                  key={t.id}
                  href={`/t/${t.qr_token}`}
                  className="rounded-2xl border-2 border-arena-violet bg-arena-bg p-6 shadow-carte-active transition-transform hover:-translate-y-1"
                >
                  <p className="text-xs font-bold uppercase tracking-widest text-arena-violet">
                    {t.jeu}
                  </p>
                  <p className="mt-2 font-titre text-2xl font-bold leading-tight">
                    {t.titre}
                  </p>
                  <p className="mt-3 flex items-center gap-2 text-sm text-arena-muted">
                    <IconeCalendrier className="h-4 w-4" />
                    {dateLongue(t.date_debut)}
                  </p>
                  {t.lieu && (
                    <p className="mt-1 text-sm text-arena-muted">{t.lieu}</p>
                  )}
                  <p className="mt-4 text-sm font-semibold text-arena-violet">
                    Suivre le bracket en direct →
                  </p>
                </a>
              ))}
            </div>
          </section>
        )}

        {/* ============ INSCRIPTIONS OUVERTES ============ */}
        {ouverts.length > 0 && (
          <section className="mb-14">
            <h2 className="mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-arena-green">
              <IconeValide className="h-4 w-4" />
              Inscriptions ouvertes
            </h2>
            <ul className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {ouverts.map((t) => (
                <li key={t.id}>
                  <a
                    href={`/t/${t.qr_token}`}
                    className="flex h-full flex-col rounded-xl border border-arena-border bg-arena-surface p-5 shadow-carte transition-colors hover:border-arena-green"
                  >
                    <span className="text-xs font-bold uppercase tracking-widest text-arena-green">
                      {t.jeu}
                    </span>
                    <span className="mt-1.5 font-titre text-lg font-bold leading-snug">
                      {t.titre}
                    </span>
                    <span className="mt-3 flex items-center gap-2 text-sm text-arena-muted">
                      <IconeCalendrier className="h-4 w-4" />
                      {dateCourte(t.date_debut)}
                      {t.lieu ? ` · ${t.lieu}` : ""}
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* ============ RÉSULTATS ============ */}
        {termines.length > 0 && (
          <section className="mb-14">
            <h2 className="mb-4 text-sm font-bold uppercase tracking-widest text-arena-faint">
              Derniers résultats
            </h2>
            <ul className="divide-y divide-arena-border overflow-hidden rounded-xl border border-arena-border bg-arena-surface shadow-carte">
              {termines.map((t) => {
                const champion = championParTournoi.get(t.id);
                return (
                  <li key={t.id}>
                    <a
                      href={`/t/${t.qr_token}`}
                      className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 transition-colors hover:bg-arena-surface-fort"
                    >
                      <span>
                        <span className="block font-semibold">{t.titre}</span>
                        <span className="block text-sm text-arena-muted">
                          {t.jeu} · {dateCourte(t.date_debut)}
                        </span>
                      </span>
                      {champion ? (
                        <span className="inline-flex items-center gap-2 rounded-full bg-arena-gold-pale px-3 py-1.5 text-sm font-bold text-arena-gold">
                          <IconeTrophee className="h-4 w-4" />
                          {champion}
                        </span>
                      ) : (
                        <span className="text-sm text-arena-faint">Résultats</span>
                      )}
                    </a>
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        {/* ============ ÉTAT VIDE ============ */}
        {aucunTournoi && (
          <section className="mb-14 rounded-2xl border border-dashed border-arena-border bg-arena-surface px-6 py-14 text-center">
            <IconeManette className="mx-auto h-10 w-10 text-arena-faint" />
            <p className="mt-4 font-titre text-xl font-bold">
              Aucun tournoi publié pour l&apos;instant
            </p>
            <p className="mx-auto mt-2 max-w-md text-arena-muted">
              Le prochain arrive. En attendant, tu peux lire comment se déroule
              un tournoi ARENA et ce qu&apos;on attend des joueurs.
            </p>
            <a
              href="/reglement"
              className="mt-6 inline-block rounded-xl border border-arena-border bg-arena-bg px-5 py-2.5 font-semibold transition-colors hover:border-arena-violet"
            >
              Lire le règlement
            </a>
          </section>
        )}

        {/* ============ PODIUM ============ */}
        {podium.length > 0 && (
          <section className="mb-14">
            <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="text-sm font-bold uppercase tracking-widest text-arena-faint">
                Meilleurs joueurs
              </h2>
              <a
                href="/classement"
                className="text-sm font-semibold text-arena-violet underline-offset-4 hover:underline"
              >
                Classement complet
              </a>
            </div>
            <ol className="grid gap-3 sm:grid-cols-3">
              {podium.map((j, rang) => (
                <li
                  key={j.pseudo}
                  className={`rounded-xl border p-5 shadow-carte ${
                    rang === 0
                      ? "border-arena-gold/40 bg-arena-gold-pale"
                      : "border-arena-border bg-arena-surface"
                  }`}
                >
                  <span className="font-titre text-sm font-bold text-arena-faint">
                    #{rang + 1}
                  </span>
                  <a
                    href={`/joueurs/${encodeURIComponent(j.pseudo)}`}
                    className="mt-1 block font-titre text-xl font-bold underline-offset-4 hover:underline"
                  >
                    {j.pseudo}
                  </a>
                  <p className="mt-1 text-sm text-arena-muted">
                    {j.points} pts
                    {j.titres > 0
                      ? ` · ${j.titres} titre${j.titres > 1 ? "s" : ""}`
                      : ""}
                  </p>
                </li>
              ))}
            </ol>
          </section>
        )}
      </main>

      {/* ============ DEUX PUBLICS (bande de rupture) ============
          Toornament découpe son offre par public : joueurs, organisateurs,
          éditeurs. On garde les deux qui nous concernent. Le fond `surface`
          sépare visuellement cette bande du reste. */}
      <section className="border-y border-arena-border bg-arena-surface">
        <div className="mx-auto grid max-w-6xl gap-6 px-4 py-14 md:grid-cols-2 sm:py-20">
          <div className="rounded-2xl border border-arena-border bg-arena-bg p-6 shadow-carte sm:p-8">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-arena-violet-pale text-arena-violet">
              <IconeQr />
            </span>
            <h2 className="mt-4 font-titre text-2xl font-bold">Tu viens jouer</h2>
            <p className="mt-2 leading-relaxed text-arena-muted">
              Le staff t&apos;inscrit sur place, ou tu scannes le QR code
              affiché. Pas de compte à créer, pas d&apos;application à
              installer. Tu suis ton bracket en direct sur ton téléphone, et
              ton palmarès reste lié à ton pseudo d&apos;un tournoi au suivant.
            </p>
            <ul className="mt-4 space-y-2 text-sm text-arena-muted">
              {[
                "Bracket mis à jour en direct pendant le tournoi",
                "Score validé par le staff, plus modifiable ensuite",
                "Points, badges et historique conservés",
              ].map((point) => (
                <li key={point} className="flex gap-2">
                  <IconeValide className="h-4 w-4 shrink-0 translate-y-0.5 text-arena-green" />
                  {point}
                </li>
              ))}
            </ul>
            <a
              href="#tournois"
              className="mt-6 inline-block rounded-xl bg-arena-violet px-5 py-2.5 font-semibold text-white transition-colors hover:bg-arena-violet-fonce"
            >
              Voir les tournois ouverts
            </a>
          </div>

          <div className="rounded-2xl border border-arena-border bg-arena-bg p-6 shadow-carte sm:p-8">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-arena-violet-pale text-arena-violet">
              <IconeJoueurs />
            </span>
            <h2 className="mt-4 font-titre text-2xl font-bold">Tu organises</h2>
            <p className="mt-2 leading-relaxed text-arena-muted">
              Association, club, maison de quartier ou service jeunesse : tu
              crées ton tournoi en deux minutes et ARENA gère le reste.
              Élimination simple, double élimination ou poules, sur un jeu vidéo
              comme sur un terrain de padel.
            </p>
            <ul className="mt-4 space-y-2 text-sm text-arena-muted">
              {[
                "Bracket et calendrier générés automatiquement",
                "QR code et feuille de match imprimables",
                "Gratuit, sans commission, sans revente de données",
              ].map((point) => (
                <li key={point} className="flex gap-2">
                  <IconeValide className="h-4 w-4 shrink-0 translate-y-0.5 text-arena-green" />
                  {point}
                </li>
              ))}
            </ul>
            <a
              href="/admin"
              className="mt-6 inline-block rounded-xl border border-arena-border px-5 py-2.5 font-semibold transition-colors hover:border-arena-violet"
            >
              Ouvrir l&apos;espace organisateur
            </a>
          </div>
        </div>
      </section>

      <PiedSite />
    </div>
  );
}
