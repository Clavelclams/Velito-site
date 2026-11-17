/**
 * Lecture d'un défi (17/11/2026). Serveur uniquement (service_role) : les
 * tables du défi n'ont aucun droit pour anon / authenticated (migration
 * 015). L'écran passe par le token non devinable, le staff par l'id APRÈS
 * contrôle d'appartenance à son organisation.
 */
import { getServiceClient } from "../supabase/service";
import type { Defi, EquipeDefi, RotationDefi } from "./defi";

export interface DefiComplet {
  defi: Defi & { organisation_id: string };
  rotations: RotationDefi[];
  equipes: EquipeDefi[];
}

const COLS_DEFI = "id, organisation_id, titre, unite, token, duree_manche_s, rotation_courante_id";

async function completer(defi: DefiComplet["defi"] | null): Promise<DefiComplet | null> {
  if (!defi) return null;
  const db = getServiceClient();
  const [{ data: rotations, error: e1 }, { data: equipes, error: e2 }] = await Promise.all([
    db.schema("arena").from("defi_rotations")
      .select("id, numero, heure, statut, phase, chrono_debut, chrono_fin, valide_le")
      .eq("defi_id", defi.id).order("numero"),
    db.schema("arena").from("defi_equipes")
      .select("id, rotation_id, couleur, score")
      .eq("defi_id", defi.id),
  ]);
  if (e1 || e2) throw new Error("Lecture du défi impossible.");
  return { defi, rotations: (rotations ?? []) as RotationDefi[], equipes: (equipes ?? []) as EquipeDefi[] };
}

export async function chargerDefiParToken(token: string): Promise<DefiComplet | null> {
  if (!/^[0-9a-f-]{36}$/i.test(token)) return null;
  const { data } = await getServiceClient().schema("arena").from("defis")
    .select(COLS_DEFI).eq("token", token).maybeSingle();
  return completer(data as DefiComplet["defi"] | null);
}

export async function chargerDefiParId(id: string): Promise<DefiComplet | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const { data } = await getServiceClient().schema("arena").from("defis")
    .select(COLS_DEFI).eq("id", id).maybeSingle();
  return completer(data as DefiComplet["defi"] | null);
}
