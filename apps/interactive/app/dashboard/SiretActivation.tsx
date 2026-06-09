/**
 * <SiretActivation /> — flow d'activation essai en 2 étapes.
 *
 * 1. User saisit son SIRET → previewSiretAction → on affiche le nom INSEE
 * 2. User confirme "C'est bien mon établissement" → activateTrialAction
 *
 * Anti-fraude : le nom affiché entre les 2 étapes décourage les abus
 * (personne ne clique "Confirmer" si c'est "TOTAL SA" alors que c'est pas
 * son entreprise).
 */
"use client";

import { useState, useTransition } from "react";
import {
  previewSiretAction,
  activateTrialAction,
  declareIndividualAction,
} from "./subscription-actions";

interface PreviewData {
  name: string;
  siret: string;
  activity?: string;
  address?: string;
  city?: string;
}

export default function SiretActivation() {
  const [step, setStep] = useState<"input" | "confirm">("input");
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  async function handlePreview(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await previewSiretAction(formData);
      if (!result.success) {
        setError(result.error);
        return;
      }
      setPreview({
        name: result.name,
        siret: result.siret,
        activity: result.activity,
        address: result.address,
        city: result.city,
      });
      setStep("confirm");
    });
  }

  async function handleConfirm() {
    if (!preview) return;
    setError(null);
    const fd = new FormData();
    fd.set("siret", preview.siret);
    startTransition(async () => {
      const result = await activateTrialAction(fd);
      if (!result.success) {
        setError(result.error);
        return;
      }
      // Succès → la revalidatePath va re-render le dashboard
    });
  }

  if (step === "confirm" && preview) {
    return (
      <div className="rounded-2xl border border-emerald-400/30 bg-gradient-to-r from-emerald-500/10 to-cyan-500/10 p-5">
        <p className="font-display text-lg font-bold text-emerald-200">
          Confirme ton établissement
        </p>
        <div className="mt-4 rounded-xl border border-white/15 bg-ink/40 p-4">
          <p className="text-xs uppercase tracking-widest text-white/40">
            Établissement trouvé
          </p>
          <p className="mt-1 font-display text-xl font-black text-white">
            {preview.name}
          </p>
          {preview.activity && (
            <p className="mt-1 text-xs text-white/60">{preview.activity}</p>
          )}
          {(preview.address || preview.city) && (
            <p className="mt-2 text-sm text-white/70">
              {preview.address}{preview.address && preview.city ? " · " : ""}{preview.city}
            </p>
          )}
          <p className="mt-3 text-[10px] uppercase tracking-widest text-white/30">
            SIRET {preview.siret.replace(/(\d{3})(\d{3})(\d{3})(\d{5})/, "$1 $2 $3 $4")}
          </p>
        </div>

        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={handleConfirm}
            disabled={pending}
            className="btn-tenant"
          >
            {pending ? "Activation…" : "✅ C'est bien chez moi — activer l'essai"}
          </button>
          <button
            type="button"
            onClick={() => {
              setStep("input");
              setPreview(null);
              setError(null);
            }}
            className="rounded-xl border border-white/20 px-4 py-2.5 text-sm text-white/70 hover:bg-white/[0.05]"
          >
            Non, c&apos;est pas ça
          </button>
        </div>

        {error && (
          <p className="mt-3 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">
            {error}
          </p>
        )}

        <p className="mt-3 text-[11px] italic text-white/40">
          Activer pour un établissement qui n&apos;est pas le tien = fraude.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-emerald-400/30 bg-gradient-to-r from-emerald-500/10 to-cyan-500/10 p-5">
      <div className="flex items-start gap-3">
        <span aria-hidden="true" className="text-3xl">🎁</span>
        <div className="flex-1">
          <p className="font-display text-lg font-bold text-emerald-200">
            Tu es un établissement ? Essai 7 jours gratuit sans CB
          </p>
          <p className="mt-1 text-sm text-emerald-100/80">
            Bar, MJC, restaurant, salle d&apos;événement, association… Renseigne ton SIRET, on vérifie sur le registre INSEE.
          </p>

          <form action={handlePreview} className="mt-4 flex flex-wrap items-center gap-2">
            <input
              type="text"
              name="siret"
              placeholder="SIRET (14 chiffres)"
              required
              maxLength={20}
              className="flex-1 rounded-xl border border-white/15 bg-ink px-4 py-2.5 text-sm text-white placeholder-white/30 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/30"
            />
            <button type="submit" disabled={pending} className="btn-tenant whitespace-nowrap">
              {pending ? "Vérification…" : "Vérifier mon SIRET"}
            </button>
          </form>

          {error && (
            <p className="mt-3 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">
              {error}
            </p>
          )}

          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
            <span className="text-white/40">Pas d&apos;établissement ?</span>
            <form action={declareIndividualAction}>
              <button type="submit" className="text-tenant underline hover:text-white">
                Je suis un particulier
              </button>
            </form>
            <span className="text-white/40">→ Loup-Garou gratuit ou abonnement direct</span>
          </div>
        </div>
      </div>
    </div>
  );
}
