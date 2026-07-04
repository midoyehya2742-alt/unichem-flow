import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export interface TimelineItem {
  id: string;
  icon: LucideIcon;
  title: ReactNode;
  description?: ReactNode;
  time?: string;
  tone?: "neutral" | "primary" | "success" | "warning" | "destructive";
}

export function Timeline({ items }: { items: TimelineItem[] }) {
  if (items.length === 0) return null;
  const tone = {
    neutral: "bg-slate-500/15 text-slate-500 border-slate-500/25",
    primary: "bg-primary/15 text-primary border-primary/25",
    success: "bg-emerald-500/15 text-emerald-500 border-emerald-500/25",
    warning: "bg-amber-500/15 text-amber-500 border-amber-500/25",
    destructive: "bg-rose-500/15 text-rose-500 border-rose-500/25",
  };
  return (
    <ol className="relative ms-3 border-s border-border/70 space-y-5">
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <li key={item.id} className="ms-6 relative">
            <span
              className={cn(
                "absolute -start-[35px] top-0 grid h-7 w-7 place-items-center rounded-full border",
                tone[item.tone ?? "neutral"],
              )}
            >
              <Icon className="h-3.5 w-3.5" />
            </span>
            <div className="flex items-baseline justify-between gap-3">
              <div className="text-xs font-semibold text-foreground leading-tight">
                {item.title}
              </div>
              {item.time && (
                <span className="text-[10px] text-muted-foreground shrink-0">{item.time}</span>
              )}
            </div>
            {item.description && (
              <div className="text-[11px] text-muted-foreground mt-1 leading-relaxed">
                {item.description}
              </div>
            )}
          </li>
        );
      })}
    </ol>
  );
}
