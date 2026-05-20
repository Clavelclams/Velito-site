/**
 * Server Actions — Toggle notif_events_active sur le participant courant.
 *
 * Permet au user connecte d'activer/desactiver ses notifications d'events
 * depuis /profil. La valeur est stockee dans vea.participants.notif_events_active.
 *
 * Quand TRUE : a chaque INSERT dans vea.evenements, le trigger
 * `trigger_notify_new_event` cree une notif dans vea.notifications.
 * Quand FALSE : le user ne recoit plus de notif auto pour les nouveaux events.
 *
 * Note : ne touche PAS aux notifs deja existantes. C'est juste pour les
 * futures notifs.
 */
"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

interface ToggleResult {
  success: boolean;
  error?: string;
  newValue?: boolean;
}

export async function toggleNotifEventsAction(
  newValue: boolean
): Promise<ToggleResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: "Non connecte." };
  }

  const { error } = await supabase
    .schema("vea")
    .from("participants")
    .update({ notif_events_active: newValue })
    .eq("user_id", user.id);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/profil");
  return { success: true, newValue };
}
