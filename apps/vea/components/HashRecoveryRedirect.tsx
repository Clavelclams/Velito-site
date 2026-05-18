/**
 * HashRecoveryRedirect — Listener client global pour les liens password recovery.
 *
 * Pourquoi : Supabase Auth retourne les tokens en hash fragment (URL implicit flow)
 * du genre `#access_token=xxx&refresh_token=yyy&type=recovery`. Ce hash arrive
 * sur Site URL (configuree dans Dashboard -> Auth -> URL Configuration), donc
 * sur la home `/` par defaut.
 *
 * Ce composant detecte ce hash sur n'importe quelle page du site, et redirige
 * vers /auth/reset-password en preservant le hash pour que la logique de set
 * password puisse l'exploiter.
 *
 * Aucun render visible. A ajouter une fois dans app/layout.tsx.
 */
"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";

export default function HashRecoveryRedirect() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Si on est deja sur la page reset-password, ne rien faire (sinon boucle)
    if (pathname === "/auth/reset-password") return;

    const hash = window.location.hash;
    if (!hash || hash.length < 2) return;

    const params = new URLSearchParams(hash.substring(1));
    const type = params.get("type");
    const accessToken = params.get("access_token");

    if (type === "recovery" && accessToken) {
      // Redirige en preservant le hash pour que /auth/reset-password
      // puisse extraire les tokens
      router.replace("/auth/reset-password" + hash);
    }
  }, [pathname, router]);

  return null;
}
