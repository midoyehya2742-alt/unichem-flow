import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { User, Role } from "./types";
import { supabase } from "./supabase";

interface AuthCtx {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  logout: () => Promise<void>;
}

const Ctx = createContext<AuthCtx>({
  user: null,
  loading: true,
  login: async () => ({ ok: false }),
  logout: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function loadSession() {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        await hydrateUser(session.user.id, session.user.email || "");
      } else {
        if (mounted) {
          setUser(null);
          setLoading(false);
        }
      }
    }

    loadSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        await hydrateUser(session.user.id, session.user.email || "");
      } else {
        if (mounted) {
          setUser(null);
          setLoading(false);
        }
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };

    async function hydrateUser(id: string, email: string) {
      if (!mounted) return;
      try {
        const profileRes = await supabase.from("profiles").select("*").eq("id", id).single();
        
        if (profileRes.error) throw profileRes.error;

        // Read role from profiles.role first (populated by newer create_app_user),
        // then fall back to user_roles table for backwards compatibility.
        let role: Role = (profileRes.data.role as Role) || "salesman";
        if (!profileRes.data.role) {
          const roleRes = await supabase.from("user_roles").select("role").eq("user_id", id).single();
          if (!roleRes.error && roleRes.data?.role) {
            role = roleRes.data.role as Role;
          }
        }

        if (mounted) {
          setUser({
            id: profileRes.data.id,
            email: email,
            name: profileRes.data.name,
            role,
            phone: profileRes.data.phone ?? undefined,
            active: profileRes.data.active,
            createdAt: profileRes.data.created_at,
          });
        }
      } catch (err) {
        console.error("Failed to hydrate user", err);
        if (mounted) setUser(null);
      } finally {
        if (mounted) setLoading(false);
      }
    }
  }, []);

  const login = async (email: string, password: string) => {
    // Client-side rate limiting (SEC-04)
    const rateLimitKey = `login_attempts_${email}`;
    const attemptsStr = localStorage.getItem(rateLimitKey);
    const attempts = attemptsStr ? JSON.parse(attemptsStr) : { count: 0, lockedUntil: 0 };
    
    if (Date.now() < attempts.lockedUntil) {
      const waitMinutes = Math.ceil((attempts.lockedUntil - Date.now()) / 60000);
      return { ok: false, error: `Too many attempts. Please try again in ${waitMinutes} minutes.` };
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    
    if (error) {
      const newCount = attempts.count + 1;
      const newLockedUntil = newCount >= 5 ? Date.now() + 15 * 60000 : 0; // Lock for 15 mins after 5 attempts
      localStorage.setItem(rateLimitKey, JSON.stringify({ count: newCount, lockedUntil: newLockedUntil }));
      return { ok: false, error: error.message };
    }
    
    // Clear on success
    localStorage.removeItem(rateLimitKey);
    return { ok: true };
  };

  const logout = async () => {
    await supabase.auth.signOut();
  };

  return <Ctx.Provider value={{ user, loading, login, logout }}>{children}</Ctx.Provider>;
}

export const useAuth = () => useContext(Ctx);
