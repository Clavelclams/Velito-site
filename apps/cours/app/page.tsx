/**
 * Dashboard — Server Component.
 * Compte à rebours jusqu'au jury + état du stock de fiches par bloc CDA
 * + projets + fiches filtrables. La LECTURE des Markdown reste ici (serveur,
 * via lib/fiches/fiches.ts) ; seul le FILTRAGE interactif est délégué au
 * composant client RechercheFiches, qui reçoit les métadonnées en props.
 */
import Link from "next/link";
import { listerFiches, listerProjets } from "@/lib/fiches/fiches";
import { listerQuiz } from "@/lib/fiches/quiz";
import { listerLecons, listerParcours } from "@/lib/fiches/parcours";
import { COULEURS_BLOCS, NOMS_BLOCS } from "@/lib/fiches/blocs";
import RechercheFiches from "@/app/components/RechercheFiches";
import ProgressionDashboard from "@/app/components/ProgressionDashboard";
import ContinuerParcours from "@/app/components/ContinuerParcours";

/** Date cible du jury (à affiner quand la convocation AFPA arrive). */
const DATE_JURY = new Date("2027-04-01T09:00:00+02:00");

export default function DashboardPage() {
  const fiches = listerFiches();
  const projets = listerProjets();
  const quiz = listerQuiz();

  // Toutes les leçons dans l'ordre (parcours puis leçon) pour « Reprendre ».
  const leconsOrdonnee = listerParcours().flatMap((p) =>
    listerLecons(p.slug).map((l) => ({
      id: l.id,
      titre: l.titre,
      parcours: p.slug,
      parcoursTitre: p.titre,
      icone: p.icone,
      fichier: l.fichier,
      ordre: l.ordre,
    })),
  );
  const joursRestants = Math.max(
    0,
    Math.ceil((DATE_JURY.getTime() - Date.now()) / 86_400_000),
  );

  // Compteur par bloc CDA (sur TOUTES les fiches — les stats globales ne
  // bougent pas quand on filtre la liste en dessous).
  const parBloc = { 1: 0, 2: 0, 3: 0 } as Record<1 | 2 | 3, number>;
  for (const f of fiches) parBloc[f.bloc] += 1;

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      {/* ---- En-tête : le compte à rebours, TOUJOURS visible ---- */}
      <header className="mb-10 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">Tableau de bord</h1>
          <p className="text-sm text-cours-text-muted">
            Révision CDA · {fiches.length} fiche{fiches.length > 1 ? "s" : ""}
          </p>
        </div>
        <div className="rounded-xl border border-cours-border bg-cours-surface px-5 py-3 text-center">
          <p className="text-2xl font-bold sm:text-3xl tabular-nums text-cours-accent">
            J−{joursRestants}
          </p>
          <p className="text-xs uppercase tracking-wide text-cours-text-muted">
            avant le jury
          </p>
        </div>
      </header>

      {/* ---- Ma progression (XP, série, révision du jour) ---- */}
      <ProgressionDashboard
        totalFiches={fiches.length}
        totalQuiz={quiz.length}
      />

      {/* ---- La leçon du jour (première non faite, tous parcours) ---- */}
      <ContinuerParcours lecons={leconsOrdonnee} />

      {/* ---- Répartition par bloc CDA ---- */}
      <section className="mb-10 grid gap-4 sm:grid-cols-3">
        {([1, 2, 3] as const).map((bloc) => (
          <div
            key={bloc}
            className="rounded-xl border border-cours-border bg-cours-surface p-4"
          >
            <div className="flex items-center gap-2">
              <span className={`h-3 w-3 rounded-full ${COULEURS_BLOCS[bloc]}`} />
              <p className="text-sm font-semibold">{NOMS_BLOCS[bloc]}</p>
            </div>
            <p className="mt-2 text-2xl font-bold tabular-nums">{parBloc[bloc]}</p>
            <p className="text-xs text-cours-text-muted">fiches</p>
          </div>
        ))}
      </section>

      {/* ---- Suivi des projets (fiches projet maintenues par les
              conversations Claude de chaque dossier) ---- */}
      {projets.length > 0 && (
        <section className="mb-10">
          <h2 className="mb-3 text-lg font-bold">Mes projets</h2>
          <ul className="grid gap-3 sm:grid-cols-2">
            {projets.map((p) => (
              <li key={p.slug}>
                <Link
                  href={`/projets/${p.slug}`}
                  className="block rounded-lg border border-cours-border bg-cours-surface p-4 transition-colors hover:border-cours-accent"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-semibold">{p.titre}</p>
                    <span className="text-xs text-cours-text-muted">
                      {p.statut}
                    </span>
                  </div>
                  <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-cours-border">
                    <div
                      className="h-full rounded-full bg-cours-accent"
                      style={{ width: `${p.avancement}%` }}
                    />
                  </div>
                  <p className="mt-1 text-right text-xs tabular-nums text-cours-text-muted">
                    {p.avancement}%
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* ---- Fiches : recherche + filtres (composant client) ---- */}
      {fiches.length === 0 ? (
        <div className="rounded-xl border border-cours-border bg-cours-surface p-8 text-center text-sm text-cours-text-muted">
          Aucune fiche pour l&apos;instant. Colle le contenu de{" "}
          <code>PROMPT_FICHES.md</code> dans une conversation Claude d&apos;un
          de tes projets, puis dépose les fichiers générés dans{" "}
          <code>content/fiches/</code>.
        </div>
      ) : (
        <RechercheFiches
          fiches={fiches}
          slugsAvecQuiz={quiz.map((q) => q.fiche)}
        />
      )}
    </div>
  );
}
