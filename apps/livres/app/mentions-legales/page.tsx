/**
 * Mentions légales et confidentialité (13/11/2026).
 * Engagement du cahier des charges : zéro cookie de mesure, zéro traceur,
 * zéro donnée personnelle des habitants.
 */
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Mentions légales" };

export default function MentionsLegales() {
  return (
    <article className="mx-auto max-w-2xl space-y-6 px-4 py-8 leading-relaxed">
      <h1 className="text-2xl font-bold sm:text-3xl">Mentions légales</h1>

      <section>
        <h2 className="mb-2 text-xl font-bold">Éditeur</h2>
        <p>
          Velito Esport Amiens (VEA), association loi 1901, RNA W802018363.
          {/* TODO Clavel : adresse du siège de VEA à compléter (obligatoire, loi LCEN). */}
          <br />
          Directeur de la publication : Clavel NDEMA MOUSSA, président.
          <br />
          Contact : <a href="mailto:contact@velito.fr" className="text-livre-vert underline">contact@velito.fr</a>
        </p>
        <p className="mt-2">Conception et développement bénévoles : VENA (Velito Expertise Numérique Amiens).</p>
      </section>

      <section>
        <h2 className="mb-2 text-xl font-bold">Hébergement</h2>
        <p>
          Site hébergé par Vercel Inc., 340 S Lemon Ave #4133, Walnut, CA 91789,
          États-Unis. Base de données : Supabase, région Europe.
        </p>
      </section>

      <section>
        <h2 className="mb-2 text-xl font-bold">Tes données</h2>
        <ul className="list-disc space-y-1 pl-5">
          <li><b>Aucun cookie de mesure d&apos;audience, aucun traceur, aucune publicité.</b></li>
          <li>
            Un signalement (« elle est vide », « j&apos;ai déposé un livre ») enregistre
            seulement la boîte, le type et, si tu en écris une, ta précision. Ni nom,
            ni e-mail, ni adresse IP.
          </li>
          <li>
            « La plus proche de moi » utilise ta position <b>dans ton téléphone</b>,
            pour trier la liste. Elle n&apos;est jamais envoyée.
          </li>
          <li>
            Le seul cookie possible concerne les bénévoles connectés à leur compte
            Velito, pour l&apos;administration. Il est nécessaire au fonctionnement
            et ne sert à rien d&apos;autre.
          </li>
        </ul>
      </section>

      <section>
        <h2 className="mb-2 text-xl font-bold">Cartes</h2>
        <p>
          Fond de carte © les contributeurs{" "}
          <a href="https://www.openstreetmap.org/copyright" className="text-livre-vert underline">OpenStreetMap</a>{" "}
          (licence ODbL).
        </p>
      </section>
    </article>
  );
}
