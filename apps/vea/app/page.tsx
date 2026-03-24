/**
 * Page d'accueil VEA
 * Hero (100vh) + Stats + Nos Actions + CTA Rejoins VEA
 */
import Link from "next/link";

const STATS = [
  { value: "100+", label: "Membres" },
  { value: "20+", label: "Événements organisés" },
  { value: "3", label: "Jeux compétitifs" },
];

const ACTIONS = [
  {
    title: "Tournois & Compétitions",
    description:
      "Organiser des compétitions esport locales accessibles à tous les niveaux, du débutant au confirmé.",
  },
  {
    title: "Insertion & Formation",
    description:
      "Utiliser le jeu vidéo comme tremplin vers l'emploi et la formation professionnelle.",
  },
  {
    title: "Réduction fracture numérique",
    description:
      "Rendre le numérique accessible dans les quartiers prioritaires grâce au prêt de matériel et aux ateliers.",
  },
];

const HELLOASSO_URL =
  "https://www.helloasso.com/associations/velito-esport-amiens/adhesions/adhesion-2026";

export default function HomePage() {
  return (
    <>
      {/* ===== HERO ===== */}
      <section className="relative min-h-screen flex items-center justify-center px-4 overflow-hidden bg-gradient-to-b from-vea-dark via-vea-navy to-vea-dark">
        {/* Effets visuels discrets en arrière-plan */}
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-vea-accent/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-[300px] h-[300px] border border-vea-accent/5 rounded-full" />

        <div className="relative z-10 max-w-4xl mx-auto text-center">
          {/* Badge */}
          <span className="inline-block mb-6 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-vea-accent border border-vea-accent/30 rounded-full bg-vea-accent/5">
            Association Esport &amp; Insertion
          </span>

          {/* H1 */}
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black leading-tight mb-6">
            <span className="text-vea-white">LE JEU VIDÉO</span>
            <br />
            <span className="text-vea-accent">COMME MOTEUR</span>
          </h1>

          {/* Sous-titre */}
          <p className="text-base sm:text-lg text-vea-text-muted max-w-2xl mx-auto mb-10 leading-relaxed">
            Velito Esport Amiens utilise le gaming pour créer du lien social,
            favoriser l&apos;insertion et faire briller les talents locaux.
          </p>

          {/* CTA */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/inscription"
              className="w-full sm:w-auto bg-vea-accent hover:bg-vea-accent-hover text-white font-semibold px-8 py-3.5 rounded-lg transition-colors text-sm"
            >
              Nous rejoindre
            </Link>
            <Link
              href="/association"
              className="w-full sm:w-auto border border-vea-white/20 hover:border-vea-white/40 text-vea-white font-semibold px-8 py-3.5 rounded-lg transition-colors text-sm"
            >
              Découvrir nos actions
            </Link>
          </div>
        </div>
      </section>

      {/* ===== STATS ===== */}
      <section className="py-16 px-4 bg-vea-navy">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-0">
            {STATS.map((stat, i) => (
              <div
                key={stat.label}
                className={`text-center py-6 ${
                  i < STATS.length - 1
                    ? "sm:border-r sm:border-vea-accent/20"
                    : ""
                }`}
              >
                <p className="text-4xl sm:text-5xl font-black text-vea-accent mb-2">
                  {stat.value}
                </p>
                <p className="text-sm text-vea-text-muted uppercase tracking-wider font-medium">
                  {stat.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== NOS ACTIONS ===== */}
      <section className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold text-vea-white mb-3 text-center">
            Nos Actions
          </h2>
          <p className="text-vea-text-muted text-center mb-12 text-sm max-w-xl mx-auto">
            Trois piliers pour un esport responsable et inclusif.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {ACTIONS.map((action) => (
              <div
                key={action.title}
                className="bg-vea-card border border-vea-border rounded-xl p-7 hover:border-vea-accent/40 transition-colors group"
              >
                {/* Icône placeholder */}
                <div className="w-10 h-10 rounded-lg bg-vea-accent/10 flex items-center justify-center mb-4">
                  <div className="w-4 h-4 rounded-sm bg-vea-accent/50" />
                </div>
                <h3 className="text-lg font-bold text-vea-white mb-2 group-hover:text-vea-accent transition-colors">
                  {action.title}
                </h3>
                <p className="text-sm text-vea-text-muted leading-relaxed">
                  {action.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== CTA REJOINS VEA ===== */}
      <section className="py-20 px-4">
        <div className="max-w-3xl mx-auto">
          <div className="bg-vea-card border border-vea-border rounded-xl p-10 text-center">
            <h2 className="text-2xl sm:text-3xl font-bold text-vea-white mb-4">
              Rejoins VEA
            </h2>
            <p className="text-vea-text-muted mb-8 max-w-lg mx-auto">
              Participe aux événements, intègre une équipe, ou soutiens
              le projet. Chaque profil compte.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/inscription"
                className="w-full sm:w-auto bg-vea-accent hover:bg-vea-accent-hover text-white font-semibold px-8 py-3.5 rounded-lg transition-colors text-sm"
              >
                S&apos;inscrire à un événement
              </Link>
              <a
                href={HELLOASSO_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full sm:w-auto border border-vea-accent/40 hover:border-vea-accent text-vea-accent font-semibold px-8 py-3.5 rounded-lg transition-colors text-sm"
              >
                Devenir membre
              </a>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
