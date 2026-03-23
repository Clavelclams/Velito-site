/**
 * TopBar — Barre supérieure de l'écosystème Velito
 * Permet de naviguer entre les différentes apps (VEA, Hub, VENA, Arena, Interactive)
 * Pour l'instant : placeholder vide, sera développé plus tard
 */
export default function TopBar() {
  return (
    <div className="w-full bg-vea-black border-b border-vea-gray-light py-2 px-4">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <span className="text-xs text-vea-white/60">Velito Écosystème</span>
      </div>
    </div>
  );
}
