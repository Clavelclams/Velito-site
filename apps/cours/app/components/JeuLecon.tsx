/**
 * MINI-JEUX DANS LES LEÇONS — composant CLIENT. [2026-11-13]
 *
 * Pourquoi : une leçon faite seulement de texte se lit en diagonale et ne
 * reste pas. Ici, la leçon s'arrête toutes les quelques lignes pour faire
 * AGIR : deviner, trier, associer, compléter. C'est la réponse immédiate
 * (juste ou faux + pourquoi) qui fait retenir, pas la longueur du texte.
 *
 * Comment on en écrit un : dans le Markdown d'une leçon ou d'une fiche, un
 * bloc de code de langage `jeu` qui contient du JSON. `ContenuMarkdown`
 * repère ce bloc et affiche ce composant à la place du code.
 *
 *   ```jeu
 *   { "type": "devine", "question": "…", "reponse": "…" }
 *   ```
 *
 * Sept types (voir PROMPT_FICHES.md, section « Mini-jeux ») :
 *   devine, choix, vraifaux, ordre, trous, paires, cartes.
 *
 * Les jeux ne donnent pas d'XP : l'XP reste au quiz et à la leçon terminée
 * (lib/progression.ts), pour qu'on ne puisse pas la gonfler en recliquant.
 * Les mélanges se font dans un useEffect : le serveur et le navigateur
 * doivent produire le même premier affichage (hydratation).
 */
"use client";

import { useEffect, useState, type ReactNode } from "react";

/* ------------------------------------------------------------------ */
/* Types des données d'un jeu                                           */
/* ------------------------------------------------------------------ */

interface JeuDevine { type: "devine"; question: string; reponse: string; indice?: string }
interface JeuChoix { type: "choix"; question: string; choix: string[]; bonne: number; explication?: string }
interface JeuVraiFaux { type: "vraifaux"; affirmation: string; vrai: boolean; explication?: string }
interface JeuOrdre { type: "ordre"; consigne: string; etapes: string[]; explication?: string }
interface JeuTrous { type: "trous"; consigne: string; code: string; choix: string[]; bonne: number; explication?: string }
interface JeuPaires { type: "paires"; consigne: string; paires: [string, string][] }
interface JeuCartes { type: "cartes"; titre?: string; cartes: { recto: string; verso: string }[] }

export type Jeu = JeuDevine | JeuChoix | JeuVraiFaux | JeuOrdre | JeuTrous | JeuPaires | JeuCartes;

/** Lit le JSON d'un bloc `jeu`. Renvoie null si le format n'est pas bon. */
export function lireJeu(brut: string): Jeu | null {
  try {
    const j = JSON.parse(brut) as Record<string, unknown>;
    const texte = (v: unknown) => typeof v === "string" && v.trim() !== "";
    const liste = (v: unknown) => Array.isArray(v) && v.length >= 2 && v.every(texte);
    const index = (v: unknown, n: number) => Number.isInteger(v) && (v as number) >= 0 && (v as number) < n;
    switch (j.type) {
      case "devine":
        return texte(j.question) && texte(j.reponse) ? (j as unknown as JeuDevine) : null;
      case "choix":
        return texte(j.question) && liste(j.choix) && index(j.bonne, (j.choix as string[]).length) ? (j as unknown as JeuChoix) : null;
      case "vraifaux":
        return texte(j.affirmation) && typeof j.vrai === "boolean" ? (j as unknown as JeuVraiFaux) : null;
      case "ordre":
        return texte(j.consigne) && liste(j.etapes) ? (j as unknown as JeuOrdre) : null;
      case "trous":
        return texte(j.consigne) && texte(j.code) && (j.code as string).includes("___") && liste(j.choix) && index(j.bonne, (j.choix as string[]).length)
          ? (j as unknown as JeuTrous)
          : null;
      case "paires":
        return texte(j.consigne) && Array.isArray(j.paires) && j.paires.length >= 2
          && j.paires.every((p) => Array.isArray(p) && p.length === 2 && texte(p[0]) && texte(p[1]))
          ? (j as unknown as JeuPaires)
          : null;
      case "cartes":
        return Array.isArray(j.cartes) && j.cartes.length >= 1
          && j.cartes.every((c) => c && texte((c as Record<string, unknown>).recto) && texte((c as Record<string, unknown>).verso))
          ? (j as unknown as JeuCartes)
          : null;
      default:
        return null;
    }
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------------ */
/* Briques communes                                                     */
/* ------------------------------------------------------------------ */

const ETIQUETTES: Record<Jeu["type"], string> = {
  devine: "Devine avant de lire",
  choix: "À toi",
  vraifaux: "Vrai ou faux ?",
  ordre: "Remets dans l'ordre",
  trous: "Complète le code",
  paires: "Associe",
  cartes: "Cartes mémoire",
};

function Cadre({ type, children }: { type: Jeu["type"]; children: ReactNode }) {
  return (
    <div className="not-prose anim-arrivee my-6 rounded-2xl border-2 border-cours-accent/30 bg-cours-accent/5 p-5">
      <p className="mb-3 text-xs font-bold uppercase tracking-wide text-cours-accent">
        {ETIQUETTES[type]}
      </p>
      {children}
    </div>
  );
}

function Retour({ juste, children }: { juste: boolean; children?: ReactNode }) {
  return (
    <div
      className={`anim-pop mt-4 rounded-xl border p-3 text-sm ${
        juste ? "border-emerald-300 bg-emerald-50 text-emerald-900" : "border-amber-300 bg-amber-50 text-amber-900"
      }`}
    >
      <p className="font-bold">{juste ? "Oui, c'est ça." : "Pas tout à fait."}</p>
      {children && <p className="mt-1">{children}</p>}
    </div>
  );
}

const BOUTON =
  "rounded-xl border border-cours-border bg-cours-surface px-4 py-2 text-left text-sm font-medium transition-colors hover:border-cours-accent";

/** Mélange stable une fois le composant monté (jamais au premier rendu). */
function useMelange<T>(elements: T[]): T[] {
  const [melange, setMelange] = useState(elements);
  useEffect(() => {
    const copie = [...elements];
    for (let i = copie.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copie[i]!, copie[j]!] = [copie[j]!, copie[i]!];
    }
    // Un mélange qui retombe sur l'ordre d'origine ne serait pas un jeu.
    if (copie.length > 1 && copie.every((e, i) => e === elements[i])) copie.reverse();
    setMelange(copie);
    // Les éléments viennent du Markdown : ils ne changent pas pendant la vie de la page.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return melange;
}

/* ------------------------------------------------------------------ */
/* Les sept jeux                                                        */
/* ------------------------------------------------------------------ */

function Devine({ jeu }: { jeu: JeuDevine }) {
  const [vu, setVu] = useState(false);
  const [indiceVu, setIndiceVu] = useState(false);
  return (
    <Cadre type="devine">
      <p className="font-semibold">{jeu.question}</p>
      {jeu.indice && indiceVu && !vu && (
        <p className="anim-arrivee mt-2 text-sm text-cours-text-muted">Indice : {jeu.indice}</p>
      )}
      {vu ? (
        <p className="anim-pop mt-3 rounded-xl border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-900">
          {jeu.reponse}
        </p>
      ) : (
        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" className={BOUTON} onClick={() => setVu(true)}>
            J'ai ma réponse en tête, montre
          </button>
          {jeu.indice && !indiceVu && (
            <button type="button" className={BOUTON} onClick={() => setIndiceVu(true)}>
              Un indice
            </button>
          )}
        </div>
      )}
    </Cadre>
  );
}

function Choix({ jeu }: { jeu: JeuChoix }) {
  const [clic, setClic] = useState<number | null>(null);
  return (
    <Cadre type="choix">
      <p className="mb-3 font-semibold">{jeu.question}</p>
      <div className="grid gap-2">
        {jeu.choix.map((c, i) => {
          const estClique = clic === i;
          const etat =
            clic === null ? "" : i === jeu.bonne ? "border-emerald-400 bg-emerald-50" : estClique ? "anim-secousse border-amber-400 bg-amber-50" : "opacity-60";
          return (
            <button key={i} type="button" disabled={clic !== null} className={`${BOUTON} ${etat}`} onClick={() => setClic(i)}>
              {c}
            </button>
          );
        })}
      </div>
      {clic !== null && <Retour juste={clic === jeu.bonne}>{jeu.explication}</Retour>}
    </Cadre>
  );
}

function VraiFaux({ jeu }: { jeu: JeuVraiFaux }) {
  const [clic, setClic] = useState<boolean | null>(null);
  return (
    <Cadre type="vraifaux">
      <p className="mb-3 font-semibold">{jeu.affirmation}</p>
      <div className="flex gap-2">
        {[true, false].map((v) => (
          <button
            key={String(v)}
            type="button"
            disabled={clic !== null}
            className={`${BOUTON} flex-1 text-center ${clic !== null && v === jeu.vrai ? "border-emerald-400 bg-emerald-50" : ""}`}
            onClick={() => setClic(v)}
          >
            {v ? "Vrai" : "Faux"}
          </button>
        ))}
      </div>
      {clic !== null && <Retour juste={clic === jeu.vrai}>{jeu.explication}</Retour>}
    </Cadre>
  );
}

function Ordre({ jeu }: { jeu: JeuOrdre }) {
  const melange = useMelange(jeu.etapes);
  const [choisies, setChoisies] = useState<string[]>([]);
  const restantes = melange.filter((e) => !choisies.includes(e));
  const fini = choisies.length === jeu.etapes.length;
  const juste = fini && choisies.every((e, i) => e === jeu.etapes[i]);
  return (
    <Cadre type="ordre">
      <p className="mb-3 font-semibold">{jeu.consigne}</p>
      {choisies.length > 0 && (
        <ol className="mb-3 grid gap-2">
          {choisies.map((e, i) => (
            <li
              key={e}
              className={`rounded-xl border px-4 py-2 text-sm ${
                fini ? (e === jeu.etapes[i] ? "border-emerald-400 bg-emerald-50" : "border-amber-400 bg-amber-50") : "border-cours-accent/40 bg-cours-surface"
              }`}
            >
              <span className="mr-2 font-bold text-cours-accent">{i + 1}.</span>
              {e}
            </li>
          ))}
        </ol>
      )}
      {!fini && (
        <>
          <p className="mb-2 text-xs text-cours-text-muted">Touche l'étape qui vient en {choisies.length === 0 ? "premier" : "suivant"} :</p>
          <div className="grid gap-2">
            {restantes.map((e) => (
              <button key={e} type="button" className={BOUTON} onClick={() => setChoisies((c) => [...c, e])}>
                {e}
              </button>
            ))}
          </div>
        </>
      )}
      {fini && <Retour juste={juste}>{jeu.explication}</Retour>}
      {choisies.length > 0 && (!fini || !juste) && (
        <button type="button" className="mt-3 text-xs font-semibold text-cours-accent underline" onClick={() => setChoisies([])}>
          Recommencer
        </button>
      )}
    </Cadre>
  );
}

function Trous({ jeu }: { jeu: JeuTrous }) {
  const [clic, setClic] = useState<number | null>(null);
  const [avant, apres] = jeu.code.split("___", 2);
  const juste = clic === jeu.bonne;
  return (
    <Cadre type="trous">
      <p className="mb-3 font-semibold">{jeu.consigne}</p>
      <pre className="mb-3 overflow-x-auto rounded-lg bg-[#1e1e2e] p-4 text-sm text-[#e6e6ef]">
        <code>
          {avant}
          <span className={`rounded px-2 py-0.5 font-bold ${clic === null ? "bg-amber-300 text-amber-950" : juste ? "bg-emerald-300 text-emerald-950" : "bg-amber-300 text-amber-950"}`}>
            {clic === null ? "  ?  " : jeu.choix[clic]}
          </span>
          {apres}
        </code>
      </pre>
      <div className="flex flex-wrap gap-2">
        {jeu.choix.map((c, i) => (
          <button
            key={i}
            type="button"
            className={`${BOUTON} font-mono ${clic !== null && i === jeu.bonne && juste ? "border-emerald-400 bg-emerald-50" : ""}`}
            disabled={juste}
            onClick={() => setClic(i)}
          >
            {c}
          </button>
        ))}
      </div>
      {clic !== null && <Retour juste={juste}>{juste ? jeu.explication : "Essaie un autre mot."}</Retour>}
    </Cadre>
  );
}

function Paires({ jeu }: { jeu: JeuPaires }) {
  const gauche = jeu.paires.map((p) => p[0]);
  const droite = useMelange(jeu.paires.map((p) => p[1]));
  const [selection, setSelection] = useState<string | null>(null);
  const [trouvees, setTrouvees] = useState<string[]>([]);
  const [rate, setRate] = useState<string | null>(null);
  const fini = trouvees.length === jeu.paires.length;

  function choisirDroite(d: string) {
    if (selection === null) return;
    const attendu = jeu.paires.find((p) => p[0] === selection)?.[1];
    if (attendu === d) {
      setTrouvees((t) => [...t, selection]);
      setRate(null);
    } else {
      setRate(d);
    }
    setSelection(null);
  }

  return (
    <Cadre type="paires">
      <p className="mb-1 font-semibold">{jeu.consigne}</p>
      <p className="mb-3 text-xs text-cours-text-muted">Touche un mot à gauche, puis sa définition à droite.</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="grid content-start gap-2">
          {gauche.map((g) => {
            const ok = trouvees.includes(g);
            return (
              <button
                key={g}
                type="button"
                disabled={ok}
                className={`${BOUTON} font-semibold ${ok ? "border-emerald-400 bg-emerald-50" : selection === g ? "border-cours-accent bg-cours-accent/10" : ""}`}
                onClick={() => setSelection(g)}
              >
                {g}
              </button>
            );
          })}
        </div>
        <div className="grid content-start gap-2">
          {droite.map((d) => {
            const ok = jeu.paires.some((p) => p[1] === d && trouvees.includes(p[0]));
            return (
              <button
                key={d}
                type="button"
                disabled={ok || selection === null}
                className={`${BOUTON} ${ok ? "border-emerald-400 bg-emerald-50" : rate === d ? "anim-secousse border-amber-400 bg-amber-50" : ""}`}
                onClick={() => choisirDroite(d)}
              >
                {d}
              </button>
            );
          })}
        </div>
      </div>
      {fini && <Retour juste>Toutes les paires sont trouvées.</Retour>}
    </Cadre>
  );
}

function Cartes({ jeu }: { jeu: JeuCartes }) {
  const [index, setIndex] = useState(0);
  const [retournee, setRetournee] = useState(false);
  const carte = jeu.cartes[index]!;
  const aller = (delta: number) => {
    setIndex((i) => (i + delta + jeu.cartes.length) % jeu.cartes.length);
    setRetournee(false);
  };
  return (
    <Cadre type="cartes">
      {jeu.titre && <p className="mb-3 font-semibold">{jeu.titre}</p>}
      <button
        type="button"
        onClick={() => setRetournee((r) => !r)}
        className={`flex min-h-[7rem] w-full items-center justify-center rounded-xl border-2 p-5 text-center transition-colors ${
          retournee ? "border-emerald-300 bg-emerald-50 text-emerald-900" : "border-cours-border bg-cours-surface font-semibold"
        }`}
      >
        <span key={`${index}-${retournee}`} className="anim-pop">
          {retournee ? carte.verso : carte.recto}
        </span>
      </button>
      <div className="mt-3 flex items-center justify-between text-xs text-cours-text-muted">
        <button type="button" className="font-semibold text-cours-accent" onClick={() => aller(-1)}>
          ← Précédente
        </button>
        <span>
          {index + 1}/{jeu.cartes.length} · touche la carte pour la retourner
        </span>
        <button type="button" className="font-semibold text-cours-accent" onClick={() => aller(1)}>
          Suivante →
        </button>
      </div>
    </Cadre>
  );
}

export default function JeuLecon({ jeu }: { jeu: Jeu }) {
  switch (jeu.type) {
    case "devine": return <Devine jeu={jeu} />;
    case "choix": return <Choix jeu={jeu} />;
    case "vraifaux": return <VraiFaux jeu={jeu} />;
    case "ordre": return <Ordre jeu={jeu} />;
    case "trous": return <Trous jeu={jeu} />;
    case "paires": return <Paires jeu={jeu} />;
    case "cartes": return <Cartes jeu={jeu} />;
  }
}
