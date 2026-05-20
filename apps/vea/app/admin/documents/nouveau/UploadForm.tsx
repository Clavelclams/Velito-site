/**
 * UploadForm — Client Component pour uploader un document
 *
 * Workflow :
 *   1. User sélectionne un fichier (input file) — preview du nom + taille
 *   2. User remplit nom, type, participant concerné, description
 *   3. Submit :
 *      a) Upload du fichier vers Supabase Storage (bucket vea-documents)
 *      b) Si OK, call Server Action uploadDocumentAction avec le storage_path
 *      c) Si OK, redirect vers la liste avec message success
 *
 * On uploade côté client (au lieu de Server Action avec FormData) pour :
 *   - Voir la progress de l'upload
 *   - Avoir un seul round-trip réseau (au lieu de client → server → storage)
 *   - Bypass la limite 1MB des Server Actions de Next.js
 */
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient as createBrowserClient } from "@/lib/supabase/client";
import { uploadDocumentAction, type DocumentType } from "../actions";

interface ParticipantOption {
  id: string;
  prenom: string;
  nom: string;
  est_mineur: boolean | null;
}

interface UploadFormProps {
  participants: ParticipantOption[];
}

const TYPES: { value: DocumentType; label: string; description: string }[] = [
  { value: "ticket", label: "Ticket", description: "Ticket de caisse, reçu d'achat" },
  { value: "facture", label: "Facture", description: "Facture fournisseur, prestation" },
  { value: "justificatif", label: "Justificatif", description: "Justificatif de dépense divers" },
  { value: "peage", label: "Péage / transport", description: "Ticket péage, billet train, essence" },
  { value: "courrier", label: "Courrier", description: "Courrier officiel (préfecture, banque, etc.)" },
  { value: "contrat", label: "Contrat", description: "Contrat, convention, accord" },
  { value: "autre", label: "Autre", description: "Tout ce qui ne rentre pas ailleurs" },
];

function sanitizeFilename(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9.\-_]/g, "_")
    .slice(0, 100);
}

function displayName(p: ParticipantOption): string {
  if (p.est_mineur) {
    return `${p.prenom} ${(p.nom ?? "").charAt(0).toUpperCase()}.`;
  }
  return `${p.prenom} ${p.nom}`;
}

export default function UploadForm({ participants }: UploadFormProps) {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [nom, setNom] = useState("");
  const [type, setType] = useState<DocumentType>("ticket");
  const [participantId, setParticipantId] = useState<string>("");
  const [description, setDescription] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) {
      setFile(f);
      if (!nom.trim()) {
        // Pré-remplir le nom à partir du fichier (sans extension)
        const noExt = f.name.replace(/\.[^.]+$/, "");
        setNom(noExt.slice(0, 80));
      }
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!file) {
      setError("Choisis un fichier à uploader.");
      return;
    }
    if (!nom.trim()) {
      setError("Le nom du document est requis.");
      return;
    }
    // 10 Mo max (limite Supabase free)
    if (file.size > 10 * 1024 * 1024) {
      setError("Fichier trop gros (max 10 Mo).");
      return;
    }

    setProgress(10);
    const supabase = createBrowserClient();

    // Récupérer l'user actuel pour le préfixe storage
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setError("Pas connecté.");
      return;
    }

    // Path = user_id/timestamp-filename
    const ts = Date.now();
    const safeName = sanitizeFilename(file.name);
    const storagePath = `${user.id}/${ts}-${safeName}`;

    setProgress(30);

    // Upload Storage
    const { error: uploadError } = await supabase.storage
      .from("vea-documents")
      .upload(storagePath, file, {
        cacheControl: "3600",
        upsert: false,
      });

    if (uploadError) {
      setError(`Upload échoué : ${uploadError.message}`);
      setProgress(0);
      return;
    }

    setProgress(70);

    // Insert row via Server Action
    startTransition(async () => {
      const result = await uploadDocumentAction({
        nom,
        type,
        participant_id: participantId || null,
        description,
        file_path: storagePath,
        mime_type: file.type || "application/octet-stream",
        taille_octets: file.size,
      });

      if (!result.success) {
        setError(result.error ?? "Erreur inconnue");
        setProgress(0);
        // Si l'INSERT a échoué, on supprime le fichier orphelin
        await supabase.storage.from("vea-documents").remove([storagePath]);
        return;
      }

      setProgress(100);
      router.push("/admin/documents");
      router.refresh();
    });
  }

  // Filtrage participants
  const filteredParticipants = searchQuery.trim()
    ? participants.filter((p) => {
        const q = searchQuery.toLowerCase();
        return (
          p.prenom.toLowerCase().includes(q) ||
          (p.nom ?? "").toLowerCase().includes(q)
        );
      })
    : participants;

  const inputClass =
    "w-full bg-white border border-vea-border rounded-lg px-4 py-3 text-vea-text text-sm placeholder-vea-text-dim focus:outline-none focus:border-vea-accent focus:ring-2 focus:ring-vea-accent/15 transition-all";
  const labelClass =
    "block text-xs font-semibold text-vea-text-muted uppercase tracking-wider mb-1.5";

  const selectedParticipant = participants.find((p) => p.id === participantId);

  return (
    <form onSubmit={handleSubmit} className="card-clean p-6 space-y-5">
      {/* Fichier */}
      <div>
        <label htmlFor="file" className={labelClass}>
          Fichier <span className="text-vea-accent">*</span>
        </label>
        <input
          type="file"
          id="file"
          onChange={handleFileChange}
          accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
          className={inputClass + " file:mr-3 file:px-3 file:py-1 file:rounded file:border-0 file:bg-vea-accent file:text-white file:text-xs file:font-bold file:cursor-pointer"}
        />
        {file && (
          <p className="text-[10px] text-vea-text-muted mt-1 italic">
            {file.name} · {(file.size / 1024).toFixed(1)} Ko · {file.type || "type inconnu"}
          </p>
        )}
        <p className="text-[10px] text-vea-text-dim mt-1">
          PDF, image (JPG/PNG/WebP), Word, Excel. Max 10 Mo.
        </p>
      </div>

      {/* Nom */}
      <div>
        <label htmlFor="nom" className={labelClass}>
          Nom du document <span className="text-vea-accent">*</span>
        </label>
        <input
          type="text"
          id="nom"
          value={nom}
          onChange={(e) => setNom(e.target.value.slice(0, 200))}
          maxLength={200}
          className={inputClass}
          placeholder="Ex : Ticket Game Cash 15/05/2026"
        />
      </div>

      {/* Type */}
      <div>
        <label htmlFor="type" className={labelClass}>
          Type
        </label>
        <select
          id="type"
          value={type}
          onChange={(e) => setType(e.target.value as DocumentType)}
          className={inputClass}
        >
          {TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label} — {t.description}
            </option>
          ))}
        </select>
      </div>

      {/* Participant concerné */}
      <div>
        <label htmlFor="search-participant" className={labelClass}>
          Personne concernée (optionnel)
        </label>
        <input
          type="text"
          id="search-participant"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className={inputClass}
          placeholder="Tapez prénom ou nom pour chercher..."
        />
        {searchQuery.trim() && (
          <div className="mt-2 max-h-40 overflow-y-auto border border-vea-border rounded-lg">
            {filteredParticipants.length === 0 ? (
              <p className="text-xs text-vea-text-dim italic p-3 text-center">
                Aucun membre trouvé
              </p>
            ) : (
              filteredParticipants.slice(0, 10).map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => {
                    setParticipantId(p.id);
                    setSearchQuery("");
                  }}
                  className={`w-full text-left px-3 py-2 text-xs border-b border-vea-border last:border-0 hover:bg-vea-bg ${
                    participantId === p.id ? "bg-vea-accent-soft text-vea-accent font-semibold" : "text-vea-text"
                  }`}
                >
                  {displayName(p)}
                </button>
              ))
            )}
          </div>
        )}
        {selectedParticipant && (
          <div className="mt-2 flex items-center gap-2">
            <span className="text-[10px] uppercase tracking-widest font-bold px-2 py-1 rounded bg-vea-accent-soft text-vea-accent">
              {displayName(selectedParticipant)}
            </span>
            <button
              type="button"
              onClick={() => setParticipantId("")}
              className="text-[10px] uppercase tracking-widest text-vea-text-dim hover:text-vea-accent"
            >
              retirer
            </button>
          </div>
        )}
        <p className="text-[10px] text-vea-text-dim mt-1 italic">
          Si le doc concerne une personne précise (ex: ticket dépense remboursable à Maya).
        </p>
      </div>

      {/* Description */}
      <div>
        <label htmlFor="description" className={labelClass}>
          Description / contexte
        </label>
        <textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value.slice(0, 1000))}
          maxLength={1000}
          rows={3}
          className={inputClass}
          placeholder="Ex : Achat manettes Xbox pour Tour du Marais 12/05/2026, à rembourser sur trésorerie..."
        />
      </div>

      {/* Progress */}
      {progress > 0 && progress < 100 && (
        <div className="bg-vea-accent-soft border border-vea-accent/20 rounded-lg p-3">
          <div className="flex justify-between text-xs mb-1">
            <span className="text-vea-text font-semibold">Upload en cours...</span>
            <span className="text-vea-accent font-bold">{progress}%</span>
          </div>
          <div className="w-full bg-white rounded-full h-2 overflow-hidden">
            <div
              className="bg-vea-accent h-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Erreur */}
      {error && (
        <div className="border border-vea-accent/30 bg-vea-accent-soft rounded-lg px-4 py-3 text-sm text-vea-accent">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={isPending || !file}
        className="btn-primary w-full disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {isPending ? "Envoi en cours..." : "Uploader le document"}
      </button>
    </form>
  );
}
