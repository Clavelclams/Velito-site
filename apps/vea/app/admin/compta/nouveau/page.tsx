/**
 * /admin/compta/nouveau — Form pour saisir une transaction
 *
 * Server Component qui fetch la liste des documents (pour le sélecteur de
 * justificatif), puis rend TransactionForm (Client Component).
 *
 * Permission : hasTreasurerAccess.
 */
import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { hasTreasurerAccess } from "@/lib/supabase/permissions";
import TransactionForm from "./TransactionForm";

export const dynamic = "force-dynamic";

export default async function NouvelleTransactionPage() {
  const canEdit = await hasTreasurerAccess();
  if (!canEdit) redirect("/admin?denied=compta");

  const supabase = await createClient();

  // Liste les documents validés OU en attente, triés par récent
  const { data: documentsRaw } = await supabase
    .schema("vea")
    .from("documents")
    .select("id, nom, type")
    .in("statut", ["valide", "en_attente"])
    .order("created_at", { ascending: false })
    .limit(100);

  const documents =
    (documentsRaw ?? []).map((d) => ({ id: d.id, nom: d.nom, type: d.type })) ?? [];

  return (
    <div className="min-h-screen bg-vea-bg pt-28 pb-20 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="mb-6">
          <Link href="/admin/compta" className="text-xs text-vea-text-dim hover:text-vea-accent">
            ← Retour compta
          </Link>
        </div>

        <div className="mb-8">
          <span className="badge-red mb-3 inline-block">Admin VEA · Trésorerie</span>
          <h1 className="text-3xl sm:text-4xl font-black text-vea-text mb-2">
            Nouvelle <span className="text-vea-accent">transaction</span>
          </h1>
          <p className="text-sm text-vea-text-muted leading-relaxed">
            Recette ou dépense. Tu peux lier un justificatif uploadé via Dépôt
            documents (ticket, facture, reçu).
          </p>
        </div>

        <TransactionForm documents={documents} />
      </div>
    </div>
  );
}
