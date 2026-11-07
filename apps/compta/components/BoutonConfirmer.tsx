"use client";

/**
 * Bouton qui demande confirmation puis appelle une server action déjà liée
 * à ses arguments côté serveur (action.bind(null, …)). Réutilisable pour
 * toute suppression simple (Lot 6 : virement, solde observé).
 */
import { useTransition } from "react";
import { useRouter } from "next/navigation";

export function BoutonConfirmer({
  action,
  question,
  libelle,
  ton = "danger",
}: {
  action: () => Promise<{ success: boolean; error?: string }>;
  question: string;
  libelle: string;
  /** "danger" = lien rouge (suppression) ; "normal" = bouton principal. */
  ton?: "danger" | "normal";
}) {
  const router = useRouter();
  const [enCours, demarrer] = useTransition();
  return (
    <button
      type="button"
      disabled={enCours}
      onClick={() => {
        if (!window.confirm(question)) return;
        demarrer(async () => {
          const r = await action();
          if (!r.success) window.alert(r.error ?? "Action impossible.");
          router.refresh();
        });
      }}
      className={
        ton === "danger"
          ? "text-xs text-compta-depense underline-offset-2 hover:underline disabled:opacity-50"
          : "whitespace-nowrap rounded-md bg-compta-accent px-4 py-2 text-sm font-medium text-white hover:bg-compta-accent-hover disabled:opacity-50"
      }
    >
      {enCours ? "…" : libelle}
    </button>
  );
}
