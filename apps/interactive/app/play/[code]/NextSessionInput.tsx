/**
 * <NextSessionInput /> — Input pour rejoindre une nouvelle session sans re-scanner.
 *
 * Affiché sur l'écran "Partie terminée" côté joueur (PlayQuizGame.final,
 * PlayPetitBacGame.final).
 *
 * UX :
 *  - Input texte 4-6 caractères, auto-uppercase
 *  - Submit → navigate vers /play/[CODE]
 *  - Le pseudo + avatar persistés en localStorage permettront au joueur d'arriver
 *    directement à l'étape "ready" (preview avatar+pseudo) sans tout reSaisir.
 *
 * Pourquoi un composant séparé :
 *  - Réutilisable par Quiz, Petit Bac, et tous les futurs jeux V1
 *  - Logic centralisée (validation, navigation)
 */
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function NextSessionInput() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const cleaned = code.trim().toUpperCase();
    if (cleaned.length < 4 || cleaned.length > 6) {
      setError("Code invalide (4 à 6 caractères).");
      return;
    }
    // Navigate vers la nouvelle session — l'avatar + pseudo seront restaurés
    // depuis localStorage par PlayJoinForm.
    router.push(`/play/${cleaned}`);
  }

  return (
    <div className="card-ink mt-4 p-4">
      <p className="text-[10px] uppercase tracking-widest text-white/50">
        Rejouer
      </p>
      <p className="mt-0.5 text-xs text-white/70">
        Nouveau code de session ?
      </p>

      <form onSubmit={handleSubmit} className="mt-3 flex flex-col gap-2">
        <input
          type="text"
          inputMode="text"
          autoCapitalize="characters"
          autoComplete="off"
          spellCheck={false}
          value={code}
          onChange={(e) =>
            setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6))
          }
          placeholder="Ex : K7M3"
          maxLength={6}
          className="w-full rounded-xl border border-white/15 bg-ink px-4 py-3 text-center font-display text-2xl font-black tracking-[0.3em] text-white placeholder-white/20 outline-none focus:border-tenant focus:ring-2 focus:ring-tenant/30"
        />

        {error && (
          <p className="text-center text-xs text-red-300">{error}</p>
        )}

        <button
          type="submit"
          disabled={code.length < 4}
          className="btn-tenant disabled:cursor-not-allowed disabled:opacity-50"
        >
          Rejoindre
        </button>
      </form>
    </div>
  );
}
