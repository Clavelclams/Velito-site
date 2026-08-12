/**
 * Pied de page commun. Fond nuit volontaire : il ferme visuellement la page et
 * casse la monotonie d'un site entièrement blanc. C'est la même logique que le
 * bandeau d'accueil, en miroir.
 *
 * Il porte aussi les liens de conformité (règlement, prévention) qui doivent
 * rester atteignables depuis n'importe quelle page, y compris celles ouvertes
 * directement par un QR code.
 */
import { MarqueArena } from "./Marque";

const COLONNES = [
  {
    titre: "Compétition",
    liens: [
      { href: "/#tournois", texte: "Tous les tournois" },
      { href: "/classement", texte: "Classement des joueurs" },
      { href: "/reglement", texte: "Règlement" },
    ],
  },
  {
    titre: "L'association",
    liens: [
      { href: "/prevention", texte: "Esport responsable" },
      { href: "/admin", texte: "Espace organisateur" },
      { href: "https://velito.fr", texte: "Écosystème Velito" },
    ],
  },
];

export default function PiedSite() {
  return (
    <footer className="bg-arena-nuit text-white">
      <div className="mx-auto max-w-6xl px-4 py-12">
        <div className="flex flex-col gap-10 sm:flex-row sm:justify-between">
          <div className="max-w-sm">
            <MarqueArena />
            <p className="mt-4 text-sm leading-relaxed text-white/70">
              L&apos;outil de tournoi des associations, clubs et maisons de
              quartier d&apos;Amiens. Esport et sport physique. Gratuit, sans
              commission, sans revente de données.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-8 sm:gap-14">
            {COLONNES.map((colonne) => (
              <div key={colonne.titre}>
                <p className="text-xs font-bold uppercase tracking-widest text-white/50">
                  {colonne.titre}
                </p>
                <ul className="mt-3 space-y-2 text-sm">
                  {colonne.liens.map((lien) => (
                    <li key={lien.href}>
                      <a
                        href={lien.href}
                        className="text-white/80 underline-offset-4 hover:text-white hover:underline"
                      >
                        {lien.texte}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <p className="mt-10 border-t border-white/10 pt-6 text-xs text-white/50">
          ARENA est un module de l&apos;écosystème Velito, Amiens (Hauts-de-France).
        </p>
      </div>
    </footer>
  );
}
