/**
 * Page d'accueil Hub Velito (velito.com)
 *
 * 👉 Ce que fait cette page :
 * C'est la porte d'entrée de l'écosystème Velito.
 * Elle présente les 4 modules sous forme de cards avec leur statut.
 *
 * 👉 Design sobre :
 * Fond sombre, logo centré, cards minimalistes.
 * Pas de fioritures — juste l'essentiel.
 */

// 👉 Interface pour les modules de l'écosystème
interface VelitoModule {
  name: string;
  tagline: string;
  description: string;
  status: "online" | "coming_soon";
  href: string;
  color: string; // 👉 Couleur d'accent du module
}

const MODULES: VelitoModule[] = [
  {
    name: "VEA",
    tagline: "Esport",
    description:
      "Association d'inclusion par l'esport. Tournois, événements et lien social à Amiens.",
    status: "online",
    href: "https://vea.velito.com",
    color: "border-vea-red text-vea-red",
  },
  {
    name: "VENA",
    tagline: "Agence numérique",
    description:
      "Création de sites web, identité visuelle et solutions digitales pour les pros locaux.",
    status: "coming_soon",
    href: "#",
    color: "border-emerald-600/50 text-emerald-500",
  },
  {
    name: "INTERACTIVE",
    tagline: "Jeux pour bars & MJC",
    description:
      "Solutions de jeux interactifs pour les lieux de vie : bars, MJC, centres sociaux.",
    status: "coming_soon",
    href: "#",
    color: "border-purple-600/50 text-purple-400",
  },
  {
    name: "ARENA",
    tagline: "Tournois",
    description:
      "Plateforme de tournois esport en ligne et en présentiel. Compétition accessible à tous.",
    status: "coming_soon",
    href: "#",
    color: "border-amber-600/50 text-amber-400",
  },
];

export default function HubPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-16">
      {/* ======= HEADER ======= */}
      <div className="text-center mb-16">
        {/* 👉 Logo texte Velito — sera remplacé par une image plus tard */}
        <h1 className="text-5xl sm:text-6xl font-black text-velito-white mb-4 tracking-tight">
          VELITO
        </h1>
        <p className="text-lg text-velito-white/50 max-w-md mx-auto">
          L&apos;écosystème numérique amiénois
        </p>
      </div>

      {/* ======= GRID DES MODULES ======= */}
      {/* 👉 Grid 1 col mobile → 2 cols desktop, max 4 cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-3xl w-full">
        {MODULES.map((mod) => (
          <a
            key={mod.name}
            href={mod.status === "online" ? mod.href : undefined}
            className={`block bg-velito-gray border rounded-xl p-6 transition-all ${
              mod.status === "online"
                ? `${mod.color.split(" ")[0]} hover:scale-[1.02] cursor-pointer`
                : "border-velito-gray-light/20 cursor-default opacity-60"
            }`}
          >
            {/* 👉 En-tête de la card : nom + badge statut */}
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className={`text-xl font-black ${mod.color.split(" ")[1]}`}>
                  {mod.name}
                </h2>
                <span className="text-xs text-velito-white/40 uppercase tracking-wider">
                  {mod.tagline}
                </span>
              </div>

              {/* 👉 Badge "En ligne" ou "Bientôt" */}
              {mod.status === "online" ? (
                <span className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-400">
                  {/* 👉 Petit point vert animé = pulsation */}
                  <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                  En ligne
                </span>
              ) : (
                <span className="text-[10px] font-semibold uppercase tracking-wider text-velito-white/25">
                  Bientôt
                </span>
              )}
            </div>

            <p className="text-sm text-velito-white/40 leading-relaxed">
              {mod.description}
            </p>
          </a>
        ))}
      </div>

      {/* ======= FOOTER MINIMAL ======= */}
      <div className="mt-20 text-center">
        <p className="text-xs text-velito-white/20">
          &copy; {new Date().getFullYear()} Velito — Amiens, Hauts-de-France
        </p>
      </div>
    </div>
  );
}
