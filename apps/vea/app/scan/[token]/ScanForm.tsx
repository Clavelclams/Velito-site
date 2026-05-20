/**
 * ScanForm — Client Component pour le scan d'un event.
 *
 * Affiche 3 grosses cards :
 *   - JOUER (+10 XP) : participant tournoi
 *   - AIDER (+15 XP/h) : staff benevole, propose nb heures
 *   - REGARDER (+2 XP) : spectateur
 *
 * Au clic, appelle registerPresenceAction. Si OK, affiche un message de succes
 * avec XP gagne. Si deja scanne, message specifique.
 */
"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { registerPresenceAction } from "./actions";

type Motif = "jouer" | "aider" | "regarder";

interface ScanFormProps {
  token: string;
  eventName: string;
}

export default function ScanForm({ token, eventName }: ScanFormProps) {
  const [selectedMotif, setSelectedMotif] = useState<Motif | null>(null);
  // 19/05/2026 : input retire. On envoie undefined au serveur, qui utilise
  // alors event.duree_estimee_heures (admin peut ajuster apres).
  const [error, setError] = useState("");
  const [success, setSuccess] = useState<{ motif: Motif; xp: number } | null>(null);
  const [alreadyScanned, setAlreadyScanned] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleSubmit() {
    if (!selectedMotif) return;
    setError("");
    setAlreadyScanned(false);

    startTransition(async () => {
      const result = await registerPresenceAction({
        token,
        motif: selectedMotif,
        // heures_aide undefined -> serveur utilise event.duree_estimee_heures
      });

      if (result.success && result.xpGagne !== undefined && result.motif) {
        setSuccess({ motif: result.motif, xp: result.xpGagne });
      } else if (result.alreadyScanned) {
        setAlreadyScanned(true);
        setError(result.error ?? "Deja scanne.");
      } else {
        setError(result.error ?? "Erreur inconnue");
      }
    });
  }

  // ============== ECRAN DE SUCCES ==============
  // 19/05/2026 : XP cache cote UI (anti-triche). Le calcul reste cote serveur,
  // l'utilisateur voit son XP cumule dans /profil + explication baremes/badges.
  if (success) {
    return (
      <div className="card-clean p-8 text-center">
        <div className="text-6xl mb-4">
          {success.motif === "jouer" ? "🎮" : success.motif === "aider" ? "💪" : "👀"}
        </div>
        <h2 className="text-3xl font-black text-vea-text mb-2">
          C&apos;est note !
        </h2>
        <p className="text-sm text-vea-text-muted mb-6">
          Tu es enregistre comme{" "}
          <strong className="text-vea-accent">
            {success.motif === "jouer" ? "joueur" : success.motif === "aider" ? "benevole" : "spectateur"}
          </strong>{" "}
          sur {eventName}.
        </p>
        <Link href="/profil" className="btn-primary">
          Voir ma progression
        </Link>
      </div>
    );
  }

  // ============== DEJA SCANNE ==============
  if (alreadyScanned) {
    return (
      <div className="card-clean p-8 text-center">
        <div className="text-5xl mb-4">✓</div>
        <h2 className="text-2xl font-black text-vea-text mb-2">
          Deja enregistre
        </h2>
        <p className="text-sm text-vea-text-muted mb-6">
          Tu as deja scanne <strong>{eventName}</strong>. Un seul scan par event,
          pas de tricherie possible.
        </p>
        <Link href="/profil" className="btn-primary">
          Voir ma progression
        </Link>
      </div>
    );
  }

  // ============== ECRAN DE CHOIX MOTIF ==============
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-vea-text text-center mb-2">
        Tu es la pour quoi ?
      </h2>
      <p className="text-sm text-vea-text-muted text-center mb-6">
        Choisis ton motif pour gagner de l&apos;XP.
      </p>

      {/* 3 cards de choix */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <MotifCard
          motif="jouer"
          emoji="🎮"
          label="Jouer"
          description="Tu participes au tournoi / animation."
          selected={selectedMotif === "jouer"}
          onClick={() => setSelectedMotif("jouer")}
        />
        <MotifCard
          motif="aider"
          emoji="💪"
          label="Aider"
          description="Tu donnes un coup de main (staff, encadrement)."
          selected={selectedMotif === "aider"}
          onClick={() => setSelectedMotif("aider")}
        />
        <MotifCard
          motif="regarder"
          emoji="👀"
          label="Regarder"
          description="Tu viens encourager / decouvrir."
          selected={selectedMotif === "regarder"}
          onClick={() => setSelectedMotif("regarder")}
        />
      </div>

      {/* Si Aider, saisie nb heures */}
      {/* 19/05/2026 : input nb d'heures retire (user feedback : on devine la duree
          via l'event lui-meme, tant pis pour la precision). Defaut serveur = 1h. */}

      {error && (
        <div className="border border-vea-accent/30 bg-vea-accent-soft rounded-lg px-4 py-3 text-sm text-vea-accent">
          {error}
        </div>
      )}

      <button
        type="button"
        onClick={handleSubmit}
        disabled={!selectedMotif || isPending}
        className="btn-primary w-full disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {isPending ? "Enregistrement..." : selectedMotif ? "Confirmer ma presence" : "Choisis un motif"}
      </button>
    </div>
  );
}

interface MotifCardProps {
  motif: Motif;
  emoji: string;
  label: string;
  description: string;
  selected: boolean;
  onClick: () => void;
}

function MotifCard({ emoji, label, description, selected, onClick }: MotifCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`text-center p-5 rounded-lg border-2 transition-all ${
        selected
          ? "border-vea-accent bg-vea-accent-soft shadow-card-hover"
          : "border-vea-border bg-white hover:border-vea-accent/40 hover:-translate-y-0.5"
      }`}
    >
      <div className="text-4xl mb-2">{emoji}</div>
      <div className="text-base font-bold text-vea-text mb-2">{label}</div>
      <p className="text-[11px] text-vea-text-muted leading-snug">{description}</p>
    </button>
  );
}
