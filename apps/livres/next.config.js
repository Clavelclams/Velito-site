/**
 * Configuration Next.js — Boîtes à livres (livres.velito.fr).
 *
 * Mêmes en-têtes de sécurité qu'ARENA (voir apps/arena/next.config.js pour le
 * détail de chacun), avec une différence : la géolocalisation est AUTORISÉE
 * pour ce site seul (geolocation=(self)), parce que « trouver la boîte la
 * plus proche de moi » est la fonction principale. La position ne quitte
 * jamais le téléphone : elle sert à centrer la carte, rien n'est envoyé.
 */
const enTetesSecurite = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
  { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(self)" },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [{ source: "/(.*)", headers: enTetesSecurite }];
  },
};

export default nextConfig;
