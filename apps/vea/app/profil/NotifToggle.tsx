/**
 * NotifToggle — Switch ON/OFF pour les notifications d'events.
 *
 * Affiche dans /profil un toggle stylise (style iOS) pour activer/desactiver
 * les notifs auto a chaque nouvel event cree par les admins.
 *
 * Quand ON :
 *   - L'user recoit une notif dans la cloche a chaque INSERT vea.evenements
 *   - Le trigger PG fait le boulot, pas d'action manuelle requise
 *
 * Quand OFF :
 *   - L'user n'a plus de notif pour les nouveaux events
 *   - Les notifs deja recues restent dans son historique
 *   - Il peut toujours consulter /agenda manuellement
 */
"use client";

import { useState, useTransition } from "react";
import { toggleNotifEventsAction } from "./notif-actions";

interface NotifToggleProps {
  initialValue: boolean;
}

export default function NotifToggle({ initialValue }: NotifToggleProps) {
  const [enabled, setEnabled] = useState(initialValue);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleToggle() {
    const newValue = !enabled;
    // Optimistic update : on change l'UI tout de suite
    setEnabled(newValue);
    setError("");

    startTransition(async () => {
      const result = await toggleNotifEventsAction(newValue);
      if (!result.success) {
        // Rollback si erreur
        setEnabled(!newValue);
        setError(result.error ?? "Erreur inconnue");
      }
    });
  }

  return (
    // id="notifications" -> permet le scroll auto depuis /profil#notifications
    // (lien "Gerer les notifications" dans la cloche Navbar).
    // scroll-mt-24 pour eviter que le header sticky cache le titre.
    <div id="notifications" className="card-clean p-5 mb-8 scroll-mt-24">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-bold text-vea-text mb-1 flex items-center gap-2">
            <span aria-hidden>🔔</span> Notifications d&apos;events
          </h3>
          <p className="text-xs text-vea-text-muted leading-relaxed">
            Recevoir une notification dans la cloche a chaque nouvel event cree
            par VEA (tournois, animations, ateliers).
          </p>
        </div>

        {/* Switch ON/OFF style iOS */}
        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          aria-label={enabled ? "Desactiver les notifications" : "Activer les notifications"}
          onClick={handleToggle}
          disabled={isPending}
          className={`shrink-0 relative inline-flex h-7 w-12 items-center rounded-full transition-colors disabled:opacity-60 ${
            enabled ? "bg-vea-accent" : "bg-vea-border"
          }`}
        >
          <span
            className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
              enabled ? "translate-x-6" : "translate-x-1"
            }`}
          />
        </button>
      </div>

      {error && (
        <div className="mt-3 border border-vea-accent/30 bg-vea-accent-soft rounded-lg px-3 py-2 text-xs text-vea-accent">
          {error}
        </div>
      )}

      <p className="text-[10px] text-vea-text-dim italic mt-3 leading-relaxed">
        {enabled
          ? "✓ Tu seras notifie de chaque nouvel event."
          : "Tu peux toujours consulter l'agenda manuellement."}
      </p>
    </div>
  );
}
