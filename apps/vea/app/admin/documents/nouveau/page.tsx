/**
 * /admin/documents/nouveau — Form d'upload d'un document
 *
 * Server Component qui fetch la liste des participants pour le selecteur,
 * puis rend UploadForm (Client Component).
 */
import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { hasPermission } from "@/lib/supabase/permissions";
import UploadForm from "./UploadForm";

export const dynamic = "force-dynamic";

export default async function NouveauDocumentPage() {
  const canEdit = await hasPermission("vea", "editor");
  if (!canEdit) redirect("/admin?denied=documents");

  const supabase = await createClient();

  const { data: participantsRaw } = await supabase
    .schema("vea")
    .from("participants")
    .select("id, prenom, nom, est_mineur")
    .order("nom", { ascending: true });

  const participants =
    (participantsRaw ?? []).map((p) => ({
      id: p.id,
      prenom: p.prenom,
      nom: p.nom,
      est_mineur: p.est_mineur,
    })) ?? [];

  return (
    <div className="min-h-screen bg-vea-bg pt-28 pb-20 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="mb-6">
          <Link
            href="/admin/documents"
            className="text-xs text-vea-text-dim hover:text-vea-accent"
          >
            ← Retour liste documents
          </Link>
        </div>

        <div className="mb-8">
          <span className="badge-red mb-3 inline-block">Admin VEA</span>
          <h1 className="text-3xl sm:text-4xl font-black text-vea-text mb-2">
            Uploader un <span className="text-vea-accent">document</span>
          </h1>
          <p className="text-sm text-vea-text-muted leading-relaxed">
            Le document sera enregistré avec le statut <strong>En attente</strong>.
            Les dirigeants recevront une notification cloche pour le valider.
          </p>
        </div>

        <UploadForm participants={participants} />
      </div>
    </div>
  );
}
