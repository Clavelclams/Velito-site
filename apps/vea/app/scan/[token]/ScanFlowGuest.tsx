/**
 * ScanFlowGuest — Client Component pour le scan SANS COMPTE (pre-inscrit).
 *
 * Flow en 2 etapes :
 *   STEP 1 - infos : nom + prenom + sexe + date naissance + tel (tous obligatoires)
 *   STEP 2 - motif : Jouer / Aider / Regarder (meme UI que ScanForm authentifie)
 *
 * Au submit step 2, appelle registerPreInscritScanAction qui :
 *   - find_or_create participant via (phone + lower(nom) + lower(prenom))
 *   - insert presence
 *   - insert log_xp (trigger applique XP/niveau/badges)
 *
 * Merge auto : si quelqu'un re-scanne avec mêmes (nom+prenom+tel), on retrouve
 * sa fiche existante et on cumule ses XP. Permet aussi le merge auto futur
 * avec un vrai compte cree avec le meme tel.
 *
 * Fratrie : meme tel parent autorise (UNIQUE compose phone+nom+prenom).
 */
"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { registerPreInscritScanAction } from "./actions";

type Motif = "jouer" | "aider" | "regarder";
type Sexe = "F" | "M" | "X";

interface ScanFlowGuestProps {
  token: string;
  eventName: string;
}

export default function ScanFlowGuest({ token, eventName }: ScanFlowGuestProps) {
  // Step 1 : infos
  const [step, setStep] = useState<"infos" | "motif">("infos");
  const [nom, setNom] = useState("");
  const [prenom, setPrenom] = useState("");
  const [sexe, setSexe] = useState<Sexe | "">("");
  const [dateNaissance, setDateNaissance] = useState(""); // YYYY-MM-DD
  const [phone, setPhone] = useState("");
  const [infosError, setInfosError] = useState("");

  // Step 2 : motif
  const [selectedMotif, setSelectedMotif] = useState<Motif | null>(null);
  // 19/05/2026 : input retire. On envoie undefined au serveur (via 0 dans la RPC),
  // qui utilise alors event.duree_estimee_heures comme heures par defaut.
  const [submitError, setSubmitError] = useState("");
  const [success, setSuccess] = useState<{ motif: Motif; xp: number } | null>(null);
  const [alreadyScanned, setAlreadyScanned] = useState(false);
  const [isPending, startTransition] = useTransition();

  // ============== VALIDATION STEP 1 ==============
  function handleNextStep() {
    setInfosError("");
    const nomTrim = nom.trim();
    const prenomTrim = prenom.trim();
    const phoneClean = phone.replace(/\s/g, "");

    if (nomTrim.length < 1) return setInfosError("Nom requis.");
    if (prenomTrim.length < 1) return setInfosError("Prenom requis.");
    if (!sexe) return setInfosError("Choisis ton sexe.");
    if (!dateNaissance) return setInfosError("Date de naissance requise.");
    const dn = new Date(dateNaissance);
    if (isNaN(dn.getTime())) return setInfosError("Date de naissance invalide.");
    if (dn > new Date()) return setInfosError("La date de naissance ne peut pas etre dans le futur.");
    if (dn < new Date("1900-01-01")) return setInfosError("Date de naissance trop ancienne.");
    if (phoneClean.length < 8) return setInfosError("Numero de telephone invalide (8 chiffres min).");

    // Tout OK -> step 2
    setStep("motif");
  }

  // ============== SUBMIT STEP 2 ==============
  function handleSubmit() {
    if (!selectedMotif) return;
    setSubmitError("");
    setAlreadyScanned(false);

    startTransition(async () => {
      const result = await registerPreInscritScanAction({
        token,
        motif: selectedMotif,
        // heures_aide undefined -> RPC SQL utilise event.duree_estimee_heures
        nom: nom.trim(),
        prenom: prenom.trim(),
        sexe: sexe as Sexe,
        date_naissance: dateNaissance,
        phone: phone.replace(/\s/g, ""),
      });

      if (result.success && result.xpGagne !== undefined && result.motif) {
        setSuccess({ motif: result.motif, xp: result.xpGagne });
      } else if (result.alreadyScanned) {
        setAlreadyScanned(true);
        setSubmitError(result.error ?? "Deja scanne.");
      } else {
        setSubmitError(result.error ?? "Erreur inconnue");
      }
    });
  }

  // ============== ECRAN SUCCES ==============
  // 19/05/2026 : XP cache cote UI (anti-triche). La progression est consultable
  // dans /profil (avec explication des baremes via les badges).
  if (success) {
    return (
      <div className="card-clean p-8 text-center">
        <div className="text-6xl mb-4">
          {success.motif === "jouer" ? "🎮" : success.motif === "aider" ? "💪" : "👀"}
        </div>
        <h2 className="text-3xl font-black text-vea-text mb-2">
          C&apos;est note !
        </h2>
        <p className="text-sm text-vea-text-muted mb-6">
          Tu es enregistre comme{" "}
          <strong className="text-vea-accent">
            {success.motif === "jouer" ? "joueur" : success.motif === "aider" ? "benevole" : "spectateur"}
          </strong>{" "}
          sur {eventName}.
        </p>
        <p className="text-xs text-vea-text-dim mb-6 leading-relaxed max-w-md mx-auto">
          Ta participation est sauvegardee. Pour voir ta progression, debloquer
          les badges/recompenses, cree ton compte plus tard avec ce meme numero
          de tel — on retrouvera ton historique automatiquement.
        </p>
        <Link href="/inscription" className="btn-primary">
          Creer mon compte VEA
        </Link>
      </div>
    );
  }

  // ============== DEJA SCANNE ==============
  if (alreadyScanned) {
    return (
      <div className="card-clean p-8 text-center">
        <div className="text-5xl mb-4">✓</div>
        <h2 className="text-2xl font-black text-vea-text mb-2">
          Deja enregistre
        </h2>
        <p className="text-sm text-vea-text-muted mb-6">
          Tu as deja scanne <strong>{eventName}</strong>. Un seul scan par
          event, pas de tricherie possible.
        </p>
        <Link href="/" className="btn-primary">
          Retour
        </Link>
      </div>
    );
  }

  // ============== STEP 1 — INFOS PERSONNELLES ==============
  if (step === "infos") {
    return (
      <div className="card-clean p-6 space-y-4">
        <div>
          <h2 className="text-xl font-bold text-vea-text text-center mb-2">
            Tes infos
          </h2>
          <p className="text-xs text-vea-text-muted text-center mb-4 leading-relaxed">
            Pas de compte ? Pas grave. Donne tes infos et tu seras enregistre.
            Tu pourras creer ton compte plus tard avec le meme tel pour
            retrouver ta progression.
          </p>
          <p className="text-[10px] text-vea-text-dim text-center italic mb-2">
            Pas de tel perso ? Utilise celui d&apos;un parent (frere/soeur OK
            sur meme tel, distingues par nom+prenom).
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="prenom" className="block text-xs font-semibold text-vea-text-muted uppercase tracking-wider mb-1.5">
              Prenom *
            </label>
            <input
              type="text" id="prenom" required
              value={prenom}
              onChange={(e) => setPrenom(e.target.value)}
              autoComplete="given-name"
              className="w-full bg-white border border-vea-border rounded-lg px-3 py-2 text-vea-text text-sm focus:outline-none focus:border-vea-accent focus:ring-2 focus:ring-vea-accent/15"
            />
          </div>
          <div>
            <label htmlFor="nom" className="block text-xs font-semibold text-vea-text-muted uppercase tracking-wider mb-1.5">
              Nom *
            </label>
            <input
              type="text" id="nom" required
              value={nom}
              onChange={(e) => setNom(e.target.value)}
              autoComplete="family-name"
              className="w-full bg-white border border-vea-border rounded-lg px-3 py-2 text-vea-text text-sm focus:outline-none focus:border-vea-accent focus:ring-2 focus:ring-vea-accent/15"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-vea-text-muted uppercase tracking-wider mb-1.5">
            Sexe *
          </label>
          <div className="grid grid-cols-3 gap-2">
            <SexeButton label="Fille" value="F" selected={sexe === "F"} onClick={() => setSexe("F")} />
            <SexeButton label="Garcon" value="M" selected={sexe === "M"} onClick={() => setSexe("M")} />
            <SexeButton label="Autre" value="X" selected={sexe === "X"} onClick={() => setSexe("X")} />
          </div>
        </div>

        <div>
          <label htmlFor="dateNaissance" className="block text-xs font-semibold text-vea-text-muted uppercase tracking-wider mb-1.5">
            Date de naissance *
          </label>
          <input
            type="date" id="dateNaissance" required
            value={dateNaissance}
            onChange={(e) => setDateNaissance(e.target.value)}
            max={new Date().toISOString().split("T")[0]}
            min="1900-01-01"
            className="w-full bg-white border border-vea-border rounded-lg px-3 py-2 text-vea-text text-sm focus:outline-none focus:border-vea-accent focus:ring-2 focus:ring-vea-accent/15"
          />
        </div>

        <div>
          <label htmlFor="phone" className="block text-xs font-semibold text-vea-text-muted uppercase tracking-wider mb-1.5">
            Telephone *
          </label>
          <input
            type="tel" id="phone" required
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="06 12 34 56 78"
            autoComplete="tel"
            inputMode="tel"
            className="w-full bg-white border border-vea-border rounded-lg px-3 py-2 text-vea-text text-sm focus:outline-none focus:border-vea-accent focus:ring-2 focus:ring-vea-accent/15"
          />
          <p className="text-[10px] text-vea-text-dim mt-1 italic">
            Tel parent OK si tu n&apos;as pas de tel perso.
          </p>
        </div>

        {infosError && (
          <div className="border border-vea-accent/30 bg-vea-accent-soft rounded-lg px-4 py-3 text-sm text-vea-accent">
            {infosError}
          </div>
        )}

        <button
          type="button"
          onClick={handleNextStep}
          className="btn-primary w-full"
        >
          Suivant
        </button>

        <p className="text-[10px] text-vea-text-dim text-center mt-2 italic">
          Tu peux aussi te{" "}
          <Link href={`/login?redirect=/scan/${token}`} className="underline hover:text-vea-accent">
            connecter
          </Link>{" "}
          si tu as deja un compte.
        </p>
      </div>
    );
  }

  // ============== STEP 2 — MOTIF (jouer/aider/regarder) ==============
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-2">
        <button
          type="button"
          onClick={() => setStep("infos")}
          className="text-xs text-vea-text-dim hover:text-vea-accent"
        >
          ← Modifier mes infos
        </button>
        <span className="text-[10px] text-vea-text-dim uppercase tracking-wider">
          Etape 2/2
        </span>
      </div>

      <h2 className="text-xl font-bold text-vea-text text-center mb-2">
        Salut {prenom} ! Tu es la pour quoi ?
      </h2>
      <p className="text-sm text-vea-text-muted text-center mb-6">
        Choisis ton motif pour gagner de l&apos;XP.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <MotifCard
          motif="jouer"
          emoji="🎮"
          label="Jouer"
          description="Tu participes au tournoi / animation."
          selected={selectedMotif === "jouer"}
          onClick={() => setSelectedMotif("jouer")}
        />
        <MotifCard
          motif="aider"
          emoji="💪"
          label="Aider"
          description="Tu donnes un coup de main (staff, encadrement)."
          selected={selectedMotif === "aider"}
          onClick={() => setSelectedMotif("aider")}
        />
        <MotifCard
          motif="regarder"
          emoji="👀"
          label="Regarder"
          description="Tu viens encourager / decouvrir."
          selected={selectedMotif === "regarder"}
          onClick={() => setSelectedMotif("regarder")}
        />
      </div>

      {/* 19/05/2026 : input nb d'heures retire (user feedback : on devine la
          duree via l'event lui-meme, tant pis pour la precision).
          Defaut envoye au serveur = 1h pour Aider (15 XP). */}

      {submitError && (
        <div className="border border-vea-accent/30 bg-vea-accent-soft rounded-lg px-4 py-3 text-sm text-vea-accent">
          {submitError}
        </div>
      )}

      <button
        type="button"
        onClick={handleSubmit}
        disabled={!selectedMotif || isPending}
        className="btn-primary w-full disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {isPending ? "Enregistrement..." : selectedMotif ? "Confirmer ma presence" : "Choisis un motif"}
      </button>
    </div>
  );
}

// ============================================================================
// COMPOSANTS UI (SexeButton + MotifCard)
// ============================================================================

interface SexeButtonProps {
  label: string;
  value: Sexe;
  selected: boolean;
  onClick: () => void;
}

function SexeButton({ label, selected, onClick }: SexeButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`text-center py-2.5 rounded-lg border-2 text-sm font-semibold transition-all ${
        selected
          ? "border-vea-accent bg-vea-accent-soft text-vea-accent"
          : "border-vea-border bg-white text-vea-text-muted hover:border-vea-accent/40"
      }`}
    >
      {label}
    </button>
  );
}

interface MotifCardProps {
  motif: Motif;
  emoji: string;
  label: string;
  description: string;
  selected: boolean;
  onClick: () => void;
}

function MotifCard({ emoji, label, description, selected, onClick }: MotifCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`text-center p-5 rounded-lg border-2 transition-all ${
        selected
          ? "border-vea-accent bg-vea-accent-soft shadow-card-hover"
          : "border-vea-border bg-white hover:border-vea-accent/40 hover:-translate-y-0.5"
      }`}
    >
      <div className="text-4xl mb-2">{emoji}</div>
      <div className="text-base font-bold text-vea-text mb-2">{label}</div>
      <p className="text-[11px] text-vea-text-muted leading-snug">{description}</p>
    </button>
  );
}
