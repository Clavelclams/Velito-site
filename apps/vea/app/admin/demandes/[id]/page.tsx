/**
 * /admin/demandes/[id] — Détail d'une demande de devis (prestation VEA).
 *
 * Source : vea.demandes_prestation. Réservé éditeurs+ VEA.
 * Cible des notifications cloche "Nouvelle demande de devis".
 * V1 : lecture seule + bouton "Répondre par email" (mailto pré-rempli).
 */
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { hasPermission } from "@/lib/supabase/permissions";
import DemandeManager from "./DemandeManager";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  if (value === null || value === undefined || value === "") return null;
  return (
    <div>
      <p className="text-[10px] uppercase tracking-widest text-vea-text-dim mb-0.5">{label}</p>
      <p className="text-sm text-vea-text">{value}</p>
    </div>
  );
}

export default async function AdminDemandeDetailPage({ params }: PageProps) {
  const { id } = await params;

  const canEdit = await hasPermission("vea", "editor");
  if (!canEdit) redirect("/admin?denied=demandes");

  const supabase = await createClient();
  const { data: d } = await supabase
    .schema("vea")
    .from("demandes_prestation")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!d) notFound();

  const presta = Array.isArray(d.prestations_demandees)
    ? (d.prestations_demandees as string[]).join(", ")
    : "";
  const ages = Array.isArray(d.public_tranche_age)
    ? (d.public_tranche_age as string[]).join(", ")
    : "";

  const mailto = `mailto:${d.email}?subject=${encodeURIComponent(
    "Votre demande de devis — VEA",
  )}&body=${encodeURIComponent(
    `Bonjour ${d.referent_prenom},\n\nMerci pour votre demande concernant ${d.structure_nom}.\n\n[Votre réponse ici]\n\n--\nL'équipe VEA — Velito Esport Amiens\ncontact@velito.fr`,
  )}`;

  return (
    <div className="min-h-screen bg-vea-bg pt-28 pb-20 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="mb-6">
          <Link href="/admin/demandes" className="text-xs text-vea-text-dim hover:text-vea-accent">
            ← Toutes les demandes
          </Link>
        </div>

        <div className="flex items-start justify-between gap-4 flex-wrap mb-6">
          <div>
            <span className="badge-red mb-3 inline-block">Demande de devis</span>
            <h1 className="text-2xl sm:text-3xl font-black text-vea-text">{d.structure_nom}</h1>
            <p className="text-sm text-vea-text-muted mt-1">
              Reçue le {new Date(d.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
              {" · "}
              <span className="font-semibold text-vea-accent">{d.statut ?? "nouveau"}</span>
            </p>
          </div>
          {d.email && (
            <a
              href={mailto}
              className="px-4 py-2 rounded-full bg-vea-accent text-white text-sm font-bold hover:bg-vea-accent-hover transition-colors"
            >
              Répondre par email
            </a>
          )}
        </div>

        <div className="space-y-6">
          <section className="card-clean p-5">
            <h2 className="text-xs font-black uppercase tracking-widest text-vea-accent mb-4">Contact</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Structure" value={`${d.structure_nom}${d.structure_type ? ` (${d.structure_type})` : ""}`} />
              <Field label="Référent" value={`${d.referent_prenom} ${d.referent_nom}${d.referent_fonction ? ` — ${d.referent_fonction}` : ""}`} />
              <Field label="Email" value={<a href={`mailto:${d.email}`} className="text-vea-accent hover:underline break-all">{d.email}</a>} />
              <Field label="Téléphone" value={d.telephone ? <a href={`tel:${d.telephone}`} className="text-vea-accent hover:underline">{d.telephone}</a> : null} />
            </div>
          </section>

          <section className="card-clean p-5">
            <h2 className="text-xs font-black uppercase tracking-widest text-vea-accent mb-4">Prestation souhaitée</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Prestations" value={presta} />
              <Field label="Précision (autre)" value={d.prestations_autre_precision} />
              <Field label="Pack envisagé" value={d.pack_envisage} />
              <Field label="Budget envisagé" value={d.budget_envisage} />
            </div>
          </section>

          <section className="card-clean p-5">
            <h2 className="text-xs font-black uppercase tracking-widest text-vea-accent mb-4">Logistique</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Date souhaitée" value={d.date_souhaitee ? new Date(d.date_souhaitee).toLocaleDateString("fr-FR") : null} />
              <Field label="Lieu" value={`${d.lieu_ville ?? ""}${d.lieu_structure ? ` — ${d.lieu_structure}` : ""}`} />
              <Field label="Participants" value={d.nombre_participants} />
              <Field label="Durée (h)" value={d.duree_heures} />
              <Field label="Public (âges)" value={ages} />
              <Field label="Source" value={d.source_decouverte} />
            </div>
          </section>

          {d.precisions && (
            <section className="card-clean p-5">
              <h2 className="text-xs font-black uppercase tracking-widest text-vea-accent mb-3">Précisions</h2>
              <p className="text-sm text-vea-text whitespace-pre-wrap leading-relaxed">{d.precisions}</p>
            </section>
          )}

          <DemandeManager
            id={d.id}
            statut={d.statut ?? "nouveau"}
            notesInternes={d.notes_internes ?? null}
          />

          <p className="text-[10px] text-vea-text-dim italic text-center">
            Consentement RGPD : {d.rgpd_consent ? "oui" : "non"} · conservation 3 ans.
          </p>
        </div>
      </div>
    </div>
  );
}
