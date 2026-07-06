import { useAuth } from "@/lib/auth";
import { useNavigate, useLocation } from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import { AppShell } from "./app-shell";
import type { Role } from "@/lib/types";
import { LoaderScreen } from "@/components/ui/loader-screen";

export function RequireAuth({ children, roles }: { children: ReactNode; roles?: Role[] }) {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      const next = location.pathname !== "/auth" ? location.pathname : undefined;
      navigate({ to: "/auth", search: { next } });
    } else if (roles && !roles.includes(user.role)) {
      navigate({ to: "/dashboard" });
    }
  }, [user, loading, navigate, roles]);

  if (loading || !user) {
    return <LoaderScreen />;
  }
  if (roles && !roles.includes(user.role)) return null;
  return <AppShell>{children}</AppShell>;
}
