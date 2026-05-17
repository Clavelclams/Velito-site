/**
 * Liste alternative accessible aux 9 modules Velito.
 *
 * Pourquoi ce composant existe :
 *   - Le canvas WebGL est totalement invisible aux lecteurs d'écran et au clavier.
 *   - Sans alternative, un utilisateur non-voyant ne peut PAS naviguer vers
 *     les pages des modules depuis la home.
 *   - Critère WCAG 2.1 AA : 1.1.1 (contenu non textuel) + 2.1.1 (accessibilité clavier).
 *
 * Comportement visuel :
 *   - Cachée par défaut (sr-only) pour ne pas polluer l'UX visuelle.
 *   - Au premier Tab du clavier, elle apparaît en haut à gauche (focus-within:not-sr-only).
 *   - Toujours rendue dans le DOM — desktop ET mobile, animation OU reduced-motion.
 *
 * Liens :
 *   - URLs externes (commençant par http) → target="_blank" + rel sécurité standard
 *   - URLs internes (/construction?...) → navigation native dans le même onglet
 */

import { modules } from "./modules";

export default function ModulesList() {
  return (
    <ul
      aria-label="Modules de l'écosystème Velito"
      className="sr-only focus-within:not-sr-only focus-within:fixed focus-within:top-4 focus-within:left-4 focus-within:right-4 focus-within:bg-[#04040e] focus-within:border focus-within:border-white/20 focus-within:p-4 focus-within:rounded-lg focus-within:z-50 focus-within:max-w-md focus-within:shadow-xl"
    >
      {modules.map((module) => {
        const isExternal = module.url.startsWith("http");
        return (
          <li key={module.slug} className="mb-2 last:mb-0">
            <a
              href={module.url}
              target={isExternal ? "_blank" : undefined}
              rel={isExternal ? "noopener noreferrer" : undefined}
              className="block p-2 rounded hover:bg-white/5 focus:outline-none focus:ring-2 focus:ring-white"
              style={{ borderLeft: `3px solid ${module.accent}` }}
            >
              <span className="block font-orbitron font-bold text-white">
                {module.name}
              </span>
              <span className="block text-sm text-white/70 mt-1">
                {module.tagline}
              </span>
            </a>
          </li>
        );
      })}
    </ul>
  );
}
