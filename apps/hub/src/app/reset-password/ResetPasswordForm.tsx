/**
 * ResetPasswordForm — form nouveau mot de passe (Client Component).
 *
 * Architecture (changée après debug du 30/05/2026) :
 *  - Le flow recovery Supabase pose le session côté CLIENT via le hash
 *    `#access_token=...` capté par @supabase/ssr.
 *  - On reste donc 100% côté client : updateUser({password}) est appelé
 *    via le BrowserClient (qui possède la session).
 *  - À la fin on redirige via router.push() vers /login?reset=ok.
 *
 * Pourquoi pas une server action ?
 *  Le cookie posé par createBrowserClient via document.cookie n'arrive pas
 *  toujours côté server action dans le même round-trip → updateUser() ne voit
 *  pas la session côté serveur → "lien invalide" alors que tout va bien.
 *  Le pattern client est celui que Supabase doc recommande pour ce flow.
 *
 * Sécurité (rappels) :
 *  - updateUser() REQUIERT une session valide → impossible de créer un compte
 *    via ce flow (cf. docs/OAUTH_ARCHITECTURE.md §8 bis).
 *  - Validation côté client : 8 chars min + confirmation identique.
 *  - On ne stocke jamais le mot de passe au-delà de la frappe.
 */
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type AuthState = "loading" | "ready" | "no-session";

/**
 * Traduit les erreurs Supabase Auth (anglaises) en messages user-friendly FR.
 * On garde une fallback "raw" pour les erreurs non listées (utile en dev).
 */
function translateSupabaseError(msg: string): string {
  const lower = msg.toLowerCase();
  if (lower.includes("different from the old password")) {
    return "Ce mot de passe est identique à l'ancien. Choisis-en un différent.";
  }
  if (lower.includes("password should be at least")) {
    return "Mot de passe trop court (8 caractères minimum).";
  }
  if (lower.includes("password should contain")) {
    return "Le mot de passe ne respecte pas la politique de complexité.";
  }
  if (lower.includes("auth session missing") || lower.includes("session_not_found")) {
    return "Lien expiré. Refais une demande de réinitialisation.";
  }
  if (lower.includes("rate limit") || lower.includes("too many requests")) {
    return "Trop de tentatives. Réessaye dans quelques minutes.";
  }
  // Fallback : on affiche le message Supabase tel quel (rare, utile pour debug)
  return msg;
}

export default function ResetPasswordForm() {
  const router = useRouter();
  const [authState, setAuthState] = useState<AuthState>("loading");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Au mount : on doit récupérer la session "recovery" posée par Supabase via
  // le lien email. Selon le flowType configuré sur le projet Supabase, ça
  // arrive via :
  //   (a) un hash de l'URL : `#access_token=...&refresh_token=...&type=recovery`
  //   (b) un ?code=... (PKCE) à échanger via exchangeCodeForSession()
  //
  // On gère les deux cas explicitement plutôt que de compter sur l'auto-detect
  // du BrowserClient qui peut louper selon la version de @supabase/ssr.
  useEffect(() => {
    const supabase = createClient();

    async function bootstrapRecoverySession() {
      console.log("[reset-password] bootstrap start", {
        hash: window.location.hash,
        search: window.location.search,
      });

      // === Cas A : hash `#access_token=...` (implicit grant) ===
      if (window.location.hash && window.location.hash.length > 1) {
        const params = new URLSearchParams(window.location.hash.substring(1));
        const accessToken = params.get("access_token");
        const refreshToken = params.get("refresh_token");
        const type = params.get("type");

        if (type === "recovery" && accessToken && refreshToken) {
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          if (error) {
            console.error("[reset-password] setSession failed:", error.message);
            setAuthState("no-session");
            return;
          }
          // Clean URL pour éviter de re-parser au refresh
          window.history.replaceState({}, "", window.location.pathname);
          setAuthState("ready");
          return;
        }
      }

      // === Cas B : ?code=... (PKCE) ===
      const code = new URLSearchParams(window.location.search).get("code");
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) {
          console.error("[reset-password] exchangeCodeForSession failed:", error.message);
          setAuthState("no-session");
          return;
        }
        window.history.replaceState({}, "", window.location.pathname);
        setAuthState("ready");
        return;
      }

      // === Fallback : peut-être qu'une session existe déjà (refresh de page) ===
      const { data } = await supabase.auth.getSession();
      console.log("[reset-password] fallback getSession:", !!data.session);
      setAuthState(data.session ? "ready" : "no-session");
    }

    bootstrapRecoverySession();

    // Listener pour catcher les events Supabase tardifs (au cas où)
    const { data: subscription } = supabase.auth.onAuthStateChange((event) => {
      console.log("[reset-password] onAuthStateChange:", event);
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") {
        setAuthState("ready");
      }
    });
    return () => subscription.subscription.unsubscribe();
  }, []);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (password !== confirm) {
      setError("Les deux mots de passe ne correspondent pas.");
      return;
    }
    if (password.length < 8) {
      setError("8 caractères minimum.");
      return;
    }

    setSubmitting(true);

    const supabase = createClient();
    // updateUser côté client : utilise la session de recovery déjà posée.
    // Impossible de créer un compte ici — updateUser REQUIERT une session.
    const { error: updateError } = await supabase.auth.updateUser({ password });

    if (updateError) {
      console.error("[reset-password] updateUser error:", updateError.message);
      setError(translateSupabaseError(updateError.message));
      setSubmitting(false);
      return;
    }

    // Succès → on redirige vers /login avec un flag pour afficher le toast.
    router.push("/login?reset=ok");
  }

  if (authState === "loading") {
    return (
      <p className="text-center text-sm text-white/60">Vérification du lien…</p>
    );
  }

  if (authState === "no-session") {
    return (
      <div
        role="alert"
        className="rounded-2xl border border-red-500/20 bg-red-500/5 px-5 py-4 text-sm text-red-200"
      >
        <p>Lien invalide ou expiré.</p>
        <p className="mt-2 text-xs text-white/50">
          Refais une demande depuis la page « Mot de passe oublié ».
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label
          htmlFor="password"
          className="mb-1 block text-xs uppercase tracking-wider text-white/50"
        >
          Nouveau mot de passe
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

      <div>
        <label
          htmlFor="confirm"
          className="mb-1 block text-xs uppercase tracking-wider text-white/50"
        >
          Confirme le mot de passe
        </label>
        <input
          id="confirm"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          placeholder="Retape le même"
          className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-sm text-white placeholder-white/30 focus:border-white/30 focus:bg-white/[0.06] focus:outline-none"
        />
      </div>

      {error && (
        <p
          role="alert"
          className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-200"
        >
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={submitting || !password || !confirm}
        className="w-full rounded-xl bg-white px-4 py-2.5 text-sm font-medium text-[#04040e] transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {submitting ? "Mise à jour…" : "Définir mon nouveau mot de passe"}
      </button>
    </form>
  );
}
