/**
 * PackCard — Carte de présentation d'un pack ou option.
 *
 * Client Component parce qu'il prend un callback onSelect (qui pré-remplit le
 * form de devis et scrolle vers lui).
 *
 * Variantes visuelles via la prop `accent` :
 *   - "blue"  : Pack Découverte
 *   - "yellow" : Pack Animation
 *   - "red"   : Option Stream (avec badge OPTION en haut)
 */
"use client";

interface PackCardProps {
  title: string;
  description: string;
  price: string;
  priceNote: string;
  features: string[];
  ctaLabel: string;
  packValue: string;
  accent: "blue" | "yellow" | "red";
  isOption?: boolean;
  onSelect: (packValue: string) => void;
}

const ACCENT_CLASSES: Record<
  PackCardProps["accent"],
  { border: string; header: string; price: string; badge: string; button: string }
> = {
  blue: {
    border: "border-blue-400",
    header: "text-blue-600",
    price: "text-blue-600",
    badge: "bg-blue-100 text-blue-700 border-blue-200",
    button: "bg-blue-600 hover:bg-blue-700 text-white",
  },
  yellow: {
    border: "border-amber-400",
    header: "text-amber-600",
    price: "text-amber-600",
    badge: "bg-amber-100 text-amber-700 border-amber-200",
    button: "bg-amber-500 hover:bg-amber-600 text-white",
  },
  red: {
    border: "border-vea-accent",
    header: "text-vea-accent",
    price: "text-vea-accent",
    badge: "bg-vea-accent-soft text-vea-accent border-vea-accent/30",
    button: "bg-vea-accent hover:bg-vea-accent-hover text-white",
  },
};

export default function PackCard({
  title,
  description,
  price,
  priceNote,
  features,
  ctaLabel,
  packValue,
  accent,
  isOption = false,
  onSelect,
}: PackCardProps) {
  const c = ACCENT_CLASSES[accent];

  return (
    <article
      className={`card-clean p-6 flex flex-col h-full border-2 ${c.border} relative`}
    >
      {/* Badge OPTION en haut (variante stream) */}
      {isOption && (
        <span
          className={`absolute -top-3 left-1/2 -translate-x-1/2 text-[10px] uppercase tracking-widest font-bold px-3 py-1 rounded-full border ${c.badge}`}
        >
          Option
        </span>
      )}

      <h3 className={`text-xs uppercase tracking-widest font-black mb-2 ${c.header}`}>
        {title}
      </h3>
      <p className="text-sm text-vea-text-muted leading-relaxed mb-5">
        {description}
      </p>

      <div className="mb-5">
        <p className={`text-3xl font-black ${c.price}`}>{price}</p>
        <p className="text-[10px] uppercase tracking-widest text-vea-text-dim mt-1">
          {priceNote}
        </p>
      </div>

      <ul className="space-y-2 mb-6 flex-1">
        {features.map((f, i) => (
          <li key={i} className="flex items-start gap-2 text-sm text-vea-text">
            <span aria-hidden="true" className={`shrink-0 font-bold ${c.price}`}>
              ✓
            </span>
            <span>{f}</span>
          </li>
        ))}
      </ul>

      <button
        type="button"
        onClick={() => onSelect(packValue)}
        className={`w-full px-4 py-3 rounded-full font-bold uppercase tracking-widest text-xs transition-colors ${c.button}`}
      >
        {ctaLabel}
      </button>
    </article>
  );
}
