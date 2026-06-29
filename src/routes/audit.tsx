import { createFileRoute } from "@tanstack/react-router";
import { RequireAuth } from "@/components/require-auth";
import { PageHeader } from "@/components/app-shell";
import { useDb } from "@/lib/store";
import { Card, CardContent } from "@/components/ui/card";
import { formatDateTime } from "@/lib/format";
import { ScrollText, Eye, ShieldAlert, Sparkles } from "lucide-react";
import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/audit")({
  head: () => ({ meta: [{ title: "Audit log — UniChem ERP" }] }),
  component: () => <RequireAuth roles={["admin"]}><AuditPage /></RequireAuth>,
});

function AuditPage() {
  const db = useDb();
  const log = db.listAudit();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 300);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto space-y-6 font-sans">
      <PageHeader
        title="Security Audit log"
        description="Immutable chronological register of admin actions, modifications, and system events."
      />

      {loading ? (
        <Card className="border-slate-200 dark:border-slate-800">
          <div className="p-6 space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-10 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
            ))}
          </div>
        </Card>
      ) : log.length === 0 ? (
        <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
          <CardContent className="flex flex-col items-center justify-center py-16 px-4 text-center">
            <div className="h-12 w-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-500 grid place-items-center mb-4">
              <ScrollText className="h-6 w-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Clean audit ledger</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm">
              No system modifications or security actions have been logged yet.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <CardContent className="p-0">
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {log.map((e) => (
                <div key={e.id} className="p-4 sm:px-6 flex gap-4 items-start hover:bg-slate-50/50 dark:hover:bg-slate-900/10 transition-colors">
                  <div className="mt-0.5 rounded-lg p-1.5 bg-slate-100 dark:bg-slate-800 text-slate-500 shrink-0">
                    <ShieldAlert className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs text-slate-800 dark:text-slate-200 leading-relaxed">
                      <span className="font-bold text-slate-900 dark:text-white">{e.actorName}</span>{" "}
                      <span className="text-indigo-600 dark:text-indigo-400 font-medium">{e.action}</span>{" "}
                      <span className="font-semibold text-slate-700 dark:text-slate-300">{e.entity}</span>
                    </div>
                    {e.details && (
                      <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 bg-slate-50 dark:bg-slate-900/40 p-2 rounded-lg font-mono">
                        {e.details}
                      </div>
                    )}
                  </div>
                  <div className="text-[10px] text-slate-400 shrink-0 font-medium self-center">
                    {formatDateTime(e.createdAt)}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
