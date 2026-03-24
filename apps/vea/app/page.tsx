/**
 * Page d'accueil VEA — REFONTE VIOLET + ROUGE + MOTION
 *
 * 👉 Hero (100vh) avec cercles décoratifs violet/rouge
 * 👉 Stats avec CountUp animé
 * 👉 Nos Actions avec ScrollReveal
 * 👉 CTA Rejoins VEA
 *
 * 👉 Ce fichier est un Server Component par défaut.
 *    ScrollReveal et CountUp sont "use client" — ils fonctionnent comme
 *    des îlots client dans un Server Component (pattern Next.js App Router).
 */
import Link from "next/link";
import ScrollReveal from "@/components/ScrollReveal";
import CountUp from "@/components/CountUp";

const STATS = [
  { value: 100, suffix: "+", label: "Jeunes accompagnés" },
  { value: 20, suffix: "+", label: "Événements organisés" },
  { value: 3, suffix: "e", label: "Place nationale 2024" },
  { value: 2022, suffix: "", label: "Année de fondation" },
];

const ACTIONS = [
  {
    title: "Tournois & Compétitions",
    description:
      "Organiser des compétitions esport locales accessibles à tous les niveaux, du débutant au confirmé.",
    icon: "🏆",
  },
  {
    title: "Insertion & Formation",
    description:
      "Utiliser le jeu vidéo comme tremplin vers l'emploi et la formation professionnelle.",
    icon: "🎯",
  },
  {
    title: "Réduction fracture numérique",
    description:
      "Rendre le numérique accessible dans les quartiers prioritaires grâce au prêt de matériel et aux ateliers.",
    icon: "💻",
  },
  {
    title: "Prévention numérique",
    description:
      "Sensibiliser les jeunes et les familles aux risques liés aux écrans, aux jeux d'argent et à l'addiction.",
    icon: "🛡️",
  },
];

const HELLOASSO_URL =
  "https://www.helloasso.com/associations/velito-esport-amiens/adhesions/adhesion-2026";

export default function HomePage() {
  return (
    <>
      {/* ===== HERO ===== */}
      <section className="hero-bg-full relative min-h-screen flex items-center justify-center px-4 overflow-hidden">
        {/* Le background SVG hero-pattern est appliqué via .hero-bg dans globals.css */}

        <div className="relative z-10 max-w-4xl mx-auto text-center">
          {/* Badge */}
          <ScrollReveal delay={0.1}>
            <span className="inline-block mb-6 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-vea-red border border-vea-red/30 rounded-full bg-vea-red/5">
              Association Esport &amp; Insertion
            </span>
          </ScrollReveal>

          {/* H1 */}
          <ScrollReveal delay={0.2}>
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black leading-tight mb-6">
              <span className="text-gradient-vea">LE JEU VIDÉO</span>
              <br />
              <span className="text-gradient-red">COMME MOTEUR</span>
            </h1>
          </ScrollReveal>

          {/* Sous-titre */}
          <ScrollReveal delay={0.3}>
            <p className="text-base sm:text-lg text-vea-text-muted max-w-2xl mx-auto mb-10 leading-relaxed">
              Velito Esport Amiens utilise le gaming pour créer du lien social,
              favoriser l&apos;insertion et faire briller les talents locaux.
            </p>
          </ScrollReveal>

          {/* CTA */}
          <ScrollReveal delay={0.4}>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/inscription"
                className="w-full sm:w-auto bg-vea-red hover:bg-vea-accent-hover text-white font-semibold px-8 py-3.5 rounded-lg transition-all text-sm hover:shadow-[0_0_30px_rgba(230,57,70,0.5)] hover:-translate-y-1"
              >
                Nous rejoindre
              </Link>
              <Link
                href="/association"
                className="w-full sm:w-auto border border-vea-white/20 hover:border-vea-purple/50 text-vea-white font-semibold px-8 py-3.5 rounded-lg transition-all text-sm hover:shadow-[0_0_20px_rgba(124,58,237,0.2)]"
              >
                Découvrir nos actions
              </Link>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* ===== SEPARATOR ===== */}
      <div className="section-separator" />

      {/* ===== STATS ===== */}
      <section className="py-16 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {STATS.map((stat, i) => (
              <ScrollReveal key={stat.label} delay={i * 0.1}>
                <div className="card-glow p-6 text-center">
                  <p className="stat-number">
                    <CountUp end={stat.value} suffix={stat.suffix} duration={2} />
                  </p>
                  <p className="text-sm text-vea-text-muted uppercase tracking-wider font-medium mt-2">
                    {stat.label}
                  </p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* ===== SEPARATOR ===== */}
      <div className="section-separator" />

      {/* ===== NOS ACTIONS ===== */}
      <section className="section-bg py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <ScrollReveal>
            <h2 className="text-2xl sm:text-3xl font-bold text-gradient-vea mb-3 text-center">
              Nos Actions
            </h2>
            <p className="text-vea-text-muted text-center mb-12 text-sm max-w-xl mx-auto">
              Quatre piliers pour un esport responsable et inclusif.
            </p>
          </ScrollReveal>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {ACTIONS.map((action, i) => (
              <ScrollReveal key={action.title} delay={i * 0.1}>
                <div className="card-glow p-7 group h-full">
                  {/* Icône */}
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-4 bg-vea-red/10 border border-vea-red/20">
                    <span className="text-lg">{action.icon}</span>
                  </div>
                  <h3 className="text-lg font-bold text-vea-white mb-2 group-hover:text-vea-red transition-colors">
                    {action.title}
                  </h3>
                  <p className="text-sm text-vea-text-muted leading-relaxed">
                    {action.description}
                  </p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* ===== CTA REJOINS VEA ===== */}
      <section className="py-20 px-4">
        <div className="max-w-3xl mx-auto">
          <ScrollReveal>
            <div className="card-glow p-10 text-center">
              <h2 className="text-2xl sm:text-3xl font-bold text-gradient-vea mb-4">
                Rejoins VEA
              </h2>
              <p className="text-vea-text-muted mb-8 max-w-lg mx-auto">
                Participe aux événements, intègre une équipe, ou soutiens le
                projet. Chaque profil compte.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link
                  href="/inscription"
                  className="w-full sm:w-auto bg-vea-red hover:bg-vea-accent-hover text-white font-semibold px-8 py-3.5 rounded-lg transition-all text-sm hover:shadow-[0_0_30px_rgba(230,57,70,0.5)] hover:-translate-y-1"
                >
                  S&apos;inscrire à un événement
                </Link>
                <a
                  href={HELLOASSO_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full sm:w-auto border border-vea-white/20 hover:border-vea-white/50 text-vea-white font-semibold px-8 py-3.5 rounded-lg transition-colors text-sm"
                >
                  Devenir membre
                </a>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </section>
    </>
  );
}
