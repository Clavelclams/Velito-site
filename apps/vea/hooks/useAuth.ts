/**
 * Hook useAuth() — Gestion de l'état d'authentification côté client
 *
 * 👉 CE QUE C'EST :
 * Un hook React personnalisé qui fournit à n'importe quel composant :
 * - user : les infos du user connecté (ou null si visiteur)
 * - loading : true pendant qu'on vérifie la session
 * - login() : connecte un user
 * - register() : inscrit un user
 * - logout() : déconnecte le user
 *
 * 👉 COMMENT ÇA MARCHE :
 * Au chargement du composant, on appelle GET /api/auth/me pour savoir
 * si l'utilisateur a un cookie de session valide.
 * Le résultat est stocké dans un state React.
 *
 * 👉 POURQUOI UN HOOK ET PAS UN CONTEXT ?
 * Pour l'instant, un hook suffit. Chaque composant qui utilise useAuth()
 * fait son propre appel à /api/auth/me.
 * Quand on aura beaucoup de composants qui en ont besoin, on pourra
 * wrapper ça dans un AuthContext pour ne faire l'appel qu'UNE fois.
 * Mais là, on garde simple pour commencer.
 */

"use client";

import { useState, useEffect, useCallback } from "react";

// 👉 Type du user retourné par l'API (les mêmes champs que le `select` dans nos routes)
interface AuthUser {
  id: string;
  email: string;
  prenom: string;
  nom: string;
  pseudo: string | null;
  role: "SUPERADMIN" | "ADMIN_VEA" | "USER";
  createdAt: string;
}

interface UseAuthReturn {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string; role?: string }>;
  register: (data: RegisterData) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

interface RegisterData {
  email: string;
  password: string;
  prenom: string;
  nom: string;
  pseudo?: string;
}

export function useAuth(): UseAuthReturn {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  // 👉 fetchUser : appelle GET /api/auth/me pour savoir si on est connecté
  // useCallback = la fonction ne sera recréée que si ses dépendances changent
  // (ici jamais, car pas de dépendances → [])
  const fetchUser = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me");
      const data = await res.json();
      setUser(data.user ?? null);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  // 👉 useEffect → exécuté au montage du composant (une seule fois grâce à [fetchUser])
  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  // ===== LOGIN =====
  const login = async (email: string, password: string) => {
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        // 👉 Si c'est un user classique (pas admin .env), on a les infos user
        if (data.user) {
          setUser(data.user);
        }
        return { success: true, role: data.role };
      }

      return { success: false, error: data.error || "Erreur de connexion" };
    } catch {
      return { success: false, error: "Erreur de connexion au serveur" };
    }
  };

  // ===== REGISTER =====
  const register = async (data: RegisterData) => {
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const result = await res.json();

      if (res.ok && result.success) {
        // 👉 Après inscription, le user est automatiquement connecté
        setUser(result.user);
        return { success: true };
      }

      return { success: false, error: result.error || "Erreur lors de l'inscription" };
    } catch {
      return { success: false, error: "Erreur de connexion au serveur" };
    }
  };

  // ===== LOGOUT =====
  const logout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      // 👉 Même si la requête échoue, on clear le state local
      // Le cookie expirera naturellement
    }
    setUser(null);
  };

  // ===== REFRESH =====
  // 👉 Permet de re-vérifier la session manuellement
  // Utile après une mise à jour du profil par exemple
  const refresh = async () => {
    setLoading(true);
    await fetchUser();
  };

  return { user, loading, login, register, logout, refresh };
}
