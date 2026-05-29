/**
 * ForgotPasswordForm — form email (Client Component).
 *
 * UX :
 *  - Validation HTML5 (required, type=email)
 *  - useTransition pour le loading
 *  - Après submit : on AFFICHE le message générique en remplacement du form
 *    pour empêcher l'utilisateur de relancer en boucle (et accessoirement
 *    rendre l'attaque d'énumération moins pratique).
 *
 * Note sécurité : le message retourné par la server action est TOUJOURS le
 * même, qu'un compte existe ou pas (cf. requestPasswordResetAction).
 */
"use client";

import { useState, useTransition } from "react";
import { requestPasswordResetAction } from "./actions";

export default function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [submittedMessage, setSubmittedMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    startTransition(async () => {
      const result = await requestPasswordResetAction({ email });
      // success est toujours true côté action — on affiche le message générique.
      setSubmittedMessage(result.message);
    });
  };

  // État "demande envoyée" — on remplace le form par le message.
  if (submittedMessage) {
    return (
      <div
        role="status"
        className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 px-5 py-4 text-sm text-emerald-200"
      >
        <p>{submittedMessage}</p>
        <p className="mt-3 text-xs text-white/50">
          Pense à vérifier ton dossier spam. Le lien est valide quelques minutes.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label
          htmlFor="email"
          className="mb-1 block text-xs uppercase tracking-wider text-white/50"
        >
          Email du compte
        </label>
        <input
          id="email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="toi@exemple.fr"
          className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-sm text-white placeholder-white/30 focus:border-white/30 focus:bg-white/[0.06] focus:outline-none"
        />
      </div>

      <button
        type="submit"
        disabled={isPending || !email}
        className="w-full rounded-xl bg-white px-4 py-2.5 text-sm font-medium text-[#04040e] transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isPending ? "Envoi en cours…" : "Envoyer le lien de réinitialisation"}
      </button>
    </form>
  );
}
