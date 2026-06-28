import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { User } from "./types";
import { store } from "./store";

const SESSION_KEY = "unichem.session.v1";

interface AuthCtx {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => { ok: boolean; error?: string };
  logout: () => void;
}

const Ctx = createContext<AuthCtx>({
  user: null,
  loading: true,
  login: () => ({ ok: false }),
  logout: () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      if (raw) {
        const id = JSON.parse(raw) as string;
        const u = store.listUsers().find((x) => x.id === id) ?? null;
        setUser(u);
      }
    } catch {}
    setLoading(false);
  }, []);

  const login = (email: string, password: string) => {
    const u = store.verifyLogin(email, password);
    if (!u) return { ok: false, error: "Invalid email or password" };
    localStorage.setItem(SESSION_KEY, JSON.stringify(u.id));
    setUser(u);
    return { ok: true };
  };

  const logout = () => {
    localStorage.removeItem(SESSION_KEY);
    setUser(null);
  };

  return <Ctx.Provider value={{ user, loading, login, logout }}>{children}</Ctx.Provider>;
}

export const useAuth = () => useContext(Ctx);
