/**
 * Configuration Next.js — ARENA.
 *
 * En-têtes de sécurité (audit du 06/09/2026 : aucune des 8 apps n'en
 * envoyait). Chacun ferme une classe d'attaque précise :
 *
 *  - X-Frame-Options / frame-ancestors : personne ne peut embarquer
 *    l'espace orga dans une iframe invisible pour faire cliquer le staff à
 *    son insu (clickjacking). Les widgets embarquables prévus par la
 *    doctrine de complémentarité auront LEUR propre route avec un en-tête
 *    permissif — ils ne sont pas encore écrits.
 *  - Strict-Transport-Security : le navigateur refuse le HTTP en clair pour
 *    ce domaine pendant un an, sous-domaines compris (le cookie de session
 *    Velito circule sur .velito.fr).
 *  - Referrer-Policy : l'URL d'un tournoi contient son qr_token ; on ne
 *    l'envoie pas en clair à un site tiers quand un joueur clique un lien
 *    sortant (tracker.gg, op.gg…).
 *  - X-Content-Type-Options : un export CSV n'est jamais « deviné » en HTML.
 *  - Permissions-Policy : ni caméra, ni micro, ni géolocalisation — l'app
 *    n'en a pas besoin, autant le dire au navigateur.
 *
 * Pas de Content-Security-Policy stricte pour l'instant : elle demande un
 * nonce par requête et un inventaire des scripts, c'est un chantier à part.
 * Les cinq en-têtes ci-dessus ne cassent rien et ferment l'essentiel.
 */
const enTetesSecurite = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
  { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

/**
 * [12/11/2026] Le widget (/widget/...) est la SEULE route intégrable en
 * iframe : mêmes en-têtes, sauf X-Frame-Options retiré et frame-ancestors
 * ouvert à tous les sites. Sans risque de clickjacking : la page widget n'a
 * aucun bouton ni formulaire, il n'y a rien à faire cliquer.
 * Toutes les autres routes gardent DENY, y compris l'espace orga.
 */
const enTetesWidget = [
  { key: "Content-Security-Policy", value: "frame-ancestors *" },
  ...enTetesSecurite.filter(
    (e) => e.key !== "X-Frame-Options" && e.key !== "Content-Security-Policy"
  ),
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [
      // Tout sauf /widget : règle stricte. Les deux règles ne se recouvrent
      // pas, sinon Next enverrait les deux en-têtes et le navigateur
      // appliquerait le plus strict (DENY).
      { source: "/((?!widget/).*)", headers: enTetesSecurite },
      { source: "/widget/:path*", headers: enTetesWidget },
    ];
  },
};

export default nextConfig;
