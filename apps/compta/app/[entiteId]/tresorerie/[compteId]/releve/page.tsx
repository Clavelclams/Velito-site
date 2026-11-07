/**
 * Import d'un relevé PDF Crédit Mutuel dans un compte — Server Component
 * (07/11/2026). La page vérifie le compte ; tout le reste (choix du fichier,
 * aperçu, import) est dans le composant client ImportReleveCm.
 */
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCompteTresorerie } from "@/lib/repositories/tresorerie";
import { ImportReleveCm } from "@/components/ImportReleveCm";
import { peutEcrire } from "@/lib/droits";
import { MESSAGE_LECTURE_SEULE } from "@/lib/services/droits";

export default async function ImportRelevePage({
  params,
}: {
  params: Promise<{ entiteId: string; compteId: string }>;
}) {
  const { entiteId, compteId } = await params;
  const supabase = await createClient();
  const compte = await getCompteTresorerie(supabase, compteId);
  if (!compte || compte.entite_id !== entiteId) notFound();
  const ecriture = await peutEcrire(supabase, entiteId);

  return (
    <section className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">Importer un relevé PDF</h2>
          <p className="text-sm text-compta-text-muted">
            {compte.nom} · relevé « Extrait de comptes » du Crédit Mutuel, un fichier par mois
          </p>
        </div>
        <Link href={`/${entiteId}/tresorerie/${compte.id}`} className="text-sm text-compta-text-muted hover:text-compta-accent">
          ← Contrôle du compte
        </Link>
      </div>

      {/* [07/11/2026] Lecteur : message à la place de la zone d'import. */}
      {!ecriture ? (
        <p className="rounded-lg border border-compta-border bg-compta-surface p-5 text-sm text-compta-text-muted">
          {MESSAGE_LECTURE_SEULE}
        </p>
      ) : (
      <>
      <ul className="list-disc space-y-1 pl-5 text-sm text-compta-text-muted">
        <li>Le PDF est lu sur le serveur puis oublié : il n&apos;est pas stocké.</li>
        <li>L&apos;import n&apos;est possible que si le relevé tombe juste (ouverture + mouvements = clôture).</li>
        <li>Les opérations arrivent « À classer » ; seuls les frais bancaires et les péages sont pré-classés.</li>
        <li>Réimporter un relevé déjà chargé n&apos;ajoute rien.</li>
      </ul>

      <ImportReleveCm entiteId={entiteId} compteId={compte.id} />
      </>
      )}
    </section>
  );
}
