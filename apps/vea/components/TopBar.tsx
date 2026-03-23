/**
 * TopBar — Barre supérieure de l'écosystème Velito
 *
 * 👉 Ce que fait ce composant :
 * Affiche une barre fine tout en haut du site avec les liens vers chaque module Velito.
 * VEA est surligné en rouge (actif), les autres sont grisés "coming soon".
 *
 * 👉 Pourquoi c'est utile :
 * Ça montre que VEA fait partie d'un écosystème plus grand. Quand les autres modules
 * seront en ligne, les liens deviendront cliquables.
 */

// 👉 Interface TypeScript : définit les props de chaque module dans la TopBar
interface EcosystemModule {
  name: string;
  label: string;
  href: string;
  active: boolean;
}

// 👉 Liste des modules — facilement modifiable quand un nouveau module arrive
const MODULES: EcosystemModule[] = [
  { name: "VEA", label: "ESPORT", href: "/", active: true },
  { name: "VENA", label: "AGENCE", href: "#", active: false },
  { name: "INTERACTIVE", label: "JEUX", href: "#", active: false },
  { name: "ARENA", label: "TOURNOIS", href: "#", active: false },
];

export default function TopBar() {
  return (
    // 👉 w-full = pleine largeur, h-8 = 32px de hauteur, bg-[#0D0D0D] = fond très sombre
    <div className="w-full h-8 bg-[#0D0D0D] border-b border-vea-gray-light/30 flex items-center px-4 lg:px-8">
      <div className="max-w-7xl mx-auto w-full flex items-center gap-2">
        {/* 👉 Label "ÉCOSYSTÈME VELITO" — visible seulement sur desktop (hidden sur mobile) */}
        <span className="hidden sm:inline text-[10px] uppercase tracking-widest text-vea-white/40 font-medium mr-3">
          Écosystème Velito :
        </span>

        {/* 👉 On boucle sur les modules pour générer les liens */}
        <div className="flex items-center gap-1 sm:gap-3">
          {MODULES.map((mod) => (
            <a
              key={mod.name}
              href={mod.active ? mod.href : undefined}
              className={`text-[10px] sm:text-[11px] uppercase tracking-wider font-medium transition-colors ${
                mod.active
                  ? // 👉 Module actif : texte rouge VEA, cliquable
                    "text-vea-red hover:text-vea-red/80 cursor-pointer"
                  : // 👉 Module inactif : grisé, pas cliquable
                    "text-vea-white/25 cursor-default"
              }`}
            >
              {mod.name}
              {/* 👉 Badge "soon" affiché seulement pour les modules inactifs, sur desktop */}
              {!mod.active && (
                <span className="hidden sm:inline ml-1 text-[8px] text-vea-white/15">
                  soon
                </span>
              )}
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
