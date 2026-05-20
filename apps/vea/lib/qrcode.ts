/**
 * lib/qrcode.ts — Helper pour generer une URL de QR code.
 *
 * Strategie : on utilise l'API publique https://api.qrserver.com/ qui est :
 *   - Gratuite (sans inscription)
 *   - Rapide (<200ms typique)
 *   - Stable (depuis 2013+)
 *   - Genere une image PNG depuis n'importe quelle URL
 *
 * Alternative future : npm install qrcode + generation locale (plus de
 * dependance externe). Pour V1 on garde simple.
 *
 * Usage :
 *   const qrUrl = getQRCodeUrl(`https://vea.velito.fr/scan/${event.token}`);
 *   <img src={qrUrl} alt="QR code event" />
 */

const QR_API_BASE = "https://api.qrserver.com/v1/create-qr-code/";

/**
 * Genere l'URL d'une image PNG QR code pour un contenu donne.
 *
 * @param data - Texte ou URL a encoder
 * @param size - Taille en pixels (default 300)
 * @returns URL d'une image PNG du QR code
 */
export function getQRCodeUrl(data: string, size = 300): string {
  const encoded = encodeURIComponent(data);
  return `${QR_API_BASE}?size=${size}x${size}&data=${encoded}&margin=10`;
}

/**
 * Genere l'URL complete /scan a encoder dans le QR.
 * Tient compte de l'environnement (dev vs prod).
 */
export function getScanUrl(token: string, origin?: string): string {
  // En SSR on n'a pas window.location.origin. Le caller (Server Component)
  // peut passer la valeur depuis headers ou config. Par defaut on assume
  // vea.velito.fr (prod). Pour dev/test on accepte un origin custom.
  const base = origin ?? "https://vea.velito.fr";
  return `${base}/scan/${token}`;
}
