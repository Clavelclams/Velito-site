/**
 * ProgressionDashboard — Composant client pour la section "Ta progression" de /profil.
 *
 * Architecture :
 *   - Dropdown saison cliquable (rouge VEA, defaut "2026/27")
 *   - Quand saison change, les 4 cards mettent a jour leurs valeurs :
 *       1. Events participes
 *       2. Heures benevolat
 *       3. Niveau VEA (gamification basique : events*5 + heures*0.5)
 *       4. Niveau Arena (= niveau VEA aujourd'hui, evoluera plus vite quand Arena actif)
 *   - Sous les cards : liste des events marquants de la saison selectionnee
 *
 * Pourquoi Client Component :
 *   - useState pour la saison selectionnee
 *   - Interactivite du dropdown
 *   - Recalcul instantane des cards et liste en local (pas de roundtrip serveur)
 *
 * Source events : lib/events-historique.ts (hardcode pour V1).
 * V2 : remplacer par fetch vea.evenements quand Chantier 2.3 (admin events) sera fait.
 */
"use client";

import { useState } from "react";
import { getArenaUrl } from "@/lib/hub-url";
import {
  OLD_VEA_EVENTS,
  EVENTS_2026_2027,
  CATEGORY_COLORS,
  CATEGORY_LABELS,
  type HistoriqueEvent,
} from "@/lib/events-historique";
import { computeLevel } from "@/lib/gamification";

type SaisonKey = "2026/27" | "old";

interface ProgressionDashboardProps {
  /** Total events Old VEA (avant saison 2026/2027) */
  eventsOld: number;
  /** Total events saison 2026/2027 en cours */
  eventsCurrent: number;
  /** Heures benevolat saison 2026/2027 (sept 2026 -> juillet 2027) */
  heuresBenevolatCurrent: number;
  /** Heures benevolat Old VEA (= benevole_hours total - heuresBenevolatCurrent) */
  heuresBenevolatOld: number;
  /** XP cumulés de la saison actuelle 2026/27 (vea.participants.xp_saison_actuelle).
   *  Source de verite du niveau via computeLevel(). */
  xpCurrent: number;
  /** [12/11/2026] Vrai résumé ARENA du compte (arena.mon_resume), null si
   *  le compte n'a pas encore de profil joueur relié. */
  arena: ResumeArena | null;
}

export interface ResumeArena {
  pseudo: string;
  profil_public: boolean;
  tournois: number;
  matchs: number;
  victoires: number;
  titres: number;
}

/**
 * Calcul du niveau RETROACTIF pour Old VEA (avant systeme XP).
 *
 * Pas d'XP historises avant la migration de mai 2026, donc on utilise une
 * formule estimative : score = events*5 + heures*0.5. C'est une approximation
 * pour donner un niveau de reconnaissance aux anciens, mais pas la vraie
 * formule XP utilisee maintenant (qui est computeLevel(xp_saison_actuelle)).
 *
 * Pour la saison 2026/27 et apres -> TOUJOURS utiliser computeLevel(xp).
 */
function computeNiveauOldEstime(events: number, heures: number): number {
  const score = events * 5 + heures * 0.5;
  return Math.floor(score / 100) + 1;
}

/**
 * Carte ARENA [12/11/2026] : remplace l'ancienne « Niveau Arena » qui
 * recopiait le niveau VEA (chiffre qui ne correspondait à rien). Elle montre
 * maintenant les VRAIS résultats Arena du compte, tous tournois confondus
 * (pas par saison : ARENA ne découpe pas encore en saisons, on le dit).
 */
function ArenaCard({ arena }: { arena: ResumeArena | null }) {
  const lienBase = getArenaUrl();
  return (
    <div className="card-clean p-6 text-center relative overflow-hidden">
      <span className="absolute top-2 right-2 text-[8px] uppercase tracking-widest bg-vea-accent-soft border border-vea-accent/20 text-vea-accent px-1.5 py-0.5 rounded font-bold">
        Arena
      </span>
      {arena ? (
        <>
          <p className="text-3xl font-black text-vea-accent leading-none mb-2">
            {arena.tournois}
          </p>
          <p className="text-xs text-vea-text-dim uppercase tracking-wider font-medium">
            Tournois Arena
          </p>
          <p className="text-[10px] text-vea-text-dim mt-1 leading-tight">
            {arena.victoires} victoire{arena.victoires > 1 ? "s" : ""} sur {arena.matchs} match
            {arena.matchs > 1 ? "s" : ""}
            {arena.titres > 0 ? ` · ${arena.titres} titre${arena.titres > 1 ? "s" : ""}` : ""}
            <br />
            Toutes saisons
          </p>
          <a
            href={
              arena.profil_public
                ? `${lienBase}/joueurs/${encodeURIComponent(arena.pseudo)}`
                : `${lienBase}/moi`
            }
            className="text-[10px] text-vea-accent mt-1 inline-block underline hover:no-underline"
          >
            {arena.profil_public ? "Mon profil Arena" : "Mon espace Arena"}
          </a>
        </>
      ) : (
        <>
          <p className="text-3xl font-black text-vea-accent leading-none mb-2">—</p>
          <p className="text-xs text-vea-text-dim uppercase tracking-wider font-medium">
            Tournois Arena
          </p>
          <a
            href={`${lienBase}/moi`}
            className="text-[10px] text-vea-accent mt-1 inline-block underline hover:no-underline"
          >
            Relier mon pseudo Arena
          </a>
        </>
      )}
    </div>
  );
}

export default function ProgressionDashboard({
  eventsOld,
  eventsCurrent,
  heuresBenevolatCurrent,
  heuresBenevolatOld,
  xpCurrent,
  arena,
}: ProgressionDashboardProps) {
  // Saison selectionnee. Defaut 2026/27 (saison en cours).
  const [saison, setSaison] = useState<SaisonKey>("2026/27");
  // Dropdown ouvert ou ferme
  const [dropdownOpen, setDropdownOpen] = useState(false);
  // Panneau d'explication XP / niveau ouvert ou ferme (19/05/2026 : suite au
  // masquage des XP dans le scan QR, on les explique ici depuis le profil).
  const [showXpInfo, setShowXpInfo] = useState(false);

  // Valeurs des cards selon saison
  const events = saison === "2026/27" ? eventsCurrent : eventsOld;
  const heures = saison === "2026/27" ? heuresBenevolatCurrent : heuresBenevolatOld;
  // Niveau :
  //   - saison 2026/27 : vrai systeme XP (xp_saison_actuelle de la BDD)
  //   - Old VEA       : estimation retroactive (events*5 + heures*0.5) car pas
  //                     d'XP historises avant la migration multi-motif.
  const niveauVea =
    saison === "2026/27"
      ? computeLevel(xpCurrent)
      : computeNiveauOldEstime(events, heures);

  // Liste des events a afficher selon la saison
  // - "2026/27" : EVENTS_2026_2027 (vide pour l'instant)
  // - "old" : OLD_VEA_EVENTS (tous les events marquants jusqu'a 2025/26)
  const eventsList: HistoriqueEvent[] =
    saison === "2026/27" ? EVENTS_2026_2027 : OLD_VEA_EVENTS;

  // Label affiche dans le dropdown
  // 19/05/2026 : ajout du nom de la saison ("L'Eveil" = 2026/27) a cote de l'annee
  // pour qu'on sache de quelle saison on parle.
  const saisonLabel =
    saison === "2026/27"
      ? "Saison de l'Éveil (2026/27)"
      : "Old VEA (création → 2025)";
  const saisonSubLabel =
    saison === "2026/27"
      ? "Septembre 2026 → Juillet 2027"
      : "Cumul depuis création (2022)";

  return (
    <section className="mb-12">
      {/* Header avec dropdown saison cliquable */}
      <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
        <h2 className="text-xl font-bold text-vea-text">Ta progression</h2>

        {/* Dropdown saison — bouton rouge */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-2 px-4 py-2 bg-vea-accent hover:bg-vea-accent-hover text-white text-xs uppercase tracking-widest font-bold rounded-lg transition-all shadow-btn-accent"
            aria-expanded={dropdownOpen}
            aria-haspopup="listbox"
          >
            {saisonLabel}
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              className={`transition-transform ${dropdownOpen ? "rotate-180" : ""}`}
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>

          {dropdownOpen && (
            <>
              {/* Backdrop pour fermer au clic ext */}
              <div
                className="fixed inset-0 z-10"
                onClick={() => setDropdownOpen(false)}
              />
              <ul
                role="listbox"
                className="absolute right-0 mt-2 w-64 bg-white border border-vea-border rounded-lg shadow-card-hover z-20 overflow-hidden"
              >
                <li>
                  <button
                    type="button"
                    onClick={() => {
                      setSaison("2026/27");
                      setDropdownOpen(false);
                    }}
                    className={`w-full text-left px-4 py-3 text-sm hover:bg-vea-bg transition-colors ${
                      saison === "2026/27"
                        ? "bg-vea-accent-soft text-vea-accent font-semibold"
                        : "text-vea-text"
                    }`}
                  >
                    <div className="font-bold">Saison de l&apos;Éveil (2026/27)</div>
                    <div className="text-[10px] text-vea-text-dim mt-0.5">
                      Sept 2026 → Juillet 2027 (en cours)
                    </div>
                  </button>
                </li>
                <li className="border-t border-vea-border">
                  <button
                    type="button"
                    onClick={() => {
                      setSaison("old");
                      setDropdownOpen(false);
                    }}
                    className={`w-full text-left px-4 py-3 text-sm hover:bg-vea-bg transition-colors ${
                      saison === "old"
                        ? "bg-vea-accent-soft text-vea-accent font-semibold"
                        : "text-vea-text"
                    }`}
                  >
                    <div className="font-bold">Old VEA</div>
                    <div className="text-[10px] text-vea-text-dim mt-0.5">
                      Création → fin saison 2025/26
                    </div>
                  </button>
                </li>
              </ul>
            </>
          )}
        </div>
      </div>

      {/* Sous-titre saison (info contextuelle) */}
      <p className="text-xs text-vea-text-dim mb-4 italic">{saisonSubLabel}</p>

      {/* 4 cards qui changent selon la saison */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        {/* Card 1 : Events participes */}
        <div className="card-clean p-6 text-center">
          <p className="text-3xl font-black text-vea-accent leading-none mb-2">
            {events > 0 ? events : "—"}
          </p>
          <p className="text-xs text-vea-text-dim uppercase tracking-wider font-medium">
            Events participes
          </p>
        </div>

        {/* Card 2 : Heures benevolat */}
        <div className="card-clean p-6 text-center">
          <p className="text-3xl font-black text-vea-accent leading-none mb-2 whitespace-nowrap">
            {heures > 0 ? heures.toLocaleString("fr-FR") + " h" : "—"}
          </p>
          <p className="text-xs text-vea-text-dim uppercase tracking-wider font-medium">
            Heures benevolat
          </p>
        </div>

        {/* Card 3 : Niveau VEA */}
        <div className="card-clean p-6 text-center">
          <p className="text-3xl font-black text-vea-accent leading-none mb-2">
            {niveauVea}
          </p>
          <p className="text-xs text-vea-text-dim uppercase tracking-wider font-medium">
            Niveau VEA
          </p>
          <button
            type="button"
            onClick={() => setShowXpInfo(!showXpInfo)}
            className="text-[10px] text-vea-accent mt-1 underline hover:no-underline"
          >
            Comment ça marche ?
          </button>
        </div>

        {/* Card 4 : vrais résultats Arena (12/11/2026) */}
        <ArenaCard arena={arena} />
      </div>

      {/* Panneau d'explication XP (toggle via "Comment ça marche ?" de la card Niveau VEA)
          19/05/2026 : remplace l'ancien sous-texte cryptique "Events × 5 + Heures × 0.5".
          Pédagogie cohérente avec les XP cachés dans le scan QR (anti-triche). */}
      {showXpInfo && (
        <div className="card-clean p-5 mb-8 border-2 border-vea-accent/20 bg-vea-accent-soft/30">
          <div className="flex items-start justify-between mb-3 gap-2">
            <h3 className="text-sm font-bold text-vea-text flex items-center gap-2">
              <span aria-hidden>🎯</span> Comment gagner de l&apos;XP ?
            </h3>
            <button
              type="button"
              onClick={() => setShowXpInfo(false)}
              className="text-[10px] text-vea-text-dim hover:text-vea-accent uppercase tracking-widest font-bold shrink-0"
              aria-label="Fermer l'explication"
            >
              Fermer ✕
            </button>
          </div>

          <p className="text-xs text-vea-text-muted mb-4 leading-relaxed">
            Chaque fois que tu scannes un QR sur un event VEA, tu gagnes de l&apos;XP
            selon ce que tu y fais. Les XP s&apos;accumulent et te font monter en niveau.
          </p>

          {/* Bareme XP par motif */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
            <div className="text-center p-3 rounded-lg bg-white border border-vea-border">
              <div className="text-3xl mb-1" aria-hidden>🎮</div>
              <div className="text-sm font-bold text-vea-text">Jouer</div>
              <div className="text-xs text-vea-accent font-bold uppercase tracking-wider mt-1">
                +10 XP
              </div>
              <p className="text-[10px] text-vea-text-muted mt-1 leading-snug">
                Tu participes a un tournoi / animation
              </p>
            </div>
            <div className="text-center p-3 rounded-lg bg-white border border-vea-border">
              <div className="text-3xl mb-1" aria-hidden>💪</div>
              <div className="text-sm font-bold text-vea-text">Aider</div>
              <div className="text-xs text-vea-accent font-bold uppercase tracking-wider mt-1">
                +15 XP / heure
              </div>
              <p className="text-[10px] text-vea-text-muted mt-1 leading-snug">
                Tu donnes un coup de main (staff, encadrement)
              </p>
            </div>
            <div className="text-center p-3 rounded-lg bg-white border border-vea-border">
              <div className="text-3xl mb-1" aria-hidden>👀</div>
              <div className="text-sm font-bold text-vea-text">Regarder</div>
              <div className="text-xs text-vea-accent font-bold uppercase tracking-wider mt-1">
                +2 XP
              </div>
              <p className="text-[10px] text-vea-text-muted mt-1 leading-snug">
                Tu viens encourager / decouvrir
              </p>
            </div>
          </div>

          {/* Formule passage de niveau */}
          <div className="border-t border-vea-border pt-3">
            <p className="text-xs text-vea-text font-bold mb-1">
              Comment passer au niveau suivant ?
            </p>
            <p className="text-xs text-vea-text-muted leading-relaxed">
              Pour passer du niveau{" "}
              <strong className="text-vea-text">N</strong> au niveau{" "}
              <strong className="text-vea-text">N+1</strong>, il te faut{" "}
              <strong className="text-vea-accent">50 × N XP</strong>.
            </p>
            <p className="text-[11px] text-vea-text-dim italic mt-1.5 leading-relaxed">
              Exemples : niveau 1→2 = 50 XP · niveau 5→6 = 250 XP · niveau 10→11 = 500 XP.
              Cumul total pour atteindre le niveau 10 = 2 250 XP.
            </p>
            <p className="text-[11px] text-vea-text-muted mt-3 leading-relaxed">
              Plus tu montes de niveau, plus tu debloques de{" "}
              <strong className="text-vea-accent">badges et recompenses</strong>{" "}
              (visibles plus bas sur cette page, dans la vitrine des badges).
            </p>
          </div>

          {/* Note anti-triche */}
          <p className="text-[10px] text-vea-text-dim italic mt-3 leading-relaxed border-t border-vea-border pt-3">
            Les XP ne sont volontairement pas affiches au moment du scan : on
            evite que certains choisissent &quot;aider&quot; juste pour le bonus
            alors qu&apos;ils ont juste joue. L&apos;admin peut ajuster les motifs
            apres coup depuis la page event.
          </p>
        </div>
      )}

      {/* Liste des events de la saison selectionnee */}
      <div>
        <h3 className="text-sm font-bold text-vea-text mb-3 border-left-red">
          Events{" "}
          {saison === "2026/27"
            ? "saison de l'Éveil (2026/27)"
            : "Old VEA"}{" "}
          ({eventsList.length})
        </h3>

        {eventsList.length === 0 ? (
          <div className="card-clean p-8 text-center">
            <p className="text-sm text-vea-text-muted mb-2">
              Aucun event enregistre pour cette saison.
            </p>
            <p className="text-xs text-vea-text-dim italic">
              La saison de l&apos;Éveil (2026/2027) demarre en septembre. Les
              events seront ajoutes au fur et a mesure.
            </p>
          </div>
        ) : (
          <ul className="space-y-2">
            {eventsList.map((event) => (
              <li
                key={event.id}
                className="card-clean p-4 flex items-start gap-3"
              >
                <span
                  className={`shrink-0 text-[9px] uppercase tracking-widest font-bold px-2 py-1 rounded border ${CATEGORY_COLORS[event.category]}`}
                >
                  {CATEGORY_LABELS[event.category]}
                </span>
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-bold text-vea-text leading-tight mb-0.5">
                    {event.name}
                  </h4>
                  <p className="text-xs text-vea-text-muted leading-snug">
                    {event.description}
                  </p>
                  <p className="text-[10px] text-vea-text-dim mt-1">
                    {event.periode}
                    {event.lieu && ` · ${event.lieu}`}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
