/**
 * Page /login — Server Component.
 *
 * Le middleware redirige déjà les utilisateurs connectés qui visitent /login,
 * mais on revérifie ici (défense en profondeur : une page ne suppose jamais
 * qu'un étage au-dessus a fait le travail).
 *
 * Repris de apps/compta (mêmes patterns, mêmes raisons) : espace personnel,
 * connexion avec le compte Velito existant, pas de page d'inscription.
 */
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import LoginForm from "./LoginForm";

export default async function LoginPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/");
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 px-4">
      <div className="text-center">
        <h1 className="text-3xl font-bold">Velito Cours</h1>
        <p className="mt-1 text-sm text-cours-text-muted">
          Révision CDA — espace personnel
        </p>
      </div>
      <LoginForm />
    </main>
  );
}
