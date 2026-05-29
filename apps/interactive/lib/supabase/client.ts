/**
 * Supabase client — NAVIGATEUR ("use client").
 *
 * C'est CE client qui porte le temps réel (Realtime) : la TV (/host) et les
 * manettes (/play) s'abonnent à un channel Supabase = une "room" de session.
 * Clé publique anon, la RLS protège les données.
 */
import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
