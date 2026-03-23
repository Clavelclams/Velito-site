/**
 * Navbar — Navigation principale du site VEA
 * Liens : Accueil, L'association, Événements, Esport, Partenaires, Contact
 * Pour l'instant : placeholder avec structure de base
 */
import Link from "next/link";

export default function Navbar() {
  return (
    <nav className="w-full bg-vea-gray py-4 px-4">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <Link href="/" className="text-vea-red font-bold text-xl">
          VEA
        </Link>
        <div className="flex gap-6 text-sm text-vea-white">
          <Link href="/association" className="hover:text-vea-red transition-colors">
            L&apos;association
          </Link>
          <Link href="/evenements" className="hover:text-vea-red transition-colors">
            Événements
          </Link>
          <Link href="/esport" className="hover:text-vea-red transition-colors">
            Esport
          </Link>
          <Link href="/partenaires" className="hover:text-vea-red transition-colors">
            Partenaires
          </Link>
          <Link href="/contact" className="hover:text-vea-red transition-colors">
            Contact
          </Link>
        </div>
      </div>
    </nav>
  );
}
