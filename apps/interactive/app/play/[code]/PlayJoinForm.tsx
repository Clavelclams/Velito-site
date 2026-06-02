/**
 * <PlayJoinForm /> — formulaire d'arrivée dans une partie Interactive.
 *
 * Composant Client (state + localStorage) rendu par la page Server.
 *
 * Flow UX :
 *  1. Étape "avatar"  : l'utilisateur choisit son perso (galerie + customs)
 *  2. Étape "pseudo"  : récap (avatar choisi en grand) + champ pseudo + bouton "Entrer"
 *  3. Submit (à venir) : POST vers l'API Realtime pour rejoindre le channel
 *
 * Persistance MVP :
 *  - On stocke le AvatarConfig en localStorage sous la clé `velito-interactive-avatar`
 *  - Au prochain chargement, le picker repart avec ce choix par défaut
 *  - Plus tard (quand on aura les comptes Velito + la table profiles), un user
 *    connecté ira lire/écrire dans Supabase plutôt qu'en localStorage
 *
 * Pourquoi 2 étapes plutôt qu'1 seule page longue :
 *  - Le picker prend déjà beaucoup d'espace (grille + 2 bandeaux)
 *  - On veut que le joueur VOIT son avatar choisi en récap, c'est gratifiant
 *  - C'est cohérent avec l'UX Wii (perso d'abord, puis "tu vas jouer en tant que…")
 */
"use client";

import { useEffect, useState } from "react";
import { AvatarPicker } from "@repo/ui/avatar-picker";
import { Avatar } from "@repo/ui/avatar";
import {
  DEFAULT_AVATAR,
  parseAvatarConfig,
  type AvatarConfig,
} from "@repo/ui/avatar-data";

const AVATAR_STORAGE_KEY = "velito-interactive-avatar";

interface PlayJoinFormProps {
  /** Code de session (vient de l'URL /play/[code]) — affiché en titre. */
  code: string;
}

type Step = "avatar" | "ready";

export default function PlayJoinForm({ code }: PlayJoinFormProps) {
  const [step, setStep] = useState<Step>("avatar");
  const [avatar, setAvatar] = useState<AvatarConfig>(DEFAULT_AVATAR);
  const [pseudo, setPseudo] = useState("");
  const [hydrated, setHydrated] = useState(false);

  // Au mount : on tente de restaurer le dernier avatar choisi (localStorage).
  // Fait dans useEffect pour éviter un hydration mismatch (le serveur n'a pas
  // accès au localStorage, donc on attend le client).
  useEffect(() => {
    try {
      const raw = localStorage.getItem(AVATAR_STORAGE_KEY);
      if (raw) {
        setAvatar(parseAvatarConfig(JSON.parse(raw)));
      }
    } catch {
      // localStorage indisponible (mode incognito strict, etc.) → on reste sur le default.
    }
    setHydrated(true);
  }, []);

  function handleAvatarSelect(config: AvatarConfig) {
    setAvatar(config);
    try {
      localStorage.setItem(AVATAR_STORAGE_KEY, JSON.stringify(config));
    } catch {
      // ignore — pas fatal si on peut pas écrire
    }
    setStep("ready");
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    // Pour l'instant l'API Realtime n'est pas branchée — on affiche juste
    // que le code est prêt à être envoyé. À remplacer par l'appel POST.
    console.log("[PlayJoinForm] join", { code, pseudo, avatar });
  }

  // ============================================================
  // Étape 1 : picker
  // ============================================================
  if (step === "avatar") {
    return (
      <div className="w-full max-w-md">
        <p className="text-center text-xs uppercase tracking-[0.3em] text-white/40">
          Velito Interactive
        </p>
        <h1 className="neon-title mt-3 text-center text-4xl">
          Crée ton perso
        </h1>
        <p className="mt-2 text-center text-sm text-white/60">
          Tu rejoins la session{" "}
          <span className="font-display font-black tracking-widest text-tenant">
            {code?.toUpperCase()}
          </span>
        </p>

        <div className="card-ink mt-6 p-5">
          {hydrated ? (
            <AvatarPicker
              initial={avatar}
              onSelect={handleAvatarSelect}
              ctaLabel="C'est moi"
            />
          ) : (
            // Skeleton pendant l'hydration pour éviter le flash
            <div className="grid place-items-center py-20 text-xs text-white/30">
              Chargement…
            </div>
          )}
        </div>
      </div>
    );
  }

  // ============================================================
  // Étape 2 : récap + pseudo + entrée
  // ============================================================
  return (
    <div className="w-full max-w-sm text-center">
      <p className="text-xs uppercase tracking-[0.3em] text-white/40">
        Velito Interactive
      </p>
      <h1 className="neon-title mt-3 text-4xl">Presque prêt</h1>
      <p className="mt-2 text-sm text-white/60">
        Session{" "}
        <span className="font-display font-black tracking-widest text-tenant">
          {code?.toUpperCase()}
        </span>
      </p>

      {/* Avatar choisi en grand */}
      <div className="mt-6 flex justify-center">
        <Avatar config={avatar} size="xl" className="ring-4 ring-white/15" />
      </div>
      <button
        type="button"
        onClick={() => setStep("avatar")}
        className="mt-2 text-[11px] text-white/40 underline-offset-2 transition hover:text-white hover:underline"
      >
        Changer de perso
      </button>

      {/* Form pseudo + entrée */}
      <form onSubmit={handleSubmit} className="card-ink mt-6 space-y-4 p-6 text-left">
        <div>
          <label
            htmlFor="pseudo"
            className="mb-1.5 block text-xs uppercase tracking-widest text-white/50"
          >
            Ton pseudo
          </label>
          <input
            id="pseudo"
            type="text"
            value={pseudo}
            onChange={(e) => setPseudo(e.target.value.slice(0, 24))}
            placeholder="Ex : Riza, MamaTeam, K7…"
            maxLength={24}
            autoComplete="off"
            className="w-full rounded-xl border border-white/15 bg-ink px-4 py-3 text-white placeholder-white/30 outline-none focus:border-tenant focus:ring-2 focus:ring-tenant/30"
          />
        </div>

        <button
          type="submit"
          disabled={pseudo.trim().length < 2}
          className="btn-tenant w-full disabled:cursor-not-allowed disabled:opacity-50"
        >
          Entrer dans la partie
        </button>

        <p className="text-center text-[11px] italic text-white/40">
          Manette en construction — connexion temps réel à venir.
        </p>
      </form>
    </div>
  );
}
