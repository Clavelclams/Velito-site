/**
 * /admin/signalements VENA — Lecture/traitement des signalements (bug-reports).
 *
 * Server Component. Accès : permission "vena" editor+ (= admin Velito).
 * Liste shared.signalements (toutes apps), génère des URLs signées pour les
 * pièces jointes (bucket privé), puis le composant client gère filtre + statut.
 */
import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { hasPermission } from "@/lib/supabase/permissions";
import SignalementsManager, { type Signalement } from "./SignalementsManager";

export const dynamic = "force-dynamic";

export default async function AdminSignalementsPage() {
  const canRead = await hasPermission("vena", "editor");
  if (!canRead) redirect("/login?redirect=/admin/signalements");

  const supabase = await createClient();
  const { data } = await supabase
    .schema("shared")
    .from("signalements")
    .select(
      "id, created_at, email, app, categorie, projet, description, attachment_path, statut"
    )
    .order("created_at", { ascending: false });

  const rows = (data ?? []) as Signalement[];

  // URLs signées pour les pièces jointes (bucket privé, valables 1h).
  await Promise.all(
    rows.map(async (r) => {
      if (r.attachment_path) {
        const { data: signed } = await supabase.storage
          .from("signalements")
          .createSignedUrl(r.attachment_path, 3600);
        r.attachmentUrl = signed?.signedUrl ?? undefined;
      }
    })
  );

  const stats = {
    total: rows.length,
    nouveau: rows.filter((r) => r.statut === "nouveau").length,
    en_cours: rows.filter((r) => r.statut === "en_cours").length,
    traite: rows.filter((r) => r.statut === "traite").length,
  };

  return (
    <div className="min-h-screen bg-vena-cream pt-10 pb-20 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between gap-3 flex-wrap mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-display font-black text-vena-kaki">
              Signalements
            </h1>
            <p className="text-sm text-vena-text-muted mt-1">
              Les bugs et soucis remontés via les chatbots (VENA, VEA, hub…).
            </p>
          </div>
          <Link
            href="/admin"
            className="text-xs text-vena-text-dim hover:text-vena-kaki transition-colors"
          >
            ← Retour admin
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
          {[
            { label: "Total", value: stats.total },
            { label: "Nouveau", value: stats.nouveau },
            { label: "En cours", value: stats.en_cours },
            { label: "Traité", value: stats.traite },
          ].map((s) => (
            <div
              key={s.label}
              className="bg-white border border-vena-border rounded-xl p-4 text-center"
            >
              <div className="text-2xl font-black text-vena-kaki">{s.value}</div>
              <div className="text-[10px] uppercase tracking-widest font-bold text-vena-text-muted mt-1">
                {s.label}
              </div>
            </div>
          ))}
        </div>

        <SignalementsManager signalements={rows} />
      </div>
    </div>
  );
}
