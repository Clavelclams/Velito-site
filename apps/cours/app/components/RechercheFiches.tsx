/**
 * Recherche + filtres des fiches — composant CLIENT.
 *
 * Pourquoi client ? Le filtrage réagit à chaque frappe : il faut du state
 * React dans le navigateur. Mais la lecture des fichiers Markdown (fs) reste
 * côté serveur : le dashboard (Server Component) appelle listerFiches() puis
 * passe les MÉTADONNÉES (FicheMeta[], sans le corps Markdown) en props ici.
 * Résultat : zéro fs dans le bundle client, et le filtrage est instantané
 * car tout est déjà en mémoire (pas d'aller-retour serveur).
 *
 * `import type` = import de TYPES uniquement : effacé à la compilation,
 * donc le code server-only de fiches.ts ne part jamais dans le bundle.
 */
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { FicheMeta } from "@/lib/fiches/fiches";
import { COULEURS_BLOCS, NOMS_BLOCS } from "@/lib/fiches/blocs";
import { chargerProgression, type Progression } from "@/lib/progression";

/** Minuscules + sans accents : « sécurité » matche « securite ». */
function normaliser(texte: string): string {
  return texte
    .toLowerCase()
    .normalize("NFD") // décompose « é » en « e + accent »
    .replace(/[\u0300-\u036f]/g, ""); // supprime les accents décomposés
}

export default function RechercheFiches({
  fiches,
  slugsAvecQuiz = [],
}: {
  fiches: FicheMeta[];
  /** Slugs des fiches qui ont un quiz (calculé côté serveur). */
  slugsAvecQuiz?: string[];
}) {
  const [requete, setRequete] = useState("");
  const [blocActif, setBlocActif] = useState<1 | 2 | 3 | null>(null);
  const [projetActif, setProjetActif] = useState<string | null>(null);

  // Progression lue APRÈS montage (localStorage n'existe pas côté serveur).
  const [progression, setProgression] = useState<Progression | null>(null);
  useEffect(() => {
    const rafraichir = () => setProgression(chargerProgression());
    rafraichir();
    window.addEventListener("progression-maj", rafraichir);
    return () => window.removeEventListener("progression-maj", rafraichir);
  }, []);

  // Valeurs de filtre tirées des données réelles (jamais codées en dur).
  const projets = useMemo(
    () => [...new Set(fiches.map((f) => f.projet))].sort(),
    [fiches],
  );

  // useMemo : on ne recalcule le filtrage que si une entrée change.
  const fichesFiltrees = useMemo(() => {
    const q = normaliser(requete.trim());
    return fiches.filter((f) => {
      if (blocActif !== null && f.bloc !== blocActif) return false;
      if (projetActif !== null && f.projet !== projetActif) return false;
      if (q) {
        const dansTitre = normaliser(f.titre).includes(q);
        const dansThemes = f.themes.some((t) => normaliser(t).includes(q));
        if (!dansTitre && !dansThemes) return false;
      }
      return true;
    });
  }, [fiches, requete, blocActif, projetActif]);

  // Regroupement par projet (même affichage qu'avant l'ajout des filtres).
  const parProjet = useMemo(() => {
    const groupes = new Map<string, FicheMeta[]>();
    for (const f of fichesFiltrees) {
      const liste = groupes.get(f.projet) ?? [];
      liste.push(f);
      groupes.set(f.projet, liste);
    }
    return groupes;
  }, [fichesFiltrees]);

  const filtresActifs =
    requete.trim() !== "" || blocActif !== null || projetActif !== null;

  function reinitialiser() {
    setRequete("");
    setBlocActif(null);
    setProjetActif(null);
  }

  return (
    <div>
      {/* ---- Barre de recherche ---- */}
      <input
        type="search"
        value={requete}
        onChange={(e) => setRequete(e.target.value)}
        placeholder="Rechercher une fiche (titre, thème)…"
        aria-label="Rechercher une fiche par titre ou thème"
        className="w-full rounded-xl border border-cours-border bg-cours-surface px-4 py-3 text-sm outline-none transition-colors placeholder:text-cours-text-muted focus:border-cours-accent"
      />

      {/* ---- Filtres bloc / projet ---- */}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {([1, 2, 3] as const).map((bloc) => (
          <button
            key={bloc}
            type="button"
            onClick={() => setBlocActif(blocActif === bloc ? null : bloc)}
            aria-pressed={blocActif === bloc}
            className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
              blocActif === bloc
                ? "border-cours-accent bg-cours-accent text-white"
                : "border-cours-border bg-cours-surface text-cours-text-muted hover:border-cours-accent"
            }`}
          >
            <span
              className={`h-2 w-2 rounded-full ${COULEURS_BLOCS[bloc]}`}
            />
            {NOMS_BLOCS[bloc]}
          </button>
        ))}

        {projets.length > 1 && (
          <>
            <span
              aria-hidden="true"
              className="mx-1 h-4 w-px bg-cours-border"
            />
            {projets.map((projet) => (
              <button
                key={projet}
                type="button"
                onClick={() =>
                  setProjetActif(projetActif === projet ? null : projet)
                }
                aria-pressed={projetActif === projet}
                className={`rounded-full border px-3 py-1.5 text-xs font-medium capitalize transition-colors ${
                  projetActif === projet
                    ? "border-cours-accent bg-cours-accent text-white"
                    : "border-cours-border bg-cours-surface text-cours-text-muted hover:border-cours-accent"
                }`}
              >
                {projet}
              </button>
            ))}
          </>
        )}

        {filtresActifs && (
          <button
            type="button"
            onClick={reinitialiser}
            className="ml-auto text-xs text-cours-text-muted underline underline-offset-2 hover:text-cours-accent"
          >
            Réinitialiser
          </button>
        )}
      </div>

      {/* ---- Résultats ---- */}
      {fichesFiltrees.length === 0 ? (
        <div className="mt-6 rounded-xl border border-cours-border bg-cours-surface p-8 text-center text-sm text-cours-text-muted">
          Aucune fiche ne correspond.
          {filtresActifs && (
            <>
              {" "}
              <button
                type="button"
                onClick={reinitialiser}
                className="font-medium text-cours-accent underline underline-offset-2 hover:text-cours-accent-hover"
              >
                Réinitialiser les filtres
              </button>
            </>
          )}
        </div>
      ) : (
        <div className="mt-6">
          {filtresActifs && (
            <p className="mb-4 text-xs text-cours-text-muted">
              {fichesFiltrees.length} fiche
              {fichesFiltrees.length > 1 ? "s" : ""} sur {fiches.length}
            </p>
          )}
          {[...parProjet.entries()].map(([projet, liste]) => (
            <section key={projet} className="mb-8">
              <h2 className="mb-3 text-lg font-bold capitalize">
                {projet}{" "}
                <span className="text-sm font-normal text-cours-text-muted">
                  · {liste.length}
                </span>
              </h2>
              <ul className="space-y-2">
                {liste.map((fiche) => {
                  const lue = progression?.fichesLues.includes(fiche.slug);
                  const resultat = progression?.quiz[fiche.slug];
                  const aQuiz = slugsAvecQuiz.includes(fiche.slug);
                  return (
                    <li key={fiche.slug}>
                      <Link
                        href={`/fiches/${fiche.slug}`}
                        className="flex items-center gap-3 rounded-lg border border-cours-border bg-cours-surface px-4 py-3 transition-all hover:-translate-y-0.5 hover:border-cours-accent hover:shadow-md"
                      >
                        <span
                          className={`h-2.5 w-2.5 shrink-0 rounded-full ${COULEURS_BLOCS[fiche.bloc]}`}
                          title={NOMS_BLOCS[fiche.bloc]}
                        />
                        <span className="flex-1 font-medium">
                          {fiche.titre}
                        </span>
                        {/* Indicateurs de progression : lue ✓, quiz fait x/y, quiz à faire */}
                        {lue && (
                          <span
                            className="text-xs font-bold text-emerald-600"
                            title="Fiche lue"
                          >
                            ✓
                          </span>
                        )}
                        {resultat ? (
                          <span
                            className="rounded-full bg-cours-accent/10 px-2 py-0.5 text-xs font-semibold tabular-nums text-cours-accent"
                            title="Meilleur score au quiz"
                          >
                            🎯 {resultat.meilleurScore}/{resultat.total}
                          </span>
                        ) : (
                          aQuiz && (
                            <span
                              className="rounded-full border border-cours-border px-2 py-0.5 text-xs text-cours-text-muted"
                              title="Quiz disponible"
                            >
                              quiz
                            </span>
                          )
                        )}
                        <span className="hidden text-xs text-cours-text-muted sm:inline">
                          {fiche.themes.slice(0, 2).join(" · ")}
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
