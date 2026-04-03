"use client";

/**
 * CinemaHub — Expérience cinématographique scroll-driven pour velito.com
 *
 * Mécanique reproduite depuis bassemth (incipit-studio.com) :
 * - Rangées de sièges empilées avec background-repeat: repeat-x
 * - Dézoom progressif rangée par rangée via GSAP ScrollTrigger
 * - 3 états : Galaxie (zoom écran) → Salle (dézoom) → Choix (re-zoom)
 *
 * Scroll total : 350vh (sticky 100vh)
 * Stack : Next.js App Router, TypeScript, Tailwind v3, GSAP + ScrollTrigger
 */

import { useEffect, useRef, useState, useCallback } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

// ===== DONNÉES =====

const CHOICES = [
  {
    text: "Je cherche une communauté esport locale",
    badge: "VEA",
    color: "#E63946",
    href: "https://vea.velito.com",
  },
  {
    text: "J'ai besoin d'un site web ou service digital",
    badge: "VENA",
    color: "#00E87A",
    href: "https://vena.velito.com",
  },
  {
    text: "Je veux organiser ou jouer en tournoi",
    badge: "ARENA",
    color: "#c084fc",
    href: "https://arena.velito.com",
  },
  {
    text: "J'anime un bar, une MJC, un espace jeunes",
    badge: "INTERACTIVE",
    color: "#4ECAFF",
    href: "https://interactive.velito.com",
  },
  {
    text: "Je veux agir pour la prévention numérique",
    badge: "PRÉVENTION",
    color: "#fb923c",
    href: "https://prevention.velito.com",
  },
];

/**
 * Config des 10 rangées de sièges.
 * - row: numéro (1-10), correspond à row1.webp → row10.webp
 * - z: z-index (les rangées proches passent devant)
 * - h: hauteur en px (plus grande = plus proche du spectateur)
 * - startScale: scale initial avant dézoom (caché derrière le viewport)
 * - startPct / endPct: % du scroll où le dézoom commence et finit
 */
const SEAT_CONFIG = [
  { row: 1,  z: 7,  h: 130, startScale: 2.5, startPct: 0,  endPct: 45 },
  { row: 2,  z: 8,  h: 150, startScale: 3.0, startPct: 5,  endPct: 48 },
  { row: 3,  z: 9,  h: 165, startScale: 3.0, startPct: 10, endPct: 50 },
  { row: 4,  z: 10, h: 178, startScale: 3.0, startPct: 14, endPct: 52 },
  { row: 5,  z: 11, h: 190, startScale: 3.0, startPct: 18, endPct: 54 },
  { row: 6,  z: 12, h: 205, startScale: 3.0, startPct: 22, endPct: 55 },
  { row: 7,  z: 13, h: 218, startScale: 3.0, startPct: 26, endPct: 56 },
  { row: 8,  z: 14, h: 235, startScale: 3.0, startPct: 30, endPct: 57 },
  { row: 9,  z: 15, h: 280, startScale: 8.0, startPct: 34, endPct: 58 },
  { row: 10, z: 16, h: 320, startScale: 8.0, startPct: 36, endPct: 58 },
];

// ===== TYPES CANVAS =====

interface Star {
  x: number;
  y: number;
  r: number;
  speed: number;
  opacity: number;
  hue: number; // 0=blanc, 280=violet, 340=rose
}

interface ShootingStar {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
}

// ===== COMPOSANT =====

export default function CinemaHub() {
  const cursorDotRef = useRef<HTMLDivElement>(null);
  const cursorRingRef = useRef<HTMLDivElement>(null);
  const [flashColor, setFlashColor] = useState<string | null>(null);

  // ===== GALAXIE CANVAS =====
  const initGalaxy = useCallback((canvas: HTMLCanvasElement, starCount = 280) => {
    const ctx = canvas.getContext("2d");
    if (!ctx) return () => {};

    const stars: Star[] = [];
    const shootingStars: ShootingStar[] = [];
    let lastShootingTime = 0;
    let animId = 0;

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = canvas.offsetWidth * dpr;
      canvas.height = canvas.offsetHeight * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const createStars = () => {
      stars.length = 0;
      const w = canvas.offsetWidth;
      const h = canvas.offsetHeight;
      for (let i = 0; i < starCount; i++) {
        // Teinte aléatoire : 40% blanc, 30% rose/lavande, 30% violet
        const rand = Math.random();
        let hue = 0;
        if (rand > 0.7) hue = 280;       // violet
        else if (rand > 0.4) hue = 340;  // rose/lavande

        stars.push({
          x: Math.random() * w,
          y: Math.random() * h,
          r: Math.random() * 1.6 + 0.3,
          speed: Math.random() * 0.02 + 0.005,
          opacity: Math.random(),
          hue,
        });
      }
    };

    resize();
    createStars();

    const draw = (time: number) => {
      const w = canvas.offsetWidth;
      const h = canvas.offsetHeight;
      ctx.clearRect(0, 0, w, h);

      // Fond : radialGradient sombre
      const bgGrad = ctx.createRadialGradient(w * 0.5, h * 0.4, 0, w * 0.5, h * 0.4, w * 0.7);
      bgGrad.addColorStop(0, "#0d0218");
      bgGrad.addColorStop(1, "#04000a");
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, w, h);

      // Bras galactique rose/violet centré
      const armGrad = ctx.createRadialGradient(w * 0.5, h * 0.35, 0, w * 0.5, h * 0.35, w * 0.35);
      armGrad.addColorStop(0, "rgba(180,80,160,0.08)");
      armGrad.addColorStop(0.4, "rgba(124,58,237,0.05)");
      armGrad.addColorStop(1, "transparent");
      ctx.fillStyle = armGrad;
      ctx.fillRect(0, 0, w, h);

      // Nébuleuse rose droite
      const nebR = ctx.createRadialGradient(w * 0.75, h * 0.55, 0, w * 0.75, h * 0.55, w * 0.22);
      nebR.addColorStop(0, "rgba(230,57,70,0.06)");
      nebR.addColorStop(1, "transparent");
      ctx.fillStyle = nebR;
      ctx.fillRect(0, 0, w, h);

      // Nébuleuse violette gauche
      const nebL = ctx.createRadialGradient(w * 0.25, h * 0.4, 0, w * 0.25, h * 0.4, w * 0.2);
      nebL.addColorStop(0, "rgba(124,58,237,0.05)");
      nebL.addColorStop(1, "transparent");
      ctx.fillStyle = nebL;
      ctx.fillRect(0, 0, w, h);

      // Lueur centrale blanc rosé
      const glow = ctx.createRadialGradient(w * 0.5, h * 0.38, 0, w * 0.5, h * 0.38, w * 0.12);
      glow.addColorStop(0, "rgba(255,220,240,0.04)");
      glow.addColorStop(1, "transparent");
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, w, h);

      // Étoiles scintillantes
      for (const star of stars) {
        star.opacity += star.speed;
        if (star.opacity > 1 || star.opacity < 0.1) star.speed *= -1;

        ctx.beginPath();
        ctx.arc(star.x, star.y, star.r, 0, Math.PI * 2);
        if (star.hue === 0) {
          ctx.fillStyle = `rgba(255,255,255,${star.opacity * 0.8})`;
        } else if (star.hue === 340) {
          ctx.fillStyle = `rgba(255,180,220,${star.opacity * 0.7})`;
        } else {
          ctx.fillStyle = `rgba(180,140,255,${star.opacity * 0.7})`;
        }
        ctx.fill();
      }

      // Étoiles filantes (~5s intervalle)
      if (time - lastShootingTime > 5000 + Math.random() * 3000) {
        lastShootingTime = time;
        shootingStars.push({
          x: Math.random() * w * 0.8,
          y: Math.random() * h * 0.3,
          vx: 3 + Math.random() * 2,
          vy: 1.5 + Math.random(),
          life: 0,
          maxLife: 40 + Math.random() * 20,
        });
      }

      for (let i = shootingStars.length - 1; i >= 0; i--) {
        const ss = shootingStars[i]!;
        ss.x += ss.vx;
        ss.y += ss.vy;
        ss.life++;

        const alpha = 1 - ss.life / ss.maxLife;
        ctx.beginPath();
        ctx.moveTo(ss.x, ss.y);
        ctx.lineTo(ss.x - ss.vx * 8, ss.y - ss.vy * 8);
        // Traînée rosée
        ctx.strokeStyle = `rgba(255,200,230,${alpha * 0.6})`;
        ctx.lineWidth = 1.2;
        ctx.stroke();

        if (ss.life >= ss.maxLife) shootingStars.splice(i, 1);
      }

      animId = requestAnimationFrame(draw);
    };

    animId = requestAnimationFrame(draw);

    const onResize = () => {
      resize();
      createStars();
    };
    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  // ===== CURSEUR CUSTOM (desktop only) =====
  useEffect(() => {
    if (!window.matchMedia("(pointer: fine)").matches) return;

    document.body.classList.add("custom-cursor");

    const dot = cursorDotRef.current;
    const ring = cursorRingRef.current;
    if (!dot || !ring) return;

    let mouseX = 0;
    let mouseY = 0;
    let ringX = 0;
    let ringY = 0;

    const onMove = (e: MouseEvent) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
      dot.style.left = `${mouseX}px`;
      dot.style.top = `${mouseY}px`;
    };

    let raf = 0;
    const lerpRing = () => {
      ringX += (mouseX - ringX) * 0.1;
      ringY += (mouseY - ringY) * 0.1;
      ring.style.left = `${ringX}px`;
      ring.style.top = `${ringY}px`;
      raf = requestAnimationFrame(lerpRing);
    };

    const onOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest("a, button, [data-clickable]")) {
        ring.style.width = "44px";
        ring.style.height = "44px";
        ring.style.borderColor = "rgba(255,255,255,0.5)";
      }
    };
    const onOut = () => {
      ring.style.width = "24px";
      ring.style.height = "24px";
      ring.style.borderColor = "rgba(255,180,220,0.35)";
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseover", onOver);
    window.addEventListener("mouseout", onOut);
    raf = requestAnimationFrame(lerpRing);

    return () => {
      document.body.classList.remove("custom-cursor");
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseover", onOver);
      window.removeEventListener("mouseout", onOut);
      cancelAnimationFrame(raf);
    };
  }, []);

  // ===== GSAP SCROLL ANIMATIONS =====
  useEffect(() => {
    const bgCanvas = document.getElementById("galaxy-bg") as HTMLCanvasElement;
    const screenCanvas = document.getElementById("screen-galaxy") as HTMLCanvasElement;
    if (!bgCanvas || !screenCanvas) return;

    // Init les 2 canvas galaxie (fond plein écran + mini dans l'écran billboard)
    const cleanupBg = initGalaxy(bgCanvas, 280);
    const cleanupScreen = initGalaxy(screenCanvas, 120);

    const ctx = gsap.context(() => {
      // ===== DÉZOOM MONDE 0%→40% : scale(3.8) → scale(1) =====
      gsap.fromTo(
        "#cinema-world",
        { scale: 3.8, transformOrigin: "center 32%" },
        {
          scale: 1,
          ease: "none",
          scrollTrigger: {
            trigger: "#scroll-section",
            start: "top top",
            end: "40% top",
            scrub: 1.2,
          },
        }
      );

      // ===== RANGÉES DE SIÈGES — dézoom individuel =====
      SEAT_CONFIG.forEach(({ row, startScale, startPct, endPct }) => {
        const el = document.querySelector(`[data-row="${row}"]`);
        if (!el) return;

        gsap.fromTo(
          el,
          { scale: startScale, y: 0 },
          {
            scale: 1,
            y: -15,
            ease: "none",
            scrollTrigger: {
              trigger: "#scroll-section",
              start: `${startPct}% top`,
              end: `${endPct}% top`,
              scrub: 1.5,
            },
          }
        );
      });

      // ===== RE-ZOOM SUR L'ÉCRAN 55%→75% =====
      gsap.fromTo(
        "#cinema-world",
        { scale: 1 },
        {
          scale: 2.6,
          transformOrigin: "center 32%",
          ease: "none",
          scrollTrigger: {
            trigger: "#scroll-section",
            start: "55% top",
            end: "75% top",
            scrub: 1.2,
          },
        }
      );

      // ===== APPARITION CHOICE SCREEN à 70% =====
      ScrollTrigger.create({
        trigger: "#scroll-section",
        start: "70% top",
        onEnter: () => {
          const intro = document.getElementById("screen-intro");
          const choice = document.getElementById("screen-choice");
          if (intro) intro.style.opacity = "0";
          if (choice) {
            choice.style.opacity = "1";
            choice.style.pointerEvents = "auto";
          }
        },
        onLeaveBack: () => {
          const intro = document.getElementById("screen-intro");
          const choice = document.getElementById("screen-choice");
          if (intro) intro.style.opacity = "1";
          if (choice) {
            choice.style.opacity = "0";
            choice.style.pointerEvents = "none";
          }
        },
      });
    });

    return () => {
      ctx.revert();
      cleanupBg();
      cleanupScreen();
    };
  }, [initGalaxy]);

  // ===== HANDLER CHOIX =====
  const handleChoice = (color: string, href: string) => {
    setFlashColor(color);
    setTimeout(() => {
      window.location.href = href;
    }, 280);
  };

  return (
    <main style={{ background: "#06020e" }}>
      {/* ===== NAVBAR FIXE ===== */}
      <nav
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          height: 52,
          zIndex: 100,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 20px",
          background: "rgba(4,0,10,0.72)",
          backdropFilter: "blur(12px)",
          borderBottom: "1px solid rgba(255,150,200,.04)",
        }}
      >
        <div />
        <div
          style={{
            fontFamily: "Orbitron",
            fontWeight: 900,
            fontSize: 13,
            letterSpacing: 5,
            color: "rgba(255,255,255,.92)",
          }}
        >
          VELITO<span style={{ color: "#c026d3" }}>.</span>
        </div>
        <div style={{ display: "flex", gap: 14 }}>
          {["Projets", "À propos", "Contact"].map((l) => (
            <span
              key={l}
              style={{
                fontFamily: "Orbitron",
                fontSize: 7,
                letterSpacing: 3,
                color: "rgba(255,200,230,.28)",
                cursor: "pointer",
              }}
            >
              {l}
            </span>
          ))}
        </div>
      </nav>

      {/* ===== SECTION SCROLL 350vh ===== */}
      <div
        id="scroll-section"
        style={{ height: "350vh", position: "relative" }}
      >
        {/* Sticky container */}
        <div
          style={{
            position: "sticky",
            top: 0,
            height: "100vh",
            overflow: "hidden",
          }}
        >
          {/* ===== CANVAS GALAXIE FOND PLEIN ÉCRAN ===== */}
          <canvas
            id="galaxy-bg"
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              zIndex: 0,
            }}
          />

          {/* ===== MONDE CINÉMA (tout ce qui dézoom/rezoom) ===== */}
          <div
            id="cinema-world"
            style={{
              position: "absolute",
              inset: 0,
              transformOrigin: "center 32%",
            }}
          >
            {/* Fond de salle */}
            <img
              src="/assets/cinema/theater-bg.webp"
              alt=""
              style={{
                position: "absolute",
                inset: 0,
                width: "100%",
                height: "100%",
                objectFit: "cover",
                opacity: 0.72,
                zIndex: 1,
              }}
            />

            {/* ===== ÉCRAN BILLBOARD ===== */}
            <div
              id="screen"
              style={{
                position: "absolute",
                top: "9%",
                left: "13%",
                width: "74%",
                aspectRatio: "16/9",
                zIndex: 5,
                overflow: "hidden",
                border: "3px solid #1a0820",
                boxShadow:
                  "0 0 80px rgba(180,60,120,.18), 0 30px 80px rgba(0,0,0,.9)",
              }}
            >
              {/* Canvas galaxie miniature dans l'écran */}
              <canvas
                id="screen-galaxy"
                style={{
                  position: "absolute",
                  inset: 0,
                  width: "100%",
                  height: "100%",
                }}
              />

              {/* CONTENU ÉCRAN — ÉTAT 0 : Intro */}
              <div
                id="screen-intro"
                style={{
                  position: "absolute",
                  inset: 0,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  zIndex: 2,
                  transition: "opacity 0.5s",
                }}
              >
                <p
                  className="font-orbitron"
                  style={{
                    color: "rgba(255,255,255,0.4)",
                    fontSize: "clamp(5px, 0.7vw, 11px)",
                    letterSpacing: 6,
                    textTransform: "uppercase",
                    marginBottom: 16,
                  }}
                >
                  VELITO &middot; DIGITAL ECOSYSTEM &middot; AMIENS
                </p>
                <h1
                  className="font-orbitron"
                  style={{
                    fontWeight: 900,
                    color: "white",
                    textAlign: "center",
                    lineHeight: 1.1,
                    fontSize: "clamp(14px, 3.2vw, 52px)",
                    letterSpacing: 2,
                  }}
                >
                  TON UNIVERS
                  <br />
                  NUMÉRIQUE
                </h1>
                <p
                  className="font-exo"
                  style={{
                    color: "rgba(255,255,255,0.3)",
                    fontSize: "clamp(6px, 0.8vw, 13px)",
                    marginTop: 12,
                  }}
                >
                  On t&apos;accompagne jusqu&apos;au bon endroit.
                </p>
                <div
                  className="scroll-indicator"
                  style={{
                    marginTop: 32,
                    color: "rgba(255,255,255,0.3)",
                    fontSize: "clamp(6px, 0.65vw, 10px)",
                  }}
                >
                  <span
                    className="font-orbitron"
                    style={{ letterSpacing: 3 }}
                  >
                    SCROLL &darr;
                  </span>
                </div>
              </div>

              {/* CONTENU ÉCRAN — ÉTAT 2 : Choix */}
              <div
                id="screen-choice"
                style={{
                  position: "absolute",
                  inset: 0,
                  opacity: 0,
                  pointerEvents: "none",
                  background: "#050008",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  transition: "opacity 0.6s",
                  zIndex: 3,
                }}
              >
                <p
                  className="font-orbitron"
                  style={{
                    color: "rgba(255,255,255,0.3)",
                    fontSize: "clamp(5px, 0.6vw, 9px)",
                    letterSpacing: 5,
                    textTransform: "uppercase",
                    marginBottom: 24,
                  }}
                >
                  TU CHERCHES QUOI ?
                </p>

                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 8,
                    width: "88%",
                    maxWidth: "clamp(200px, 36vw, 520px)",
                  }}
                >
                  {CHOICES.map((c) => (
                    <button
                      key={c.badge}
                      data-clickable
                      onClick={() => handleChoice(c.color, c.href)}
                      onMouseEnter={(e) => {
                        const el = e.currentTarget;
                        el.style.borderColor = c.color + "40";
                        el.style.background = c.color + "08";
                      }}
                      onMouseLeave={(e) => {
                        const el = e.currentTarget;
                        el.style.borderColor = "rgba(255,180,220,.08)";
                        el.style.background = "rgba(255,255,255,.028)";
                      }}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        width: "100%",
                        padding: "5px 10px",
                        background: "rgba(255,255,255,.028)",
                        border: "1px solid rgba(255,180,220,.08)",
                        borderRadius: 6,
                        cursor: "pointer",
                        textAlign: "left",
                        transition: "all 0.2s",
                      }}
                    >
                      <span
                        className="font-exo"
                        style={{
                          color: "rgba(255,255,255,0.7)",
                          fontSize: "clamp(5px, 0.7vw, 11px)",
                        }}
                      >
                        {c.text}
                      </span>
                      <span
                        className="font-orbitron"
                        style={{
                          color: c.color,
                          fontWeight: 700,
                          fontSize: "clamp(5px, 0.55vw, 9px)",
                          letterSpacing: 2,
                          flexShrink: 0,
                          marginLeft: 12,
                        }}
                      >
                        {c.badge}
                      </span>
                    </button>
                  ))}
                </div>

                <button
                  data-clickable
                  onClick={() =>
                    window.scrollTo({ top: 0, behavior: "smooth" })
                  }
                  className="font-orbitron"
                  style={{
                    marginTop: 24,
                    color: "rgba(255,255,255,0.2)",
                    fontSize: "clamp(4px, 0.5vw, 8px)",
                    letterSpacing: 3,
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                  }}
                >
                  &larr; RETOUR
                </button>
              </div>
            </div>

            {/* ===== SIÈGES — repeat-x par rangée ===== */}
            <div
              style={{
                position: "absolute",
                inset: 0,
                zIndex: 6,
                pointerEvents: "none",
                overflow: "hidden",
              }}
            >
              {/* Fondu noir bas pour fondre les sièges dans le fond */}
              <div
                style={{
                  position: "absolute",
                  bottom: 0,
                  left: 0,
                  width: "100%",
                  height: "45%",
                  zIndex: 20,
                  background:
                    "linear-gradient(to top, #06000c 0%, #06000c 15%, transparent 100%)",
                }}
              />

              {/* Les 10 rangées */}
              {SEAT_CONFIG.map(({ row, z, h }) => (
                <div
                  key={row}
                  data-row={row}
                  style={{
                    position: "absolute",
                    bottom: 0,
                    left: 0,
                    width: "100%",
                    height: h,
                    zIndex: z,
                    transformOrigin: "bottom center",
                    backgroundImage: `url(/assets/cinema/row${row}.webp)`,
                    backgroundRepeat: "repeat-x",
                    backgroundSize: "auto 100%",
                    backgroundPosition: "bottom center",
                  }}
                />
              ))}
            </div>
          </div>

          {/* ===== CURSEUR CUSTOM ===== */}
          <div
            ref={cursorDotRef}
            id="cursor-dot"
            style={{
              position: "fixed",
              width: 5,
              height: 5,
              borderRadius: "50%",
              background: "#fff",
              transform: "translate(-50%,-50%)",
              pointerEvents: "none",
              zIndex: 999,
              left: -99,
              top: -99,
            }}
          />
          <div
            ref={cursorRingRef}
            id="cursor-ring"
            style={{
              position: "fixed",
              width: 24,
              height: 24,
              borderRadius: "50%",
              border: "1px solid rgba(255,180,220,.35)",
              transform: "translate(-50%,-50%)",
              pointerEvents: "none",
              zIndex: 998,
              transition: "width .25s, height .25s",
              left: -99,
              top: -99,
            }}
          />
        </div>
      </div>

      {/* ===== FLASH OVERLAY ===== */}
      {flashColor && (
        <div
          className="flash-overlay"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 300,
            background: flashColor,
            pointerEvents: "none",
          }}
          onAnimationEnd={() => setFlashColor(null)}
        />
      )}
    </main>
  );
}
