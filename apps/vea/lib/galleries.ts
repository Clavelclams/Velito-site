/**
 * Source unique : quels events (slug Supabase) ont une galerie photos dans /medias.
 * Utilise par l'agenda (bouton "Voir les photos" sur la card) ET par la page
 * bilan public /agenda/[slug] (meme bouton). Evite les liens morts vers une
 * galerie vide. Ajoute ici le slug d'un event quand tu lui ajoutes des photos.
 */
export const GALLERY_EVENT_SLUGS = new Set<string>([
  "ljsdlp-2026",
]);

export function hasGallery(slug: string | null | undefined): boolean {
  return !!slug && GALLERY_EVENT_SLUGS.has(slug);
}
