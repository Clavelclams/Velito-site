/**
 * Page Impact VEA
 * Stats clés enrichies + chronologie corrigée
 * Vitrine institutionnelle pour les dossiers de subvention
 *
 * CORRECTION : Pinh et Tony Tagoe sont DEUX personnes différentes.
 * Pinh = 3e place SF6 nationale.
 * La source du premier TIQE est le Courrier Picard (pas Gazette Sports).
 */

interface Stat {
  value: string;
  label: string;
}

const STATS: Stat[] = [
  { value: "100+", label: "Jeunes accompagnés" },
  { value: "20+", label: "Événements organisés" },
  { value: "3e", label: "Place nationale SF6 (Pinh, 2024)" },
  { value: "TOP 8", label: "INTERCUP 2026" },
  { value: "50%", label: "Taux de féminisation max atteint" },
  { value: "0\u20AC", label: "Pour participer" },
  { value: "5", label: "Quartiers couverts" },
  { value: "6", label: "Couvertures médiatiques" },
  { value: "12+", label: "Partenaires actifs" },
  { value: "3 ans", label: "D\u2019activité (2022-2026)" },
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
      "Premier post Instagram, vlog avec MABB. Devise : « VEA ta vie à fond ».",
  },
  {
    date: "2022-2023",
    title: "Saison 1",
    description:
      "Tournois FIFA, Fortnite, Rocket League. Réparation PC. Accueil stagiaires. Boutique Grinta. 6 815\u20AC de budget.",
  },
  {
    date: "Nov. 2023",
    title: "TIQE — Événement fondateur",
    description:
      "Premier TIQE, Étouvie. Environ 30 jeunes. Couverture Courrier Picard.",
  },
  {
    date: "Juin 2024",
    title: "3e place nationale SF6",
    description:
      "Pinh — Championnat FFJV, Vitry Gaming Paris. Interview France Bleu Picardie. Budget 2024 : 9 274\u20AC.",
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
      <section className="pt-20 pb-12 px-4 bg-gradient-to-b from-vea-dark to-vea-navy">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl sm:text-5xl font-black text-gradient mb-4">
            Notre Impact
          </h1>
          <p className="text-lg text-vea-text-muted max-w-2xl mx-auto">
            Les chiffres et l&apos;histoire de VEA depuis 2022.
          </p>
        </div>
      </section>

      {/* ===== STATS CLÉS ===== */}
      <section className="py-16 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {STATS.map((stat) => (
              <div
                key={stat.label}
                className="card-glow p-5 text-center relative group"
              >
                {/* Glow subtil */}
                <div className="absolute inset-0 bg-vea-accent/5 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl" />
                <p className="text-2xl sm:text-3xl font-black text-vea-accent mb-1 relative z-10">
                  {stat.value}
                </p>
                <p className="text-[10px] sm:text-xs text-vea-text-muted uppercase tracking-wider font-medium relative z-10 leading-tight">
                  {stat.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== CHRONOLOGIE ===== */}
      <section className="py-16 px-4 bg-vea-navy/50">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-vea-white mb-10 text-center">
            Notre histoire
          </h2>

          <div className="relative">
            {/* Ligne verticale */}
            <div className="absolute left-4 sm:left-6 top-0 bottom-0 w-px bg-vea-border" />

            <div className="space-y-10">
              {TIMELINE.map((entry) => (
                <div key={entry.title} className="relative pl-12 sm:pl-16">
                  {/* Point sur la timeline */}
                  <div className="absolute left-1 sm:left-3 top-1 w-7 h-7 rounded-full bg-vea-card border-2 border-vea-accent flex items-center justify-center">
                    <div className="w-2 h-2 rounded-full bg-vea-accent" />
                  </div>

                  {/* Date */}
                  <p className="text-xs text-vea-accent font-semibold uppercase tracking-wider mb-1">
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
              ))}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
