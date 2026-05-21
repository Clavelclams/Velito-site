/**
 * ChatBot — Bulle FAQ flottante VENA (bas à droite, toutes pages sauf /lien).
 *
 * Même mécanique que le ChatBot VEA : FAQ déguisée en chat, pas d'IA.
 * Charte kaki VENA. Les CTA peuvent être internes (Link) ou externes (a target).
 *
 * Monté dans le RootLayout VENA.
 */
"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import SignalementForm from "@/components/SignalementForm";

interface FaqItem {
  question: string;
  answer: string;
  cta?: { label: string; href: string };
}

const FAQ: FaqItem[] = [
  {
    question: "C'est quoi VENA ?",
    answer:
      "VENA (Velito Expertise Numérique Amiens) est une agence numérique amiénoise. On accompagne les structures et entreprises des Hauts-de-France sur leurs projets web, vidéo, photo, et sur la formation. L'idée : une expertise locale, accessible et concrète, sans jargon.",
  },
  {
    question: "Quels services proposez-vous ?",
    answer:
      "• Sites web & applications (vitrine, e-commerce, outils sur mesure)\n• Production vidéo & photo professionnelle\n• Location de matériel\n• Formation et accompagnement au numérique\n• Conseil / stratégie digitale\n\nDis-nous ton besoin via le formulaire, on cadre ensemble.",
    cta: { label: "Décrire mon projet", href: "/contact" },
  },
  {
    question: "Vous faites de la vidéo ?",
    answer:
      "Oui. VENA n'est pas un one-man-band : pour la partie vidéo (captation, réalisation, montage), je travaille avec un vidéaste partenaire de confiance selon les besoins du projet. Tu peux jeter un œil à son travail sur Instagram.",
    cta: {
      label: "Voir le travail vidéo (Instagram @eb2cvision)",
      href: "https://www.instagram.com/eb2cvision",
    },
  },
  {
    question: "Comment demander un devis ?",
    answer:
      "Remplis le formulaire de contact avec quelques infos sur ton projet (besoin, délai, budget si tu en as une idée). Tu reçois un accusé de réception tout de suite, et on revient vers toi sous 48 à 72h avec une proposition adaptée.",
    cta: { label: "Demander un devis", href: "/contact" },
  },
  {
    question: "Combien ça coûte ?",
    answer:
      "Ça dépend entièrement du projet (périmètre, complexité, délai). Plutôt que d'afficher des prix bidons, on chiffre après un court échange pour te donner un devis juste et transparent. Pas de surprise.",
    cta: { label: "Obtenir un chiffrage", href: "/contact" },
  },
  {
    question: "Vous intervenez où ?",
    answer:
      "Basés à Amiens, on intervient dans toute la région Hauts-de-France pour les prestations sur site (vidéo, photo, formation). Pour le web et le digital, on travaille aussi à distance, partout en France.",
  },
  {
    question: "Quels sont les délais ?",
    answer:
      "Variable selon le projet. Un site vitrine simple va plus vite qu'une app sur mesure. On te donne un planning clair dès le devis, et on te dit franchement si une deadline est tenable ou non.",
  },
];

export default function ChatBot() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [showSignalement, setShowSignalement] = useState(false);
  const panelRef = useRef<HTMLDivElement | null>(null);

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

  // Pas de chatbot sur le linktree autonome.
  if (pathname?.startsWith("/lien")) return null;

  function closeChat() {
    setIsOpen(false);
    setSelectedIndex(null);
    setShowSignalement(false);
  }

  const selectedFaq = selectedIndex !== null ? FAQ[selectedIndex] ?? null : null;

  function CtaButton({ cta }: { cta: { label: string; href: string } }) {
    const cls =
      "block w-full text-center bg-vena-kaki text-vena-cream text-sm font-bold uppercase tracking-widest px-4 py-3 rounded-full hover:opacity-90 transition-opacity";
    if (cta.href.startsWith("http")) {
      return (
        <a href={cta.href} target="_blank" rel="noopener noreferrer" className={cls}>
          {cta.label}
        </a>
      );
    }
    return (
      <Link href={cta.href} onClick={closeChat} className={cls}>
        {cta.label}
      </Link>
    );
  }

  return (
    <>
      {!isOpen && (
        <button
          type="button"
          onClick={() => {
            setIsOpen(true);
            setSelectedIndex(null);
            setShowSignalement(false);
          }}
          aria-label="Ouvrir l'assistant FAQ VENA"
          className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-vena-kaki text-vena-cream shadow-lg hover:scale-105 transition-transform flex items-center justify-center"
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
          <span className="absolute top-1 right-1 w-3 h-3 bg-white rounded-full border-2 border-vena-kaki animate-pulse" />
        </button>
      )}

      {isOpen && (
        <div
          ref={panelRef}
          className="fixed bottom-6 right-6 z-50 w-[calc(100vw-3rem)] sm:w-96 max-h-[80vh] bg-white border border-vena-border rounded-2xl shadow-2xl flex flex-col overflow-hidden"
          role="dialog"
          aria-label="Assistant FAQ VENA"
        >
          <div className="bg-vena-kaki text-vena-cream px-5 py-4 flex items-center justify-between">
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
                <p className="font-black text-sm leading-tight">Assistant VENA</p>
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

          <div className="flex-1 overflow-y-auto p-4">
            {showSignalement ? (
              <>
                <button
                  type="button"
                  onClick={() => setShowSignalement(false)}
                  className="text-xs uppercase tracking-widest font-bold text-vena-kaki hover:underline mb-3 inline-flex items-center gap-1"
                >
                  ← Retour
                </button>
                <p className="text-sm font-black text-vena-text mb-1">
                  Signaler un problème
                </p>
                <p className="text-xs text-vena-text-muted mb-4">
                  Un bug, un truc qui marche pas, un souci sur un projet ou côté
                  VEA ? Dis-nous tout.
                </p>
                <SignalementForm app="vena" loginHref="/login" />
              </>
            ) : selectedFaq === null ? (
              <>
                <div className="mb-4">
                  <div className="inline-block bg-vena-cream rounded-2xl rounded-bl-sm px-4 py-3 text-sm text-vena-text max-w-[85%]">
                    Salut ! Je suis l&apos;assistant de VENA. Choisis une question
                    ci-dessous, je te réponds direct. Si tu trouves pas, on a un
                    formulaire de contact en bas.
                  </div>
                </div>
                <p className="text-[10px] uppercase tracking-widest font-bold text-vena-text-dim mb-2 px-1">
                  Questions fréquentes
                </p>
                <div className="space-y-2">
                  {FAQ.map((item, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setSelectedIndex(i)}
                      className="w-full text-left px-4 py-3 rounded-xl border border-vena-border bg-white text-sm text-vena-text hover:border-vena-kaki transition-all"
                    >
                      {item.question}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => setShowSignalement(true)}
                  className="w-full mt-3 text-left px-4 py-3 rounded-xl border border-dashed border-vena-kaki/50 bg-vena-kaki-soft text-sm font-semibold text-vena-kaki-dark hover:opacity-90 transition-all"
                >
                  ⚠ Signaler un problème
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => setSelectedIndex(null)}
                  className="text-xs uppercase tracking-widest font-bold text-vena-kaki hover:underline mb-3 inline-flex items-center gap-1"
                >
                  ← Retour aux questions
                </button>
                <div className="mb-3 flex justify-end">
                  <div className="inline-block bg-vena-kaki text-vena-cream rounded-2xl rounded-br-sm px-4 py-3 text-sm max-w-[85%]">
                    {selectedFaq.question}
                  </div>
                </div>
                <div className="mb-4">
                  <div className="inline-block bg-vena-cream rounded-2xl rounded-bl-sm px-4 py-3 text-sm text-vena-text max-w-[90%] leading-relaxed whitespace-pre-line">
                    {selectedFaq.answer}
                  </div>
                </div>
                {selectedFaq.cta && <CtaButton cta={selectedFaq.cta} />}
              </>
            )}
          </div>

          <div className="border-t border-vena-border bg-vena-cream px-4 py-3 flex items-center justify-between gap-2 text-xs">
            <p className="text-vena-text-muted">Pas trouvé ta réponse ?</p>
            <Link
              href="/contact"
              onClick={closeChat}
              className="text-[10px] uppercase tracking-widest font-bold px-3 py-1.5 rounded-full bg-vena-kaki text-vena-cream hover:opacity-90 transition-opacity"
            >
              Nous contacter
            </Link>
          </div>
        </div>
      )}
    </>
  );
}
