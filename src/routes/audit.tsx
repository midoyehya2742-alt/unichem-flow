import { createFileRoute } from "@tanstack/react-router";
import { RequireAuth } from "@/components/require-auth";
import { PageHeader } from "@/components/app-shell";
import { useDb } from "@/lib/store";
import { Card, CardContent } from "@/components/ui/card";
import { formatDateTime } from "@/lib/format";
import { ScrollText, ShieldAlert, Search, SlidersHorizontal, ChevronDown, ChevronRight, FileText, Package, Users, Shield, RefreshCw } from "lucide-react";
import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";
import { PageTransition } from "@/components/ui/page-transition";

export const Route = createFileRoute("/audit")({
  head: () => ({ meta: [{ title: "Audit log — UniChem ERP" }] }),
  component: () => <RequireAuth roles={["admin"]}><AuditPage /></RequireAuth>,
});

function AuditPage() {
  const db = useDb();
  const { t } = useTranslation("common");
  const log = db.listAudit();
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [actionFilter, setActionFilter] = useState("all");
  const [entityFilter, setEntityFilter] = useState("all");
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 300);
    return () => clearTimeout(t);
  }, []);

  const toggleExpand = (id: string) => {
    setExpandedIds(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // Audit rows come from two sources with different naming: DB triggers log the
  // plural table name (products, customers, deals, profiles) and SQL verbs
  // (insert/update/delete), while RPCs log singular entities (deal, inventory)
  // and friendlier verbs (create). Normalize both so the filters actually match.
  const normEntity = (s: string) => s.toLowerCase().replace(/s$/, "");
  const normAction = (s: string) => {
    const a = s.toLowerCase();
    if (a === "insert") return "create";
    if (a === "edit") return "update";
    if (a === "remove") return "delete";
    return a;
  };

  const filteredLogs = log.filter((e) => {
    const matchesSearch =
      e.actorName.toLowerCase().includes(q.toLowerCase()) ||
      e.action.toLowerCase().includes(q.toLowerCase()) ||
      e.entity.toLowerCase().includes(q.toLowerCase()) ||
      (e.details && e.details.toLowerCase().includes(q.toLowerCase()));

    const matchesAction = actionFilter === "all" || normAction(e.action) === normAction(actionFilter);
    const matchesEntity = entityFilter === "all" || normEntity(e.entity) === normEntity(entityFilter);

    return matchesSearch && matchesAction && matchesEntity;
  });

  const getEntityIcon = (entity: string) => {
    switch (entity.toLowerCase()) {
      case "deal":
        return <FileText className="h-4 w-4" />;
      case "product":
        return <Package className="h-4 w-4" />;
      case "customer":
        return <Users className="h-4 w-4" />;
      case "profiles":
      case "profile":
      case "user":
        return <Shield className="h-4 w-4" />;
      default:
        return <ShieldAlert className="h-4 w-4" />;
    }
  };

  const getActionBadge = (action: string) => {
    const act = action.toLowerCase();
    if (act === "create" || act === "insert") {
      return <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-[10px] hover:bg-emerald-500/15 transition-colors">{t("audit.actions.create", "Create")}</Badge>;
    }
    if (act === "update" || act === "edit") {
      return <Badge className="bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20 text-[10px] hover:bg-blue-500/15 transition-colors">{t("audit.actions.update", "Update")}</Badge>;
    }
    if (act === "delete" || act === "remove") {
      return <Badge className="bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20 text-[10px] hover:bg-rose-500/15 transition-colors">{t("audit.actions.delete", "Delete")}</Badge>;
    }
    return <Badge className="bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20 text-[10px] hover:bg-slate-500/15 transition-colors">{action}</Badge>;
  };

  function renderDiffs(detailsString?: string) {
    if (!detailsString) return null;
    try {
      const parsed = JSON.parse(detailsString);
      
      // If details is plain JSON string but not an old/new diff object
      if (typeof parsed !== "object" || parsed === null || (!parsed.old && !parsed.new)) {
        return (
          <div className="text-[11px] text-slate-500 dark:text-slate-400 font-sans mt-1 bg-slate-50 dark:bg-slate-900/40 p-2 rounded-lg leading-relaxed">
            {typeof parsed === "object" ? JSON.stringify(parsed, null, 2) : String(parsed)}
          </div>
        );
      }

      const oldVal = parsed.old || {};
      const newVal = parsed.new || {};
      
      // Find all unique keys
      const allKeys = Array.from(new Set([...Object.keys(oldVal), ...Object.keys(newVal)]));
      
      // Ignore internal keys
      const ignoreKeys = ["id", "created_at", "updated_at", "updatedAt", "createdAt"];
      const filteredKeys = allKeys.filter(k => !ignoreKeys.includes(k));
      
      if (filteredKeys.length === 0) {
        return <div className="text-[10px] text-slate-400 mt-2 italic">{t("audit.no_changes", "No property changes logged.")}</div>;
      }

      return (
        <div className="mt-3 border-t border-slate-100 dark:border-slate-800/60 pt-3">
          <div className="grid grid-cols-3 gap-3 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">
            <span>Property</span>
            <span>Old Value</span>
            <span>New Value</span>
          </div>
          <div className="space-y-1.5">
            {filteredKeys.map((key) => {
              const oldRaw = oldVal[key];
              const newRaw = newVal[key];

              const oldStr = oldRaw === null || oldRaw === undefined ? "—" : typeof oldRaw === "object" ? JSON.stringify(oldRaw) : String(oldRaw);
              const newStr = newRaw === null || newRaw === undefined ? "—" : typeof newRaw === "object" ? JSON.stringify(newRaw) : String(newRaw);

              return (
                <div key={key} className="grid grid-cols-3 gap-3 text-[11px] items-start py-1 border-b border-slate-100/30 dark:border-slate-900/30 last:border-0 font-mono">
                  <span className="font-semibold text-slate-500 dark:text-slate-400 truncate capitalize" title={key}>{key}</span>
                  <span className="text-rose-600 dark:text-rose-400 bg-rose-50/60 dark:bg-rose-950/20 px-1.5 py-0.5 rounded line-through break-all" title={oldStr}>
                    {oldStr}
                  </span>
                  <span className="text-emerald-600 dark:text-emerald-400 bg-emerald-50/60 dark:bg-emerald-950/20 px-1.5 py-0.5 rounded font-semibold break-all" title={newStr}>
                    {newStr}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      );
    } catch (e) {
      // Fallback for plain text
      return (
        <div className="text-[11px] text-slate-500 dark:text-slate-400 font-sans mt-1 bg-slate-50 dark:bg-slate-900/40 p-2 rounded-lg leading-relaxed">
          {detailsString}
        </div>
      );
    }
  }

  const resetFilters = () => {
    setQ("");
    setActionFilter("all");
    setEntityFilter("all");
  };

  return (
    <PageTransition className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto space-y-6 font-sans">
      <PageHeader
        title={t("audit.title")}
        description={t("audit.desc")}
      />

      {/* Filter and Search Bar */}
      <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
        <CardContent className="p-4 flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="relative w-full md:max-w-xs">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input 
              className="ps-9 h-10 text-xs focus-visible:ring-indigo-500" 
              placeholder={t("audit.search_placeholder", "Search actor, action or details...")} 
              value={q} 
              onChange={(e) => setQ(e.target.value)} 
            />
          </div>

          <div className="flex flex-wrap w-full md:w-auto gap-2.5 items-center">
            {/* Action Filter */}
            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger className="w-[125px] h-10 text-xs">
                <SelectValue placeholder="Action" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Actions</SelectItem>
                <SelectItem value="create">Create</SelectItem>
                <SelectItem value="update">Update</SelectItem>
                <SelectItem value="delete">Delete</SelectItem>
              </SelectContent>
            </Select>

            {/* Entity Filter */}
            <Select value={entityFilter} onValueChange={setEntityFilter}>
              <SelectTrigger className="w-[125px] h-10 text-xs">
                <SelectValue placeholder="Entity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Entities</SelectItem>
                <SelectItem value="deal">Deals</SelectItem>
                <SelectItem value="product">Products</SelectItem>
                <SelectItem value="customer">Customers</SelectItem>
                <SelectItem value="profiles">Users</SelectItem>
              </SelectContent>
            </Select>

            {(q || actionFilter !== "all" || entityFilter !== "all") && (
              <Button size="sm" variant="ghost" className="h-10 text-xs text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-950/20" onClick={resetFilters}>
                <RefreshCw className="h-3 w-3 mr-1.5" /> {t("common.actions.clear", "Reset")}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <Card className="border-slate-200 dark:border-slate-800">
          <div className="p-6 space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-12 bg-slate-100 dark:bg-slate-900/50 rounded-xl animate-pulse" />
            ))}
          </div>
        </Card>
      ) : filteredLogs.length === 0 ? (
        <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
          <CardContent className="flex flex-col items-center justify-center py-16 px-4 text-center">
            <div className="h-12 w-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-500 grid place-items-center mb-4">
              <ScrollText className="h-6 w-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">{t("audit.clean_ledger")}</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm">
              {q || actionFilter !== "all" || entityFilter !== "all"
                ? t("audit.no_search_results", "No records matched your search filters.")
                : t("audit.no_mods")}
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <CardContent className="p-0">
            <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {filteredLogs.map((e) => {
                const isExpanded = !!expandedIds[e.id];
                return (
                  <div key={e.id} className="transition-all hover:bg-slate-50/30 dark:hover:bg-slate-900/5">
                    {/* Collapsible Header */}
                    <div 
                      onClick={() => toggleExpand(e.id)}
                      className="p-4 sm:px-6 flex gap-4 items-center justify-between cursor-pointer select-none"
                    >
                      <div className="flex gap-4 items-center min-w-0">
                        <div className="rounded-xl p-2 bg-slate-100 dark:bg-slate-800 text-slate-500 shrink-0">
                          {getEntityIcon(e.entity)}
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs text-slate-800 dark:text-slate-200 leading-relaxed flex flex-wrap items-center gap-1.5">
                            <span className="font-bold text-slate-900 dark:text-white">{e.actorName}</span>
                            {getActionBadge(e.action)}
                            <span className="text-slate-400 font-medium lowercase">on</span>
                            <span className="font-semibold text-indigo-600 dark:text-indigo-400 capitalize">{e.entity}</span>
                          </div>
                          {!isExpanded && e.details && (
                            <p className="text-[10px] text-slate-400 dark:text-slate-500 truncate max-w-md mt-0.5">
                              {e.details.startsWith("{") ? "Click to view property diff" : e.details}
                            </p>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3 shrink-0">
                        <div className="text-[10px] text-slate-400 font-medium">
                          {formatDateTime(e.createdAt)}
                        </div>
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4 text-slate-400" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-slate-400" />
                        )}
                      </div>
                    </div>

                    {/* Collapsible Body */}
                    {isExpanded && (
                      <div className="px-4 pb-4 sm:px-6 sm:pb-5 pt-1 border-t border-slate-50 dark:border-slate-900/10 bg-slate-50/20 dark:bg-slate-950/5">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3 text-[10px] text-slate-400 dark:text-slate-500">
                          <div>
                            <span className="font-semibold">Actor ID:</span> <span className="font-mono">{e.actorId}</span>
                          </div>
                          <div>
                            <span className="font-semibold">Entity ID:</span> <span className="font-mono">{e.entityId || "N/A"}</span>
                          </div>
                        </div>
                        
                        {renderDiffs(e.details)}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </PageTransition>
  );
}
