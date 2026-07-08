/**
 * Estimation de l'IS — Server Component (Bloc 5.5).
 * Calcule un IS INDICATIF à partir du résultat comptable. Ne s'applique
 * qu'aux sociétés soumises à l'IS (une association n'y est en principe pas
 * assujettie, sauf activités lucratives).
 */
import Link from "next/link";
import { getEntite } from "@/lib/repositories/entites";
import { listerComptes } from "@/lib/repositories/comptes";
import { listerToutesLignes } from "@/lib/repositories/ecritures";
import { createClient } from "@/lib/supabase/server";
import { formaterCentimes } from "@/lib/services/montants";
import { compteDeResultat } from "@/lib/services/etats-financiers";
import { calculerIS, acompteTrimestrielIS, BAREME_IS_2026 } from "@/lib/services/impot-societe";
import { notFound } from "next/navigation";

function Ligne({ label, montant, fort }: { label: string; montant: number; fort?: boolean }) {
  return (
    <p className={`flex justify-between gap-4 ${fort ? "font-semibold" : "text-sm"}`}>
      <span className={fort ? "" : "text-compta-text-muted"}>{label}</span>
      <span className="tabular-nums">{formaterCentimes(montant)}</span>
    </p>
  );
}

export default async function ImpotPage({
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
        <h2 className="text-lg font-semibold">Estimation de l&apos;IS</h2>
        <p className="mt-1 text-sm text-compta-text-muted">
          Calcul indicatif — le résultat fiscal peut différer du résultat
          comptable.{" "}
          <span className="italic">À valider par l&apos;expert-comptable.</span>
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

  // Une association n'est en principe pas soumise à l'IS.
  if (entite.type_juridique === "association") {
    return (
      <section className="space-y-6">
        {entete}
        <div className="rounded-lg border border-dashed border-compta-border bg-compta-surface p-6 text-sm text-compta-text-muted">
          {entite.nom} est une association : l&apos;impôt sur les sociétés ne
          s&apos;applique pas, sauf activités lucratives assujetties. Estimation
          non pertinente ici.
        </div>
      </section>
    );
  }

  const [lignes, comptes] = await Promise.all([
    listerToutesLignes(supabase, entiteId),
    listerComptes(supabase, entiteId, false),
  ]);
  const { resultat } = compteDeResultat(lignes, comptes);
  const is = calculerIS(resultat, true); // éligibilité PME supposée (voir note)
  const acompte = acompteTrimestrielIS(is.isTotalCentimes);

  return (
    <section className="space-y-6">
      {entete}

      <div className="rounded-lg border border-compta-border bg-compta-surface p-5">
        <Ligne label="Résultat comptable (base indicative)" montant={resultat} fort />

        {resultat <= 0 ? (
          <p className="mt-3 text-sm text-compta-recette">
            Résultat nul ou déficitaire : aucun IS estimé.
          </p>
        ) : (
          <div className="mt-4 space-y-2 border-t border-compta-border pt-3">
            <Ligne
              label={`Tranche à 15 % (jusqu'à ${formaterCentimes(BAREME_IS_2026.seuilTauxReduitCentimes)})`}
              montant={is.isReduitCentimes}
            />
            <Ligne label="Tranche à 25 %" montant={is.isNormalCentimes} />
            <div className="border-t border-compta-border pt-2">
              <Ligne label="IS estimé" montant={is.isTotalCentimes} fort />
            </div>
            <Ligne label="Acompte trimestriel indicatif (÷ 4)" montant={acompte} />
          </div>
        )}
      </div>

      <div className="rounded-lg border border-compta-border bg-compta-surface p-4 text-xs text-compta-text-muted">
        <p>
          Barème {BAREME_IS_2026.annee} : 15 % jusqu&apos;à{" "}
          {formaterCentimes(BAREME_IS_2026.seuilTauxReduitCentimes)} de bénéfice
          (conditions PME : CA ≤ 10 M€, capital libéré, détenu ≥ 75 % par des
          personnes physiques), 25 % au-delà. Éligibilité PME supposée remplie.
        </p>
        <p className="mt-1">
          Un amendement PLF 2026 propose de relever le seuil à 100 000 € — non
          confirmé ; le barème est un paramètre daté, ajustable sans toucher au
          calcul.
        </p>
      </div>
    </section>
  );
}
