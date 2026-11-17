"use client";

/**
 * L'écran du défi (17/11/2026). Tourne seul toute la matinée : aucune action
 * demandée, il relit l'état toutes les 3 s et se remet seul d'une coupure.
 *
 * - Horloge : le compte à rebours suit l'heure du SERVEUR (décalage mesuré à
 *   chaque relecture), pas celle du PC, qui peut avoir une minute d'écart.
 * - Veille : on demande au navigateur de garder l'écran allumé (Wake Lock),
 *   redemandé quand l'onglet redevient visible. Si le navigateur refuse, rien
 *   ne casse : il faut alors couper la veille du PC (checklist).
 * - Tailles en vw/vh : lisible à 4 mètres quel que soit l'écran.
 */
import { useEffect, useRef, useState } from "react";
import { formaterChrono, vueEcran, type Panneau } from "@/lib/arena/defi";
import { COMMENT_ON_JOUE, MANETTE } from "@/lib/arena/defi-config";
import type { EtatEcran } from "@/lib/arena/defi-ecran";

const ROUGE = "#F0464F";
const BLEU = "#3D8BFF";
const RELECTURE_MS = 3000;

export default function Ecran({ token, initial }: { token: string; initial: EtatEcran }) {
  const [etat, setEtat] = useState(initial);
  const [hors, setHors] = useState(0);
  const decalage = useRef(initial.serveurMs - Date.now());
  const [maintenant, setMaintenant] = useState(() => Date.now() + decalage.current);

  // Relecture de l'état.
  useEffect(() => {
    let actif = true;
    const lire = async () => {
      try {
        const r = await fetch(`/t/${token}/ecran/etat`, { cache: "no-store" });
        if (!r.ok) throw new Error(String(r.status));
        const e = (await r.json()) as EtatEcran;
        if (!actif) return;
        decalage.current = e.serveurMs - Date.now();
        setEtat(e);
        setHors(0);
      } catch {
        if (actif) setHors((n) => n + 1);
      }
    };
    const id = setInterval(lire, RELECTURE_MS);
    return () => {
      actif = false;
      clearInterval(id);
    };
  }, [token]);

  // Horloge locale (4 fois par seconde) pour le compte à rebours.
  useEffect(() => {
    const id = setInterval(() => setMaintenant(Date.now() + decalage.current), 250);
    return () => clearInterval(id);
  }, []);

  // Garder l'écran allumé.
  useEffect(() => {
    type Verrou = { release: () => Promise<void> };
    let verrou: Verrou | null = null;
    const demander = async () => {
      try {
        const nav = navigator as Navigator & { wakeLock?: { request: (t: "screen") => Promise<Verrou> } };
        if (nav.wakeLock && document.visibilityState === "visible") verrou = await nav.wakeLock.request("screen");
      } catch {
        /* refusé : la checklist dit de couper la veille du PC */
      }
    };
    void demander();
    const surVisible = () => void demander();
    document.addEventListener("visibilitychange", surVisible);
    return () => {
      document.removeEventListener("visibilitychange", surVisible);
      void verrou?.release().catch(() => {});
    };
  }, []);

  const vue = vueEcran(etat.rotation, maintenant);
  const r = etat.rotation;

  return (
    <div className="flex h-[100dvh] w-full cursor-none flex-col overflow-hidden bg-[#140E2A] text-white select-none">
      <header className="flex items-center justify-between px-[3vw] pt-[2vh] text-[1.6vw] font-semibold text-white/60">
        <span>{etat.titre}</span>
        <span>
          {r ? `G${r.numero}${r.heure ? ` · ${r.heure.replace(":", "h")}` : ""}` : ""}
          {etat.totalJour > 0 && ` · ${etat.totalJour} ${etat.unite} ce matin`}
          {hors >= 3 && <span className="ml-3 text-amber-300">reconnexion…</span>}
        </span>
      </header>

      <main className="flex flex-1 items-center justify-center px-[3vw] pb-[3vh]">
        {vue.type === "MANCHE" && r && (
          <div className="flex w-full flex-col items-center">
            <p className="text-[3vw] font-black uppercase tracking-widest text-white/80">
              {vue.phase === "ESSAI" ? "Manche d'essai · sans score" : `Manche comptée · G${r.numero}`}
            </p>
            <p className="font-titre text-[26vh] font-black leading-none tabular-nums">{formaterChrono(vue.resteMs)}</p>
            {vue.phase === "COMPTEE" ? (
              <Duel rouge={r.rouge} bleu={r.bleu} unite={etat.unite} taille="moyen" />
            ) : (
              <p className="mt-[2vh] text-[3vw] font-bold text-white/80">{COMMENT_ON_JOUE.regleOr}</p>
            )}
          </div>
        )}

        {vue.type === "RESULTAT" && r && <Resultat numero={r.numero} rouge={r.rouge} bleu={r.bleu} unite={etat.unite} />}

        {vue.type === "ALTERNANCE" && <PanneauAlterne panneau={vue.panneau} etat={etat} />}
      </main>
    </div>
  );
}

function Duel({ rouge, bleu, unite, taille }: { rouge: number; bleu: number; unite: string; taille: "moyen" | "grand" }) {
  const chiffre = taille === "grand" ? "text-[24vh]" : "text-[16vh]";
  return (
    <div className="mt-[1vh] grid w-full grid-cols-2 gap-[3vw]">
      {[
        { nom: "Rouge", score: rouge, couleur: ROUGE, console: "Console 1" },
        { nom: "Bleu", score: bleu, couleur: BLEU, console: "Console 2" },
      ].map((c) => (
        <div key={c.nom} className="rounded-[2vw] py-[2vh] text-center" style={{ backgroundColor: `${c.couleur}26`, border: `0.4vw solid ${c.couleur}` }}>
          <p className="text-[3vw] font-black uppercase" style={{ color: c.couleur }}>
            {c.nom} <span className="text-[1.6vw] font-semibold text-white/60">{c.console}</span>
          </p>
          <p className={`font-titre ${chiffre} font-black leading-none tabular-nums`}>{c.score}</p>
          <p className="text-[1.8vw] text-white/70">{unite}</p>
        </div>
      ))}
    </div>
  );
}

function Resultat({ numero, rouge, bleu, unite }: { numero: number; rouge: number; bleu: number; unite: string }) {
  const titre =
    rouge === bleu ? "Égalité !" : rouge > bleu ? "Victoire de l'équipe Rouge !" : "Victoire de l'équipe Bleue !";
  const couleur = rouge === bleu ? "#FFFFFF" : rouge > bleu ? ROUGE : BLEU;
  return (
    <div className="flex w-full flex-col items-center">
      <p className="text-[2.6vw] font-bold uppercase tracking-widest text-white/70">Résultat G{numero}</p>
      <p className="mb-[2vh] text-[6vw] font-black leading-tight" style={{ color: couleur }}>{titre}</p>
      <Duel rouge={rouge} bleu={bleu} unite={unite} taille="grand" />
      <p className="mt-[3vh] text-center text-[3vw] font-bold text-white/90">
        Qu&apos;est-ce qui a marché dans votre organisation ?
      </p>
    </div>
  );
}

function PanneauAlterne({ panneau, etat }: { panneau: Panneau; etat: EtatEcran }) {
  if (panneau === "COMMENT") {
    return (
      <div className="w-full text-center">
        <h1 className="mb-[4vh] text-[5vw] font-black">{COMMENT_ON_JOUE.titre}</h1>
        <ol className="grid grid-cols-3 gap-[3vw]">
          {COMMENT_ON_JOUE.etapes.map((e, i) => (
            <li key={e.mot} className="rounded-[2vw] bg-white/10 px-[1.5vw] py-[4vh]">
              <p className="text-[4vw] font-black text-amber-300">{i + 1}</p>
              <p className="text-[4.2vw] font-black leading-tight">{e.mot}</p>
              <p className="mt-[1vh] text-[2vw] text-white/80">{e.detail}</p>
            </li>
          ))}
        </ol>
        <p className="mt-[5vh] text-[3.6vw] font-black text-amber-300">{COMMENT_ON_JOUE.regleOr}</p>
        <p className="mt-[2vh] text-[2vw] text-white/75">{COMMENT_ON_JOUE.chef}</p>
      </div>
    );
  }

  if (panneau === "MANETTE") {
    return (
      <div className="grid w-full grid-cols-[1.1fr_1fr] items-center gap-[4vw]">
        <JoyCon />
        <div>
          <h1 className="text-[5vw] font-black leading-none">{MANETTE.titre}</h1>
          <p className="mb-[4vh] text-[2.2vw] text-white/70">{MANETTE.sousTitre}</p>
          <ul className="space-y-[2.5vh]">
            {MANETTE.commandes.map((c) => (
              <li key={c.action} className="text-[3vw] leading-tight">
                <span className="font-black">{c.action}</span>
                <span className="block text-[2.2vw] text-amber-300">{c.position}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    );
  }

  // CLASSEMENT
  return (
    <div className="w-full">
      <div className="mb-[3vh] flex items-end justify-between">
        <h1 className="text-[5vw] font-black leading-none">Le classement du jour</h1>
        {etat.record && (
          <p className="text-right text-[2.4vw] font-bold text-amber-300">
            Record : {etat.record.score} {etat.unite}
            <span className="block text-[1.8vw] text-white/80">{etat.record.equipes.join(", ")}</span>
          </p>
        )}
      </div>
      {etat.classement.length === 0 ? (
        <p className="py-[10vh] text-center text-[3.5vw] font-bold text-white/70">
          Le premier groupe va ouvrir le classement !
        </p>
      ) : (
        <ol className="grid grid-flow-col grid-cols-2 grid-rows-5 gap-x-[3vw] gap-y-[1.6vh]">
          {etat.classement.map((l) => (
            <li
              key={l.nom}
              className="flex items-center justify-between rounded-[1vw] px-[1.5vw] py-[1vh] text-[2.8vw] font-black"
              style={{ backgroundColor: `${l.couleur === "ROUGE" ? ROUGE : BLEU}33`, borderLeft: `0.6vw solid ${l.couleur === "ROUGE" ? ROUGE : BLEU}` }}
            >
              <span>
                <span className="mr-[1vw] text-white/60">{l.rang}.</span>
                {l.nom}
              </span>
              <span className="tabular-nums">{l.score}</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

/** Joy-Con tenu à plat : stick à gauche, quatre boutons en losange à droite.
 *  Les boutons utilisés sont en couleur, avec leur rôle (defi-config.ts). */
function JoyCon() {
  const role = (position: string) => MANETTE.commandes.find((c) => c.bouton === position)?.action ?? null;
  const boutons = [
    { pos: "Haut", cx: 300, cy: 70 },
    { pos: "Bas", cx: 300, cy: 190 },
    { pos: "Gauche", cx: 240, cy: 130 },
    { pos: "Droite", cx: 360, cy: 130 },
  ];
  return (
    <svg viewBox="0 0 440 260" className="w-full" role="img" aria-label="Joy-Con tenu à l'horizontale">
      <rect x="10" y="10" width="420" height="240" rx="110" fill="#E8465A" />
      <circle cx="120" cy="130" r="52" fill="#1C1C22" />
      <circle cx="120" cy="130" r="30" fill="#33333D" />
      <text x="120" y="226" textAnchor="middle" fontSize="22" fontWeight="800" fill="#fff">Se déplacer</text>
      {boutons.map((b) => {
        const r = role(b.pos);
        return (
          <g key={b.pos}>
            <circle cx={b.cx} cy={b.cy} r="30" fill={r ? "#FFD23F" : "#1C1C22"} stroke="#fff" strokeWidth={r ? 4 : 0} />
          </g>
        );
      })}
    </svg>
  );
}
