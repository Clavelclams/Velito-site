"use client";

/** Ajout d'un membre par e-mail et rôle (07/11/2026). Le serveur et la base revérifient. */
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ajouterMembreAction } from "@/app/[entiteId]/membres/actions";

export function AjoutMembre({ entiteId }: { entiteId: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("tresorier");
  const [retour, setRetour] = useState<{ ok: boolean; texte: string } | null>(null);
  const [enCours, demarrer] = useTransition();
  const champ = "rounded-md border border-compta-border bg-white px-3 py-2 text-sm outline-none focus:border-compta-accent";

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        setRetour(null);
        demarrer(async () => {
          const r = await ajouterMembreAction(entiteId, email, role);
          setRetour({ ok: r.success, texte: r.success ? r.message ?? "Ajouté." : r.error ?? "Ajout impossible." });
          if (r.success) {
            setEmail("");
            router.refresh();
          }
        });
      }}
      className="flex flex-wrap items-center gap-2"
    >
      <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="E-mail du compte hub" required className={champ} />
      <select value={role} onChange={(e) => setRole(e.target.value)} aria-label="Rôle" className={champ}>
        <option value="tresorier">Trésorier</option>
        <option value="lecteur">Lecteur</option>
      </select>
      <button
        type="submit"
        disabled={enCours}
        className="rounded-md bg-compta-accent px-4 py-2 text-sm font-medium text-white hover:bg-compta-accent-hover disabled:opacity-50"
      >
        Ajouter
      </button>
      {retour && <p className={`w-full text-sm ${retour.ok ? "text-compta-recette" : "text-compta-depense"}`}>{retour.texte}</p>}
    </form>
  );
}
