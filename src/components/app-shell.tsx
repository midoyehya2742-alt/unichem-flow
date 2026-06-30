import { Link, useRouterState, useNavigate, useLocation } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { useTheme } from "@/lib/theme";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  LayoutDashboard, FileText, Plus, Users, Package, UserCog,
  BarChart3, ScrollText, Settings, LogOut, Menu, X, Beaker, Warehouse,
  Search, Bell, Sun, Moon, Star, ChevronLeft, ChevronRight, History,
  Command, User, Settings2, Sparkles, CheckCircle2, AlertTriangle, AlertCircle
} from "lucide-react";
import { useState, type ReactNode, useEffect } from "react";
import type { Role } from "@/lib/types";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger,
} from "@/components/ui/sheet";
import { toast } from "sonner";

interface NavItem {
  to: string;
  labelKey: string;
  icon: any;
  roles: Role[];
}

const NAV: NavItem[] = [
  { to: "/dashboard", labelKey: "nav.dashboard", icon: LayoutDashboard, roles: ["admin", "finance", "salesman"] },
  { to: "/deals/new", labelKey: "dashboard.new_deal", icon: Plus, roles: ["salesman", "admin"] },
  { to: "/deals", labelKey: "nav.deals", icon: FileText, roles: ["admin", "finance", "salesman"] },
  { to: "/customers", labelKey: "nav.customers", icon: Users, roles: ["admin", "finance", "salesman"] },
  { to: "/products", labelKey: "nav.products", icon: Package, roles: ["admin", "finance"] },
  { to: "/inventory", labelKey: "nav.inventory", icon: Warehouse, roles: ["admin", "finance", "salesman"] },
  { to: "/reports", labelKey: "nav.reports", icon: BarChart3, roles: ["admin", "finance", "salesman"] },
  { to: "/users", labelKey: "nav.users", icon: UserCog, roles: ["admin"] },
  { to: "/audit", labelKey: "nav.audit", icon: ScrollText, roles: ["admin"] },
  { to: "/settings", labelKey: "nav.settings", icon: Settings, roles: ["admin"] },
];

interface SysNotification {
  id: string;
  title: string;
  desc: string;
  time: string;
  type: "success" | "warning" | "error" | "info";
  read: boolean;
}

import { useTranslation } from "react-i18next";
import { useDb } from "@/lib/store";

export function AppShell({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const db = useDb();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { t, i18n } = useTranslation("common");
  
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [favorites, setFavorites] = useState<string[]>([]);
  const [historyList, setHistoryList] = useState<string[]>([]);
  
  // Read-state for notifications, persisted per user
  const seenKey = user ? `unichem-notif-seen-${user.id}` : "";
  const [seenIds, setSeenIds] = useState<string[]>([]);
  useEffect(() => {
    if (!seenKey) return;
    try {
      const raw = localStorage.getItem(seenKey);
      setSeenIds(raw ? JSON.parse(raw) : []);
    } catch { setSeenIds([]); }
  }, [seenKey]);

  // Derive notifications from edit-request state on deals
  const deals = user ? db.listDeals() : [];
  const notifications: SysNotification[] = (() => {
    if (!user) return [];
    const out: SysNotification[] = [];
    const fmt = (iso: string) => {
      const d = new Date(iso);
      const diff = (Date.now() - d.getTime()) / 1000;
      if (diff < 60) return "just now";
      if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
      if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
      return d.toLocaleDateString();
    };
    for (const d of deals) {
      const er = d.editRequest;
      if (!er) continue;
      if ((user.role === "admin" || user.role === "finance") && er.status === "pending") {
        const id = `edit-req:${d.id}:${er.requestedAt}`;
        out.push({
          id,
          title: `Edit request · ${d.reference}`,
          desc: `${er.requestedByName} requested to edit deal ${d.reference}.`,
          time: fmt(er.requestedAt),
          type: "warning",
          read: seenIds.includes(id),
        });
      }
      if (user.role === "salesman" && er.requestedBy === user.id && (er.status === "approved" || er.status === "rejected") && er.reviewedAt) {
        const id = `edit-res:${d.id}:${er.reviewedAt}:${er.status}`;
        out.push({
          id,
          title: `Edit ${er.status} · ${d.reference}`,
          desc: `${er.reviewedByName || "Finance"} ${er.status} your edit request for ${d.reference}.`,
          time: fmt(er.reviewedAt),
          type: er.status === "approved" ? "success" : "error",
          read: seenIds.includes(id),
        });
      }
    }
    return out.sort((a, b) => b.id.localeCompare(a.id));
  })();

  // Toast on new unread notifications
  const [toastedIds, setToastedIds] = useState<Set<string>>(new Set());
  useEffect(() => {
    if (!user) return;
    const fresh = notifications.filter((n) => !n.read && !toastedIds.has(n.id));
    if (fresh.length === 0) return;
    fresh.forEach((n) => {
      if (n.type === "success") toast.success(n.title, { description: n.desc });
      else if (n.type === "error") toast.error(n.title, { description: n.desc });
      else toast(n.title, { description: n.desc });
    });
    setToastedIds((prev) => {
      const next = new Set(prev);
      fresh.forEach((n) => next.add(n.id));
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notifications.map((n) => n.id).join("|"), user?.id]);


  const items = user ? NAV.filter((n) => n.roles.includes(user.role)) : [];

  // Initialize and track user navigation history
  useEffect(() => {
    if (!user) return;
    const savedFavs = localStorage.getItem(`unichem-favs-${user.id}`);
    if (savedFavs) setFavorites(JSON.parse(savedFavs));

    const item = items.find((i) => i.to === pathname);
    if (item) {
      setHistoryList((prev) => {
        const filtered = prev.filter((p) => p !== pathname);
        const next = [pathname, ...filtered].slice(0, 5);
        return next;
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, user?.id]);

  // Handle Command + K global search keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  if (!user) return null;

  const handleLogout = () => {
    logout();
    toast.success(t("shell.logged_out"));
    navigate({ to: "/auth" });
  };

  const toggleFavorite = (path: string) => {
    setFavorites((prev) => {
      const next = prev.includes(path) ? prev.filter((p) => p !== path) : [...prev, path];
      localStorage.setItem(`unichem-favs-${user.id}`, JSON.stringify(next));
      toast.success(prev.includes(path) ? t("shell.removed_fav") : t("shell.added_fav"));
      return next;
    });
  };

  const markAllRead = () => {
    const ids = notifications.map((n) => n.id);
    setSeenIds(ids);
    if (seenKey) localStorage.setItem(seenKey, JSON.stringify(ids));
    toast.success(t("shell.all_read"));
  };

  const markRead = (id: string) => {
    setSeenIds((prev) => {
      const next = prev.includes(id) ? prev : [...prev, id];
      if (seenKey) localStorage.setItem(seenKey, JSON.stringify(next));
      return next;
    });
  };


  const getBreadcrumbs = () => {
    const parts = pathname.split("/").filter(Boolean);
    return parts.map((part, idx) => {
      const href = "/" + parts.slice(0, idx + 1).join("/");
      const navItem = NAV.find((n) => n.to === href);
      const label = navItem ? t(navItem.labelKey) : part;
      return { href, label };
    });
  };

  const searchResults = items.filter((item) =>
    t(item.labelKey).toLowerCase().includes(searchQuery.toLowerCase())
  );

  const unreadCount = notifications.filter((n) => !n.read).length;

  const SidebarContent = (
    <div className="flex h-full flex-col bg-slate-900 text-slate-100 border-r border-slate-800 font-sans">
      {/* Brand Header */}
      <div className={cn("flex items-center gap-3 px-5 py-5 border-b border-slate-800 transition-all duration-300", sidebarCollapsed ? "justify-center px-2" : "")}>
        {sidebarCollapsed ? (
          <img src="/logo-symbol.png" alt="UniChem" className="h-8 w-8 object-contain shrink-0" />
        ) : (
          <img src="/logo-full.png" alt="UniChem International" className="h-10 w-auto max-w-[150px] object-contain shrink-0" />
        )}
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1.5 scrollbar-thin scrollbar-thumb-slate-800">
        <div className={cn("text-[10px] uppercase font-bold text-slate-500 px-3 mb-2 tracking-wider", sidebarCollapsed ? "text-center px-0 text-[8px]" : "")}>
          {sidebarCollapsed ? t("shell.nav_short") : t("shell.core_functions")}
        </div>
        
        {items.map((item) => {
          const active = pathname === item.to || (item.to !== "/dashboard" && pathname.startsWith(item.to));
          const Icon = item.icon;
          return (
            <Link
              key={item.to}
              to={item.to}
              onClick={() => setMobileOpen(false)}
              className={cn(
                "group flex items-center justify-between px-3 py-2.5 rounded-lg text-sm transition-all duration-200",
                active
                  ? "bg-indigo-600 text-white font-medium shadow-md shadow-indigo-600/20"
                  : "text-slate-400 hover:bg-slate-800/60 hover:text-white"
              )}
            >
              <div className="flex items-center gap-3">
                <Icon className={cn("h-4 w-4 shrink-0 transition-transform group-hover:scale-105", active ? "text-white" : "text-slate-400 group-hover:text-white")} />
                {!sidebarCollapsed && <span>{t(item.labelKey)}</span>}
              </div>
              {!sidebarCollapsed && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    toggleFavorite(item.to);
                  }}
                  className="opacity-0 group-hover:opacity-100 hover:text-yellow-400 transition"
                >
                  <Star className={cn("h-3.5 w-3.5", favorites.includes(item.to) ? "fill-yellow-400 text-yellow-400" : "")} />
                </button>
              )}
            </Link>
          );
        })}

        {/* Favorites section in Sidebar */}
        {!sidebarCollapsed && favorites.length > 0 && (
          <div className="pt-6 border-t border-slate-800/80 mt-4 space-y-1">
            <div className="text-[10px] uppercase font-bold text-slate-500 px-3 mb-2 tracking-wider flex items-center gap-1.5">
              <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" /> {t("shell.favorites")}
            </div>
            {favorites.map((fav) => {
              const item = NAV.find((n) => n.to === fav);
              if (!item) return null;
              const Icon = item.icon;
              return (
                <Link
                  key={fav}
                  to={fav}
                  className="flex items-center gap-3 px-3 py-1.5 rounded-md text-xs text-slate-400 hover:text-white hover:bg-slate-800/40"
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span>{t(item.labelKey)}</span>
                </Link>
              );
            })}
          </div>
        )}
      </nav>

      {/* User Footer Profile & Theme Switch */}
      <div className="border-t border-slate-800 p-4 bg-slate-950/40">
        {!sidebarCollapsed && (
          <div className="mb-4 flex items-center justify-between rounded-lg bg-slate-800/30 p-2 border border-slate-800/40">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[11px] text-slate-400 font-semibold tracking-wide">{t("shell.system_ok")}</span>
            </div>
            <button
              onClick={toggleTheme}
              className="p-1.5 rounded-md hover:bg-slate-800 text-slate-400 hover:text-white transition"
              title="Toggle Theme"
            >
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
          </div>
        )}

        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-indigo-600/10 border border-indigo-600/20 text-indigo-400 flex items-center justify-center font-bold uppercase shrink-0">
            {user.name.slice(0, 2)}
          </div>
          {!sidebarCollapsed && (
            <div className="min-w-0 flex-1">
              <div className="text-xs font-bold text-slate-200 truncate">{user.name}</div>
              <div className="text-[10px] text-slate-500 truncate">{user.email}</div>
            </div>
          )}
          {!sidebarCollapsed && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="icon" variant="ghost" className="h-7 w-7 text-slate-400 hover:text-white">
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuLabel>{t("shell.my_account")}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="gap-2" onClick={() => navigate({ to: "/settings" })}>
                  <Settings2 className="h-4 w-4" /> {t("shell.system_settings")}
                </DropdownMenuItem>
                <DropdownMenuItem className="gap-2" onClick={toggleTheme}>
                  {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />} {t("shell.toggle_theme")}
                </DropdownMenuItem>
                <DropdownMenuItem className="gap-2" onClick={() => {
                  const newLang = i18n.language === "ar" ? "en" : "ar";
                  import("@/lib/i18n").then((m) => m.changeLanguage(newLang));
                }}>
                  <Sparkles className="h-4 w-4 text-slate-400" /> {i18n.language === "ar" ? "English" : "عربي"}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-destructive gap-2 focus:bg-destructive/10" onClick={handleLogout}>
                  <LogOut className="h-4 w-4" /> {t("nav.logout")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex bg-slate-50 dark:bg-slate-950 font-sans transition-colors duration-300">
      {/* Desktop Sidebar wrapper */}
      <aside className={cn("hidden md:block transition-all duration-300 shrink-0 print:hidden", sidebarCollapsed ? "w-16" : "w-64")}>
        <div className="fixed top-0 bottom-0 z-20 h-full w-inherit">
          {SidebarContent}
        </div>
      </aside>

      {/* Mobile Drawer */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="p-0 w-64 bg-slate-900 border-r border-slate-800">
          <div className="h-full flex flex-col">{SidebarContent}</div>
        </SheetContent>
      </Sheet>

      {/* Main Panel */}
      <div className="flex-1 flex flex-col min-w-0 relative">
        {/* Sticky Header */}
        <header className="sticky top-0 z-10 flex h-14 items-center justify-between border-b border-slate-200/80 dark:border-slate-800/80 bg-white/70 dark:bg-slate-900/70 backdrop-blur-md px-4 sm:px-6 print:hidden">
          <div className="flex items-center gap-3">
            {/* Sidebar toggle triggers */}
            <button
              onClick={() => setMobileOpen(true)}
              className="p-2 -ms-2 text-slate-500 hover:text-slate-800 dark:hover:text-white md:hidden"
            >
              <Menu className="h-5 w-5" />
            </button>
            <button
              onClick={() => setSidebarCollapsed((v) => !v)}
              className="hidden md:flex p-2 -ms-2 text-slate-500 hover:text-slate-800 dark:hover:text-white"
            >
              {sidebarCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </button>

            {/* Breadcrumbs */}
            <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-400 dark:text-slate-500">
              <Link to="/dashboard" className="hover:text-slate-600 dark:hover:text-slate-300">UniChem</Link>
              {getBreadcrumbs().map((b, idx) => (
                <div key={idx} className="flex items-center gap-1.5">
                  <span>/</span>
                  <Link to={b.href} className="font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white capitalize">
                    {b.label}
                  </Link>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Action Utilities */}
          <div className="flex items-center gap-2">
            {/* Global Search trigger */}
            <button
              onClick={() => setSearchOpen(true)}
              className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 px-3 py-1.5 rounded-lg text-xs transition"
            >
              <Search className="h-3.5 w-3.5" />
              <span className="hidden md:inline">{t("shell.quick_search")}</span>
              <kbd className="hidden md:inline-flex items-center gap-0.5 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-1.5 py-0.5 rounded text-[10px] font-sans font-bold">
                <Command className="h-2.5 w-2.5" />K
              </kbd>
            </button>

            {/* Notification system center */}
            <Sheet>
              <SheetTrigger asChild>
                <button className="relative p-2 rounded-lg text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition">
                  <Bell className="h-4.5 w-4.5" />
                  {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-indigo-600 dark:bg-indigo-400 ring-2 ring-white dark:ring-slate-900" />
                  )}
                </button>
              </SheetTrigger>
              <SheetContent className="w-80 sm:w-96 p-0 dark:bg-slate-900">
                <SheetHeader className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-row justify-between items-center">
                  <SheetTitle className="text-sm font-bold flex items-center gap-2">
                    <Bell className="h-4.5 w-4.5 text-indigo-500" /> {t("shell.notifications")}
                  </SheetTitle>
                  {unreadCount > 0 && (
                    <Button variant="ghost" size="sm" onClick={markAllRead} className="text-xs h-7 text-indigo-500">
                      {t("shell.mark_all_read")}
                    </Button>
                  )}
                </SheetHeader>
                <div className="overflow-y-auto h-[calc(100vh-60px)] divide-y divide-slate-100 dark:divide-slate-800">
                  {notifications.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                      <CheckCircle2 className="h-10 w-10 text-slate-300 dark:text-slate-700 mb-2" />
                      <div className="text-sm font-semibold text-slate-700 dark:text-slate-300">{t("shell.clean_slate")}</div>
                      <div className="text-xs text-slate-400 mt-1">{t("shell.no_notifications")}</div>
                    </div>
                  ) : (
                    notifications.map((n) => {
                      const TypeIcon = {
                        success: CheckCircle2,
                        warning: AlertTriangle,
                        error: AlertCircle,
                        info: Sparkles
                      }[n.type];
                      return (
                        <div key={n.id} className={cn("p-4 flex gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition", !n.read ? "bg-indigo-50/20 dark:bg-indigo-950/10" : "")}>
                          <div className={cn("mt-0.5 rounded-full p-1 h-7 w-7 grid place-items-center shrink-0", 
                            n.type === "success" && "bg-emerald-500/10 text-emerald-500",
                            n.type === "warning" && "bg-amber-500/10 text-amber-500",
                            n.type === "error" && "bg-rose-500/10 text-rose-500",
                            n.type === "info" && "bg-blue-500/10 text-blue-500"
                          )}>
                            <TypeIcon className="h-4 w-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center justify-between">
                              <span>{n.title}</span>
                              <span className="text-[10px] text-slate-400 font-normal">{n.time}</span>
                            </div>
                            <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">{n.desc}</div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </SheetContent>
            </Sheet>

            {/* Profile Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="h-8 w-8 rounded-lg bg-indigo-600/10 border border-indigo-600/20 text-indigo-500 flex items-center justify-center font-bold uppercase transition hover:bg-indigo-600/20">
                  {user.name.slice(0, 2)}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 font-sans">
                <DropdownMenuLabel className="flex flex-col py-2 px-3">
                  <span className="font-bold text-slate-900 dark:text-white truncate">{user.name}</span>
                  <span className="text-xs text-slate-500 truncate">{user.email}</span>
                  <span className="mt-1.5 self-start inline-block text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-indigo-500/15 text-indigo-600 dark:text-indigo-400">
                    {user.role}
                  </span>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="gap-2" onClick={() => navigate({ to: "/settings" })}>
                  <Settings2 className="h-4 w-4 text-slate-400" /> {t("shell.system_settings")}
                </DropdownMenuItem>
                <DropdownMenuItem className="gap-2" onClick={toggleTheme}>
                  {theme === "dark" ? <Sun className="h-4 w-4 text-slate-400" /> : <Moon className="h-4 w-4 text-slate-400" />} {t("shell.theme_switcher")}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-destructive gap-2 focus:bg-destructive/10" onClick={handleLogout}>
                  <LogOut className="h-4 w-4" /> {t("shell.log_out")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Page Content Panel */}
        <main className="flex-1 overflow-x-hidden min-h-[calc(100vh-56px)] bg-slate-50 dark:bg-slate-950/60 print:bg-white print:min-h-0 print:overflow-visible">
          {children}
        </main>
      </div>

      {/* Global Command Palette search Modal */}
      <Dialog open={searchOpen} onOpenChange={setSearchOpen}>
        <DialogContent className="sm:max-w-lg p-0 border border-slate-200 dark:border-slate-800 dark:bg-slate-900 overflow-hidden rounded-xl shadow-2xl">
          <div className="flex items-center gap-3 px-4 py-3.5 border-b border-slate-200 dark:border-slate-800">
            <Search className="h-4.5 w-4.5 text-slate-400 shrink-0" />
            <Input
              type="text"
              placeholder={t("shell.search_placeholder")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="border-0 shadow-none focus-visible:ring-0 p-0 text-sm h-auto bg-transparent flex-1 dark:text-white placeholder-slate-400"
              autoFocus
            />
          </div>
          <div className="max-h-72 overflow-y-auto py-2">
            {searchResults.length === 0 ? (
              <div className="p-4 text-center text-xs text-slate-500">{t("shell.no_results")}</div>
            ) : (
              searchResults.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.to}
                    onClick={() => {
                      navigate({ to: item.to });
                      setSearchOpen(false);
                      setSearchQuery("");
                    }}
                    className="w-full flex items-center justify-between px-4 py-2 text-left text-xs hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition"
                  >
                    <div className="flex items-center gap-3">
                      <Icon className="h-4 w-4 text-slate-400" />
                      <span className="font-semibold text-slate-800 dark:text-slate-200">{t(item.labelKey)}</span>
                    </div>
                    <span className="text-[10px] text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded uppercase font-mono">{t("shell.navigate")}</span>
                  </button>
                );
              })
            )}
          </div>
          <div className="flex justify-between items-center border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 px-4 py-2 text-[10px] text-slate-400 font-mono">
            <span>{t("shell.search_hint")}</span>
            <span>{t("shell.search_esc")}</span>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export function PageHeader({
  title, description, actions,
}: { title: string; description?: string; actions?: ReactNode }) {
  return (
    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6 border-b border-slate-200/50 dark:border-slate-800/50 pb-5">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white md:text-3xl">{title}</h1>
        {description && <p className="text-sm text-slate-500 dark:text-slate-400 mt-1.5">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-2.5 shrink-0">{actions}</div>}
    </div>
  );
}
