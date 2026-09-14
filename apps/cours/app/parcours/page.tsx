/**
 * HUB DES PARCOURS — Server Component.
 *
 * Seize parcours : en vrac, ça ne se lit plus. On les regroupe par DOMAINE
 * (bases → backend → frontend → métier → jeux), dans l'ordre conseillé, avec
 * une ligne de progression globale en tête. La lecture des dossiers reste
 * ici (serveur) ; la progression de chaque carte est calculée côté client
 * par GrilleParcours (localStorage).
 */
import Link from "next/link";
import { listerLecons, listerParcours } from "@/lib/fiches/parcours";
import { DOMAINES } from "@/lib/fiches/domaines";
import GrilleParcours from "@/app/components/GrilleParcours";
import ProgressionGlobaleParcours from "@/app/components/ProgressionGlobaleParcours";

export default function ParcoursPage() {
  const parcours = listerParcours();

  // Pour la ligne de progression globale : tous les ids + durée de chacun.
  const idsLecons: string[] = [];
  const dureeParId: Record<string, number> = {};
  for (const p of parcours) {
    for (const l of listerLecons(p.slug)) {
      idsLecons.push(l.id);
      dureeParId[l.id] = l.duree;
    }
  }

  // Regroupement par domaine, dans l'ordre de DOMAINES ; on n'affiche que
  // les domaines qui ont au moins un parcours.
  const groupes = DOMAINES.map((d) => ({
    domaine: d,
    parcours: parcours.filter((p) => p.domaine === d.cle),
  })).filter((g) => g.parcours.length > 0);

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <Link
        href="/"
        className="text-sm text-cours-text-muted hover:text-cours-accent"
      >
        ← Tableau de bord
      </Link>

      <header className="mb-6 mt-4">
        <h1 className="text-2xl font-bold sm:text-3xl">Parcours 📚</h1>
        <p className="mt-1 max-w-2xl text-sm leading-relaxed text-cours-text-muted">
          Toutes les technos de ta stack, reprises depuis zéro jusqu&apos;au
          niveau « défendable au jury ». Cinq domaines, dans l&apos;ordre
          conseillé. Une leçon par jour : le cours, la mise en pratique dans tes
          vrais projets, le quiz.
        </p>
      </header>

      {parcours.length === 0 ? (
        <div className="rounded-2xl border border-cours-border bg-cours-surface p-8 text-center text-sm text-cours-text-muted">
          Aucun parcours pour l&apos;instant. Un parcours = un dossier{" "}
          <code>content/parcours/&lt;techno&gt;/</code> avec un{" "}
          <code>_parcours.json</code> et des leçons <code>NN-slug.md</code>.
        </div>
      ) : (
        <>
          <ProgressionGlobaleParcours idsLecons={idsLecons} dureeParId={dureeParId} />

          {/* Sommaire des domaines : ancres pour sauter directement. */}
          <nav
            aria-label="Domaines"
            className="mb-8 flex flex-wrap gap-2"
          >
            {groupes.map((g) => (
              <a
                key={g.domaine.cle}
                href={`#${g.domaine.cle}`}
                className="rounded-full border border-cours-border bg-cours-surface px-3 py-1 text-xs font-semibold text-cours-text-muted transition-colors hover:border-cours-accent hover:text-cours-accent"
              >
                {g.domaine.icone} {g.domaine.titre}
                <span className="ml-1 opacity-60">· {g.parcours.length}</span>
              </a>
            ))}
          </nav>

          <div className="space-y-12">
            {groupes.map((g, i) => (
              <section key={g.domaine.cle} id={g.domaine.cle} className="scroll-mt-24">
                <div className="mb-4 flex items-baseline gap-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-cours-text-muted">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <div>
                    <h2 className="text-xl font-bold">
                      {g.domaine.icone} {g.domaine.titre}
                    </h2>
                    {g.domaine.sousTitre && (
                      <p className="mt-0.5 text-sm text-cours-text-muted">
                        {g.domaine.sousTitre}
                      </p>
                    )}
                  </div>
                </div>
                <GrilleParcours parcours={g.parcours} />
              </section>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
