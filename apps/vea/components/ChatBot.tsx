/**
 * ChatBot — Bulle FAQ flottante en bas à droite, présente sur toutes les pages.
 *
 * Inclus dans le RootLayout pour survoler le site quelle que soit la page.
 *
 * UX :
 *   1. Bulle ronde rouge fixe en bas à droite (z-50 pour être au-dessus de tout)
 *   2. Click → panneau popup avec :
 *        - Liste de questions cliquables (FAQ)
 *        - Quand on clique une question → affiche la réponse
 *        - Bouton "← Retour aux questions" pour revenir
 *        - Lien permanent vers /contact + /prestations en bas du panneau
 *   3. Fermable via croix en haut à droite du panneau
 *   4. Click en dehors du panneau le ferme aussi
 *
 * Pas un vrai chatbot IA — c'est une FAQ déguisée en chat pour réduire
 * la friction. Si on veut un vrai chatbot LLM plus tard, on garde le même
 * shell visuel et on plug une API en V2.
 */
"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";

interface FaqItem {
  question: string;
  answer: string;
  cta?: { label: string; href: string };
}

// Les questions sont organisées par ordre de fréquence attendue. Les CTAs
// pointent vers les pages internes pertinentes (préstations, joueurs, contact).
const FAQ: FaqItem[] = [
  {
    question: "C'est quoi VEA ?",
    answer:
      "Velito Esport Amiens (VEA) est une association loi 1901 basée à Amiens, fondée en 2022. On utilise l'esport et le jeu vidéo comme outil d'inclusion sociale, de prévention numérique et d'animation dans les quartiers prioritaires. On organise des tournois, des animations en centres sociaux, et on intervient sur des événements pour les collectivités.",
  },
  {
    question: "Quels sont vos tarifs pour une animation ?",
    answer:
      "Pack Découverte : 65 € / heure (minimum 1h30) pour une animation simple. Pack Animation : 90 € / heure (minimum 2 heures) pour un dispositif étendu. Option Stream : +250 € pour la captation et la diffusion live. Les tarifs sont adaptés selon le contexte (QPV, partenariat, durée).",
    cta: { label: "Voir le détail des packs et demander un devis", href: "/prestations" },
  },
  {
    question: "Vous intervenez où ?",
    answer:
      "Principalement à Amiens et dans les Hauts-de-France. On se déplace dans les structures qui nous accueillent : centres sociaux, écoles, mairies, MJC, salles événementielles. Pour les villes plus éloignées, on évalue au cas par cas selon les frais de déplacement.",
  },
  {
    question: "Comment demander un devis ?",
    answer:
      "Le plus simple est de remplir le formulaire de demande de devis sur la page Prestations. On répond sous 48 à 72 heures avec une proposition personnalisée selon ton besoin (public, durée, lieu, type de prestation).",
    cta: { label: "Faire une demande de devis", href: "/prestations" },
  },
  {
    question: "Quels jeux proposez-vous ?",
    answer:
      "On adapte selon l'âge et le public. Pour les enfants : Mario Kart, Smash Bros, FIFA, jeux Switch. Pour les ados et adultes : Street Fighter 6, Rocket League, Rainbow Six Siege, COD, Valorant. Aussi des jeux de plateforme et coopération selon le contexte.",
  },
  {
    question: "Comment devenir bénévole ?",
    answer:
      "Tu peux venir nous aider sur nos animations (Tour du Marais, Vacances QPV, tournois). Le plus simple est de nous contacter par mail ou de venir sur un de nos events. On t'intègre progressivement selon ton temps et tes envies.",
    cta: { label: "Nous contacter", href: "/contact" },
  },
  {
    question: "Comment adhérer à VEA ?",
    answer:
      "L'adhésion est ouverte à toute personne intéressée par notre projet. Pour l'instant, contacte-nous directement, on t'explique la démarche et le montant de la cotisation. Un système d'adhésion en ligne arrive bientôt.",
    cta: { label: "Nous contacter pour adhérer", href: "/contact" },
  },
  {
    question: "Vous avez un local ?",
    answer:
      "Pour l'instant non, on intervient dans les locaux des structures qui nous accueillent (centres sociaux, salles communales, écoles). Un projet de centre esport à Amiens est en réflexion pour 2027.",
  },
  {
    question: "Vous travaillez avec les collectivités ?",
    answer:
      "Oui. VEA est référencée dans la grille tarifaire culture/jeunesse de la Mairie d'Amiens. Pour les autres collectivités (mairies, métropoles, départements, EPCI), on peut négocier des tarifs spécifiques dans le cadre de conventions ou marchés publics.",
    cta: { label: "Voir notre offre collectivités", href: "/prestations" },
  },
];

export default function ChatBot() {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);

  // Click en dehors -> fermer
  useEffect(() => {
    if (!isOpen) return;
    function handleClickOutside(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setSelectedIndex(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  // Escape -> fermer
  useEffect(() => {
    if (!isOpen) return;
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setIsOpen(false);
        setSelectedIndex(null);
      }
    }
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen]);

  function openChat() {
    setIsOpen(true);
    setSelectedIndex(null);
  }

  function closeChat() {
    setIsOpen(false);
    setSelectedIndex(null);
  }

  function backToQuestions() {
    setSelectedIndex(null);
  }

  const selectedFaq = selectedIndex !== null ? FAQ[selectedIndex] : null;

  return (
    <>
      {/* Bulle flottante (visible quand chat fermé) */}
      {!isOpen && (
        <button
          type="button"
          onClick={openChat}
          aria-label="Ouvrir l'assistant FAQ"
          className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-vea-accent/85 text-white shadow-lg hover:bg-vea-accent hover:scale-105 transition-all flex items-center justify-center"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="currentColor"
            className="w-7 h-7"
            aria-hidden="true"
          >
            <path d="M12 3C6.48 3 2 6.93 2 11.78c0 2.32 1.07 4.42 2.81 5.97-.08.6-.31 1.93-.91 3.36 0 0 1.69-.13 4.04-1.6.66.15 1.35.23 2.06.23 5.52 0 10-3.93 10-8.78S17.52 3 12 3z" />
          </svg>
          {/* Petit point qui pulse pour attirer l'oeil */}
          <span className="absolute top-1 right-1 w-3 h-3 bg-white rounded-full border-2 border-vea-accent animate-pulse" />
        </button>
      )}

      {/* Panneau (visible quand chat ouvert) */}
      {isOpen && (
        <div
          ref={panelRef}
          className="fixed bottom-6 right-6 z-50 w-[calc(100vw-3rem)] sm:w-96 max-h-[80vh] bg-white border border-vea-border rounded-2xl shadow-2xl flex flex-col overflow-hidden"
          role="dialog"
          aria-label="Assistant FAQ Velito Esport Amiens"
        >
          {/* Header */}
          <div className="bg-vea-accent/90 text-white px-5 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  className="w-5 h-5"
                  aria-hidden="true"
                >
                  <path d="M12 3C6.48 3 2 6.93 2 11.78c0 2.32 1.07 4.42 2.81 5.97-.08.6-.31 1.93-.91 3.36 0 0 1.69-.13 4.04-1.6.66.15 1.35.23 2.06.23 5.52 0 10-3.93 10-8.78S17.52 3 12 3z" />
                </svg>
              </div>
              <div>
                <p className="font-black text-sm leading-tight">Assistant VEA</p>
                <p className="text-[10px] uppercase tracking-widest opacity-80">
                  Questions fréquentes
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={closeChat}
              aria-label="Fermer l'assistant"
              className="w-8 h-8 rounded-full hover:bg-white/15 transition-colors flex items-center justify-center"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="currentColor"
                className="w-5 h-5"
                aria-hidden="true"
              >
                <path d="M19 6.41 17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
              </svg>
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-4">
            {selectedFaq === null ? (
              <>
                {/* Message d'accueil */}
                <div className="mb-4">
                  <div className="inline-block bg-vea-bg rounded-2xl rounded-bl-sm px-4 py-3 text-sm text-vea-text max-w-[85%]">
                    Salut ! Je suis l&apos;assistant de Velito Esport Amiens.
                    Choisis une question ci-dessous, je te réponds tout de
                    suite. Et si tu trouves pas ta réponse, on a un formulaire
                    de contact en bas.
                  </div>
                </div>
                {/* Liste des questions */}
                <p className="text-[10px] uppercase tracking-widest font-bold text-vea-text-dim mb-2 px-1">
                  Questions fréquentes
                </p>
                <div className="space-y-2">
                  {FAQ.map((item, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setSelectedIndex(i)}
                      className="w-full text-left px-4 py-3 rounded-xl border border-vea-border bg-white text-sm text-vea-text hover:border-vea-accent hover:bg-vea-accent-soft/40 transition-all"
                    >
                      {item.question}
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <>
                {/* Bouton retour */}
                <button
                  type="button"
                  onClick={backToQuestions}
                  className="text-xs uppercase tracking-widest font-bold text-vea-accent hover:underline mb-3 inline-flex items-center gap-1"
                >
                  ← Retour aux questions
                </button>
                {/* Bulle question (utilisateur) */}
                <div className="mb-3 flex justify-end">
                  <div className="inline-block bg-vea-accent/85 text-white rounded-2xl rounded-br-sm px-4 py-3 text-sm max-w-[85%]">
                    {selectedFaq.question}
                  </div>
                </div>
                {/* Bulle réponse (assistant) */}
                <div className="mb-4">
                  <div className="inline-block bg-vea-bg rounded-2xl rounded-bl-sm px-4 py-3 text-sm text-vea-text max-w-[90%] leading-relaxed whitespace-pre-line">
                    {selectedFaq.answer}
                  </div>
                </div>
                {/* CTA contextuel si disponible */}
                {selectedFaq.cta && (
                  <Link
                    href={selectedFaq.cta.href}
                    onClick={closeChat}
                    className="block w-full text-center bg-vea-accent/90 text-white text-sm font-bold uppercase tracking-widest px-4 py-3 rounded-full hover:bg-vea-accent transition-colors"
                  >
                    {selectedFaq.cta.label}
                  </Link>
                )}
              </>
            )}
          </div>

          {/* Footer : lien permanent vers contact */}
          <div className="border-t border-vea-border bg-vea-bg px-4 py-3 flex flex-col sm:flex-row gap-2 justify-between items-center text-xs">
            <p className="text-vea-text-muted">
              Pas trouvé ta réponse ?
            </p>
            <div className="flex gap-2">
              <Link
                href="/prestations"
                onClick={closeChat}
                className="text-[10px] uppercase tracking-widest font-bold px-3 py-1.5 rounded-full border border-vea-accent/30 text-vea-accent hover:bg-vea-accent hover:text-white transition-colors"
              >
                Devis
              </Link>
              <Link
                href="/contact"
                onClick={closeChat}
                className="text-[10px] uppercase tracking-widest font-bold px-3 py-1.5 rounded-full bg-vea-accent/90 text-white hover:bg-vea-accent transition-colors"
              >
                Nous contacter
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
