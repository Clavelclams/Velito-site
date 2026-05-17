/**
 * LetterGlitch — fond de lettres glitch animé en Canvas 2D.
 *
 * Adapté du composant React Bits (JS → TS). Aucune dépendance externe.
 *
 * Concept :
 *   - Grille de caractères ASCII aléatoires rendus en monospace.
 *   - À intervalle régulier (glitchSpeed ms), ~5% des cellules changent
 *     de caractère ET de couleur.
 *   - Si smooth=true, transition de couleur interpolée en plusieurs frames.
 *
 * ─────────────────────────────────────────────────────────────────────────
 *  EASTER EGGS — IMPORTANT : NE PAS SUPPRIMER SANS ME DEMANDER
 * ─────────────────────────────────────────────────────────────────────────
 *
 * Toutes les 8-12 secondes, un mot apparaît brièvement dans une ligne
 * aléatoire de la grille, en blanc franc (plus visible que le glitch normal).
 *
 * Mots courts (95% des apparitions) :
 *   VELITO, AMIENS, VEA, MORSE, BETA, OPEN, 1999, PIXEL, CTRL+F
 *
 * Phrases longues (5% des apparitions) :
 *   "MELINE·J'Y·SUIS·PRESQUE·ARRIVE"
 *      → Dédicace personnelle. Méline (ma petite amie, décédée)
 *        m'avait parlé de créer quelque chose qui marquerait le monde,
 *        ou un jeu vidéo. Velito est cette chose. In memoriam.
 *   "LA·VIE·EST·BELLE"
 *      → Citation très répandue chez les artistes d'Amiens, et que Méline
 *        elle-même disait. Hommage au territoire et à elle. Paix à son âme.
 *
 * Les espaces dans les phrases longues sont remplacés par "·" (U+00B7,
 * middle dot) car le rendu monospace afficherait des trous visuels sinon.
 *
 * Le système d'easter eggs est protégé contre updateLetters() pendant
 * sa durée d'affichage (enforceEasterEgg() écrase les cells concernées
 * à chaque frame jusqu'à expiresAt).
 * ─────────────────────────────────────────────────────────────────────────
 */

"use client";

import { useEffect, useRef } from "react";

interface Letter {
  char: string;
  color: string;
  targetColor: string;
  colorProgress: number;
}

interface EasterEggState {
  startIdx: number;
  chars: string[];
  expiresAt: number;
}

interface LetterGlitchProps {
  glitchColors?: string[];
  className?: string;
  glitchSpeed?: number;
  centerVignette?: boolean;
  outerVignette?: boolean;
  smooth?: boolean;
  characters?: string;
}

const EASTER_SHORT_WORDS = [
  "VELITO",
  "AMIENS",
  "VEA",
  "MORSE",
  "BETA",
  "OPEN",
  "1999",
  "PIXEL",
  "CTRL+F",
];

const EASTER_LONG_PHRASES = [
  "MELINE·J'Y·SUIS·PRESQUE·ARRIVE",
  "LA·VIE·EST·BELLE",
];

const LONG_PHRASE_PROBABILITY = 0.05;

export default function LetterGlitch({
  glitchColors = ["#2b4539", "#61dca3", "#61b3dc"],
  className = "",
  glitchSpeed = 50,
  centerVignette = false,
  outerVignette = true,
  smooth = true,
  characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ!@#$&*()-_+=/[]{};:<>.,0123456789",
}: LetterGlitchProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationRef = useRef<number | null>(null);
  const letters = useRef<Letter[]>([]);
  const grid = useRef({ columns: 0, rows: 0 });
  const context = useRef<CanvasRenderingContext2D | null>(null);
  const lastGlitchTime = useRef(Date.now());
  const easterEgg = useRef<EasterEggState | null>(null);
  const easterEggTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    context.current = ctx;

    const fontSize = 16;
    const charWidth = 10;
    const charHeight = 20;
    const lettersAndSymbols = Array.from(characters);

    const getRandomChar = (): string => {
      const i = Math.floor(Math.random() * lettersAndSymbols.length);
      return lettersAndSymbols[i] ?? "?";
    };
    const getRandomColor = (): string => {
      const i = Math.floor(Math.random() * glitchColors.length);
      return glitchColors[i] ?? "#FFFFFF";
    };

    const hexToRgb = (hex: string): { r: number; g: number; b: number } | null => {
      const shorthand = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
      hex = hex.replace(shorthand, (_m, r, g, b) => r + r + g + g + b + b);
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      if (!result) return null;
      return {
        r: parseInt(result[1]!, 16),
        g: parseInt(result[2]!, 16),
        b: parseInt(result[3]!, 16),
      };
    };

    const interpolateColor = (
      start: { r: number; g: number; b: number },
      end: { r: number; g: number; b: number },
      factor: number
    ): string => {
      const r = Math.round(start.r + (end.r - start.r) * factor);
      const g = Math.round(start.g + (end.g - start.g) * factor);
      const b = Math.round(start.b + (end.b - start.b) * factor);
      return `rgb(${r}, ${g}, ${b})`;
    };

    const calculateGrid = (width: number, height: number) => {
      const columns = Math.ceil(width / charWidth);
      const rows = Math.ceil(height / charHeight);
      return { columns, rows };
    };

    const initializeLetters = (columns: number, rows: number) => {
      grid.current = { columns, rows };
      const total = columns * rows;
      letters.current = Array.from({ length: total }, () => ({
        char: getRandomChar(),
        color: getRandomColor(),
        targetColor: getRandomColor(),
        colorProgress: 1,
      }));
    };

    const triggerEasterEgg = () => {
      const useLong = Math.random() < LONG_PHRASE_PROBABILITY;
      const pool = useLong ? EASTER_LONG_PHRASES : EASTER_SHORT_WORDS;
      const phrase = pool[Math.floor(Math.random() * pool.length)] ?? "VELITO";
      const chars = Array.from(phrase);

      const { columns, rows } = grid.current;
      if (columns === 0 || rows === 0 || chars.length > columns) return;

      const row = Math.floor(Math.random() * rows);
      const maxCol = Math.max(1, columns - chars.length);
      const col = Math.floor(Math.random() * maxCol);
      const startIdx = row * columns + col;

      const duration = useLong ? 1500 : 800;

      easterEgg.current = {
        startIdx,
        chars,
        expiresAt: Date.now() + duration,
      };
    };

    const enforceEasterEgg = () => {
      if (!easterEgg.current) return;
      if (Date.now() > easterEgg.current.expiresAt) {
        easterEgg.current = null;
        return;
      }
      const { startIdx, chars } = easterEgg.current;
      for (let i = 0; i < chars.length; i++) {
        const cell = letters.current[startIdx + i];
        if (cell) {
          cell.char = chars[i] ?? "?";
          cell.color = "#FFFFFF";
          cell.targetColor = "#FFFFFF";
          cell.colorProgress = 1;
        }
      }
    };

    const scheduleNextEasterEgg = () => {
      const delay = 8000 + Math.random() * 4000;
      easterEggTimer.current = setTimeout(() => {
        triggerEasterEgg();
        scheduleNextEasterEgg();
      }, delay);
    };

    const drawLetters = () => {
      if (!context.current || letters.current.length === 0) return;
      const c = context.current;
      const rect = canvas.getBoundingClientRect();
      c.clearRect(0, 0, rect.width, rect.height);
      c.font = `${fontSize}px monospace`;
      c.textBaseline = "top";
      letters.current.forEach((letter, idx) => {
        const x = (idx % grid.current.columns) * charWidth;
        const y = Math.floor(idx / grid.current.columns) * charHeight;
        c.fillStyle = letter.color;
        c.fillText(letter.char, x, y);
      });
    };

    const resizeCanvas = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      const dpr = window.devicePixelRatio || 1;
      const rect = parent.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
      if (context.current) {
        context.current.setTransform(dpr, 0, 0, dpr, 0, 0);
      }
      const { columns, rows } = calculateGrid(rect.width, rect.height);
      initializeLetters(columns, rows);
      drawLetters();
    };

    const updateLetters = () => {
      const updateCount = Math.max(1, Math.floor(letters.current.length * 0.05));
      const protectedSet = new Set<number>();
      if (easterEgg.current) {
        for (let i = 0; i < easterEgg.current.chars.length; i++) {
          protectedSet.add(easterEgg.current.startIdx + i);
        }
      }
      for (let i = 0; i < updateCount; i++) {
        const idx = Math.floor(Math.random() * letters.current.length);
        if (protectedSet.has(idx)) continue;
        const l = letters.current[idx];
        if (!l) continue;
        l.char = getRandomChar();
        l.targetColor = getRandomColor();
        if (!smooth) {
          l.color = l.targetColor;
          l.colorProgress = 1;
        } else {
          l.colorProgress = 0;
        }
      }
    };

    const handleSmoothTransitions = () => {
      let needsRedraw = false;
      const protectedSet = new Set<number>();
      if (easterEgg.current) {
        for (let i = 0; i < easterEgg.current.chars.length; i++) {
          protectedSet.add(easterEgg.current.startIdx + i);
        }
      }
      letters.current.forEach((letter, idx) => {
        if (protectedSet.has(idx)) return;
        if (letter.colorProgress < 1) {
          letter.colorProgress = Math.min(1, letter.colorProgress + 0.05);
          const startRgb = hexToRgb(letter.color);
          const endRgb = hexToRgb(letter.targetColor);
          if (startRgb && endRgb) {
            letter.color = interpolateColor(startRgb, endRgb, letter.colorProgress);
            needsRedraw = true;
          }
        }
      });
      if (needsRedraw) drawLetters();
    };

    const animate = () => {
      const now = Date.now();
      if (now - lastGlitchTime.current >= glitchSpeed) {
        updateLetters();
        enforceEasterEgg();
        drawLetters();
        lastGlitchTime.current = now;
      }
      if (smooth) handleSmoothTransitions();
      animationRef.current = requestAnimationFrame(animate);
    };

    resizeCanvas();
    animate();
    scheduleNextEasterEgg();

    let resizeTimeout: ReturnType<typeof setTimeout>;
    const handleResize = () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        if (animationRef.current !== null) cancelAnimationFrame(animationRef.current);
        resizeCanvas();
        animate();
      }, 100);
    };
    window.addEventListener("resize", handleResize);

    return () => {
      if (animationRef.current !== null) cancelAnimationFrame(animationRef.current);
      if (easterEggTimer.current !== null) clearTimeout(easterEggTimer.current);
      window.removeEventListener("resize", handleResize);
    };
  }, [glitchSpeed, smooth, characters, glitchColors]);

  return (
    <div
      className={className}
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        backgroundColor: "#000000",
        overflow: "hidden",
      }}
      aria-hidden="true"
    >
      <canvas ref={canvasRef} style={{ display: "block", width: "100%", height: "100%" }} />
      {outerVignette && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
            background: "radial-gradient(circle, rgba(0,0,0,0) 60%, rgba(0,0,0,1) 100%)",
          }}
        />
      )}
      {centerVignette && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
            background: "radial-gradient(circle, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0) 60%)",
          }}
        />
      )}
    </div>
  );
}
