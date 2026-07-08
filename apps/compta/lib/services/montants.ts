/**
 * SERVICE MONTANTS — couche logique métier.
 *
 * LE SEUL endroit de l'application où l'on convertit centimes ↔ euros.
 * Toute la base travaille en centimes entiers (voir sql/01, table transaction) ;
 * l'utilisateur, lui, tape et lit des euros ("12,50"). Ce fichier est la
 * frontière entre les deux mondes — dans les DEUX sens (saisie et affichage).
 *
 * Point crucial (à défendre au jury) : le parsing d'une saisie utilisateur se
 * fait par ANALYSE DE TEXTE, jamais par parseFloat. parseFloat("12,50") vaut
 * 12 (il s'arrête à la virgule) et parseFloat("12.10") * 100 vaut
 * 1209.9999999999998 (flottant binaire). Ici on découpe la chaîne en partie
 * entière + partie décimale et on ne fait QUE des opérations entières :
 * aucun nombre à virgule flottante ne transporte jamais un montant.
 *
 * Fonctions pures : pas d'accès base, pas d'état → testables unitairement
 * (voir montants.test.ts).
 */

/**
 * Convertit une saisie utilisateur en centimes.
 * Accepte les formats français et internationaux :
 *   "12,50" → 1250   "1 234,56" → 123456   "12.50" → 1250   "12" → 1200
 * Renvoie null si la saisie n'est pas un montant valide (l'appelant décide
 * du message d'erreur — le service ne fait pas d'affichage).
 */
export function eurosVersCentimes(saisie: string): number | null {
  // 1. Nettoyage : espaces (dont insécables et fines que colle le format
  //    français "1 234,56"), symbole €, espaces de bord.
  const nettoye = saisie
    .replace(/[\s  ]/g, "")
    .replace(/€/g, "")
    .replace(",", ".");

  // 2. Validation stricte : chiffres, point optionnel, 1 ou 2 décimales max.
  //    Pas de signe : un montant est toujours positif, c'est `type`
  //    (recette/depense) qui porte le sens (décision du schéma SQL).
  if (!/^\d+(\.\d{1,2})?$/.test(nettoye)) {
    return null;
  }

  // 3. Découpage TEXTE (aucune arithmétique flottante).
  const [partieEuros, partieCentimes = ""] = nettoye.split(".");

  // "5" → "50" (12.5 = 12 euros 50 centimes), "05" reste "05".
  const centimesTexte = partieCentimes.padEnd(2, "0");

  const total = Number(partieEuros) * 100 + Number(centimesTexte);

  // 4. Garde-fou : au-delà de 2^53, un number JS perd l'exactitude entière.
  return Number.isSafeInteger(total) ? total : null;
}

/**
 * Formate des centimes pour l'affichage : 123456 → "1 234,56 €".
 * Intl.NumberFormat gère les espaces insécables, la virgule française et le
 * symbole — on ne réinvente pas le formatage monétaire à la main.
 */
const formateurEuro = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
});

export function formaterCentimes(centimes: number): string {
  // Division par 100 UNIQUEMENT pour l'affichage, en toute fin de chaîne.
  // (L'éventuelle imprécision flottante ici est < 0,000000001 centime et
  // Intl arrondit à 2 décimales : aucun impact visible ni stocké.)
  return formateurEuro.format(centimes / 100);
}

/**
 * Convertit des centimes en une saisie ÉDITABLE : 1250 → "12,50".
 * Sert à PRÉ-REMPLIR un champ de formulaire en mode édition. Différent de
 * formaterCentimes : ici pas de symbole € ni d'espace milliers — juste ce
 * qu'on retaperait dans l'input, et que eurosVersCentimes saura relire.
 * Conversion 100 % entière (aucun flottant ne transporte le montant).
 */
export function centimesVersSaisie(centimes: number): string {
  const negatif = centimes < 0;
  const abs = Math.abs(centimes);
  const euros = Math.trunc(abs / 100);
  const cent = abs % 100;
  const texte = `${euros},${String(cent).padStart(2, "0")}`;
  return negatif ? `-${texte}` : texte;
}

/**
 * Un montant en centimes est-il stockable ?
 * Miroir applicatif des contraintes SQL (montant > 0, entier).
 * Vérifié AVANT l'insert pour afficher une erreur propre à l'utilisateur —
 * la base reste le dernier rempart si ce code est contourné.
 */
export function estMontantValide(centimes: number): boolean {
  return Number.isSafeInteger(centimes) && centimes > 0;
}

/**
 * La TVA est-elle cohérente avec le TTC ?
 * Miroir de la contrainte SQL `tva_coherente` (0 ≤ TVA ≤ TTC).
 */
export function estTvaCoherente(tvaCentimes: number, ttcCentimes: number): boolean {
  return Number.isSafeInteger(tvaCentimes) && tvaCentimes >= 0 && tvaCentimes <= ttcCentimes;
}
