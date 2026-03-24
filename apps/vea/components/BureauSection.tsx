/**
 * BureauSection — Bureau Exécutif + CA avec toggle "Voir toute l'équipe"
 *
 * "use client" car on utilise useState pour le toggle expand/collapse.
 *
 * Affiche par défaut 4 membres principaux (Président, Vice-Président, Trésorier, Secrétaire).
 * Un bouton "Voir toute l'équipe ↓" révèle les adjoints + le CA avec une transition smooth.
 */
"use client";

import { useState } from "react";
import ScrollReveal from "@/components/ScrollReveal";

interface Member {
  name: string;
  role: string;
}

const BUREAU_PRINCIPAL: Member[] = [
  { name: "Clavel NDEMA MOUSSA", role: "Président" },
  { name: "Anthony DUPONT", role: "Vice-Président" },
  { name: "Christ-David KPADAN", role: "Trésorier" },
  { name: "GBAKRE Judith", role: "Secrétaire" },
];

const BUREAU_ADJOINTS: Member[] = [
  { name: "Alban THIERRY", role: "Vice-Président Adjoint" },
  { name: "Celyan AIT HAMOU", role: "Trésorier Adjoint" },
  { name: "Cathia DETRE", role: "Secrétaire Adjointe" },
];

const CA: Member[] = [
  { name: "Arthur FOSSIER", role: "Administrateur CA" },
  { name: "Antoine DAVID", role: "Administrateur CA" },
  { name: "Noha PARMENTIER", role: "Administrateur CA" },
];

function MemberCard({ member, size = "normal" }: { member: Member; size?: "normal" | "small" }) {
  const initials = member.name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("");

  if (size === "small") {
    return (
      <div className="card-glow p-4 text-center">
        <div className="w-10 h-10 bg-vea-bg rounded-full mx-auto mb-2 flex items-center justify-center">
          <span className="text-vea-red text-xs font-bold">{initials}</span>
        </div>
        <h3 className="text-xs font-bold text-vea-white">{member.name}</h3>
        <p className="text-[11px] text-vea-text-muted mt-0.5">{member.role}</p>
      </div>
    );
  }

  return (
    <div className="card-glow p-6 text-center">
      <div className="w-14 h-14 bg-vea-bg rounded-full mx-auto mb-3 flex items-center justify-center">
        <span className="text-vea-red text-sm font-bold">{initials}</span>
      </div>
      <h3 className="text-sm font-bold text-vea-white">{member.name}</h3>
      <p className="text-xs text-vea-red mt-1 font-medium">{member.role}</p>
    </div>
  );
}

export default function BureauSection() {
  const [expanded, setExpanded] = useState(false);

  return (
    <>
      {/* ===== BUREAU EXÉCUTIF ===== */}
      <section className="py-16 px-4">
        <div className="max-w-5xl mx-auto">
          <ScrollReveal>
            <h2 className="text-2xl font-bold text-gradient-vea mb-2 text-center">
              Bureau Exécutif
            </h2>
            <p className="text-sm text-vea-text-muted text-center mb-8">
              L&apos;équipe qui dirige VEA au quotidien.
            </p>
          </ScrollReveal>

          {/* 4 membres principaux — toujours visibles */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {BUREAU_PRINCIPAL.map((member, i) => (
              <ScrollReveal key={member.name} delay={i * 0.05}>
                <MemberCard member={member} />
              </ScrollReveal>
            ))}
          </div>

          {/* Membres adjoints + CA — visibles après toggle */}
          <div
            className={`overflow-hidden transition-all duration-500 ease-in-out ${
              expanded ? "max-h-[1000px] opacity-100 mt-4" : "max-h-0 opacity-0"
            }`}
          >
            {/* Adjoints */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-8">
              {BUREAU_ADJOINTS.map((member) => (
                <MemberCard key={member.name} member={member} />
              ))}
            </div>

            {/* CA */}
            <h3 className="text-xl font-bold text-gradient-vea mb-4 text-center">
              Conseil d&apos;Administration
            </h3>
            <div className="grid grid-cols-3 gap-4 max-w-lg mx-auto">
              {CA.map((member) => (
                <MemberCard key={member.name} member={member} size="small" />
              ))}
            </div>
          </div>

          {/* Bouton toggle */}
          <div className="text-center mt-6">
            <button
              type="button"
              onClick={() => setExpanded(!expanded)}
              className="text-sm text-vea-text-muted hover:text-vea-white transition-colors font-medium"
            >
              {expanded ? "Réduire ↑" : "Voir toute l'équipe ↓"}
            </button>
          </div>
        </div>
      </section>
    </>
  );
}
