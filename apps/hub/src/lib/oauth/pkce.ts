/**
 * OAuth PKCE — RFC 7636.
 *
 * Le client génère un `code_verifier` (random ≥ 43 chars) et envoie son SHA256
 * en base64url comme `code_challenge` lors de l'authorize. Au moment du
 * /oauth/token, le client renvoie le verifier en clair. Le serveur recalcule
 * SHA256(verifier) et compare avec le challenge stocké. Si ça matche : le
 * client est bien celui qui a démarré le flow → pas une interception.
 *
 * Sans PKCE, un attaquant qui intercepte le code (via XSS, log, etc.) peut
 * échanger contre des tokens. Avec PKCE, il faudrait aussi qu'il intercepte
 * le verifier (qui reste en mémoire/sessionStorage du client légitime).
 *
 * On ACCEPTE UNIQUEMENT la méthode S256 (CHECK SQL dans oauth_authorization_codes).
 * On REJETTE 'plain' (insécure).
 */
import { createHash } from "node:crypto";

/**
 * Encode un buffer en base64url (RFC 4648 §5).
 * Différence avec base64 standard :
 *  - `+` → `-`
 *  - `/` → `_`
 *  - padding `=` retiré
 */
function base64urlEncode(buffer: Buffer): string {
  return buffer
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

/**
 * Vérifie que SHA256(verifier) en base64url === challenge stocké.
 * Retourne true si match, false sinon.
 */
export function verifyPkceChallenge(
  codeVerifier: string,
  storedChallenge: string
): boolean {
  if (!codeVerifier || codeVerifier.length < 43 || codeVerifier.length > 128) {
    // RFC 7636 §4.1 : verifier entre 43 et 128 caractères
    return false;
  }
  const hash = createHash("sha256").update(codeVerifier).digest();
  const computedChallenge = base64urlEncode(hash);
  return computedChallenge === storedChallenge;
}
