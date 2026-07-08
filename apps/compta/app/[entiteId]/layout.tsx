/**
 * Layout d'une ENTITÉ — enveloppe toutes les pages sous /[entiteId]/…
 * (tableau de bord, transactions, catégories, export).
 *
 * Rôle : charger UNE FOIS l'entité active, afficher son nom + la navigation
 * interne, et poser la barrière d'accès. Les pages enfants n'ont plus à se
 * soucier de "quelle entité" ni "ai-je le droit" : le layout l'a déjà fait.
 *
 * Server Component : la donnée est chargée côté serveur avant l'envoi du
 * HTML. Le middleware a déjà exigé une session ; ici on ajoute la vérif
 * MÉTIER (l'entité m'appartient-elle ?) via la RLS.
 *
 * notFound() plutôt qu'une page d'erreur : un id d'entité inconnu ou qui
 * n'est pas à moi ne doit RIEN révéler → un 404 neutre, comme si la page
 * n'existait pas. (getEntite renvoie null dans les deux cas — voir le repo.)
 */
import Link from "next/link";
import { notFound } from "next/navigation";
import { getEntite } from "@/lib/repositories/entites";
import { createClient } from "@/lib/supabase/server";

/**
 * En Next 16, `params` est asynchrone (Promise) : on l'attend avant de lire
 * entiteId. C'est le nouveau contrat de l'App Router.
 */
export default async function EntiteLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ entiteId: string }>;
}) {
  const { entiteId } = await params;
  const supabase = await createClient();

  const entite = await getEntite(supabase, entiteId);

  // La RLS n'a rien renvoyé : id inexistant OU pas à moi. Même réponse : 404.
  if (!entite) {
    notFound();
  }

  // Liens de navigation de l'entité. On les garde ici (un seul endroit) :
  // ajouter un écran = ajouter une ligne, pas retoucher chaque page.
  const liens = [
    { href: `/${entiteId}`, libelle: "Tableau de bord" },
    { href: `/${entiteId}/transactions`, libelle: "Transactions" },
    { href: `/${entiteId}/import`, libelle: "Importer" },
    { href: `/${entiteId}/categories`, libelle: "Catégories" },
    { href: `/${entiteId}/comptabilite`, libelle: "Comptabilité" },
    { href: `/${entiteId}/export`, libelle: "Export" },
  ];

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      {/* ---- Fil d'ariane + identité de l'entité ---- */}
      <header className="mb-6">
        <Link
          href="/"
          className="text-sm text-compta-text-muted transition-colors hover:text-compta-accent"
        >
          ← Mes structures
        </Link>

        <div className="mt-2 flex items-baseline gap-3">
          <h1 className="text-2xl font-bold">{entite.nom}</h1>
          <span className="text-sm text-compta-text-muted">
            {entite.type_juridique === "association"
              ? "Association loi 1901"
              : "Société (SASU)"}
          </span>
        </div>
      </header>

      {/* ---- Navigation interne de l'entité ---- */}
      <nav className="mb-8 flex flex-wrap gap-1 border-b border-compta-border">
        {liens.map((lien) => (
          <Link
            key={lien.href}
            href={lien.href}
            className="rounded-t-md px-3 py-2 text-sm font-medium text-compta-text-muted transition-colors hover:bg-compta-surface hover:text-compta-accent"
          >
            {lien.libelle}
          </Link>
        ))}
      </nav>

      {children}
    </div>
  );
}
