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
 * - Tailles en min(vw, vh) : lisible à 4 mètres, et rien ne déborde si la
 *   fenêtre est plus large que haute (PC portable, navigateur pas en plein écran).
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
    <div className="flex h-[100dvh] w-full cursor-none flex-col overflow-hidden bg-[#14243F] text-white select-none">
      <header className="flex items-center justify-between px-[3vw] pt-[2vh] text-[length:min(1.6vw,2.56vh)] font-semibold text-white/60">
        <span>{etat.titre}</span>
        <span>
          {r ? `G${r.numero}${r.heure ? ` · ${r.heure.replace(":", "h")}` : ""}` : ""}
          {etat.totalJour > 0 && ` · ${etat.totalJour} ${etat.unite} ce matin`}
          {hors >= 3 && <span className="ml-3 text-amber-300">reconnexion…</span>}
        </span>
      </header>

      <main className="flex min-h-0 flex-1 items-center justify-center px-[3vw] pb-[3vh]">
        {/* [17/11/2026] Manche de découverte : le chrono passe en haut et les
            consignes restent à l'écran (étapes + manette), c'est le moment où
            les joueurs en ont besoin. Manche comptée : le chrono et le score
            en grand, avec un rappel des boutons en une ligne. */}
        {vue.type === "MANCHE" && r && vue.phase === "ESSAI" && (
          <MancheDecouverte resteMs={vue.resteMs} />
        )}
        {vue.type === "MANCHE" && r && vue.phase === "COMPTEE" && (
          <div className="flex w-full flex-col items-center">
            <p className="text-[length:min(3vw,4.8vh)] font-black uppercase tracking-widest text-white/80">
              Manche comptée · G{r.numero}
            </p>
            <p className="font-titre text-[18vh] font-black leading-none tabular-nums">{formaterChrono(vue.resteMs)}</p>
            <Duel rouge={r.rouge} bleu={r.bleu} unite={etat.unite} taille="moyen" />
            <RappelBoutons />
          </div>
        )}

        {vue.type === "RESULTAT" && r && <Resultat numero={r.numero} rouge={r.rouge} bleu={r.bleu} unite={etat.unite} />}

        {vue.type === "ALTERNANCE" && <PanneauAlterne panneau={vue.panneau} etat={etat} />}
      </main>
    </div>
  );
}

function MancheDecouverte({ resteMs }: { resteMs: number }) {
  return (
    <div className="flex h-full w-full flex-col">
      <div className="flex items-center justify-between">
        <p className="text-[length:min(2.6vw,4.2vh)] font-black uppercase tracking-widest text-white/80">
          Manche de découverte · sans score
        </p>
        <p className="font-titre text-[length:min(9vw,15vh)] font-black leading-none tabular-nums">{formaterChrono(resteMs)}</p>
      </div>
      <div className="mt-[2vh] grid flex-1 grid-cols-2 gap-[3vw]">
        <ol className="flex flex-col justify-center gap-[2vh]">
          {COMMENT_ON_JOUE.etapes.map((e, i) => (
            <li key={e.mot} className="flex items-center gap-[1.5vw] rounded-[1.5vw] bg-white/10 px-[1.5vw] py-[1.6vh]">
              <span className="flex h-[min(4.4vw,7vh)] w-[min(4.4vw,7vh)] shrink-0 items-center justify-center rounded-full bg-[#F08A24] text-[length:min(2.6vw,4.2vh)] font-black">{i + 1}</span>
              <span>
                <span className="block text-[length:min(3vw,4.8vh)] font-black leading-none">{e.mot}</span>
                <span className="block text-[length:min(1.8vw,2.9vh)] text-white/80">{e.detail}</span>
              </span>
            </li>
          ))}
        </ol>
        <div className="flex flex-col justify-center">
          <div className="mx-auto w-[85%]"><JoyCon /></div>
          <ul className="mt-[1.5vh] space-y-[1vh]">
            {MANETTE.commandes.map((c) => (
              <li key={c.action} className="flex items-center gap-[1vw]">
                <span className="h-[min(2.4vw,3.8vh)] w-[min(2.4vw,3.8vh)] shrink-0 rounded-full" style={{ backgroundColor: c.couleur, border: "0.2vw solid #fff" }} />
                <span className="text-[length:min(2.2vw,3.5vh)] font-black uppercase leading-none">
                  {c.action}<span className="font-semibold normal-case text-white/60"> · {c.ou}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className="mt-[2vh] rounded-[1.5vw] bg-[#F08A24] py-[1.4vh] text-center">
        <span className="text-[length:min(3vw,4.8vh)] font-black">{COMMENT_ON_JOUE.regleOr}</span>{" "}
        <span className="text-[length:min(2vw,3.2vh)] font-bold">{COMMENT_ON_JOUE.regleOrDetail}</span>
      </div>
    </div>
  );
}

/** Rappel sous le score de la manche comptée : le DESSIN de la manette
 *  (les vrais boutons ne sont pas colorés, c'est leur POSITION qui compte)
 *  et, à côté, chaque action avec sa couleur et sa position. */
function RappelBoutons() {
  return (
    <div className="mt-[2vh] flex items-center justify-center gap-[2.5vw]">
      <div className="w-[min(17vw,27vh)] shrink-0"><JoyCon /></div>
      <ul className="grid grid-cols-2 gap-x-[2.5vw] gap-y-[1vh]">
        {MANETTE.commandes.map((c) => (
          <li key={c.action} className="flex items-center gap-[0.8vw] text-[length:min(2vw,3.2vh)] font-bold text-white/90">
            <span className="h-[min(2.2vw,3.5vh)] w-[min(2.2vw,3.5vh)] shrink-0 rounded-full" style={{ backgroundColor: c.couleur, border: "0.15vw solid #fff" }} />
            <span>
              <span className="uppercase">{c.action}</span>
              <span className="text-white/60"> · {c.ou}</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Duel({ rouge, bleu, unite, taille }: { rouge: number; bleu: number; unite: string; taille: "moyen" | "grand" }) {
  const chiffre = taille === "grand" ? "text-[24vh]" : "text-[13vh]";
  return (
    <div className="mt-[1vh] grid w-full grid-cols-2 gap-[3vw]">
      {[
        { nom: "Rouge", score: rouge, couleur: ROUGE, console: "Console 1" },
        { nom: "Bleu", score: bleu, couleur: BLEU, console: "Console 2" },
      ].map((c) => (
        <div key={c.nom} className="rounded-[2vw] py-[2vh] text-center" style={{ backgroundColor: `${c.couleur}26`, border: `0.4vw solid ${c.couleur}` }}>
          <p className="text-[length:min(3vw,4.8vh)] font-black uppercase" style={{ color: c.couleur }}>
            {c.nom} <span className="text-[length:min(1.6vw,2.56vh)] font-semibold text-white/60">{c.console}</span>
          </p>
          <p className={`font-titre ${chiffre} font-black leading-none tabular-nums`}>{c.score}</p>
          <p className="text-[length:min(1.8vw,2.88vh)] text-white/70">{unite}</p>
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
      <p className="text-[length:min(2.6vw,4.16vh)] font-bold uppercase tracking-widest text-white/70">Résultat G{numero}</p>
      <p className="mb-[2vh] text-[length:min(6vw,9.6vh)] font-black leading-tight" style={{ color: couleur }}>{titre}</p>
      <Duel rouge={rouge} bleu={bleu} unite={unite} taille="grand" />
      <p className="mt-[3vh] text-center text-[length:min(3vw,4.8vh)] font-bold text-white/90">
        Qu&apos;est-ce qui a marché dans votre organisation ?
      </p>
    </div>
  );
}

function PanneauAlterne({ panneau, etat }: { panneau: Panneau; etat: EtatEcran }) {
  if (panneau === "COMMENT") {
    return (
      <div className="w-full text-center">
        <h1 className="mb-[4vh] text-[length:min(5vw,8vh)] font-black">{COMMENT_ON_JOUE.titre}</h1>
        <ol className="grid grid-cols-3 gap-[3vw]">
          {COMMENT_ON_JOUE.etapes.map((e, i) => (
            <li key={e.mot} className="rounded-[2vw] bg-white/10 px-[1.5vw] py-[4vh]">
              <p className="mx-auto mb-[1.5vh] flex h-[min(6vw,10vh)] w-[min(6vw,10vh)] items-center justify-center rounded-full bg-[#F08A24] text-[length:min(3.4vw,5.4vh)] font-black">{i + 1}</p>
              <p className="text-[length:min(4.2vw,6.72vh)] font-black leading-tight">{e.mot}</p>
              <p className="mt-[1vh] text-[length:min(2vw,3.2vh)] text-white/80">{e.detail}</p>
            </li>
          ))}
        </ol>
        <div className="mt-[4vh] rounded-[2vw] bg-[#F08A24] px-[2vw] py-[2.5vh]">
          <p className="text-[length:min(4.4vw,7vh)] font-black leading-none">{COMMENT_ON_JOUE.regleOr}</p>
          <p className="mt-[1vh] text-[length:min(2.4vw,3.84vh)] font-bold">{COMMENT_ON_JOUE.regleOrDetail}</p>
        </div>
        <p className="mt-[2vh] text-[length:min(2vw,3.2vh)] text-white/75">{COMMENT_ON_JOUE.chef}</p>
      </div>
    );
  }

  if (panneau === "MANETTE") {
    return (
      <div className="grid w-full grid-cols-[1.1fr_1fr] items-center gap-[4vw]">
        <JoyCon />
        <div>
          <h1 className="text-[length:min(5vw,8vh)] font-black leading-none">{MANETTE.titre}</h1>
          <p className="mb-[4vh] text-[length:min(2.2vw,3.52vh)] text-white/70">{MANETTE.sousTitre}</p>
          <ul className="space-y-[2.5vh]">
            {MANETTE.commandes.map((c) => (
              <li key={c.action} className="flex items-center gap-[1.5vw] leading-tight">
                <span className="h-[min(3.4vw,5.4vh)] w-[min(3.4vw,5.4vh)] shrink-0 rounded-full" style={{ backgroundColor: c.couleur, border: "0.25vw solid #fff" }} />
                <span>
                  <span className="block text-[length:min(3vw,4.8vh)] font-black uppercase">{c.action}</span>
                  <span className="block text-[length:min(1.9vw,3vh)] text-white/80">{c.detail}</span>
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-[3vh] text-[length:min(1.7vw,2.7vh)] text-white/60">{MANETTE.inutile}</p>
        </div>
      </div>
    );
  }

  // CLASSEMENT
  return (
    <div className="w-full">
      <div className="mb-[3vh] flex items-end justify-between">
        <h1 className="text-[length:min(5vw,8vh)] font-black leading-none">Le classement du jour</h1>
        {etat.record && (
          <p className="text-right text-[length:min(2.4vw,3.84vh)] font-bold text-[#F5A04A]">
            Record : {etat.record.score} {etat.unite}
            <span className="block text-[length:min(1.8vw,2.88vh)] text-white/80">{etat.record.equipes.join(", ")}</span>
          </p>
        )}
      </div>
      {etat.classement.length === 0 ? (
        <p className="py-[10vh] text-center text-[length:min(3.5vw,5.6vh)] font-bold text-white/70">
          Le premier groupe va ouvrir le classement !
        </p>
      ) : (
        <ol className="grid grid-flow-col grid-cols-2 grid-rows-5 gap-x-[3vw] gap-y-[1.6vh]">
          {etat.classement.map((l) => (
            <li
              key={l.nom}
              className="flex items-center justify-between rounded-[1vw] px-[1.5vw] py-[1vh] text-[length:min(2.8vw,4.48vh)] font-black"
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

/** Joy-Con tenu à plat, comme sur le kit imprimé : stick à gauche, quatre
 *  boutons en losange à droite, aux couleurs de defi-config.ts (gris = inutile). */
function JoyCon() {
  const couleurDe = (position: string) => MANETTE.commandes.find((c) => c.position === position)?.couleur ?? "#7A7A7A";
  const boutons = [
    { pos: "Haut", cx: 330, cy: 78 },
    { pos: "Bas", cx: 330, cy: 182 },
    { pos: "Gauche", cx: 278, cy: 130 },
    { pos: "Droite", cx: 382, cy: 130 },
  ];
  return (
    <svg viewBox="0 0 440 260" className="w-full" role="img" aria-label="Joy-Con tenu à l'horizontale">
      <rect x="10" y="10" width="420" height="240" rx="120" fill="#3A3D45" stroke="#1E1F24" strokeWidth="6" />
      <circle cx="120" cy="130" r="58" fill="#1F3B63" />
      <circle cx="120" cy="130" r="36" fill="#6B7684" />
      {boutons.map((b) => (
        <circle key={b.pos} cx={b.cx} cy={b.cy} r="25" fill={couleurDe(b.pos)} stroke="#fff" strokeWidth="3" />
      ))}
    </svg>
  );
}
