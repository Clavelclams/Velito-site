/**
 * SERVICE IMPÔT SUR LES SOCIÉTÉS (IS) — calcul INDICATIF, pur (Bloc 5.5).
 *
 * Estime l'IS à partir du résultat comptable. ⚠️ INDICATIF : le résultat
 * FISCAL (réintégrations, déductions, déficits reportables…) diffère du
 * résultat comptable — ce calcul est une aide au pilotage, à valider par
 * l'expert-comptable. Ne s'applique qu'aux sociétés soumises à l'IS.
 *
 * Barème DATÉ (paramètre, jamais constante en dur) : les taux/seuils changent
 * à chaque loi de finances. Barème 2026 vérifié (impots.gouv / service-public) :
 *   - taux réduit 15 % jusqu'à 42 500 € de bénéfice (conditions PME) ;
 *   - taux normal 25 % au-delà.
 * NB : un amendement PLF 2026 propose de porter le seuil à 100 000 € — NON
 * confirmé à ce jour ; il suffira de changer `seuilTauxReduitCentimes`.
 *
 * Conditions du taux réduit (PME) non vérifiables par l'app : CA ≤ 10 M€,
 * capital entièrement libéré, détenu ≥ 75 % par des personnes physiques.
 * L'éligibilité est donc un paramètre déclaré par l'utilisateur.
 */

export interface BaremeIS {
  seuilTauxReduitCentimes: number;
  tauxReduit: number;
  tauxNormal: number;
  annee: number;
}

/** Barème 2026 (montants en centimes : 42 500 € = 4 250 000 c). */
export const BAREME_IS_2026: BaremeIS = {
  seuilTauxReduitCentimes: 4_250_000,
  tauxReduit: 0.15,
  tauxNormal: 0.25,
  annee: 2026,
};

export interface ResultatIS {
  baseCentimes: number; // bénéfice imposable (0 si perte)
  trancheReduiteCentimes: number;
  trancheNormaleCentimes: number;
  isReduitCentimes: number;
  isNormalCentimes: number;
  isTotalCentimes: number;
}

/**
 * Calcule l'IS indicatif.
 * @param resultatCentimes  résultat comptable (négatif = perte → IS nul).
 * @param eligibleTauxReduit  la société remplit-elle les conditions PME ?
 */
export function calculerIS(
  resultatCentimes: number,
  eligibleTauxReduit: boolean,
  bareme: BaremeIS = BAREME_IS_2026,
): ResultatIS {
  const base = Math.max(0, resultatCentimes); // pas d'IS sur une perte

  let trancheReduite = 0;
  let trancheNormale = 0;
  if (eligibleTauxReduit) {
    trancheReduite = Math.min(base, bareme.seuilTauxReduitCentimes);
    trancheNormale = Math.max(0, base - bareme.seuilTauxReduitCentimes);
  } else {
    trancheNormale = base;
  }

  // Math.round : l'IS se calcule au centime, on évite la poussière flottante.
  const isReduit = Math.round(trancheReduite * bareme.tauxReduit);
  const isNormal = Math.round(trancheNormale * bareme.tauxNormal);

  return {
    baseCentimes: base,
    trancheReduiteCentimes: trancheReduite,
    trancheNormaleCentimes: trancheNormale,
    isReduitCentimes: isReduit,
    isNormalCentimes: isNormal,
    isTotalCentimes: isReduit + isNormal,
  };
}

/** Acompte trimestriel indicatif (IS réparti en 4). */
export function acompteTrimestrielIS(isTotalCentimes: number): number {
  return Math.round(isTotalCentimes / 4);
}
