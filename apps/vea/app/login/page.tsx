/**
 * Page /login — Connexion publique unifiee.
 *
 * Une seule page Connexion pour tous. Apres login Supabase reussi, on
 * redirige automatiquement vers la bonne destination en fonction des
 * permissions de l'user (cf. /api/auth/after-login).
 *
 *   - User avec scope >= editor sur vea -> /admin
 *   - Tous les autres                   -> /profil
 *
 * "use client" car form interactif.
 */
"use client";

import { useState, Suspense, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import HCaptcha from "@hcaptcha/react-hcaptcha";
import { createClient } from "@/lib/supabase/client";

/**
 * Site Key publique hCaptcha (Velito).
 * Activé côté Supabase Auth → Settings → Bot Protection le 11/06/2026 à 3h20.
 * À partir de cette date, tout signInWithPassword sans captchaToken est rejeté.
 */
const HCAPTCHA_SITE_KEY = "b0b81630-4312-4e44-8c0a-7b24a2445748";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectParam = searchParams.get("redirect");

  // ⚠️ ARCHI : VEA = asso loi 1901 INDÉPENDANTE de l'écosystème VENA (Hub /
  // Arena / Interactive / Prévention). Donc le reset password VEA NE doit PAS
  // pointer vers hub.velito.fr — il doit rester sur vea.velito.fr (page locale).
  // Cf. docs/SSO_ARCHITECTURE.md §10 (séparation VEA).
  const forgotPasswordUrl = "/auth/forgot-password";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  // Token hCaptcha généré par le widget — obligatoire depuis 11/06/2026
  // pour pouvoir appeler signInWithPassword (cf. Supabase Auth Settings).
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const captchaRef = useRef<HCaptcha>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    // GARDE ANTI-BOUCLE : empeche les double-submits via la touche Entree
    // pendant que la requete signInWithPassword est en cours.
    // Le `disabled={loading}` du bouton ne bloque PAS le submit via Entree
    // dans un champ du form -- d'ou la boucle observee (10k requetes/h sur
    // /token grant_type=password). Ce guard est la vraie protection.
    if (loading) return;

    // GARDE hCAPTCHA : sans token, Supabase rejette l'auth depuis le 11/06/2026.
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
      // Supabase renvoie code "over_request_rate_limit" (et/ou status 429)
      // quand on a depasse la limite (typiquement apres une boucle de submits).
      // On NE doit JAMAIS retraduire un 429 en "email/mot de passe incorrect"
      // -- sinon l'utilisateur retape son mdp pensant qu'il l'a mal saisi,
      // ce qui relance la boucle.
      const errCode =
        (signInError as { code?: string }).code ??
        (signInError as { name?: string }).name ??
        "";
      const errStatus = (signInError as { status?: number }).status;
      const isRateLimit =
        errCode === "over_request_rate_limit" ||
        errStatus === 429 ||
        signInError.message?.toLowerCase().includes("rate limit");
      // Detection erreur captcha (depuis activation Supabase Bot Protection 11/06/2026)
      const isCaptchaError =
        errCode === "captcha_failed" ||
        signInError.message?.toLowerCase().includes("captcha");

      if (isRateLimit) {
        setError(
          "Trop de tentatives en peu de temps. Attends quelques minutes avant de reessayer."
        );
      } else if (isCaptchaError) {
        setError(
          "Verification captcha echouee. Re-coche le hCaptcha et reessaie."
        );
      } else {
        setError("Email ou mot de passe incorrect.");
      }
      setLoading(false);
      return;
    }

    // Si on a un redirect explicite (cas middleware redirige), on l'utilise
    if (redirectParam) {
      router.refresh();
      router.push(redirectParam);
      return;
    }

    // Sinon route serveur qui decide /admin vs /profil selon les permissions
    router.refresh();
    router.push("/api/auth/after-login");
  }

  const inputClass =
    "w-full bg-white border border-vea-border rounded-lg px-4 py-3 text-vea-text text-sm placeholder-vea-text-dim focus:outline-none focus:border-vea-accent focus:ring-2 focus:ring-vea-accent/15 transition-all";

  return (
    <div className="min-h-screen hero-bg-full flex items-center justify-center px-4 py-12 pt-28">
      <div className="card-clean p-8 sm:p-10 w-full max-w-md">
        <div className="flex justify-center mb-6">
          <span className="badge-red">Connexion</span>
        </div>

        <h1 className="text-2xl sm:text-3xl font-black text-vea-text mb-2 text-center">
          Bon retour <span className="text-vea-accent">parmi nous</span>
        </h1>
        <p className="text-vea-text-muted mb-8 text-sm text-center">
          Connecte-toi pour acceder a ton espace membre ou administrer la
          plateforme.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="email"
              className="block text-xs font-semibold text-vea-text-muted uppercase tracking-wider mb-1.5"
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
            <div className="flex items-baseline justify-between mb-1.5">
              <label
                htmlFor="password"
                className="block text-xs font-semibold text-vea-text-muted uppercase tracking-wider"
              >
                Mot de passe
              </label>
              <Link
                href={forgotPasswordUrl}
                className="text-[11px] text-vea-text-dim hover:text-vea-accent transition-colors underline-offset-2 hover:underline"
              >
                Oublié ?
              </Link>
            </div>
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

          {/* Widget hCaptcha — token obligatoire depuis activation Supabase 11/06/2026 */}
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
            <div className="border border-vea-accent/30 bg-vea-accent-soft rounded-lg px-4 py-3 text-sm text-vea-accent">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !captchaToken}
            className="btn-primary w-full disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? "Connexion..." : "Se connecter"}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-vea-border text-center space-y-2">
          <p className="text-sm text-vea-text-muted">
            Pas encore de compte ?{" "}
            <Link
              href="/signup"
              className="text-vea-accent hover:underline font-semibold"
            >
              S&apos;inscrire
            </Link>
          </p>
          <Link
            href="/"
            className="text-xs text-vea-text-dim hover:text-vea-accent transition-colors block"
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
        <div className="min-h-screen hero-bg-full flex items-center justify-center px-4 py-12 pt-28">
          <p className="text-vea-text-muted text-sm">Chargement...</p>
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
