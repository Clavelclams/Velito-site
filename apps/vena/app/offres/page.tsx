/**
 * /offres : ce que VENA vend, clairement (13/11/2026).
 *
 * Pourquoi cette page : l'accueil présente des métiers, pas des offres
 * achetables. Un gérant qui arrive doit comprendre en 10 secondes ce qu'il
 * peut acheter, à partir de combien, et quoi faire ensuite.
 *
 * Règle de prix (décision de Clavel, 13/11/2026) : seul le prix de la
 * maintenance est public (49 €/mois, un petit montant qui rassure). Le site
 * web est « sur devis » : un prix affiché d'entrée fait fuir avant même
 * d'échanger. Tout le reste est « sur devis ». Les tarifs
 * internes (collectivités, options sur mesure) ne vont JAMAIS sur une page
 * publique.
 *
 * Chaque offre renvoie vers /contact avec le service présélectionné
 * (?service=...), lu par le formulaire.
 */
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Offres",
  description:
    "Sites web sur devis, maintenance à 49 €/mois, soirées et animations numériques, tournois clés en main, captation vidéo et location de matériel à Amiens.",
  alternates: { canonical: "/offres" },
};

interface Offre {
  num: string;
  titre: string;
  pour: string;
  prix: string;
  inclus: string[];
  service: string;
  fond: string;
}

const OFFRES: Offre[] = [
  {
    num: "01",
    titre: "Site web",
    pour: "Associations, clubs, commerces, structures jeunesse.",
    prix: "sur devis",
    inclus: [
      "Site rapide, lisible sur téléphone, à ton image",
      "Formulaire de contact protégé contre le spam",
      "Référencement de base (Google, aperçus IA)",
      "Mise en ligne et prise en main expliquée",
    ],
    service: "developpement_web",
    fond: "bg-white",
  },
  {
    num: "02",
    titre: "Maintenance",
    pour: "Pour ne plus jamais avoir un site cassé ou à l'abandon.",
    prix: "49 € / mois",
    inclus: [
      "Hébergement et mises à jour",
      "Petites modifications de contenu",
      "Sauvegardes et surveillance",
      "Un interlocuteur à Amiens qui répond",
    ],
    service: "developpement_web",
    fond: "bg-vena-tilleul",
  },
  {
    num: "03",
    titre: "Application ou outil sur mesure",
    pour: "Quand un tableur ne suffit plus : réservations, adhérents, suivi, tableau de bord.",
    prix: "sur devis",
    inclus: [
      "Analyse du besoin avant tout chiffrage",
      "Application web ou mobile (iPhone, Android)",
      "Espace d'administration pour ton équipe",
      "Exemple : Venaball, en production pour des clubs de basket",
    ],
    service: "developpement_web",
    fond: "bg-vena-lavande",
  },
  {
    num: "04",
    titre: "Soirée et animation numérique",
    pour: "Bars, MJC, centres sociaux, entreprises.",
    prix: "sur devis",
    inclus: [
      "Jeux sur grand écran, joués depuis les téléphones",
      "Quiz, blind test, Pin'Point (placer un lieu sur la carte)",
      "Animation sur place, matériel compris",
      "Format soirée, après-midi jeunesse ou animation d'équipe",
    ],
    service: "autre",
    fond: "bg-vena-peche",
  },
  {
    num: "05",
    titre: "Tournoi clé en main",
    pour: "Collectivités, collèges et lycées, entreprises, associations.",
    prix: "sur devis",
    inclus: [
      "Esport ou sport (padel, five, ping-pong)",
      "Inscriptions, tableau en direct, résultats sur ARENA",
      "QR code pour les joueurs, classement, palmarès",
      "Organisation et animation le jour J",
    ],
    service: "autre",
    fond: "bg-white",
  },
  {
    num: "06",
    titre: "Captation vidéo et location de matériel",
    pour: "Événements, inaugurations, tournois, vidéos de présentation.",
    prix: "sur devis",
    inclus: [
      "Tournage et montage, formats courts pour les réseaux",
      "Location de caméras, son, lumière, streaming",
      "À la journée ou au week-end, Amiens et alentours",
    ],
    service: "production_video",
    fond: "bg-vena-tilleul",
  },
];

export default function OffresPage() {
  return (
    <>
      <section className="bg-vena-cream border-b border-vena-border">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-16 pb-12">
          <p className="text-[10px] uppercase tracking-[0.3em] text-vena-text-dim mb-6">Offres</p>
          <h1 className="font-display text-4xl sm:text-6xl font-black text-vena-kaki leading-[0.95] tracking-tight mb-6 max-w-4xl">
            Ce que tu peux nous confier.
          </h1>
          <p className="text-lg text-vena-text leading-relaxed max-w-2xl">
            Des prix clairs quand c&apos;est possible, un devis gratuit sinon.
            Tu décris ton besoin, on te répond sous 72h.
          </p>
        </div>
      </section>

      <section className="border-b border-vena-border">
        {OFFRES.map((o) => (
          <article key={o.num} className={`${o.fond} border-t border-vena-border`}>
            <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12 grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
              <div className="md:col-span-3">
                <p className="font-display text-6xl sm:text-7xl font-black text-vena-kaki/30 leading-none">{o.num}</p>
              </div>
              <div className="md:col-span-6">
                <h2 className="font-display text-2xl sm:text-3xl font-black text-vena-kaki mb-2">{o.titre}</h2>
                <p className="text-base text-vena-text mb-4">{o.pour}</p>
                <ul className="space-y-1.5 text-sm text-vena-text">
                  {o.inclus.map((i) => (
                    <li key={i} className="flex gap-2">
                      <span aria-hidden="true" className="text-vena-kaki font-black">·</span>
                      <span>{i}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="md:col-span-3 md:text-right">
                <p className="font-display text-2xl font-black text-vena-kaki mb-4">{o.prix}</p>
                <Link href={`/contact?service=${o.service}`} className="btn-vena-primary text-sm">
                  Demander un devis
                </Link>
              </div>
            </div>
          </article>
        ))}
      </section>

      <section className="bg-vena-kaki text-vena-cream">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-16">
          <h2 className="font-display text-3xl sm:text-4xl font-black leading-tight mb-6">Comment ça se passe</h2>
          <ol className="space-y-4 text-base">
            <li><b>1.</b> Tu décris ton besoin dans le formulaire (2 minutes).</li>
            <li><b>2.</b> On t&apos;appelle ou on se voit à Amiens pour préciser.</li>
            <li><b>3.</b> Devis écrit et détaillé. Acompte de 30 % à la signature.</li>
            <li><b>4.</b> On livre, on t&apos;explique, et on reste joignable.</li>
          </ol>
          <p className="mt-8 text-sm opacity-80">
            Prix indicatifs ; le devis fait foi.
          </p>
        </div>
      </section>
    </>
  );
}
