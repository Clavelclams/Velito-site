/**
 * Page /arena : redirige vers ARENA (arena.velito.fr).
 *
 * 19/05/2026 : redirigeait vers la page « en construction » du hub.
 * 12/11/2026 : ARENA est en ligne (tournois, classement, espace joueur),
 * on envoie directement dessus. La route /arena est gardée pour que les
 * anciens liens et favoris continuent de marcher.
 */
import { redirect } from "next/navigation";
import { getArenaUrl } from "@/lib/hub-url";

export default function ArenaRedirect() {
  redirect(getArenaUrl());
}
