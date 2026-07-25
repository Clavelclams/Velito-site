/**
 * RÉVISION DU JOUR — composant CLIENT.
 *
 * Reçoit en props le pool COMPLET des questions (toutes fiches confondues,
 * assemblé côté serveur) et en tire 10 au hasard. Le tirage se fait dans un
 * useEffect : au premier rendu (celui que le serveur a aussi produit), on
 * affiche un écran d'attente identique des deux côtés — sinon le hasard
 * client ≠ rendu serveur et React signale une erreur d'hydratation.
 */
"use client";

import { useEffect, useState } from "react";
import QuizFiche, { type QuestionRevision } from "@/app/components/QuizFiche";

const NB_QUESTIONS = 10;

export default function SessionRevision({
  pool,
}: {
  pool: QuestionRevision[];
}) {
  const [selection, setSelection] = useState<QuestionRevision[] | null>(null);

  useEffect(() => {
    // Mélange Fisher-Yates puis on garde les NB_QUESTIONS premières.
    const copie = [...pool];
    for (let i = copie.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copie[i]!, copie[j]!] = [copie[j]!, copie[i]!];
    }
    setSelection(copie.slice(0, NB_QUESTIONS));
  }, [pool]);

  if (selection === null) {
    return (
      <div className="h-64 rounded-2xl border border-cours-border bg-cours-surface" />
    );
  }

  return (
    <QuizFiche
      idQuiz="revision-du-jour"
      titre="Révision du jour"
      questions={selection}
    />
  );
}
