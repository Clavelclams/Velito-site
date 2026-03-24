/**
 * Hub Velito — Page vitrine écosystème
 * Fond #060e1e, logo centré, grille 2x2 des modules.
 */

interface VelitoModule {
  name: string;
  tagline: string;
  description: string;
  status: "online" | "soon";
  href: string;
}

const MODULES: VelitoModule[] = [
  {
    name: "VEA",
    tagline: "Esport Amiens",
    description: "Association esport et inclusion sociale",
    status: "online",
    href: "https://vea.velito.com",
  },
  {
    name: "VENA",
    tagline: "Agence numérique",
    description: "Développement web, vidéo, formation",
    status: "soon",
    href: "#",
  },
  {
    name: "INTERACTIVE",
    tagline: "Velito Interactive",
    description: "Jeux interactifs pour bars et MJC",
    status: "soon",
    href: "#",
  },
  {
    name: "ARENA",
    tagline: "Tournois",
    description: "Plateforme de gestion de tournois",
    status: "soon",
    href: "#",
  },
];

export default function HubPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-16 bg-velito-darker">
      {/* ===== HEADER ===== */}
      <div className="text-center mb-16">
        {/* Logo placeholder — à remplacer par une image */}
        <div className="w-16 h-16 rounded-2xl bg-velito-card border border-velito-border flex items-center justify-center mx-auto mb-6">
          <span className="text-velito-accent font-black text-xl">V</span>
        </div>
        <h1 className="text-4xl sm:text-5xl font-black text-velito-white mb-3 tracking-tight">
          VELITO
        </h1>
        <p className="text-lg text-velito-text-muted">
          L&apos;écosystème numérique amiénois
        </p>
      </div>

      {/* ===== GRILLE MODULES ===== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 max-w-2xl w-full">
        {MODULES.map((mod) => (
          <a
            key={mod.name}
            href={mod.status === "online" ? mod.href : undefined}
            className={`block bg-velito-card border border-velito-border rounded-xl p-6 transition-all ${
              mod.status === "online"
                ? "hover:border-velito-accent/50 hover:scale-[1.02] cursor-pointer"
                : "opacity-50 cursor-default"
            }`}
          >
            {/* En-tête */}
            <div className="flex items-start justify-between mb-3">
              <div>
                <h2 className="text-lg font-black text-velito-white">
                  {mod.name}
                </h2>
                <span className="text-xs text-velito-text-muted">
                  {mod.tagline}
                </span>
              </div>

              {/* Badge statut */}
              {mod.status === "online" ? (
                <span className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-400 shrink-0">
                  <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
                  En ligne
                </span>
              ) : (
                <span className="text-[10px] font-semibold uppercase tracking-wider text-velito-text-dim shrink-0">
                  Bientôt
                </span>
              )}
            </div>

            <p className="text-sm text-velito-text-muted leading-relaxed">
              {mod.description}
            </p>
          </a>
        ))}
      </div>

      {/* ===== FOOTER ===== */}
      <div className="mt-20 text-center">
        <p className="text-xs text-velito-text-dim">
          &copy; 2026 Velito — Velito Expertise Numérique Amiens
        </p>
      </div>
    </div>
  );
}
