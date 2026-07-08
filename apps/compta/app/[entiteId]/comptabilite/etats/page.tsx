/**
 * États financiers (bilan + compte de résultat) — Server Component (Bloc 5.4).
 * Calculés à partir des écritures par le service pur `etats-financiers`.
 * ⚠️ Indicatifs — à valider par l'expert-comptable.
 */
import Link from "next/link";
import { listerComptes } from "@/lib/repositories/comptes";
import { listerToutesLignes } from "@/lib/repositories/ecritures";
import { createClient } from "@/lib/supabase/server";
import { formaterCentimes } from "@/lib/services/montants";
import { compteDeResultat, bilan, type LigneEtat } from "@/lib/services/etats-financiers";

function Lignes({ lignes }: { lignes: LigneEtat[] }) {
  if (lignes.length === 0) {
    return <p className="text-sm text-compta-text-muted">—</p>;
  }
  return (
    <ul className="space-y-1 text-sm">
      {lignes.map((l) => (
        <li key={l.numero} className="flex justify-between gap-4">
          <span className="text-compta-text-muted">
            <span className="tabular-nums">{l.numero}</span> · {l.libelle}
          </span>
          <span className="tabular-nums">{formaterCentimes(l.montant)}</span>
        </li>
      ))}
    </ul>
  );
}

export default async function EtatsPage({
  params,
}: {
  params: Promise<{ entiteId: string }>;
}) {
  const { entiteId } = await params;
  const supabase = await createClient();

  const [lignes, comptes] = await Promise.all([
    listerToutesLignes(supabase, entiteId),
    listerComptes(supabase, entiteId, false),
  ]);

  const cr = compteDeResultat(lignes, comptes);
  const b = bilan(lignes, comptes);

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">États financiers</h2>
          <p className="mt-1 text-sm text-compta-text-muted">
            Bilan et compte de résultat, calculés depuis les écritures.
            <span className="ml-1 italic">Indicatifs — à valider par l&apos;expert-comptable.</span>
          </p>
        </div>
        <Link
          href={`/${entiteId}/comptabilite`}
          className="text-sm text-compta-text-muted transition-colors hover:text-compta-accent"
        >
          ← Comptabilité
        </Link>
      </div>

      {lignes.length === 0 ? (
        <div className="rounded-lg border border-dashed border-compta-border bg-compta-surface p-6 text-sm text-compta-text-muted">
          Aucune écriture : initialise le plan comptable et saisis des
          transactions pour voir apparaître tes états.
        </div>
      ) : (
        <>
          {/* ---- Compte de résultat ---- */}
          <div className="rounded-lg border border-compta-border bg-compta-surface p-5">
            <h3 className="mb-3 text-sm font-semibold">Compte de résultat</h3>
            <div className="grid gap-6 sm:grid-cols-2">
              <div>
                <p className="mb-2 text-xs font-semibold uppercase text-compta-depense">Charges</p>
                <Lignes lignes={cr.detailCharges} />
                <p className="mt-2 flex justify-between border-t border-compta-border pt-2 text-sm font-medium">
                  <span>Total charges</span>
                  <span className="tabular-nums">{formaterCentimes(cr.totalCharges)}</span>
                </p>
              </div>
              <div>
                <p className="mb-2 text-xs font-semibold uppercase text-compta-recette">Produits</p>
                <Lignes lignes={cr.detailProduits} />
                <p className="mt-2 flex justify-between border-t border-compta-border pt-2 text-sm font-medium">
                  <span>Total produits</span>
                  <span className="tabular-nums">{formaterCentimes(cr.totalProduits)}</span>
                </p>
              </div>
            </div>
            <p
              className={`mt-4 flex justify-between border-t border-compta-border pt-3 font-semibold ${
                cr.resultat >= 0 ? "text-compta-recette" : "text-compta-depense"
              }`}
            >
              <span>Résultat de l&apos;exercice ({cr.resultat >= 0 ? "bénéfice" : "perte"})</span>
              <span className="tabular-nums">{formaterCentimes(cr.resultat)}</span>
            </p>
          </div>

          {/* ---- Bilan ---- */}
          <div className="rounded-lg border border-compta-border bg-compta-surface p-5">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold">Bilan</h3>
              <span
                className={`rounded px-2 py-0.5 text-xs ${
                  b.equilibre
                    ? "bg-compta-recette/10 text-compta-recette"
                    : "bg-compta-depense/10 text-compta-depense"
                }`}
              >
                {b.equilibre ? "Équilibré" : "Déséquilibré (anomalie)"}
              </span>
            </div>
            <div className="grid gap-6 sm:grid-cols-2">
              <div>
                <p className="mb-2 text-xs font-semibold uppercase text-compta-text-muted">Actif</p>
                <Lignes lignes={b.actif} />
                <p className="mt-2 flex justify-between border-t border-compta-border pt-2 text-sm font-medium">
                  <span>Total actif</span>
                  <span className="tabular-nums">{formaterCentimes(b.totalActif)}</span>
                </p>
              </div>
              <div>
                <p className="mb-2 text-xs font-semibold uppercase text-compta-text-muted">Passif</p>
                <Lignes lignes={b.passif} />
                <p className="mt-2 flex justify-between border-t border-compta-border pt-2 text-sm font-medium">
                  <span>Total passif</span>
                  <span className="tabular-nums">{formaterCentimes(b.totalPassif)}</span>
                </p>
              </div>
            </div>
          </div>
        </>
      )}
    </section>
  );
}
