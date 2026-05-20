/**
 * DevisForm — Formulaire de demande de devis (Client Component).
 *
 * 4 blocs visuellement séparés :
 *   1. Votre structure (identité + contact)
 *   2. Votre besoin (type prestation + pack + date + lieu + public + volume)
 *   3. Contexte (budget, source découverte, précisions libres)
 *   4. Consentement RGPD
 *
 * Validation client : le bouton submit est désactivé tant que tous les
 * requis ne sont pas remplis. Validation serveur dans actions.ts (defense
 * en profondeur).
 *
 * Le pack envisagé est synchronisé avec la prop `selectedPack` qui vient du
 * parent (PrestationsClient) — quand l'user click "Choisir ce pack" dans une
 * PackCard, le parent met à jour ce state et on le reflète ici via useEffect.
 *
 * Message de succès affiché 10 secondes minimum après submit OK.
 */
"use client";

import { useState, useEffect, useTransition, useRef } from "react";
import { submitDemandeDevisAction } from "./actions";

interface DevisFormProps {
  /** Pack pré-sélectionné depuis le parent (PackCard click). */
  selectedPack: string;
  /** Callback pour scroll/focus vers le form externe. */
  onPackReset: () => void;
}

const STRUCTURE_TYPES = [
  { value: "service_jeunesse", label: "Service jeunesse municipal" },
  { value: "centre_social_mjc", label: "Centre social / MJC" },
  { value: "ecole", label: "École / Établissement scolaire" },
  { value: "association", label: "Association" },
  { value: "entreprise", label: "Entreprise" },
  { value: "hotel_resto_evt", label: "Hôtel / Restaurant / Événementiel" },
  { value: "particulier", label: "Particulier" },
  { value: "autre", label: "Autre" },
];

const PRESTATION_OPTIONS = [
  { value: "animation_tournoi", label: "Animation tournoi gaming" },
  { value: "prevention_numerique", label: "Intervention prévention numérique" },
  { value: "soiree_evt", label: "Soirée gaming événementielle" },
  { value: "stage_vacances", label: "Stage vacances scolaires" },
  { value: "tournoi_inter_quartier", label: "Tournoi inter-quartier" },
  { value: "couverture_mediatique", label: "Couverture médiatique événement" },
  { value: "autre", label: "Autre" },
];

const PACKS = [
  { value: "decouverte", label: "Pack Découverte" },
  { value: "animation", label: "Pack Animation" },
  { value: "animation_stream", label: "Pack Animation + Option Stream" },
  { value: "indecis", label: "Je ne sais pas encore (à voir avec VEA)" },
];

const TRANCHES_AGE = [
  { value: "6-11", label: "Enfants 6-11 ans" },
  { value: "12-15", label: "Pré-ados 12-15 ans" },
  { value: "16-18", label: "Ados 16-18 ans" },
  { value: "18-25", label: "Jeunes adultes 18-25 ans" },
  { value: "adultes", label: "Adultes" },
  { value: "tout_public", label: "Tout public" },
];

const SOURCES = [
  { value: "reseaux_sociaux", label: "Réseaux sociaux" },
  { value: "bouche_oreille", label: "Bouche à oreille" },
  { value: "recommandation_partenaire", label: "Recommandation d'un partenaire" },
  { value: "presse_locale", label: "Presse locale" },
  { value: "recherche_internet", label: "Recherche internet" },
  { value: "autre", label: "Autre" },
];

export default function DevisForm({ selectedPack, onPackReset }: DevisFormProps) {
  // Bloc 1 — Structure
  const [structureNom, setStructureNom] = useState("");
  const [structureType, setStructureType] = useState("");
  const [referentPrenom, setReferentPrenom] = useState("");
  const [referentNom, setReferentNom] = useState("");
  const [referentFonction, setReferentFonction] = useState("");
  const [email, setEmail] = useState("");
  const [telephone, setTelephone] = useState("");

  // Bloc 2 — Besoin
  const [prestations, setPrestations] = useState<string[]>([]);
  const [prestationsAutrePrecision, setPrestationsAutrePrecision] = useState("");
  const [packEnvisage, setPackEnvisage] = useState(selectedPack || "");
  const [dateSouhaitee, setDateSouhaitee] = useState("");
  const [lieuVille, setLieuVille] = useState("");
  const [lieuStructure, setLieuStructure] = useState("");
  const [trancheAge, setTrancheAge] = useState<string[]>([]);
  const [nombreParticipants, setNombreParticipants] = useState("");
  const [dureeHeures, setDureeHeures] = useState("");

  // Bloc 3 — Contexte
  const [budgetEnvisage, setBudgetEnvisage] = useState("");
  const [sourceDecouverte, setSourceDecouverte] = useState("");
  const [precisions, setPrecisions] = useState("");

  // Bloc 4 — RGPD
  const [rgpdConsent, setRgpdConsent] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isPending, startTransition] = useTransition();
  const successTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync pack depuis le parent (PackCard click)
  useEffect(() => {
    if (selectedPack) {
      setPackEnvisage(selectedPack);
    }
  }, [selectedPack]);

  // Cleanup timer au unmount
  useEffect(() => {
    return () => {
      if (successTimerRef.current) clearTimeout(successTimerRef.current);
    };
  }, []);

  function togglePrestation(v: string) {
    setPrestations((prev) =>
      prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v]
    );
  }

  function toggleTranche(v: string) {
    setTrancheAge((prev) =>
      prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v]
    );
  }

  // Validation client : disabled tant que les requis ne sont pas OK
  const isValid =
    structureNom.trim().length > 0 &&
    structureType.length > 0 &&
    referentPrenom.trim().length > 0 &&
    referentNom.trim().length > 0 &&
    email.includes("@") &&
    telephone.trim().length > 0 &&
    prestations.length > 0 &&
    packEnvisage.length > 0 &&
    dateSouhaitee.length > 0 &&
    lieuVille.trim().length > 0 &&
    Number(nombreParticipants) > 0 &&
    Number(dureeHeures) > 0 &&
    rgpdConsent;

  function resetForm() {
    setStructureNom("");
    setStructureType("");
    setReferentPrenom("");
    setReferentNom("");
    setReferentFonction("");
    setEmail("");
    setTelephone("");
    setPrestations([]);
    setPrestationsAutrePrecision("");
    setPackEnvisage("");
    setDateSouhaitee("");
    setLieuVille("");
    setLieuStructure("");
    setTrancheAge([]);
    setNombreParticipants("");
    setDureeHeures("");
    setBudgetEnvisage("");
    setSourceDecouverte("");
    setPrecisions("");
    setRgpdConsent(false);
    onPackReset();
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    startTransition(async () => {
      const result = await submitDemandeDevisAction({
        structure_nom: structureNom,
        structure_type: structureType,
        referent_prenom: referentPrenom,
        referent_nom: referentNom,
        referent_fonction: referentFonction,
        email,
        telephone,
        prestations_demandees: prestations,
        prestations_autre_precision: prestations.includes("autre")
          ? prestationsAutrePrecision
          : "",
        pack_envisage: packEnvisage,
        date_souhaitee: dateSouhaitee,
        lieu_ville: lieuVille,
        lieu_structure: lieuStructure,
        public_tranche_age: trancheAge,
        nombre_participants: Number(nombreParticipants),
        duree_heures: Number(dureeHeures),
        budget_envisage: budgetEnvisage,
        source_decouverte: sourceDecouverte,
        precisions,
        rgpd_consent: rgpdConsent,
      });

      if (!result.success) {
        setError(result.error ?? "Erreur d'envoi.");
        return;
      }
      setSuccess(true);
      resetForm();
      // Le message succès reste 10 sec minimum
      successTimerRef.current = setTimeout(() => setSuccess(false), 10000);
    });
  }

  const inputClass =
    "w-full bg-white border border-vea-border rounded-lg px-4 py-3 text-vea-text text-sm placeholder-vea-text-dim focus:outline-none focus:border-vea-accent focus:ring-2 focus:ring-vea-accent/15 transition-all";
  const labelClass =
    "block text-xs font-semibold text-vea-text-muted uppercase tracking-wider mb-1.5";
  const requiredStar = <span className="text-vea-accent" aria-hidden="true"> *</span>;
  const blocClass = "card-clean p-6 space-y-5";

  return (
    <form onSubmit={handleSubmit} className="space-y-6" id="form-devis" noValidate>
      {/* ============================================
          BLOC 1 — Votre structure
      ============================================ */}
      <fieldset className={blocClass}>
        <legend className="text-base font-black text-vea-text mb-1 -mt-2">
          1. Votre structure
        </legend>

        <div>
          <label htmlFor="structure_nom" className={labelClass}>
            Nom de la structure{requiredStar}
          </label>
          <input
            type="text"
            id="structure_nom"
            value={structureNom}
            onChange={(e) => setStructureNom(e.target.value.slice(0, 200))}
            required
            aria-required="true"
            maxLength={200}
            className={inputClass}
            placeholder="Ex : Mairie de Saint-Just"
          />
        </div>

        <div>
          <label htmlFor="structure_type" className={labelClass}>
            Type de structure{requiredStar}
          </label>
          <select
            id="structure_type"
            value={structureType}
            onChange={(e) => setStructureType(e.target.value)}
            required
            aria-required="true"
            className={inputClass}
          >
            <option value="">— Sélectionne —</option>
            {STRUCTURE_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="referent_prenom" className={labelClass}>
              Prénom du référent{requiredStar}
            </label>
            <input
              type="text"
              id="referent_prenom"
              value={referentPrenom}
              onChange={(e) => setReferentPrenom(e.target.value.slice(0, 100))}
              required
              aria-required="true"
              maxLength={100}
              autoComplete="given-name"
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="referent_nom" className={labelClass}>
              Nom du référent{requiredStar}
            </label>
            <input
              type="text"
              id="referent_nom"
              value={referentNom}
              onChange={(e) => setReferentNom(e.target.value.slice(0, 100))}
              required
              aria-required="true"
              maxLength={100}
              autoComplete="family-name"
              className={inputClass}
            />
          </div>
        </div>

        <div>
          <label htmlFor="referent_fonction" className={labelClass}>
            Fonction
          </label>
          <input
            type="text"
            id="referent_fonction"
            value={referentFonction}
            onChange={(e) => setReferentFonction(e.target.value.slice(0, 100))}
            maxLength={100}
            className={inputClass}
            placeholder="Ex : Animateur·rice jeunesse, Directeur·rice, Élu·e"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="email" className={labelClass}>
              Email professionnel{requiredStar}
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
              placeholder="nom@structure.fr"
            />
          </div>
          <div>
            <label htmlFor="telephone" className={labelClass}>
              Téléphone{requiredStar}
            </label>
            <input
              type="tel"
              id="telephone"
              value={telephone}
              onChange={(e) => setTelephone(e.target.value.slice(0, 30))}
              required
              aria-required="true"
              autoComplete="tel"
              className={inputClass}
              placeholder="06 12 34 56 78"
            />
          </div>
        </div>
      </fieldset>

      {/* ============================================
          BLOC 2 — Votre besoin
      ============================================ */}
      <fieldset className={blocClass}>
        <legend className="text-base font-black text-vea-text mb-1 -mt-2">
          2. Votre besoin
        </legend>

        <div>
          <p className={labelClass}>Type(s) de prestation{requiredStar}</p>
          <div className="space-y-2">
            {PRESTATION_OPTIONS.map((p) => {
              const checked = prestations.includes(p.value);
              return (
                <label
                  key={p.value}
                  className="flex items-center gap-2 text-sm text-vea-text cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => togglePrestation(p.value)}
                    className="w-4 h-4 accent-vea-accent"
                  />
                  <span>{p.label}</span>
                </label>
              );
            })}
          </div>
          {prestations.includes("autre") && (
            <div className="mt-3">
              <label htmlFor="prestations_autre" className={labelClass}>
                Précise ta demande
              </label>
              <input
                type="text"
                id="prestations_autre"
                value={prestationsAutrePrecision}
                onChange={(e) => setPrestationsAutrePrecision(e.target.value.slice(0, 500))}
                maxLength={500}
                className={inputClass}
                placeholder="Décris brièvement le type d'intervention"
              />
            </div>
          )}
        </div>

        <div>
          <p className={labelClass}>Pack envisagé{requiredStar}</p>
          <div className="space-y-2">
            {PACKS.map((p) => (
              <label
                key={p.value}
                className="flex items-center gap-2 text-sm text-vea-text cursor-pointer"
              >
                <input
                  type="radio"
                  name="pack_envisage"
                  value={p.value}
                  checked={packEnvisage === p.value}
                  onChange={(e) => setPackEnvisage(e.target.value)}
                  required
                  aria-required="true"
                  className="w-4 h-4 accent-vea-accent"
                />
                <span>{p.label}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="date_souhaitee" className={labelClass}>
              Date souhaitée{requiredStar}
            </label>
            <input
              type="date"
              id="date_souhaitee"
              value={dateSouhaitee}
              onChange={(e) => setDateSouhaitee(e.target.value)}
              required
              aria-required="true"
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="lieu_ville" className={labelClass}>
              Ville{requiredStar}
            </label>
            <input
              type="text"
              id="lieu_ville"
              value={lieuVille}
              onChange={(e) => setLieuVille(e.target.value.slice(0, 100))}
              required
              aria-required="true"
              maxLength={100}
              className={inputClass}
              placeholder="Ex : Amiens"
            />
          </div>
        </div>

        <div>
          <label htmlFor="lieu_structure" className={labelClass}>
            Structure / lieu d&apos;accueil
          </label>
          <input
            type="text"
            id="lieu_structure"
            value={lieuStructure}
            onChange={(e) => setLieuStructure(e.target.value.slice(0, 200))}
            maxLength={200}
            className={inputClass}
            placeholder="Ex : Centre social Étouvie, salle des fêtes…"
          />
        </div>

        <div>
          <p className={labelClass}>Public visé (tranche d&apos;âge)</p>
          <div className="space-y-2">
            {TRANCHES_AGE.map((t) => {
              const checked = trancheAge.includes(t.value);
              return (
                <label
                  key={t.value}
                  className="flex items-center gap-2 text-sm text-vea-text cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleTranche(t.value)}
                    className="w-4 h-4 accent-vea-accent"
                  />
                  <span>{t.label}</span>
                </label>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="nombre_participants" className={labelClass}>
              Participants estimés{requiredStar}
            </label>
            <input
              type="number"
              id="nombre_participants"
              min={1}
              value={nombreParticipants}
              onChange={(e) => setNombreParticipants(e.target.value)}
              required
              aria-required="true"
              className={inputClass}
              placeholder="Ex : 30"
            />
          </div>
          <div>
            <label htmlFor="duree_heures" className={labelClass}>
              Durée prévue (heures){requiredStar}
            </label>
            <input
              type="number"
              id="duree_heures"
              min={1}
              value={dureeHeures}
              onChange={(e) => setDureeHeures(e.target.value)}
              required
              aria-required="true"
              className={inputClass}
              placeholder="Ex : 3"
            />
          </div>
        </div>
      </fieldset>

      {/* ============================================
          BLOC 3 — Contexte
      ============================================ */}
      <fieldset className={blocClass}>
        <legend className="text-base font-black text-vea-text mb-1 -mt-2">
          3. Contexte
        </legend>

        <div>
          <label htmlFor="budget_envisage" className={labelClass}>
            Budget envisagé
          </label>
          <input
            type="text"
            id="budget_envisage"
            value={budgetEnvisage}
            onChange={(e) => setBudgetEnvisage(e.target.value.slice(0, 200))}
            maxLength={200}
            className={inputClass}
            placeholder="Ex : 500€, à discuter, etc."
          />
        </div>

        <div>
          <label htmlFor="source_decouverte" className={labelClass}>
            Vous nous avez connus comment ?
          </label>
          <select
            id="source_decouverte"
            value={sourceDecouverte}
            onChange={(e) => setSourceDecouverte(e.target.value)}
            className={inputClass}
          >
            <option value="">— Au choix —</option>
            {SOURCES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="precisions" className={labelClass}>
            Précisions sur votre demande
          </label>
          <textarea
            id="precisions"
            value={precisions}
            onChange={(e) => setPrecisions(e.target.value.slice(0, 2000))}
            maxLength={2000}
            rows={4}
            className={inputClass}
            placeholder="Décrivez-nous votre projet, vos objectifs, vos contraintes spécifiques…"
          />
        </div>
      </fieldset>

      {/* ============================================
          BLOC 4 — Consentement RGPD
      ============================================ */}
      <fieldset className={blocClass}>
        <legend className="text-base font-black text-vea-text mb-1 -mt-2">
          4. Consentement RGPD
        </legend>
        <label className="flex items-start gap-3 text-sm text-vea-text cursor-pointer">
          <input
            type="checkbox"
            checked={rgpdConsent}
            onChange={(e) => setRgpdConsent(e.target.checked)}
            required
            aria-required="true"
            className="mt-1 w-4 h-4 accent-vea-accent shrink-0"
          />
          <span className="leading-relaxed">
            J&apos;accepte que mes données soient utilisées par Velito Esport
            Amiens pour traiter ma demande de devis et m&apos;envoyer une
            proposition commerciale. Les données seront conservées 3 ans dans le
            respect du RGPD.{requiredStar}
          </span>
        </label>
      </fieldset>

      {/* Feedback global */}
      {error && (
        <div
          role="alert"
          className="border border-vea-accent/40 bg-vea-accent-soft rounded-lg px-4 py-3 text-sm text-vea-accent"
        >
          {error}
        </div>
      )}
      {success && (
        <div
          role="status"
          className="border border-emerald-300 bg-emerald-50 rounded-lg px-4 py-4 text-sm text-emerald-800"
        >
          <p className="font-bold mb-1">Demande envoyée ✓</p>
          <p>
            Votre demande a bien été envoyée. Vous recevrez une réponse
            personnalisée sous 48 à 72 heures.
          </p>
        </div>
      )}

      <button
        type="submit"
        disabled={!isValid || isPending}
        className="btn-primary w-full text-sm disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isPending ? "Envoi en cours…" : "Envoyer ma demande de devis"}
      </button>
      {!isValid && (
        <p className="text-[10px] text-vea-text-dim italic text-center">
          Remplis tous les champs marqués d&apos;une étoile rouge pour activer
          l&apos;envoi.
        </p>
      )}
    </form>
  );
}
