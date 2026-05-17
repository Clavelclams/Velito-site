/**
 * PartnersMarquee — Bandeau des partenaires officiels VEA.
 *
 * Decision juridique (16/05/2026) : VEA n'affiche QUE les partenaires
 * avec lesquels elle a une relation officielle documentee. Logos fournis
 * par moi-meme dans /public/images/partenaires-vea/.
 *
 * 13 partenaires legitimes a date (alphabetique) :
 *   - Amiens Metropole (relation Ana Saur, local Pigeonnier)
 *   - Championnat Federal Rocket League (competition esport)
 *   - Championnat Federal Street Fighter (competition esport)
 *   - EVA
 *   - FFJV (Federation Francaise du Jeu Video)
 *   - France Esports (VEA = antenne HDF)
 *   - Game Cash (sponsor commercial)
 *   - Gazette des Sports (partenaire media)
 *   - Jeunesse en Or (membre partenaire, colocation Pigeonnier)
 *   - MABB (Metropole Amiens Basket Ball, membre fondateur)
 *   - Ministere de l'Education Nationale et de la Jeunesse
 *   - Pedagojeux (asso pedagogie jeu video)
 *   - Warpzone (lieu gaming Amiens)
 *
 * RETIRE : velitoEsport-old.png — c'est l'ancien logo de VEA elle-meme,
 * pas un partenaire. Un site n'affiche pas son propre vieux logo en "soutien".
 *
 * Implementation : marquee defilant infini facon mabb.fr (la liste est
 * assez longue pour ne pas paraitre artificielle).
 *
 * Pas "use client" : composant 100% CSS, animation dans globals.css.
 */
import Image from "next/image";

interface Partner {
  name: string;
  src: string;
}

const PARTNERS: Partner[] = [
  {
    name: "France Esports",
    src: "/images/partenaires-vea/france-esport-logo.png",
  },
  {
    name: "FFJV",
    src: "/images/partenaires-vea/FFJV-logo.png",
  },
  {
    name: "Jeunesse en Or",
    src: "/images/partenaires-vea/JEO-logo.png",
  },
  {
    name: "MABB",
    src: "/images/partenaires-vea/mabb-logo.png",
  },
  {
    name: "Amiens Metropole",
    src: "/images/partenaires-vea/Amiens-metropole.png",
  },
  {
    name: "Ministere de l'Education Nationale et de la Jeunesse",
    src: "/images/partenaires-vea/Ministere-education-national-jeunesse.png",
  },
  {
    name: "Championnat Federal Street Fighter",
    src: "/images/partenaires-vea/Championnat-federal-SF.png",
  },
  {
    name: "Championnat Federal Rocket League",
    src: "/images/partenaires-vea/championnat-federal-RL.png",
  },
  {
    name: "Pedagojeux",
    src: "/images/partenaires-vea/pedagojeux.png",
  },
  {
    name: "EVA",
    src: "/images/partenaires-vea/EVA.png",
  },
  {
    name: "Warpzone",
    src: "/images/partenaires-vea/Warpzone.png",
  },
  {
    name: "Game Cash",
    src: "/images/partenaires-vea/Game cash.png",
  },
  {
    name: "Gazette des Sports",
    src: "/images/partenaires-vea/Gazette-sport.png",
  },
];

export default function PartnersMarquee() {
  // Je duplique la liste pour que la boucle translateX(0 -> -50%) raccorde
  // sans saut visible. Cle unique = nom + index pour eviter le warning React.
  const items = [...PARTNERS, ...PARTNERS];

  return (
    <div
      className="partners-marquee"
      role="region"
      aria-label="Partenaires officiels de VEA"
    >
      <div className="partners-marquee-track">
        {items.map((p, i) => (
          <div key={`${p.name}-${i}`} className="partners-marquee-item">
            <Image
              src={p.src}
              alt={p.name}
              width={120}
              height={80}
              className="partners-marquee-logo"
            />
          </div>
        ))}
      </div>
    </div>
  );
}
