/**
 * /prestations — Page commerciale VEA pour les collectivités, structures et
 * entreprises qui veulent faire intervenir l'asso.
 *
 * Architecture :
 *   - page.tsx (Server Component) : metadata SEO, layout fixe, hero
 *   - PrestationsClient.tsx (Client) : state du pack sélectionné, orchestre
 *     les PackCards (3) et le DevisForm (form 4 blocs).
 *   - PackCard.tsx (Client) : carte présentation pack avec callback onSelect
 *   - DevisForm.tsx (Client) : gros formulaire 4 blocs avec validation client
 *   - actions.ts : Server Action submitDemandeDevisAction (validation
 *     serveur + INSERT Supabase, trigger SQL notifie les dirigeants)
 *
 * Flux utilisateur type :
 *   1. Arrive sur la page, lit le hero + scrolle aux packs
 *   2. Choisit un pack (PackCard.onSelect) -> scroll auto vers le form
 *      avec le pack pré-sélectionné
 *   3. Remplit les 4 blocs du form
 *   4. Submit -> Server Action -> INSERT vea.demandes_prestation
 *   5. Trigger SQL crée des notifs cloche pour tous les editor+ vea
 *   6. Message succès affiché 10 sec mini, form reset
 *
 * Permission : aucune (page publique, INSERT anon via RLS).
 * SEO : Server Component pour metadata title + description + OG tags.
 */
import type { Metadata } from "next";
import Link from "next/link";
import PrestationsClient from "./PrestationsClient";

export const metadata: Metadata = {
  title: "Prestations & Devis - Velito Esport Amiens",
  description:
    "Animation, tournois et prévention esport. Faites intervenir VEA pour vos événements. Devis personnalisé sous 48-72h.",
  openGraph: {
    title: "Prestations & Devis - Velito Esport Amiens",
    description:
      "Animation, tournois et prévention esport. Faites intervenir VEA pour vos événements. Devis personnalisé sous 48-72h.",
    images: [
      {
        url: "/images/vea-logo-rouge-fond-blanc.png",
        width: 800,
        height: 800,
        alt: "Logo Velito Esport Amiens",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Prestations & Devis - Velito Esport Amiens",
    description:
      "Faites intervenir VEA pour vos événements. Devis personnalisé sous 48-72h.",
  },
};

export default function PrestationsPage() {
  return (
    <div className="min-h-screen bg-vea-bg pt-28 pb-20 px-4">
      <div className="max-w-6xl mx-auto">
        {/* ============================================
            HERO
        ============================================ */}
        <section className="text-center max-w-3xl mx-auto mb-4">
          <span className="badge-red mb-4 inline-block">
            Offre collectivités & structures
          </span>
          <h1 className="text-3xl sm:text-5xl font-black text-vea-text mb-4 leading-tight">
            Faites intervenir{" "}
            <span className="text-vea-accent">Velito Esport Amiens</span>
          </h1>
          <p className="text-base sm:text-lg text-vea-text-muted leading-relaxed mb-8">
            Animation, prévention, tournois esport encadrés. Une offre
            professionnelle adaptée à vos publics et vos événements.
          </p>
          <Link
            href="#devis"
            className="btn-primary text-sm inline-block"
            aria-label="Aller au formulaire de demande de devis"
          >
            Demander un devis
          </Link>
        </section>

        {/* PrestationsClient contient les PackCards + le DevisForm + les
            encadrés institutionnel/info tarifs. */}
        <PrestationsClient />
      </div>
    </div>
  );
}
