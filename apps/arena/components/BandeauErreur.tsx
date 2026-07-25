/**
 * Bandeau d'erreur métier — affiché quand une Server Action a redirigé avec
 * ?erreur=<message> (voir lib/arena/actions.ts, helper redirectionErreur).
 * Server Component : aucun JS client, le message vient de l'URL.
 */
export default function BandeauErreur({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <div
      role="alert"
      className="mb-6 rounded-lg border border-arena-red/40 bg-arena-red/10 px-4 py-3 text-sm font-semibold text-arena-red"
    >
      ⚠️ {message}
    </div>
  );
}
