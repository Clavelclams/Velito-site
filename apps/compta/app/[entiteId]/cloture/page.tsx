/**
 * Clôture d'exercice — Server Component (07/11/2026).
 *
 * L'exercice est l'année civile, choisie dans l'URL (?exercice=2025). Par
 * défaut : l'année précédente, celle qu'on clôture en début d'année.
 *
 * La page montre la checklist (chaque blocage, son nombre, où le corriger),
 * la grille des 12 mois, le formulaire de clôture (actif seulement si tout
 * est vert), l'historique des clôtures et réouvertures, et le formulaire de
 * réouverture. Tous les calculs sont des fonctions pures (services/cloture).
 */
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getEntite } from "@/lib/repositories/entites";
import { listerMembres, roleSurEntite } from "@/lib/repositories/membres";
import { chargerDonneesExercice, listerClotures } from "@/lib/repositories/cloture";
import { formaterCentimes } from "@/lib/services/montants";
import {
  checklistCloture,
  clotureActive,
  exercicesProposes,
  moisTermines,
  type ClotureExercice,
} from "@/lib/services/cloture";
import { FormulaireCloture, FormulaireReouverture } from "@/components/ActionsCloture";

const MOIS = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];

function dateHeureFr(iso: string): string {
  return new Date(iso).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short", timeZone: "Europe/Paris" });
}

function montant(c: number | null): string {
  return c === null ? "inconnu" : formaterCentimes(c);
}

function Pastille({ ok }: { ok: boolean }) {
  return (
    <span
      aria-hidden
      className={`mt-1 inline-block h-2.5 w-2.5 shrink-0 rounded-full ${ok ? "bg-compta-recette" : "bg-compta-depense"}`}
    />
  );
}

export default async function CloturePage({
  params,
  searchParams,
}: {
  params: Promise<{ entiteId: string }>;
  searchParams: Promise<{ exercice?: string }>;
}) {
  const { entiteId } = await params;
  const { exercice: brut } = await searchParams;
  const supabase = await createClient();

  const aujourdHui = new Date().toISOString().slice(0, 10);
  const anneeCourante = Number(aujourdHui.slice(0, 4));
  const demande = /^\d{4}$/.test(brut ?? "") ? Number(brut) : anneeCourante - 1;
  const exercice = Math.min(Math.max(demande, 2000), 2100);

  const [donnees, clotures, role, entite, membres] = await Promise.all([
    chargerDonneesExercice(supabase, entiteId, exercice, aujourdHui),
    listerClotures(supabase, entiteId),
    roleSurEntite(supabase, entiteId),
    getEntite(supabase, entiteId),
    listerMembres(supabase, entiteId),
  ]);

  const checklist = checklistCloture(donnees);
  const mois = moisTermines(donnees);
  const active = clotureActive(clotures, exercice);
  const peutEcrire = role === "proprietaire" || role === "tresorier";
  const annees = exercicesProposes(donnees.lignes, aujourdHui);
  if (!annees.includes(exercice)) annees.push(exercice);
  annees.sort((a, b) => b - a);

  // Auteur lisible : propriétaire, e-mail d'un membre, ou compte retiré.
  const emails = new Map(membres.map((m) => [m.user_id, m.email]));
  const auteur = (id: string | null) =>
    id === null ? "compte supprimé" : id === entite?.proprietaire_id ? "le propriétaire" : emails.get(id) ?? "un ancien membre";
  const historique = clotures.filter((c) => c.exercice === exercice);
  const autres = clotures.filter((c) => c.exercice !== exercice);

  return (
    <section className="space-y-8">
      <div>
        <h2 className="text-lg font-semibold">Clôture de l&apos;exercice {exercice}</h2>
        <p className="mt-1 text-sm text-compta-text-muted">
          Exercice = année civile, du 01/01/{exercice} au 31/12/{exercice}. Clôturer fige les comptes de
          l&apos;année dans l&apos;application : la base refuse ensuite tout ajout, modification ou
          suppression d&apos;une ligne, d&apos;un relevé, d&apos;un justificatif ou d&apos;une contribution
          bénévole datés de cet exercice.
        </p>
        <p className="mt-2 rounded-md bg-compta-accent/10 px-3 py-2 text-sm">
          Clôturer n&apos;est ni certifier ni faire approuver : la certification (par un vérificateur ou un
          commissaire aux comptes) et le vote des comptes par l&apos;assemblée générale restent des étapes à part.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {annees.map((a) => (
          <Link
            key={a}
            href={`/${entiteId}/cloture?exercice=${a}`}
            className={`rounded-full border px-3 py-1 text-xs ${
              a === exercice ? "border-compta-accent bg-compta-accent text-white" : "border-compta-border text-compta-text-muted hover:border-compta-accent"
            }`}
          >
            {a}
            {clotureActive(clotures, a) ? " (clôturé)" : ""}
          </Link>
        ))}
      </div>

      {active ? (
        <ClotureEnCours cloture={active} auteur={auteur(active.cloture_par)} />
      ) : (
        <>
          {/* ---- Checklist ---- */}
          <div className="space-y-3">
            <h3 className="font-semibold">
              Avant de clôturer{" "}
              <span className="text-sm font-normal text-compta-text-muted">
                {checklist.toutVert ? "tout est en ordre" : `${checklist.nbBlocages} point(s) à corriger`} ·{" "}
                {checklist.nbLignes} ligne(s) en {exercice}
              </span>
            </h3>
            <ul className="divide-y divide-compta-border rounded-lg border border-compta-border bg-compta-surface">
              {checklist.points.map((p) => (
                <li key={p.code} className="flex gap-3 px-4 py-3 text-sm">
                  <Pastille ok={p.ok} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <span className={p.ok ? "" : "font-medium"}>{p.libelle}</span>
                      {!p.ok && p.code !== "exercice_termine" && (
                        <span className="text-compta-depense">{p.nombre} à corriger</span>
                      )}
                    </div>
                    {p.sousPoints.length > 0 ? (
                      <ul className="mt-1 space-y-0.5 text-xs">
                        {p.sousPoints.map((s) => (
                          <li key={s.lien}>
                            <Link href={s.lien} className="text-compta-accent hover:underline">
                              {s.libelle}
                              {p.code === "non_pointees" ? ` : ${s.nombre} ligne(s)` : ""}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      p.lien && (
                        <Link href={p.lien} className="mt-1 inline-block text-xs text-compta-accent hover:underline">
                          Corriger
                        </Link>
                      )
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>

          {/* ---- Clôturer ---- */}
          <div className="rounded-lg border border-compta-border bg-compta-surface p-4">
            {peutEcrire ? (
              <FormulaireCloture entiteId={entiteId} exercice={exercice} signature={checklist.signature} toutVert={checklist.toutVert} />
            ) : (
              <p className="text-sm text-compta-text-muted">
                Lecture seule : seuls le propriétaire et le trésorier peuvent clôturer.
              </p>
            )}
          </div>
        </>
      )}

      {/* ---- Grille des 12 mois ---- */}
      <div className="space-y-3">
        <h3 className="font-semibold">
          Mois de {exercice}{" "}
          <span className="text-sm font-normal text-compta-text-muted">
            {mois.filter((m) => m.termine).length} / 12 terminés
          </span>
        </h3>
        <p className="text-sm text-compta-text-muted">
          Un mois est terminé quand il est passé, que toutes ses lignes sont validées, justifiées, rattachées
          à un compte et pointées si elles sont bancaires, et que le relevé du mois concorde pour chaque compte
          bancaire. Un mois sans mouvement n&apos;est jamais terminé tout seul : saisis son relevé.
        </p>
        <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {mois.map((m) => (
            <li
              key={m.mois}
              className={`rounded-lg border p-3 text-sm ${m.termine ? "border-compta-recette/40 bg-compta-recette/5" : "border-compta-border bg-compta-surface"}`}
            >
              <div className="flex items-center justify-between">
                <span className="font-medium">{MOIS[m.mois - 1]}</span>
                <span className={`text-xs ${m.termine ? "text-compta-recette" : "text-compta-text-muted"}`}>
                  {m.termine ? "Terminé" : "Pas terminé"}
                </span>
              </div>
              {m.raisons.length > 0 && (
                <ul className="mt-1 list-disc space-y-0.5 pl-4 text-xs text-compta-text-muted">
                  {m.raisons.map((r) => (
                    <li key={r}>{r}</li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      </div>

      {/* ---- Historique et réouverture ---- */}
      <div className="space-y-3">
        <h3 className="font-semibold">Historique de {exercice}</h3>
        {historique.length === 0 ? (
          <p className="text-sm text-compta-text-muted">Aucune clôture pour cet exercice.</p>
        ) : (
          <TableHistorique clotures={historique} auteur={auteur} />
        )}
        {active && (
          <div className="rounded-lg border border-compta-border bg-compta-surface p-4">
            {peutEcrire ? (
              <FormulaireReouverture entiteId={entiteId} exercice={exercice} />
            ) : (
              <p className="text-sm text-compta-text-muted">
                Lecture seule : seuls le propriétaire et le trésorier peuvent rouvrir.
              </p>
            )}
          </div>
        )}
        {autres.length > 0 && (
          <details className="text-sm">
            <summary className="cursor-pointer text-compta-text-muted">Autres exercices ({autres.length})</summary>
            <div className="mt-2">
              <TableHistorique clotures={autres} auteur={auteur} avecExercice />
            </div>
          </details>
        )}
      </div>
    </section>
  );
}

function ClotureEnCours({ cloture: c, auteur }: { cloture: ClotureExercice; auteur: string }) {
  // L'instantané vient de la base : on le lit prudemment (un champ absent reste « inconnu »).
  const i: Partial<ClotureExercice["instantane"]> = c.instantane ?? {};
  return (
    <div className="space-y-4 rounded-lg border border-compta-recette/40 bg-compta-recette/5 p-4 text-sm">
      <p>
        <strong>Exercice {c.exercice} clôturé</strong> le {dateHeureFr(c.cloture_le)} par {auteur}. Motif : {c.motif}
      </p>
      <div className="grid gap-3 sm:grid-cols-3">
        <div>
          <p className="text-xs text-compta-text-muted">Recettes (hors virements)</p>
          <p className="tabular-nums text-compta-recette">{montant(i.recettesCentimes ?? null)}</p>
        </div>
        <div>
          <p className="text-xs text-compta-text-muted">Dépenses (hors virements)</p>
          <p className="tabular-nums text-compta-depense">{montant(i.depensesCentimes ?? null)}</p>
        </div>
        <div>
          <p className="text-xs text-compta-text-muted">Résultat</p>
          <p className="tabular-nums font-semibold">{montant(i.resultatCentimes ?? null)}</p>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <p className="mb-1 text-xs uppercase text-compta-text-muted">Par catégorie</p>
          <ul className="space-y-0.5">
            {(i.categories ?? []).map((cat) => (
              <li key={`${cat.type}-${cat.categorieId ?? "aucune"}`} className="flex justify-between gap-2">
                <span>{cat.nom}</span>
                <span className={`tabular-nums ${cat.type === "recette" ? "text-compta-recette" : "text-compta-depense"}`}>
                  {formaterCentimes(cat.totalCentimes)}
                </span>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="mb-1 text-xs uppercase text-compta-text-muted">Soldes au 31/12/{c.exercice}</p>
          <ul className="space-y-0.5">
            {(i.soldes ?? []).map((s) => (
              <li key={s.compteId} className="flex justify-between gap-2">
                <span>{s.nom}</span>
                <span className="tabular-nums">{montant(s.soldeCentimes)}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <p className="text-xs text-compta-text-muted">
        Instantané figé de {i.nbLignes ?? "?"} ligne(s). Pour corriger une ligne de {c.exercice}, rouvre l&apos;exercice (motif obligatoire).
      </p>
    </div>
  );
}

function TableHistorique({
  clotures,
  auteur,
  avecExercice = false,
}: {
  clotures: ClotureExercice[];
  auteur: (id: string | null) => string;
  avecExercice?: boolean;
}) {
  return (
    <div className="overflow-x-auto rounded-lg border border-compta-border">
      <table className="w-full text-sm">
        <thead className="bg-compta-bg text-left text-xs uppercase text-compta-text-muted">
          <tr>
            {avecExercice && <th className="px-3 py-2 font-medium">Exercice</th>}
            <th className="px-3 py-2 font-medium">Clôture</th>
            <th className="px-3 py-2 font-medium">État</th>
            <th className="px-3 py-2 font-medium">Réouverture</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-compta-border bg-compta-surface align-top">
          {clotures.map((c) => (
            <tr key={c.id}>
              {avecExercice && <td className="px-3 py-2">{c.exercice}</td>}
              <td className="px-3 py-2">
                {dateHeureFr(c.cloture_le)} par {auteur(c.cloture_par)}
                <span className="block text-xs text-compta-text-muted">{c.motif}</span>
                <span className="block text-xs text-compta-text-muted">
                  Résultat figé : {montant(c.instantane?.resultatCentimes ?? null)} · {c.instantane?.nbLignes ?? "?"} ligne(s)
                </span>
              </td>
              <td className={`px-3 py-2 text-xs ${c.statut === "cloture" ? "text-compta-recette" : "text-compta-text-muted"}`}>
                {c.statut === "cloture" ? "Clôturé" : "Rouvert"}
              </td>
              <td className="px-3 py-2">
                {c.rouvert_le ? (
                  <>
                    {dateHeureFr(c.rouvert_le)} par {auteur(c.rouvert_par)}
                    <span className="block text-xs text-compta-text-muted">{c.motif_reouverture}</span>
                  </>
                ) : (
                  <span className="text-xs text-compta-text-muted">Aucune</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
