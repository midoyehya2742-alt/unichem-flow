import { cn } from "@/lib/utils";

export function SkeletonList({ rows = 5, className }: { rows?: number; className?: string }) {
  return (
    <div className={cn("space-y-2", className)}>
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="flex items-center justify-between gap-3 rounded-lg border border-border/60 p-3"
        >
          <div className="flex-1 space-y-2">
            <div className="h-3 w-1/3 rounded bg-muted animate-pulse" />
            <div className="h-2 w-1/2 rounded bg-muted/70 animate-pulse" />
          </div>
          <div className="h-6 w-16 rounded bg-muted animate-pulse shrink-0" />
        </div>
      ))}
    </div>
  );
}

export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div className={cn("rounded-xl border border-border/60 p-5 space-y-3", className)}>
      <div className="h-3 w-1/3 rounded bg-muted animate-pulse" />
      <div className="h-8 w-1/2 rounded bg-muted animate-pulse" />
      <div className="h-2 w-1/4 rounded bg-muted/70 animate-pulse" />
    </div>
  );
}
