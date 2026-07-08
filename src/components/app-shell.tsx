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
  Command, User, Settings2, Sparkles, CheckCircle2, AlertTriangle, AlertCircle, ArrowRight, Calendar
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

interface NavSection {
  section: string;
  sectionKey: string;
  items: NavItem[];
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

/** Group nav items into logical sections */
const MAIN_ROUTES = ["/dashboard", "/deals/new", "/deals"];
const MANAGEMENT_ROUTES = ["/customers", "/products", "/inventory", "/reports"];
// Everything else goes into SYSTEM section

interface SysNotification {
  id: string;
  title: string;
  desc: string;
  time: string;
  type: "success" | "warning" | "error" | "info";
  read: boolean;
  dealId?: string;
}

import { useTranslation } from "react-i18next";
import { useDeals } from "@/hooks/queries";
import { Edit2 } from "lucide-react";
import { Sidebar } from "@/components/layout/sidebar";

export function AppShell({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { data: dealsData } = useDeals();
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

  // Which notification ids have already popped up as a toast, persisted per
  // user (separate from "read" state) so a toast fires exactly once ever —
  // not once per session/login — even if the user never opens the bell to
  // mark it read.
  const toastedKey = user ? `unichem-notif-toasted-${user.id}` : "";
  const [toastedIds, setToastedIds] = useState<string[]>([]);
  useEffect(() => {
    if (!toastedKey) return;
    try {
      const raw = localStorage.getItem(toastedKey);
      setToastedIds(raw ? JSON.parse(raw) : []);
    } catch { setToastedIds([]); }
  }, [toastedKey]);

  // Derive notifications from edit-request state on deals
  const deals = user ? (dealsData ?? []) : [];
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
          dealId: d.id,
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
          dealId: d.id,
        });
      }
    }
    return out.sort((a, b) => b.id.localeCompare(a.id));
  })();

  // Toast on new unread notifications — fires exactly once per notification
  // id, ever (persisted below), so it doesn't repeat on every login.
  useEffect(() => {
    if (!user) return;
    const fresh = notifications.filter((n) => !n.read && !toastedIds.includes(n.id));
    if (fresh.length === 0) return;
    fresh.forEach((n) => {
      if (n.type === "success") toast.success(n.title, { description: n.desc });
      else if (n.type === "error") toast.error(n.title, { description: n.desc });
      else toast(n.title, { description: n.desc });
    });
    setToastedIds((prev) => {
      const next = [...prev, ...fresh.map((n) => n.id)];
      if (toastedKey) localStorage.setItem(toastedKey, JSON.stringify(next));
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notifications.map((n) => n.id).join("|"), user?.id]);

  const items = user ? NAV.filter((n) => n.roles.includes(user.role)) : [];

  // Close mobile drawer whenever the route changes
  useEffect(() => {
    setMobileOpen(false);
    setSearchOpen(false);
  }, [pathname]);

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
    navigate({ to: "/auth", search: { next: undefined } });
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
    <Sidebar 
      user={user} 
      items={items} 
      NAV={NAV}
      MAIN_ROUTES={MAIN_ROUTES} 
      MANAGEMENT_ROUTES={MANAGEMENT_ROUTES} 
      sidebarCollapsed={sidebarCollapsed} 
      favorites={favorites} 
      toggleFavorite={toggleFavorite} 
      setMobileOpen={setMobileOpen} 
      theme={theme} 
      toggleTheme={toggleTheme} 
      handleLogout={handleLogout} 
    />
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
        <header className="sticky top-0 z-10 flex h-14 items-center justify-between border-b border-slate-200/60 dark:border-slate-800/60 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl px-4 sm:px-6 print:hidden shadow-[0_1px_3px_rgb(0_0_0/0.04)] dark:shadow-[0_1px_3px_rgb(0_0_0/0.15)]">
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
            <div className="hidden sm:flex items-center gap-1 text-xs text-slate-400 dark:text-slate-500">
              <Link to="/dashboard" className="hover:text-slate-600 dark:hover:text-slate-300 transition-colors">UniChem</Link>
              {getBreadcrumbs().map((b, idx) => (
                <div key={idx} className="flex items-center gap-1">
                  <ChevronRight className="h-3 w-3 text-slate-300 dark:text-slate-600" />
                  <Link to={b.href} className="font-semibold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white capitalize transition-colors">
                    {b.label}
                  </Link>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Action Utilities */}
          <div className="flex items-center gap-3">
            {/* Search Input Trigger */}
            <button
              onClick={() => setSearchOpen(true)}
              className="hidden lg:flex items-center gap-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-indigo-500/30 text-slate-400 w-64 px-3 py-1.5 rounded-lg text-sm transition justify-between"
            >
              <div className="flex items-center gap-2">
                <Search className="h-4 w-4" />
                <span>Search anything...</span>
              </div>
              <kbd className="flex items-center gap-0.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-1.5 py-0.5 rounded text-[10px] font-sans font-bold text-slate-500 shadow-sm">
                <Command className="h-3 w-3" />K
              </kbd>
            </button>

            {/* Date Picker Placeholder */}
            <div className="hidden xl:flex items-center gap-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-3 py-1.5 rounded-lg text-sm text-slate-600 dark:text-slate-300">
               <Calendar className="h-4 w-4 text-slate-400" />
               <span className="text-xs font-medium">{new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}</span>
            </div>

            {/* New Deal Button */}
            {(user?.role === "salesman" || user?.role === "admin") && (
              <Link to="/deals/new">
                <Button className="hidden md:flex bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-500/20 rounded-lg px-4 h-9">
                  <Plus className="h-4 w-4 me-1.5" /> {t("dashboard.new_deal", { defaultValue: "New Deal" })}
                </Button>
              </Link>
            )}

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
                      const dealId = n.dealId;
                      return (
                        <button
                          key={n.id}
                          onClick={() => {
                            markRead(n.id);
                            if (dealId) navigate({ to: "/deals/$id", params: { id: dealId } });
                          }}
                          className={cn("w-full text-left p-4 flex gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition", !n.read ? "bg-violet-50/30 dark:bg-violet-950/10" : "")}
                        >
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
                              <span className="flex items-center gap-1">
                                {dealId && <Edit2 className="h-3 w-3 text-violet-500 shrink-0" />}
                                {n.title}
                              </span>
                              <span className="text-[10px] text-slate-400 font-normal">{n.time}</span>
                            </div>
                            <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">{n.desc}</div>
                            {dealId && (
                              <div className="mt-2">
                                <Link
                                  to="/deals/$id"
                                  params={{ id: dealId }}
                                  onClick={(e) => { e.stopPropagation(); markRead(n.id); }}
                                  className="inline-flex items-center gap-1 text-[10px] font-semibold text-violet-600 dark:text-violet-400 hover:underline"
                                >
                                  Review Deal <ArrowRight className="h-2.5 w-2.5" />
                                </Link>
                              </div>
                            )}
                          </div>
                        </button>

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
        <main className="flex-1 overflow-x-hidden min-h-[calc(100vh-56px)] bg-slate-50 dark:bg-slate-950/60 pb-20 md:pb-0 print:bg-white print:min-h-0 print:overflow-visible print:pb-0">
          {children}
        </main>
      </div>

      {/* Mobile bottom quick-nav — primary routes always one tap away */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-30 border-t border-border/50 bg-background/80 backdrop-blur-xl pb-[env(safe-area-inset-bottom)] print:hidden shadow-[0_-1px_3px_rgb(0_0_0/0.05)] dark:shadow-[0_-1px_3px_rgb(0_0_0/0.2)]">
        <div className="grid grid-cols-4">
          {[
            { to: "/dashboard", icon: LayoutDashboard, label: t("nav.dashboard") },
            { to: "/deals", icon: FileText, label: t("nav.deals") },
            { to: "/customers", icon: Users, label: t("nav.customers") },
            { to: "/inventory", icon: Warehouse, label: t("nav.inventory") },
          ].map(({ to, icon: Icon, label }) => {
            const active = pathname === to || pathname.startsWith(`${to}/`);
            return (
              <Link
                key={to}
                to={to}
                className={cn(
                  "relative flex flex-col items-center justify-center gap-1 py-2.5 text-[10px] font-semibold transition-colors",
                  active
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {active && <span className="absolute top-1.5 h-1 w-1 rounded-full bg-primary" />}
                <Icon className="h-4.5 w-4.5" />
                <span className="truncate max-w-full px-1">{label}</span>
              </Link>
            );
          })}
        </div>
      </nav>


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
  title, description, actions, icon: Icon,
}: { title: string; description?: string; actions?: ReactNode; icon?: React.ComponentType<{ className?: string }> }) {
  return (
    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8 pb-6 border-b border-transparent bg-[linear-gradient(to_right,var(--color-border),transparent)] bg-[length:100%_1px] bg-bottom bg-no-repeat">
      <div className="flex items-center gap-3">
        {Icon && (
          <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary grid place-items-center shrink-0">
            <Icon className="h-5 w-5" />
          </div>
        )}
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white md:text-3xl">{title}</h1>
          {description && <p className="text-sm text-muted-foreground mt-1">{description}</p>}
        </div>
      </div>
      {actions && <div className="flex items-center gap-2.5 shrink-0">{actions}</div>}
    </div>
  );
}
