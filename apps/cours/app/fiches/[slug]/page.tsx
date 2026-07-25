/**
 * Page d'une fiche — Server Component, version « leçon ».
 *
 * Rend le Markdown via react-markdown (rendu TEXTE sécurisé : jamais de
 * HTML brut interprété — même parade XSS que partout ailleurs), mais en
 * DÉCOUPANT le contenu par sections `## ` pour styler différemment les deux
 * sections rituelles des fiches :
 *  - « Comment je l'explique au jury » → carte accent (à dire mot pour mot) ;
 *  - « La question vicieuse du jury »  → carte ambre (le piège à anticiper).
 * Une fiche sans ces sections s'affiche normalement (découpage tolérant).
 *
 * S'y ajoutent : la barre de lecture (fiche lue à 85 % = +20 XP) et le quiz
 * de la fiche s'il existe (content/quiz/<slug>.json).
 */
import Link from "next/link";
import { notFound } from "next/navigation";
import ReactMarkdown from "react-markdown";
import { getFiche, listerFiches } from "@/lib/fiches/fiches";
import { getQuiz } from "@/lib/fiches/quiz";
import { ACCENTS_BLOCS, NOMS_BLOCS } from "@/lib/fiches/blocs";
import BarreLecture from "@/app/components/BarreLecture";
import QuizFiche from "@/app/components/QuizFiche";

/** Pré-génère les pages de toutes les fiches au build (site statique). */
export function generateStaticParams() {
  return listerFiches().map((f) => ({ slug: f.slug }));
}

interface SectionFiche {
  titre: string | null;
  corps: string;
}

/** Découpe le Markdown en sections de niveau `## ` (tolérant : sans ##, une seule section). */
function decouperSections(contenu: string): SectionFiche[] {
  return contenu.split(/\n(?=##\s)/).map((morceau) => {
    const entete = morceau.match(/^##\s+(.+)\r?\n?/);
    if (!entete) return { titre: null, corps: morceau };
    return { titre: entete[1]!.trim(), corps: morceau.slice(entete[0].length) };
  });
}

export default async function FichePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const fiche = getFiche(slug);
  if (!fiche) notFound();

  const quiz = getQuiz(slug);
  const accent = ACCENTS_BLOCS[fiche.bloc];
  const sections = decouperSections(fiche.contenu);

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <BarreLecture slug={fiche.slug} />

      <Link
        href="/"
        className="text-sm text-cours-text-muted hover:text-cours-accent"
      >
        ← Toutes les fiches
      </Link>

      <header
        className={`anim-arrivee mb-8 mt-4 rounded-2xl border-l-4 ${accent.bordure} bg-cours-surface p-6 shadow-sm`}
      >
        <h1 className="text-3xl font-bold leading-tight">{fiche.titre}</h1>
        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
          <span
            className={`rounded-full px-2.5 py-1 font-semibold ${accent.fond} ${accent.texte}`}
          >
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

      {sections.map((section, i) => {
        const titreMin = section.titre?.toLowerCase() ?? "";

        // Carte « à dire au jury » : la réponse orale prête à réciter.
        if (titreMin.includes("explique au jury")) {
          return (
            <aside
              key={i}
              className="fiche-contenu anim-arrivee mb-6 rounded-2xl border border-cours-accent/30 bg-cours-accent/5 p-6"
            >
              <p className="mb-3 text-sm font-bold uppercase tracking-wide text-cours-accent">
                🎙️ À dire au jury — mot pour mot
              </p>
              <ReactMarkdown>{section.corps}</ReactMarkdown>
            </aside>
          );
        }

        // Carte « question vicieuse » : le piège probable + la réponse qui tient.
        if (titreMin.includes("vicieuse")) {
          return (
            <aside
              key={i}
              className="fiche-contenu anim-arrivee mb-6 rounded-2xl border border-cours-bloc3/30 bg-cours-bloc3/5 p-6"
            >
              <p className="mb-3 text-sm font-bold uppercase tracking-wide text-cours-bloc3">
                ⚠️ La question vicieuse du jury
              </p>
              <ReactMarkdown>{section.corps}</ReactMarkdown>
            </aside>
          );
        }

        // Section normale (« Le concept », ou fiche sans structure rituelle).
        return (
          <article key={i} className="fiche-contenu mb-6">
            {section.titre && (
              <h2 className="mb-3 mt-8 border-b border-cours-border pb-1 text-xl font-bold">
                {section.titre}
              </h2>
            )}
            <ReactMarkdown>{section.corps}</ReactMarkdown>
          </article>
        );
      })}

      {/* ---- Le quiz de la fiche (s'il existe) ---- */}
      {quiz && (
        <section className="mt-10 border-t border-cours-border pt-8">
          <h2 className="mb-1 text-xl font-bold">Teste-toi ✍️</h2>
          <p className="mb-4 text-sm text-cours-text-muted">
            {quiz.questions.length} questions sur cette fiche. Une seule
            tentative par question — comme devant le jury.
          </p>
          <QuizFiche
            idQuiz={fiche.slug}
            titre={fiche.titre}
            questions={quiz.questions}
          />
        </section>
      )}
    </div>
  );
}
