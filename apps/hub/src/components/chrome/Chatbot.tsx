/**
 * Chatbot — FAQ statique flottante en bas à droite du hub.
 *
 * V1 : pas d'IA, juste une liste de questions/réponses pré-remplies.
 *
 * Interactions (ma spec) :
 *   - Desktop (>= 768px) : ouverture au SURVOL du bouton + au CLIC du bouton
 *   - Mobile (< 768px) : ouverture au CLIC uniquement (pas de hover sur touch)
 *   - Une fois ouvert, click sur une question → toggle sa réponse en dessous (accordéon)
 *
 * V2 prévue : vrai chatbot IA (mention dans le texte d'intro pour transparence).
 */

"use client";

import { useState, useRef, useCallback } from "react";

interface QA {
  question: string;
  answer: string;
}

// Les 8 Q/R proposées pour le V1 — facile à éditer ici sans toucher le composant.
const FAQS: QA[] = [
  {
    question: "C'est quoi Velito ?",
    answer:
      "Velito est un écosystème numérique modulaire basé à Amiens. Il regroupe une asso esport (VEA), une agence numérique (VENA Services), une plateforme de tournois (ARENA), des animations gaming pour bars (Interactive), et plusieurs autres modules en développement.",
  },
  {
    question: "Comment naviguer dans la sphère 3D ?",
    answer:
      "Glisse-déposer pour faire tourner la sphère. Chaque disque représente un module Velito. Clique sur le bouton fléché qui apparaît pour ouvrir le module sélectionné.",
  },
  {
    question: "Quels modules sont déjà accessibles ?",
    answer:
      "L'écosystème est en phase beta : pour l'instant, tous les modules redirigent vers une page \"en construction\". Le premier lancement prévu est Velito Interactive le 25 juin 2026 à Amiens.",
  },
  {
    question: "Comment me créer un compte ?",
    answer:
      "L'authentification arrive avec Morse, la messagerie unifiée Velito. En attendant, les boutons \"Se connecter\" et \"S'inscrire\" mènent à la page de construction.",
  },
  {
    question: "Qui est derrière Velito ?",
    answer:
      "Clavel NDEMA MOUSSA, jeune développeur amiénois. Fondateur de VENA (SASU) et président de VEA (asso loi 1901). En alternance CDA chez MABB, jury final avril 2027.",
  },
  {
    question: "Comment vous contacter ?",
    answer:
      "Par email à vea@velito.com pour l'asso, ou via les sous-domaines respectifs des modules. Le formulaire de contact général arrivera avec la sortie de la page /a-propos.",
  },
  {
    question: "Vous êtes basés où ?",
    answer:
      "Amiens, Hauts-de-France. L'écosystème Velito est ancré localement : nos projets ciblent en priorité les jeunes des quartiers prioritaires amiénois et les acteurs locaux (bars, MJC, collectivités).",
  },
  {
    question: "C'est un vrai chatbot IA ?",
    answer:
      "Non, pas encore. Cette V1 est une FAQ statique. Un vrai chatbot conversationnel basé sur les agents IA de l'écosystème Velito arrivera dans une future mise à jour.",
  },
];

export default function Chatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  // Délai pour éviter que le panel se ferme quand on déplace la souris du
  // bouton vers le panel (sinon ça clignote).
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Helpers ouverture/fermeture.
  const open = useCallback(() => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
    setIsOpen(true);
  }, []);

  const scheduleClose = useCallback(() => {
    if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
    closeTimeoutRef.current = setTimeout(() => setIsOpen(false), 300);
  }, []);

  const toggle = useCallback(() => setIsOpen((v) => !v), []);

  // Pour détecter si on est en mode tactile (mobile) : on désactive les
  // mouseenter/leave en CSS via media query (cf. classes "md:..." sur le wrapper).
  // En JS on garde tous les handlers, mais le CSS les neutralise sur mobile.

  return (
    <div
      className="fixed bottom-4 right-4 z-40 flex flex-col items-end gap-2"
      // Sur mobile (< 768px), on ne reçoit pas les events mouse natifs, donc
      // pas besoin de filtrer côté JS — un tap déclenche click directement.
      onMouseEnter={() => {
        if (window.matchMedia("(min-width: 768px)").matches) open();
      }}
      onMouseLeave={() => {
        if (window.matchMedia("(min-width: 768px)").matches) scheduleClose();
      }}
    >
      {/* Panel des questions — animé via classes CSS. */}
      {isOpen && (
        <div
          role="dialog"
          aria-label="Foire aux questions Velito"
          className="bg-[#0a0a1a]/95 backdrop-blur-md border border-white/15 rounded-2xl shadow-2xl w-[min(360px,calc(100vw-2rem))] max-h-[60vh] overflow-y-auto"
        >
          <div className="px-4 py-3 border-b border-white/10 sticky top-0 bg-[#0a0a1a]/95 backdrop-blur-md">
            <h3 className="font-orbitron text-white text-base font-bold">
              Questions fréquentes
            </h3>
            <p className="text-xs text-white/50 mt-1">
              FAQ statique — un vrai chatbot arrivera plus tard.
            </p>
          </div>
          <ul className="p-2 space-y-1">
            {FAQS.map((qa, idx) => {
              const isExpanded = expandedIndex === idx;
              return (
                <li key={idx}>
                  <button
                    type="button"
                    aria-expanded={isExpanded}
                    onClick={() =>
                      setExpandedIndex(isExpanded ? null : idx)
                    }
                    className="w-full text-left px-3 py-2 rounded-lg text-white text-sm hover:bg-white/5 transition-colors flex items-start gap-2 focus:outline-none focus:ring-2 focus:ring-white/30"
                  >
                    <span
                      aria-hidden="true"
                      className={`text-white/40 mt-0.5 transition-transform ${
                        isExpanded ? "rotate-90" : ""
                      }`}
                    >
                      ›
                    </span>
                    <span className="flex-1">{qa.question}</span>
                  </button>
                  {isExpanded && (
                    <div className="px-8 py-2 text-sm text-white/75 leading-relaxed">
                      {qa.answer}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* Bouton flottant — toujours visible. */}
      <button
        type="button"
        onClick={toggle}
        aria-label={isOpen ? "Fermer la FAQ" : "Ouvrir la FAQ"}
        aria-expanded={isOpen}
        className="bg-purple-600 hover:bg-purple-500 active:bg-purple-700 text-white rounded-full w-14 h-14 flex items-center justify-center shadow-xl transition-colors focus:outline-none focus:ring-2 focus:ring-white/60"
      >
        {isOpen ? (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M18 6 6 18" />
            <path d="m6 6 12 12" />
          </svg>
        ) : (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        )}
      </button>
    </div>
  );
}
