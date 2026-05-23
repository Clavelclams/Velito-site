/**
 * Page Contact VEA — REFONTE FOND CLAIR (17/05/2026)
 *
 * Avant : DA sombre violet/rouge avec card-glow + fake success.
 * Apres : DA claire (card-clean, btn-primary, badge-red) + envoi reel
 * via /api/contact -> Resend.
 *
 * Form simplifie : Prenom, Nom, Email, Message (suppression Tel + Sujet
 * pour reduire la friction). 4 etats : idle, sending, success, error.
 *
 * "use client" car form interactif (useState + fetch).
 */
"use client";

import { useState } from "react";
import ScrollReveal from "@/components/ScrollReveal";

type Status = "idle" | "sending" | "success" | "error";

interface ContactForm {
  prenom: string;
  nom: string;
  email: string;
  message: string;
}

const SOCIALS = [
  { name: "Instagram", handle: "@velitoesport", href: "https://instagram.com/velitoesport" },
  { name: "Facebook", handle: "@velitoesport", href: "https://facebook.com/velitoesport" },
  { name: "X", handle: "@velitoesport", href: "https://x.com/velitoesport" },
  { name: "TikTok", handle: "@velitoesport", href: "https://tiktok.com/@velitoesport" },
  { name: "LinkedIn", handle: "Velito Esport", href: "https://linkedin.com/company/velitoesport" },
];

export default function ContactPage() {
  const [form, setForm] = useState<ContactForm>({
    prenom: "",
    nom: "",
    email: "",
    message: "",
  });
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState<string>("");

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    setErrorMsg("");

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setErrorMsg(
          data.error ?? "Erreur lors de l'envoi. Reessayez ou ecrivez-nous directement."
        );
        setStatus("error");
        return;
      }

      setStatus("success");
      setForm({ prenom: "", nom: "", email: "", message: "" });
    } catch {
      setErrorMsg("Erreur reseau. Reessayez dans un instant.");
      setStatus("error");
    }
  }

  // Classes input — DA claire : fond blanc, bordure vea-border, focus rouge
  const inputClass =
    "w-full bg-white border border-vea-border rounded-lg px-4 py-3 text-vea-text text-sm placeholder-vea-text-dim focus:outline-none focus:border-vea-accent focus:ring-2 focus:ring-vea-accent/15 transition-all";

  return (
    <>
      {/* ===== HERO ===== */}
      <section className="hero-bg-full pt-24 pb-12 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <ScrollReveal>
            <span className="badge-red mb-4">Contact</span>
            <h1 className="text-4xl sm:text-5xl font-black text-vea-text mb-4">
              On vous <span className="text-vea-accent">repond</span>
            </h1>
            <p className="text-base sm:text-lg text-vea-text-muted max-w-2xl mx-auto leading-relaxed">
              Une question, un projet, une envie de rejoindre l&apos;aventure&nbsp;?
              Ecrivez-nous, on revient vers vous rapidement.
            </p>
          </ScrollReveal>
        </div>
      </section>

      {/* ===== CONTENU ===== */}
      <section className="py-12 px-4 bg-vea-bg">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">

            {/* ===== FORMULAIRE (3/5) ===== */}
            <div className="lg:col-span-3">
              <ScrollReveal>
                <div className="panel p-6 sm:p-8">
                  {status === "success" ? (
                    <div className="text-center py-8">
                      <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-vea-accent-soft border border-vea-accent/20 flex items-center justify-center">
                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#E63946" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      </div>
                      <h2 className="text-xl font-bold text-vea-text mb-2">
                        Message envoye
                      </h2>
                      <p className="text-sm text-vea-text-muted mb-6">
                        Merci, on revient vers vous dans les 48&nbsp;h.
                      </p>
                      <button
                        type="button"
                        onClick={() => setStatus("idle")}
                        className="btn-outline"
                      >
                        Envoyer un autre message
                      </button>
                    </div>
                  ) : (
                    <form onSubmit={handleSubmit} className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label htmlFor="prenom" className="block text-xs font-semibold text-vea-text-muted uppercase tracking-wider mb-1.5">
                            Prenom
                          </label>
                          <input
                            type="text"
                            id="prenom"
                            name="prenom"
                            value={form.prenom}
                            onChange={handleChange}
                            required
                            minLength={2}
                            className={inputClass}
                            placeholder="Josué"
                          />
                        </div>
                        <div>
                          <label htmlFor="nom" className="block text-xs font-semibold text-vea-text-muted uppercase tracking-wider mb-1.5">
                            Nom
                          </label>
                          <input
                            type="text"
                            id="nom"
                            name="nom"
                            value={form.nom}
                            onChange={handleChange}
                            required
                            minLength={2}
                            className={inputClass}
                            placeholder="Clémentin"
                          />
                        </div>
                      </div>

                      <div>
                        <label htmlFor="email" className="block text-xs font-semibold text-vea-text-muted uppercase tracking-wider mb-1.5">
                          Email
                        </label>
                        <input
                          type="email"
                          id="email"
                          name="email"
                          value={form.email}
                          onChange={handleChange}
                          required
                          className={inputClass}
                          placeholder="josue.clementin@exemple.fr"
                        />
                      </div>

                      <div>
                        <label htmlFor="message" className="block text-xs font-semibold text-vea-text-muted uppercase tracking-wider mb-1.5">
                          Message
                        </label>
                        <textarea
                          id="message"
                          name="message"
                          value={form.message}
                          onChange={handleChange}
                          required
                          minLength={10}
                          maxLength={5000}
                          rows={6}
                          className={`${inputClass} resize-y`}
                          placeholder="Dites-nous ce qui vous amene..."
                        />
                        <p className="text-[11px] text-vea-text-dim mt-1.5">
                          {form.message.length}/5000 caracteres
                        </p>
                      </div>

                      {status === "error" && (
                        <div className="border border-vea-accent/30 bg-vea-accent-soft rounded-lg px-4 py-3 text-sm text-vea-accent">
                          {errorMsg}
                        </div>
                      )}

                      <button
                        type="submit"
                        disabled={status === "sending"}
                        className="btn-primary disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        {status === "sending" ? "Envoi en cours..." : "Envoyer le message"}
                      </button>

                      <p className="text-[11px] text-vea-text-dim leading-relaxed">
                        En envoyant ce message, vous acceptez que vos donnees soient
                        utilisees pour vous repondre. Aucune diffusion a des tiers.
                      </p>
                    </form>
                  )}
                </div>
              </ScrollReveal>
            </div>

            {/* ===== INFOS (2/5) ===== */}
            <div className="lg:col-span-2 space-y-10">
              <ScrollReveal delay={0.1}>
                <div className="panel-accent">
                  <h3 className="text-vea-accent uppercase tracking-widest text-xs font-bold mb-4">
                    Coordonnees
                  </h3>
                  <ul className="space-y-4 text-sm">
                    <li>
                      <span className="block text-vea-text-dim text-[11px] uppercase tracking-wider mb-1 font-medium">
                        Telephone
                      </span>
                      <a href="tel:+33670364414" className="text-vea-text hover:text-vea-accent transition-colors font-medium">
                        06 70 36 44 14
                      </a>
                    </li>
                    <li>
                      <span className="block text-vea-text-dim text-[11px] uppercase tracking-wider mb-1 font-medium">
                        Email
                      </span>
                      <a href="mailto:contact@velito.fr" className="text-vea-text hover:text-vea-accent transition-colors font-medium break-all">
                        contact@velito.fr
                      </a>
                    </li>
                    <li>
                      <span className="block text-vea-text-dim text-[11px] uppercase tracking-wider mb-1 font-medium">
                        Localisation
                      </span>
                      <span className="text-vea-text font-medium">
                        Etouvie, Amiens
                      </span>
                      <span className="block text-vea-text-dim text-xs mt-0.5">
                        Secteur Ouest
                      </span>
                    </li>
                    <li className="pt-3 border-t border-vea-border">
                      <span className="block text-vea-text-dim text-[11px] uppercase tracking-wider mb-1 font-medium">
                        Association loi 1901
                      </span>
                      <span className="text-vea-text-dim text-xs font-mono">
                        RNA W802018363
                      </span>
                    </li>
                  </ul>
                </div>
              </ScrollReveal>

              <ScrollReveal delay={0.2}>
                <div className="panel-accent">
                  <h3 className="text-vea-accent uppercase tracking-widest text-xs font-bold mb-4">
                    Reseaux sociaux
                  </h3>
                  <ul className="space-y-3">
                    {SOCIALS.map((s) => (
                      <li key={s.name}>
                        <a
                          href={s.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-between text-sm text-vea-text-muted hover:text-vea-accent transition-colors group"
                        >
                          <span className="font-medium">{s.name}</span>
                          <span className="text-xs text-vea-text-dim group-hover:text-vea-accent transition-colors">
                            {s.handle}
                          </span>
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              </ScrollReveal>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
