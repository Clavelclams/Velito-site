/**
 * ContactForm — Formulaire de demande de contact / devis VENA.
 *
 * Champs minimaux : identité, service, message, RGPD.
 * Validation client (bouton désactivé tant que requis non remplis) +
 * validation serveur (cf actions.ts).
 *
 * Message succès affiché 10 secondes mini après submit OK.
 */
"use client";

import { useState, useEffect, useTransition, useRef } from "react";
import { submitContactAction } from "./actions";

const SERVICES = [
  { value: "developpement_web", label: "Développement web (site, app)" },
  { value: "production_video", label: "Production vidéo" },
  { value: "photo", label: "Photographie professionnelle" },
  { value: "location_materiel", label: "Location de matériel" },
  { value: "formation", label: "Formation / accompagnement" },
  { value: "conseil", label: "Conseil / stratégie digitale" },
  { value: "autre", label: "Autre — décrire ci-dessous" },
];

const DELAIS = [
  "Urgent (sous 2 semaines)",
  "Court terme (1-2 mois)",
  "Moyen terme (3-6 mois)",
  "Pas de deadline précise",
];

const SOURCES = [
  { value: "reseaux_sociaux", label: "Réseaux sociaux" },
  { value: "bouche_oreille", label: "Bouche à oreille" },
  { value: "recommandation", label: "Recommandation" },
  { value: "vea", label: "Par VEA / esport" },
  { value: "recherche_internet", label: "Recherche internet" },
  { value: "autre", label: "Autre" },
];

export default function ContactForm() {
  const [prenom, setPrenom] = useState("");
  const [nom, setNom] = useState("");
  const [email, setEmail] = useState("");
  const [telephone, setTelephone] = useState("");
  const [structure, setStructure] = useState("");
  const [fonction, setFonction] = useState("");
  const [serviceDemande, setServiceDemande] = useState("");
  const [budget, setBudget] = useState("");
  const [delai, setDelai] = useState("");
  const [message, setMessage] = useState("");
  const [source, setSource] = useState("");
  const [rgpd, setRgpd] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isPending, startTransition] = useTransition();
  const successTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (successTimerRef.current) clearTimeout(successTimerRef.current);
    };
  }, []);

  const isValid =
    prenom.trim().length > 0 &&
    nom.trim().length > 0 &&
    email.includes("@") &&
    serviceDemande.length > 0 &&
    message.trim().length >= 10 &&
    rgpd;

  function reset() {
    setPrenom("");
    setNom("");
    setEmail("");
    setTelephone("");
    setStructure("");
    setFonction("");
    setServiceDemande("");
    setBudget("");
    setDelai("");
    setMessage("");
    setSource("");
    setRgpd(false);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    startTransition(async () => {
      const result = await submitContactAction({
        prenom,
        nom,
        email,
        telephone,
        structure,
        fonction,
        service_demande: serviceDemande,
        budget_envisage: budget,
        delai,
        message,
        source_decouverte: source,
        rgpd_consent: rgpd,
      });

      if (!result.success) {
        setError(result.error ?? "Erreur");
        return;
      }
      setSuccess(true);
      reset();
      successTimerRef.current = setTimeout(() => setSuccess(false), 10000);
    });
  }

  const inputClass =
    "w-full bg-white border border-vena-border rounded-lg px-4 py-3 text-vena-text text-sm placeholder-vena-text-dim focus:outline-none focus:border-vena-kaki focus:ring-2 focus:ring-vena-kaki/15 transition-all";
  const labelClass =
    "block text-xs font-semibold text-vena-text-muted uppercase tracking-wider mb-1.5";
  const star = <span className="text-vena-kaki" aria-hidden="true"> *</span>;

  return (
    <form onSubmit={handleSubmit} className="card-vena p-6 sm:p-8 space-y-5" noValidate>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="prenom" className={labelClass}>
            Prénom{star}
          </label>
          <input
            type="text"
            id="prenom"
            value={prenom}
            onChange={(e) => setPrenom(e.target.value.slice(0, 100))}
            required
            aria-required="true"
            autoComplete="given-name"
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="nom" className={labelClass}>
            Nom{star}
          </label>
          <input
            type="text"
            id="nom"
            value={nom}
            onChange={(e) => setNom(e.target.value.slice(0, 100))}
            required
            aria-required="true"
            autoComplete="family-name"
            className={inputClass}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="email" className={labelClass}>
            Email{star}
          </label>
          <input
            type="email"
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value.slice(0, 200))}
            required
            aria-required="true"
            autoComplete="email"
            className={inputClass}
            placeholder="josue.clementin@exemple.fr"
          />
        </div>
        <div>
          <label htmlFor="telephone" className={labelClass}>
            Téléphone
          </label>
          <input
            type="tel"
            id="telephone"
            value={telephone}
            onChange={(e) => setTelephone(e.target.value.slice(0, 30))}
            autoComplete="tel"
            className={inputClass}
            placeholder="06 12 34 56 78"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="structure" className={labelClass}>
            Structure / entreprise
          </label>
          <input
            type="text"
            id="structure"
            value={structure}
            onChange={(e) => setStructure(e.target.value.slice(0, 200))}
            autoComplete="organization"
            className={inputClass}
            placeholder="Ex : Mairie d'Amiens, ACME SAS, particulier"
          />
        </div>
        <div>
          <label htmlFor="fonction" className={labelClass}>
            Fonction
          </label>
          <input
            type="text"
            id="fonction"
            value={fonction}
            onChange={(e) => setFonction(e.target.value.slice(0, 100))}
            autoComplete="organization-title"
            className={inputClass}
            placeholder="Ex : Responsable communication"
          />
        </div>
      </div>

      <div>
        <label htmlFor="service" className={labelClass}>
          Service souhaité{star}
        </label>
        <select
          id="service"
          value={serviceDemande}
          onChange={(e) => setServiceDemande(e.target.value)}
          required
          aria-required="true"
          className={inputClass}
        >
          <option value="">— Choisis un service —</option>
          {SERVICES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="budget" className={labelClass}>
            Budget envisagé
          </label>
          <input
            type="text"
            id="budget"
            value={budget}
            onChange={(e) => setBudget(e.target.value.slice(0, 200))}
            className={inputClass}
            placeholder="Ex : 1 500€, à discuter"
          />
        </div>
        <div>
          <label htmlFor="delai" className={labelClass}>
            Délai
          </label>
          <select
            id="delai"
            value={delai}
            onChange={(e) => setDelai(e.target.value)}
            className={inputClass}
          >
            <option value="">— Au choix —</option>
            {DELAIS.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label htmlFor="message" className={labelClass}>
          Décris ton projet{star}
        </label>
        <textarea
          id="message"
          value={message}
          onChange={(e) => setMessage(e.target.value.slice(0, 3000))}
          required
          aria-required="true"
          rows={6}
          maxLength={3000}
          className={inputClass}
          placeholder="Quelques mots sur ton projet, tes objectifs, tes contraintes, le contexte…"
        />
        <p className="text-[10px] text-vena-text-dim mt-1 italic">
          Plus tu donnes de contexte, plus on peut te répondre précisément.
        </p>
      </div>

      <div>
        <label htmlFor="source" className={labelClass}>
          Comment as-tu connu VENA ?
        </label>
        <select
          id="source"
          value={source}
          onChange={(e) => setSource(e.target.value)}
          className={inputClass}
        >
          <option value="">— Optionnel —</option>
          {SOURCES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </div>

      <label className="flex items-start gap-3 text-sm text-vena-text cursor-pointer">
        <input
          type="checkbox"
          checked={rgpd}
          onChange={(e) => setRgpd(e.target.checked)}
          required
          aria-required="true"
          className="mt-1 w-4 h-4 accent-vena-kaki shrink-0"
        />
        <span className="leading-relaxed">
          J&apos;accepte que mes données soient utilisées par VENA pour traiter
          ma demande. Conservation 3 ans dans le respect du RGPD.{star}
        </span>
      </label>

      {error && (
        <div
          role="alert"
          className="border border-vena-kaki/40 bg-vena-kaki-soft rounded-lg px-4 py-3 text-sm text-vena-kaki-dark"
        >
          {error}
        </div>
      )}
      {success && (
        <div
          role="status"
          className="border border-vena-vert-eau bg-vena-vert-eau/30 rounded-lg px-4 py-4 text-sm text-vena-text"
        >
          <p className="font-bold mb-1">Demande envoyée ✓</p>
          <p>
            Merci ! On revient vers toi sous 72h avec une proposition adaptée
            à ton besoin.
          </p>
        </div>
      )}

      <button
        type="submit"
        disabled={!isValid || isPending}
        className="btn-vena-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isPending ? "Envoi en cours…" : "Envoyer ma demande"}
      </button>
      {!isValid && (
        <p className="text-[10px] text-vena-text-dim italic text-center">
          Remplis tous les champs marqués d&apos;une étoile pour activer l&apos;envoi.
        </p>
      )}
    </form>
  );
}
