/**
 * Documents juridiques — Server Component (Bloc 4.1/4.2).
 * Prépare les trames (décision d'approbation des comptes, rapport de gestion)
 * avec le résultat repris de la comptabilité. Ciblé sociétés (SASU) ; une
 * association relève d'un PV d'AG distinct (agent juridique VEA).
 */
import Link from "next/link";
import { notFound } from "next/navigation";
import { getEntite } from "@/lib/repositories/entites";
import { listerComptes } from "@/lib/repositories/comptes";
import { listerToutesLignes } from "@/lib/repositories/ecritures";
import { createClient } from "@/lib/supabase/server";
import { compteDeResultat } from "@/lib/services/etats-financiers";
import { GenerateurDocuments } from "@/components/GenerateurDocuments";

export default async function DocumentsPage({
  params,
}: {
  params: Promise<{ entiteId: string }>;
}) {
  const { entiteId } = await params;
  const supabase = await createClient();

  const entite = await getEntite(supabase, entiteId);
  if (!entite) notFound();

  const entete = (
    <div className="flex items-center justify-between">
      <div>
        <h2 className="text-lg font-semibold">Documents juridiques</h2>
        <p className="mt-1 text-sm text-compta-text-muted">
          Trames à relire, compléter et signer. Le résultat est repris de la
          comptabilité.
        </p>
      </div>
      <Link
        href={`/${entiteId}/comptabilite`}
        className="text-sm text-compta-text-muted transition-colors hover:text-compta-accent"
      >
        ← Comptabilité
      </Link>
    </div>
  );

  if (entite.type_juridique === "association") {
    return (
      <section className="space-y-6">
        {entete}
        <div className="rounded-lg border border-dashed border-compta-border bg-compta-surface p-6 text-sm text-compta-text-muted">
          {entite.nom} est une association : l&apos;approbation des comptes passe
          par un procès-verbal d&apos;assemblée générale (format distinct de la
          décision d&apos;associé unique). Ces trames sont prévues pour les
          sociétés (SASU).
        </div>
      </section>
    );
  }

  const [lignes, comptes] = await Promise.all([
    listerToutesLignes(supabase, entiteId),
    listerComptes(supabase, entiteId, false),
  ]);
  const { resultat } = compteDeResultat(lignes, comptes);

  return (
    <section className="space-y-6">
      {entete}
      <GenerateurDocuments
        entiteNom={entite.nom}
        formeSociale="SASU"
        resultatCentimes={resultat}
      />
    </section>
  );
}
