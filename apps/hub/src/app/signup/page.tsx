/**
 * /signup — Page d'inscription Velito (hub.velito.fr).
 *
 * Création de compte avec email + mot de passe (Supabase Auth).
 * Après submit, Supabase envoie un email de confirmation à l'user.
 * L'user clique sur le lien → son compte est activé → il peut login.
 *
 * Pas de signup OAuth/Google pour l'instant — V1 = email/password.
 */
import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import SignupForm from "./SignupForm";

export const metadata: Metadata = {
  title: "Inscription — Velito",
  description:
    "Crée ton compte Velito : un seul compte pour Hub, Interactive, Arena, Prévention.",
};

export default function SignupPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-6 py-12">
      <div className="w-full">
        <header className="text-center">
          <p className="text-xs uppercase tracking-[0.3em] text-white/40">
            Velito
          </p>
          <h1 className="neon-title mt-3 text-3xl font-bold">
            Crée ton compte
          </h1>
          <p className="mt-2 text-sm text-white/60">
            Un seul compte pour tout l&apos;écosystème Velito : Hub, Interactive,
            Arena, Prévention.
          </p>
        </header>

        <div className="card-ink mt-8 p-6">
          <Suspense fallback={<div className="h-64" aria-hidden="true" />}>
            <SignupForm />
          </Suspense>
        </div>

        <p className="mt-6 text-center text-[11px] text-white/40">
          En t&apos;inscrivant tu acceptes nos{" "}
          <Link href="/" className="underline-offset-4 hover:text-white hover:underline">
            conditions d&apos;utilisation
          </Link>{" "}
          et notre{" "}
          <Link href="/" className="underline-offset-4 hover:text-white hover:underline">
            politique de confidentialité
          </Link>
          .
        </p>
      </div>
    </main>
  );
}
