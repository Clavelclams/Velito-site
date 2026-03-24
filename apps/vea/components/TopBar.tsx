/**
 * TopBar — Barre écosystème Velito (36px)
 * Fond #060e1e, accent bleu #4d9fff pour le module actif.
 * Sur mobile : affiche seulement "ÉCOSYSTÈME VELITO".
 */

interface EcosystemModule {
  name: string;
  active: boolean;
}

const MODULES: EcosystemModule[] = [
  { name: "ESPORT (VEA)", active: true },
  { name: "VENA", active: false },
  { name: "INTERACTIVE", active: false },
  { name: "ARENA", active: false },
  { name: "MESSAGES", active: false },
];

export default function TopBar() {
  return (
    <div className="w-full h-9 bg-vea-darker border-b border-vea-border/30 flex items-center px-4 lg:px-8">
      <div className="max-w-7xl mx-auto w-full flex items-center gap-4">
        <span className="text-[11px] uppercase tracking-widest text-vea-text-muted font-medium whitespace-nowrap">
          Écosystème Velito :
        </span>

        {/* Modules — cachés sur mobile */}
        <div className="hidden sm:flex items-center gap-4">
          {MODULES.map((mod) => (
            <span
              key={mod.name}
              className={`text-[11px] uppercase tracking-wider font-medium ${
                mod.active
                  ? "text-vea-accent"
                  : "text-vea-text-muted"
              }`}
            >
              {mod.name}
              {!mod.active && (
                <span className="ml-1 text-[9px] text-vea-text-dim">
                  bientôt
                </span>
              )}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
