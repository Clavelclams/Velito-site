/**
 * Écran Catégories d'une entité — Server Component.
 *
 * Charge le plan de catégories CÔTÉ SERVEUR (actives + archivées, car c'est
 * l'écran de gestion), puis délègue :
 *   - la saisie à <FormulaireCategorie> (client) ;
 *   - l'affichage + archivage à <ListeCategories> (client).
 * La page elle-même ne contient aucune logique métier : elle orchestre.
 *
 * L'entité a déjà été validée par le layout parent ; inutile de re-vérifier.
 */
import { listerCategories } from "@/lib/repositories/categories";
import { listerComptes } from "@/lib/repositories/comptes";
import { createClient } from "@/lib/supabase/server";
import { FormulaireCategorie } from "@/components/FormulaireCategorie";
import { ListeCategories } from "@/components/ListeCategories";

export default async function CategoriesPage({
  params,
}: {
  params: Promise<{ entiteId: string }>;
}) {
  const { entiteId } = await params;
  const supabase = await createClient();

  // false = on veut AUSSI les catégories archivées sur l'écran de gestion.
  const [categories, comptes] = await Promise.all([
    listerCategories(supabase, entiteId, false),
    listerComptes(supabase, entiteId, true), // comptes actifs pour le mapping
  ]);

  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Catégories</h2>
        <p className="mt-1 text-sm text-compta-text-muted">
          Les postes de recette et de dépense propres à cette structure. Une
          catégorie archivée disparaît de la saisie mais reste sur les
          transactions passées.
        </p>
      </div>

      <FormulaireCategorie entiteId={entiteId} comptes={comptes} />

      {categories.length === 0 ? (
        <p className="text-sm text-compta-text-muted">
          Aucune catégorie pour l&apos;instant. Ajoute-en une ci-dessus.
        </p>
      ) : (
        <ListeCategories categories={categories} entiteId={entiteId} />
      )}
    </section>
  );
}
