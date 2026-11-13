/** À propos (13/11/2026) : l'histoire du projet, la charte, le contact. */
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "À propos",
  description: "Le réseau des boîtes à livres d'Amiens : comment ça marche, la charte de bon usage, qui s'en occupe.",
};

export default function APropos() {
  return (
    <article className="mx-auto max-w-2xl space-y-6 px-4 py-8 leading-relaxed">
      <h1 className="text-2xl font-bold sm:text-3xl">À propos</h1>

      <section>
        <h2 className="mb-2 text-xl font-bold">Le principe</h2>
        <p>
          Une boîte à livres, c&apos;est une petite bibliothèque libre, dans la rue.
          On y prend un livre gratuitement, on en dépose un quand on veut. Pas
          d&apos;inscription, pas d&apos;obligation de rendre.
        </p>
        <p className="mt-2">
          Ce site recense les boîtes d&apos;Amiens, montre leur état et permet à
          chacun de prévenir quand une boîte est vide ou abîmée. Il est gratuit,
          sans compte, sans publicité, et son code est ouvert.
        </p>
      </section>

      <section>
        <h2 className="mb-2 text-xl font-bold">La charte de bon usage</h2>
        <ul className="list-disc space-y-1 pl-5">
          <li>Dépose des livres en bon état, que tu aurais envie de lire.</li>
          <li>Pas de livres abîmés, mouillés, ni de contenu réservé aux adultes : des enfants se servent aussi.</li>
          <li>Ne vide pas une boîte d&apos;un coup : prends ce que tu vas lire.</li>
          <li>Une boîte pleine ? Garde ton livre pour la suivante, ou dépose-le ailleurs.</li>
          <li>Un problème ? Signale-le depuis la fiche de la boîte.</li>
        </ul>
      </section>

      <section>
        <h2 className="mb-2 text-xl font-bold">Qui s&apos;en occupe</h2>
        <p>
          Le projet est porté par <a href="https://vea.velito.fr" className="text-livre-vert underline">Velito Esport Amiens</a>,
          association qui accompagne les habitants des quartiers d&apos;Amiens. Le
          site a été conçu bénévolement par <a href="https://velito.fr" className="text-livre-vert underline">VENA</a>.
          Des bénévoles référents passent régulièrement remplir et vérifier les boîtes.
        </p>
      </section>

      <section id="contact">
        <h2 className="mb-2 text-xl font-bold">Contact</h2>
        <p>
          Tu connais une boîte qui n&apos;est pas sur la carte, tu veux devenir
          référent d&apos;une boîte, ou proposer un nouvel emplacement ? Écris à{" "}
          <a href="mailto:contact@velito.fr" className="text-livre-vert underline">contact@velito.fr</a>.
        </p>
      </section>
    </article>
  );
}
