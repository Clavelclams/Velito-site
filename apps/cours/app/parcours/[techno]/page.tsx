/**
 * PAGE D'UN PARCOURS — Server Component.
 * Le sommaire ordonné des leçons ; les coches et le « Continuer ici » sont
 * calculés côté client par ListeLecons (localStorage).
 */
import Link from "next/link";
import { notFound } from "next/navigation";
import { listerLecons, listerParcours } from "@/lib/fiches/parcours";
import ListeLecons from "@/app/components/ListeLecons";

/** Pré-génère la page de chaque parcours au build. */
export function generateStaticParams() {
  return listerParcours().map((p) => ({ techno: p.slug }));
}

export default async function PageParcours({
  params,
}: {
  params: Promise<{ techno: string }>;
}) {
  const { techno } = await params;
  const parcours = listerParcours().find((p) => p.slug === techno);
  if (!parcours) notFound();

  const lecons = listerLecons(techno);
  const dureeTotale = lecons.reduce((total, l) => total + l.duree, 0);

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <Link
        href="/parcours"
        className="text-sm text-cours-text-muted hover:text-cours-accent"
      >
        ← Tous les parcours
      </Link>

      <header className="anim-arrivee mb-8 mt-4 rounded-2xl border border-cours-border bg-cours-surface p-6">
        <p className="text-4xl">{parcours.icone}</p>
        <h1 className="mt-2 text-2xl font-bold sm:text-3xl">{parcours.titre}</h1>
        <p className="mt-2 text-sm leading-relaxed text-cours-text-muted">
          {parcours.description}
        </p>
        <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-cours-text-muted">
          {lecons.length} leçons · ~{Math.round(dureeTotale / 60)} h au total ·
          une par jour
        </p>
      </header>

      <ListeLecons lecons={lecons} />
    </div>
  );
}
