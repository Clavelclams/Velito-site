/**
 * ConstructionView — Client Component avec la DA cyber/terminal (mockup v4).
 *
 * 3 modes supportés via query param ?mode=construction|404|soon :
 *   - construction (défaut) : "Module en développement"
 *   - 404 : page inexistante (utilisé aussi par not-found.tsx)
 *   - soon : "Très prochainement" (modules dont la date de lancement est connue)
 *
 * Le slug du module (?slug=arena) détermine le titre et l'URL terminal.
 *
 * Symbole VENA : utilise la technique CSS mask-image. Le SVG officiel reste
 * l'asset (public/vena-symbole.svg, fourni par Narrox), et le gradient
 * diagonal magenta → rouge est appliqué via un fond CSS qui passe au travers
 * du masque. Avantage : zéro hardcoding de paths SVG, mise à jour du logo
 * = remplacement du fichier sans toucher au code.
 */

"use client";

import { useSearchParams, useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { modules } from "@/components/galaxy/modules";

const LetterGlitch = dynamic(
  () => import("@/components/glitch/LetterGlitch"),
  { ssr: false }
);

type Mode = "construction" | "404" | "soon";

interface ModeContent {
  status: string;
  title: string;
  subtitle: string;
  terminal: string;
  metaLeft: string;
  metaRight: string;
}

function buildContent(mode: Mode, moduleName: string | null, slug: string | null): ModeContent {
  const moduleSlug = slug ?? "unknown";
  const displayName = moduleName ?? "Cette page";

  switch (mode) {
    case "404":
      return {
        status: "COORDONNÉES INCONNUES",
        title: "404",
        subtitle:
          "Cette page n'existe pas ou a été déplacée. Revenez au hub ou explorez l'écosystème Velito.",
        terminal: `$ resolving /${moduleSlug}... ERR_NOT_FOUND`,
        metaLeft: "VELITO / ERROR / CODE: 404",
        metaRight: "PATH: UNRESOLVED",
      };
    case "soon":
      return {
        status: "TRÈS PROCHAINEMENT",
        title: (moduleName ?? "PROCHAINEMENT").toUpperCase(),
        subtitle:
          moduleName === "Interactive"
            ? "Animations gaming pour bars et MJC. Le module ouvre ses portes mi-juin 2026."
            : `Le module ${displayName} sera disponible très prochainement.`,
        terminal: `$ loading ${moduleSlug}.velito.com [████████░░] 80%`,
        metaLeft: `VELITO / ${moduleSlug.toUpperCase()} / STATUS: SOON`,
        metaRight: moduleName === "Interactive" ? "ETA: JUIN 2026" : "ETA: 2026",
      };
    case "construction":
    default:
      return {
        status: "EN DÉVELOPPEMENT",
        title: (moduleName ?? "EN CONSTRUCTION").toUpperCase(),
        subtitle:
          "Ce module n'est pas encore disponible. Notre équipe finalise son architecture.",
        terminal: `$ initializing ${moduleSlug}.velito.com`,
        metaLeft: `VELITO / ${moduleSlug.toUpperCase()} / STATUS: PENDING`,
        metaRight: "ETA: 2026",
      };
  }
}

export default function ConstructionView() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const slug = searchParams.get("slug");
  const modeParam = searchParams.get("mode");
  const mode: Mode =
    modeParam === "404" || modeParam === "soon" ? modeParam : "construction";

  const module = slug ? modules.find((m) => m.slug === slug) : undefined;
  const content = buildContent(mode, module?.name ?? null, slug);

  return (
    <main
      style={{
        position: "relative",
        minHeight: "100vh",
        width: "100%",
        background: "#04010a",
        overflow: "hidden",
      }}
    >
      {/* Couche 1 : LetterGlitch en fond, opacity 0.55 (atténué). */}
      <div style={{ position: "absolute", inset: 0, opacity: 0.55, zIndex: 0 }}>
        <LetterGlitch
          glitchColors={["#c026d3", "#E63946", "#ffffff"]}
          glitchSpeed={80}
          smooth={true}
          centerVignette={false}
          outerVignette={false}
        />
      </div>

      {/* Couche 2 : outer vignette (fade vers fond aux bords). */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          zIndex: 2,
          background:
            "radial-gradient(circle, rgba(4,1,10,0) 50%, rgba(4,1,10,1) 100%)",
        }}
        aria-hidden="true"
      />

      {/* Couche 3 : center vignette (assombrit le centre pour lisibilité). */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          zIndex: 3,
          background:
            "radial-gradient(circle, rgba(4,1,10,0.85) 0%, rgba(4,1,10,0) 55%)",
        }}
        aria-hidden="true"
      />

      {/* Couche 4 : contenu principal centré. */}
      <div className="construction-content">
        {/*
          Symbole VENA officiel — technique mask-image :
          - Fond = gradient diagonal magenta → rouge
          - Mask = SVG officiel (public/vena-symbole.svg)
          - Résultat : le gradient apparaît UNIQUEMENT là où le SVG est opaque
          - Maintenance : remplacer le fichier SVG = nouveau symbole appliqué auto
        */}
        <div className="construction-logo-wrap">
          <div
            className="construction-logo"
            role="img"
            aria-label="Symbole VENA"
          />
        </div>

        {/* Status pill avec dot animé. */}
        <div className="construction-status-pill">
          <span className="construction-status-dot" aria-hidden="true" />
          <span>{content.status}</span>
        </div>

        {/* Titre énorme en gradient blanc → transparent. */}
        <h1 className="construction-title">{content.title}</h1>

        {/* Subtitle box glassmorphism. */}
        <div className="construction-subtitle-box">
          <p className="construction-subtitle">{content.subtitle}</p>
        </div>

        {/* Ligne terminal avec curseur clignotant. */}
        <div className="construction-terminal">
          <span>{content.terminal}</span>
          <span className="construction-cursor" aria-hidden="true" />
        </div>

        {/* CTAs. */}
        <div className="construction-cta-row">
          <button
            type="button"
            onClick={() => router.push("/")}
            className="construction-cta construction-cta-primary"
          >
            ← Retour au hub Velito
          </button>
          <button
            type="button"
            onClick={() => router.push("/")}
            className="construction-cta construction-cta-ghost"
          >
            Explorer les modules actifs
          </button>
        </div>
      </div>

      {/* Meta strip en bas absolute. */}
      <div className="construction-meta-strip">
        <span>{content.metaLeft}</span>
        <span>{content.metaRight}</span>
      </div>

      <style jsx>{`
        .construction-content {
          position: relative;
          z-index: 10;
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 40px;
          text-align: center;
        }
        .construction-logo-wrap {
          margin-bottom: 28px;
          animation: construction-float 4s ease-in-out infinite;
          filter: drop-shadow(0 0 32px rgba(192, 38, 211, 0.6));
        }
        /*
         * mask-image : le SVG officiel sert de masque (forme), le background
         * gradient remplit la zone visible. Compatible Chrome/Firefox/Safari 14+.
         * Le -webkit-mask est nécessaire pour Safari et anciennes versions Chrome.
         */
        .construction-logo {
          width: 130px;
          height: 130px;
          display: block;
          background: linear-gradient(135deg, #c026d3 0%, #E63946 100%);
          -webkit-mask: url("/vena-symbole.svg") no-repeat center / contain;
          mask: url("/vena-symbole.svg") no-repeat center / contain;
        }
        @keyframes construction-float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }
        .construction-status-pill {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 6px 14px;
          background: rgba(192, 38, 211, 0.1);
          border: 1px solid rgba(192, 38, 211, 0.3);
          border-radius: 100px;
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 2px;
          color: #c026d3;
          text-transform: uppercase;
          margin-bottom: 20px;
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
        }
        .construction-status-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #c026d3;
          animation: construction-pulse 1.5s ease-in-out infinite;
        }
        @keyframes construction-pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(0.8); }
        }
        .construction-title {
          font-family: "JetBrains Mono", "Courier New", monospace;
          font-size: 60px;
          font-weight: 800;
          letter-spacing: -1px;
          margin-bottom: 18px;
          line-height: 1;
          background: linear-gradient(180deg, #ffffff 0%, rgba(255, 255, 255, 0.55) 100%);
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
          color: transparent;
        }
        .construction-subtitle-box {
          background: rgba(4, 1, 10, 0.55);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 12px;
          padding: 14px 22px;
          max-width: 560px;
          margin-bottom: 16px;
          box-shadow: 0 4px 24px rgba(0, 0, 0, 0.4);
        }
        .construction-subtitle {
          font-family: "JetBrains Mono", "Courier New", monospace;
          font-size: 14px;
          color: rgba(255, 255, 255, 0.85);
          line-height: 1.6;
          margin: 0;
        }
        .construction-terminal {
          font-family: "JetBrains Mono", "Courier New", monospace;
          font-size: 12px;
          color: #61dca3;
          margin-bottom: 28px;
          opacity: 0.7;
        }
        .construction-cursor {
          display: inline-block;
          width: 8px;
          height: 14px;
          background: #61dca3;
          margin-left: 4px;
          vertical-align: middle;
          animation: construction-blink 1s step-end infinite;
        }
        @keyframes construction-blink {
          50% { opacity: 0; }
        }
        .construction-cta-row {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
          justify-content: center;
        }
        .construction-cta {
          padding: 14px 24px;
          border-radius: 10px;
          font-size: 13px;
          font-weight: 600;
          text-decoration: none;
          cursor: pointer;
          border: 1px solid;
          transition: all 0.2s ease;
          letter-spacing: 0.5px;
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
        }
        .construction-cta-primary {
          background: rgba(192, 38, 211, 0.2);
          border-color: rgba(192, 38, 211, 0.5);
          color: #fff;
        }
        .construction-cta-primary:hover {
          background: rgba(192, 38, 211, 0.35);
          transform: translateY(-1px);
        }
        .construction-cta-ghost {
          background: rgba(255, 255, 255, 0.04);
          border-color: rgba(255, 255, 255, 0.15);
          color: rgba(255, 255, 255, 0.8);
        }
        .construction-cta-ghost:hover {
          background: rgba(255, 255, 255, 0.08);
          color: #fff;
        }
        .construction-meta-strip {
          position: absolute;
          bottom: 24px;
          left: 24px;
          right: 24px;
          z-index: 10;
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-family: "JetBrains Mono", "Courier New", monospace;
          font-size: 10px;
          color: rgba(255, 255, 255, 0.35);
          letter-spacing: 1px;
        }
      `}</style>
    </main>
  );
}
