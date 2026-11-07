/**
 * « À traiter » — file des lignes non validées (Server Component, 07/11/2026).
 *
 * Chaque ligne importée (relevé, tickets, CSV) arrive « À classer » ou « À
 * valider ». Ici on les traite à la suite, sans ouvrir chaque fiche : choisir
 * la catégorie, valider, ou transformer en virement interne. Les « À classer »
 * d'abord, puis par date (service pur lignesATraiter).
 *
 * ?compte=… filtre sur un compte réel (utile pour traiter relevé par relevé).
 */
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { listerTransactions } from "@/lib/repositories/transactions";
import { listerCategories } from "@/lib/repositories/categories";
import { listerComptesTresorerie } from "@/lib/repositories/tresorerie";
import { lignesATraiter } from "@/lib/services/traitement";
import { LigneATraiter } from "@/components/LigneATraiter";
import { peutEcrire } from "@/lib/droits";

export default async function ATraiterPage({
  params,
  searchParams,
}: {
  params: Promise<{ entiteId: string }>;
  searchParams: Promise<{ compte?: string }>;
}) {
  const { entiteId } = await params;
  const { compte = "" } = await searchParams;
  const supabase = await createClient();

  const [toutes, categories, comptes, ecriture] = await Promise.all([
    listerTransactions(supabase, entiteId),
    listerCategories(supabase, entiteId),
    listerComptesTresorerie(supabase, entiteId),
    peutEcrire(supabase, entiteId),
  ]);

  const aTraiter = lignesATraiter(toutes).filter((t) =>
    compte === "" ? true : compte === "inconnu" ? t.compte_tresorerie_id === null : t.compte_tresorerie_id === compte,
  );
  const nbClasser = aTraiter.filter((t) => t.statut === "a_classer").length;
  const nomCompte = new Map(comptes.map((c) => [c.id, c.nom]));
  const filtre = (valeur: string, libelle: string) => (
    <Link
      key={valeur || "tous"}
      href={valeur ? `/${entiteId}/a-traiter?compte=${valeur}` : `/${entiteId}/a-traiter`}
      className={`rounded-full border px-3 py-1 text-xs ${
        compte === valeur ? "border-compta-accent bg-compta-accent text-white" : "border-compta-border text-compta-text-muted hover:border-compta-accent"
      }`}
    >
      {libelle}
    </Link>
  );

  return (
    <section className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold">À traiter</h2>
        <p className="text-sm text-compta-text-muted">
          {aTraiter.length === 0
            ? "Rien à traiter : toutes les lignes sont validées."
            : `${aTraiter.length} ligne(s) : ${nbClasser} à classer, ${aTraiter.length - nbClasser} à valider.`}{" "}
          Valider veut dire : vérifiée sur le relevé ou le justificatif.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {filtre("", "Tous les comptes")}
        {comptes.map((c) => filtre(c.id, c.nom))}
        {filtre("inconnu", "Compte inconnu")}
      </div>

      <ul className="space-y-3">
        {aTraiter.map((t) => (
          <LigneATraiter
            key={t.id}
            entiteId={entiteId}
            transaction={t}
            nomCompte={t.compte_tresorerie_id ? nomCompte.get(t.compte_tresorerie_id) ?? "?" : null}
            categories={categories.filter((c) => c.type === t.type).map((c) => ({ id: c.id, nom: c.nom }))}
            autresComptes={comptes.filter((c) => c.id !== t.compte_tresorerie_id).map((c) => ({ id: c.id, nom: c.nom }))}
            lectureSeule={!ecriture}
          />
        ))}
      </ul>
    </section>
  );
}
