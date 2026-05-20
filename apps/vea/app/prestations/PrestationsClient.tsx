/**
 * PrestationsClient — Wrapper Client qui orchestre PackCards + DevisForm.
 *
 * Server Component parent (page.tsx) ne peut pas tenir le state du pack
 * sélectionné (parce que pas de useState). Donc ce wrapper Client garde
 * l'état "selectedPack" + fournit le callback handleSelectPack aux PackCards.
 *
 * Quand un user clique "Choisir ce pack" :
 *   1. setSelectedPack(value) -> DevisForm reçoit la prop et se met à jour
 *   2. document.getElementById("form-devis").scrollIntoView()
 *
 * Le mapping pack -> valeur form :
 *   - Pack Découverte -> "decouverte"
 *   - Pack Animation -> "animation"
 *   - Option Stream -> "animation_stream" (= Pack Animation + Stream)
 */
"use client";

import { useState, useCallback } from "react";
import PackCard from "./PackCard";
import DevisForm from "./DevisForm";

export default function PrestationsClient() {
  const [selectedPack, setSelectedPack] = useState("");

  const handleSelectPack = useCallback((packValue: string) => {
    setSelectedPack(packValue);
    // Petit délai pour laisser le DevisForm reflect le state avant scroll
    setTimeout(() => {
      const el = document.getElementById("form-devis");
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);
  }, []);

  const handlePackReset = useCallback(() => {
    setSelectedPack("");
  }, []);

  return (
    <>
      {/* ============================================
          Section "Nos formats d'intervention"
      ============================================ */}
      <section className="mt-16">
        <h2 className="text-2xl sm:text-3xl font-black text-vea-text mb-8 text-center">
          Nos <span className="text-vea-accent">formats</span>
          {" "}
          d&apos;intervention
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-10">
          <PackCard
            title="Pack Découverte"
            description="Animation esport encadrée pour l'initiation et le loisir. Idéal pour les petits groupes."
            price="65 € / heure"
            priceNote="Minimum 1h30"
            features={[
              "Jusqu'à 4 écrans / 4 consoles (2 PS5, 2 Switch)",
              "Initiation et rotation des joueurs",
              "Mini-compétitions fun",
              "1 animateur VEA inclus",
            ]}
            ctaLabel="Choisir ce pack"
            packValue="decouverte"
            accent="blue"
            onSelect={handleSelectPack}
          />
          <PackCard
            title="Pack Animation"
            description="Dispositif étendu pour gérer plus de flux ou un événement plus important."
            price="90 € / heure"
            priceNote="Minimum 2 heures"
            features={[
              "Tout le contenu du Pack Découverte",
              "Tout le matériel VEA (consoles étendues, PC compétition)",
              "Sonorisation et scénographie",
              "Animateurs étendus selon volume",
              "Coordination événementielle (avant, pendant, après)",
              "Gestion brackets de tournoi structuré",
            ]}
            ctaLabel="Choisir ce pack"
            packValue="animation"
            accent="yellow"
            onSelect={handleSelectPack}
          />
          <PackCard
            title="Option Stream"
            description="Captation et diffusion en direct pour valoriser votre événement et toucher un public élargi."
            price="+ 250 €"
            priceNote="À ajouter au pack choisi"
            features={[
              "Setup OBS complet",
              "Retransmission live (Twitch / YouTube)",
              "Captation vidéo de l'événement",
              "Archivage et mise en ligne",
              "Régie technique dédiée",
            ]}
            ctaLabel="Ajouter au devis"
            packValue="animation_stream"
            accent="red"
            isOption
            onSelect={handleSelectPack}
          />
        </div>

        {/* Encadré institutionnel */}
        <div className="card-clean p-6 mb-4 border-l-4 border-l-vea-accent bg-vea-accent-soft/30 max-w-4xl mx-auto">
          <h3 className="text-base font-bold text-vea-text mb-2">
            🤝 Partenariats publics et collectivités
          </h3>
          <p className="text-sm text-vea-text-muted leading-relaxed">
            Velito Esport Amiens est référencée dans la grille tarifaire
            culture/jeunesse de la Mairie d&apos;Amiens. Les services jeunesse
            municipaux et les centres sociaux conventionnés bénéficient des
            tarifs grille intervenant culturel applicables au secteur. Pour les
            autres collectivités (mairies, métropoles, départements, EPCI), des
            tarifs spécifiques peuvent être négociés dans le cadre de
            conventions ou marchés publics.
          </p>
        </div>

        {/* Encadré info tarifs */}
        <div className="card-clean p-4 max-w-4xl mx-auto bg-vea-bg">
          <h3 className="text-xs font-bold text-vea-text-dim uppercase tracking-widest mb-1">
            ℹ️ Information tarifs
          </h3>
          <p className="text-xs text-vea-text-muted leading-relaxed italic">
            Les tarifs indiqués sont indicatifs. Ils peuvent être adaptés selon
            la durée, le volume, le type de public, le secteur géographique
            (QPV) ou le cadre partenarial mobilisé.
          </p>
        </div>
      </section>

      {/* ============================================
          Section "Demander un devis"
      ============================================ */}
      <section className="mt-16 max-w-3xl mx-auto" id="devis">
        <div className="text-center mb-8">
          <h2 className="text-2xl sm:text-3xl font-black text-vea-text mb-2">
            Demander un devis <span className="text-vea-accent">personnalisé</span>
          </h2>
          <p className="text-sm text-vea-text-muted">
            Recevez une proposition adaptée à votre besoin sous 48 à 72 heures.
          </p>
        </div>

        <DevisForm selectedPack={selectedPack} onPackReset={handlePackReset} />
      </section>
    </>
  );
}
