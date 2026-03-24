/**
 * Page Contact VEA
 * Formulaire (nom, email, tél, sujet, message) + infos contact + réseaux
 *
 * "use client" car formulaire avec state.
 */
"use client";

import { useState } from "react";

type SubjectOption = "adhesion" | "partenariat" | "evenement" | "autre";

interface ContactForm {
  name: string;
  email: string;
  phone: string;
  subject: SubjectOption;
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
    name: "",
    email: "",
    phone: "",
    subject: "adhesion",
    message: "",
  });
  const [submitted, setSubmitted] = useState(false);

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitted(true);
  }

  // Classes communes pour les inputs
  const inputClass =
    "w-full bg-vea-card border border-vea-border rounded-lg px-4 py-3 text-vea-white text-sm placeholder-vea-text-dim focus:outline-none focus:border-vea-accent/50 transition-colors";

  return (
    <>
      {/* ===== HERO ===== */}
      <section className="pt-20 pb-12 px-4 bg-gradient-to-b from-vea-dark to-vea-navy">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl sm:text-5xl font-black text-gradient mb-4">
            Contact
          </h1>
          <p className="text-lg text-vea-text-muted max-w-2xl mx-auto">
            Une question, un projet, une envie de rejoindre l&apos;aventure ?
          </p>
        </div>
      </section>

      {/* ===== CONTENU ===== */}
      <section className="py-12 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-10">

            {/* ===== FORMULAIRE (3/5) ===== */}
            <div className="lg:col-span-3">
              {submitted ? (
                <div className="bg-vea-card border border-vea-accent/20 rounded-xl p-8 text-center">
                  <h2 className="text-xl font-bold text-vea-accent mb-3">
                    Message envoyé !
                  </h2>
                  <p className="text-vea-text-muted">
                    Merci, nous vous répondrons rapidement.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-vea-text-muted mb-1.5">
                      Nom complet
                    </label>
                    <input type="text" id="name" name="name" value={form.name} onChange={handleChange} required className={inputClass} placeholder="Votre nom" />
                  </div>

                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-vea-text-muted mb-1.5">
                      Email
                    </label>
                    <input type="email" id="email" name="email" value={form.email} onChange={handleChange} required className={inputClass} placeholder="votre@email.com" />
                  </div>

                  <div>
                    <label htmlFor="phone" className="block text-sm font-medium text-vea-text-muted mb-1.5">
                      Téléphone
                    </label>
                    <input type="tel" id="phone" name="phone" value={form.phone} onChange={handleChange} className={inputClass} placeholder="06 00 00 00 00" />
                  </div>

                  <div>
                    <label htmlFor="subject" className="block text-sm font-medium text-vea-text-muted mb-1.5">
                      Sujet
                    </label>
                    <select id="subject" name="subject" value={form.subject} onChange={handleChange} className={inputClass}>
                      <option value="adhesion">Adhésion</option>
                      <option value="partenariat">Partenariat</option>
                      <option value="evenement">Événement</option>
                      <option value="autre">Autre</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="message" className="block text-sm font-medium text-vea-text-muted mb-1.5">
                      Message
                    </label>
                    <textarea id="message" name="message" value={form.message} onChange={handleChange} required rows={6} className={`${inputClass} resize-none`} placeholder="Votre message..." />
                  </div>

                  <button type="submit" className="w-full sm:w-auto bg-vea-accent hover:bg-vea-accent-hover text-white font-semibold px-8 py-3.5 rounded-lg transition-colors text-sm">
                    Envoyer
                  </button>
                </form>
              )}
            </div>

            {/* ===== INFOS (2/5) ===== */}
            <div className="lg:col-span-2 space-y-6">
              <div className="card-glow p-6">
                <h3 className="text-sm font-semibold text-vea-white uppercase tracking-wider mb-4">
                  Coordonnées
                </h3>
                <ul className="space-y-4 text-sm">
                  <li>
                    <span className="block text-vea-text-dim text-xs uppercase tracking-wider mb-1">Téléphone</span>
                    <a href="tel:+33670364414" className="text-vea-white hover:text-vea-accent transition-colors">06 70 36 44 14</a>
                  </li>
                  <li>
                    <span className="block text-vea-text-dim text-xs uppercase tracking-wider mb-1">Email</span>
                    <a href="mailto:Vea@velitoesport.com" className="text-vea-white hover:text-vea-accent transition-colors">Vea@velitoesport.com</a>
                  </li>
                  <li>
                    <span className="block text-vea-text-dim text-xs uppercase tracking-wider mb-1">Site web</span>
                    <a href="https://www.velitoesport.com" target="_blank" rel="noopener noreferrer" className="text-vea-white hover:text-vea-accent transition-colors">www.velitoesport.com</a>
                  </li>
                </ul>
              </div>

              {/* Réseaux */}
              <div className="card-glow p-6">
                <h3 className="text-sm font-semibold text-vea-white uppercase tracking-wider mb-4">
                  Réseaux sociaux
                </h3>
                <ul className="space-y-3">
                  {SOCIALS.map((s) => (
                    <li key={s.name}>
                      <a href={s.href} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between text-sm text-vea-text-muted hover:text-vea-accent transition-colors">
                        <span>{s.name}</span>
                        <span className="text-xs">{s.handle}</span>
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
