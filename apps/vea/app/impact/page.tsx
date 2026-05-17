/**
 * Page Impact VEA — REFONTE VIOLET + ROUGE + MOTION
 * Stats clés avec CountUp + chronologie avec ScrollReveal
 *
 */
import ScrollReveal from "@/components/ScrollReveal";
import CountUp from "@/components/CountUp";

interface Stat {
  value: number;
  suffix: string;
  prefix: string;
  label: string;
}

const STATS: Stat[] = [
  { value: 100, suffix: "+", prefix: "", label: "Jeunes accompagnés" },
  { value: 20, suffix: "+", prefix: "", label: "Événements organisés" },
  { value: 3, suffix: "e", prefix: "", label: "Place nationale SF6 (Pinh, 2024)" },
  { value: 8, suffix: "", prefix: "TOP ", label: "INTERCUP 2026" },
  { value: 50, suffix: "%", prefix: "", label: "Taux de féminisation max atteint" },
  { value: 0, suffix: "\u20AC", prefix: "", label: "Pour participer" },
  { value: 5, suffix: "", prefix: "", label: "Quartiers couverts" },
  { value: 6, suffix: "", prefix: "", label: "Couvertures médiatiques" },
  { value: 12, suffix: "+", prefix: "", label: "Partenaires actifs" },
  { value: 4, suffix: " ans", prefix: "", label: "D\u2019activité (2022-2026)" },
];

interface TimelineEntry {
  date: string;
  title: string;
  description: string;
}

const TIMELINE: TimelineEntry[] = [
  {
    date: "Nov. 2022",
    title: "Fondation de VEA",
    description:
      "Déclaration en préfecture. RNA : W802018363. Naissance officielle de Velito Esport Amiens.",
  },
  {
    date: "Jan. 2023",
    title: "Premiers contenus",
    description:
      "Premier post Instagram, vlog avec MABB. Devise : \u00AB VEA ta vie à fond \u00BB.",
  },
  {
    date: "2022-2023",
    title: "Saison 1",
    description:
      "Tournois FIFA, Fortnite, Rocket League. Réparation PC. Accueil stagiaires. Boutique Grinta. 6 815\u20AC de budget.",
  },
  {
    date: "Nov. 2023",
    title: "TIQE \u2014 Événement fondateur",
    description:
      "Premier TIQE, Étouvie. Environ 30 jeunes. Couverture Courrier Picard.",
  },
  {
    date: "Juin 2024",
    title: "3e place nationale SF6",
    description:
      "Pinh \u2014 Championnat FFJV, Vitry Gaming Paris. Interview France Bleu Picardie. Budget 2024 : 9 274\u20AC.",
  },
  {
    date: "Fév. 2026",
    title: "INTERCUP 2026",
    description:
      "TOP 8 national. 12 joueurs dont 4 filles. Courbevoie.",
  },
  {
    date: "2026",
    title: "Vision 2k27",
    description:
      "Local QPV Amiens Nord. Centre esport éducatif. Partenariat Jeunesse en Or.",
  },
];

export default function ImpactPage() {
  return (
    <>
      {/* ===== HERO ===== */}
      <section className="pt-24 pb-12 px-4 hero-bg">
        <div className="max-w-4xl mx-auto text-center">
          <ScrollReveal>
            <h1 className="text-4xl sm:text-5xl font-black text-gradient-red mb-4">
              Notre Impact
            </h1>
            <p className="text-lg text-vea-text-muted max-w-2xl mx-auto">
              Les chiffres et l&apos;histoire de VEA depuis 2022.
            </p>
          </ScrollReveal>
        </div>
      </section>

      {/* ===== STATS CLÉS ===== */}
      <section className="py-16 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {STATS.map((stat, i) => (
              <ScrollReveal key={stat.label} delay={i * 0.05}>
                <div className="card-glow p-5 text-center relative group">
                  {/* Glow subtil au hover */}
                  <div className="absolute inset-0 bg-vea-red/5 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl" />
                  <p className="text-2xl sm:text-3xl font-black text-gradient-red mb-1 relative z-10">
                    <CountUp
                      end={stat.value}
                      suffix={stat.suffix}
                      prefix={stat.prefix}
                      duration={1.5}
                    />
                  </p>
                  <p className="text-[10px] sm:text-xs text-vea-text-muted uppercase tracking-wider font-medium relative z-10 leading-tight">
                    {stat.label}
                  </p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* ===== CHRONOLOGIE ===== */}
      <section className="py-16 px-4 bg-vea-bg/50">
        <div className="max-w-3xl mx-auto">
          <ScrollReveal>
            <h2 className="text-2xl font-bold text-gradient-vea mb-10 text-center">
              Notre histoire
            </h2>
          </ScrollReveal>

          <div className="relative">
            {/* Ligne verticale */}
            <div className="absolute left-4 sm:left-6 top-0 bottom-0 w-px bg-vea-border" />

            <div className="space-y-10">
              {TIMELINE.map((entry, i) => (
                <ScrollReveal key={entry.title} delay={i * 0.1}>
                  <div className="relative pl-12 sm:pl-16">
                    {/* Point sur la timeline — rouge */}
                    <div className="absolute left-1 sm:left-3 top-1 timeline-dot" />

                    {/* Date */}
                    <p className="text-xs text-vea-red font-semibold uppercase tracking-wider mb-1">
                      {entry.date}
                    </p>

                    {/* Titre */}
                    <h3 className="text-lg font-bold text-vea-white mb-2">
                      {entry.title}
                    </h3>

                    {/* Description */}
                    <p className="text-sm text-vea-text-muted leading-relaxed">
                      {entry.description}
                    </p>
                  </div>
                </ScrollReveal>
              ))}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
