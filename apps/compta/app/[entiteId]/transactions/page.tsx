/**
 * Écran Transactions d'une entité — Server Component (lecture).
 *
 * Charge côté serveur :
 *  1. les transactions de l'entité (récentes d'abord) ;
 *  2. TOUTES les catégories (actives + archivées) pour résoudre les noms —
 *     une transaction ancienne peut pointer vers une catégorie archivée.
 * Puis construit une table de correspondance { id → nom } passée au tableau.
 *
 * On charge deux petites listes plutôt qu'une jointure SQL : plus simple à
 * lire, à tester, et suffisant au volume d'un outil mono-utilisateur.
 *
 * [07/11/2026] Lot 6 : filtres par statut et par compte, passés dans l'URL
 * (?statut=a_traiter&compte=…) pour qu'un filtre se partage et se recharge.
 * Le filtrage est un service pur testé (filtrerOperations).
 */
import Link from "next/link";
import { listerTransactions } from "@/lib/repositories/transactions";
import { listerCategories } from "@/lib/repositories/categories";
import { listerComptesTresorerie } from "@/lib/repositories/tresorerie";
import { createClient } from "@/lib/supabase/server";
import { TableauTransactions } from "@/components/TableauTransactions";
import { filtrerOperations, LIBELLES_STATUT } from "@/lib/services/tresorerie";
import { peutEcrire } from "@/lib/droits";

export default async function TransactionsPage({
  params,
  searchParams,
}: {
  params: Promise<{ entiteId: string }>;
  searchParams: Promise<{ statut?: string; compte?: string }>;
}) {
  const { entiteId } = await params;
  const { statut = "", compte = "" } = await searchParams;
  const supabase = await createClient();

  const [toutes, categories, comptes, ecriture] = await Promise.all([
    listerTransactions(supabase, entiteId),
    listerCategories(supabase, entiteId, false),
    listerComptesTresorerie(supabase, entiteId),
    peutEcrire(supabase, entiteId),
  ]);

  const nomsCategories: Record<string, string> = {};
  for (const c of categories) {
    nomsCategories[c.id] = c.nom;
  }
  const nomsComptes: Record<string, string> = {};
  for (const c of comptes) nomsComptes[c.id] = c.nom;

  const transactions = filtrerOperations(toutes, { statut, compteId: compte });

  // Liens de filtre : on garde l'autre critère en changeant celui-ci.
  const lien = (s: string, c: string) => {
    const q = new URLSearchParams();
    if (s) q.set("statut", s);
    if (c) q.set("compte", c);
    const chaine = q.toString();
    return `/${entiteId}/transactions${chaine ? `?${chaine}` : ""}`;
  };
  const filtresStatut: { valeur: string; libelle: string }[] = [
    { valeur: "", libelle: "Tout" },
    { valeur: "a_traiter", libelle: "À traiter" },
    { valeur: "a_classer", libelle: LIBELLES_STATUT.a_classer },
    { valeur: "a_verifier", libelle: LIBELLES_STATUT.a_verifier },
    { valeur: "validee", libelle: LIBELLES_STATUT.validee },
  ];
  const puce = (actif: boolean) =>
    `rounded-full border px-3 py-1 text-xs transition-colors ${
      actif
        ? "border-compta-accent bg-compta-accent text-white"
        : "border-compta-border text-compta-text-muted hover:border-compta-accent hover:text-compta-accent"
    }`;

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Transactions</h2>
        <div className="flex items-center gap-3">
          <Link
            href={`/${entiteId}/transactions/sans-justificatif`}
            className="text-sm text-compta-text-muted transition-colors hover:text-compta-accent"
          >
            Pièces manquantes
          </Link>
          {/* [07/11/2026] Lecteur : pas de bouton de saisie. */}
          {ecriture && (
            <Link
              href={`/${entiteId}/transactions/nouvelle`}
              className="rounded-md bg-compta-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-compta-accent-hover"
            >
              + Nouvelle transaction
            </Link>
          )}
        </div>
      </div>

      {toutes.length > 0 && (
        <div className="space-y-2">
          <div className="flex flex-wrap gap-2">
            {filtresStatut.map((f) => (
              <Link key={f.valeur || "tout"} href={lien(f.valeur, compte)} className={puce(statut === f.valeur)}>
                {f.libelle}
              </Link>
            ))}
          </div>
          {comptes.length > 0 && (
            <div className="flex flex-wrap gap-2">
              <Link href={lien(statut, "")} className={puce(compte === "")}>
                Tous les comptes
              </Link>
              {comptes.map((c) => (
                <Link key={c.id} href={lien(statut, c.id)} className={puce(compte === c.id)}>
                  {c.nom}
                </Link>
              ))}
              <Link href={lien(statut, "sans")} className={puce(compte === "sans")}>
                Compte inconnu
              </Link>
            </div>
          )}
          <p className="text-xs text-compta-text-muted">
            {transactions.length} opération(s) affichée(s) sur {toutes.length}.
          </p>
        </div>
      )}

      {toutes.length === 0 ? (
        <div className="rounded-lg border border-dashed border-compta-border bg-compta-surface p-6 text-sm text-compta-text-muted">
          {ecriture
            ? "Aucune transaction pour l'instant. Clique sur « Nouvelle transaction » pour saisir ta première recette ou dépense."
            : "Aucune transaction pour l'instant."}
        </div>
      ) : transactions.length === 0 ? (
        <div className="rounded-lg border border-dashed border-compta-border bg-compta-surface p-6 text-sm text-compta-text-muted">
          Aucune opération ne correspond à ce filtre.
        </div>
      ) : (
        <TableauTransactions
          entiteId={entiteId}
          transactions={transactions}
          nomsCategories={nomsCategories}
          nomsComptes={nomsComptes}
          lectureSeule={!ecriture}
        />
      )}
    </section>
  );
}
