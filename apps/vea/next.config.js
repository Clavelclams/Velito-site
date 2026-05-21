/** @type {import('next').NextConfig} */
const nextConfig = {
  // Le lint ne bloque pas le build de prod (souci dev-time). Le type-check
  // TypeScript reste actif et bloque sur les vraies erreurs.
  eslint: { ignoreDuringBuilds: true },
};

export default nextConfig;
