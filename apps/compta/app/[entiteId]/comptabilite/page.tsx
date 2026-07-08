/**
 * Écran Comptabilité (partie double) — Server Component.
 * État du plan comptable, nombre d'écritures, initialisation du PCG et FEC.
 * Les écritures sont générées automatiquement à la création d'une transaction
 * (une fois le plan comptable initialisé).
 */
import { listerComptes } from "@/lib/repositories/comptes";
import { listerEcritures } from "@/lib/repositories/ecritures";
import { createClient } from "@/lib/supabase/server";
import { BoutonSeedPcg } from "@/components/BoutonSeedPcg";

export default async function ComptabilitePage({
  params,
}: {
  params: Promise<{ entiteId: string }>;
}) {
  const { entiteId } = await params;
  const supabase = await createClient();

  const [comptes, ecritures] = await Promise.all([
    listerComptes(supabase, entiteId, false),
    listerEcritures(supabase, entiteId),
  ]);

  const pcgInitialise = comptes.length > 0;

  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Comptabilité (partie double)</h2>
        <p className="mt-1 text-sm text-compta-text-muted">
          Le socle qui produit le FEC. Chaque transaction génère
          automatiquement son écriture équilibrée, classée sur le plan comptable
          ci-dessous.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-lg border border-compta-border bg-compta-surface p-5">
          <p className="text-sm text-compta-text-muted">Plan comptable</p>
          <p className="mt-1 text-2xl font-bold tabular-nums">{comptes.length}</p>
          <p className="mt-1 text-xs text-compta-text-muted">comptes</p>
        </div>
        <div className="rounded-lg border border-compta-border bg-compta-surface p-5">
          <p className="text-sm text-compta-text-muted">Écritures</p>
          <p className="mt-1 text-2xl font-bold tabular-nums">{ecritures.length}</p>
          <p className="mt-1 text-xs text-compta-text-muted">enregistrées</p>
        </div>
      </div>

      {/* Initialisation du plan comptable */}
      <div className="rounded-lg border border-compta-border bg-compta-surface p-5">
        <h3 className="text-sm font-semibold">Plan comptable</h3>
        <p className="mb-3 mt-1 text-sm text-compta-text-muted">
          {pcgInitialise
            ? "Plan comptable en place. Les nouvelles transactions génèrent leur écriture."
            : "Initialise le plan comptable de référence pour activer la génération des écritures."}
        </p>
        <BoutonSeedPcg entiteId={entiteId} dejaInitialise={pcgInitialise} />
      </div>

      {/* Journal & balance */}
      <div className="rounded-lg border border-compta-border bg-compta-surface p-5">
        <h3 className="text-sm font-semibold">Journal & balance</h3>
        <p className="mt-1 text-sm text-compta-text-muted">
          Voir les écritures en partie double et la balance des comptes.
        </p>
        <a
          href={`/${entiteId}/comptabilite/journal`}
          className="mt-3 inline-block rounded-md border border-compta-border px-4 py-2 text-sm transition-colors hover:bg-compta-bg"
        >
          Voir le journal
        </a>
      </div>

      {/* États financiers */}
      <div className="rounded-lg border border-compta-border bg-compta-surface p-5">
        <h3 className="text-sm font-semibold">États financiers</h3>
        <p className="mt-1 text-sm text-compta-text-muted">
          Bilan et compte de résultat calculés depuis les écritures (indicatifs).
        </p>
        <a
          href={`/${entiteId}/comptabilite/etats`}
          className="mt-3 inline-block rounded-md border border-compta-border px-4 py-2 text-sm transition-colors hover:bg-compta-bg"
        >
          Voir le bilan & le compte de résultat
        </a>
      </div>

      {/* Impôt sur les sociétés */}
      <div className="rounded-lg border border-compta-border bg-compta-surface p-5">
        <h3 className="text-sm font-semibold">Impôt sur les sociétés</h3>
        <p className="mt-1 text-sm text-compta-text-muted">
          Estimation indicative de l&apos;IS à partir du résultat.
        </p>
        <a
          href={`/${entiteId}/comptabilite/impot`}
          className="mt-3 inline-block rounded-md border border-compta-border px-4 py-2 text-sm transition-colors hover:bg-compta-bg"
        >
          Estimer l&apos;IS
        </a>
      </div>

      {/* Documents juridiques */}
      <div className="rounded-lg border border-compta-border bg-compta-surface p-5">
        <h3 className="text-sm font-semibold">Documents juridiques</h3>
        <p className="mt-1 text-sm text-compta-text-muted">
          Approbation des comptes & rapport de gestion (trames à signer).
        </p>
        <a
          href={`/${entiteId}/comptabilite/documents`}
          className="mt-3 inline-block rounded-md border border-compta-border px-4 py-2 text-sm transition-colors hover:bg-compta-bg"
        >
          Générer un document
        </a>
      </div>

      {/* Export FEC */}
      <div className="rounded-lg border border-compta-border bg-compta-surface p-5">
        <h3 className="text-sm font-semibold">Export FEC</h3>
        <p className="mt-1 text-sm text-compta-text-muted">
          Fichier des Écritures Comptables au format officiel (expert-comptable
          ou contrôle).
        </p>
        <a
          href={`/${entiteId}/comptabilite/fec`}
          className="mt-3 inline-block rounded-md bg-compta-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-compta-accent-hover"
        >
          Télécharger le FEC
        </a>
        {ecritures.length === 0 && (
          <p className="mt-2 text-xs text-compta-text-muted">
            (Aucune écriture pour l&apos;instant : initialise le plan comptable,
            puis saisis une transaction.)
          </p>
        )}
      </div>
    </section>
  );
}
