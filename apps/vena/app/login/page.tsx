/**
 * /login VENA — connexion admin (Supabase Auth).
 *
 * Page non liée dans la navigation (accès direct par URL). Après login réussi,
 * redirige vers ?redirect=... ou /admin par défaut. La page /admin vérifie
 * ensuite la permission "vena" (hasPermission).
 *
 * "use client" : formulaire interactif. useSearchParams sous <Suspense>.
 */
"use client";

import { useState, Suspense, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import HCaptcha from "@hcaptcha/react-hcaptcha";
import { createClient } from "@/lib/supabase/client";

/**
 * Site Key publique hCaptcha (Velito).
 * Activé Supabase Auth → Bot Protection le 11/06/2026 à 3h20.
 * Token obligatoire pour tout signInWithPassword.
 */
const HCAPTCHA_SITE_KEY = "b0b81630-4312-4e44-8c0a-7b24a2445748";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectParam = searchParams.get("redirect");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  // Token hCaptcha — obligatoire depuis activation Supabase 11/06/2026.
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const captchaRef = useRef<HCaptcha>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    // GARDE ANTI-BOUCLE : empêche les double-submits via la touche Entrée
    // pendant que la requête signInWithPassword est en cours. Le
    // `disabled={loading}` du bouton ne bloque PAS le submit via Entrée
    // dans un champ du form. Sans ce guard, plusieurs Entrée rapides
    // déclenchent N requêtes en parallèle → rate limit Supabase 429.
    // Même fix que apps/vea/app/login/page.tsx (boucle 10k req/h résolue).
    if (loading) return;

    // GARDE hCAPTCHA : sans token, Supabase rejette depuis le 11/06/2026.
    if (!captchaToken) {
      setError("Coche le hCaptcha avant de te connecter.");
      return;
    }

    setLoading(true);
    setError("");

    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
      options: { captchaToken },
    });

    // Reset captcha apres chaque tentative (le token est single-use).
    captchaRef.current?.resetCaptcha();
    setCaptchaToken(null);

    if (signInError) {
      // GESTION EXPLICITE DU RATE LIMIT 429 :
      // Supabase renvoie code "over_request_rate_limit" / status 429 quand
      // on a dépassé la limite. On NE doit PAS retraduire ça en "email ou
      // mot de passe incorrect" — sinon l'utilisateur retape son mdp pensant
      // qu'il l'a mal saisi, ce qui relance la boucle.
      const errCode =
        (signInError as { code?: string }).code ??
        (signInError as { name?: string }).name ??
        "";
      const errStatus = (signInError as { status?: number }).status;
      const isRateLimit =
        errCode === "over_request_rate_limit" ||
        errStatus === 429 ||
        signInError.message?.toLowerCase().includes("rate limit");

      if (isRateLimit) {
        setError(
          "Trop de tentatives en peu de temps. Attends quelques minutes avant de réessayer."
        );
      } else {
        setError("Email ou mot de passe incorrect.");
      }
      setLoading(false);
      return;
    }

    router.refresh();
    router.push(redirectParam || "/admin");
  }

  const inputClass =
    "w-full bg-white border border-vena-border rounded-lg px-4 py-3 text-sm text-vena-kaki placeholder-vena-text-dim focus:outline-none focus:border-vena-kaki focus:ring-2 focus:ring-vena-kaki/15 transition-all";

  return (
    <div className="min-h-screen bg-vena-cream flex items-center justify-center px-4 py-12">
      <div className="bg-white border border-vena-border rounded-2xl p-8 sm:p-10 w-full max-w-md shadow-sm">
        <h1 className="text-2xl font-display font-black text-vena-kaki mb-1 text-center">
          Espace <span className="text-vena-kaki">admin</span>
        </h1>
        <p className="text-vena-text-muted mb-8 text-sm text-center">
          Connecte-toi pour accéder aux demandes de devis VENA.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="email"
              className="block text-xs font-semibold text-vena-text-muted uppercase tracking-wider mb-1.5"
            >
              Email
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              className={inputClass}
              placeholder="ton@email.com"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-xs font-semibold text-vena-text-muted uppercase tracking-wider mb-1.5"
            >
              Mot de passe
            </label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              className={inputClass}
              placeholder="••••••••"
            />
          </div>

          {/* Widget hCaptcha — obligatoire depuis activation Supabase 11/06/2026 */}
          <div className="flex justify-center">
            <HCaptcha
              sitekey={HCAPTCHA_SITE_KEY}
              onVerify={(token) => setCaptchaToken(token)}
              onExpire={() => setCaptchaToken(null)}
              onError={() => setCaptchaToken(null)}
              ref={captchaRef}
            />
          </div>

          {error && (
            <div className="border border-red-300 bg-red-50 rounded-lg px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !captchaToken}
            className="btn-vena-primary w-full disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? "Connexion..." : "Se connecter"}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-vena-border text-center">
          <Link
            href="/"
            className="text-xs text-vena-text-dim hover:text-vena-kaki transition-colors"
          >
            ← Retour au site
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-vena-cream flex items-center justify-center">
          <p className="text-vena-text-muted text-sm">Chargement...</p>
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
