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

/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [{ source: "/(.*)", headers: enTetesSecurite }];
  },
};

export default nextConfig;
