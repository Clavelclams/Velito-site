/**
 * SignalementForm — formulaire de signalement (bug-report) intégré au ChatBot VEA.
 *
 * Visible par tous, envoi réservé aux connectés (anti-spam) : si needAuth, on
 * invite à se connecter / créer un compte (/signup).
 *
 * Pièce jointe : 1 fichier image (jpg/png/webp) ou PDF, 5 Mo max — validé aussi
 * côté serveur (cf app/signalement/actions.ts).
 */
"use client";

import { useState } from "react";
import { submitSignalementAction } from "@/app/signalement/actions";

const CATEGORIES = [
  { value: "bug_technique", label: "Bug / le site ne marche pas" },
  { value: "souci_projet", label: "Problème sur un projet précis" },
  { value: "souci_vea", label: "Souci VEA (équipe, joueur, orga)" },
  { value: "autre", label: "Autre" },
];

const ACCEPT = ".jpg,.jpeg,.png,.webp,.pdf,image/jpeg,image/png,image/webp,application/pdf";
const MAX_SIZE = 5 * 1024 * 1024;

export default function SignalementForm({
  app = "vea",
  loginHref = "/signup",
}: {
  app?: string;
  loginHref?: string;
}) {
  const [categorie, setCategorie] = useState("");
  const [projet, setProjet] = useState("");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [needAuth, setNeedAuth] = useState(false);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    setFileError(null);
    const f = e.target.files?.[0] ?? null;
    if (f) {
      if (f.size > MAX_SIZE) {
        setFileError("Fichier trop lourd (5 Mo max).");
        setFile(null);
        e.target.value = "";
        return;
      }
      const okType = ["image/jpeg", "image/png", "image/webp", "application/pdf"].includes(f.type);
      if (!okType) {
        setFileError("Photo (JPG/PNG/WEBP) ou PDF uniquement.");
        setFile(null);
        e.target.value = "";
        return;
      }
    }
    setFile(f);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNeedAuth(false);
    if (!categorie) {
      setError("Choisis une catégorie.");
      return;
    }
    if (description.trim().length < 5) {
      setError("Décris le problème en quelques mots (5 caractères min).");
      return;
    }
    setLoading(true);
    try {
      const fd = new FormData();
      fd.set("app", app);
      fd.set("categorie", categorie);
      fd.set("projet", projet);
      fd.set("description", description);
      if (file) fd.set("file", file);

      const res = await submitSignalementAction(fd);
      if (res.success) {
        setSuccess(true);
        return;
      }
      if (res.needAuth) {
        setNeedAuth(true);
      } else {
        setError(res.error ?? "Une erreur est survenue.");
      }
    } catch {
      setError("Erreur de connexion. Réessaye.");
    } finally {
      setLoading(false);
    }
  }

  const inputCls =
    "w-full bg-white border border-vea-border rounded-lg px-3 py-2 text-sm text-vea-text focus:outline-none focus:border-vea-accent focus:ring-2 focus:ring-vea-accent/15 transition-all";

  if (success) {
    return (
      <div className="text-center py-4">
        <div className="text-2xl mb-2" aria-hidden="true">✓</div>
        <p className="font-bold text-vea-text text-sm mb-1">Signalement envoyé</p>
        <p className="text-xs text-vea-text-muted">
          Merci, c'est bien remonté. On regarde ça au plus vite.
        </p>
      </div>
    );
  }

  if (needAuth) {
    return (
      <div className="text-center py-4 space-y-3">
        <p className="text-sm text-vea-text">
          Pour envoyer un signalement, connecte-toi ou crée un compte (ça nous
          évite le spam et permet de te recontacter si besoin).
        </p>
        <a
          href={loginHref}
          className="inline-block bg-vea-accent/90 text-white text-sm font-bold uppercase tracking-widest px-4 py-2.5 rounded-full hover:bg-vea-accent transition-colors"
        >
          Se connecter / s'inscrire
        </a>
        <button
          type="button"
          onClick={() => setNeedAuth(false)}
          className="block w-full text-xs text-vea-text-dim hover:text-vea-accent"
        >
          ← Retour
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3" noValidate>
      <div>
        <label className="block text-[10px] uppercase tracking-widest font-bold text-vea-text-dim mb-1">
          Type de problème
        </label>
        <select
          value={categorie}
          onChange={(e) => setCategorie(e.target.value)}
          className={inputCls}
          required
        >
          <option value="">— Choisis —</option>
          {CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-[10px] uppercase tracking-widest font-bold text-vea-text-dim mb-1">
          Projet / page concernée <span className="normal-case text-vea-text-muted">(optionnel)</span>
        </label>
        <input
          type="text"
          value={projet}
          onChange={(e) => setProjet(e.target.value.slice(0, 120))}
          className={inputCls}
          placeholder="Ex : inscription, scan QR, profil…"
        />
      </div>

      <div>
        <label className="block text-[10px] uppercase tracking-widest font-bold text-vea-text-dim mb-1">
          Décris le souci
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value.slice(0, 5000))}
          rows={4}
          className={inputCls}
          placeholder="Qu'est-ce qui se passe ? Sur quel téléphone / navigateur ?"
          required
        />
      </div>

      <div>
        <label className="block text-[10px] uppercase tracking-widest font-bold text-vea-text-dim mb-1">
          Capture ou PDF <span className="normal-case text-vea-text-muted">(optionnel, 5 Mo max)</span>
        </label>
        <input type="file" accept={ACCEPT} onChange={onFile} className="text-xs text-vea-text-muted w-full" />
        {fileError && <p className="text-[11px] text-vea-accent mt-1">{fileError}</p>}
      </div>

      {error && (
        <div className="border border-vea-accent/30 bg-vea-accent-soft rounded-lg px-3 py-2 text-xs text-vea-accent">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-vea-accent/90 text-white text-sm font-bold uppercase tracking-widest px-4 py-2.5 rounded-full hover:bg-vea-accent transition-colors disabled:opacity-50"
      >
        {loading ? "Envoi…" : "Envoyer le signalement"}
      </button>
    </form>
  );
}
