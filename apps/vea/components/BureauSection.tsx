/**
 * BureauSection — Bureau Executif + CA + Membre jeune engagee
 * DA claire (17/05/2026). Toggle "Voir toute l'equipe" en bas.
 *
 * Composition election AGE 30/04/2026 (statuts V9) :
 *   - 4 principaux (President, VP, Tresorier, Secretaire) toujours visibles
 *   - 3 adjoints (VP, Tresorier, Secretaire) reveles au toggle
 *   - 3 administrateurs CA reveles au toggle
 *   - 1 membre jeune engagee (Maya, voix consultative)
 * Total : 11 personnes elues.
 */
"use client";

import { useState } from "react";
import ScrollReveal from "@/components/ScrollReveal";

interface Member {
  name: string;
  role: string;
  /** Note speciale affichee sous le role (ex : "voix consultative") */
  note?: string;
}

const BUREAU_PRINCIPAL: Member[] = [
  { name: "Clavel NDEMA MOUSSA", role: "President" },
  { name: "Anthony DUPONT", role: "Vice-President" },
  { name: "Christ-David KPADAN", role: "Tresorier" },
  { name: "Judith GBAKRE", role: "Secretaire" },
];

const BUREAU_ADJOINTS: Member[] = [
  { name: "Alban THIERRY", role: "Vice-President Adjoint" },
  { name: "Celyan AIT HAMOU", role: "Tresorier Adjoint" },
  { name: "Cathia DETRE", role: "Secretaire Adjointe" },
];

const CA: Member[] = [
  { name: "Arthur FOSSIER", role: "Administrateur CA" },
  { name: "Antoine DAVID", role: "Administrateur CA" },
  { name: "Noha PARMENTIER", role: "Administrateur CA" },
];

const MEMBRE_JEUNE: Member = {
  name: "Maya GOMBERT",
  role: "Membre jeune engagee",
  note: "Voix consultative (statuts V9, Art. 2 bis)",
};

function MemberCard({ member, size = "normal" }: { member: Member; size?: "normal" | "small" }) {
  const initials = member.name.split(" ").map((w) => w[0]).slice(0, 2).join("");
  const padding = size === "small" ? "p-4" : "p-6";
  const avatarSize = size === "small" ? "w-10 h-10" : "w-14 h-14";
  const initialsSize = size === "small" ? "text-xs" : "text-sm";
  const nameSize = size === "small" ? "text-xs" : "text-sm";

  return (
    <div className={`card-clean ${padding} text-center`}>
      <div className={`${avatarSize} bg-vea-accent-soft border border-vea-accent/15 rounded-full mx-auto mb-3 flex items-center justify-center`}>
        <span className={`text-vea-accent ${initialsSize} font-bold`}>{initials}</span>
      </div>
      <h3 className={`${nameSize} font-bold text-vea-text leading-tight`}>{member.name}</h3>
      <p className="text-xs text-vea-accent mt-1 font-medium">{member.role}</p>
      {member.note && (
        <p className="text-[10px] text-vea-text-dim mt-1 italic">{member.note}</p>
      )}
    </div>
  );
}

export default function BureauSection() {
  const [expanded, setExpanded] = useState(false);

  return (
    <section className="py-16 px-4 section-bg">
      <div className="max-w-5xl mx-auto">
        <ScrollReveal>
          <div className="text-center mb-10">
            <span className="badge-red mb-4">Bureau elu AGE 30/04/2026</span>
            <h2 className="text-2xl sm:text-3xl font-bold text-vea-text mt-4 mb-2">
              Notre <span className="text-vea-accent">Bureau</span>
            </h2>
            <p className="text-sm text-vea-text-muted">
              11 personnes engagees pour faire vivre VEA au quotidien.
            </p>
          </div>
        </ScrollReveal>

        {/* 4 membres principaux toujours visibles */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          {BUREAU_PRINCIPAL.map((m, i) => (
            <ScrollReveal key={m.name} delay={i * 0.05}>
              <MemberCard member={m} />
            </ScrollReveal>
          ))}
        </div>

        {/* Toggle */}
        <div className="text-center mb-8">
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="btn-outline text-sm"
          >
            {expanded ? "Reduire ↑" : "Voir toute l'equipe ↓"}
          </button>
        </div>

        {/* Adjoints + CA + Membre jeune (reveles) */}
        {expanded && (
          <div className="space-y-10 animate-fade-up">
            <div>
              <h3 className="text-sm font-semibold text-vea-text-muted uppercase tracking-wider mb-4 text-center">
                Adjoints
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {BUREAU_ADJOINTS.map((m) => (
                  <MemberCard key={m.name} member={m} size="small" />
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-vea-text-muted uppercase tracking-wider mb-4 text-center">
                Conseil d&apos;administration
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {CA.map((m) => (
                  <MemberCard key={m.name} member={m} size="small" />
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-vea-text-muted uppercase tracking-wider mb-4 text-center">
                Membre jeune engagee
              </h3>
              <div className="grid grid-cols-1 max-w-xs mx-auto">
                <MemberCard member={MEMBRE_JEUNE} size="small" />
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
