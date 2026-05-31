/**
 * UserMenuSlot — Server Component qui lit la session utilisateur côté serveur
 * et passe au UserMenu (client component).
 *
 * Pourquoi ce wrapper côté Interactive :
 *  - Le composant <UserMenu> de @repo/ui est universel mais a besoin du user
 *    en props (il ne fait pas de fetch lui-même → composant léger réutilisable)
 *  - Chaque app du monorepo a sa propre instance Supabase (cookies SSR), donc
 *    chaque app crée son propre slot serveur qui lit le user
 *
 * Comportement :
 *  - Lit le user via supabase.auth.getUser() au runtime (le cookie .velito.fr
 *    est posé par hub.velito.fr/login, vu par interactive.velito.fr grâce au
 *    Domain=.velito.fr du middleware)
 *  - Si succès → user passé au UserMenu (avatar + dropdown)
 *  - Si échec ou pas de session → null (UserMenu affichera "Continuer avec VENA")
 *  - Jamais de crash : on attrape les erreurs (Supabase down par ex) et on
 *    bascule en mode déconnecté plutôt que de crasher le header
 */
import { UserMenu } from "@repo/ui/user-menu";
import { createClient } from "@/lib/supabase/server";

interface UserMenuSlotProps {
  className?: string;
}

export default async function UserMenuSlot({ className }: UserMenuSlotProps) {
  let user: { email: string; name?: string; avatarUrl?: string } | null = null;

  try {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    if (data.user?.email) {
      user = {
        email: data.user.email,
        name: data.user.user_metadata?.name as string | undefined,
        avatarUrl: data.user.user_metadata?.picture as string | undefined,
      };
    }
  } catch (e) {
    // Pas grave : on continue en mode déconnecté.
    // Logger discret (pas console.error pour éviter de polluer Vercel logs)
    console.warn("[UserMenuSlot/interactive] auth check failed:", e);
  }

  const hubUrl = process.env.NEXT_PUBLIC_HUB_URL;

  return <UserMenu user={user} hubUrl={hubUrl} className={className} />;
}
