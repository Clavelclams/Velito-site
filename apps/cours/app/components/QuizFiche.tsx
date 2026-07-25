/**
 * QUIZ INTERACTIF — composant CLIENT.
 *
 * Le principe pédagogique (façon Flexbox Froggy / Duolingo) : une question
 * à la fois, réponse par clic, et FEEDBACK IMMÉDIAT — pas juste vrai/faux,
 * mais l'explication du prof (pourquoi c'est ça, pourquoi le piège était
 * tentant). C'est le feedback qui fait apprendre, pas le score.
 *
 * Les questions arrivent en PROPS depuis un Server Component (qui les lit
 * via lib/fiches/quiz.ts) : aucun accès fichier ici. L'XP et le meilleur
 * score sont enregistrés dans le navigateur via lib/progression.ts.
 */
"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { QuestionQuiz } from "@/lib/fiches/quiz";
import { enregistrerQuiz } from "@/lib/progression";

/** Une question de révision, éventuellement rattachée à sa fiche d'origine. */
export interface QuestionRevision extends QuestionQuiz {
  ficheSlug?: string;
  ficheTitre?: string;
}

export default function QuizFiche({
  idQuiz,
  titre,
  questions,
}: {
  /** Identifiant sous lequel le score est enregistré (slug de fiche, ou "revision-du-jour"). */
  idQuiz: string;
  titre: string;
  questions: QuestionRevision[];
}) {
  const [indexQuestion, setIndexQuestion] = useState(0);
  /** null = pas encore répondu ; sinon l'index du choix cliqué. */
  const [choixFait, setChoixFait] = useState<number | null>(null);
  const [bonnesReponses, setBonnesReponses] = useState(0);
  const [termine, setTermine] = useState(false);
  const [xpGagnee, setXpGagnee] = useState(0);
  /** Incrémenté à chaque « Refaire » pour remélanger les questions. */
  const [manche, setManche] = useState(0);

  // Ordre des questions mélangé à chaque manche (Fisher-Yates simplifié).
  const ordre = useMemo(() => {
    const indices = questions.map((_, i) => i);
    for (let i = indices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [indices[i]!, indices[j]!] = [indices[j]!, indices[i]!];
    }
    return indices;
    // `manche` force volontairement un nouveau mélange à chaque « Refaire ».
  }, [questions, manche]);

  const question = questions[ordre[indexQuestion] ?? 0];
  if (!question) return null;
  const estBonne = choixFait !== null && choixFait === question.bonne;

  function repondre(index: number) {
    if (choixFait !== null) return; // une seule tentative par question
    setChoixFait(index);
    if (index === question!.bonne) setBonnesReponses((n) => n + 1);
  }

  function suivante() {
    const score = bonnesReponses;
    if (indexQuestion + 1 >= questions.length) {
      // Fin du quiz : on enregistre et on affiche l'écran de score.
      setXpGagnee(enregistrerQuiz(idQuiz, score, questions.length));
      setTermine(true);
    } else {
      setIndexQuestion((i) => i + 1);
      setChoixFait(null);
    }
  }

  function refaire() {
    setManche((m) => m + 1);
    setIndexQuestion(0);
    setChoixFait(null);
    setBonnesReponses(0);
    setTermine(false);
    setXpGagnee(0);
  }

  /* ---- Écran de fin : score + XP ---- */
  if (termine) {
    const parfait = bonnesReponses === questions.length;
    return (
      <div className="anim-pop rounded-2xl border border-cours-border bg-cours-surface p-8 text-center">
        <p className="text-5xl">{parfait ? "🏆" : bonnesReponses > questions.length / 2 ? "💪" : "📚"}</p>
        <p className="mt-3 text-2xl font-bold tabular-nums">
          {bonnesReponses} / {questions.length}
        </p>
        <p className="mt-1 text-sm text-cours-text-muted">
          {parfait
            ? "Sans faute. Tu peux le défendre au jury."
            : bonnesReponses > questions.length / 2
              ? "Bien. Relis les explications ratées et refais-le : le sans-faute est proche."
              : "Pas grave — relis la fiche, les explications sont là pour ça."}
        </p>
        <p className="mt-4 inline-block rounded-full bg-cours-accent/10 px-4 py-1.5 text-sm font-bold text-cours-accent">
          +{xpGagnee} XP
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <button
            type="button"
            onClick={refaire}
            className="rounded-xl bg-cours-accent px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-cours-accent-hover"
          >
            Refaire le quiz
          </button>
          <Link
            href="/"
            className="rounded-xl border border-cours-border px-5 py-2.5 text-sm font-semibold text-cours-text-muted transition-colors hover:border-cours-accent hover:text-cours-accent"
          >
            Retour au tableau de bord
          </Link>
        </div>
      </div>
    );
  }

  /* ---- Écran question ---- */
  return (
    <div className="rounded-2xl border border-cours-border bg-cours-surface p-6">
      {/* Barre de progression du quiz */}
      <div className="mb-1 flex items-center justify-between text-xs text-cours-text-muted">
        <span className="font-semibold uppercase tracking-wide">{titre}</span>
        <span className="tabular-nums">
          {indexQuestion + 1} / {questions.length}
        </span>
      </div>
      <div className="mb-5 h-1.5 overflow-hidden rounded-full bg-cours-border">
        <div
          className="h-full rounded-full bg-cours-accent transition-all duration-500"
          style={{ width: `${((indexQuestion + (choixFait !== null ? 1 : 0)) / questions.length) * 100}%` }}
        />
      </div>

      <p className="text-base font-semibold leading-relaxed">{question.question}</p>

      <div className="mt-4 space-y-2">
        {question.choix.map((choix, i) => {
          // Style de chaque choix selon la phase : neutre → vert/rouge après réponse.
          let classes =
            "w-full rounded-xl border px-4 py-3 text-left text-sm transition-all ";
          if (choixFait === null) {
            classes +=
              "border-cours-border bg-cours-bg hover:border-cours-accent hover:bg-cours-accent/5 cursor-pointer";
          } else if (i === question.bonne) {
            classes += "border-emerald-500 bg-emerald-50 font-semibold anim-pop";
          } else if (i === choixFait) {
            classes += "border-red-400 bg-red-50 anim-secousse";
          } else {
            classes += "border-cours-border bg-cours-bg opacity-50";
          }
          return (
            <button
              key={i}
              type="button"
              onClick={() => repondre(i)}
              disabled={choixFait !== null}
              className={classes}
            >
              <span className="mr-2 font-bold text-cours-text-muted">
                {String.fromCharCode(65 + i)}.
              </span>
              {choix}
            </button>
          );
        })}
      </div>

      {/* Le feedback prof : l'explication, TOUJOURS affichée après la réponse */}
      {choixFait !== null && (
        <div
          className={`anim-arrivee mt-4 rounded-xl border p-4 text-sm leading-relaxed ${
            estBonne
              ? "border-emerald-200 bg-emerald-50"
              : "border-amber-200 bg-amber-50"
          }`}
        >
          <p className="font-bold">
            {estBonne ? "✅ Exact." : "❌ Pas celle-là."}
          </p>
          <p className="mt-1">{question.explication}</p>
          {question.ficheSlug && (
            <Link
              href={`/fiches/${question.ficheSlug}`}
              className="mt-2 inline-block font-semibold text-cours-accent underline underline-offset-2 hover:text-cours-accent-hover"
            >
              Revoir la fiche{question.ficheTitre ? ` « ${question.ficheTitre} »` : ""} →
            </Link>
          )}
          <div className="mt-3 text-right">
            <button
              type="button"
              onClick={suivante}
              className="rounded-xl bg-cours-accent px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-cours-accent-hover"
            >
              {indexQuestion + 1 >= questions.length ? "Voir mon score" : "Question suivante →"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
