/**
 * Identité de marque ARENA : le symbole Velito et le bloc-marque complet.
 *
 * Le symbole vient de `apps/hub/public/vena-symbole.svg`, déjà utilisé par le
 * Hub. Il est repris ICI EN LIGNE plutôt que chargé comme fichier, pour deux
 * raisons concrètes :
 *  - `fill="currentColor"` permet au symbole de prendre la couleur du texte
 *    qui l'entoure. Le même composant sert donc en violet sur fond blanc et en
 *    blanc sur fond nuit, sans dupliquer un second fichier.
 *  - un SVG en ligne n'est pas une requête réseau de plus, et il ne peut pas
 *    apparaître en retard sur un logo, ce qui donne toujours un effet amateur.
 *
 * Le fichier d'origine contient un `fill:#FFFFFF` en dur dans une balise
 * <style>. On l'a retiré : une couleur figée dans un logo est exactement ce
 * qui empêche de le réutiliser ailleurs.
 */

interface Props {
  className?: string;
}

/** Le symbole seul (chaîne de cercles Velito). */
export function SymboleVelito({ className = "h-8 w-8" }: Props) {
  return (
    <svg
      viewBox="0 0 1000 1000"
      className={className}
      fill="currentColor"
      aria-hidden
    >
      <path d="M500.1,370.3c0,35.9-29.1,65-65,65s-65-29.1-65-65s-29.1-65-65-65s-65-29.1-65-65s-29.1-65-65-65s-65-29.1-65-65s29.1-65,65-65s65,29.1,65,65s29.1,65,65,65s65,29.1,65,65s29.1,65,65,65S500.1,334.4,500.1,370.3z" />
      <path d="M890,110.4c0,35.9-29.1,65-65,65s-65,29.1-65,65s-29.1,65-65,65s-65,29.1-65,65s-29.1,65-65,65c-35.9,0-65-29.1-65-65s29.1-65,65-65c35.9,0,65-29.1,65-65s29.1-65,65-65s65-29.1,65-65s29.1-65,65-65S890,74.5,890,110.4z" />
      <circle cx="175.3" cy="500.2" r="65" />
      <circle cx="305.2" cy="500.2" r="65" />
      <circle cx="435.2" cy="500.2" r="65" />
      <circle cx="565.1" cy="500.2" r="65" />
      <path d="M500.1,630.1c0,35.9-29.1,65-65,65s-65,29.1-65,65s-29.1,65-65,65s-65,29.1-65,65s-29.1,65-65,65s-65-29.1-65-65s29.1-65,65-65s65-29.1,65-65s29.1-65,65-65s65-29.1,65-65c0-35.9,29.1-65,65-65S500.1,594.3,500.1,630.1z" />
      <path d="M890,890c0,35.9-29.1,65-65,65s-65-29.1-65-65s-29.1-65-65-65s-65-29.1-65-65s-29.1-65-65-65c-35.9,0-65-29.1-65-65c0-35.9,29.1-65,65-65c35.9,0,65,29.1,65,65c0,35.9,29.1,65,65,65s65,29.1,65,65s29.1,65,65,65S890,854.1,890,890z" />
      <circle cx="695.1" cy="500.2" r="65" />
      <circle cx="825" cy="500.2" r="65" />
    </svg>
  );
}

/**
 * Bloc-marque : symbole + « ARENA » + la mention Velito.
 * `taille` change l'échelle sans dupliquer le balisage.
 */
export function MarqueArena({
  taille = "normale",
  avecMention = true,
}: {
  taille?: "normale" | "grande";
  avecMention?: boolean;
}) {
  const grande = taille === "grande";
  return (
    <span className="inline-flex items-center gap-3">
      <SymboleVelito className={grande ? "h-12 w-12" : "h-8 w-8"} />
      <span className="leading-none">
        <span
          className={`block font-titre font-bold tracking-tight ${
            grande ? "text-4xl sm:text-5xl" : "text-xl"
          }`}
        >
          ARENA
        </span>
        {avecMention && (
          <span
            className={`block font-corps font-medium uppercase tracking-[0.18em] opacity-70 ${
              grande ? "mt-1.5 text-xs" : "mt-0.5 text-[10px]"
            }`}
          >
            par Velito
          </span>
        )}
      </span>
    </span>
  );
}
