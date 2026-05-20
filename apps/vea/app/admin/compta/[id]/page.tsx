/**
 * /admin/compta/[id] — Détail d'une transaction
 *
 * V1 lecture + changement statut + suppression. V2 : édition complète des
 * champs (montant, catégorie, description, etc.) via un EditForm.
 */
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { hasTreasurerAccess } from "@/lib/supabase/permissions";
import TransactionActions from "./TransactionActions";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

const CATEGORIE_LABELS: Record<string, string> = {
  subvention: "Subvention",
  cotisation: "Cotisation",
  prestation: "Prestation",
  don: "Don",
  animation: "Animation",
  materiel: "Matériel",
  transport: "Transport",
  restauration: "Restauration",
  communication: "Communication",
  frais_bancaires: "Frais bancaires",
  assurance: "Assurance",
  autre: "Autre",
};

const STATUT_LABELS: Record<string, string> = {
  effectue: "Effectué",
  planifie: "Planifié",
  annule: "Annulé",
};

const STATUT_COLORS: Record<string, string> = {
  effectue: "bg-emerald-100 text-emerald-700 border-emerald-200",
  planifie: "bg-amber-100 text-amber-700 border-amber-200",
  annule: "bg-vea-bg text-vea-text-dim border-vea-border",
};

function fmtMontant(n: number): string {
  return `${Number(n).toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;
}

export default async function TransactionDetailPage({ params }: PageProps) {
  const canEdit = await hasTreasurerAccess();
  if (!canEdit) redirect("/admin?denied=compta");

  const { id } = await params;
  const supabase = await createClient();

  const { data: tx } = await supabase
    .schema("vea")
    .from("compta_transactions")
    .select("id, date_transaction, type, categorie, montant, description, document_id, statut, saison, created_by, created_at")
    .eq("id", id)
    .maybeSingle();

  if (!tx) notFound();

  // Document lié (si renseigné)
  let documentInfo: { nom: string; type: string } | null = null;
  if (tx.document_id) {
    const { data: doc } = await supabase
      .schema("vea")
      .from("documents")
      .select("nom, type")
      .eq("id", tx.document_id)
      .maybeSingle();
    documentInfo = doc;
  }

  // Created by
  let createdByName: string | null = null;
  if (tx.created_by) {
    const { data: u } = await supabase
      .schema("shared")
      .from("users")
      .select("prenom, nom, email")
      .eq("id", tx.created_by)
      .maybeSingle();
    if (u) {
      createdByName = u.prenom ? `${u.prenom} ${u.nom ?? ""}`.trim() : u.email;
    }
  }

  const sign = tx.type === "recette" ? "+" : "−";
  const signColor = tx.type === "recette" ? "text-emerald-600" : "text-red-600";

  return (
    <div className="min-h-screen bg-vea-bg pt-28 pb-20 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="mb-6">
          <Link href="/admin/compta" className="text-xs text-vea-text-dim hover:text-vea-accent">
            ← Retour compta
          </Link>
        </div>

        <div className="mb-6 flex items-start justify-between gap-4 flex-wrap">
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline gap-2 mb-2 flex-wrap">
              <span className="text-[10px] uppercase tracking-widest font-bold px-2 py-0.5 rounded bg-vea-accent-soft text-vea-accent">
                {CATEGORIE_LABELS[tx.categorie] ?? tx.categorie}
              </span>
              <span
                className={`text-[10px] uppercase tracking-widest font-bold px-2 py-0.5 rounded border ${STATUT_COLORS[tx.statut]}`}
              >
                {STATUT_LABELS[tx.statut] ?? tx.statut}
              </span>
              <span className="text-[10px] uppercase tracking-widest text-vea-text-dim">
                {tx.type === "recette" ? "Recette" : "Dépense"} · saison {tx.saison}
              </span>
            </div>
            <p className={`text-4xl font-black mb-2 ${signColor}`}>
              {sign} {fmtMontant(Number(tx.montant))}
            </p>
            <p className="text-base text-vea-text leading-relaxed">{tx.description}</p>
          </div>
        </div>

        {/* Actions */}
        <div className="card-clean p-4 mb-4">
          <p className="text-xs font-bold text-vea-text-dim uppercase tracking-widest mb-3">
            Changer le statut
          </p>
          <TransactionActions
            transactionId={tx.id}
            currentStatut={tx.statut as "effectue" | "planifie" | "annule"}
          />
        </div>

        {/* Métadonnées */}
        <div className="card-clean p-5 mb-4 space-y-2 text-sm">
          <p className="text-vea-text">
            <span className="text-vea-text-dim">Date transaction :</span>{" "}
            <strong>
              {new Date(tx.date_transaction).toLocaleDateString("fr-FR", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </strong>
          </p>
          {documentInfo && (
            <p className="text-vea-text">
              <span className="text-vea-text-dim">Justificatif :</span>{" "}
              <Link
                href={`/admin/documents/${tx.document_id}`}
                className="text-vea-accent hover:underline font-bold"
              >
                [{documentInfo.type}] {documentInfo.nom} →
              </Link>
            </p>
          )}
          {createdByName && (
            <p className="text-vea-text">
              <span className="text-vea-text-dim">Saisi par :</span>{" "}
              <strong>{createdByName}</strong> le{" "}
              {new Date(tx.created_at).toLocaleString("fr-FR", {
                day: "numeric",
                month: "long",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          )}
        </div>

        <p className="text-[10px] text-vea-text-dim italic mt-6 text-center">
          V1 lecture + actions statut. V2 : édition complète des champs.
        </p>
      </div>
    </div>
  );
}
