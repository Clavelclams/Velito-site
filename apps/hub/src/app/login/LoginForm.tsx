/**
 * LoginForm — formulaire email + password, validation client + serveur.
 * Read ?return=... pour rediriger après login (vers l'app d'origine).
 */
"use client";

import { useState, useTransition } from "react";
import { useSearchParams } from "next/navigation";
import { signInAction } from "./actions";

export default function LoginForm() {
  const params = useSearchParams();
  const returnTo = params.get("return") ?? "/";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!email.includes("@") || password.length < 6) {
      setError("Email valide + mot de passe (6+ caractères) requis.");
      return;
    }
    startTransition(async () => {
      const res = await signInAction({ email, password, returnTo });
      if (!res.success) {
        setError(res.error ?? "Erreur de connexion");
      }
      // Si succès, signInAction redirige côté serveur — on ne revient pas ici.
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="email" className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-white/60">
          Email
        </label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value.slice(0, 200))}
          autoComplete="email"
          required
          className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-white/30 focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-400/20"
          placeholder="clavel@velito.fr"
        />
      </div>
      <div>
        <label htmlFor="password" className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-white/60">
          Mot de passe
        </label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value.slice(0, 200))}
          autoComplete="current-password"
          required
          className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-white/30 focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-400/20"
        />
      </div>
      {error && (
        <div role="alert" className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      )}
      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-lg bg-violet-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-violet-400 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isPending ? "Connexion…" : "Se connecter"}
      </button>
      <p className="text-center text-[11px] italic text-white/40">
        Tu seras redirigé vers : <span className="font-mono">{returnTo}</span>
      </p>
    </form>
  );
}
