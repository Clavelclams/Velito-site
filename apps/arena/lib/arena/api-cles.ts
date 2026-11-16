/**
 * Clés de l'API publique : génération, empreinte, lecture des en-têtes.
 * Module pur (seulement node:crypto), testé (14/11/2026).
 *
 * Choix défendables :
 *  - 32 octets aléatoires (256 bits) encodés en base64url : impossible à
 *    deviner, et sans caractère qui pose problème dans un en-tête HTTP.
 *  - Préfixe « arena_ » : un développeur reconnaît la clé dans son code, et
 *    les outils de détection de secrets (GitHub secret scanning…) peuvent la
 *    repérer si elle est poussée par erreur dans un dépôt public.
 *  - On ne stocke que l'empreinte SHA-256. Pas de bcrypt ici : bcrypt sert à
 *    ralentir l'attaque d'un mot de passe FAIBLE ; une clé de 256 bits n'a
 *    rien à ralentir, et l'empreinte rapide permet la recherche par index.
 *  - La clé se lit dans un EN-TÊTE, jamais dans l'URL : une URL finit dans
 *    les journaux des serveurs, l'historique du navigateur, les en-têtes
 *    Referer.
 */
import { createHash, randomBytes } from "node:crypto";

export const PREFIXE_CLE = "arena_";
export const LIMITE_PAR_MINUTE = 120;

const FORMAT_CLE = /^arena_[A-Za-z0-9_-]{43}$/;

export function genererCle(): string {
  return PREFIXE_CLE + randomBytes(32).toString("base64url");
}

export function formatCleValide(cle: string): boolean {
  return FORMAT_CLE.test(cle);
}

export function empreinteCle(cle: string): string {
  return createHash("sha256").update(cle, "utf8").digest("hex");
}

/** Les 12 premiers caractères : assez pour reconnaître une clé, inutilisable seul. */
export function prefixeAffiche(cle: string): string {
  return cle.slice(0, 12);
}

/** Nom donné par le staff (« Site du club »). null si invalide. */
export function nomCleValide(nom: string): string | null {
  const propre = nom.replace(/\s+/g, " ").trim();
  return propre.length >= 2 && propre.length <= 60 ? propre : null;
}

/**
 * Lit la clé dans `Authorization: Bearer arena_…` ou `X-Api-Key: arena_…`.
 * Rend null si absente ou mal formée (on ne va pas jusqu'à la base pour une
 * clé dont la forme est déjà fausse).
 */
export function extraireCle(entetes: Headers): string | null {
  const auth = entetes.get("authorization");
  let cle: string | null = null;
  if (auth) {
    const m = /^Bearer\s+(\S+)$/i.exec(auth.trim());
    cle = m ? m[1]! : null;
  }
  if (!cle) cle = entetes.get("x-api-key")?.trim() ?? null;
  return cle && formatCleValide(cle) ? cle : null;
}

/** Paramètre entier borné d'une URL (`?limite=20`). Valeur absente ou
 *  invalide → défaut ; trop grande → plafonnée. Jamais d'erreur. */
export function entierBorne(valeur: string | null, defaut: number, min: number, max: number): number {
  if (valeur === null || !/^\d+$/.test(valeur)) return defaut;
  return Math.min(max, Math.max(min, Number(valeur)));
}
