import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function KpiCard({
  icon: Icon, label, value, sub, tone = "primary",
}: { icon: any; label: string; value: string; sub?: string; tone?: "primary" | "success" | "warning" | "muted" }) {
  const toneCls = {
    primary: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20",
    success: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
    warning: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
    muted: "bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20",
  }[tone];

  return (
    <Card className="hover:shadow-md transition-all duration-300 border-slate-200 dark:border-slate-800 hover:-translate-y-0.5 group">
      <CardContent className="p-5 flex items-start justify-between">
        <div className="space-y-1">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300 transition-colors">
            {label}
          </div>
          <div className="text-2xl font-black text-slate-800 dark:text-white tracking-tight">{value}</div>
          {sub && <div className="text-[10px] text-slate-400 dark:text-slate-500">{sub}</div>}
        </div>
        <div className={cn("h-10 w-10 rounded-xl grid place-items-center border shadow-sm transition-all duration-300 group-hover:scale-105", toneCls)}>
          <Icon className="h-5 w-5" />
        </div>
      </CardContent>
    </Card>
  );
}
