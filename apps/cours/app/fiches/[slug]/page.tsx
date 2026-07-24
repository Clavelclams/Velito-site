/**
 * Page d'une fiche — Server Component.
 * Rend le Markdown via react-markdown (rendu TEXTE sécurisé : jamais de
 * HTML brut interprété — même parade XSS que partout ailleurs).
 */
import Link from "next/link";
import { notFound } from "next/navigation";
import ReactMarkdown from "react-markdown";
import { getFiche, listerFiches } from "@/lib/fiches/fiches";

const NOMS_BLOCS: Record<1 | 2 | 3, string> = {
  1: "Bloc 1 · Développer",
  2: "Bloc 2 · Concevoir",
  3: "Bloc 3 · Déployer",
};

/** Pré-génère les pages de toutes les fiches au build (site statique). */
export function generateStaticParams() {
  return listerFiches().map((f) => ({ slug: f.slug }));
}

export default async function FichePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const fiche = getFiche(slug);
  if (!fiche) notFound();

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <Link
        href="/"
        className="text-sm text-cours-text-muted hover:text-cours-accent"
      >
        ← Toutes les fiches
      </Link>

      <header className="mb-8 mt-4 border-b border-cours-border pb-6">
        <h1 className="text-3xl font-bold">{fiche.titre}</h1>
        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
          <span className="rounded-full bg-cours-accent/10 px-2.5 py-1 font-semibold text-cours-accent">
            {NOMS_BLOCS[fiche.bloc]}
          </span>
          <span className="rounded-full border border-cours-border px-2.5 py-1 capitalize">
            {fiche.projet}
          </span>
          {fiche.themes.map((t) => (
            <span
              key={t}
              className="rounded-full border border-cours-border px-2.5 py-1 text-cours-text-muted"
            >
              {t}
            </span>
          ))}
        </div>
        {fiche.source && (
          <p className="mt-3 font-mono text-xs text-cours-text-muted">
            📄 {fiche.source}
          </p>
        )}
      </header>

      <article className="fiche-contenu">
        <ReactMarkdown>{fiche.contenu}</ReactMarkdown>
      </article>
    </div>
  );
}
