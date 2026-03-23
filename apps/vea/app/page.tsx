/**
 * Page d'accueil VEA
 *
 * 👉 Structure :
 * 1. Hero section — titre accrocheur + boutons CTA
 * 2. Section chiffres — stats clés de l'asso
 * 3. Section aperçu événements — 3 cards placeholder
 *
 * 👉 Pas de "use client" ici : c'est un Server Component.
 * Il n'y a ni state, ni event handlers, donc pas besoin de JavaScript côté client.
 * Next.js le rend en HTML pur = plus rapide, meilleur SEO.
 */
import Link from "next/link";

// 👉 Interface pour typer les stats affichées
interface Stat {
  value: string;
  label: string;
}

// 👉 Les chiffres clés — modifiables facilement
const STATS: Stat[] = [
  { value: "100+", label: "Membres" },
  { value: "20+", label: "Événements organisés" },
  { value: "3", label: "Jeux compétitifs" },
];

// 👉 Événements placeholder — seront remplacés par des données dynamiques plus tard
interface EventPreview {
  title: string;
  date: string;
  description: string;
}

const UPCOMING_EVENTS: EventPreview[] = [
  {
    title: "Tournoi EA FC 25",
    date: "Avril 2026",
    description:
      "Tournoi local ouvert à tous les niveaux. Inscription gratuite pour les membres VEA.",
  },
  {
    title: "Clash Royale Open",
    date: "Mai 2026",
    description:
      "Compétition Clash Royale en partenariat avec les structures locales.",
  },
  {
    title: "Gaming & Insertion",
    date: "Juin 2026",
    description:
      "Atelier découverte esport pour les jeunes des quartiers prioritaires.",
  },
];

export default function HomePage() {
  return (
    <>
      {/* ============================================= */}
      {/* SECTION 1 : HERO                              */}
      {/* ============================================= */}
      <section className="relative min-h-[85vh] flex items-center justify-center px-4 overflow-hidden">
        {/* 👉 Gradient de fond subtil : donne de la profondeur sans image */}
        <div className="absolute inset-0 bg-gradient-to-b from-vea-black via-vea-gray/50 to-vea-black" />

        {/* 👉 Cercle rouge flouté en arrière-plan — purement décoratif */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-vea-red/5 rounded-full blur-3xl" />

        <div className="relative z-10 max-w-4xl mx-auto text-center">
          {/* 👉 Badge — petit label coloré au-dessus du titre */}
          <span className="inline-block mb-6 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-vea-red border border-vea-red/30 rounded-full bg-vea-red/5">
            Association Esport &amp; Insertion
          </span>

          {/* 👉 Titre H1 — essentiel pour le SEO (1 seul h1 par page) */}
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black leading-tight mb-6">
            <span className="text-vea-white">LE JEU VIDÉO</span>
            <br />
            <span className="text-vea-white">COMME </span>
            <span className="text-vea-red">MOTEUR</span>
          </h1>

          {/* 👉 Sous-titre : explique en une phrase ce que fait VEA */}
          <p className="text-base sm:text-lg text-vea-white/60 max-w-2xl mx-auto mb-10 leading-relaxed">
            Velito Esport Amiens utilise le gaming pour créer du lien social,
            favoriser l&apos;insertion et faire briller les talents locaux.
          </p>

          {/* 👉 Deux boutons CTA côte à côte */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/contact"
              className="w-full sm:w-auto bg-vea-red hover:bg-vea-red/90 text-white font-semibold px-8 py-3.5 rounded-lg transition-colors text-sm"
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

      {/* ============================================= */}
      {/* SECTION 2 : CHIFFRES CLÉS                     */}
      {/* ============================================= */}
      <section className="py-16 px-4 border-t border-vea-gray-light/10">
        <div className="max-w-5xl mx-auto">
          {/* 👉 Grid 1 col mobile → 3 cols desktop */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
            {STATS.map((stat) => (
              <div key={stat.label} className="text-center">
                {/* 👉 Le chiffre en gros et en rouge pour attirer l'œil */}
                <p className="text-4xl sm:text-5xl font-black text-vea-red mb-2">
                  {stat.value}
                </p>
                <p className="text-sm text-vea-white/50 uppercase tracking-wider font-medium">
                  {stat.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================= */}
      {/* SECTION 3 : APERÇU ÉVÉNEMENTS                 */}
      {/* ============================================= */}
      <section className="py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold text-vea-white mb-2">
            Prochains événements
          </h2>
          <p className="text-vea-white/40 mb-10 text-sm">
            Découvrez ce que VEA prépare pour la communauté.
          </p>

          {/* 👉 Grid responsive pour les cards événements */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {UPCOMING_EVENTS.map((event) => (
              <div
                key={event.title}
                className="bg-vea-gray border border-vea-gray-light/20 rounded-xl p-6 hover:border-vea-red/30 transition-colors group"
              >
                {/* 👉 Date en petit, en rouge */}
                <span className="text-xs text-vea-red font-semibold uppercase tracking-wider">
                  {event.date}
                </span>
                <h3 className="text-lg font-bold text-vea-white mt-2 mb-3 group-hover:text-vea-red transition-colors">
                  {event.title}
                </h3>
                <p className="text-sm text-vea-white/50 leading-relaxed">
                  {event.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
