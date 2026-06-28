import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard, FileText, Plus, Users, Package, UserCog,
  BarChart3, ScrollText, Settings, LogOut, Menu, X, Beaker,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import type { Role } from "@/lib/types";

interface NavItem {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  roles: Role[];
}

const NAV: NavItem[] = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, roles: ["admin", "finance", "salesman"] },
  { to: "/deals/new", label: "New Deal", icon: Plus, roles: ["salesman", "admin"] },
  { to: "/deals", label: "Deals", icon: FileText, roles: ["admin", "finance", "salesman"] },
  { to: "/customers", label: "Customers", icon: Users, roles: ["admin", "finance", "salesman"] },
  { to: "/products", label: "Products", icon: Package, roles: ["admin", "finance"] },
  { to: "/reports", label: "Reports", icon: BarChart3, roles: ["admin", "finance"] },
  { to: "/users", label: "Users", icon: UserCog, roles: ["admin"] },
  { to: "/audit", label: "Audit Log", icon: ScrollText, roles: ["admin"] },
  { to: "/settings", label: "Settings", icon: Settings, roles: ["admin"] },
];

export function AppShell({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [mobileOpen, setMobileOpen] = useState(false);

  if (!user) return null;

  const items = NAV.filter((n) => n.roles.includes(user.role));

  const handleLogout = () => {
    logout();
    navigate({ to: "/auth" });
  };

  const Sidebar = (
    <aside className="flex h-full w-64 flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border">
      <div className="flex items-center gap-2 px-5 py-5 border-b border-sidebar-border">
        <div className="grid place-items-center h-9 w-9 rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
          <Beaker className="h-5 w-5" />
        </div>
        <div>
          <div className="font-bold tracking-tight text-base">UniChem</div>
          <div className="text-[11px] uppercase tracking-wider text-sidebar-foreground/60">Internal ERP</div>
        </div>
      </div>
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {items.map((item) => {
          const active = pathname === item.to || (item.to !== "/dashboard" && pathname.startsWith(item.to));
          const Icon = item.icon;
          return (
            <Link
              key={item.to}
              to={item.to}
              onClick={() => setMobileOpen(false)}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
                active
                  ? "bg-sidebar-primary text-sidebar-primary-foreground font-medium"
                  : "text-sidebar-foreground/85 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-sidebar-border p-3">
        <div className="px-2 py-2">
          <div className="text-sm font-medium truncate">{user.name}</div>
          <div className="text-xs text-sidebar-foreground/60 truncate">{user.email}</div>
          <div className="mt-1 inline-block text-[10px] uppercase tracking-wider px-2 py-0.5 rounded bg-sidebar-accent text-sidebar-accent-foreground">
            {user.role}
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleLogout}
          className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        >
          <LogOut className="h-4 w-4 mr-2" /> Sign out
        </Button>
      </div>
    </aside>
  );

  return (
    <div className="min-h-screen flex bg-background">
      <div className="hidden md:block">{Sidebar}</div>
      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <div className="absolute left-0 top-0 h-full">{Sidebar}</div>
        </div>
      )}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="md:hidden flex items-center justify-between px-4 py-3 border-b bg-card">
          <button onClick={() => setMobileOpen((v) => !v)} className="p-2 -ml-2">
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
          <div className="flex items-center gap-2">
            <div className="grid place-items-center h-7 w-7 rounded-md bg-primary text-primary-foreground">
              <Beaker className="h-4 w-4" />
            </div>
            <span className="font-bold">UniChem</span>
          </div>
          <div className="w-9" />
        </header>
        <main className="flex-1 overflow-x-hidden">{children}</main>
      </div>
    </div>
  );
}

export function PageHeader({
  title, description, actions,
}: { title: string; description?: string; actions?: ReactNode }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        {description && <p className="text-sm text-muted-foreground mt-1">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
