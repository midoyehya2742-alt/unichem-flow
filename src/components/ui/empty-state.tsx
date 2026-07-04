import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
  tone = "neutral",
}: {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
  tone?: "neutral" | "primary" | "success" | "warning";
}) {
  const toneCls = {
    neutral: "text-slate-400 bg-slate-500/10",
    primary: "text-primary bg-primary/10",
    success: "text-emerald-500 bg-emerald-500/10",
    warning: "text-amber-500 bg-amber-500/10",
  }[tone];

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center px-6 py-10 gap-3",
        className,
      )}
    >
      {Icon && (
        <div className={cn("h-14 w-14 rounded-2xl grid place-items-center", toneCls)}>
          <Icon className="h-6 w-6" strokeWidth={1.75} />
        </div>
      )}
      <div className="space-y-1 max-w-sm">
        <h3 className="text-sm font-bold text-foreground">{title}</h3>
        {description && (
          <p className="text-xs text-muted-foreground leading-relaxed">{description}</p>
        )}
      </div>
      {action && <div className="pt-1">{action}</div>}
    </div>
  );
}
