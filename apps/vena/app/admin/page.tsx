/**
 * /admin VENA — Dashboard des demandes de devis.
 *
 * Server Component. Accès : permission "vena" editor+ (sinon redirect /login).
 * Liste toutes les demandes_contact (récentes d'abord) + stats rapides.
 * Le composant client DemandesManager gère le filtre statut + la mise à jour.
 */
import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { hasPermission } from "@/lib/supabase/permissions";
import DemandesManager, { type Demande } from "./DemandesManager";

export const dynamic = "force-dynamic";

export default async function AdminVenaPage() {
  const canRead = await hasPermission("vena", "editor");
  if (!canRead) redirect("/login?redirect=/admin");

  const supabase = await createClient();
  const { data } = await supabase
    .schema("vena")
    .from("demandes_contact")
    .select(
      "id, prenom, nom, email, telephone, structure, fonction, service_demande, budget_envisage, delai, message, source_decouverte, statut, created_at"
    )
    .order("created_at", { ascending: false });

  const demandes = (data ?? []) as Demande[];

  const stats = {
    total: demandes.length,
    nouveau: demandes.filter((d) => d.statut === "nouveau").length,
    en_cours: demandes.filter((d) => d.statut === "en_cours").length,
    traite: demandes.filter((d) => d.statut === "traite").length,
  };

  return (
    <div className="min-h-screen bg-vena-cream pt-10 pb-20 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between gap-3 flex-wrap mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-display font-black text-vena-kaki">
              Demandes de devis
            </h1>
            <p className="text-sm text-vena-text-muted mt-1">
              Les demandes envoyées via le formulaire contact VENA.
            </p>
          </div>
          <Link
            href="/"
            className="text-xs text-vena-text-dim hover:text-vena-kaki transition-colors"
          >
            ← Retour au site
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

        <DemandesManager demandes={demandes} />
      </div>
    </div>
  );
}
