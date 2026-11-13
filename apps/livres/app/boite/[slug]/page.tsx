/**
 * Fiche d'une boîte (13/11/2026). C'est la page ouverte par le QR code collé
 * sur la boîte : elle doit marcher en 3 secondes, debout, sur un téléphone.
 *
 * Les boutons sont de vrais formulaires (POST vers signalerAction) : ils
 * fonctionnent sans JavaScript, même sur un vieux téléphone ou une connexion
 * lente. Aucun compte demandé.
 */
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { lireBoite } from "@/lib/livres/donnees";
import { signalerAction } from "@/lib/livres/actions";
import { depuis, LIBELLE_ETAT, LIBELLE_SIGNALEMENT, MESSAGE_MAX, type TypeSignalement } from "@/lib/livres/regles";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const b = await lireBoite(slug);
  return b
    ? { title: b.nom, description: `Boîte à livres ${b.nom}${b.adresse ? `, ${b.adresse}` : ""} à Amiens : état, adresse, itinéraire.` }
    : { title: "Boîte introuvable" };
}

const STYLE_ETAT = {
  bon: "bg-livre-vert-pale text-livre-bon",
  a_remplir: "bg-livre-vide-pale text-livre-vide",
  abimee: "bg-livre-abimee-pale text-livre-abimee",
  inconnu: "bg-livre-papier text-livre-doux",
} as const;

export default async function FicheBoite({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ merci?: string; erreur?: string }>;
}) {
  const { slug } = await params;
  const { merci, erreur } = await searchParams;
  const b = await lireBoite(slug);
  if (!b) notFound();

  const itineraire = `https://www.openstreetmap.org/directions?to=${b.lat}%2C${b.lng}#map=17/${b.lat}/${b.lng}`;
  const bouton =
    "min-h-[52px] w-full rounded-lg border-2 px-4 py-3 text-left font-semibold transition-colors";

  return (
    <div className="mx-auto max-w-xl px-4 py-6">
      <p className="text-sm">
        <Link href="/" className="text-livre-vert underline">← Toutes les boîtes</Link>
      </p>

      <h1 className="mt-3 text-2xl font-bold">{b.nom}</h1>
      {(b.adresse || b.quartier) && (
        <p className="mt-1 text-livre-doux">
          {b.adresse}
          {b.adresse && b.quartier ? " · " : ""}
          {b.quartier}
        </p>
      )}

      <p className={`mt-4 inline-block rounded-lg px-3 py-2 font-semibold ${STYLE_ETAT[b.etat]}`}>
        {LIBELLE_ETAT[b.etat]}
        <span className="font-normal"> · mis à jour {depuis(b.etat_maj_le, new Date())}</span>
      </p>

      {b.photo_url && (
        // eslint-disable-next-line @next/next/no-img-element -- photo hébergée ailleurs, pas d'optimiseur nécessaire
        <img src={b.photo_url} alt={`La boîte à livres ${b.nom}`} className="mt-4 w-full rounded-xl border border-livre-trait" loading="lazy" />
      )}
      {b.description && <p className="mt-4 whitespace-pre-line">{b.description}</p>}

      <p className="mt-4 flex flex-wrap gap-4 text-sm">
        <a href={itineraire} className="text-livre-vert underline" target="_blank" rel="noopener noreferrer">
          Itinéraire
        </a>
        {b.depots_total > 0 && (
          <span className="text-livre-doux">
            {b.depots_total} livre{b.depots_total > 1 ? "s" : ""} déposé{b.depots_total > 1 ? "s" : ""} signalé{b.depots_total > 1 ? "s" : ""}
          </span>
        )}
        {b.referent && <span className="text-livre-doux">Référent : {b.referent}</span>}
      </p>

      {merci && (
        <p role="status" className="mt-6 rounded-lg bg-livre-vert-pale p-3 font-semibold text-livre-vert">
          Merci ! C&apos;est noté, ça aide tout le quartier.
        </p>
      )}
      {erreur && (
        <p role="alert" className="mt-6 rounded-lg bg-livre-abimee-pale p-3 font-semibold text-livre-abimee">
          {erreur}
        </p>
      )}

      <section className="mt-6" aria-labelledby="titre-actions">
        <h2 id="titre-actions" className="mb-3 text-lg font-bold">Tu es devant la boîte ?</h2>
        <div className="grid gap-2">
          {(["depot", "prise"] as TypeSignalement[]).map((type) => (
            <form key={type} action={signalerAction}>
              <input type="hidden" name="slug" value={b.slug} />
              <input type="hidden" name="type" value={type} />
              <ChampPiege />
              <button className={`${bouton} border-livre-vert bg-livre-carte hover:bg-livre-vert-pale`}>
                {LIBELLE_SIGNALEMENT[type]}
              </button>
            </form>
          ))}
        </div>

        <h3 className="mb-2 mt-6 font-bold">Un problème ?</h3>
        <form action={signalerAction} className="grid gap-2 rounded-xl border border-livre-trait bg-livre-carte p-3">
          <input type="hidden" name="slug" value={b.slug} />
          <ChampPiege />
          <fieldset className="grid gap-2">
            <legend className="sr-only">Type de problème</legend>
            <label className="flex items-center gap-2">
              <input type="radio" name="type" value="vide" required /> {LIBELLE_SIGNALEMENT.vide}
            </label>
            <label className="flex items-center gap-2">
              <input type="radio" name="type" value="abimee" /> {LIBELLE_SIGNALEMENT.abimee}
            </label>
          </fieldset>
          <label className="text-sm text-livre-doux" htmlFor="message">
            Précision (facultatif, pas de nom ni de numéro de téléphone)
          </label>
          <textarea
            id="message"
            name="message"
            maxLength={MESSAGE_MAX}
            rows={2}
            className="rounded-lg border border-livre-trait p-2"
          />
          <button className={`${bouton} border-livre-vide bg-livre-vide-pale text-livre-encre`}>
            Prévenir les bénévoles
          </button>
        </form>
      </section>
    </div>
  );
}

/**
 * Champ piège invisible pour un humain (sorti de l'écran, hors tabulation,
 * caché aux lecteurs d'écran). Un robot qui remplit tout se dénonce.
 */
function ChampPiege() {
  return (
    <div aria-hidden="true" style={{ position: "absolute", left: "-10000px", width: 1, height: 1, overflow: "hidden" }}>
      <label>
        Site web <input type="text" name="site_web" tabIndex={-1} autoComplete="off" defaultValue="" />
      </label>
    </div>
  );
}
