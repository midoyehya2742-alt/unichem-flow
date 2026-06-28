import { useAuth } from "@/lib/auth";
import { useNavigate } from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import { AppShell } from "./app-shell";
import type { Role } from "@/lib/types";

export function RequireAuth({ children, roles }: { children: ReactNode; roles?: Role[] }) {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      navigate({ to: "/auth" });
    } else if (roles && !roles.includes(user.role)) {
      navigate({ to: "/dashboard" });
    }
  }, [user, loading, navigate, roles]);

  if (loading || !user) {
    return (
      <div className="min-h-screen grid place-items-center text-muted-foreground text-sm">
        Loading…
      </div>
    );
  }
  if (roles && !roles.includes(user.role)) return null;
  return <AppShell>{children}</AppShell>;
}
