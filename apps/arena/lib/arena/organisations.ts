/**
 * Sites des organisations qui créent des tournois (12/11/2026).
 *
 * La page publique d'un tournoi affiche « Organisé par … » avec un lien vers
 * le site de la structure. shared.organizations n'a pas (encore) de colonne
 * « site web » : on tient la liste ici, par slug. Une organisation absente
 * de la liste s'affiche sans lien, ce n'est pas une erreur.
 */
const SITES: Record<string, string> = {
  vea: "https://vea.velito.fr",
  vena: "https://velito.fr",
};

export function siteOrganisation(slug: string | null | undefined): string | null {
  return slug ? (SITES[slug] ?? null) : null;
}
