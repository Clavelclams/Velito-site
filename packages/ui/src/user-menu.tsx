/**
 * <UserMenu />
 *
 * Composant universel pour toutes les apps Velito (hub, interactive, vea, vena...).
 * Affiche soit "Continuer avec VENA" (anonyme), soit un menu user déroulant
 * avec avatar + email + déconnexion (connecté).
 *
 * Pourquoi un composant partagé :
 *  - Cohérence visuelle sur tout l'écosystème (le user reconnaît "son" menu)
 *  - Logique logout centralisée : un seul point qui POST vers hub.velito.fr/logout
 *  - Si on change le design du menu, on le change UNE fois ici
 *
 * Architecture :
 *  - C'est un Client Component (besoin de useState pour le dropdown)
 *  - Il prend `user` en PROPS (pas de fetch interne) → l'app parente fournit
 *    via son Server Component qui aura fait supabase.auth.getUser()
 *  - Pour faciliter l'intégration, on exporte aussi UserMenuSlot (server-side)
 *    qui fait le wiring complet (cf. user-menu-slot.tsx)
 *
 * Logout flow :
 *  - Form POST vers ${hubUrl}/logout avec input hidden `return=window.location.href`
 *  - Le hub clear les cookies .velito.fr et nous redirige back ici
 *  - L'user revient sur la page d'origine, déconnecté partout (SSO inverse)
 *
 * Usage minimal (Client direct) :
 *   <UserMenu user={{ email: "x@y.fr" }} hubUrl="https://hub.velito.fr" />
 *
 * Usage avec slot (recommandé, fait le fetch côté serveur) :
 *   <UserMenuSlot />  (à condition d'avoir importé depuis @repo/ui/user-menu-slot)
 */
"use client";

import { useEffect, useRef, useState } from "react";

export interface UserMenuUser {
  email: string;
  /** Nom affiché (fallback : début de l'email avant le @) */
  name?: string;
  /** URL d'avatar (sinon on affiche les initiales) */
  avatarUrl?: string;
}

export interface UserMenuProps {
  /** L'utilisateur connecté, ou null si anonyme */
  user: UserMenuUser | null;
  /** URL racine du hub Velito (ex: https://hub.velito.fr). Lis NEXT_PUBLIC_HUB_URL. */
  hubUrl?: string;
  /** Classes CSS additionnelles pour le conteneur */
  className?: string;
  /** Label du bouton login. Défaut : "Continuer avec VENA" */
  loginLabel?: string;
}

/**
 * Extrait les initiales d'un email/nom pour l'avatar fallback.
 * Ex: "clavel@velito.fr" → "CL"
 *     "Clavel NDEMA"     → "CN"
 */
function getInitials(user: UserMenuUser): string {
  if (user.name) {
    const parts = user.name.trim().split(/\s+/);
    if (parts.length >= 2 && parts[0] && parts[1]) {
      return (parts[0][0] ?? "").toUpperCase() + (parts[1][0] ?? "").toUpperCase();
    }
    return (user.name[0] ?? "?").toUpperCase();
  }
  const local = user.email.split("@")[0] ?? user.email;
  return local.slice(0, 2).toUpperCase();
}

export function UserMenu({
  user,
  hubUrl,
  className = "",
  loginLabel = "Continuer avec VENA",
}: UserMenuProps) {
  // -------------------------------------------------------------------------
  // Cas 1 : utilisateur anonyme → bouton "se connecter"
  // -------------------------------------------------------------------------
  if (!user) {
    return <LoginButton hubUrl={hubUrl} label={loginLabel} className={className} />;
  }

  // -------------------------------------------------------------------------
  // Cas 2 : utilisateur connecté → avatar + dropdown
  // -------------------------------------------------------------------------
  return <ConnectedMenu user={user} hubUrl={hubUrl} className={className} />;
}

/* -------------------------------------------------------------------------- */
/* Sub-component : bouton login (anonyme)                                     */
/* -------------------------------------------------------------------------- */
function LoginButton({
  hubUrl,
  label,
  className,
}: {
  hubUrl?: string;
  label: string;
  className: string;
}) {
  const [href, setHref] = useState<string>("#");

  useEffect(() => {
    const base = hubUrl ?? "https://hub.velito.fr";
    const back =
      typeof window !== "undefined" ? window.location.href : "/";
    const u = new URL(base);
    u.pathname = "/login";
    u.searchParams.set("return", back);
    setHref(u.toString());
  }, [hubUrl]);

  return (
    <a
      href={href}
      className={
        "inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/[0.04] px-4 py-2 text-sm font-medium text-white/85 transition hover:border-white/30 hover:bg-white/[0.08] " +
        className
      }
    >
      <VenaSymbol className="h-4 w-4 shrink-0" />
      <span className="truncate">{label}</span>
    </a>
  );
}

/* -------------------------------------------------------------------------- */
/* Sub-component : menu déroulant (connecté)                                  */
/* -------------------------------------------------------------------------- */
function ConnectedMenu({
  user,
  hubUrl,
  className,
}: {
  user: UserMenuUser;
  hubUrl?: string;
  className: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Fermer le dropdown au clic extérieur OU à la touche Escape
  useEffect(() => {
    if (!open) return;
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClickOutside);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const initials = getInitials(user);
  const displayName = user.name ?? user.email.split("@")[0];
  const base = hubUrl ?? "https://hub.velito.fr";

  return (
    <div ref={ref} className={"relative inline-block " + className}>
      {/* Bouton avatar */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] py-1.5 pl-1.5 pr-3 text-sm transition hover:border-white/25 hover:bg-white/[0.08]"
      >
        <span
          aria-hidden="true"
          className="grid h-7 w-7 place-items-center rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-500 text-[10px] font-bold uppercase text-white"
        >
          {user.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={user.avatarUrl}
              alt=""
              className="h-7 w-7 rounded-lg object-cover"
            />
          ) : (
            initials
          )}
        </span>
        <span className="hidden max-w-[120px] truncate text-white/85 sm:inline">
          {displayName}
        </span>
        <Chevron open={open} />
      </button>

      {/* Dropdown */}
      {open && (
        <div
          role="menu"
          className="absolute right-0 z-50 mt-2 w-64 overflow-hidden rounded-xl border border-white/10 bg-[#0e0e1a]/95 shadow-2xl backdrop-blur-md"
        >
          {/* Header avec full email */}
          <div className="border-b border-white/5 px-4 py-3">
            <p className="text-[10px] uppercase tracking-wider text-white/40">
              Connecté
            </p>
            <p className="mt-0.5 truncate text-sm font-medium text-white">
              {user.email}
            </p>
          </div>

          {/* Liens menu */}
          <a
            role="menuitem"
            href={`${base}/account`}
            className="block px-4 py-2.5 text-sm text-white/80 transition hover:bg-white/[0.06] hover:text-white"
          >
            Mon compte Velito
          </a>

          <div className="my-1 h-px bg-white/5" aria-hidden="true" />

          {/* Form logout — POST vers hub avec return=URL actuelle */}
          <LogoutForm hubUrl={base} />
        </div>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Sub-component : form de déconnexion                                        */
/* -------------------------------------------------------------------------- */
function LogoutForm({ hubUrl }: { hubUrl: string }) {
  const [returnTo, setReturnTo] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      setReturnTo(window.location.href);
    }
  }, []);

  return (
    <form action={`${hubUrl}/logout`} method="POST">
      <input type="hidden" name="return" value={returnTo} />
      <button
        type="submit"
        role="menuitem"
        className="block w-full px-4 py-2.5 text-left text-sm text-red-300 transition hover:bg-red-500/10 hover:text-red-200"
      >
        Se déconnecter
      </button>
    </form>
  );
}

/* -------------------------------------------------------------------------- */
/* Icônes inline                                                              */
/* -------------------------------------------------------------------------- */
function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      viewBox="0 0 12 12"
      width="10"
      height="10"
      aria-hidden="true"
      className={
        "transition-transform " + (open ? "rotate-180 text-white" : "text-white/50")
      }
    >
      <path
        d="M2 4l4 4 4-4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function VenaSymbol({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 1000 1000"
      width="16"
      height="16"
      className={className}
      aria-hidden="true"
    >
      <path
        fill="currentColor"
        d="M500.1,370.3c0,35.9-29.1,65-65,65s-65-29.1-65-65s-29.1-65-65-65s-65-29.1-65-65s-29.1-65-65-65s-65-29.1-65-65s29.1-65,65-65s65,29.1,65,65s29.1,65,65,65s65,29.1,65,65s29.1,65,65,65S500.1,334.4,500.1,370.3z M890,110.4c0,35.9-29.1,65-65,65s-65,29.1-65,65s-29.1,65-65,65s-65,29.1-65,65s-29.1,65-65,65c-35.9,0-65-29.1-65-65s29.1-65,65-65c35.9,0,65-29.1,65-65s29.1-65,65-65s65-29.1,65-65s29.1-65,65-65S890,74.5,890,110.4z M500.1,630.1c0,35.9-29.1,65-65,65s-65,29.1-65,65s-29.1,65-65,65s-65,29.1-65,65s-29.1,65-65,65s-65-29.1-65-65s29.1-65,65-65s65-29.1,65-65s29.1-65,65-65s65-29.1,65-65c0-35.9,29.1-65,65-65S500.1,594.3,500.1,630.1z M890,890c0,35.9-29.1,65-65,65s-65-29.1-65-65s-29.1-65-65-65s-65-29.1-65-65s-29.1-65-65-65c-35.9,0-65-29.1-65-65c0-35.9,29.1-65,65-65c35.9,0,65,29.1,65,65c0,35.9,29.1,65,65,65s65,29.1,65,65s29.1,65,65,65S890,854.1,890,890z"
      />
    </svg>
  );
}
