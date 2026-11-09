/**
 * Paramètres de facturation (vendeur) : Server Component (09/11/2026).
 *
 * Mentions du vendeur reprises sur chaque devis et facture. Une facture
 * émise garde l'instantané pris à son émission : modifier ces paramètres ne
 * change que les documents à venir. Lecture seule : le lecteur voit les
 * valeurs, sans formulaire.
 */
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { peutEcrire } from "@/lib/droits";
import { MESSAGE_LECTURE_SEULE } from "@/lib/services/droits";
import { getEntite } from "@/lib/repositories/entites";
import { getParametres } from "@/lib/repositories/facturation";
import { champMentionTva, champsPaiement, champsVendeur, LIBELLES_REGIME, mentionsManquantes } from "@/lib/services/facturation";
import { FormulaireParametresFacturation } from "@/components/FormulaireParametresFacturation";

export default async function ParametresFacturationPage({ params }: { params: Promise<{ entiteId: string }> }) {
  const { entiteId } = await params;
  const supabase = await createClient();
  const [entite, parametres, ecriture] = await Promise.all([getEntite(supabase, entiteId), getParametres(supabase, entiteId), peutEcrire(supabase, entiteId)]);
  const typeJuridique = entite?.type_juridique ?? "association";
  // Contrôle pour un client professionnel : le cas le plus exigeant.
  const manquantes = mentionsManquantes({ type: "devis" }, [{ taux_tva_centiemes: 0 }], parametres, null, typeJuridique).filter((m) => m.zone === "vendeur");
  const pourPro = mentionsManquantes(
    { type: "facture" },
    [{ taux_tva_centiemes: 0 }],
    parametres,
    { type_client: "professionnel", nom: "x", siren: "000000000", adresse_facturation: "x" },
    typeJuridique,
  ).filter((m) => m.zone === "vendeur");
  const toutes = [...new Map([...manquantes, ...pourPro].map((m) => [m.libelle, m])).values()];

  return (
    <section className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">Paramètres de facturation</h2>
          <p className="text-sm text-compta-text-muted">
            Les mentions du vendeur, reprises sur chaque devis et facture. Laisse vide ce que tu ne connais pas : le document
            l&apos;affichera « à compléter » et l&apos;émission d&apos;une facture sera refusée tant qu&apos;une mention obligatoire manque.
          </p>
        </div>
        <div className="flex flex-col items-end gap-1 whitespace-nowrap text-sm">
          <Link href={`/${entiteId}/factures`} className="text-compta-text-muted hover:text-compta-accent">
            Factures →
          </Link>
          <Link href={`/${entiteId}/devis`} className="text-compta-text-muted hover:text-compta-accent">
            Devis →
          </Link>
          <Link href={`/${entiteId}/clients`} className="text-compta-text-muted hover:text-compta-accent">
            Clients →
          </Link>
        </div>
      </div>

      {toutes.length > 0 ? (
        <div className="rounded-md border border-compta-accent/40 bg-compta-accent/5 px-3 py-2 text-sm">
          <p className="font-medium">À compléter pour émettre une facture :</p>
          <p>{toutes.map((m) => m.libelle + (m.bloquante ? "" : " (conseillé)")).join(" ; ")}.</p>
        </div>
      ) : (
        <p className="rounded-md bg-compta-recette/10 px-3 py-2 text-sm">Toutes les mentions du vendeur sont renseignées.</p>
      )}

      {ecriture ? (
        <FormulaireParametresFacturation entiteId={entiteId} parametres={parametres} estSociete={typeJuridique === "societe"} />
      ) : (
        <div className="space-y-3 rounded-lg border border-compta-border bg-compta-surface p-4 text-sm">
          <p className="text-compta-text-muted">{MESSAGE_LECTURE_SEULE}</p>
          <p className="font-semibold">{parametres?.denomination ?? "Dénomination à compléter"}</p>
          {[...champsVendeur(parametres, typeJuridique), ...champsPaiement(parametres, true, true)]
            .filter((c) => c.valeur || c.requis)
            .map((c, i) => (
              <p key={i} className="whitespace-pre-line">
                {c.libelle ? `${c.libelle} : ` : ""}
                {c.valeur ?? "à compléter"}
              </p>
            ))}
          <p>Régime de TVA : {parametres?.regime_tva ? LIBELLES_REGIME[parametres.regime_tva] : "à compléter"}</p>
          {(() => {
            const m = champMentionTva(parametres);
            return m ? <p>{m.valeur ?? "Mention de TVA à compléter"}</p> : null;
          })()}
        </div>
      )}
    </section>
  );
}
