/**
 * Validation de l'adresse de retour après connexion (?return=…).
 *
 * [07/11/2026] Sorti de login/actions.ts pour être partagé par l'action de
 * connexion ET la page /login (qui renvoie directement un utilisateur déjà
 * connecté). Un fichier "use server" ne peut exporter que des fonctions
 * asynchrones : une fonction pure synchrone vit donc ici.
 *
 * Règle : on n'accepte qu'un chemin LOCAL ("/compte") ou une adresse d'un
 * sous-domaine Velito connu. Tout le reste retombe sur "/" (anti open-redirect).
 *
 * Correctif du 07/11 : "//site-pirate.com" commence bien par "/", mais le
 * navigateur le lit comme une adresse EXTERNE (URL relative au protocole).
 * Idem pour "/\site-pirate.com" (certains navigateurs changent \ en /).
 * Un vrai lien Velito pouvait donc renvoyer vers un faux site après connexion.
 */
export const ALLOWED_HOSTS = [
  "hub.velito.fr",
  "vea.velito.fr",
  "vena.velito.fr",
  "velito.fr",
  "interactive.velito.fr",
  "arena.velito.fr",
  "prevention.velito.fr",
  // [07/11/2026] « Se connecter avec Velito » depuis compta et cours.
  "compta.velito.fr",
  "cours.velito.fr",
];

export function safeReturnTo(raw: string | null | undefined): string {
  if (!raw) return "/";
  try {
    if (raw.startsWith("/")) {
      // Chemin local seulement : ni "//hote", ni "/\hote".
      return raw.startsWith("//") || raw.startsWith("/\\") ? "/" : raw;
    }
    const u = new URL(raw);
    if (u.protocol !== "https:" && u.protocol !== "http:") return "/";
    if (ALLOWED_HOSTS.includes(u.host) || u.host.endsWith(".localhost") || u.host === "localhost:3000") {
      return u.toString();
    }
  } catch {
    /* malformé, on retombe */
  }
  return "/";
}
