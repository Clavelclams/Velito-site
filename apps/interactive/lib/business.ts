/**
 * Validation des SIRET / SIREN françaises.
 *
 * Pas de call API externe : on valide juste le format + l'algorithme Luhn
 * modifié français (la "Coda" pour SIREN, Luhn standard pour SIRET).
 *
 * Pour la vraie vérification du nom de l'établissement, il faut l'API
 * Sirene de l'INSEE — à brancher en V2.
 */

/** Normalise une saisie : ne garde que les chiffres. */
export function normalizeSiret(raw: string): string {
  return raw.replace(/\D/g, "");
}

/**
 * Valide un SIREN (9 chiffres) avec l'algorithme Luhn standard.
 *
 *  - Multiplie 1 chiffre sur 2 (en partant de la droite, le 2e) par 2
 *  - Si le résultat > 9, on lui soustrait 9
 *  - La somme doit être un multiple de 10
 *
 * Exemples : 552 100 554 (Total SA) → valide
 */
export function isValidSiren(siren: string): boolean {
  const cleaned = normalizeSiret(siren);
  if (cleaned.length !== 9) return false;

  let sum = 0;
  for (let i = 0; i < 9; i++) {
    let digit = parseInt(cleaned[i]!, 10);
    if (isNaN(digit)) return false;
    // L'index pair (0-indexed) côté gauche correspond aux positions paires
    // en partant de la droite (8, 6, 4, 2, 0). Le Luhn classique multiplie
    // par 2 un chiffre sur deux EN PARTANT DE LA DROITE.
    // En itération depuis la gauche : si (9 - i) est pair → on multiplie
    if ((9 - i) % 2 === 0) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
  }
  return sum % 10 === 0;
}

/**
 * Valide un SIRET (14 chiffres).
 *
 *  - Les 9 premiers chiffres = SIREN (doit être valide)
 *  - Les 14 chiffres totaux doivent être Luhn-valides aussi
 *  - Cas spécial : "La Poste" siret 356 000 000 XX XXX — exception réelle
 *    qui ne respecte pas Luhn. On l'accepte explicitement.
 */
export function isValidSiret(siret: string): boolean {
  const cleaned = normalizeSiret(siret);
  if (cleaned.length !== 14) return false;

  // Vérif SIREN
  const siren = cleaned.substring(0, 9);
  if (!isValidSiren(siren)) return false;

  // Exception La Poste : tous leurs SIRETs commencent par 356000000
  if (cleaned.startsWith("356000000")) return true;

  // Luhn sur les 14 chiffres
  let sum = 0;
  for (let i = 0; i < 14; i++) {
    let digit = parseInt(cleaned[i]!, 10);
    if (isNaN(digit)) return false;
    if ((14 - i) % 2 === 0) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
  }
  return sum % 10 === 0;
}

/**
 * Extrait le SIREN à partir d'un SIRET valide.
 * Retourne null si SIRET invalide.
 */
export function sirenFromSiret(siret: string): string | null {
  if (!isValidSiret(siret)) return null;
  return normalizeSiret(siret).substring(0, 9);
}

/**
 * Lookup d'un SIRET via l'API publique du gouvernement (gratuite, sans clé).
 *
 *   https://recherche-entreprises.api.gouv.fr/search?q=<siret>
 *
 * Permet de vérifier qu'un SIRET existe vraiment et de récupérer le NOM
 * de l'établissement. Anti-fraude essentielle : si un mec saisit le SIRET
 * d'une boîte qui n'est pas la sienne, on lui affiche le nom AVANT de
 * valider → "Tu actives l'essai pour TOTAL SA ?" — psychologiquement
 * dissuasif.
 *
 * Retourne `null` si SIRET introuvable.
 */
export async function lookupSiretInsee(siret: string): Promise<{
  siret: string;
  siren: string;
  /** Nom commercial ou raison sociale. */
  name: string;
  /** Activité principale (NAF). */
  activity?: string;
  /** Adresse. */
  address?: string;
  /** Code postal + ville. */
  city?: string;
  /** True si l'établissement est fermé. */
  isClosed: boolean;
} | null> {
  const cleaned = normalizeSiret(siret);
  if (cleaned.length !== 14) return null;

  try {
    const url = `https://recherche-entreprises.api.gouv.fr/search?q=${cleaned}&page=1&per_page=1`;
    const res = await fetch(url, {
      headers: { Accept: "application/json" },
      // Cache 1h côté Next pour ne pas spammer l'API
      next: { revalidate: 3600 },
    });
    if (!res.ok) return null;

    const data = (await res.json()) as {
      results?: Array<{
        siren: string;
        nom_complet?: string;
        nom_raison_sociale?: string;
        activite_principale?: string;
        matching_etablissements?: Array<{
          siret: string;
          adresse?: string;
          code_postal?: string;
          libelle_commune?: string;
          etat_administratif?: string;
        }>;
      }>;
    };

    const result = data.results?.[0];
    if (!result) return null;

    // Cherche l'établissement qui correspond au SIRET demandé
    const etab = result.matching_etablissements?.find((e) => e.siret === cleaned);

    return {
      siret: cleaned,
      siren: result.siren,
      name: result.nom_complet ?? result.nom_raison_sociale ?? "(nom inconnu)",
      activity: result.activite_principale,
      address: etab?.adresse,
      city: etab ? `${etab.code_postal ?? ""} ${etab.libelle_commune ?? ""}`.trim() : undefined,
      isClosed: etab?.etat_administratif === "F",
    };
  } catch (e) {
    console.warn("[lookupSiretInsee] error:", e);
    return null;
  }
}
