/**
 * Génération CSV — le cœur de la promesse d'interopérabilité.
 *
 * Doctrine de complémentarité (actée le 15/08) : « un club doit pouvoir
 * tester ARENA sur UN tournoi sans rien migrer et repartir sans rien
 * perdre ». Ce module est la moitié « repartir » de cette phrase — et c'est
 * précisément ce que les plateformes pro font payer (accès API Toornament :
 * 229 €/mois minimum). Chez nous, un lien.
 *
 * Choix de format, à savoir défendre :
 *
 *  - SÉPARATEUR « ; » : le public visé ouvre le fichier dans Excel/LibreOffice
 *    configuré en français, où la virgule est le séparateur DÉCIMAL. Un CSV à
 *    virgules s'ouvre en une seule colonne illisible ; un CSV à point-virgule
 *    s'ouvre juste. On optimise pour l'orga d'asso, pas pour un parseur.
 *
 *  - BOM UTF-8 en tête : sans lui, Excel Windows lit le fichier en latin-1 et
 *    transforme « Aurélie » en « AurÃ©lie ». Trois octets qui évitent des
 *    accents cassés — invisible pour tous les autres outils.
 *
 *  - Échappement RFC 4180 : un champ contenant le séparateur, un guillemet ou
 *    un saut de ligne est entouré de guillemets, et ses guillemets doublés.
 *    Un pseudo « L";DROP » ne cassera ni le fichier ni autre chose.
 *
 * Module pur, testé : la génération n'a pas le droit d'être « à peu près ».
 */

export const SEPARATEUR_CSV = ";";

/** Byte Order Mark UTF-8 — voir le commentaire d'en-tête. */
export const BOM_UTF8 = "\uFEFF";

/** Échappe UN champ selon RFC 4180 (adapté au séparateur « ; »). */
export function echapperChampCsv(valeur: string): string {
  const doitCiter =
    valeur.includes(SEPARATEUR_CSV) ||
    valeur.includes('"') ||
    valeur.includes("\n") ||
    valeur.includes("\r");
  return doitCiter ? `"${valeur.replace(/"/g, '""')}"` : valeur;
}

/**
 * Assemble un CSV complet (BOM inclus) à partir de lignes de champs bruts.
 * CRLF en fin de ligne : c'est ce que la RFC prescrit et ce qu'Excel préfère.
 */
export function genererCsv(lignes: readonly (readonly string[])[]): string {
  return (
    BOM_UTF8 +
    lignes
      .map((l) => l.map(echapperChampCsv).join(SEPARATEUR_CSV))
      .join("\r\n") +
    "\r\n"
  );
}

/**
 * En-têtes HTTP d'une réponse CSV téléchargeable.
 * `filename*` (RFC 5987) couvre les noms accentués ; `filename` reste en
 * secours pour les vieux clients.
 */
export function entetesCsv(nomFichier: string): HeadersInit {
  const ascii = nomFichier.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  return {
    "Content-Type": "text/csv; charset=utf-8",
    "Content-Disposition": `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(nomFichier)}`,
    // Un export reflète l'instant où on clique : jamais de cache partagé.
    "Cache-Control": "no-store",
  };
}
