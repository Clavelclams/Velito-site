/**
 * Server Actions pour /profil — edition du profil joueur VEA.
 *
 * Pourquoi un fichier separe :
 *   - "use server" doit etre au top du fichier (ou de chaque export)
 *   - Server Component (page.tsx) ne peut pas exporter directement des actions
 *   - On garde page.tsx focus sur le rendu, actions.ts focus sur les mutations
 *
 * Securite :
 *   - On lit user via createClient().auth.getUser() server-side (cookies HTTP-only)
 *   - RLS policy "vea_participants_update_own" filtre user_id = auth.uid()
 *   - Donc impossible de modifier le profil d'un autre user, meme en bidouillant
 *
 * Comportement upsert :
 *   - Si l'user est un ex-licencie Yapla -> participant existe deja (lie par trigger)
 *     -> UPDATE pseudo/jeu_prefere/bio/avatar_url/is_public
 *   - Si l'user est nouveau (signup direct sans match Yapla) -> participant n'existe pas
 *     -> INSERT INTO vea.participants avec valeurs minimales (prenom/nom depuis profile shared.users)
 *
 * revalidatePath('/profil') force Next.js a refetch les Server Components apres save.
 */
"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { JEUX, JEUX_MAX } from "@/lib/jeux";

export interface UpdateProfileResult {
  success: boolean;
  error?: string;
}

export interface ExternalLinkInput {
  label: string;
  url: string;
}

export interface UpdateProfileInput {
  pseudo: string;
  jeu_prefere: string;
  bio: string;
  avatar_url: string;
  is_public: boolean;
  external_links: ExternalLinkInput[];
  jeux_competition: string[];
  dispo_competition: boolean;
}

export async function updateProfileAction(
  input: UpdateProfileInput
): Promise<UpdateProfileResult> {
  const supabase = await createClient();

  // 1) Recuperer le user authentifie (server-side, via cookies)
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Non connecte." };
  }

  // 2) Validation cote serveur (defense en profondeur — le client valide aussi)
  const pseudo = (input.pseudo ?? "").trim().slice(0, 40);
  const jeu_prefere = (input.jeu_prefere ?? "").trim().slice(0, 60);
  const bio = (input.bio ?? "").trim().slice(0, 280);
  const avatar_url = (input.avatar_url ?? "").trim().slice(0, 500);
  const is_public = Boolean(input.is_public);

  // Validation URL avatar : doit etre vide OU commencer par http(s)://
  if (avatar_url && !/^https?:\/\//.test(avatar_url)) {
    return {
      success: false,
      error: "L'URL photo de profil doit commencer par http:// ou https://",
    };
  }

  // Validation external_links : max 5 liens, chaque {label, url} valide
  const rawLinks = Array.isArray(input.external_links) ? input.external_links : [];
  if (rawLinks.length > 5) {
    return { success: false, error: "Maximum 5 liens externes." };
  }
  const external_links: ExternalLinkInput[] = [];
  for (const link of rawLinks) {
    const label = (link?.label ?? "").trim().slice(0, 30);
    const url = (link?.url ?? "").trim().slice(0, 500);
    if (!label || !url) continue; // on ignore les paires vides (deja filtre cote client)
    if (!/^https?:\/\//.test(url)) {
      return {
        success: false,
        error: `Le lien "${label}" doit commencer par http:// ou https://`,
      };
    }
    external_links.push({ label, url });
  }

  // jeux_competition : max JEUX_MAX, uniquement des valeurs de la liste fixe
  // (filtre fiable cote admin). dispo_competition : opt-in pur boolean.
  const rawJeux = Array.isArray(input.jeux_competition) ? input.jeux_competition : [];
  const jeux_competition = [...new Set(rawJeux.filter((j) => JEUX.includes(j)))].slice(0, JEUX_MAX);
  const dispo_competition = Boolean(input.dispo_competition);

  // 3) Verifier si une fiche participant existe deja pour ce user_id
  const { data: existing } = await supabase
    .schema("vea")
    .from("participants")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (existing) {
    // Cas standard : UPDATE de la fiche existante (ex-licencie Yapla ou
    // nouveau qui a deja edite son profil une premiere fois).
    const { error: updateError } = await supabase
      .schema("vea")
      .from("participants")
      .update({
        pseudo: pseudo || null,
        jeu_prefere: jeu_prefere || null,
        bio: bio || null,
        avatar_url: avatar_url || null,
        is_public,
        external_links,
        jeux_competition,
        dispo_competition,
      })
      .eq("user_id", user.id);

    if (updateError) {
      return { success: false, error: updateError.message };
    }
  } else {
    // Cas nouveau user : pas encore de fiche participant. On la cree
    // avec les infos minimales (prenom/nom depuis shared.users / metadata).
    const { data: profile } = await supabase
      .schema("shared")
      .from("users")
      .select("prenom, nom")
      .eq("id", user.id)
      .maybeSingle();

    const prenom =
      profile?.prenom ||
      (user.user_metadata?.prenom as string | undefined) ||
      "Joueur";
    const nom =
      profile?.nom || (user.user_metadata?.nom as string | undefined) || "VEA";

    const { error: insertError } = await supabase
      .schema("vea")
      .from("participants")
      .insert({
        user_id: user.id,
        email: user.email?.toLowerCase() ?? null,
        prenom,
        nom,
        role: "joueur",
        benevole_hours: 0,
        external_links,
        pseudo: pseudo || null,
        jeu_prefere: jeu_prefere || null,
        bio: bio || null,
        avatar_url: avatar_url || null,
        is_public,
        jeux_competition,
        dispo_competition,
      });

    if (insertError) {
      return { success: false, error: insertError.message };
    }
  }

  // 4) Revalidation : Next.js refetch /profil ET /joueurs pour voir les changements
  revalidatePath("/profil");
  revalidatePath("/joueurs");

  return { success: true };
}

// ============================================================================
// Server Action : updateBadgeShowcaseAction
// ============================================================================
// Toggle l'affichage de badges sur le profil public (max 3).
// Input : tableau de slugs de badges a afficher (les autres badges du user
// passent affiche_sur_profil = false). RLS verifie que c'est ses badges.
// ============================================================================

export async function updateBadgeShowcaseAction(
  showcaseSlugs: string[]
): Promise<UpdateProfileResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { success: false, error: "Non connecte." };

  // Validation : max 3 slugs, tous strings non-vides
  if (showcaseSlugs.length > 3) {
    return { success: false, error: "Maximum 3 badges en vitrine." };
  }
  const cleanSlugs = showcaseSlugs
    .filter((s) => typeof s === "string" && s.trim().length > 0)
    .map((s) => s.trim());

  // 1. Recuperer le participant_id du user
  const { data: participant } = await supabase
    .schema("vea")
    .from("participants")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!participant) {
    return { success: false, error: "Profil participant introuvable." };
  }

  // 2. Reset tous les badges affiche_sur_profil a false pour ce user
  const { error: resetError } = await supabase
    .schema("vea")
    .from("badges_joueurs")
    .update({ affiche_sur_profil: false })
    .eq("participant_id", participant.id);

  if (resetError) {
    return { success: false, error: resetError.message };
  }

  // 3. Si aucun slug a afficher, on s'arrete la
  if (cleanSlugs.length === 0) {
    revalidatePath("/profil");
    revalidatePath("/joueurs");
    return { success: true };
  }

  // 4. Recuperer les IDs des badges correspondant aux slugs
  const { data: badges } = await supabase
    .schema("vea")
    .from("badges")
    .select("id, slug")
    .in("slug", cleanSlugs);

  if (!badges || badges.length === 0) {
    return { success: false, error: "Badges introuvables." };
  }

  const badgeIds = badges.map((b) => b.id);

  // 5. Activer affiche_sur_profil = true sur les badges_joueurs correspondants
  // (RLS bloquera si ce ne sont pas les siens — defense en profondeur)
  const { error: setError } = await supabase
    .schema("vea")
    .from("badges_joueurs")
    .update({ affiche_sur_profil: true })
    .eq("participant_id", participant.id)
    .in("badge_id", badgeIds);

  if (setError) {
    return { success: false, error: setError.message };
  }

  revalidatePath("/profil");
  revalidatePath("/joueurs");
  return { success: true };
}

// ============================================================================
// Server Action : claimDotationAction
// ============================================================================
// Le user reclame une de ses dotations en attente (statut pending -> reclamee).
// Apres ca, l'admin VEA voit la demande et peut la marquer livree.
// RLS verifie que la dotation appartient bien a l'user.
// ============================================================================

export async function claimDotationAction(
  dotationId: string
): Promise<UpdateProfileResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { success: false, error: "Non connecte." };

  // Validation basique de l'UUID format
  if (!/^[0-9a-f-]{36}$/i.test(dotationId)) {
    return { success: false, error: "ID dotation invalide." };
  }

  // UPDATE : passe statut pending -> reclamee + remplit reclamee_le
  // RLS verifie que c'est bien la dotation du user
  const { error } = await supabase
    .schema("vea")
    .from("dotations_a_reclamer")
    .update({
      statut: "reclamee",
      reclamee_le: new Date().toISOString(),
    })
    .eq("id", dotationId)
    .eq("statut", "pending"); // safety : on ne passe que de pending

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/profil");
  return { success: true };
}
