"use client";

/**
 * Formulaire d'ajout d'une catégorie — composant CLIENT.
 *
 * "use client" car il gère de l'état local (le texte tapé, le type choisi, le
 * compte PCG, un éventuel message d'erreur) et réagit à la soumission. Il
 * n'accède JAMAIS à la base directement : il appelle la server action.
 *
 * Le sélecteur de compte (optionnel) relie la catégorie à un compte du plan
 * comptable : dépense → un compte de charge (classe 6), recette → un compte de
 * produit (classe 7). Sans choix, le pont retombe sur le compte par défaut.
 */
import { useMemo, useState, useTransition } from "react";
import type { Compte, TypeFlux } from "@/types/database";
import { creerCategorieAction } from "@/app/[entiteId]/categories/actions";

export function FormulaireCategorie({
  entiteId,
  comptes,
}: {
  entiteId: string;
  comptes: Compte[];
}) {
  const [nom, setNom] = useState("");
  const [type, setType] = useState<TypeFlux>("depense");
  const [compteId, setCompteId] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, demarrer] = useTransition();

  // Comptes proposés selon le type : charges (6) pour dépense, produits (7)
  // pour recette. On change de type ⇒ le compte choisi n'a plus de sens.
  const comptesDuType = useMemo(() => {
    const classe = type === "depense" ? 6 : 7;
    return comptes.filter((c) => c.classe === classe);
  }, [comptes, type]);

  function changerType(nouveau: TypeFlux) {
    setType(nouveau);
    setCompteId("");
  }

  function soumettre(e: React.FormEvent) {
    e.preventDefault();
    setErreur(null);
    demarrer(async () => {
      const r = await creerCategorieAction(entiteId, nom, type, compteId || null);
      if (r.success) {
        setNom("");
        setCompteId("");
      } else {
        setErreur(r.error ?? "Une erreur est survenue.");
      }
    });
  }

  const styleChamp =
    "w-full rounded-md border border-compta-border bg-white px-3 py-2 text-sm outline-none focus:border-compta-accent";

  return (
    <form
      onSubmit={soumettre}
      className="space-y-3 rounded-lg border border-compta-border bg-compta-surface p-4"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <label className="flex-1">
          <span className="mb-1 block text-sm font-medium">Nom</span>
          <input
            type="text"
            value={nom}
            onChange={(e) => setNom(e.target.value)}
            placeholder="ex : Subventions, Matériel informatique…"
            maxLength={60}
            className={styleChamp}
          />
        </label>

        <label>
          <span className="mb-1 block text-sm font-medium">Type</span>
          <select
            value={type}
            onChange={(e) => changerType(e.target.value as TypeFlux)}
            className={styleChamp}
          >
            <option value="depense">Dépense</option>
            <option value="recette">Recette</option>
          </select>
        </label>

        <label>
          <span className="mb-1 block text-sm font-medium">
            Compte PCG <span className="text-compta-text-muted">(optionnel)</span>
          </span>
          <select
            value={compteId}
            onChange={(e) => setCompteId(e.target.value)}
            className={styleChamp}
            disabled={comptes.length === 0}
          >
            <option value="">— par défaut —</option>
            {comptesDuType.map((c) => (
              <option key={c.id} value={c.id}>
                {c.numero} · {c.libelle}
              </option>
            ))}
          </select>
        </label>

        <button
          type="submit"
          disabled={enCours}
          className="rounded-md bg-compta-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-compta-accent-hover disabled:opacity-50"
        >
          {enCours ? "Ajout…" : "Ajouter"}
        </button>
      </div>

      {comptes.length === 0 && (
        <p className="text-xs text-compta-text-muted">
          Astuce : initialise le plan comptable (onglet Comptabilité) pour
          pouvoir rattacher un compte précis.
        </p>
      )}

      {erreur && (
        <p className="text-sm text-compta-depense" role="alert">
          {erreur}
        </p>
      )}
    </form>
  );
}
