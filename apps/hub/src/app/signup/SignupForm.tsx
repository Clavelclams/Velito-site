/**
 * SignupForm — formulaire email + password + confirm, validation client + serveur.
 *
 * Flow UX :
 *  1. État initial : 3 champs (email, password, confirm) + bouton "Créer mon compte"
 *  2. Submit → server action → si OK on bascule en état succès
 *  3. État succès : "On t'a envoyé un email" + lien retour login
 *
 * Sécurité :
 *  - Validation locale (format email, longueur mdp, match confirm)
 *  - Re-validation serveur (la source de vérité, côté locale c'est juste UX)
 *  - Si déjà inscrit : Supabase renvoie quand même un message succès générique
 *    (anti-énumération — on ne révèle pas si l'email existe)
 */
"use client";

import { useState, useTransition } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { signUpAction } from "./actions";

export default function SignupForm() {
  const params = useSearchParams();
  const returnTo = params.get("return") ?? "/";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [successInfo, setSuccessInfo] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccessInfo(null);

    // Validations client (la source de vérité reste le serveur, c'est UX)
    if (!email.includes("@")) {
      setError("Email valide requis.");
      return;
    }
    if (password.length < 8) {
      setError("Mot de passe trop court (8 caractères minimum).");
      return;
    }
    if (password !== confirmPassword) {
      setError("Les deux mots de passe ne correspondent pas.");
      return;
    }

    startTransition(async () => {
      const res = await signUpAction({
        email,
        password,
        confirmPassword,
        returnTo,
      });
      if (!res.success) {
        setError(res.error ?? "Erreur lors de l'inscription.");
        return;
      }
      // Succès : on affiche le message d'info ("vérifie ton mail")
      setSuccessInfo(res.info ?? "Compte créé. Vérifie tes mails.");
      // On reset les champs pour éviter qu'un autre user ne voie le mdp
      setEmail("");
      setPassword("");
      setConfirmPassword("");
    });
  }

  // ═══════════ État SUCCÈS — affiche le message + lien retour ═══════════
  if (successInfo) {
    return (
      <div className="space-y-6 text-center">
        <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-300">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-8 w-8"
            aria-hidden="true"
          >
            <path d="M4 4h16v16H4z" />
            <polyline points="22,6 12,13 2,6" />
          </svg>
        </div>
        <div>
          <h2 className="font-display text-xl font-bold text-white">
            Vérifie ta boîte mail
          </h2>
          <p className="mt-3 text-sm text-white/70">{successInfo}</p>
        </div>
        <div className="space-y-2 text-xs text-white/50">
          <p>Pas reçu après 2 min ? Vérifie les spams.</p>
          <p>
            <Link
              href="/signup"
              onClick={() => setSuccessInfo(null)}
              className="text-violet-300 underline-offset-4 hover:text-white hover:underline"
            >
              Renvoyer ou changer d&apos;email
            </Link>
          </p>
        </div>
        <Link
          href="/login"
          className="inline-block rounded-lg bg-white px-5 py-3 text-sm font-semibold text-[#04040e] transition hover:bg-white/90"
        >
          Aller à la connexion
        </Link>
      </div>
    );
  }

  // ═══════════ État FORMULAIRE ═══════════
  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label
          htmlFor="email"
          className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-white/60"
        >
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
        <label
          htmlFor="password"
          className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-white/60"
        >
          Mot de passe
        </label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value.slice(0, 200))}
          autoComplete="new-password"
          required
          className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-white/30 focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-400/20"
          placeholder="8 caractères minimum"
        />
      </div>

      <div>
        <label
          htmlFor="confirm"
          className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-white/60"
        >
          Confirmer le mot de passe
        </label>
        <input
          id="confirm"
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value.slice(0, 200))}
          autoComplete="new-password"
          required
          className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-white/30 focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-400/20"
          placeholder="même mot de passe"
        />
      </div>

      {error && (
        <div
          role="alert"
          className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200"
        >
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-lg bg-violet-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-violet-400 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isPending ? "Création…" : "Créer mon compte"}
      </button>

      <p className="text-center text-[11px] italic text-white/40">
        Déjà un compte ?{" "}
        <Link
          href={`/login?return=${encodeURIComponent(returnTo)}`}
          className="text-violet-300 underline-offset-4 hover:text-white hover:underline"
        >
          Se connecter
        </Link>
      </p>
    </form>
  );
}
