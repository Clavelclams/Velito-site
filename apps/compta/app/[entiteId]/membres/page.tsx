/**
 * Membres d'une structure — Server Component (07/11/2026).
 * Visible de tous les membres ; seul le propriétaire voit le formulaire
 * d'ajout et les boutons de retrait (et la base refuse les autres de toute façon).
 */
import { createClient } from "@/lib/supabase/server";
import { LIBELLES_ROLE, listerMembres, roleSurEntite } from "@/lib/repositories/membres";
import { AjoutMembre } from "@/components/AjoutMembre";
import { BoutonConfirmer } from "@/components/BoutonConfirmer";
import { retirerMembreAction } from "./actions";

export default async function MembresPage({ params }: { params: Promise<{ entiteId: string }> }) {
  const { entiteId } = await params;
  const supabase = await createClient();
  const [role, membres] = await Promise.all([roleSurEntite(supabase, entiteId), listerMembres(supabase, entiteId)]);
  const proprietaire = role === "proprietaire";

  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Membres</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-compta-text-muted">
          <li>Propriétaire : tout, et seul à gérer les membres.</li>
          <li>Trésorier : toute la comptabilité (saisie, imports, classement, subventions, bénévolat).</li>
          <li>Lecteur : consulte tout, ne modifie rien.</li>
        </ul>
      </div>

      <ul className="divide-y divide-compta-border rounded-lg border border-compta-border bg-compta-surface">
        {membres.length === 0 && <li className="px-4 py-3 text-sm text-compta-text-muted">Aucun membre en dehors du propriétaire.</li>}
        {membres.map((m) => (
          <li key={m.user_id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
            <span>
              {m.email}
              <span className="ml-2 rounded-full border border-compta-border px-2 py-0.5 text-xs text-compta-text-muted">
                {LIBELLES_ROLE[m.role]}
              </span>
            </span>
            {proprietaire && (
              <BoutonConfirmer
                action={retirerMembreAction.bind(null, entiteId, m.user_id)}
                question={`Retirer ${m.email} ? Il ne verra plus rien de cette structure.`}
                libelle="Retirer"
              />
            )}
          </li>
        ))}
      </ul>

      {proprietaire && (
        <div className="space-y-2">
          <h3 className="font-semibold">Ajouter un membre</h3>
          <AjoutMembre entiteId={entiteId} />
          <p className="text-xs text-compta-text-muted">
            La personne doit avoir un compte sur hub.velito.fr. Ajoute aussi son e-mail à la liste
            COMPTA_EMAILS_AUTORISES sur Vercel : le projet est partagé avec tout l&apos;écosystème, avoir un compte ne suffit pas.
          </p>
        </div>
      )}
    </section>
  );
}
