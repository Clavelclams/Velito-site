/**
 * AddManualParticipantForm — Client Component pour ajouter un participant
 * manuellement sur un event depuis /admin/evenements/[id].
 *
 * Use case : un gamin vient a un event mais n'a pas pu scanner (pas de tel,
 * timide, etc.). L'admin remplit le form pour le rentrer dans la BDD.
 *
 * Form fields :
 *   - Prenom, Nom (requis)
 *   - Sexe F/M/X (requis)
 *   - Date naissance (requis)
 *   - Telephone (requis, peut etre celui d'un parent)
 *   - Motifs : checkboxes Jouer / Aider / Regarder (au moins 1 requis)
 *   - Heures aide : optionnel (si "Aider" coche, sinon prend duree event par defaut)
 *
 * Au submit, appelle addManualParticipantAction qui reutilise la RPC SQL
 * register_preinscrit_scan en boucle pour chaque motif. Le merge auto
 * (phone + lower(nom) + lower(prenom)) marche : si la personne a deja
 * une fiche, on l'incremente, sinon on cree.
 *
 * Le bouton "Ajouter" est replie par defaut (collapsible) pour ne pas
 * encombrer la page. L'admin clique "+ Ajouter manuellement" pour ouvrir.
 */
"use client";

import { useState, useTransition } from "react";
import { addManualParticipantAction } from "./actions";

type Motif = "jouer" | "aider" | "regarder";
type Sexe = "F" | "M" | "X";

interface AddManualParticipantFormProps {
  eventToken: string;
  eventName: string;
}

export default function AddManualParticipantForm({
  eventToken,
  eventName,
}: AddManualParticipantFormProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Form state
  const [prenom, setPrenom] = useState("");
  const [nom, setNom] = useState("");
  const [sexe, setSexe] = useState<Sexe | "">("");
  const [dateNaissance, setDateNaissance] = useState("");
  const [phone, setPhone] = useState("");
  const [motifs, setMotifs] = useState<Set<Motif>>(new Set());
  const [heuresAide, setHeuresAide] = useState("");

  // UI state
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isPending, startTransition] = useTransition();

  function resetForm() {
    setPrenom("");
    setNom("");
    setSexe("");
    setDateNaissance("");
    setPhone("");
    setMotifs(new Set());
    setHeuresAide("");
    setError("");
    setSuccess("");
  }

  function toggleMotif(m: Motif) {
    setMotifs((prev) => {
      const next = new Set(prev);
      if (next.has(m)) next.delete(m);
      else next.add(m);
      return next;
    });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");

    // Validations cote client
    if (!prenom.trim() || !nom.trim()) {
      return setError("Prenom et nom requis.");
    }
    if (!sexe) return setError("Sexe requis (Fille/Garcon/Autre).");
    if (!dateNaissance) return setError("Date de naissance requise.");
    const phoneClean = phone.replace(/\s/g, "");
    if (phoneClean.length < 8) {
      return setError("Telephone invalide (8 chiffres min). Utilise celui d'un parent si besoin.");
    }
    if (motifs.size === 0) {
      return setError("Coche au moins 1 motif (Jouer / Aider / Regarder).");
    }

    startTransition(async () => {
      const result = await addManualParticipantAction({
        eventToken,
        nom: nom.trim(),
        prenom: prenom.trim(),
        sexe: sexe as Sexe,
        dateNaissance,
        phone: phoneClean,
        motifs: [...motifs] as Motif[],
        heuresAide: motifs.has("aider") && heuresAide ? Number(heuresAide) : undefined,
      });

      if (!result.success) {
        setError(result.error ?? "Erreur inconnue");
      } else {
        setSuccess(`${prenom.trim()} ${nom.trim()} ajoute(e) sur ${eventName}.`);
        resetForm();
        // Note : la page admin va re-fetch via revalidatePath cote action
      }
    });
  }

  // ============ ETAT FERME : juste un bouton ============
  if (!isOpen) {
    return (
      <div className="mb-6">
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="text-xs uppercase tracking-widest font-bold px-4 py-2 rounded-full border-2 border-dashed border-vea-accent/40 text-vea-accent hover:bg-vea-accent-soft transition-all"
        >
          + Ajouter un participant manuellement
        </button>
        <p className="text-[10px] text-vea-text-dim mt-1.5 italic">
          Pour les gamins qui n&apos;ont pas pu scanner (pas de tel, etc.).
        </p>
      </div>
    );
  }

  // ============ ETAT OUVERT : form complet ============
  return (
    <form
      onSubmit={handleSubmit}
      className="card-clean p-5 mb-6 border-2 border-vea-accent/30"
    >
      <div className="flex items-start justify-between mb-3">
        <h3 className="text-sm font-bold text-vea-text">
          + Ajouter un participant manuellement
        </h3>
        <button
          type="button"
          onClick={() => {
            setIsOpen(false);
            resetForm();
          }}
          className="text-[10px] text-vea-text-dim hover:text-vea-accent uppercase tracking-widest font-bold"
        >
          Annuler ✕
        </button>
      </div>

      {/* Prenom + Nom */}
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div>
          <label className="block text-[10px] uppercase tracking-wider font-semibold text-vea-text-muted mb-1">
            Prenom *
          </label>
          <input
            type="text" required
            value={prenom}
            onChange={(e) => setPrenom(e.target.value)}
            autoComplete="given-name"
            className="w-full bg-white border border-vea-border rounded-lg px-3 py-2 text-vea-text text-sm focus:outline-none focus:border-vea-accent"
          />
        </div>
        <div>
          <label className="block text-[10px] uppercase tracking-wider font-semibold text-vea-text-muted mb-1">
            Nom *
          </label>
          <input
            type="text" required
            value={nom}
            onChange={(e) => setNom(e.target.value)}
            autoComplete="family-name"
            className="w-full bg-white border border-vea-border rounded-lg px-3 py-2 text-vea-text text-sm focus:outline-none focus:border-vea-accent"
          />
        </div>
      </div>

      {/* Sexe */}
      <div className="mb-3">
        <label className="block text-[10px] uppercase tracking-wider font-semibold text-vea-text-muted mb-1">
          Sexe *
        </label>
        <div className="grid grid-cols-3 gap-2">
          {(["F", "M", "X"] as Sexe[]).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setSexe(s)}
              className={`py-2 rounded-lg border-2 text-sm font-semibold transition-all ${
                sexe === s
                  ? "border-vea-accent bg-vea-accent-soft text-vea-accent"
                  : "border-vea-border bg-white text-vea-text-muted hover:border-vea-accent/40"
              }`}
            >
              {s === "F" ? "Fille" : s === "M" ? "Garcon" : "Autre"}
            </button>
          ))}
        </div>
      </div>

      {/* Date naissance + Tel */}
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div>
          <label className="block text-[10px] uppercase tracking-wider font-semibold text-vea-text-muted mb-1">
            Date naissance *
          </label>
          <input
            type="date" required
            value={dateNaissance}
            onChange={(e) => setDateNaissance(e.target.value)}
            max={new Date().toISOString().split("T")[0]}
            min="1900-01-01"
            className="w-full bg-white border border-vea-border rounded-lg px-3 py-2 text-vea-text text-sm focus:outline-none focus:border-vea-accent"
          />
        </div>
        <div>
          <label className="block text-[10px] uppercase tracking-wider font-semibold text-vea-text-muted mb-1">
            Telephone *
          </label>
          <input
            type="tel" required
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="06 12 34 56 78"
            autoComplete="tel"
            inputMode="tel"
            className="w-full bg-white border border-vea-border rounded-lg px-3 py-2 text-vea-text text-sm focus:outline-none focus:border-vea-accent"
          />
          <p className="text-[9px] text-vea-text-dim italic mt-0.5">
            Tel parent OK
          </p>
        </div>
      </div>

      {/* Motifs */}
      <div className="mb-3">
        <label className="block text-[10px] uppercase tracking-wider font-semibold text-vea-text-muted mb-1">
          Motif(s) sur l&apos;event * (au moins 1)
        </label>
        <div className="grid grid-cols-3 gap-2">
          {(["jouer", "aider", "regarder"] as Motif[]).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => toggleMotif(m)}
              className={`py-2 rounded-lg border-2 text-xs font-semibold transition-all ${
                motifs.has(m)
                  ? "border-vea-accent bg-vea-accent-soft text-vea-accent"
                  : "border-vea-border bg-white text-vea-text-muted hover:border-vea-accent/40"
              }`}
            >
              {m === "jouer" ? "🎮 Jouer" : m === "aider" ? "💪 Aider" : "👀 Regarder"}
            </button>
          ))}
        </div>
      </div>

      {/* Heures aide (optionnel si motif Aider) */}
      {motifs.has("aider") && (
        <div className="mb-3">
          <label className="block text-[10px] uppercase tracking-wider font-semibold text-vea-text-muted mb-1">
            Heures aide (optionnel — sinon duree event par defaut)
          </label>
          <input
            type="number" step="0.5" min="0.5" max="24"
            value={heuresAide}
            onChange={(e) => setHeuresAide(e.target.value)}
            placeholder="ex: 2"
            className="w-32 bg-white border border-vea-border rounded-lg px-3 py-1.5 text-vea-text text-sm focus:outline-none focus:border-vea-accent"
          />
        </div>
      )}

      {error && (
        <div className="border border-vea-accent/30 bg-vea-accent-soft rounded-lg px-3 py-2 text-xs text-vea-accent mb-3">
          {error}
        </div>
      )}
      {success && (
        <div className="border border-emerald-200 bg-emerald-50 rounded-lg px-3 py-2 text-xs text-emerald-700 mb-3">
          {success}
        </div>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="btn-primary w-full disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {isPending ? "Ajout en cours..." : "Ajouter ce participant"}
      </button>
    </form>
  );
}
