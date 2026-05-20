/**
 * /admin/rapports/nouveau — Création d'un nouveau rapport
 *
 * Server Component qui fetch les participants pour le selecteur de présents.
 */
import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { hasPermission } from "@/lib/supabase/permissions";
import RapportForm from "./RapportForm";

export const dynamic = "force-dynamic";

export default async function NouveauRapportPage() {
  const canEdit = await hasPermission("vea", "editor");
  if (!canEdit) redirect("/admin?denied=rapports");

  const supabase = await createClient();

  const { data: participantsRaw } = await supabase
    .schema("vea")
    .from("participants")
    .select("id, prenom, nom, role, est_mineur")
    .in("role", ["dirigeant", "superadmin", "benevole"])
    .order("role", { ascending: true })
    .order("nom", { ascending: true });

  const participants =
    (participantsRaw ?? []).map((p) => ({
      id: p.id,
      prenom: p.prenom,
      nom: p.nom,
      role: p.role,
      est_mineur: p.est_mineur,
    })) ?? [];

  return (
    <div className="min-h-screen bg-vea-bg pt-28 pb-20 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="mb-6">
          <Link href="/admin/rapports" className="text-xs text-vea-text-dim hover:text-vea-accent">
            ← Retour liste rapports
          </Link>
        </div>

        <div className="mb-8">
          <span className="badge-red mb-3 inline-block">Admin VEA</span>
          <h1 className="text-3xl sm:text-4xl font-black text-vea-text mb-2">
            Nouveau <span className="text-vea-accent">rapport</span>
          </h1>
          <p className="text-sm text-vea-text-muted leading-relaxed">
            PV, convocation, rapport d&apos;activité ou CR de réunion. Le contenu
            est rédigé en Markdown avec template préchargé selon le type.
          </p>
        </div>

        <RapportForm participants={participants} />
      </div>
    </div>
  );
}
