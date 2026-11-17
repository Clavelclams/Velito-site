"use client";

/**
 * Saisie du score d'une équipe, pensée pour une main sur un téléphone
 * (17/11/2026) : un gros « + » (le geste le plus fréquent), un « − » pour
 * l'erreur, et une saisie directe du nombre.
 *
 * Le chiffre change TOUT DE SUITE à l'écran (optimiste), puis le serveur
 * confirme. Si plusieurs appuis sont en route, on attend la dernière réponse
 * avant de recaler le chiffre, sinon une vieille réponse ferait reculer le
 * compteur. Si le serveur refuse, on affiche l'erreur et la vraie valeur.
 */
import { useEffect, useRef, useState } from "react";
import { ajusterScore, fixerScore } from "@/lib/arena/actions-defi";
import { formaterChrono } from "@/lib/arena/defi";

export function ScoreEquipe({ equipeId, nom, couleur, initial }: { equipeId: string; nom: string; couleur: string; initial: number }) {
  const [score, setScore] = useState(initial);
  const [erreur, setErreur] = useState<string | null>(null);
  const enCours = useRef(0);

  const envoyer = async (appel: () => Promise<{ score?: number; erreur?: string }>) => {
    enCours.current += 1;
    const r = await appel();
    enCours.current -= 1;
    if (r.erreur) setErreur(r.erreur);
    else setErreur(null);
    if (enCours.current === 0 && typeof r.score === "number") setScore(r.score);
  };

  const ajuster = (delta: number) => {
    setScore((s) => Math.max(0, Math.min(999, s + delta)));
    void envoyer(() => ajusterScore(equipeId, delta));
  };

  return (
    <div className="rounded-xl border-2 p-3" style={{ borderColor: couleur }}>
      <p className="mb-2 text-center text-sm font-black uppercase" style={{ color: couleur }}>{nom}</p>
      <form
        className="mb-2 flex items-center justify-center gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          const v = Number(new FormData(e.currentTarget).get("valeur"));
          if (!Number.isInteger(v) || v < 0 || v > 999) {
            setErreur("Un nombre entier de 0 à 999.");
            return;
          }
          setScore(v);
          void envoyer(() => fixerScore(equipeId, v));
        }}
      >
        <input
          key={score}
          name="valeur"
          type="number"
          inputMode="numeric"
          min={0}
          max={999}
          defaultValue={score}
          aria-label={`Score ${nom}`}
          className="w-24 rounded-lg border border-arena-border bg-arena-bg py-2 text-center font-titre text-4xl font-black tabular-nums"
        />
        <button className="min-h-[44px] rounded-lg border border-arena-border px-3 text-xs font-semibold text-arena-muted">OK</button>
      </form>
      <div className="grid grid-cols-[1fr_2fr] gap-2">
        <button
          type="button"
          onClick={() => ajuster(-1)}
          className="min-h-[72px] rounded-xl bg-arena-surface-fort text-4xl font-black text-arena-ink active:scale-95"
          aria-label={`Retirer un point à ${nom}`}
        >
          −
        </button>
        <button
          type="button"
          onClick={() => ajuster(1)}
          className="min-h-[72px] rounded-xl text-5xl font-black text-white active:scale-95"
          style={{ backgroundColor: couleur }}
          aria-label={`Ajouter un point à ${nom}`}
        >
          +
        </button>
      </div>
      {erreur && <p role="alert" className="mt-2 text-center text-xs font-semibold text-arena-red">{erreur}</p>}
    </div>
  );
}

/** Le chrono vu par le staff, recalé sur l'heure du serveur. */
export function ChronoStaff({ chronoFin, phase, serveurMs }: { chronoFin: string | null; phase: string | null; serveurMs: number }) {
  const decalage = useRef(serveurMs - Date.now());
  const [maintenant, setMaintenant] = useState(() => Date.now() + decalage.current);
  useEffect(() => {
    const id = setInterval(() => setMaintenant(Date.now() + decalage.current), 250);
    return () => clearInterval(id);
  }, []);
  const reste = chronoFin ? Date.parse(chronoFin) - maintenant : 0;
  if (!chronoFin || reste <= 0) {
    return <p className="text-center text-sm text-arena-faint">{phase ? `Manche ${phase === "ESSAI" ? "d'essai" : "comptée"} terminée` : "Pas de manche lancée"}</p>;
  }
  return (
    <p className="text-center">
      <span className="block text-xs font-bold uppercase tracking-widest text-arena-violet">
        {phase === "ESSAI" ? "Manche d'essai" : "Manche comptée"}
      </span>
      <span className="font-titre text-6xl font-black tabular-nums">{formaterChrono(reste)}</span>
    </p>
  );
}
