/**
 * NotificationBell — Cloche de notifications dans la Navbar.
 *
 * Fonctionnement :
 *   - Au mount : fetch les 10 dernieres notifs de l'user via vea.notifications
 *   - Affiche un badge rouge avec le nombre de notifs non lues (lu_at IS NULL)
 *   - Click sur la cloche -> dropdown avec liste des notifs
 *   - Click sur une notif -> marque comme lue + navigate vers link_url
 *   - "Tout marquer comme lu" -> mark all as read
 *
 * V1 : pas de realtime, refresh au mount / navigation. Polling toutes les 60s
 * en background pour rafraichir le badge sans recharger la page.
 *
 * Visible UNIQUEMENT si user connecte (sinon retourne null).
 */
"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

interface Notification {
  id: string;
  type: string;
  titre: string;
  message: string | null;
  link_url: string | null;
  lu_at: string | null;
  created_at: string;
}

export default function NotificationBell() {
  const supabase = createClient();
  const [notifs, setNotifs] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Compte des non lues
  const unreadCount = notifs.filter((n) => !n.lu_at).length;

  // Fetch les notifs
  const fetchNotifs = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setUserId(null);
      setNotifs([]);
      setLoading(false);
      return;
    }
    setUserId(user.id);

    const { data, error } = await supabase
      .schema("vea")
      .from("notifications")
      .select("id, type, titre, message, link_url, lu_at, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(10);

    if (!error && data) {
      setNotifs(data as Notification[]);
    }
    setLoading(false);
  }, [supabase]);

  // Au mount + refresh toutes les 60s
  useEffect(() => {
    fetchNotifs();
    const interval = setInterval(fetchNotifs, 60_000);
    return () => clearInterval(interval);
  }, [fetchNotifs]);

  // Click outside pour fermer
  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  // Marquer une notif comme lue
  async function markAsRead(id: string) {
    const now = new Date().toISOString();
    setNotifs((prev) =>
      prev.map((n) => (n.id === id ? { ...n, lu_at: now } : n))
    );
    await supabase
      .schema("vea")
      .from("notifications")
      .update({ lu_at: now })
      .eq("id", id);
  }

  // Tout marquer comme lu
  async function markAllAsRead() {
    if (!userId) return;
    const now = new Date().toISOString();
    setNotifs((prev) =>
      prev.map((n) => (n.lu_at ? n : { ...n, lu_at: now }))
    );
    await supabase
      .schema("vea")
      .from("notifications")
      .update({ lu_at: now })
      .eq("user_id", userId)
      .is("lu_at", null);
  }

  // Pas connecte ou pas charge -> rien (evite le flash)
  if (loading || !userId) return null;

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="relative p-2 rounded-full hover:bg-vea-bg-soft transition-colors"
        aria-label={`Notifications (${unreadCount} non lue${unreadCount > 1 ? "s" : ""})`}
      >
        {/* Icone cloche SVG */}
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-vea-text"
        >
          <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
          <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
        </svg>

        {/* Badge rouge si non lues */}
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-vea-accent text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white border border-vea-border rounded-lg shadow-card-hover z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-vea-border bg-vea-bg-soft">
            <h3 className="text-sm font-bold text-vea-text">
              Notifications {unreadCount > 0 && <span className="text-vea-accent">({unreadCount} non lue{unreadCount > 1 ? "s" : ""})</span>}
            </h3>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={markAllAsRead}
                className="text-[10px] uppercase tracking-widest text-vea-text-dim hover:text-vea-accent font-bold"
              >
                Tout lire
              </button>
            )}
          </div>

          {/* Liste */}
          <div className="max-h-96 overflow-y-auto">
            {notifs.length === 0 ? (
              <p className="px-4 py-8 text-xs text-vea-text-dim text-center italic">
                Pas encore de notifications.
              </p>
            ) : (
              <ul>
                {notifs.map((n) => (
                  <li key={n.id} className="border-b border-vea-border last:border-b-0">
                    {n.link_url ? (
                      <Link
                        href={n.link_url}
                        onClick={() => {
                          if (!n.lu_at) markAsRead(n.id);
                          setOpen(false);
                        }}
                        className={`block px-4 py-3 hover:bg-vea-bg-soft transition-colors ${
                          !n.lu_at ? "bg-vea-accent-soft/30" : ""
                        }`}
                      >
                        <NotifContent notif={n} />
                      </Link>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          if (!n.lu_at) markAsRead(n.id);
                        }}
                        className={`block w-full text-left px-4 py-3 hover:bg-vea-bg-soft transition-colors ${
                          !n.lu_at ? "bg-vea-accent-soft/30" : ""
                        }`}
                      >
                        <NotifContent notif={n} />
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Footer (lien gérer notifs / paramètres) */}
          <div className="px-4 py-2 border-t border-vea-border bg-vea-bg-soft text-center">
            <Link
              href="/profil#notifications"
              onClick={() => setOpen(false)}
              className="text-[10px] uppercase tracking-widest text-vea-text-dim hover:text-vea-accent font-bold"
            >
              Gérer les notifications
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

function NotifContent({ notif }: { notif: Notification }) {
  const dateStr = new Date(notif.created_at).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <>
      <div className="flex items-start gap-2 mb-1">
        {!notif.lu_at && (
          <span className="mt-1.5 w-2 h-2 bg-vea-accent rounded-full shrink-0" />
        )}
        <p className="text-sm font-semibold text-vea-text flex-1">
          {notif.titre}
        </p>
      </div>
      {notif.message && (
        <p className="text-xs text-vea-text-muted ml-4">{notif.message}</p>
      )}
      <p className="text-[10px] text-vea-text-dim italic mt-1 ml-4">
        {dateStr}
      </p>
    </>
  );
}
