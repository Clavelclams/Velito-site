/**
 * Page /arena — redirect vers la page construction du hub Velito.
 *
 * 19/05/2026 : avant on avait un placeholder local "en construction" dupliquant
 * la page du hub. Maintenant on redirige vers
 * https://velito.com/construction?slug=arena qui centralise tous les modules
 * pas encore prets (Arena, modules VENA, etc.) avec une UX coherente
 * et un seul endroit a maintenir.
 *
 * Quand arena.velito.com sera deploye, changer ce redirect pour pointer vers
 * https://arena.velito.com directement.
 */
import { redirect } from "next/navigation";
import { getConstructionUrl } from "@/lib/hub-url";

export default function ArenaRedirect() {
  // URL dynamique : localhost en dev, velito.com en prod
  // (cf lib/hub-url.ts + var env NEXT_PUBLIC_HUB_URL).
  redirect(getConstructionUrl("arena"));
}
