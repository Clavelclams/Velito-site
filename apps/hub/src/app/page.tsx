/**
 * Hub Velito — Page d'accueil cinématographique
 *
 * 👉 CinemaHubLoader est un Client Component qui fait le dynamic import
 * avec ssr: false. On ne peut pas mettre ssr: false directement ici
 * car page.tsx est un Server Component (Next.js 16 l'interdit).
 */

import CinemaHubLoader from "@/components/CinemaHub/CinemaHubLoader";

export default function HomePage() {
  return (
    <main style={{ background: "#04040e" }}>
      <CinemaHubLoader />
    </main>
  );
}
