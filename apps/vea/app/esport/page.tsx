/**
 * Page Esport VEA — REFONTE VIOLET + ROUGE + MOTION
 * Résultats réels + fonctionnement compétitif VEA + CTA
 *
 * CORRECTION : Pinh et Tony Tagoe (pseudo : Chewing Gum) sont DEUX personnes différentes.
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
    date: "Février 2026",
    title: "INTERCUP 2026 — TOP 8 France",
    description:
      "12 jeunes amiénois dont 4 jeunes filles représentent Amiens à Courbevoie, organisé par OMNE Esport. Plus grande délégation de l\u2019histoire de VEA.",
    badge: "TOP 8 National",
    source: "Gazette Sports, 26 fév. 2026",
    emoji: "\u{1F3C6}",
  },
  {
    date: "Juin 2024",
    title: "Championnat Fédéral SF6 — 3e France",
    description:
      "Pinh décroche la 3e place de France en Street Fighter 6 au championnat FFJV à Vitry Gaming, Paris. VEA envoie 4 joueurs : Mamba, Chewing Gum, NoyzBoy, Pinh. Diffusion live sur Twitch FFJV_officiel. Interview radio sur France Bleu Picardie.",
    badge: "3e place nationale",
    source: "Gazette Sports, 19 juin 2024",
    emoji: "\u{1F949}",
  },
  {
    date: "Novembre 2023",
    title: "TIQE Étouvie — Événement fondateur",
    description:
      "Premier Tournoi Inter Quartier Esport. Salle des Provinces, Étouvie. Environ 30 jeunes. Gagnants : Lenny et Lény. Couverture presse par le Courrier Picard.",
    badge: "Événement fondateur",
    source: "Courrier Picard, nov. 2023",
    emoji: "\u{1F3AE}",
  },
];

interface HowCard {
  emoji: string;
  title: string;
  description: string;
}

const HOW_IT_WORKS: HowCard[] = [
  {
    emoji: "\u{1F3AF}",
    title: "Tu joues en compétitif ?",
    description:
      "VEA finance tes inscriptions aux tournois officiels (FFJV, France Esport, Toornament). En contrepartie : t\u2019engager dans l\u2019asso et ramener des résultats pour le contenu.",
  },
  {
    emoji: "\u{1F50D}",
    title: "On sonde, on y va",
    description:
      "Un tournoi sort ? On sonde les joueurs chauds. Si on est plusieurs, on part sous les couleurs VEA. C\u2019est comme ça qu\u2019on s\u2019est retrouvés à Courbevoie à 12 pour l\u2019INTERCUP.",
  },
  {
    emoji: "\u{1F579}\uFE0F",
    title: "Jeux actifs en compétition",
    description:
      "Rainbow Six Siege \u2014 équipe active. Street Fighter 6 \u2014 Pinh en lice internationale. EA FC, Clash Royale, Dragon Ball \u2014 tournois locaux. Rocket League \u2014 compétitions fédérales.",
  },
];

export default function EsportPage() {
  return (
    <>
      {/* ===== HERO ===== */}
      <section className="pt-24 pb-12 px-4 hero-bg">
        <div className="max-w-4xl mx-auto text-center">
          <ScrollReveal>
            <h1 className="text-4xl sm:text-5xl font-black text-gradient-vea mb-4">
              Esport &amp; Compétition
            </h1>
            <p className="text-lg text-vea-text-muted max-w-2xl mx-auto">
              VEA représente Amiens sur la scène nationale.
            </p>
          </ScrollReveal>
        </div>
      </section>

      {/* ===== NOS RÉSULTATS — TIMELINE ===== */}
      <section className="py-16 px-4">
        <div className="max-w-3xl mx-auto">
          <ScrollReveal>
            <h2 className="text-2xl font-bold text-gradient-vea mb-10 text-center">
              Nos résultats
            </h2>
          </ScrollReveal>

          <div className="relative">
            {/* Ligne verticale */}
            <div className="absolute left-6 top-0 bottom-0 w-px bg-vea-border" />

            <div className="space-y-10">
              {RESULTS.map((result, i) => (
                <ScrollReveal key={result.title} delay={i * 0.15}>
                  <div className="relative pl-16">
                    {/* Point sur la timeline */}
                    <div className="absolute left-3 top-1 w-7 h-7 rounded-full bg-vea-card border-2 border-vea-red flex items-center justify-center text-sm">
                      {result.emoji}
                    </div>

                    {/* Date */}
                    <p className="text-xs text-vea-red font-semibold uppercase tracking-wider mb-1">
                      {result.date}
                    </p>

                    {/* Titre */}
                    <h3 className="text-lg font-bold text-vea-white mb-2">
                      {result.title}
                    </h3>

                    {/* Description */}
                    <p className="text-sm text-vea-text-muted leading-relaxed mb-2">
                      {result.description}
                    </p>

                    {/* Source */}
                    {result.source && (
                      <p className="text-[11px] text-vea-text-dim italic mb-3">
                        Source : {result.source}
                      </p>
                    )}

                    {/* Badge */}
                    <span className="badge-red">
                      {result.badge}
                    </span>
                  </div>
                </ScrollReveal>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ===== COMMENT ÇA MARCHE ===== */}
      <section className="py-16 px-4 bg-vea-bg/50">
        <div className="max-w-5xl mx-auto">
          <ScrollReveal>
            <h2 className="text-2xl font-bold text-gradient-vea mb-3 text-center">
              Comment ça marche chez VEA
            </h2>
            <p className="text-sm text-vea-text-muted text-center mb-10 max-w-xl mx-auto">
              Pas d&apos;équipes fixes par jeu. Voici comment on fonctionne.
            </p>
          </ScrollReveal>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {HOW_IT_WORKS.map((card, i) => (
              <ScrollReveal key={card.title} delay={i * 0.1}>
                <div className="card-glow p-7 h-full">
                  <span className="text-2xl mb-4 block">{card.emoji}</span>
                  <h3 className="text-base font-bold text-vea-white mb-2">
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

      {/* ===== CTA ===== */}
      <section className="py-20 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <ScrollReveal>
            <div className="card-glow p-10">
              <h2 className="text-2xl font-bold text-gradient-vea mb-4">
                Tu joues sérieusement ?
              </h2>
              <p className="text-vea-text-muted mb-8 max-w-lg mx-auto">
                On cherche des joueurs motivés pour représenter Amiens.
                Peu importe ton niveau, viens nous voir.
              </p>
              <Link
                href="/inscription"
                className="inline-block bg-vea-red hover:bg-vea-accent-hover text-white font-semibold px-8 py-3.5 rounded-lg transition-all text-sm hover:shadow-[0_0_25px_rgba(230,57,70,0.4)]"
              >
                Nous rejoindre
              </Link>
            </div>
          </ScrollReveal>
        </div>
      </section>
    </>
  );
}
