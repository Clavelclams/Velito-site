/**
 * Page Inscription VEA — REFONTE VIOLET + ROUGE + MOTION
 *
 * Flow :
 *   'check'   → Étape 1 : "Tu es déjà venu ?" + "Première fois ?"
 *   'form'    → Étape 2 : Formulaire complet
 *   'success' → Étape 3 : Confirmation
 *
 * "use client" car on utilise useState, useEffect, fetch
 */
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import ScrollReveal from "@/components/ScrollReveal";

const SEXES = ["Homme", "Femme", "Non-binaire", "Préfère ne pas préciser"];
const JEUX = [
  "EA FC",
  "Clash Royale",
  "Street Fighter 6",
  "Valorant",
  "R6 Siege",
  "Fortnite",
  "Mario Kart",
  "Autre",
];

interface Evenement {
  id: string;
  titre: string;
  date: string;
  lieu: string;
}

interface FormData {
  prenom: string;
  nom: string;
  sexe: string;
  dateNaissance: string;
  telephone: string;
  jeuPrefere: string;
  evenementId: string;
  accepteContact: boolean;
}

const INITIAL_FORM: FormData = {
  prenom: "",
  nom: "",
  sexe: "",
  dateNaissance: "",
  telephone: "",
  jeuPrefere: "",
  evenementId: "",
  accepteContact: false,
};

type Step = "check" | "form" | "success";

export default function InscriptionPage() {
  const [step, setStep] = useState<Step>("check");
  const [checkPrenom, setCheckPrenom] = useState("");
  const [checkTel, setCheckTel] = useState("");
  const [form, setForm] = useState<FormData>(INITIAL_FORM);
  const [evenements, setEvenements] = useState<Evenement[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [confirmedEvent, setConfirmedEvent] = useState("");

  useEffect(() => {
    fetch("/api/evenements")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setEvenements(data);
      })
      .catch(() => {});
  }, []);

  // Vérification — "Tu es déjà venu ?"
  async function handleCheck() {
    setError("");
    if (!checkPrenom.trim() || !checkTel.trim()) {
      setError("Remplis les deux champs.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/participants/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prenom: checkPrenom, telephone: checkTel }),
      });
      const data = await res.json();

      if (data.exists && data.participant) {
        const p = data.participant;
        setForm({
          prenom: p.prenom || "",
          nom: p.nom || "",
          sexe: p.sexe || "",
          dateNaissance: p.dateNaissance
            ? new Date(p.dateNaissance).toISOString().split("T")[0] ?? ""
            : "",
          telephone: p.telephone || "",
          jeuPrefere: p.jeuPrefere || "",
          evenementId: "",
          accepteContact: p.accepteContact || false,
        });
      } else {
        setForm({ ...INITIAL_FORM, prenom: checkPrenom, telephone: checkTel });
      }
      setStep("form");
    } catch {
      setError("Erreur de connexion au serveur.");
    } finally {
      setLoading(false);
    }
  }

  // "Première fois ?" → directement au formulaire vide
  function handleFirstTime() {
    setForm(INITIAL_FORM);
    setStep("form");
  }

  // Inscription
  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (
      !form.prenom.trim() ||
      !form.nom.trim() ||
      !form.sexe ||
      !form.dateNaissance ||
      !form.telephone.trim()
    ) {
      setError("Remplis tous les champs obligatoires.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/participants/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Erreur lors de l'inscription.");
        return;
      }

      if (form.evenementId) {
        const evt = evenements.find((ev) => ev.id === form.evenementId);
        setConfirmedEvent(evt?.titre || "l'événement");
      }
      setStep("success");
    } catch {
      setError("Erreur de connexion au serveur.");
    } finally {
      setLoading(false);
    }
  }

  function updateField(field: keyof FormData, value: string | boolean) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  const inputClass =
    "w-full bg-vea-bg border border-vea-border rounded-lg px-4 py-3 text-sm text-vea-white placeholder:text-vea-text-dim focus:outline-none focus:border-vea-purple/50 transition-colors";

  return (
    <>
      <section className="pt-24 pb-12 px-4 hero-bg">
        <div className="max-w-4xl mx-auto text-center">
          <ScrollReveal>
            <h1 className="text-4xl sm:text-5xl font-black text-gradient-vea mb-4">
              Inscription
            </h1>
            <p className="text-lg text-vea-text-muted max-w-2xl mx-auto">
              {step === "check" && "Vérifie si tu es déjà dans notre base."}
              {step === "form" && "Remplis le formulaire pour t'inscrire."}
              {step === "success" && "Tu es inscrit !"}
            </p>
          </ScrollReveal>
        </div>
      </section>

      <section className="py-16 px-4">
        <div className="max-w-lg mx-auto">
          {/* ERREUR */}
          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-sm text-red-400">
              {error}
            </div>
          )}

          {/* ÉTAPE 1 — Identification */}
          {step === "check" && (
            <ScrollReveal>
              <div className="card-glow p-8">
                {/* Option A : Tu es déjà venu ? */}
                <h2 className="text-xl font-bold text-vea-white mb-2">
                  Tu es déjà venu ?
                </h2>
                <p className="text-sm text-vea-text-muted mb-6">
                  Entre ton prénom et ton numéro pour qu&apos;on te retrouve.
                </p>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-vea-text-muted uppercase tracking-wider mb-1.5">
                      Prénom
                    </label>
                    <input
                      type="text"
                      value={checkPrenom}
                      onChange={(e) => setCheckPrenom(e.target.value)}
                      className={inputClass}
                      placeholder="Ton prénom"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-vea-text-muted uppercase tracking-wider mb-1.5">
                      Téléphone
                    </label>
                    <input
                      type="tel"
                      value={checkTel}
                      onChange={(e) => setCheckTel(e.target.value)}
                      className={inputClass}
                      placeholder="06 XX XX XX XX"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={handleCheck}
                    disabled={loading}
                    className="w-full bg-vea-red hover:bg-vea-accent-hover disabled:opacity-50 text-white font-semibold py-3 rounded-lg transition-colors text-sm"
                  >
                    {loading ? "Vérification..." : "Vérifier"}
                  </button>
                </div>

                {/* Option B : Première fois ? */}
                <div className="mt-6 text-center">
                  <button
                    type="button"
                    onClick={handleFirstTime}
                    className="text-white underline hover:text-[#E63946] transition-colors text-sm"
                  >
                    Première fois ? Inscris-toi directement
                  </button>
                </div>
              </div>
            </ScrollReveal>
          )}

          {/* ÉTAPE 2 — Formulaire complet */}
          {step === "form" && (
            <ScrollReveal>
              <form onSubmit={handleRegister} className="card-glow p-8">
                <h2 className="text-xl font-bold text-vea-white mb-6">
                  Formulaire d&apos;inscription
                </h2>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-vea-text-muted uppercase tracking-wider mb-1.5">
                      Prénom *
                    </label>
                    <input type="text" required value={form.prenom} onChange={(e) => updateField("prenom", e.target.value)} className={inputClass} />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-vea-text-muted uppercase tracking-wider mb-1.5">
                      Nom *
                    </label>
                    <input type="text" required value={form.nom} onChange={(e) => updateField("nom", e.target.value)} className={inputClass} />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-vea-text-muted uppercase tracking-wider mb-1.5">
                      Sexe *
                    </label>
                    <select required value={form.sexe} onChange={(e) => updateField("sexe", e.target.value)} className={inputClass}>
                      <option value="">Choisir...</option>
                      {SEXES.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-vea-text-muted uppercase tracking-wider mb-1.5">
                      Date de naissance *
                    </label>
                    <input type="date" required value={form.dateNaissance} onChange={(e) => updateField("dateNaissance", e.target.value)} className={inputClass} />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-vea-text-muted uppercase tracking-wider mb-1.5">
                      Téléphone *
                    </label>
                    <input type="tel" required value={form.telephone} onChange={(e) => updateField("telephone", e.target.value)} className={inputClass} />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-vea-text-muted uppercase tracking-wider mb-1.5">
                      Jeu préféré
                    </label>
                    <select value={form.jeuPrefere} onChange={(e) => updateField("jeuPrefere", e.target.value)} className={inputClass}>
                      <option value="">Aucun / Pas de préférence</option>
                      {JEUX.map((j) => (
                        <option key={j} value={j}>{j}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-vea-text-muted uppercase tracking-wider mb-1.5">
                      Événement
                    </label>
                    <select value={form.evenementId} onChange={(e) => updateField("evenementId", e.target.value)} className={inputClass}>
                      <option value="">Inscription générale (pas d&apos;événement)</option>
                      {evenements.map((evt) => (
                        <option key={evt.id} value={evt.id}>
                          {evt.titre} — {new Date(evt.date).toLocaleDateString("fr-FR")}
                        </option>
                      ))}
                    </select>
                  </div>

                  <label className="flex items-start gap-3 pt-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.accepteContact}
                      onChange={(e) => updateField("accepteContact", e.target.checked)}
                      className="mt-0.5 w-4 h-4 rounded border-vea-border bg-vea-bg accent-vea-red"
                    />
                    <span className="text-xs text-vea-text-muted leading-relaxed">
                      J&apos;accepte d&apos;être recontacté(e) par VEA pour les prochains événements.
                    </span>
                  </label>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-vea-red hover:bg-vea-accent-hover disabled:opacity-50 text-white font-semibold py-3 rounded-lg transition-colors text-sm mt-4"
                  >
                    {loading ? "Inscription en cours..." : "Je m'inscris !"}
                  </button>
                </div>

                <div className="mt-4 text-center">
                  <button
                    type="button"
                    onClick={() => { setStep("check"); setError(""); }}
                    className="text-xs text-vea-text-dim hover:text-vea-text-muted"
                  >
                    ← Retour
                  </button>
                </div>
              </form>
            </ScrollReveal>
          )}

          {/* ÉTAPE 3 — Confirmation */}
          {step === "success" && (
            <ScrollReveal>
              <div className="card-glow p-10 text-center">
                <div className="w-16 h-16 bg-vea-red/20 rounded-full mx-auto mb-6 flex items-center justify-center animate-glow-red">
                  <span className="text-3xl">✅</span>
                </div>

                <h2 className="text-2xl font-bold text-vea-white mb-3">
                  C&apos;est bon {form.prenom} !
                </h2>

                <p className="text-vea-text-muted mb-8 leading-relaxed">
                  {confirmedEvent
                    ? `Tu es inscrit(e) à ${confirmedEvent}. On te voit bientôt !`
                    : "Ton inscription est enregistrée. On te contactera pour les prochains événements !"}
                </p>

                <Link
                  href="/"
                  className="inline-block bg-vea-red hover:bg-vea-accent-hover text-white font-semibold px-8 py-3 rounded-lg transition-colors text-sm"
                >
                  Retour à l&apos;accueil
                </Link>
              </div>
            </ScrollReveal>
          )}

          <p className="text-[10px] text-vea-text-dim text-center mt-8 max-w-sm mx-auto leading-relaxed">
            Tes données sont utilisées uniquement pour la gestion de
            l&apos;association VEA. Elles ne sont jamais transmises à des tiers.
            Tu peux demander leur suppression à tout moment via{" "}
            <Link href="/contact" className="underline">
              contact
            </Link>
            .
          </p>
        </div>
      </section>
    </>
  );
}
