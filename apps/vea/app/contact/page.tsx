/**
 * Page Contact VEA
 *
 * 👉 Structure :
 * 1. Hero — titre + sous-titre
 * 2. Formulaire (Nom, Email, Sujet, Message) — côté gauche
 * 3. Infos de contact — côté droit
 *
 * 👉 C'est un Client Component ("use client") parce que le formulaire
 * utilise des event handlers (onSubmit) et du state.
 * Pas de backend pour l'instant — le submit affiche juste une alerte.
 *
 * 👉 Erreur fréquente débutant :
 * En Next.js App Router, un <form> avec onSubmit DOIT être dans un
 * Client Component. Si tu mets "use client" seulement sur le formulaire,
 * tu peux garder le reste de la page en Server Component.
 * Ici on met tout le fichier en "use client" pour simplifier.
 */
"use client";

import { useState } from "react";

// 👉 Type pour les sujets du select — évite les fautes de frappe
type SubjectOption = "adhesion" | "partenariat" | "evenement" | "autre";

interface ContactFormData {
  name: string;
  email: string;
  subject: SubjectOption;
  message: string;
}

export default function ContactPage() {
  // 👉 State du formulaire — un objet avec tous les champs
  const [form, setForm] = useState<ContactFormData>({
    name: "",
    email: "",
    subject: "adhesion",
    message: "",
  });

  const [submitted, setSubmitted] = useState<boolean>(false);

  // 👉 Fonction générique pour mettre à jour n'importe quel champ
  // Utilise le "name" de l'input HTML pour savoir quel champ modifier
  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); // 👉 Empêche le rechargement de la page
    // TODO: Connecter à un backend (API Route Next.js ou Supabase)
    setSubmitted(true);
  }

  return (
    <>
      {/* ======= HERO ======= */}
      <section className="pt-20 pb-12 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl sm:text-5xl font-black text-vea-white mb-4">
            Contact
          </h1>
          <p className="text-lg text-vea-white/50 max-w-2xl mx-auto">
            Une question, un projet, une envie de rejoindre l&apos;aventure ?
          </p>
        </div>
      </section>

      {/* ======= CONTENU PRINCIPAL ======= */}
      <section className="py-12 px-4">
        <div className="max-w-5xl mx-auto">
          {/* 👉 Grid 1 col mobile → 2 cols desktop (form + infos) */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-10">

            {/* ======= FORMULAIRE (3/5 de largeur) ======= */}
            <div className="lg:col-span-3">
              {submitted ? (
                // 👉 Message de succès après envoi
                <div className="bg-vea-gray border border-vea-red/20 rounded-xl p-8 text-center">
                  <h2 className="text-xl font-bold text-vea-red mb-3">
                    Message envoyé !
                  </h2>
                  <p className="text-vea-white/60">
                    Merci pour votre message. Nous vous répondrons dans les plus brefs délais.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-5">
                  {/* 👉 Champ Nom */}
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-vea-white/70 mb-1.5">
                      Nom complet
                    </label>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      value={form.name}
                      onChange={handleChange}
                      required
                      className="w-full bg-vea-gray border border-vea-gray-light/30 rounded-lg px-4 py-3 text-vea-white text-sm placeholder-vea-white/20 focus:outline-none focus:border-vea-red/50 transition-colors"
                      placeholder="Votre nom"
                    />
                  </div>

                  {/* 👉 Champ Email */}
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-vea-white/70 mb-1.5">
                      Email
                    </label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      value={form.email}
                      onChange={handleChange}
                      required
                      className="w-full bg-vea-gray border border-vea-gray-light/30 rounded-lg px-4 py-3 text-vea-white text-sm placeholder-vea-white/20 focus:outline-none focus:border-vea-red/50 transition-colors"
                      placeholder="votre@email.com"
                    />
                  </div>

                  {/* 👉 Select Sujet */}
                  <div>
                    <label htmlFor="subject" className="block text-sm font-medium text-vea-white/70 mb-1.5">
                      Sujet
                    </label>
                    <select
                      id="subject"
                      name="subject"
                      value={form.subject}
                      onChange={handleChange}
                      className="w-full bg-vea-gray border border-vea-gray-light/30 rounded-lg px-4 py-3 text-vea-white text-sm focus:outline-none focus:border-vea-red/50 transition-colors"
                    >
                      <option value="adhesion">Adhésion</option>
                      <option value="partenariat">Partenariat</option>
                      <option value="evenement">Événement</option>
                      <option value="autre">Autre</option>
                    </select>
                  </div>

                  {/* 👉 Textarea Message */}
                  <div>
                    <label htmlFor="message" className="block text-sm font-medium text-vea-white/70 mb-1.5">
                      Message
                    </label>
                    <textarea
                      id="message"
                      name="message"
                      value={form.message}
                      onChange={handleChange}
                      required
                      rows={6}
                      className="w-full bg-vea-gray border border-vea-gray-light/30 rounded-lg px-4 py-3 text-vea-white text-sm placeholder-vea-white/20 focus:outline-none focus:border-vea-red/50 transition-colors resize-none"
                      placeholder="Votre message..."
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full sm:w-auto bg-vea-red hover:bg-vea-red/90 text-white font-semibold px-8 py-3.5 rounded-lg transition-colors text-sm"
                  >
                    Envoyer le message
                  </button>
                </form>
              )}
            </div>

            {/* ======= INFOS DE CONTACT (2/5 de largeur) ======= */}
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-vea-gray border border-vea-gray-light/20 rounded-xl p-6">
                <h3 className="text-sm font-semibold text-vea-white uppercase tracking-wider mb-4">
                  Coordonnées
                </h3>
                <ul className="space-y-4 text-sm">
                  <li>
                    <span className="block text-vea-white/40 text-xs uppercase tracking-wider mb-1">Téléphone</span>
                    <a href="tel:+33670364414" className="text-vea-white hover:text-vea-red transition-colors">
                      06 70 36 44 14
                    </a>
                  </li>
                  <li>
                    <span className="block text-vea-white/40 text-xs uppercase tracking-wider mb-1">Email</span>
                    <a href="mailto:Vea@velitoesport.com" className="text-vea-white hover:text-vea-red transition-colors">
                      Vea@velitoesport.com
                    </a>
                  </li>
                  <li>
                    <span className="block text-vea-white/40 text-xs uppercase tracking-wider mb-1">Site web</span>
                    <a
                      href="https://www.velitoesport.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-vea-white hover:text-vea-red transition-colors"
                    >
                      www.velitoesport.com
                    </a>
                  </li>
                </ul>
              </div>

              <div className="bg-vea-gray border border-vea-gray-light/20 rounded-xl p-6">
                <h3 className="text-sm font-semibold text-vea-white uppercase tracking-wider mb-3">
                  Localisation
                </h3>
                <p className="text-sm text-vea-white/50">
                  Amiens, Hauts-de-France
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
