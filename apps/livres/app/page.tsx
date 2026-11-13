/**
 * Accueil : la carte et la liste de toutes les boîtes (13/11/2026).
 * Rendu côté serveur à chaque visite (l'état des boîtes change avec les
 * signalements), la carte s'hydrate ensuite dans le navigateur.
 */
import Link from "next/link";
import CarteEtListe from "@/components/CarteEtListe";
import { lireBoites } from "@/lib/livres/donnees";

export const dynamic = "force-dynamic";

export default async function Accueil() {
  const boites = await lireBoites();

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <h1 className="text-2xl font-bold sm:text-3xl">Les boîtes à livres d&apos;Amiens</h1>
      <p className="mt-2 max-w-2xl text-livre-doux">
        Prends un livre, dépose-en un, gratuitement. Trouve la boîte la plus
        proche, regarde si elle est remplie, et préviens si elle est vide ou
        abîmée. Sans compte, sans publicité.
      </p>

      <div className="mt-6">
        {boites === null ? (
          <p className="rounded-lg border border-livre-trait bg-livre-carte p-4">
            La carte n&apos;est pas disponible pour le moment. Réessaie dans quelques minutes.
          </p>
        ) : boites.length === 0 ? (
          <p className="rounded-lg border border-livre-trait bg-livre-carte p-4">
            Les boîtes sont en cours de recensement. Tu en connais une ?{" "}
            <Link href="/a-propos#contact" className="text-livre-vert underline">Dis-le-nous</Link>.
          </p>
        ) : (
          <CarteEtListe boites={boites} />
        )}
      </div>
    </div>
  );
}
