/**
 * Page Inscription VEA — Flux en 3 étapes
 *
 * 👉 ÉTAPE 1 (Identification) : "Tu es déjà venu ?"
 *    - Prénom + Téléphone → appelle /api/participants/check
 *    - Si trouvé → pré-remplit le formulaire
 *    - Lien "Première fois ?" pour skip directement à l'étape 2
 *
 * 👉 ÉTAPE 2 (Formulaire) : Tous les champs + événement (depuis l'API)
 *    - Appelle /api/participants/register au submit
 *
 * 👉 ÉTAPE 3 (Confirmation) : Message de succès personnalisé
 *
 * "use client" car on utilise useState, useEffect, fetch
 */
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

// 👉 Les options des <select> — modifiable facilement
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

// 👉 Type pour un événement retourné par l'API
interface Evenement {
  id: string;
  titre: string;
  date: string;
  lieu: string;
}

// 👉 Type du formulaire complet
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

export default function InscriptionPage() {
  // 👉 step contrôle quelle étape est affichée (1, 2, ou 3)
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // 👉 Champs de l'étape 1 (identification)
  const [checkPrenom, setCheckPrenom] = useState("");
  const [checkTel, setCheckTel] = useState("");

  // 👉 Formulaire complet étape 2
  const [form, setForm] = useState<FormData>(INITIAL_FORM);

  // 👉 Événements actifs chargés depuis l'API
  const [evenements, setEvenements] = useState<Evenement[]>([]);

  // 👉 États UI : chargement, erreurs, nom événement pour la confirmation
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [confirmedEvent, setConfirmedEvent] = useState("");

  // 👉 Au montage du composant, on charge les événements actifs
  useEffect(() => {
    fetch("/api/evenements")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setEvenements(data);
      })
      .catch(() => {
        /* pas bloquant si l'API est down */
      });
  }, []);

  // ===============================
  // ÉTAPE 1 — Vérification
  // ===============================
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
        body: JSON.stringify({
          prenom: checkPrenom,
          telephone: checkTel,
        }),
      });
      const data = await res.json();

      if (data.exists && data.participant) {
        // 👉 Participant trouvé → on pré-remplit le formulaire
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
        // 👉 Pas trouvé → on garde prénom et téléphone
        setForm({
          ...INITIAL_FORM,
          prenom: checkPrenom,
          telephone: checkTel,
        });
      }

      setStep(2);
    } catch {
      setError("Erreur de connexion au serveur.");
    } finally {
      setLoading(false);
    }
  }

  // 👉 "Première fois ?" → skip la vérification
  function handleFirstTime() {
    setForm(INITIAL_FORM);
    setStep(2);
  }

  // ===============================
  // ÉTAPE 2 — Inscription
  // ===============================
  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    // Validation front basique
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

      // 👉 Succès → on trouve le nom de l'événement pour l'afficher
      if (form.evenementId) {
        const evt = evenements.find((ev) => ev.id === form.evenementId);
        setConfirmedEvent(evt?.titre || "l'événement");
      }

      setStep(3);
    } catch {
      setError("Erreur de connexion au serveur.");
    } finally {
      setLoading(false);
    }
  }

  // 👉 Mise à jour d'un champ du formulaire (pattern générique)
  function updateField(field: keyof FormData, value: string | boolean) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  // ===============================
  // RENDU
  // ===============================
  return (
    <>
      <section className="pt-20 pb-12 px-4 bg-gradient-to-b from-vea-dark to-vea-navy">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl sm:text-5xl font-black text-gradient mb-4">
            Inscription
          </h1>
          <p className="text-lg text-vea-text-muted max-w-2xl mx-auto">
            {step === 1 && "Vérifie si tu es déjà dans notre base."}
            {step === 2 && "Remplis le formulaire pour t'inscrire."}
            {step === 3 && "Tu es inscrit !"}
          </p>
        </div>
      </section>

      <section className="py-16 px-4">
        <div className="max-w-lg mx-auto">
          {/* ===== ERREUR ===== */}
          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-sm text-red-400">
              {error}
            </div>
          )}

          {/* ===== ÉTAPE 1 — Identification ===== */}
          {step === 1 && (
            <div className="card-glow p-8">
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
                    className="w-full bg-vea-navy border border-vea-border rounded-lg px-4 py-3 text-sm text-vea-white placeholder:text-vea-text-dim focus:outline-none focus:border-vea-accent"
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
                    className="w-full bg-vea-navy border border-vea-border rounded-lg px-4 py-3 text-sm text-vea-white placeholder:text-vea-text-dim focus:outline-none focus:border-vea-accent"
                    placeholder="06 XX XX XX XX"
                  />
                </div>

                <button
                  type="button"
                  onClick={handleCheck}
                  disabled={loading}
                  className="w-full bg-vea-accent hover:bg-vea-accent-hover disabled:opacity-50 text-white font-semibold py-3 rounded-lg transition-colors text-sm"
                >
                  {loading ? "Vérification..." : "Vérifier"}
                </button>
              </div>

              <div className="mt-6 text-center">
                <button
                  type="button"
                  onClick={handleFirstTime}
                  className="text-sm text-vea-accent hover:underline"
                >
                  Première fois ? Inscris-toi directement
                </button>
              </div>
            </div>
          )}

          {/* ===== ÉTAPE 2 — Formulaire complet ===== */}
          {step === 2 && (
            <form
              onSubmit={handleRegister}
              className="card-glow p-8"
            >
              <h2 className="text-xl font-bold text-vea-white mb-6">
                Formulaire d&apos;inscription
              </h2>

              <div className="space-y-4">
                {/* Prénom */}
                <div>
                  <label className="block text-xs font-semibold text-vea-text-muted uppercase tracking-wider mb-1.5">
                    Prénom *
                  </label>
                  <input
                    type="text"
                    required
                    value={form.prenom}
                    onChange={(e) => updateField("prenom", e.target.value)}
                    className="w-full bg-vea-navy border border-vea-border rounded-lg px-4 py-3 text-sm text-vea-white focus:outline-none focus:border-vea-accent"
                  />
                </div>

                {/* Nom */}
                <div>
                  <label className="block text-xs font-semibold text-vea-text-muted uppercase tracking-wider mb-1.5">
                    Nom *
                  </label>
                  <input
                    type="text"
                    required
                    value={form.nom}
                    onChange={(e) => updateField("nom", e.target.value)}
                    className="w-full bg-vea-navy border border-vea-border rounded-lg px-4 py-3 text-sm text-vea-white focus:outline-none focus:border-vea-accent"
                  />
                </div>

                {/* Sexe */}
                <div>
                  <label className="block text-xs font-semibold text-vea-text-muted uppercase tracking-wider mb-1.5">
                    Sexe *
                  </label>
                  <select
                    required
                    value={form.sexe}
                    onChange={(e) => updateField("sexe", e.target.value)}
                    className="w-full bg-vea-navy border border-vea-border rounded-lg px-4 py-3 text-sm text-vea-white focus:outline-none focus:border-vea-accent"
                  >
                    <option value="">Choisir...</option>
                    {SEXES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Date de naissance */}
                <div>
                  <label className="block text-xs font-semibold text-vea-text-muted uppercase tracking-wider mb-1.5">
                    Date de naissance *
                  </label>
                  <input
                    type="date"
                    required
                    value={form.dateNaissance}
                    onChange={(e) =>
                      updateField("dateNaissance", e.target.value)
                    }
                    className="w-full bg-vea-navy border border-vea-border rounded-lg px-4 py-3 text-sm text-vea-white focus:outline-none focus:border-vea-accent"
                  />
                </div>

                {/* Téléphone */}
                <div>
                  <label className="block text-xs font-semibold text-vea-text-muted uppercase tracking-wider mb-1.5">
                    Téléphone *
                  </label>
                  <input
                    type="tel"
                    required
                    value={form.telephone}
                    onChange={(e) => updateField("telephone", e.target.value)}
                    className="w-full bg-vea-navy border border-vea-border rounded-lg px-4 py-3 text-sm text-vea-white focus:outline-none focus:border-vea-accent"
                  />
                </div>

                {/* Jeu préféré */}
                <div>
                  <label className="block text-xs font-semibold text-vea-text-muted uppercase tracking-wider mb-1.5">
                    Jeu préféré
                  </label>
                  <select
                    value={form.jeuPrefere}
                    onChange={(e) => updateField("jeuPrefere", e.target.value)}
                    className="w-full bg-vea-navy border border-vea-border rounded-lg px-4 py-3 text-sm text-vea-white focus:outline-none focus:border-vea-accent"
                  >
                    <option value="">Aucun / Pas de préférence</option>
                    {JEUX.map((j) => (
                      <option key={j} value={j}>
                        {j}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Événement */}
                <div>
                  <label className="block text-xs font-semibold text-vea-text-muted uppercase tracking-wider mb-1.5">
                    Événement
                  </label>
                  <select
                    value={form.evenementId}
                    onChange={(e) => updateField("evenementId", e.target.value)}
                    className="w-full bg-vea-navy border border-vea-border rounded-lg px-4 py-3 text-sm text-vea-white focus:outline-none focus:border-vea-accent"
                  >
                    <option value="">
                      Inscription générale (pas d&apos;événement)
                    </option>
                    {evenements.map((evt) => (
                      <option key={evt.id} value={evt.id}>
                        {evt.titre} —{" "}
                        {new Date(evt.date).toLocaleDateString("fr-FR")}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Consent */}
                <label className="flex items-start gap-3 pt-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.accepteContact}
                    onChange={(e) =>
                      updateField("accepteContact", e.target.checked)
                    }
                    className="mt-0.5 w-4 h-4 rounded border-vea-border bg-vea-navy accent-vea-accent"
                  />
                  <span className="text-xs text-vea-text-muted leading-relaxed">
                    J&apos;accepte d&apos;être recontacté(e) par VEA pour les
                    prochains événements.
                  </span>
                </label>

                {/* Submit */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-vea-accent hover:bg-vea-accent-hover disabled:opacity-50 text-white font-semibold py-3 rounded-lg transition-colors text-sm mt-4"
                >
                  {loading ? "Inscription en cours..." : "Je m'inscris !"}
                </button>
              </div>

              {/* Retour étape 1 */}
              <div className="mt-4 text-center">
                <button
                  type="button"
                  onClick={() => {
                    setStep(1);
                    setError("");
                  }}
                  className="text-xs text-vea-text-dim hover:text-vea-text-muted"
                >
                  ← Retour
                </button>
              </div>
            </form>
          )}

          {/* ===== ÉTAPE 3 — Confirmation ===== */}
          {step === 3 && (
            <div className="card-glow p-10 text-center">
              <div className="w-16 h-16 bg-vea-accent/20 rounded-full mx-auto mb-6 flex items-center justify-center">
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
                className="inline-block bg-vea-accent hover:bg-vea-accent-hover text-white font-semibold px-8 py-3 rounded-lg transition-colors text-sm"
              >
                Retour à l&apos;accueil
              </Link>
            </div>
          )}

          {/* ===== RGPD ===== */}
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
