/**
 * SignUpForm — form classique email + mot de passe (Client Component).
 *
 * UX :
 *  - Validation HTML5 (required, type=email, minLength)
 *  - useTransition pour le loading state pendant l'action
 *  - Affiche le message de succès si Supabase envoie un email de confirmation
 *  - Affiche l'erreur générique en cas d'échec
 *
 * Sécurité :
 *  - Le mot de passe n'est jamais stocké dans le state au-delà de la frappe
 *  - autoComplete="new-password" pour signaler au browser que c'est un sign-up
 *  - Le retour serveur ne révèle JAMAIS si l'email existe déjà (anti-énumération)
 */
"use client";

import { useState, useTransition } from "react";
import { signUpAction } from "./actions";

interface SignUpFormProps {
  /** Chemin local de redirection après sign-up (par défaut /dashboard). */
  returnTo?: string;
}

export default function SignUpForm({ returnTo = "/dashboard" }: SignUpFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    startTransition(async () => {
      const result = await signUpAction({ email, password, returnTo });
      if (!result.success && result.error) {
        setError(result.error);
      } else if (result.success && result.message) {
        setSuccessMessage(result.message);
        setPassword(""); // on vide le mdp pour qu'il ne reste pas en mémoire
      }
    });
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label htmlFor="email" className="mb-1 block text-xs uppercase tracking-wider text-white/50">
          Email
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

      <div>
        <label htmlFor="password" className="mb-1 block text-xs uppercase tracking-wider text-white/50">
          Mot de passe
        </label>
        <input
          id="password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="8 caractères minimum"
          className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-sm text-white placeholder-white/30 focus:border-white/30 focus:bg-white/[0.06] focus:outline-none"
        />
      </div>

      {error && (
        <p role="alert" className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-200">
          {error}
        </p>
      )}

      {successMessage && (
        <p role="status" className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-200">
          {successMessage}
        </p>
      )}

      <button
        type="submit"
        disabled={isPending || !email || !password}
        className="btn-tenant w-full justify-center disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isPending ? "Création en cours…" : "Créer mon compte"}
      </button>

      <p className="text-center text-[11px] text-white/40">
        En créant un compte, tu acceptes nos{" "}
        <a href="/cgu" className="underline-offset-4 hover:underline">conditions d&apos;utilisation</a>.
      </p>
    </form>
  );
}
