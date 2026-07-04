import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { AnimatedCounter } from "@/components/ui/animated-counter";
import { Sparkline } from "@/components/ui/sparkline";
import { TrendingUp, TrendingDown } from "lucide-react";
import { motion, useMotionTemplate, useMotionValue } from "framer-motion";
import * as React from "react";

type Tone = "primary" | "success" | "warning" | "danger" | "muted";

interface KpiCardProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  /** Numeric value for animated counter (if provided, animates from 0) */
  numericValue?: number;
  /** Formatter for animated counter */
  formatter?: (n: number) => string;
  sub?: string;
  tone?: Tone;
  /** Trend percentage — positive = up, negative = down */
  trend?: number;
  /** Data points for inline sparkline chart */
  sparkData?: number[];
}

const TONE_CONFIG: Record<Tone, { icon: string; sparkColor: string; bg: string; shadowGlow: string }> = {
  primary: {
    icon: "text-indigo-600 dark:text-indigo-400",
    bg: "bg-indigo-50/70 dark:bg-indigo-500/10",
    sparkColor: "#6366f1",
    shadowGlow: "group-hover:shadow-[0_0_15px_rgba(99,102,241,0.25)] group-hover:border-indigo-500/30",
  },
  success: {
    icon: "text-emerald-600 dark:text-emerald-400",
    bg: "bg-emerald-50/70 dark:bg-emerald-500/10",
    sparkColor: "#10b981",
    shadowGlow: "group-hover:shadow-[0_0_15px_rgba(16,185,129,0.25)] group-hover:border-emerald-500/30",
  },
  warning: {
    icon: "text-amber-600 dark:text-amber-400",
    bg: "bg-amber-50/70 dark:bg-amber-500/10",
    sparkColor: "#f59e0b",
    shadowGlow: "group-hover:shadow-[0_0_15px_rgba(245,158,11,0.25)] group-hover:border-amber-500/30",
  },
  danger: {
    icon: "text-rose-600 dark:text-rose-400",
    bg: "bg-rose-50/70 dark:bg-rose-500/10",
    sparkColor: "#ef4444",
    shadowGlow: "group-hover:shadow-[0_0_15px_rgba(239,68,68,0.25)] group-hover:border-rose-500/30",
  },
  muted: {
    icon: "text-slate-500 dark:text-slate-400",
    bg: "bg-slate-50/70 dark:bg-slate-500/10",
    sparkColor: "#94a3b8",
    shadowGlow: "group-hover:shadow-[0_0_15px_rgba(148,163,184,0.25)] group-hover:border-slate-500/30",
  },
};

export function KpiCard({
  icon: Icon,
  label,
  value,
  numericValue,
  formatter,
  sub,
  tone = "primary",
  trend,
  sparkData,
}: KpiCardProps) {
  const config = TONE_CONFIG[tone];
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  function handleMouseMove({ currentTarget, clientX, clientY }: React.MouseEvent) {
    const { left, top } = currentTarget.getBoundingClientRect();
    mouseX.set(clientX - left);
    mouseY.set(clientY - top);
  }

  return (
    <Card
      onMouseMove={handleMouseMove}
      className={cn(
        "group relative overflow-hidden transition-all duration-500",
        "bg-gradient-to-br from-white to-slate-50/50 dark:from-slate-900/90 dark:to-slate-950/95",
        "border border-slate-200/60 dark:border-slate-800/80 backdrop-blur-md",
        "hover:shadow-[0_10px_30px_-10px_rgba(0,0,0,0.1)] dark:hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.5)]",
        "hover:border-slate-300 dark:hover:border-slate-700/80"
      )}
    >
      <motion.div
        className="pointer-events-none absolute -inset-px opacity-0 transition-opacity duration-500 group-hover:opacity-100 z-0"
        style={{
          background: useMotionTemplate`
            radial-gradient(
              180px circle at ${mouseX}px ${mouseY}px,
              ${tone === "primary" ? "rgba(99, 102, 241, 0.08)" :
                tone === "success" ? "rgba(16, 185, 129, 0.08)" :
                tone === "warning" ? "rgba(245, 158, 11, 0.08)" :
                tone === "danger" ? "rgba(239, 68, 68, 0.08)" :
                "rgba(148, 163, 184, 0.08)"},
              transparent 80%
            )
          `,
        }}
      />
      
      <CardContent className="p-5 flex flex-col h-full justify-between relative z-10">
        <div className="space-y-4">
          {/* Header: icon + label */}
          <div className="flex items-center gap-3">
            <div className={cn(
              "h-9 w-9 rounded-xl grid place-items-center border border-slate-100/80 dark:border-slate-800/80 transition-all duration-300",
              "shadow-[inset_0_1px_1px_rgba(255,255,255,0.2)] dark:shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)]",
              "group-hover:scale-110 group-hover:rotate-3",
              config.bg,
              config.icon,
              config.shadowGlow
            )}>
              <Icon className="h-4 w-4" />
            </div>
            <div className="text-xs font-bold text-slate-500 dark:text-slate-400 tracking-wide transition-colors group-hover:text-slate-800 dark:group-hover:text-slate-200">
              {label}
            </div>
          </div>

          {/* Value */}
          <div className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white transition-transform duration-300 group-hover:translate-x-0.5">
            {numericValue !== undefined && formatter ? (
              <AnimatedCounter value={numericValue} formatter={formatter} />
            ) : (
              value
            )}
          </div>
        </div>

        {/* Bottom row: sub text, trend, sparkline */}
        <div className="flex items-end justify-between mt-4">
          <div className="flex flex-col gap-2">
            {trend !== undefined && trend !== 0 && (
              <div className="flex items-center">
                <span className={cn(
                  "inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full transition-transform duration-300 hover:scale-105",
                  trend > 0
                    ? "text-emerald-700 bg-emerald-100/80 dark:text-emerald-400 dark:bg-emerald-500/10"
                    : "text-rose-700 bg-rose-100/80 dark:text-rose-400 dark:bg-rose-500/10"
                )}>
                  {trend > 0 ? <TrendingUp className="h-3 w-3 animate-pulse" /> : <TrendingDown className="h-3 w-3 animate-pulse" />}
                  {trend > 0 ? "+" : ""}{trend.toFixed(1)}%
                </span>
              </div>
            )}
            {sub && (
              <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium transition-colors group-hover:text-slate-500 dark:group-hover:text-slate-400">{sub}</span>
            )}
          </div>
          {sparkData && sparkData.length >= 2 && (
            <div className="overflow-hidden rounded-md pr-1">
              <Sparkline
                data={sparkData}
                color={config.sparkColor}
                width={76}
                height={30}
                className="opacity-70 group-hover:opacity-100 group-hover:scale-105 transition-all duration-500"
              />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
