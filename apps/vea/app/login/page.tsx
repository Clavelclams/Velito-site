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
    <div className="min-h-screen bg-[#060d1f] flex items-center justify-center px-4">
      <div className="card-glow p-8 w-full max-w-md rounded-2xl">
        {/* Header */}
        <h1 className="text-2xl font-black text-white mb-2">Connexion</h1>
        <p className="text-[#7a8fa6] mb-8 text-sm">
          Connecte-toi pour acc&eacute;der &agrave; ton espace
        </p>

        {/* Formulaire */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-[#7a8fa6] text-xs uppercase tracking-widest mb-2 block">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-[#0a1628] border border-[#1e3a5f] focus:border-[#4d9fff] text-white rounded-xl px-4 py-3 outline-none transition-colors"
              placeholder="ton@email.fr"
              required
            />
          </div>

          <div>
            <label className="text-[#7a8fa6] text-xs uppercase tracking-widest mb-2 block">
              Mot de passe
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-[#0a1628] border border-[#1e3a5f] focus:border-[#4d9fff] text-white rounded-xl px-4 py-3 outline-none transition-colors"
              placeholder="••••••••"
              required
            />
          </div>

          {error && (
            <p className="text-red-400 text-sm">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#4d9fff] hover:bg-[#60b4ff] text-white font-bold py-3 rounded-xl transition-all duration-300 hover:shadow-[0_0_20px_rgba(77,159,255,0.4)] disabled:opacity-50"
          >
            {loading ? "Connexion..." : "Se connecter"}
          </button>
        </form>

        {/* Lien retour */}
        <div className="mt-6 text-center">
          <Link
            href="/"
            className="text-[#7a8fa6] hover:text-[#4d9fff] text-sm transition-colors"
          >
            &larr; Retour au site
          </Link>
        </div>
      </div>
    </div>
  );
}
