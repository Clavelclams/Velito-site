/**
 * HUB DES PARCOURS — Server Component.
 * Liste les parcours (dossiers content/parcours/*) ; la progression de
 * chaque carte est calculée côté client par GrilleParcours (localStorage).
 */
import Link from "next/link";
import { listerParcours } from "@/lib/fiches/parcours";
import GrilleParcours from "@/app/components/GrilleParcours";

export default function ParcoursPage() {
  const parcours = listerParcours();

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <Link
        href="/"
        className="text-sm text-cours-text-muted hover:text-cours-accent"
      >
        ← Tableau de bord
      </Link>

      <header className="mb-8 mt-4">
        <h1 className="text-3xl font-bold">Parcours 📚</h1>
        <p className="mt-1 max-w-2xl text-sm leading-relaxed text-cours-text-muted">
          Les technos de ta stack, reprises depuis zéro jusqu&apos;au niveau
          « défendable au jury ». Une leçon par jour : le cours, la mise en
          pratique dans tes vrais projets, le quiz.
        </p>
      </header>

      {parcours.length === 0 ? (
        <div className="rounded-2xl border border-cours-border bg-cours-surface p-8 text-center text-sm text-cours-text-muted">
          Aucun parcours pour l&apos;instant. Un parcours = un dossier{" "}
          <code>content/parcours/&lt;techno&gt;/</code> avec un{" "}
          <code>_parcours.json</code> et des leçons <code>NN-slug.md</code>.
        </div>
      ) : (
        <GrilleParcours parcours={parcours} />
      )}
    </div>
  );
}
