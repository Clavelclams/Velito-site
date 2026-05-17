/**
 * Page Inscription VEA — refonte DA claire (17/05/2026).
 *
 * Flow inchange (3 etapes) :
 *   'check'   → "Tu es deja venu ?" + "Premiere fois ?"
 *   'form'    → Formulaire complet (Prisma /api/participants/register)
 *   'success' → Confirmation
 *
 * Note : depend du backend Prisma pour la liste des evenements et l'inscription.
 * Si /api/evenements ne renvoie rien, le select event est vide mais l'inscription
 * generale reste possible.
 */
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import ScrollReveal from "@/components/ScrollReveal";

const SEXES = ["Homme", "Femme", "Non-binaire", "Prefere ne pas preciser"];
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

// Classes input partagees (DA claire)
const INPUT_CLASS =
  "w-full bg-white border border-vea-border rounded-lg px-4 py-3 text-sm text-vea-text placeholder:text-vea-text-dim focus:outline-none focus:border-vea-accent focus:ring-2 focus:ring-vea-accent/20 transition-colors";
const LABEL_CLASS =
  "block text-xs font-semibold text-vea-text-muted uppercase tracking-wider mb-1.5";

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

  function handleFirstTime() {
    setForm(INITIAL_FORM);
    setStep("form");
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!form.prenom.trim() || !form.nom.trim() || !form.sexe || !form.dateNaissance || !form.telephone.trim()) {
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
        setConfirmedEvent(evt?.titre || "l'evenement");
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

  return (
    <>
      {/* HERO */}
      <section className="hero-bg pt-28 pb-12 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <ScrollReveal>
            <span className="badge-red mb-4">Inscription</span>
            <h1 className="text-4xl sm:text-5xl font-black text-vea-text mb-4 mt-4">
              Rejoins <span className="text-vea-accent">VEA</span>
            </h1>
            <p className="text-base text-vea-text-muted max-w-2xl mx-auto">
              {step === "check" && "Verifie si tu es deja dans notre base."}
              {step === "form" && "Remplis le formulaire pour t'inscrire."}
              {step === "success" && "Tu es inscrit !"}
            </p>
          </ScrollReveal>
        </div>
      </section>

      <section className="py-16 px-4 bg-vea-bg">
        <div className="max-w-lg mx-auto">

          {/* Bandeau erreur */}
          {error && (
            <div className="mb-6 p-4 bg-vea-accent-soft border border-vea-accent/40 rounded-lg text-sm text-vea-accent-dim">
              {error}
            </div>
          )}

          {/* ETAPE 1 — Identification */}
          {step === "check" && (
            <ScrollReveal>
              <div className="card-clean p-8">
                <h2 className="text-xl font-bold text-vea-text mb-2">Tu es deja venu ?</h2>
                <p className="text-sm text-vea-text-muted mb-6">
                  Entre ton prenom et ton numero pour qu&apos;on te retrouve.
                </p>

                <div className="space-y-4">
                  <div>
                    <label className={LABEL_CLASS}>Prenom</label>
                    <input
                      type="text"
                      value={checkPrenom}
                      onChange={(e) => setCheckPrenom(e.target.value)}
                      className={INPUT_CLASS}
                      placeholder="Ton prenom"
                    />
                  </div>
                  <div>
                    <label className={LABEL_CLASS}>Telephone</label>
                    <input
                      type="tel"
                      value={checkTel}
                      onChange={(e) => setCheckTel(e.target.value)}
                      className={INPUT_CLASS}
                      placeholder="06 XX XX XX XX"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleCheck}
                    disabled={loading}
                    className="btn-primary w-full disabled:opacity-50"
                  >
                    {loading ? "Verification..." : "Verifier"}
                  </button>
                </div>

                <div className="mt-6 text-center border-t border-vea-border pt-6">
                  <button
                    type="button"
                    onClick={handleFirstTime}
                    className="text-sm text-vea-accent hover:underline font-semibold"
                  >
                    Premiere fois ? Inscris-toi directement →
                  </button>
                </div>
              </div>
            </ScrollReveal>
          )}

          {/* ETAPE 2 — Formulaire */}
          {step === "form" && (
            <ScrollReveal>
              <form onSubmit={handleRegister} className="card-clean p-8">
                <h2 className="text-xl font-bold text-vea-text mb-6">
                  Formulaire d&apos;inscription
                </h2>

                <div className="space-y-4">
                  <div>
                    <label className={LABEL_CLASS}>Prenom *</label>
                    <input type="text" required value={form.prenom}
                      onChange={(e) => updateField("prenom", e.target.value)} className={INPUT_CLASS} />
                  </div>
                  <div>
                    <label className={LABEL_CLASS}>Nom *</label>
                    <input type="text" required value={form.nom}
                      onChange={(e) => updateField("nom", e.target.value)} className={INPUT_CLASS} />
                  </div>
                  <div>
                    <label className={LABEL_CLASS}>Sexe *</label>
                    <select required value={form.sexe}
                      onChange={(e) => updateField("sexe", e.target.value)} className={INPUT_CLASS}>
                      <option value="">Choisir...</option>
                      {SEXES.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className={LABEL_CLASS}>Date de naissance *</label>
                    <input type="date" required value={form.dateNaissance}
                      onChange={(e) => updateField("dateNaissance", e.target.value)} className={INPUT_CLASS} />
                  </div>
                  <div>
                    <label className={LABEL_CLASS}>Telephone *</label>
                    <input type="tel" required value={form.telephone}
                      onChange={(e) => updateField("telephone", e.target.value)} className={INPUT_CLASS} />
                  </div>
                  <div>
                    <label className={LABEL_CLASS}>Jeu prefere</label>
                    <select value={form.jeuPrefere}
                      onChange={(e) => updateField("jeuPrefere", e.target.value)} className={INPUT_CLASS}>
                      <option value="">Aucun / Pas de preference</option>
                      {JEUX.map((j) => (
                        <option key={j} value={j}>{j}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className={LABEL_CLASS}>Evenement</label>
                    <select value={form.evenementId}
                      onChange={(e) => updateField("evenementId", e.target.value)} className={INPUT_CLASS}>
                      <option value="">Inscription generale (pas d&apos;evenement)</option>
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
                      className="mt-0.5 w-4 h-4 rounded border-vea-border accent-vea-accent"
                    />
                    <span className="text-xs text-vea-text-muted leading-relaxed">
                      J&apos;accepte d&apos;etre recontacte(e) par VEA pour les prochains evenements.
                    </span>
                  </label>

                  <button type="submit" disabled={loading} className="btn-primary w-full mt-2 disabled:opacity-50">
                    {loading ? "Inscription en cours..." : "Je m'inscris !"}
                  </button>
                </div>

                <div className="mt-4 text-center">
                  <button
                    type="button"
                    onClick={() => { setStep("check"); setError(""); }}
                    className="text-xs text-vea-text-dim hover:text-vea-accent transition-colors"
                  >
                    ← Retour
                  </button>
                </div>
              </form>
            </ScrollReveal>
          )}

          {/* ETAPE 3 — Confirmation */}
          {step === "success" && (
            <ScrollReveal>
              <div className="card-clean p-10 text-center bg-vea-accent-soft border-vea-accent/15">
                <div className="w-16 h-16 bg-white rounded-full mx-auto mb-6 flex items-center justify-center shadow-card-soft">
                  <span className="text-3xl">✅</span>
                </div>
                <h2 className="text-2xl font-bold text-vea-text mb-3">
                  C&apos;est bon {form.prenom} !
                </h2>
                <p className="text-vea-text-muted mb-8 leading-relaxed">
                  {confirmedEvent
                    ? `Tu es inscrit(e) a ${confirmedEvent}. On te voit bientot !`
                    : "Ton inscription est enregistree. On te contactera pour les prochains evenements !"}
                </p>
                <Link href="/" className="btn-primary">
                  Retour a l&apos;accueil
                </Link>
              </div>
            </ScrollReveal>
          )}

          {/* RGPD */}
          <p className="text-[10px] text-vea-text-dim text-center mt-8 max-w-sm mx-auto leading-relaxed">
            Tes donnees sont utilisees uniquement pour la gestion de l&apos;association VEA.
            Elles ne sont jamais transmises a des tiers. Tu peux demander leur suppression a tout
            moment via <Link href="/contact" className="text-vea-accent hover:underline">contact</Link>.
          </p>
        </div>
      </section>
    </>
  );
}
