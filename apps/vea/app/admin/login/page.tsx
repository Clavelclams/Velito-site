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
    <div className="min-h-screen bg-vea-dark flex items-center justify-center px-4">
      <div className="card-glow p-8 w-full max-w-md rounded-2xl">
        <h1 className="text-2xl font-black text-white mb-2">
          Administration VEA
        </h1>
        <p className="text-vea-text-muted mb-8 text-sm">
          Acc&egrave;s r&eacute;serv&eacute; aux administrateurs
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-vea-text-muted text-xs uppercase tracking-widest mb-2 block">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-vea-bg border border-vea-border focus:border-vea-purple/50 text-white rounded-xl px-4 py-3 outline-none transition-colors"
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
              className="w-full bg-vea-bg border border-vea-border focus:border-vea-purple/50 text-white rounded-xl px-4 py-3 outline-none transition-colors"
              placeholder="••••••••"
              required
            />
          </div>

          {error && <p className="text-vea-red text-sm">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-vea-red hover:bg-vea-accent-hover text-white font-bold py-3 rounded-xl transition-all duration-300 hover:shadow-[0_0_20px_rgba(230,57,70,0.4)] disabled:opacity-50"
          >
            {loading ? "Connexion..." : "Se connecter"}
          </button>
        </form>
      </div>
    </div>
  );
}
