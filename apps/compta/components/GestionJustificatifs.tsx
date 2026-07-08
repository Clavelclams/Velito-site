"use client";

/**
 * Gestion des justificatifs d'une transaction — composant CLIENT.
 *
 * L'upload part directement du NAVIGATEUR vers Supabase Storage (la RLS
 * Storage autorise seulement les fichiers de mes entités). Puis on enregistre
 * les métadonnées via une server action (qui revalide type/taille et le
 * chemin). La consultation passe par une URL signée courte (bucket privé).
 *
 * Le fichier ne transite jamais par nos server actions : l'upload navigateur
 * → Storage est direct, plus léger et supporte les gros fichiers.
 */
import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Justificatif } from "@/types/database";
import { createClient } from "@/lib/supabase/client";
import { validerFichier, construireCheminStockage } from "@/lib/services/justificatifs";
import {
  enregistrerJustificatifAction,
  urlSigneeJustificatifAction,
  supprimerJustificatifAction,
} from "@/app/[entiteId]/transactions/[id]/actions";

const BUCKET = "justificatifs";

/** Octets → "345 Ko" / "1,2 Mo" (affichage). */
function formaterTaille(octets: number | null): string {
  if (!octets) return "";
  if (octets < 1024 * 1024) return `${Math.round(octets / 1024)} Ko`;
  return `${(octets / 1024 / 1024).toFixed(1).replace(".", ",")} Mo`;
}

export function GestionJustificatifs({
  entiteId,
  transactionId,
  justificatifs,
}: {
  entiteId: string;
  transactionId: string;
  justificatifs: Justificatif[];
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, demarrer] = useTransition();

  function choisirFichier(e: React.ChangeEvent<HTMLInputElement>) {
    const fichier = e.target.files?.[0];
    if (inputRef.current) inputRef.current.value = ""; // permet de re-choisir le même
    if (!fichier) return;
    setErreur(null);

    const validation = validerFichier({ type: fichier.type, taille: fichier.size });
    if (!validation.ok) {
      setErreur(validation.erreurs[0]!);
      return;
    }

    demarrer(async () => {
      const chemin = construireCheminStockage(entiteId, transactionId, fichier.name);
      const supabase = createClient();

      const { error: erreurUpload } = await supabase.storage
        .from(BUCKET)
        .upload(chemin, fichier, { contentType: fichier.type, upsert: false });
      if (erreurUpload) {
        setErreur(`Upload impossible : ${erreurUpload.message}`);
        return;
      }

      const r = await enregistrerJustificatifAction(entiteId, transactionId, {
        chemin,
        nom: fichier.name,
        type: fichier.type,
        taille: fichier.size,
      });
      if (!r.success) {
        setErreur(r.error ?? "Enregistrement impossible.");
        return;
      }
      router.refresh();
    });
  }

  async function voir(id: string) {
    setErreur(null);
    const r = await urlSigneeJustificatifAction(id);
    if (r.url) window.open(r.url, "_blank", "noopener,noreferrer");
    else setErreur(r.error ?? "Consultation impossible.");
  }

  function supprimer(id: string) {
    if (!window.confirm("Supprimer ce justificatif ?")) return;
    setErreur(null);
    demarrer(async () => {
      const r = await supprimerJustificatifAction(entiteId, transactionId, id);
      if (r.success) router.refresh();
      else setErreur(r.error ?? "Suppression impossible.");
    });
  }

  return (
    <div className="space-y-3 rounded-lg border border-compta-border bg-compta-surface p-5">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Justificatifs</h3>
        <label className="cursor-pointer rounded-md border border-compta-border px-3 py-1.5 text-sm transition-colors hover:bg-compta-bg">
          {enCours ? "Envoi…" : "+ Ajouter"}
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,application/pdf"
            onChange={choisirFichier}
            disabled={enCours}
            className="hidden"
          />
        </label>
      </div>

      {justificatifs.length === 0 ? (
        <p className="text-sm text-compta-text-muted">
          Aucune pièce jointe. Ajoute une photo de ticket ou une facture (JPEG,
          PNG, WebP ou PDF, 10 Mo max).
        </p>
      ) : (
        <ul className="divide-y divide-compta-border">
          {justificatifs.map((j) => (
            <li key={j.id} className="flex items-center justify-between py-2 text-sm">
              <span className="truncate">
                {j.nom_fichier}
                <span className="ml-2 text-xs text-compta-text-muted">
                  {formaterTaille(j.taille_octets)}
                </span>
              </span>
              <span className="flex shrink-0 items-center gap-3">
                <button
                  type="button"
                  onClick={() => voir(j.id)}
                  className="text-xs text-compta-accent hover:underline"
                >
                  Voir
                </button>
                <button
                  type="button"
                  onClick={() => supprimer(j.id)}
                  disabled={enCours}
                  className="text-xs text-compta-depense hover:underline disabled:opacity-50"
                >
                  Supprimer
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}

      {erreur && (
        <p className="text-sm text-compta-depense" role="alert">
          {erreur}
        </p>
      )}
    </div>
  );
}
