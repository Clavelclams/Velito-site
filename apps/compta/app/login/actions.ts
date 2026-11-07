/**
 * [07/11/2026] La connexion se fait désormais par le hub (« Se connecter avec
 * Velito », voir page.tsx) : seConnecterAction a été retirée, il ne reste que
 * la déconnexion. Historique ci-dessous conservé pour le jury.
 *
 * Server actions de /login — adaptées de apps/hub/src/app/login/actions.ts.
 *
 * Une server action = une fonction qui s'exécute UNIQUEMENT côté serveur,
 * appelable depuis un composant client comme une fonction normale. Next.js
 * transporte l'appel en HTTP tout seul. Avantage sécurité : la logique
 * d'authentification et les messages d'erreur détaillés ne partent jamais
 * dans le bundle navigateur.
 *
 * Différences avec le hub, assumées :
 *  - pas de hCaptcha : projet Supabase dédié, bot protection désactivée,
 *    et l'outil est mono-utilisateur derrière un middleware default-deny.
 *    (Si on active la protection Supabase plus tard, on reprend le pattern hub.)
 *  - pas de returnTo : Compta n'a qu'une destination après login, l'accueil.
 *    Pas de paramètre d'URL → pas de risque d'open redirect du tout.
 *
 * Leçons du hub CONSERVÉES :
 *  - message générique "Identifiants invalides" : ne jamais révéler si
 *    l'email existe (anti-énumération de comptes) ;
 *  - cas 429 (rate limit) traité À PART : dire "identifiants invalides"
 *    pousserait l'utilisateur à retaper son mot de passe en boucle et à
 *    entretenir le blocage.
 */
"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function seDeconnecterAction(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
