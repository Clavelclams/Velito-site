"use client";

/**
 * Liste des catégories d'une entité, groupées Recettes / Dépenses —
 * composant CLIENT (il porte le bouton activer/désactiver).
 *
 * L'archivage doux est ici : une catégorie désactivée reste affichée sur cet
 * écran de gestion (grisée), mais le repository l'exclut des formulaires de
 * saisie. On ne supprime jamais → l'historique comptable reste intègre.
 */
import { useState, useTransition } from "react";
import type { Categorie } from "@/types/database";
import { basculerActiviteAction } from "@/app/[entiteId]/categories/actions";

function GroupeCategories({
  titre,
  couleur,
  categories,
  entiteId,
}: {
  titre: string;
  couleur: string;
  categories: Categorie[];
  entiteId: string;
}) {
  return (
    <div>
      <h3 className={`mb-2 text-sm font-semibold ${couleur}`}>
        {titre} <span className="text-compta-text-muted">({categories.length})</span>
      </h3>
      {categories.length === 0 ? (
        <p className="text-sm text-compta-text-muted">Aucune catégorie.</p>
      ) : (
        <ul className="divide-y divide-compta-border rounded-md border border-compta-border bg-compta-surface">
          {categories.map((c) => (
            <LigneCategorie key={c.id} categorie={c} entiteId={entiteId} />
          ))}
        </ul>
      )}
    </div>
  );
}

function LigneCategorie({
  categorie,
  entiteId,
}: {
  categorie: Categorie;
  entiteId: string;
}) {
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, demarrer] = useTransition();

  function basculer() {
    setErreur(null);
    demarrer(async () => {
      const r = await basculerActiviteAction(entiteId, categorie.id, !categorie.active);
      if (!r.success) setErreur(r.error ?? "Erreur.");
    });
  }

  return (
    <li className="flex items-center justify-between px-3 py-2 text-sm">
      <span className={categorie.active ? "" : "text-compta-text-muted line-through"}>
        {categorie.nom}
        {!categorie.active && (
          <span className="ml-2 rounded bg-compta-bg px-1.5 py-0.5 text-xs text-compta-text-muted">
            archivée
          </span>
        )}
      </span>
      <div className="flex items-center gap-3">
        {erreur && <span className="text-xs text-compta-depense">{erreur}</span>}
        <button
          type="button"
          onClick={basculer}
          disabled={enCours}
          className="text-xs text-compta-text-muted underline-offset-2 transition-colors hover:text-compta-accent hover:underline disabled:opacity-50"
        >
          {categorie.active ? "Archiver" : "Réactiver"}
        </button>
      </div>
    </li>
  );
}

export function ListeCategories({
  categories,
  entiteId,
}: {
  categories: Categorie[];
  entiteId: string;
}) {
  const recettes = categories.filter((c) => c.type === "recette");
  const depenses = categories.filter((c) => c.type === "depense");

  return (
    <div className="grid gap-6 sm:grid-cols-2">
      <GroupeCategories
        titre="Recettes"
        couleur="text-compta-recette"
        categories={recettes}
        entiteId={entiteId}
      />
      <GroupeCategories
        titre="Dépenses"
        couleur="text-compta-depense"
        categories={depenses}
        entiteId={entiteId}
      />
    </div>
  );
}
