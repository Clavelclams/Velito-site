/**
 * /play/[code] — la manette mobile.
 *
 * Server Component minimal qui résout le code de session depuis l'URL,
 * puis rend le formulaire client (<PlayJoinForm />) qui gère :
 *   - choix de l'avatar (galerie 20 persos + customs)
 *   - saisie du pseudo
 *   - submit "Entrer dans la partie"
 *
 * Pourquoi un Server Component + un Client enfant plutôt que tout Client :
 *   - Le matching de l'URL (/play/[code]) est fait par le router Next.js,
 *     donc le Server lit `params` et passe `code` proprement
 *   - Plus tard, ici on validera côté server que la session existe en DB
 *     (lookup `interactive.sessions WHERE code=?`) — si elle n'existe pas
 *     on renvoie une 404 avant même d'envoyer le HTML au navigateur
 *
 * Le composant Client gère tout le côté interactif : pas de useState côté server.
 */
import PlayJoinForm from "./PlayJoinForm";

export default async function PlayController({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6 py-12">
      <PlayJoinForm code={code} />
    </main>
  );
}
