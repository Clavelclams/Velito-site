"use client";

/**
 * Page de connexion GÉNÉRIQUE — /login
 *
 * C'est la page liée au bouton "Connexion" de la navbar.
 * Tous les utilisateurs arrivent ici : users classiques ET admins.
 *
 * Après login :
 * - Si le serveur renvoie role: "admin" → redirect vers /admin
 * - Si role: "user" (futur) → redirect vers / (site vitrine, futur espace perso)
 * - Si erreur → affiche le message d'erreur
 *
 * Pour l'instant, seul le login admin fonctionne (V1).
 * En V2 on ajoutera l'inscription + login user classique avec la table User.
 *
 * REFONTE VIOLET + ROUGE — charte VEA appliquée.
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        // Redirect selon le rôle renvoyé par l'API
        if (data.role === "admin") {
          router.push("/admin");
        } else {
          // User classique → retour à l'accueil (futur : espace perso)
          router.push("/");
        }
      } else {
        setError(data.error || "Email ou mot de passe incorrect");
      }
    } catch {
      setError("Erreur de connexion au serveur");
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen hero-bg flex items-center justify-center px-4 relative">
      {/* Glow décoratif */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-vea-purple/5 blur-[120px] pointer-events-none" />

      <div className="card-glow p-8 sm:p-10 w-full max-w-md rounded-2xl relative z-10">
        {/* Header */}
        <h1 className="text-2xl font-black text-gradient-vea mb-2 text-center">
          Connexion
        </h1>
        <p className="text-vea-text-muted mb-8 text-sm text-center">
          Connecte-toi pour accéder à ton espace
        </p>

        {/* Formulaire */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="text-vea-text-muted text-xs uppercase tracking-widest mb-2 block">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-vea-bg border border-vea-border focus:border-vea-purple/50 text-white rounded-lg px-4 py-3 outline-none transition-colors text-sm placeholder-vea-text-dim"
              placeholder="ton@email.fr"
              required
            />
          </div>

          <div>
            <label className="text-vea-text-muted text-xs uppercase tracking-widest mb-2 block">
              Mot de passe
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-vea-bg border border-vea-border focus:border-vea-purple/50 text-white rounded-lg px-4 py-3 outline-none transition-colors text-sm placeholder-vea-text-dim"
              placeholder="••••••••"
              required
            />
          </div>

          {error && (
            <div className="bg-vea-red/10 border border-vea-red/30 rounded-lg px-4 py-3">
              <p className="text-vea-red text-sm">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-vea-red hover:bg-vea-accent-hover text-white font-bold py-3.5 rounded-lg transition-all duration-300 hover:shadow-[0_0_25px_rgba(230,57,70,0.4)] disabled:opacity-50 text-sm"
          >
            {loading ? "Connexion..." : "Se connecter"}
          </button>
        </form>

        {/* Lien retour */}
        <div className="mt-8 pt-6 border-t border-vea-border/50 text-center">
          <Link
            href="/"
            className="text-xs text-vea-text-dim hover:text-vea-white transition-colors"
          >
            ← Retour au site
          </Link>
        </div>
      </div>
    </div>
  );
}
