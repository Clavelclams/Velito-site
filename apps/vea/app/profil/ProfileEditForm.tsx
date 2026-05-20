/**
 * ProfileEditForm — composant client pour editer son profil joueur VEA.
 *
 * Pourquoi un composant client :
 *   - Form interactif (useState pour les inputs)
 *   - Toggle is_public en local avant submit
 *   - Feedback visuel (loading, success, error)
 *
 * Strategie :
 *   - On recoit les valeurs initiales du parent Server Component (page.tsx)
 *   - Submit appelle la Server Action updateProfileAction
 *   - Si success, on affiche un toast et la page se revalide automatiquement
 *     (revalidatePath dans la server action)
 *
 * Note avatar_url : pour l'instant c'est un champ URL texte. Plus tard on
 * branchera un upload Supabase Storage avec un bouton "Choisir une image".
 */
"use client";

import { useState, useTransition, useRef } from "react";
import { updateProfileAction } from "./actions";
import { createClient } from "@/lib/supabase/client";

export interface ExternalLink {
  label: string;
  url: string;
}

// Taille max upload avatar = 2 MB (compromis qualite/perf)
const MAX_AVATAR_SIZE = 2 * 1024 * 1024;
const ALLOWED_MIME = ["image/png", "image/jpeg", "image/webp", "image/gif"];

interface ProfileEditFormProps {
  initialPseudo: string;
  initialJeuPrefere: string;
  initialBio: string;
  initialAvatarUrl: string;
  initialIsPublic: boolean;
  initialExternalLinks: ExternalLink[];
}

// Presets pour helper les users (boutons rapides "Ajouter Discord", "Twitch", etc.)
const PRESET_LINK_LABELS = ["Discord", "Twitch", "Instagram", "YouTube", "Twitter / X", "TikTok"];

export default function ProfileEditForm({
  initialPseudo,
  initialJeuPrefere,
  initialBio,
  initialAvatarUrl,
  initialIsPublic,
  initialExternalLinks,
}: ProfileEditFormProps) {
  const [pseudo, setPseudo] = useState(initialPseudo);
  const [jeuPrefere, setJeuPrefere] = useState(initialJeuPrefere);
  const [bio, setBio] = useState(initialBio);
  const [avatarUrl, setAvatarUrl] = useState(initialAvatarUrl);
  const [isPublic, setIsPublic] = useState(initialIsPublic);
  const [externalLinks, setExternalLinks] = useState<ExternalLink[]>(initialExternalLinks);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  // useTransition : permet de garder le bouton "sauvegarder" dans un etat
  // pending sans freezer toute l'UI pendant que la server action tourne
  const [isPending, startTransition] = useTransition();

  // Upload avatar : state local pour gerer le feedback
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError("");

    // Validation : taille + type
    if (file.size > MAX_AVATAR_SIZE) {
      setUploadError(
        `Image trop lourde (${Math.round(file.size / 1024)} KB). Max 2 MB.`
      );
      return;
    }
    if (!ALLOWED_MIME.includes(file.type)) {
      setUploadError("Format invalide. PNG, JPEG, WebP ou GIF uniquement.");
      return;
    }

    setUploading(true);

    const supabase = createClient();

    // Recupere user_id pour le path (les RLS policies attendent {user_id}/...)
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setUploadError("Non connecte.");
      setUploading(false);
      return;
    }

    // Path : {user_id}/avatar.{ext} (upsert pour remplacer l'ancien)
    const ext = file.name.split(".").pop()?.toLowerCase() || "png";
    const path = `${user.id}/avatar.${ext}`;

    const { error: uploadErr } = await supabase.storage
      .from("avatars")
      .upload(path, file, { upsert: true, contentType: file.type });

    if (uploadErr) {
      setUploadError(uploadErr.message);
      setUploading(false);
      return;
    }

    // URL publique + timestamp pour bust le cache navigateur
    const { data: urlData } = supabase.storage
      .from("avatars")
      .getPublicUrl(path);
    const publicUrl = `${urlData.publicUrl}?t=${Date.now()}`;

    setAvatarUrl(publicUrl);
    setUploading(false);
  }

  function handleRemoveAvatar() {
    setAvatarUrl("");
    setUploadError("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function addLink(label: string = "") {
    if (externalLinks.length >= 5) {
      setError("Maximum 5 liens externes.");
      return;
    }
    setExternalLinks([...externalLinks, { label, url: "" }]);
  }

  function updateLink(index: number, field: "label" | "url", value: string) {
    const updated = [...externalLinks];
    updated[index] = { ...updated[index], [field]: value };
    setExternalLinks(updated);
  }

  function removeLink(index: number) {
    setExternalLinks(externalLinks.filter((_, i) => i !== index));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess(false);

    // Validation client : on retire les liens vides (label OU url vide)
    const cleanLinks = externalLinks.filter(
      (l) => l.label.trim() && l.url.trim()
    );

    startTransition(async () => {
      const result = await updateProfileAction({
        pseudo,
        jeu_prefere: jeuPrefere,
        bio,
        avatar_url: avatarUrl,
        is_public: isPublic,
        external_links: cleanLinks,
      });

      if (result.success) {
        setSuccess(true);
        // On masque le message success apres 3s
        setTimeout(() => setSuccess(false), 3000);
      } else {
        setError(result.error || "Erreur inconnue");
      }
    });
  }

  const inputClass =
    "w-full bg-white border border-vea-border rounded-lg px-4 py-3 text-vea-text text-sm placeholder-vea-text-dim focus:outline-none focus:border-vea-accent focus:ring-2 focus:ring-vea-accent/15 transition-all";

  const labelClass =
    "block text-xs font-semibold text-vea-text-muted uppercase tracking-wider mb-1.5";

  const bioCharsLeft = 280 - bio.length;

  return (
    <form onSubmit={handleSubmit} className="card-clean p-6 space-y-5">
      <div className="flex items-start gap-4 mb-2">
        {/* Preview avatar */}
        <div className="shrink-0 w-16 h-16 rounded-full bg-vea-accent-soft border border-vea-accent/20 flex items-center justify-center overflow-hidden">
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={avatarUrl}
              alt="Avatar"
              className="w-full h-full object-cover"
              onError={(e) => {
                // Si URL casse, on cache l'image (fallback = pastille lettre)
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />
          ) : (
            <span className="text-vea-accent text-xl font-bold">
              {(pseudo || "J")[0].toUpperCase()}
            </span>
          )}
        </div>

        <div className="flex-1">
          <h3 className="text-base font-bold text-vea-text mb-1">
            Mon profil joueur
          </h3>
          <p className="text-xs text-vea-text-muted leading-snug">
            Personnalise comment tu apparais sur la page{" "}
            <span className="font-semibold">/joueurs</span>. Tout est optionnel.
          </p>
        </div>
      </div>

      {/* Pseudo — autocomplete="off" pour empecher Chrome de proposer un mot de
          passe genere a la place du pseudo (bug recurrent du gestionnaire de mdp) */}
      <div>
        <label htmlFor="pseudo" className={labelClass}>
          Pseudo gaming
        </label>
        <input
          type="text"
          id="pseudo"
          name="pseudo-gaming-vea"
          value={pseudo}
          onChange={(e) => setPseudo(e.target.value)}
          maxLength={40}
          autoComplete="off"
          data-form-type="other"
          className={inputClass}
          placeholder="Ex : Velito_Adv"
        />
      </div>

      {/* Jeu préféré */}
      <div>
        <label htmlFor="jeu_prefere" className={labelClass}>
          Jeu favori
        </label>
        <input
          type="text"
          id="jeu_prefere"
          value={jeuPrefere}
          onChange={(e) => setJeuPrefere(e.target.value)}
          maxLength={60}
          className={inputClass}
          placeholder="Ex : Valorant, NBA 2K, FC25..."
        />
      </div>

      {/* Bio */}
      <div>
        <label htmlFor="bio" className={labelClass}>
          Bio courte
        </label>
        <textarea
          id="bio"
          value={bio}
          onChange={(e) => setBio(e.target.value.slice(0, 280))}
          maxLength={280}
          rows={3}
          className={`${inputClass} resize-none`}
          placeholder="Une phrase qui te decrit. 280 caracteres max."
        />
        <p className="text-[10px] text-vea-text-dim text-right mt-1">
          {bioCharsLeft} caracteres restants
        </p>
      </div>

      {/* Photo de profil — UPLOAD direct via Supabase Storage
          Bucket "avatars", path = {user_id}/avatar.{ext}, public read.
          RLS storage.objects autorise INSERT/UPDATE/DELETE seulement sur ses propres fichiers. */}
      <div>
        <label className={labelClass}>Photo de profil</label>
        <div className="flex items-center gap-4">
          {/* Preview avatar circulaire (96x96) */}
          <div className="shrink-0 w-24 h-24 rounded-full bg-vea-accent-soft border-2 border-vea-accent/20 flex items-center justify-center overflow-hidden">
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={avatarUrl}
                alt="Preview avatar"
                className="w-full h-full object-cover"
                onError={() => setUploadError("Image illisible.")}
              />
            ) : (
              <span className="text-3xl font-black text-vea-accent">
                {(pseudo || initialPseudo || "J")[0].toUpperCase()}
              </span>
            )}
          </div>

          <div className="flex-1 space-y-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              onChange={handleFileSelect}
              disabled={uploading}
              className="block w-full text-xs text-vea-text-muted
                file:mr-3 file:py-2 file:px-4
                file:rounded-lg file:border-0
                file:bg-vea-accent file:text-white
                file:text-xs file:font-semibold file:uppercase file:tracking-wider
                file:cursor-pointer file:hover:bg-vea-accent-hover
                disabled:opacity-50 disabled:cursor-not-allowed"
            />
            {uploading && (
              <p className="text-xs text-vea-accent italic">Upload en cours...</p>
            )}
            {avatarUrl && !uploading && (
              <button
                type="button"
                onClick={handleRemoveAvatar}
                className="text-xs text-vea-text-dim hover:text-vea-accent underline"
              >
                Retirer la photo
              </button>
            )}
            <p className="text-[10px] text-vea-text-dim italic">
              PNG, JPEG, WebP ou GIF. 2 MB max.
            </p>
          </div>
        </div>
        {uploadError && (
          <div className="mt-2 border border-vea-accent/30 bg-vea-accent-soft rounded-lg px-3 py-2 text-xs text-vea-accent">
            {uploadError}
          </div>
        )}
      </div>

      {/* Liens externes (Discord, Twitch, etc.) - SEPARE de la photo */}
      <div className="border-t border-vea-border pt-5">
        <label className={labelClass}>
          Mes liens externes
        </label>
        <p className="text-[11px] text-vea-text-dim mb-3 italic">
          Tes profils Discord, Twitch, Instagram... visibles sur ta fiche /joueurs.
          5 liens max.
        </p>

        {externalLinks.length === 0 && (
          <p className="text-xs text-vea-text-muted text-center py-3 italic">
            Aucun lien externe ajoute pour le moment.
          </p>
        )}

        {externalLinks.map((link, i) => (
          // 19/05/2026 : ratio ajuste 30% titre / 70% url (user demande -
          // avant le titre prenait trop de place et l'url etait riquiqui).
          // min-w-0 sur les inputs pour eviter qu'ils debordent en mobile.
          <div key={i} className="flex gap-2 mb-2 items-center">
            <input
              type="text"
              value={link.label}
              onChange={(e) => updateLink(i, "label", e.target.value)}
              maxLength={30}
              className={`${inputClass} basis-[30%] min-w-0`}
              placeholder="Ex : Discord"
            />
            <input
              type="url"
              value={link.url}
              onChange={(e) => updateLink(i, "url", e.target.value)}
              maxLength={500}
              className={`${inputClass} basis-[70%] flex-1 min-w-0`}
              placeholder="https://..."
            />
            <button
              type="button"
              onClick={() => removeLink(i)}
              className="shrink-0 px-2 text-vea-text-dim hover:text-vea-accent text-xl leading-none"
              aria-label="Supprimer ce lien"
            >
              ×
            </button>
          </div>
        ))}

        {/* Presets : boutons rapides pour ajouter Discord/Twitch/etc. */}
        {externalLinks.length < 5 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {PRESET_LINK_LABELS.map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => addLink(preset)}
                disabled={externalLinks.some((l) => l.label === preset)}
                className="text-xs px-3 py-1.5 border border-vea-border rounded-full text-vea-text-muted hover:border-vea-accent hover:text-vea-accent disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                + {preset}
              </button>
            ))}
            <button
              type="button"
              onClick={() => addLink("")}
              className="text-xs px-3 py-1.5 border border-vea-border rounded-full text-vea-text-muted hover:border-vea-accent hover:text-vea-accent transition-all"
            >
              + Autre
            </button>
          </div>
        )}
      </div>

      {/* Toggle public */}
      <div className="border-t border-vea-border pt-5">
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={isPublic}
            onChange={(e) => setIsPublic(e.target.checked)}
            className="mt-1 w-4 h-4 accent-vea-accent cursor-pointer"
          />
          <div className="flex-1">
            <span className="block text-sm font-semibold text-vea-text">
              Apparaitre sur la page /joueurs
            </span>
            <span className="block text-xs text-vea-text-muted leading-snug mt-0.5">
              Si coche, ton pseudo, jeu favori, bio et avatar sont visibles
              publiquement. Sinon, ton profil reste prive (toi seul le vois).
            </span>
          </div>
        </label>
      </div>

      {/* Feedback */}
      {error && (
        <div className="border border-vea-accent/30 bg-vea-accent-soft rounded-lg px-4 py-3 text-sm text-vea-accent">
          {error}
        </div>
      )}
      {success && (
        <div className="border border-green-300 bg-green-50 rounded-lg px-4 py-3 text-sm text-green-700">
          Profil mis a jour avec succes.
        </div>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="btn-primary w-full disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {isPending ? "Sauvegarde..." : "Sauvegarder mon profil"}
      </button>
    </form>
  );
}
