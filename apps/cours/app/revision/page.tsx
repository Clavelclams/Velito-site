/**
 * RÉVISION DU JOUR — Server Component.
 *
 * Assemble le pool de questions de TOUS les quiz (avec le titre de la fiche
 * d'origine, pour le lien « Revoir la fiche » dans le feedback), puis délègue
 * le tirage aléatoire et le jeu au composant client SessionRevision.
 */
import Link from "next/link";
import { listerFiches } from "@/lib/fiches/fiches";
import { listerQuiz } from "@/lib/fiches/quiz";
import SessionRevision from "@/app/components/SessionRevision";
import type { QuestionRevision } from "@/app/components/QuizFiche";

export default function RevisionPage() {
  const titres = new Map(listerFiches().map((f) => [f.slug, f.titre]));

  const pool: QuestionRevision[] = listerQuiz().flatMap((quiz) =>
    quiz.questions.map((q) => ({
      ...q,
      ficheSlug: quiz.fiche,
      ficheTitre: titres.get(quiz.fiche),
    })),
  );

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <Link
        href="/"
        className="text-sm text-cours-text-muted hover:text-cours-accent"
      >
        ← Tableau de bord
      </Link>

      <header className="mb-8 mt-4">
        <h1 className="text-2xl font-bold sm:text-3xl">Révision du jour 🎯</h1>
        <p className="mt-1 text-sm text-cours-text-muted">
          10 questions tirées au hasard dans tes {pool.length} questions, tous
          projets confondus. Chaque erreur vient avec son explication — c'est
          là que tu apprends.
        </p>
      </header>

      {pool.length === 0 ? (
        <div className="rounded-2xl border border-cours-border bg-cours-surface p-8 text-center text-sm text-cours-text-muted">
          Aucun quiz pour l&apos;instant. Les quiz arrivent avec l&apos;usine à
          fiches : un fichier <code>content/quiz/&lt;slug&gt;.json</code> par
          fiche.
        </div>
      ) : (
        <SessionRevision pool={pool} />
      )}
    </div>
  );
}
