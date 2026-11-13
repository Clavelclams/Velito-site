/**
 * Espace bénévoles (13/11/2026) : LE contrôle d'accès de l'interface.
 * Les actions serveur refont le contrôle (requireAdmin) : la sécurité ne
 * dépend jamais de l'affichage seul. Rendu à chaque requête (force-dynamic) :
 * son contenu dépend de qui regarde.
 */
import Link from "next/link";
import { estConnecte, getAdmin } from "@/lib/livres/auth";

export const dynamic = "force-dynamic";
export const metadata = { title: "Bénévoles", robots: { index: false } };

const HUB_LOGIN = process.env.NEXT_PUBLIC_HUB_LOGIN_URL ?? "https://hub.velito.fr/login";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await getAdmin();
  if (!admin) {
    const connecte = await estConnecte();
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <h1 className="text-2xl font-bold">Espace bénévoles</h1>
        {connecte ? (
          <p className="mt-4 text-livre-doux">
            Ton compte n&apos;a pas accès à l&apos;administration des boîtes. Demande à
            un responsable de Velito Esport Amiens de t&apos;ajouter.
          </p>
        ) : (
          <>
            <p className="mt-4 text-livre-doux">Connecte-toi avec ton compte Velito.</p>
            <a
              href={`${HUB_LOGIN}?return=${encodeURIComponent("https://livres.velito.fr/admin")}`}
              className="mt-6 inline-block rounded-lg bg-livre-vert px-5 py-3 font-semibold text-white"
            >
              Se connecter
            </a>
          </>
        )}
      </div>
    );
  }
  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <nav className="mb-6 flex gap-4 border-b border-livre-trait pb-3 text-sm" aria-label="Administration">
        <Link href="/admin" className="font-bold text-livre-vert">Administration des boîtes</Link>
        <Link href="/" className="text-livre-doux hover:underline">Voir le site</Link>
      </nav>
      {children}
    </div>
  );
}
