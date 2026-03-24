"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    if (res.ok) {
      router.push("/admin");
    } else {
      setError("Email ou mot de passe incorrect");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen hero-bg flex items-center justify-center px-4 relative">
      {/* Glow décoratif derrière la card */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-vea-purple/5 blur-[120px] pointer-events-none" />

      <div className="card-glow p-8 sm:p-10 w-full max-w-md rounded-2xl relative z-10">
        {/* Badge admin */}
        <div className="flex justify-center mb-6">
          <span className="badge-purple">Admin</span>
        </div>

        <h1 className="text-2xl font-black text-gradient-vea mb-2 text-center">
          Administration VEA
        </h1>
        <p className="text-vea-text-muted mb-8 text-sm text-center">
          Accès réservé aux administrateurs
        </p>

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
              placeholder="admin@velito.fr"
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

        {/* Séparateur + lien retour */}
        <div className="mt-8 pt-6 border-t border-vea-border/50 text-center">
          <a href="/" className="text-xs text-vea-text-dim hover:text-vea-white transition-colors">
            ← Retour au site
          </a>
        </div>
      </div>
    </div>
  );
}
