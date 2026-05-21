/**
 * Supabase client — usage NAVIGATEUR ("use client").
 *
 * Clé : NEXT_PUBLIC_SUPABASE_ANON_KEY (publique). Respecte la RLS.
 * Utilisé par le formulaire de login admin VENA.
 */
import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
