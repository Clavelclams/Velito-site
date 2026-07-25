"use client";

/**
 * Rafraîchissement automatique de la page publique pendant un tournoi.
 *
 * Pourquoi un composant client : le serveur rend la page une fois ; pour que
 * les spectateurs voient les scores arriver sans F5, on demande à Next de
 * re-exécuter le Server Component parent (router.refresh()) à intervalle fixe.
 * C'est le choix V1 du cadrage : polling simple, pas de websockets/Realtime —
 * largement suffisant pour un tournoi local, et zéro infra en plus.
 */
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function AutoRefresh({ intervalMs = 15000 }: { intervalMs?: number }) {
  const router = useRouter();

  useEffect(() => {
    const id = setInterval(() => router.refresh(), intervalMs);
    return () => clearInterval(id);
  }, [router, intervalMs]);

  return null; // rien à afficher, ce composant ne fait que rafraîchir
}
