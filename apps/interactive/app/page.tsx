import Image from "next/image";
import Link from "next/link";

/**
 * Velito Interactive — Landing publique de CONVERSION (prospects bars/MJC).
 *
 * Structure marketing : Header (logo + nav) → Hero → Comment ça marche (3 étapes)
 * → Les 4 jeux → Pourquoi Interactive → Pricing → CTA → Footer (VENA).
 *
 * VENA est mis en avant comme ÉDITEUR (logo en haut + bandeau "Un produit VENA"
 * dans le footer + lien vers velito.fr).
 *
 * /dashboard reste la home des ABONNÉS (catalogue de jeux, créer une session).
 *
 * NB esthétique : structure d'abord, polish DA après. Pas de copier-coller
 * Unboared : ton et identité Velito (arcade néon + signature VENA).
 */

const JEUX = [
  {
    nom: "GEO",
    cat: "Jeu phare",
    desc: "Ping la carte au plus proche : Monde, France, Amiens, monuments. Spectaculaire sur TV.",
    accent: "border-neon-pink/40 hover:border-neon-pink",
    badge: "text-neon-pink",
  },
  {
    nom: "Blind Test",
    cat: "Quiz & culture",
    desc: "Reconnais le titre le plus vite. Packs musicaux Velito (variés, sans cliché).",
    accent: "border-neon-cyan/40 hover:border-neon-cyan",
    badge: "text-neon-cyan",
  },
  {
    nom: "Quiz",
    cat: "Quiz & culture",
    desc: "QCM 4 choix, 10 packs (culture G, sport, cinéma, Amiens, animaux…).",
    accent: "border-neon-violet/40 hover:border-neon-violet",
    badge: "text-neon-violet",
  },
  {
    nom: "Petit Bac",
    cat: "Classique revisité",
    desc: "Roue de lettres animée, 8 catégories, validation par l'animateur. Le classique réinventé.",
    accent: "border-neon-lime/40 hover:border-neon-lime",
    badge: "text-neon-lime",
  },
];

const ATOUTS = [
  { titre: "Zéro installation", desc: "Un navigateur, une TV, c'est tout. Pas d'app à télécharger pour tes clients." },
  { titre: "Joueurs illimités", desc: "De 2 à 50+ joueurs simultanés. Personne sur le banc de touche." },
  { titre: "Aux couleurs du bar", desc: "Logo + couleurs + message promo personnalisés par établissement." },
  { titre: "Plug & play", desc: "Prêt en 2 minutes. Pas de formation, pas de technicien." },
  { titre: "Tableau de bord", desc: "Suis tes soirées : joueurs revenus, jeux préférés, ambiance." },
  { titre: "RGPD natif", desc: "Pas d'email forcé. Les joueurs gardent leur score s'ils veulent." },
];

export default function InteractiveHome() {
  return (
    <>
      {/* HEADER */}
      <header className="relative z-20 border-b border-white/5">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <div className="flex items-center gap-3">
            <Image
              src="/brand/vena-symbole-blanc.svg"
              alt="VENA"
              width={28}
              height={28}
            />
            <div className="flex flex-col leading-tight">
              <span className="font-display text-xl font-black tracking-tight">
                Velito <span className="text-tenant">Interactive</span>
              </span>
              <span className="text-[10px] uppercase tracking-[0.25em] text-white/40">
                Un produit VENA
              </span>
            </div>
          </div>
          <nav className="flex items-center gap-2 sm:gap-4">
            <a
              href="#jeux"
              className="hidden text-sm text-white/70 transition hover:text-white sm:inline"
            >
              Les jeux
            </a>
            <a
              href="#fonctionnement"
              className="hidden text-sm text-white/70 transition hover:text-white sm:inline"
            >
              Comment ça marche
            </a>
            <a
              href="#tarifs"
              className="hidden text-sm text-white/70 transition hover:text-white sm:inline"
            >
              Tarifs
            </a>
            <Link
              href="/dashboard"
              className="rounded-lg border border-white/15 px-4 py-2 text-sm font-semibold text-white/90 transition hover:bg-white/5"
            >
              Espace animateur
            </Link>
          </nav>
        </div>
      </header>

      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-grid-ink [background-size:40px_40px] opacity-50" />
        <div className="pointer-events-none absolute -top-24 left-1/2 h-96 w-[42rem] -translate-x-1/2 rounded-full bg-neon-violet/25 blur-3xl" />

        <div className="relative mx-auto max-w-5xl px-6 py-24 text-center sm:py-32">
          <span className="mb-6 inline-block rounded-full border border-white/15 px-4 py-1.5 text-xs uppercase tracking-[0.3em] text-white/60">
            Animation soirée · Bars & MJC
          </span>
          <h1 className="neon-title text-5xl leading-[0.95] sm:text-7xl">
            Transforme ta TV en
            <br />
            <span className="text-tenant">arcade en 2 minutes</span>.
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-white/70">
            Tes clients scannent un QR code et jouent depuis leur téléphone à
            des Quiz, du Blind Test, du Petit Bac et du Géo en temps réel.
            Aucune app à installer. Pensé pour les bars, MJC et lieux d'animation.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            <Link href="/dashboard" className="btn-tenant">
              Tester la démo
            </Link>
            <a
              href="#tarifs"
              className="rounded-xl border border-white/20 px-5 py-3 font-semibold text-white/90 transition hover:bg-white/5"
            >
              Voir les tarifs
            </a>
          </div>
          <p className="mt-6 text-xs text-white/40">
            Sans engagement · Tu résilies quand tu veux
          </p>
        </div>
      </section>

      {/* COMMENT ÇA MARCHE */}
      <section id="fonctionnement" className="border-t border-white/5 bg-ink-700/30">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <h2 className="neon-title text-center text-3xl sm:text-4xl">
            Prêt en 3 étapes
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-center text-white/60">
            Aucune compétence technique requise. Si tu sais brancher un câble HDMI, tu sais lancer une soirée.
          </p>
          <div className="mt-12 grid gap-6 sm:grid-cols-3">
            {[
              { n: "01", t: "Branche", d: "Connecte un PC à ta TV via HDMI et ouvre Interactive dans ton navigateur." },
              { n: "02", t: "Lance", d: "Choisis un jeu dans le catalogue. Un QR code apparaît à l'écran." },
              { n: "03", t: "Joue !", d: "Tes clients scannent et jouent depuis leur téléphone. C'est parti." },
            ].map((e) => (
              <div key={e.n} className="card-ink p-6">
                <p className="font-display text-3xl font-black text-tenant">
                  {e.n}
                </p>
                <p className="mt-3 font-display text-xl font-bold">{e.t}</p>
                <p className="mt-2 text-sm leading-relaxed text-white/60">{e.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* JEUX */}
      <section id="jeux" className="border-t border-white/5">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <h2 className="neon-title text-center text-3xl sm:text-4xl">
            Des jeux pour tous les goûts
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-center text-white/60">
            Quatre formats au lancement. D'autres jeux à venir au fil des mois.
          </p>
          <div className="mt-12 grid gap-5 sm:grid-cols-2">
            {JEUX.map((j) => (
              <div
                key={j.nom}
                className={`card-ink ${j.accent} p-6 transition`}
              >
                <p className={`text-xs uppercase tracking-widest ${j.badge}`}>
                  {j.cat}
                </p>
                <p className="mt-2 font-display text-2xl font-black">{j.nom}</p>
                <p className="mt-3 text-sm leading-relaxed text-white/65">{j.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* POURQUOI */}
      <section className="border-t border-white/5 bg-ink-700/30">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <h2 className="neon-title text-center text-3xl sm:text-4xl">
            Pourquoi Interactive
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-center text-white/60">
            Tout ce qu'il faut pour animer une soirée. Rien de superflu.
          </p>
          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {ATOUTS.map((a) => (
              <div key={a.titre} className="card-ink p-5">
                <p className="font-display text-lg font-bold text-white">{a.titre}</p>
                <p className="mt-2 text-sm leading-relaxed text-white/60">{a.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TARIFS */}
      <section id="tarifs" className="border-t border-white/5">
        <div className="mx-auto max-w-5xl px-6 py-20">
          <h2 className="neon-title text-center text-3xl sm:text-4xl">
            Un tarif simple, tout inclus
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-center text-white/60">
            Pas de surprise, pas de frais cachés.
          </p>
          <div className="mt-12 grid gap-5 sm:grid-cols-3">
            {/* Lancement */}
            <div className="card-ink relative p-6 ring-2 ring-tenant">
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-tenant px-3 py-1 text-[10px] font-black uppercase tracking-widest text-ink">
                Lancement
              </span>
              <p className="font-display text-xl font-bold">Premiers bars</p>
              <p className="mt-4 font-display text-5xl font-black text-tenant">
                29€<span className="text-base font-normal text-white/60">/mois</span>
              </p>
              <p className="mt-1 text-xs text-white/50">Limité aux 3 premiers bars partenaires</p>
              <ul className="mt-6 space-y-2 text-sm text-white/70">
                <li>· Les 4 jeux inclus</li>
                <li>· Joueurs illimités</li>
                <li>· Tes couleurs & logo</li>
                <li>· Tableau de bord</li>
                <li>· Support direct</li>
              </ul>
            </div>
            {/* Standard */}
            <div className="card-ink p-6">
              <p className="font-display text-xl font-bold">Standard</p>
              <p className="mt-4 font-display text-5xl font-black">
                39€<span className="text-base font-normal text-white/60">/mois</span>
              </p>
              <p className="mt-1 text-xs text-white/50">Sans engagement, résiliable à tout moment</p>
              <ul className="mt-6 space-y-2 text-sm text-white/70">
                <li>· Les 4 jeux inclus</li>
                <li>· Joueurs illimités</li>
                <li>· Tes couleurs & logo</li>
                <li>· Tableau de bord</li>
                <li>· Support par email</li>
              </ul>
            </div>
            {/* Entreprise */}
            <div className="card-ink p-6">
              <p className="font-display text-xl font-bold">Entreprise</p>
              <p className="mt-4 font-display text-5xl font-black">
                sur<br />devis
              </p>
              <p className="mt-1 text-xs text-white/50">Multi-sites, jeux sur mesure, accompagnement</p>
              <ul className="mt-6 space-y-2 text-sm text-white/70">
                <li>· Multi-établissements</li>
                <li>· Packs de contenu sur mesure</li>
                <li>· Onboarding accompagné</li>
                <li>· SLA dédié</li>
              </ul>
            </div>
          </div>
          <p className="mt-8 text-center text-xs text-white/50">
            Tarifs HT · Facturation portée par VENA (Velito Expertise Numérique Amiens, SASU)
          </p>
        </div>
      </section>

      {/* CTA FINAL */}
      <section className="border-t border-white/5">
        <div className="mx-auto max-w-3xl px-6 py-20 text-center">
          <h2 className="neon-title text-3xl sm:text-5xl">
            Prêt à transformer tes soirées ?
          </h2>
          <p className="mt-4 text-white/70">
            On lance avec les 3 premiers bars amiénois. Si tu es intéressé, écris-nous.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link href="/dashboard" className="btn-tenant">
              Tester la démo
            </Link>
            <a
              href="https://velito.fr/contact?service=interactive"
              className="rounded-xl border border-white/20 px-5 py-3 font-semibold text-white/90 transition hover:bg-white/5"
            >
              Nous contacter
            </a>
          </div>
        </div>
      </section>

      {/* FOOTER VENA */}
      <footer className="border-t border-white/5 bg-ink-700/40">
        <div className="mx-auto flex max-w-6xl flex-col items-start gap-8 px-6 py-12 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <Image
              src="/brand/vena-logo-blanc.svg"
              alt="VENA — Velito Expertise Numérique Amiens"
              width={140}
              height={40}
              priority={false}
            />
            <div className="text-xs text-white/50">
              <p className="font-semibold text-white/80">
                Un produit VENA
              </p>
              <p>Velito Expertise Numérique Amiens · SASU</p>
              <a
                href="https://velito.fr"
                className="text-tenant hover:underline"
              >
                velito.fr
              </a>
            </div>
          </div>
          <div className="text-xs text-white/40">
            <p>© 2026 Velito. Tous droits réservés.</p>
            <p className="mt-1">
              <a href="https://hub.velito.fr" className="hover:text-white/70">
                Découvrir l'écosystème Velito
              </a>
            </p>
          </div>
        </div>
      </footer>
    </>
  );
}
