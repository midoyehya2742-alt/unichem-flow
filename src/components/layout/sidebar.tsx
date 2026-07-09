import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { Star, ChevronRight, Settings2, LogOut, Sun, Moon, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { User } from "@/lib/types";

interface SidebarProps {
  user: User;
  items: any[];
  NAV: any[];
  MAIN_ROUTES: string[];
  MANAGEMENT_ROUTES: string[];
  sidebarCollapsed: boolean;
  favorites: string[];
  toggleFavorite: (path: string) => void;
  setMobileOpen: (open: boolean) => void;
  theme: string;
  toggleTheme: () => void;
  handleLogout: () => void;
}

export function Sidebar({
  user, items, NAV, MAIN_ROUTES, MANAGEMENT_ROUTES, sidebarCollapsed, favorites, toggleFavorite, setMobileOpen, theme, toggleTheme, handleLogout
}: SidebarProps) {
  const { t, i18n } = useTranslation("common");
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();

  return (
    <div className="flex h-full flex-col bg-[#0B1120] text-slate-100 border-e border-[#1a2235] font-sans">
      {/* Brand Header */}
      <div className={cn("flex items-center gap-3 px-5 py-5 transition-all duration-300", sidebarCollapsed ? "justify-center px-2" : "")}>
        {sidebarCollapsed ? (
          <img src="/logo-symbol.png" alt="UniChem" className="h-8 w-8 object-contain shrink-0" />
        ) : (
          <img src="/logo-full.png" alt="UniChem International" className="h-10 w-auto max-w-[150px] object-contain shrink-0" />
        )}
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1 scrollbar-thin scrollbar-thumb-slate-800">
        {!sidebarCollapsed && (
          <div className="text-[10px] uppercase font-bold text-slate-500 px-3 mb-2 tracking-wider">
            {t("shell.core_functions")}
          </div>
        )}
        
        {items.filter(i => MAIN_ROUTES.includes(i.to)).map((item) => {
          const active = pathname === item.to || (item.to !== "/dashboard" && pathname.startsWith(item.to));
          const Icon = item.icon;
          return (
            <Link
              key={item.to}
              to={item.to}
              onClick={() => setMobileOpen(false)}
              className={cn(
                "group relative flex items-center justify-between px-3 py-2.5 rounded-lg text-sm transition-all duration-200",
                active
                  ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-medium shadow-md shadow-indigo-500/20"
                  : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
              )}
            >
              <div className="flex items-center gap-3">
                <Icon className={cn("h-4.5 w-4.5 shrink-0 transition-transform duration-200", active ? "text-white" : "text-slate-500 group-hover:text-slate-300")} />
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

        {items.filter(i => MANAGEMENT_ROUTES.includes(i.to)).length > 0 && (
          <>
            <div className={cn("pt-4 mt-3 border-t border-slate-800/50", sidebarCollapsed ? "" : "")}>
              {!sidebarCollapsed && (
                <div className="text-[10px] uppercase font-bold text-slate-500 px-3 mb-2 tracking-wider">
                  {t("shell.section_management", { defaultValue: "Management" })}
                </div>
              )}
            </div>
            {items.filter(i => MANAGEMENT_ROUTES.includes(i.to)).map((item) => {
              const active = pathname === item.to || pathname.startsWith(item.to);
              const Icon = item.icon;
              return (
                <Link key={item.to} to={item.to} onClick={() => setMobileOpen(false)}
                  className={cn(
                    "group relative flex items-center justify-between px-3 py-2.5 rounded-lg text-sm transition-all duration-200",
                    active ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-medium shadow-md shadow-indigo-500/20" : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={cn("h-4.5 w-4.5 shrink-0 transition-transform duration-200", active ? "text-white" : "text-slate-500 group-hover:text-slate-300")} />
                    {!sidebarCollapsed && <span>{t(item.labelKey)}</span>}
                  </div>
                </Link>
              );
            })}
          </>
        )}

        {items.filter(i => !MAIN_ROUTES.includes(i.to) && !MANAGEMENT_ROUTES.includes(i.to)).length > 0 && (
          <>
            <div className="pt-4 mt-3 border-t border-slate-800/50">
              {!sidebarCollapsed && (
                <div className="text-[10px] uppercase font-bold text-slate-500 px-3 mb-2 tracking-wider">
                  {t("shell.section_system", { defaultValue: "System" })}
                </div>
              )}
            </div>
            {items.filter(i => !MAIN_ROUTES.includes(i.to) && !MANAGEMENT_ROUTES.includes(i.to)).map((item) => {
              const active = pathname === item.to || pathname.startsWith(item.to);
              const Icon = item.icon;
              return (
                <Link key={item.to} to={item.to} onClick={() => setMobileOpen(false)}
                  className={cn(
                    "group relative flex items-center justify-between px-3 py-2.5 rounded-lg text-sm transition-all duration-200",
                    active ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-medium shadow-md shadow-indigo-500/20" : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={cn("h-4.5 w-4.5 shrink-0 transition-transform duration-200", active ? "text-white" : "text-slate-500 group-hover:text-slate-300")} />
                    {!sidebarCollapsed && <span>{t(item.labelKey)}</span>}
                  </div>
                </Link>
              );
            })}
          </>
        )}

        {!sidebarCollapsed && favorites.length > 0 && (
          <div className="pt-6 border-t border-slate-800/80 mt-4 space-y-1">
            <div className="text-[10px] uppercase font-bold text-slate-500 px-3 mb-2 tracking-wider flex items-center gap-1.5">
              <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" /> {t("shell.favorites")}
            </div>
            {favorites.map((fav) => {
              const item = NAV.find((n) => n.to === fav); // We assume items contains it, or we should pass NAV
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
      <div className="p-4 mt-auto">
        {!sidebarCollapsed && (
          <div className="mb-4 flex items-center justify-between rounded-lg bg-[#111827] p-2 border border-[#1f2937]">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{t("shell.system_ok")}</span>
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
}
