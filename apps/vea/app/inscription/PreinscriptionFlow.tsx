/**
 * PreinscriptionFlow — UI du previsionnel "monde attendu" pour un evenement.
 *
 * Deux modes (decides cote serveur dans page.tsx selon la session) :
 *   - "connected" : 1 clic "Je serai present" / "Je ne viens plus" (toggle).
 *   - "guest"     : mini formulaire prenom + nom + telephone.
 *
 * AUCUN XP : c'est du previsionnel, pas une presence.
 */
"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  addPreinscriptionAction,
  removePreinscriptionAction,
  registerPreinscriptionGuestAction,
} from "./actions";

interface Props {
  eventSlug: string;
  eventNom: string;
  mode: "connected" | "guest";
  /** mode connecte : deja dans le previsionnel ? */
  initialIn?: boolean;
}

const inputClass =
  "w-full bg-white border border-vea-border rounded-lg px-3 py-2 text-sm text-vea-text focus:outline-none focus:border-vea-accent focus:ring-2 focus:ring-vea-accent/15";

export default function PreinscriptionFlow({ eventSlug, eventNom, mode, initialIn }: Props) {
  const [isIn, setIsIn] = useState(!!initialIn);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [prenom, setPrenom] = useState("");
  const [nom, setNom] = useState("");
  const [phone, setPhone] = useState("");
  const [pending, startTransition] = useTransition();

  // ---- Mode connecte : toggle ----
  if (mode === "connected") {
    function toggle(register: boolean) {
      setError(null);
      startTransition(async () => {
        const r = register
          ? await addPreinscriptionAction(eventSlug)
          : await removePreinscriptionAction(eventSlug);
        if (!r.success) {
          setError(r.error ?? "Erreur");
          return;
        }
        setIsIn(register);
      });
    }
    return (
      <div className="panel-accent">
        {isIn ? (
          <>
            <p className="text-sm text-vea-text font-semibold mb-1">
              Tu es dans le prévisionnel de <span className="text-vea-accent">{eventNom}</span>.
            </p>
            <p className="text-xs text-vea-text-muted mb-4">
              Ça nous aide à anticiper le monde attendu. (Tes points, eux, se gagnent le jour J en scannant sur place.)
            </p>
            <button
              type="button"
              onClick={() => toggle(false)}
              disabled={pending}
              className="btn-outline text-sm disabled:opacity-50"
            >
              {pending ? "…" : "Je ne viens plus"}
            </button>
          </>
        ) : (
          <>
            <p className="text-sm text-vea-text-muted mb-4">
              Dis-nous si tu comptes venir à <span className="font-semibold text-vea-text">{eventNom}</span>. Ça aide l&apos;équipe à s&apos;organiser — sans engagement.
            </p>
            <button
              type="button"
              onClick={() => toggle(true)}
              disabled={pending}
              className="btn-primary text-sm disabled:opacity-50"
            >
              {pending ? "…" : "Je serai présent"}
            </button>
          </>
        )}
        {error && (
          <div role="alert" className="mt-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</div>
        )}
      </div>
    );
  }

  // ---- Mode guest : mini formulaire ----
  if (done) {
    return (
      <div className="panel-accent">
        <p className="text-sm text-vea-text font-semibold">C&apos;est noté, à bientôt !</p>
        <p className="text-xs text-vea-text-muted mt-1">
          On t&apos;attend à <span className="text-vea-accent">{eventNom}</span>. Le jour J, scanne le QR sur place pour valider ta présence.
        </p>
      </div>
    );
  }

  function submit() {
    setError(null);
    startTransition(async () => {
      const r = await registerPreinscriptionGuestAction({ eventSlug, prenom, nom, phone });
      if (!r.success) {
        setError(r.error ?? "Erreur");
        return;
      }
      setDone(true);
    });
  }

  return (
    <div className="panel-accent">
      <p className="text-sm text-vea-text-muted mb-4">
        Indique-nous qui tu es pour le prévisionnel de{" "}
        <span className="font-semibold text-vea-text">{eventNom}</span>. Pas besoin de compte.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
        <input className={inputClass} placeholder="Prénom" value={prenom} onChange={(e) => setPrenom(e.target.value.slice(0, 100))} />
        <input className={inputClass} placeholder="Nom" value={nom} onChange={(e) => setNom(e.target.value.slice(0, 100))} />
      </div>
      <input className={`${inputClass} mb-4`} placeholder="Téléphone" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value.slice(0, 30))} />
      <button type="button" onClick={submit} disabled={pending} className="btn-primary text-sm disabled:opacity-50">
        {pending ? "…" : "Je compte venir"}
      </button>
      <p className="text-xs text-vea-text-dim mt-3">
        Déjà un compte ?{" "}
        <Link href="/login" className="text-vea-accent hover:underline">Connecte-toi</Link>{" "}
        pour suivre ta progression.
      </p>
      {error && (
        <div role="alert" className="mt-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</div>
      )}
    </div>
  );
}
