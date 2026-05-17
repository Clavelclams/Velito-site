/**
 * Page Esport VEA — refonte DA claire (17/05/2026).
 * Resultats reels + fonctionnement competitif + CTA.
 * Note : Pinh et Tony Tagoe (Chewing Gum) sont 2 personnes differentes.
 */
import Link from "next/link";
import ScrollReveal from "@/components/ScrollReveal";

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
      "12 jeunes amienois dont 4 jeunes filles representent Amiens a Courbevoie, organise par OMNE Esport. Plus grande delegation de l'histoire de VEA.",
    badge: "TOP 8 National",
    source: "Gazette Sports, 26 fev. 2026",
    emoji: "🏆",
  },
  {
    date: "Juin 2024",
    title: "Championnat Federal SF6 — 3e France",
    description:
      "Pinh decroche la 3e place de France en Street Fighter 6 au championnat FFJV a Vitry Gaming, Paris. VEA envoie 4 joueurs : Mamba, Chewing Gum, NoyzBoy, Pinh. Diffusion live sur Twitch FFJV_officiel. Interview radio sur France Bleu Picardie.",
    badge: "3e place nationale",
    source: "Gazette Sports, 19 juin 2024",
    emoji: "🥉",
  },
  {
    date: "Novembre 2023",
    title: "TIQE Etouvie — Evenement fondateur",
    description:
      "Premier Tournoi Inter Quartier Esport. Salle des Provinces, Etouvie. Environ 30 jeunes. Gagnants : Lenny et Leny. Couverture presse Courrier Picard.",
    badge: "Evenement fondateur",
    source: "Courrier Picard, nov. 2023",
    emoji: "🎮",
  },
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

export default function EsportPage() {
  return (
    <>
      {/* HERO */}
      <section className="hero-bg pt-28 pb-12 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <ScrollReveal>
            <span className="badge-red mb-4">Competition</span>
            <h1 className="text-4xl sm:text-5xl font-black text-vea-text mb-4 mt-4">
              Esport &amp; <span className="text-vea-accent">Competition</span>
            </h1>
            <p className="text-base text-vea-text-muted max-w-2xl mx-auto">
              VEA represente Amiens sur la scene nationale.
            </p>
          </ScrollReveal>
        </div>
      </section>

      {/* TIMELINE RESULTATS */}
      <section className="py-16 px-4 bg-vea-bg">
        <div className="max-w-3xl mx-auto">
          <ScrollReveal>
            <h2 className="text-2xl sm:text-3xl font-bold text-vea-text mb-10 text-center">
              Nos <span className="text-vea-accent">resultats</span>
            </h2>
          </ScrollReveal>

          <div className="relative">
            <div className="absolute left-6 top-0 bottom-0 w-px bg-vea-border" />
            <div className="space-y-10">
              {RESULTS.map((result, i) => (
                <ScrollReveal key={result.title} delay={i * 0.15}>
                  <div className="relative pl-16">
                    <div className="absolute left-3 top-1 w-7 h-7 rounded-full bg-white border-2 border-vea-accent flex items-center justify-center text-sm shadow-card-soft">
                      {result.emoji}
                    </div>
                    <p className="text-xs text-vea-accent font-semibold uppercase tracking-wider mb-1">
                      {result.date}
                    </p>
                    <h3 className="text-lg font-bold text-vea-text mb-2">{result.title}</h3>
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

      {/* COMMENT CA MARCHE */}
      <section className="py-16 px-4 section-bg">
        <div className="max-w-5xl mx-auto">
          <ScrollReveal>
            <div className="text-center mb-10">
              <h2 className="text-2xl sm:text-3xl font-bold text-vea-text mb-3">
                Comment ca marche <span className="text-vea-accent">chez VEA</span>
              </h2>
              <p className="text-sm text-vea-text-muted max-w-xl mx-auto">
                Pas d&apos;equipes fixes par jeu. Voici comment on fonctionne.
              </p>
            </div>
          </ScrollReveal>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {HOW_IT_WORKS.map((card, i) => (
              <ScrollReveal key={card.title} delay={i * 0.1}>
                <div className="card-clean p-7 h-full">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4 bg-vea-accent-soft border border-vea-accent/15">
                    <span className="text-xl">{card.emoji}</span>
                  </div>
                  <h3 className="text-base font-bold text-vea-text mb-2">{card.title}</h3>
                  <p className="text-sm text-vea-text-muted leading-relaxed">{card.description}</p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 px-4 bg-vea-bg">
        <div className="max-w-3xl mx-auto text-center">
          <ScrollReveal>
            <div className="card-clean p-10 bg-vea-accent-soft border-vea-accent/15">
              <h2 className="text-2xl sm:text-3xl font-bold text-vea-text mb-4">
                Tu joues <span className="text-vea-accent">serieusement</span> ?
              </h2>
              <p className="text-vea-text-muted mb-6 max-w-lg mx-auto">
                On cherche des joueurs motives pour representer Amiens. Peu importe ton niveau, viens nous voir.
              </p>
              <Link href="/inscription" className="btn-primary">
                Nous rejoindre
              </Link>
            </div>
          </ScrollReveal>
        </div>
      </section>
    </>
  );
}
