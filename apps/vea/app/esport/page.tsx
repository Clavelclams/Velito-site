/**
 * Page /esport — REFONTE avec toggle Competition / Social (18/05/2026).
 *
 * VEA n'est pas qu'une asso competition. VEA est une asso d'inclusion qui
 * utilise le gaming comme levier social. Cette page presente les 2 facettes :
 *
 *   - VOLET COMPETITION (par defaut) : resultats nationaux, articles presse,
 *     tournois organises, comment ca marche en competitif
 *   - VOLET SOCIAL : projets civiques portes (Budget Participatif Fontaine
 *     Salamandre SLM 2025), interventions QPV, prevention numerique, ateliers
 *     reconditionnement PC, lien VEA <-> citoyennete jeune
 *
 * Toggle via state useState. Deux mots cliquables en haut de page.
 *
 * "use client" car toggle interactif.
 */
"use client";

import { useState } from "react";
import Link from "next/link";
import ScrollReveal from "@/components/ScrollReveal";

type Tab = "competition" | "social";

interface Result {
  date: string;
  title: string;
  description: string;
  badge: string;
  source?: string;
  emoji: string;
}

const RESULTS: Result[] = [
  {
    date: "Fevrier 2026",
    title: "INTERCUP 2026 — TOP 8 France",
    description:
      "12 jeunes amienois dont 4 jeunes filles representent Amiens a Courbevoie, organise par OMNE Esport. Plus grande delegation de l'histoire de VEA, et premiere fois qu'on aligne autant de joueuses sur une competition nationale.",
    badge: "TOP 8 National",
    source: "Gazette Sports, 26 fev. 2026",
    emoji: "🏆",
  },
  {
    date: "Juin 2024",
    title: "Championnat Federal SF6 — 3e France",
    description:
      "Pinh (Tony Tagoe) decroche la 3e place de France en Street Fighter 6 au championnat FFJV a Vitry Gaming, Paris. VEA envoie 4 joueurs : Mamba, Chewing Gum, NoyzBoy et Pinh. Diffusion live sur Twitch FFJV_officiel. Interview radio sur France Bleu Picardie.",
    badge: "3e place nationale",
    source: "Gazette Sports, 19 juin 2024",
    emoji: "🥉",
  },
  {
    date: "Janvier — Mai 2023",
    title: "Championnat Federal Rocket League FFJV",
    description:
      "Equipe VEA engagee dans le championnat federal Rocket League 3v3 FFJV. Phase de poule par division, du 9 janvier au 22 mai 2023. Premiere participation reguliere de VEA a un championnat national en ligne.",
    badge: "Championnat federal",
    emoji: "🚀",
  },
  {
    date: "Novembre 2023",
    title: "TIQE Etouvie — Evenement fondateur",
    description:
      "Premier Tournoi Inter Quartier Esport. Salle des Provinces, Etouvie. Environ 30 jeunes (initiation 10 ans + tournoi 16/25 ans). Gagnants : Lenny et Leny. Couverture presse Courrier Picard. C'est ici que le format TIQE est ne.",
    badge: "Evenement fondateur",
    source: "Courrier Picard, nov. 2023",
    emoji: "🎮",
  },
];

interface PressArticle {
  date: string;
  media: string;
  title: string;
  topic: string;
  url?: string;
}

const PRESS: PressArticle[] = [
  {
    date: "26 fevrier 2026",
    media: "Gazette Sports",
    title: "12 amienois dont 4 jeunes filles a l'INTERCUP",
    topic: "Reportage sur la delegation VEA au TOP 8 national 2026 a Courbevoie.",
  },
  {
    date: "19 juin 2024",
    media: "Gazette Sports",
    title: "Pinh 3e France au championnat federal Street Fighter 6",
    topic: "Couverture de la performance de Tony Tagoe (Pinh) au championnat FFJV a Vitry Gaming.",
  },
  {
    date: "Juin 2024",
    media: "France Bleu Picardie",
    title: "Interview radio — Pinh, joueur SF6 amienois",
    topic: "Diffusion sur les ondes locales apres la 3e place de Pinh au championnat federal.",
  },
  {
    date: "Novembre 2023",
    media: "Courrier Picard",
    title: "Premier Tournoi Inter Quartier Esport a Etouvie",
    topic: "Reportage sur le TIQE fondateur — environ 30 jeunes a la Salle des Provinces.",
  },
];

interface Tournament {
  date: string;
  title: string;
  game: string;
  location: string;
  winner?: string;
}

const TOURNAMENTS: Tournament[] = [
  { date: "Juin 2024", title: "TIQE 2024 — Grande Finale", game: "EA FC 24", location: "Le Corner, Amiens", winner: "Stephan (1er), Mathias (2e)" },
  { date: "Avril 2024", title: "TIQE 2024 — Secteur Est", game: "EA FC 24", location: "Gymnase Elbeuf, Saint-Just", winner: "Hassan (bon d'achat GameCash)" },
  { date: "Fevrier 2024", title: "Street Fighter 6 — WarpZone Amiens", game: "Street Fighter 6", location: "WarpZone, 21 Pl. Vogel", winner: "Tournoi communautaire FFJV" },
  { date: "Decembre 2023", title: "TIQE — Secteur Sud", game: "EA FC 24", location: "La Table du Marais", winner: "1er TIQE multi-partenaires (MABB, EVA, JEO, Amiens Metropole)" },
  { date: "Decembre 2023", title: "FIFA Amiens VEA", game: "FIFA", location: "Amiens", winner: "Tournoi de fin d'annee" },
  { date: "Novembre 2023", title: "MABB x VEA — Rocket League", game: "Rocket League", location: "Amiens", winner: "Co-organisation MABB Basketball" },
];

interface HowCard {
  emoji: string;
  title: string;
  description: string;
}

const HOW_IT_WORKS: HowCard[] = [
  {
    emoji: "🎯",
    title: "Tu joues en competitif ?",
    description:
      "VEA finance tes inscriptions aux tournois officiels (FFJV, France Esport, Toornament). En contrepartie : t'engager dans l'asso et ramener des resultats pour le contenu.",
  },
  {
    emoji: "🔍",
    title: "On sonde, on y va",
    description:
      "Un tournoi sort ? On sonde les joueurs chauds. Si on est plusieurs, on part sous les couleurs VEA. C'est comme ca qu'on s'est retrouves a Courbevoie a 12 pour l'INTERCUP.",
  },
  {
    emoji: "🕹️",
    title: "Jeux actifs en competition",
    description:
      "Rainbow Six Siege — equipe active. Street Fighter 6 — Pinh en lice. EA FC, Clash Royale, Dragon Ball — tournois locaux. Rocket League — competitions federales.",
  },
];

// ============================================================================
// VOLET SOCIAL — Actions VEA hors competition pure
// ============================================================================

interface SocialProject {
  emoji: string;
  date: string;
  title: string;
  description: string;
  highlight?: string;
  /** URL externe sur le highlight (page projet officielle, article presse) */
  highlightUrl?: string;
  source?: string;
}

const SOCIAL_PROJECTS: SocialProject[] = [
  {
    emoji: "🌿",
    date: "2025-2026",
    title: "Budget Participatif — Fontaine Salamandre SLM",
    description:
      "Lors d'une intervention VEA dans le quartier Sud, Chloe BOULOT (Democratie locale Amiens Metropole) presente le Budget Participatif aux jeunes. Un jeune mineur veut deposer un projet. Clavel le porte officiellement a sa place. Le projet est laureat.",
    highlight: "9 900 € obtenus pour le quartier Salamandre",
    highlightUrl:
      "https://jeparticipe.amiens.fr/project/copy-of-budget-participatif-2024/collect/depots-des-idees/proposals/fontaine-slm",
    source: "Mairie d'Amiens — Direction de proximite EST",
  },
  {
    emoji: "🛡️",
    date: "Recurrent",
    title: "Prevention numerique",
    description:
      "Interventions en milieu scolaire et dans les centres sociaux pour sensibiliser les jeunes aux risques lies aux ecrans, aux jeux d'argent et a l'addiction au gaming. Approche par les pairs : on parle d'eux a eux.",
    highlight: "Plusieurs interventions par an",
  },
  {
    emoji: "💻",
    date: "2022 + 2024",
    title: "Ateliers reconditionnement PC",
    description:
      "Programme d'ateliers : recuperation de vieux ordinateurs, remise en etat, formation avec les stagiaires. Chacun repart avec son PC refait par ses soins. Les PC en bonus sont offerts a la MABB pour le marquage des matchs.",
    highlight: "5 stagiaires accompagnes (Maya 2022, Berstelien, Cyprien, Leny, Oumayma 2024)",
  },
  {
    emoji: "🤝",
    date: "Recurrent",
    title: "Interventions centres sociaux QPV",
    description:
      "Animation reguliere dans les centres sociaux des Quartiers Prioritaires de la Ville : Tour du Marais (Etouvie), Elbeuf (Saint-Just), Marcel Paul (Amiens Nord), Salamandre, Pierre Rollin, L'Albatros, La Pleiade. Du gaming en outil de lien social.",
    highlight: "4 QPV couverts, 8+ structures partenaires",
  },
  {
    emoji: "🎤",
    date: "2024",
    title: "Happy Eid — partenariat Jeunesse en Or",
    description:
      "Animation gaming en exterieur pour celebrer l'Aid al-Fitr avec l'asso Jeunesse en Or. Installation tente, sim de course, PS5 FIFA, terrain basket transforme. Le gaming comme prolongement de la fete familiale.",
    highlight: "5 editions de 2022 a 2026",
  },
  {
    emoji: "🌳",
    date: "Ete 2025",
    title: "Les Jeunes Sont Dans La Place",
    description:
      "Animation gaming en exterieur l'ete pour les jeunes du quartier. Tente + sim de course Logitech + Switch Mario Kart + PS5 EA FC. Operation de proximite ete 2025.",
    highlight: "Mixite genre + tranches d'age",
  },
  {
    emoji: "♀️",
    date: "Recurrent",
    title: "Mixite filles dans le gaming",
    description:
      "Volonte assumee de feminiser les pratiques. 4 jeunes filles sur 12 a l'INTERCUP 2026. Just Dance et Mario Kart comme portes d'entree. Discussions ouvertes sur les violences en ligne dans les jeux.",
    highlight: "33% filles a l'INTERCUP 2026",
  },
];

interface SocialPartner {
  name: string;
  role: string;
}

const SOCIAL_PARTNERS: SocialPartner[] = [
  { name: "Jeunesse en Or", role: "Convention colocation, animations Happy Eid" },
  { name: "MABB", role: "Membre fondateur, partage de locaux + PC reconditionnes" },
  { name: "Amiens Metropole (Direction Proximite EST)", role: "Henri MONTIGNY — accompagnement Budget Participatif" },
  { name: "Centres sociaux QPV", role: "Tour du Marais, Marcel Paul, Pierre Rollin, Salamandre, L'Albatros..." },
  { name: "APSL 80 (Profession Sport & Loisirs)", role: "Dispositif Rec en action" },
  { name: "UFOLEP Somme", role: "Federation sportive multisport, animations cohesion" },
  { name: "Pedagojeux", role: "Ressources pedagogie jeu video" },
];

// ============================================================================
// COMPOSANT
// ============================================================================

export default function EsportPage() {
  const [tab, setTab] = useState<Tab>("competition");

  return (
    <>
      {/* HERO + TOGGLE */}
      <section className="hero-bg-full pt-28 pb-12 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <ScrollReveal>
            <h1 className="text-4xl sm:text-5xl font-black text-vea-text mb-6 mt-4">
              VEA, esport &{" "}
              <span className="text-vea-accent">inclusion</span>
            </h1>
            <p className="text-base text-vea-text-muted max-w-2xl mx-auto mb-8">
              Choisis l&apos;angle :{" "}
              <button
                type="button"
                onClick={() => setTab("competition")}
                className={`inline-block font-bold transition-colors ${
                  tab === "competition"
                    ? "text-vea-accent underline"
                    : "text-vea-text-muted hover:text-vea-accent"
                }`}
              >
                Competition
              </button>{" "}
              ou{" "}
              <button
                type="button"
                onClick={() => setTab("social")}
                className={`inline-block font-bold transition-colors ${
                  tab === "social"
                    ? "text-vea-accent underline"
                    : "text-vea-text-muted hover:text-vea-accent"
                }`}
              >
                Social
              </button>
            </p>
            <p className="text-sm text-vea-text-dim max-w-xl mx-auto italic">
              {tab === "competition"
                ? "Les performances de VEA sur les championnats nationaux et les tournois locaux."
                : "Les actions de VEA hors competition : Budget Participatif, prevention numerique, mixite, interventions QPV."}
            </p>
          </ScrollReveal>
        </div>
      </section>

      {/* VOLET COMPETITION */}
      {tab === "competition" && (
        <>
          {/* TIMELINE RESULTATS */}
          <section className="py-16 px-4 bg-vea-bg">
            <div className="max-w-3xl mx-auto">
              <ScrollReveal>
                <div className="text-center mb-10">
                  <span className="badge-red mb-4">National</span>
                  <h2 className="text-2xl sm:text-3xl font-bold text-vea-text mt-4 mb-3">
                    Nos <span className="text-vea-accent">resultats</span>
                  </h2>
                </div>
              </ScrollReveal>

              <div className="relative">
                <div className="absolute left-6 top-0 bottom-0 w-px bg-vea-border" />
                <div className="space-y-10">
                  {RESULTS.map((result, i) => (
                    <ScrollReveal key={result.title} delay={i * 0.12}>
                      <div className="relative pl-16">
                        <div className="absolute left-3 top-1 w-7 h-7 rounded-full bg-white border-2 border-vea-accent flex items-center justify-center text-sm shadow-card-soft">
                          {result.emoji}
                        </div>
                        <p className="text-xs text-vea-accent font-semibold uppercase tracking-wider mb-1">
                          {result.date}
                        </p>
                        <h3 className="text-lg font-bold text-vea-text mb-2">
                          {result.title}
                        </h3>
                        <p className="text-sm text-vea-text-muted leading-relaxed mb-2">
                          {result.description}
                        </p>
                        {result.source && (
                          <p className="text-[11px] text-vea-text-dim italic mb-3">
                            Source : {result.source}
                          </p>
                        )}
                        <span className="badge-red">{result.badge}</span>
                      </div>
                    </ScrollReveal>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* PRESSE */}
          <section className="py-16 px-4 section-bg">
            <div className="max-w-5xl mx-auto">
              <ScrollReveal>
                <div className="text-center mb-10">
                  <span className="badge-red mb-4">Presse</span>
                  <h2 className="text-2xl sm:text-3xl font-bold text-vea-text mt-4 mb-3">
                    Ils ont <span className="text-vea-accent">parle de nous</span>
                  </h2>
                </div>
              </ScrollReveal>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-8">
                {PRESS.map((article, i) => (
                  <ScrollReveal key={article.title} delay={i * 0.08}>
                    <div className="panel-accent py-1 h-full">
                      <p className="text-[11px] text-vea-accent font-semibold uppercase tracking-wider mb-1">
                        {article.media} &middot; {article.date}
                      </p>
                      <h3 className="text-base font-bold text-vea-text mb-2 leading-snug">
                        {article.title}
                      </h3>
                      <p className="text-sm text-vea-text-muted leading-relaxed">
                        {article.topic}
                      </p>
                    </div>
                  </ScrollReveal>
                ))}
              </div>
            </div>
          </section>

          {/* TOURNOIS ORGANISES */}
          <section className="py-16 px-4 bg-vea-bg">
            <div className="max-w-5xl mx-auto">
              <ScrollReveal>
                <div className="text-center mb-10">
                  <span className="badge-red mb-4">Local</span>
                  <h2 className="text-2xl sm:text-3xl font-bold text-vea-text mt-4 mb-3">
                    Tournois organises{" "}
                    <span className="text-vea-accent">par VEA</span>
                  </h2>
                </div>
              </ScrollReveal>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {TOURNAMENTS.map((t, i) => (
                  <ScrollReveal key={t.title} delay={i * 0.06}>
                    <div className="panel p-5 h-full">
                      <p className="text-[11px] text-vea-accent font-semibold uppercase tracking-wider mb-2">
                        {t.date}
                      </p>
                      <h3 className="text-base font-bold text-vea-text mb-2 leading-tight">
                        {t.title}
                      </h3>
                      <div className="space-y-1 text-xs text-vea-text-muted">
                        <p>
                          <span className="font-semibold text-vea-text">Jeu :</span>{" "}
                          {t.game}
                        </p>
                        <p>
                          <span className="font-semibold text-vea-text">Lieu :</span>{" "}
                          {t.location}
                        </p>
                        {t.winner && (
                          <p>
                            <span className="font-semibold text-vea-text">Note :</span>{" "}
                            {t.winner}
                          </p>
                        )}
                      </div>
                    </div>
                  </ScrollReveal>
                ))}
              </div>
            </div>
          </section>

          {/* COMMENT CA MARCHE */}
          <section className="py-16 px-4 section-bg">
            <div className="max-w-5xl mx-auto">
              <ScrollReveal>
                <div className="text-center mb-10">
                  <h2 className="text-2xl sm:text-3xl font-bold text-vea-text mb-3">
                    Comment ca marche{" "}
                    <span className="text-vea-accent">chez VEA</span>
                  </h2>
                </div>
              </ScrollReveal>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {HOW_IT_WORKS.map((card, i) => (
                  <ScrollReveal key={card.title} delay={i * 0.1}>
                    <div className="h-full border-t border-vea-border-strong pt-5">
                      <span className="editorial-figure text-4xl text-vea-text-dim block mb-4">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <h3 className="text-base font-bold text-vea-text mb-2">
                        {card.title}
                      </h3>
                      <p className="text-sm text-vea-text-muted leading-relaxed">
                        {card.description}
                      </p>
                    </div>
                  </ScrollReveal>
                ))}
              </div>
            </div>
          </section>
        </>
      )}

      {/* VOLET SOCIAL */}
      {tab === "social" && (
        <>
          {/* INTRO SOCIAL */}
          <section className="py-16 px-4 bg-vea-bg">
            <div className="max-w-3xl mx-auto text-center">
              <ScrollReveal>
                <span className="badge-red mb-4">Pourquoi le social</span>
                <h2 className="text-2xl sm:text-3xl font-bold text-vea-text mt-4 mb-6">
                  Le gaming comme{" "}
                  <span className="text-vea-accent">levier d&apos;inclusion</span>
                </h2>
                <p className="text-vea-text-muted leading-relaxed mb-4">
                  VEA n&apos;est pas qu&apos;une asso de competition. Le gaming
                  est l&apos;outil, pas la finalite. Notre vraie mission :{" "}
                  <strong className="text-vea-text">
                    rapprocher les jeunes de leur quartier, de leur citoyennete,
                    et entre eux
                  </strong>
                  .
                </p>
                <p className="text-vea-text-muted leading-relaxed">
                  En allant chercher les jeunes la ou ils sont (la console), on
                  les emmene la ou ils ne vont pas tout seuls (Budget Participatif,
                  formation, prevention, mixite).
                </p>
              </ScrollReveal>
            </div>
          </section>

          {/* PROJETS SOCIAUX */}
          <section className="py-16 px-4 section-bg">
            <div className="max-w-5xl mx-auto">
              <ScrollReveal>
                <div className="text-center mb-10">
                  <span className="badge-red mb-4">Nos actions</span>
                  <h2 className="text-2xl sm:text-3xl font-bold text-vea-text mt-4 mb-3">
                    Ce que VEA fait <span className="text-vea-accent">vraiment</span>
                  </h2>
                </div>
              </ScrollReveal>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {SOCIAL_PROJECTS.map((p, i) => (
                  <ScrollReveal key={p.title} delay={i * 0.07}>
                    <div className="panel p-6 h-full">
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-vea-accent-soft border border-vea-accent/15 flex-shrink-0">
                          <span className="text-xl">{p.emoji}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[11px] text-vea-accent font-semibold uppercase tracking-wider mb-1">
                            {p.date}
                          </p>
                          <h3 className="text-base font-bold text-vea-text mb-2 leading-snug">
                            {p.title}
                          </h3>
                        </div>
                      </div>
                      <p className="text-sm text-vea-text-muted leading-relaxed mt-3">
                        {p.description}
                      </p>
                      {p.highlight && (
                        <p className="text-sm font-bold text-vea-accent mt-3 border-t border-vea-border pt-3">
                          {p.highlightUrl ? (
                            <a
                              href={p.highlightUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="hover:underline inline-flex items-baseline gap-1"
                              title="Voir la page projet officielle"
                            >
                              → {p.highlight}
                              <span aria-hidden="true" className="text-[10px]">
                                ↗
                              </span>
                            </a>
                          ) : (
                            <>→ {p.highlight}</>
                          )}
                        </p>
                      )}
                      {p.source && (
                        <p className="text-[11px] text-vea-text-dim italic mt-2">
                          Source : {p.source}
                        </p>
                      )}
                    </div>
                  </ScrollReveal>
                ))}
              </div>
            </div>
          </section>

          {/* RECIT BUDGET PARTICIPATIF EN GRAND */}
          <section className="py-16 px-4 bg-vea-bg">
            <div className="max-w-3xl mx-auto">
              <ScrollReveal>
                <div className="bg-vea-accent-soft border-l-4 border-l-vea-accent rounded-r-2xl p-8 sm:p-10">
                  <span className="text-[11px] text-vea-accent font-semibold uppercase tracking-wider">
                    Recit
                  </span>
                  <h2 className="text-2xl sm:text-3xl font-bold text-vea-text mt-2 mb-4">
                    Comment on est passe d&apos;une console au{" "}
                    <span className="text-vea-accent">Budget Participatif</span>
                  </h2>
                  <p className="text-vea-text-muted leading-relaxed mb-3">
                    Lors d&apos;une intervention VEA dans le quartier Sud
                    d&apos;Amiens, Chloe BOULOT (Democratie locale, Amiens
                    Metropole) est venue presenter le Budget Participatif aux
                    jeunes presents.
                  </p>
                  <p className="text-vea-text-muted leading-relaxed mb-3">
                    Un <strong className="text-vea-text">jeune mineur</strong>{" "}
                    a voulu deposer un projet : la Fontaine Salamandre SLM.
                    Comme il etait mineur, il ne pouvait pas etre porteur
                    officiel. Clavel NDEMA MOUSSA (president VEA) a{" "}
                    <strong className="text-vea-text">porte le projet</strong>{" "}
                    a sa place, en gardant le jeune comme initiateur.
                  </p>
                  <p className="text-vea-text-muted leading-relaxed mb-4">
                    Le projet a <strong className="text-vea-text">gagne</strong>.
                  </p>
                  <p className="text-lg font-black text-vea-accent">
                    <a
                      href="https://jeparticipe.amiens.fr/project/copy-of-budget-participatif-2024/collect/depots-des-idees/proposals/fontaine-slm"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:underline inline-flex items-baseline gap-1"
                      title="Voir la page projet officielle Amiens Metropole"
                    >
                      9 900 € attribues a la Ville pour amenager la Fontaine
                      Salamandre.
                      <span aria-hidden="true" className="text-xs ml-1">
                        ↗
                      </span>
                    </a>
                  </p>
                  <p className="text-xs text-vea-text-dim italic mt-4">
                    RDV de lancement : 6 fevrier 2026, parking rue Marcel Paul.
                    Suivi : Direction de proximite EST — Henri MONTIGNY.
                  </p>
                </div>
              </ScrollReveal>
            </div>
          </section>

          {/* PARTENAIRES SOCIAUX */}
          <section className="py-16 px-4 section-bg">
            <div className="max-w-5xl mx-auto">
              <ScrollReveal>
                <div className="text-center mb-10">
                  <h2 className="text-2xl sm:text-3xl font-bold text-vea-text mb-3">
                    Avec qui on travaille{" "}
                    <span className="text-vea-accent">sur le social</span>
                  </h2>
                </div>
              </ScrollReveal>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {SOCIAL_PARTNERS.map((p, i) => (
                  <ScrollReveal key={p.name} delay={i * 0.04}>
                    <div className="panel-accent py-1">
                      <h3 className="text-sm font-bold text-vea-text">
                        {p.name}
                      </h3>
                      <p className="text-xs text-vea-text-muted mt-1">
                        {p.role}
                      </p>
                    </div>
                  </ScrollReveal>
                ))}
              </div>

              <ScrollReveal>
                <p className="text-xs text-vea-text-dim text-center mt-8">
                  Liste complete sur{" "}
                  <Link
                    href="/partenaires"
                    className="text-vea-accent hover:underline"
                  >
                    /partenaires
                  </Link>
                </p>
              </ScrollReveal>
            </div>
          </section>
        </>
      )}

      {/* CTA — commun aux 2 onglets */}
      <section className="py-16 px-4 bg-vea-bg">
        <div className="max-w-3xl mx-auto text-center">
          <ScrollReveal>
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-8 border-t-2 border-vea-accent pt-10">
              <div className="max-w-xl">
                <span className="kicker mb-3">
                  {tab === "competition" ? "Competition" : "Engagement"}
                </span>
                <h2 className="text-3xl sm:text-4xl font-bold text-vea-text leading-tight mt-2">
                  {tab === "competition" ? (
                    <>
                      Tu joues{" "}
                      <span className="text-vea-accent">serieusement</span> ?
                    </>
                  ) : (
                    <>
                      Envie de{" "}
                      <span className="text-vea-accent">t&apos;engager</span> ?
                    </>
                  )}
                </h2>
                <p className="text-vea-text-muted mt-4">
                  {tab === "competition"
                    ? "On cherche des joueurs motives pour representer Amiens. Peu importe ton niveau, viens nous voir."
                    : "Animation, prevention, depot de projet citoyen — VEA cherche toujours des benevoles et des jeunes engages."}
                </p>
              </div>
              <Link href="/inscription" className="btn-primary shrink-0">
                Nous rejoindre
              </Link>
            </div>
          </ScrollReveal>
        </div>
      </section>
    </>
  );
}
