/**
 * Page Inscription VEA — PAGE CLÉ
 * Formulaire inscription one-shot événement + lien HelloAsso adhésion.
 *
 * "use client" car formulaire avec state.
 */
"use client";

import { useState } from "react";

interface InscriptionForm {
  prenom: string;
  telephone: string;
  quartier: string;
  jeu: string;
  evenement: string;
  consent: boolean;
}

const QUARTIERS = [
  "Centre-ville",
  "Saint-Leu",
  "Étouvie",
  "Amiens Nord",
  "Autre",
  "Hors Amiens",
];

const JEUX = [
  "EA FC",
  "Clash Royale",
  "Fortnite",
  "Valorant",
  "Autre",
];

const HELLOASSO_URL =
  "https://www.helloasso.com/associations/velito-esport-amiens/adhesions/adhesion-2026";

export default function InscriptionPage() {
  const [form, setForm] = useState<InscriptionForm>({
    prenom: "",
    telephone: "",
    quartier: "",
    jeu: "",
    evenement: "",
    consent: false,
  });
  const [submitted, setSubmitted] = useState(false);

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) {
    const target = e.target;
    if (target.type === "checkbox" && target instanceof HTMLInputElement) {
      setForm({ ...form, [target.name]: target.checked });
    } else {
      setForm({ ...form, [target.name]: target.value });
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    // TODO: envoyer vers API / Supabase
    setSubmitted(true);
  }

  const inputClass =
    "w-full bg-vea-card border border-vea-border rounded-lg px-4 py-3 text-vea-white text-sm placeholder-vea-text-dim focus:outline-none focus:border-vea-accent/50 transition-colors";

  return (
    <>
      {/* ===== HERO ===== */}
      <section className="pt-20 pb-12 px-4 bg-gradient-to-b from-vea-dark to-vea-navy">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl sm:text-5xl font-black text-vea-white mb-4">
            Participe à nos événements
          </h1>
          <p className="text-lg text-vea-text-muted max-w-2xl mx-auto">
            Inscris-toi en 30 secondes, rejoins la communauté VEA.
          </p>
        </div>
      </section>

      {/* ===== FORMULAIRE ===== */}
      <section className="py-12 px-4">
        <div className="max-w-lg mx-auto">
          {submitted ? (
            <div className="bg-vea-card border border-vea-accent/20 rounded-xl p-8 text-center">
              <h2 className="text-xl font-bold text-vea-accent mb-3">
                Inscription envoyée !
              </h2>
              <p className="text-vea-text-muted">
                Merci ! On te recontacte très vite pour confirmer ta place.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Prénom */}
              <div>
                <label htmlFor="prenom" className="block text-sm font-medium text-vea-text-muted mb-1.5">
                  Prénom *
                </label>
                <input type="text" id="prenom" name="prenom" value={form.prenom} onChange={handleChange} required className={inputClass} placeholder="Ton prénom" />
              </div>

              {/* Téléphone */}
              <div>
                <label htmlFor="telephone" className="block text-sm font-medium text-vea-text-muted mb-1.5">
                  Téléphone * <span className="text-vea-text-dim text-xs">(pour te recontacter)</span>
                </label>
                <input type="tel" id="telephone" name="telephone" value={form.telephone} onChange={handleChange} required className={inputClass} placeholder="06 00 00 00 00" />
              </div>

              {/* Quartier */}
              <div>
                <label htmlFor="quartier" className="block text-sm font-medium text-vea-text-muted mb-1.5">
                  Quartier
                </label>
                <select id="quartier" name="quartier" value={form.quartier} onChange={handleChange} className={inputClass}>
                  <option value="">Sélectionner...</option>
                  {QUARTIERS.map((q) => (
                    <option key={q} value={q}>{q}</option>
                  ))}
                </select>
              </div>

              {/* Jeu préféré */}
              <div>
                <label htmlFor="jeu" className="block text-sm font-medium text-vea-text-muted mb-1.5">
                  Jeu préféré
                </label>
                <select id="jeu" name="jeu" value={form.jeu} onChange={handleChange} className={inputClass}>
                  <option value="">Sélectionner...</option>
                  {JEUX.map((j) => (
                    <option key={j} value={j}>{j}</option>
                  ))}
                </select>
              </div>

              {/* Événement */}
              <div>
                <label htmlFor="evenement" className="block text-sm font-medium text-vea-text-muted mb-1.5">
                  Événement
                </label>
                <input type="text" id="evenement" name="evenement" value={form.evenement} onChange={handleChange} className={inputClass} placeholder="Quel événement t'intéresse ?" />
              </div>

              {/* Consentement */}
              <div className="flex items-start gap-3 pt-2">
                <input
                  type="checkbox"
                  id="consent"
                  name="consent"
                  checked={form.consent}
                  onChange={handleChange}
                  required
                  className="mt-1 w-4 h-4 rounded border-vea-border bg-vea-card accent-vea-accent"
                />
                <label htmlFor="consent" className="text-sm text-vea-text-muted leading-snug">
                  J&apos;accepte d&apos;être recontacté par VEA pour les prochains événements
                </label>
              </div>

              <button type="submit" className="w-full bg-vea-accent hover:bg-vea-accent-hover text-white font-semibold px-8 py-3.5 rounded-lg transition-colors text-sm mt-2">
                Je m&apos;inscris
              </button>
            </form>
          )}

          {/* ===== SÉPARATEUR ===== */}
          <div className="flex items-center gap-4 my-10">
            <div className="flex-1 h-px bg-vea-border" />
            <span className="text-vea-text-dim text-sm font-medium">ou</span>
            <div className="flex-1 h-px bg-vea-border" />
          </div>

          {/* ===== ADHÉSION HELLOASSO ===== */}
          <div className="bg-vea-card border border-vea-border rounded-xl p-8 text-center">
            <h2 className="text-lg font-bold text-vea-white mb-3">
              Tu veux rejoindre VEA officiellement ?
            </h2>
            <p className="text-sm text-vea-text-muted mb-6">
              Deviens membre et accède à tous les avantages : événements exclusifs,
              maillot, votes en AG.
            </p>
            <a
              href={HELLOASSO_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block bg-vea-accent hover:bg-vea-accent-hover text-white font-semibold px-8 py-3.5 rounded-lg transition-colors text-sm"
            >
              Adhérer via HelloAsso
            </a>
          </div>

          {/* ===== NOTE RGPD ===== */}
          <p className="text-[11px] text-vea-text-dim text-center mt-8 leading-relaxed">
            Tes données sont utilisées uniquement par VEA pour la gestion des événements.
            Conformément au RGPD, tu peux demander leur suppression à tout moment.
          </p>
        </div>
      </section>
    </>
  );
}
