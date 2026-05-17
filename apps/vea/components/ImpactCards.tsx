/**
 * ImpactCards — 5 cards interactives "Notre Impact" sur /association.
 *
 * Comportement :
 *   - Click sur une card -> deroule la card en place (div explicative dedans)
 *   - Accordeon : une seule card ouverte a la fois
 *   - Mots-cles highlight (em + couleur rouge VEA) dans les explications
 *   - Card visible = sobre (chiffre + label + chevron, pas d'emoji)
 *   - Emoji affiche en prefixe du detail uniquement (quand la card est ouverte)
 *   - CountUp anime 0 -> valeur cible quand la section entre dans le viewport,
 *     sauf pour FDVA (texte fixe, pas de chiffre)
 *   - Responsive : 1 colonne mobile, 2 tablette, 5 desktop
 *
 * "use client" car j'utilise useState + CountUp (lui-meme client).
 */
"use client";

import { useState, ReactNode } from "react";
import Link from "next/link";
import CountUp from "./CountUp";

interface ImpactCard {
  id: string;
  emoji: string;
  /**
   * Si defini -> on affiche un CountUp anime de 0 a count.end.
   * Si null -> on affiche staticValue en texte fixe (cas FDVA).
   */
  count: { end: number; suffix?: string; separator?: boolean } | null;
  staticValue?: string;
  label: string;
  /** Description rendue (peut contenir des <em>, <strong>, <Link>) */
  detail: ReactNode;
}

const CARDS: ImpactCard[] = [
  {
    id: "benevolat",
    emoji: "⏱️",
    count: { end: 3686, suffix: " h", separator: true },
    label: "de benevolat valorise",
    detail: (
      <>
        Ces heures representent le travail <em>cumule de nos benevoles</em> sur
        3 saisons, de 2022 a 2026. <strong>Animations hebdomadaires</strong>,
        tournois, stages, interventions en quartier, gestion administrative.
        Si on applique les baremes du{" "}
        <strong>Plan Comptable Associatif classe 8</strong>, ces heures
        representent une valorisation de{" "}
        <em className="font-bold not-italic text-vea-accent">43 800 €</em> de
        travail humain mobilise sans etre facture. Ce n&apos;est pas de
        l&apos;argent recu, c&apos;est{" "}
        <em className="font-bold not-italic">
          l&apos;engagement collectif quantifie
        </em>
        .
      </>
    ),
  },
  {
    id: "activites",
    emoji: "📋",
    count: { end: 30, suffix: "+" },
    label: "activites documentees",
    detail: (
      <>
        <strong>Tournois inter-quartiers</strong>, stages educatifs pendant
        les vacances scolaires, animations hebdomadaires dans les centres
        sociaux, interventions en{" "}
        <strong>prevention numerique</strong> dans les colleges, evenements
        communautaires. Chaque activite est <em>tracee, datee et archivee</em>.{" "}
        <Link
          href="/agenda"
          className="text-vea-accent hover:underline font-semibold"
        >
          Voir toutes nos activites →
        </Link>
      </>
    ),
  },
  {
    id: "qpv",
    emoji: "📍",
    count: { end: 4 },
    label: "quartiers QPV couverts",
    detail: (
      <>
        <strong>Etouvie</strong>, <strong>Amiens Nord</strong>,{" "}
        <strong>Elbeuf</strong> (quartier Saint-Just),{" "}
        <strong>Pierre Rollin</strong>. VEA intervient dans les{" "}
        <em>Quartiers Prioritaires de la Ville</em> depuis sa creation en 2022.
        Etre present dans les QPV n&apos;est pas un bonus pour nous, c&apos;est{" "}
        <em className="font-bold not-italic text-vea-accent">
          le coeur de notre mission
        </em>
        . C&apos;est la que les jeunes ont le moins acces aux activites
        culturelles et numeriques, et c&apos;est la qu&apos;on installe nos
        consoles.
      </>
    ),
  },
  {
    id: "jeunes",
    emoji: "🎮",
    count: { end: 300, suffix: "+" },
    label: "jeunes touches",
    detail: (
      <>
        Ce chiffre depasse les simples adherents. Il inclut les jeunes venus a
        un <strong>tournoi one-shot</strong>, les participants aux{" "}
        <strong>stages de vacances</strong>, les eleves rencontres lors{" "}
        <strong>d&apos;interventions scolaires</strong>, les presents aux
        evenements communautaires. <em>Peu importe le sexe, le quartier, le
        niveau de jeu ou le parcours.</em>{" "}
        <em className="font-bold not-italic text-vea-accent">
          L&apos;esport rassemble.
        </em>{" "}
        Certains sont venus une fois, d&apos;autres reviennent chaque semaine
        depuis 3 ans.
      </>
    ),
  },
  {
    id: "fdva",
    emoji: "🏛️",
    count: null,
    staticValue: "FDVA",
    label: "soutenue depuis 2024",
    detail: (
      <>
        Le <strong>Fonds pour le Developpement de la Vie Associative</strong>{" "}
        est un dispositif d&apos;Etat qui finance les associations{" "}
        <em>reconnues d&apos;utilite sociale</em>. Etre selectionne par le FDVA
        valide notre <strong>serieux associatif</strong> et notre{" "}
        <strong>ancrage territorial</strong>. C&apos;est une{" "}
        <em className="font-bold not-italic text-vea-accent">
          reconnaissance publique
        </em>{" "}
        de notre travail de terrain, pas juste une ligne budgetaire.
      </>
    ),
  },
];

export default function ImpactCards() {
  // L'id de la card ouverte, ou null si tout ferme
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
      {CARDS.map((card) => {
        const isOpen = openId === card.id;
        return (
          <div
            key={card.id}
            className={`card-clean transition-all duration-300 ${
              isOpen ? "lg:col-span-5 sm:col-span-2" : ""
            }`}
          >
            <button
              type="button"
              onClick={() => setOpenId(isOpen ? null : card.id)}
              className="w-full p-5 text-left focus:outline-none focus:ring-2 focus:ring-vea-accent focus:ring-inset rounded-xl group"
              aria-expanded={isOpen}
              aria-controls={`detail-${card.id}`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-xl sm:text-2xl font-black text-vea-accent leading-none mb-2 whitespace-nowrap">
                    {card.count ? (
                      <CountUp
                        end={card.count.end}
                        suffix={card.count.suffix ?? ""}
                        separator={card.count.separator ?? false}
                        duration={2}
                      />
                    ) : (
                      card.staticValue
                    )}
                  </p>
                  <p className="text-[11px] text-vea-text-dim uppercase tracking-wider font-medium leading-tight">
                    {card.label}
                  </p>
                </div>
                <span
                  aria-hidden="true"
                  className={`text-vea-accent transition-transform duration-300 ${
                    isOpen ? "rotate-180" : ""
                  } flex-shrink-0`}
                >
                  ▼
                </span>
              </div>
            </button>

            {/* Detail expansible — emoji affiche ici en prefixe */}
            <div
              id={`detail-${card.id}`}
              className={`overflow-hidden transition-all duration-300 ease-in-out ${
                isOpen
                  ? "max-h-[600px] opacity-100"
                  : "max-h-0 opacity-0"
              }`}
            >
              <div className="px-5 pb-5 pt-3 border-t border-vea-border mt-2">
                <p className="text-sm text-vea-text-muted leading-relaxed">
                  <span
                    aria-hidden="true"
                    className="text-lg mr-2 align-[-2px]"
                  >
                    {card.emoji}
                  </span>
                  {card.detail}
                </p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
