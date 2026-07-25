/**
 * PAGE D'UNE LEÇON — Server Component, structure « vrai cours » en 3 temps :
 *  1. Le cours (Markdown, sections normales) ;
 *  2. La mise en pratique → carte verte 🛠️ (à faire dans MES vrais projets) ;
 *  3. Le quiz de la leçon (content/quiz/<techno>-<lecon>.json) s'il existe.
 * Plus : bouton « leçon terminée » (+30 XP) et navigation précédente/suivante.
 */
import Link from "next/link";
import { notFound } from "next/navigation";
import ReactMarkdown from "react-markdown";
import {
  getLecon,
  listerLecons,
  listerParcours,
} from "@/lib/fiches/parcours";
import { getQuiz } from "@/lib/fiches/quiz";
import QuizFiche from "@/app/components/QuizFiche";
import BoutonLeconFaite from "@/app/components/BoutonLeconFaite";

/** Pré-génère toutes les pages de leçons au build. */
export function generateStaticParams() {
  return listerParcours().flatMap((p) =>
    listerLecons(p.slug).map((l) => ({ techno: p.slug, lecon: l.fichier })),
  );
}

interface SectionLecon {
  titre: string | null;
  corps: string;
}

/** Même découpage tolérant par `## ` que la page fiche. */
function decouperSections(contenu: string): SectionLecon[] {
  return contenu.split(/\n(?=##\s)/).map((morceau) => {
    const entete = morceau.match(/^##\s+(.+)\r?\n?/);
    if (!entete) return { titre: null, corps: morceau };
    return { titre: entete[1]!.trim(), corps: morceau.slice(entete[0].length) };
  });
}

export default async function PageLecon({
  params,
}: {
  params: Promise<{ techno: string; lecon: string }>;
}) {
  const { techno, lecon: fichier } = await params;
  const lecon = getLecon(techno, fichier);
  if (!lecon) notFound();

  const parcours = listerParcours().find((p) => p.slug === techno);
  const lecons = listerLecons(techno);
  const position = lecons.findIndex((l) => l.fichier === fichier);
  const precedente = position > 0 ? lecons[position - 1] : undefined;
  const suivante =
    position < lecons.length - 1 ? lecons[position + 1] : undefined;

  const quiz = getQuiz(lecon.id);
  const sections = decouperSections(lecon.contenu);

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <Link
        href={`/parcours/${techno}`}
        className="text-sm text-cours-text-muted hover:text-cours-accent"
      >
        ← {parcours?.titre ?? "Parcours"}
      </Link>

      <header className="anim-arrivee mb-8 mt-4 rounded-2xl border-l-4 border-cours-accent bg-cours-surface p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-wide text-cours-text-muted">
          {parcours?.icone} Leçon {lecon.ordre}/{lecons.length} · {lecon.niveau}{" "}
          · ~{lecon.duree} min
        </p>
        <h1 className="mt-1 text-3xl font-bold leading-tight">{lecon.titre}</h1>
      </header>

      {sections.map((section, i) => {
        const titreMin = section.titre?.toLowerCase() ?? "";

        // Carte « mise en pratique » : l'exercice à faire dans MES projets.
        if (titreMin.includes("mise en pratique")) {
          return (
            <aside
              key={i}
              className="fiche-contenu anim-arrivee mb-6 rounded-2xl border border-emerald-300 bg-emerald-50 p-6"
            >
              <p className="mb-3 text-sm font-bold uppercase tracking-wide text-emerald-700">
                🛠️ Mise en pratique — dans TES projets
              </p>
              <ReactMarkdown>{section.corps}</ReactMarkdown>
            </aside>
          );
        }

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

      {/* ---- Le quiz de la leçon ---- */}
      {quiz && (
        <section className="mt-10 border-t border-cours-border pt-8">
          <h2 className="mb-1 text-xl font-bold">Teste-toi ✍️</h2>
          <p className="mb-4 text-sm text-cours-text-muted">
            {quiz.questions.length} questions sur cette leçon.
          </p>
          <QuizFiche
            idQuiz={lecon.id}
            titre={lecon.titre}
            questions={quiz.questions}
          />
        </section>
      )}

      {/* ---- Valider la leçon ---- */}
      <div className="mt-10">
        <BoutonLeconFaite idLecon={lecon.id} />
      </div>

      {/* ---- Navigation précédente / suivante ---- */}
      <nav className="mt-10 flex items-center justify-between gap-4 border-t border-cours-border pt-6 text-sm">
        {precedente ? (
          <Link
            href={`/parcours/${techno}/${precedente.fichier}`}
            className="text-cours-text-muted transition-colors hover:text-cours-accent"
          >
            ← {precedente.titre}
          </Link>
        ) : (
          <span />
        )}
        {suivante ? (
          <Link
            href={`/parcours/${techno}/${suivante.fichier}`}
            className="rounded-xl border border-cours-border px-4 py-2 font-semibold transition-colors hover:border-cours-accent hover:text-cours-accent"
          >
            {suivante.titre} →
          </Link>
        ) : (
          <span className="font-semibold text-emerald-600">
            Dernière leçon du parcours 🏁
          </span>
        )}
      </nav>
    </div>
  );
}
