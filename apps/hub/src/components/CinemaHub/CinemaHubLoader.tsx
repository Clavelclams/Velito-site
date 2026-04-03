"use client";

/**
 * 👉 Wrapper client pour charger CinemaHub sans SSR.
 *
 * Next.js 16 interdit `ssr: false` dans les Server Components.
 * Du coup on met le dynamic import ici, dans un Client Component,
 * et page.tsx (Server Component) importe ce wrapper.
 */

import dynamic from "next/dynamic";

const CinemaHub = dynamic(
  () => import("@/components/CinemaHub/CinemaHub"),
  { ssr: false }
);

export default function CinemaHubLoader() {
  return <CinemaHub />;
}
