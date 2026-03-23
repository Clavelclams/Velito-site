/**
 * Footer — Pied de page VEA
 * Contiendra les liens utiles, réseaux sociaux, mentions légales
 * Pour l'instant : placeholder avec structure de base
 */
export default function Footer() {
  return (
    <footer className="w-full bg-vea-gray border-t border-vea-gray-light py-8 px-4">
      <div className="max-w-7xl mx-auto text-center text-sm text-vea-white/60">
        <p>&copy; {new Date().getFullYear()} VEA — Velito Esport Amiens. Tous droits réservés.</p>
      </div>
    </footer>
  );
}
