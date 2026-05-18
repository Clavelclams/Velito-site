/**
 * Page /arena — Placeholder "en construction" pour l'app gamers Velito.
 *
 * Sera remplace par un redirect vers arena.velito.com quand cette app sera
 * deployee. Pour V1, on affiche juste un message en attendant.
 */
import Link from "next/link";

export default function ArenaPlaceholder() {
  return (
    <div className="min-h-screen pt-28 pb-20 px-4 hero-bg-full flex items-center justify-center">
      <div className="card-clean p-10 sm:p-14 text-center max-w-2xl w-full">
        <span className="badge-red mb-4 inline-block">En construction</span>
        <h1 className="text-3xl sm:text-4xl font-black text-vea-text mb-4">
          <span className="text-vea-accent">Arena</span> arrive bientot
        </h1>
        <p className="text-vea-text-muted leading-relaxed mb-8">
          Arena, c&apos;est l&apos;app des gamers Velito : statistiques par jeu,
          classement entre membres, challenges, badges, progression. On
          construit ca, ca arrive vite.
        </p>
        <p className="text-xs text-vea-text-dim mb-8">
          En attendant, suis notre actualite sur{" "}
          <Link href="/agenda" className="text-vea-accent hover:underline">
            l&apos;agenda
          </Link>{" "}
          et participe aux events VEA.
        </p>
        <Link href="/profil" className="btn-primary">
          Retour a mon profil
        </Link>
      </div>
    </div>
  );
}
