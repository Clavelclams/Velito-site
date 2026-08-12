/**
 * Barre de navigation publique, commune à toutes les pages.
 *
 * C'est ce qui manquait le plus : sans elle, un visiteur qui arrive par un QR
 * code sur /t/<token> ne voit ni le nom du site, ni où aller ensuite. Il ne
 * sait littéralement pas où il est.
 *
 * Choix de conception :
 *  - Collante en haut (`sticky`). Sur une page de bracket qui défile beaucoup,
 *    le retour à l'accueil doit rester à portée de pouce.
 *  - `backdrop-blur` + fond translucide : le contenu qui passe dessous reste
 *    deviné, ce qui donne de la profondeur sans ajouter d'ombre lourde.
 *  - AUCUN menu déroulant. Un menu hamburger demanderait du JavaScript client
 *    et un état ouvert/fermé. Avec quatre liens, on les affiche tous : sur
 *    téléphone les deux secondaires disparaissent (`hidden sm:inline`) et
 *    restent accessibles depuis le pied de page. Moins de code, rien à
 *    déboguer, et zéro piège d'accessibilité.
 */
import { MarqueArena } from "./Marque";

interface Props {
  /** `nuit` sur les fonds sombres (accueil), `clair` ailleurs. */
  variante?: "clair" | "nuit";
}

export default function EnteteSite({ variante = "clair" }: Props) {
  const nuit = variante === "nuit";

  return (
    <header
      className={`sticky top-0 z-40 border-b backdrop-blur-md ${
        nuit
          ? "border-white/10 bg-arena-nuit/80 text-white"
          : "border-arena-border bg-arena-bg/85 text-arena-ink"
      }`}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <a
          href="/"
          className={`shrink-0 ${nuit ? "text-white" : "text-arena-violet"}`}
          aria-label="ARENA, accueil"
        >
          <MarqueArena />
        </a>

        <nav
          className={`flex items-center gap-1 text-sm font-semibold ${
            nuit ? "text-white/80" : "text-arena-muted"
          }`}
        >
          <a
            href="/#tournois"
            className={`rounded-lg px-3 py-2 transition-colors ${
              nuit ? "hover:text-white" : "hover:text-arena-violet"
            }`}
          >
            Tournois
          </a>
          <a
            href="/classement"
            className={`rounded-lg px-3 py-2 transition-colors ${
              nuit ? "hover:text-white" : "hover:text-arena-violet"
            }`}
          >
            Classement
          </a>
          <a
            href="/reglement"
            className={`hidden rounded-lg px-3 py-2 transition-colors sm:inline-block ${
              nuit ? "hover:text-white" : "hover:text-arena-violet"
            }`}
          >
            Règlement
          </a>
          <a
            href="/admin"
            className={`ml-1 rounded-lg px-4 py-2 font-semibold transition-colors ${
              nuit
                ? "bg-white text-arena-nuit hover:bg-white/90"
                : "bg-arena-violet text-white hover:bg-arena-violet-fonce"
            }`}
          >
            <span className="hidden sm:inline">Espace organisateur</span>
            <span className="sm:hidden">Orga</span>
          </a>
        </nav>
      </div>
    </header>
  );
}
