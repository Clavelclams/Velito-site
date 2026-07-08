"use client";

/**
 * Formulaire de connexion — composant CLIENT ("use client").
 *
 * Pourquoi client alors qu'on privilégie les Server Components ? Parce qu'un
 * formulaire a besoin d'ÉTAT local (valeurs saisies, erreur affichée, envoi
 * en cours) et d'événements navigateur. C'est exactement le cas d'usage
 * prévu : page = serveur, îlot interactif = client.
 *
 * La soumission appelle la server action seConnecterAction : aucune logique
 * d'auth ici, le composant ne fait qu'afficher et transmettre (couche
 * présentation, rien d'autre).
 */
import { useState, useTransition } from "react";
import { seConnecterAction } from "./actions";

export default function LoginForm() {
  const [email, setEmail] = useState("");
  const [motDePasse, setMotDePasse] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);
  // useTransition suit l'exécution de la server action → désactive le
  // bouton pendant l'appel (empêche le double-submit).
  const [enCours, startTransition] = useTransition();

  function soumettre(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); // pas de rechargement de page HTML classique
    setErreur(null);
    startTransition(async () => {
      const resultat = await seConnecterAction(email, motDePasse);
      // En cas de succès, la server action redirige : on ne repasse jamais
      // ici. On ne gère donc QUE l'échec.
      if (!resultat.success) {
        setErreur(resultat.error ?? "Erreur inconnue.");
      }
    });
  }

  return (
    <form onSubmit={soumettre} className="flex w-full max-w-sm flex-col gap-4">
      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium">Email</span>
        <input
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="rounded-md border border-compta-border bg-compta-surface px-3 py-2 outline-none focus:border-compta-accent"
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium">Mot de passe</span>
        <input
          type="password"
          required
          minLength={6}
          autoComplete="current-password"
          value={motDePasse}
          onChange={(e) => setMotDePasse(e.target.value)}
          className="rounded-md border border-compta-border bg-compta-surface px-3 py-2 outline-none focus:border-compta-accent"
        />
      </label>

      {/* role="alert" : les lecteurs d'écran annoncent l'erreur immédiatement. */}
      {erreur && (
        <p role="alert" className="text-sm text-compta-depense">
          {erreur}
        </p>
      )}

      <button
        type="submit"
        disabled={enCours}
        className="rounded-md bg-compta-accent px-4 py-2 font-medium text-white transition-colors hover:bg-compta-accent-hover disabled:opacity-50"
      >
        {enCours ? "Connexion…" : "Se connecter"}
      </button>
    </form>
  );
}
