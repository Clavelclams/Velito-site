"use client";

/**
 * Filet de sécurité ULTIME — attrape les erreurs du layout racine lui-même.
 *
 * Hiérarchie des filets d'erreur Next.js (à savoir pour le jury) :
 *  1. Erreur métier attendue → gérée par le code (bandeau ?erreur=, écran config)
 *  2. Erreur imprévue dans une page/segment → app/error.tsx (boundary React)
 *  3. Erreur dans le layout RACINE → ce fichier, global-error.tsx, qui doit
 *     fournir ses propres <html>/<body> car le layout racine est hors-jeu.
 *
 * Sans ce fichier, une erreur au niveau racine affiche la page 500 brute de
 * Next — inacceptable pour un lien public (incident /admin du 10/08/2026).
 */
export default function ErreurRacine({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="fr">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0f0f1a",
          color: "#f3f4f6",
          fontFamily: "system-ui, sans-serif",
          textAlign: "center",
        }}
      >
        {/* Styles inline : globals.css n'est pas garanti ici (layout racine HS) */}
        <div style={{ maxWidth: 420, padding: 24 }}>
          <p style={{ fontSize: 40, margin: 0 }}>😵</p>
          <h1 style={{ fontSize: 20, fontWeight: 700 }}>
            ARENA a rencontré un problème
          </h1>
          <p style={{ color: "#9ca3af", fontSize: 14, lineHeight: 1.6 }}>
            Réessaie dans un instant. Si ça persiste pendant un tournoi :
            continuez sur papier, les scores seront ressaisis ensuite.
          </p>
          <button
            onClick={reset}
            style={{
              marginTop: 16,
              padding: "10px 20px",
              borderRadius: 8,
              border: "none",
              background: "#7c3aed",
              color: "#fff",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Réessayer
          </button>
        </div>
      </body>
    </html>
  );
}
