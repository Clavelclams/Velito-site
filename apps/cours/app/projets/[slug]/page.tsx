/**
 * Page d'une fiche PROJET — Server Component.
 * Même pipeline Markdown que les fiches de révision.
 */
import Link from "next/link";
import { notFound } from "next/navigation";
import ReactMarkdown from "react-markdown";
// remark-gfm : active les tableaux, listes de tâches et liens auto du
// Markdown "GitHub" — le Markdown de base ne connaît pas les tableaux.
import remarkGfm from "remark-gfm";
import { getProjet, listerProjets } from "@/lib/fiches/fiches";

export function generateStaticParams() {
  return listerProjets().map((p) => ({ slug: p.slug }));
}

export default async function ProjetPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const projet = getProjet(slug);
  if (!projet) notFound();

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <Link
        href="/"
        className="text-sm text-cours-text-muted hover:text-cours-accent"
      >
        ← Dashboard
      </Link>

      <header className="mb-8 mt-4 border-b border-cours-border pb-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-3xl font-bold">{projet.titre}</h1>
          <span className="rounded-full border border-cours-border px-3 py-1 text-xs">
            {projet.statut}
          </span>
        </div>
        {/* Barre d'avancement */}
        <div className="mt-4">
          <div className="flex justify-between text-xs text-cours-text-muted">
            <span>Avancement</span>
            <span className="tabular-nums">{projet.avancement}%</span>
          </div>
          <div className="mt-1 h-2 overflow-hidden rounded-full bg-cours-border">
            <div
              className="h-full rounded-full bg-cours-accent"
              style={{ width: `${projet.avancement}%` }}
            />
          </div>
        </div>
        {projet.maj && (
          <p className="mt-3 text-xs text-cours-text-muted">
            Fiche mise à jour le {projet.maj}
          </p>
        )}
      </header>

      <article className="fiche-contenu">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{projet.contenu}</ReactMarkdown>
      </article>
    </div>
  );
}
