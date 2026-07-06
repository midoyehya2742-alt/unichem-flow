import { createFileRoute } from "@tanstack/react-router";
import { RequireAuth } from "@/components/require-auth";
import { PageHeader } from "@/components/app-shell";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { GlowCard, GlowCardContent, GlowCardHeader, GlowCardTitle, GlowCardDescription } from "@/components/ui/glow-card";
import { formatEGP, formatCompactEGP, formatNumber } from "@/lib/format";
import { Link, useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Plus, TrendingUp, Wallet, FileText, Clock, AlertTriangle, Users,
  ArrowRight, ShoppingBag, Package, BarChart2, Zap, Edit2,
  CalendarDays
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell,
} from "recharts";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { PageTransition } from "@/components/ui/page-transition";
import { KpiCard } from "@/components/ui/kpi-card";
import { Skeleton } from "@/components/ui/skeleton";

import { useDashboardStats, useDeals } from "@/hooks/queries";

export const Route = createFileRoute("/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — UniChem ERP" }] }),
  component: () => <RequireAuth><Dashboard /></RequireAuth>,
});

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.06 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 280, damping: 26 } }
};

/** Return a time-of-day aware greeting key */
function getGreetingKey(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "dashboard.greeting_morning";
  if (hour < 17) return "dashboard.greeting_afternoon";
  return "dashboard.greeting_evening";
}

function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation("common");

  const { data: stats, isLoading: statsLoading, error: statsError } = useDashboardStats();
  const { data: deals, isLoading: dealsLoading, error: dealsError } = useDeals();

  // Hooks must run unconditionally (before any early return below), so these
  // are derived here from the possibly-still-loading query data rather than
  // after the loading/error guards.
  const daysForSpark = stats?.last_7_days || [];
  const dealsForSpark = deals || [];
  const revenueSparkData = useMemo(() => {
    return daysForSpark.map((_, i) => {
      const d = new Date(); d.setDate(d.getDate() - (6 - i));
      const key = d.toISOString().slice(0, 10);
      return dealsForSpark.filter(x => x.dealDate.slice(0, 10) === key).reduce((s, x) => s + x.total, 0);
    });
  }, [dealsForSpark, daysForSpark]);
  const profitSparkData = useMemo(() => revenueSparkData.map(r => r * 0.25), [revenueSparkData]);

  if (statsLoading || dealsLoading) return <div className="p-8 text-center text-slate-500">Loading dashboard...</div>;
  if (statsError || dealsError || !stats) return <div className="p-8 text-center text-red-500">Error loading dashboard</div>;

  // RLS already scopes deals to the caller's own deals for salesmen and
  // to all deals for finance/admin, so this is "my" visible deals.
  const myDeals = deals!;

  const total = stats.total;
  const paid = stats.paid;
  const outstanding = stats.outstanding;
  const pending = stats.pending_deals;
  
  // Low Stock Alert calculations
  const lowStockProducts = stats.low_stock_count;

  // Pending Edit Requests calculations (for finance/admin)
  const pendingEditRequests = stats.pending_edits || [];

  // Status mapping
  const byStatus = [
    { name: t("common.status.paid", { defaultValue: "Paid" }), value: stats.paid_count },
    { name: t("common.status.partial", { defaultValue: "Partial" }), value: stats.partial_count },
    { name: t("common.status.unpaid", { defaultValue: "Unpaid" }), value: stats.unpaid_count },
  ].filter(s => s.value > 0);

  const STATUS_COLORS = ["#10b981", "#f59e0b", "#ef4444"];

  // last 7 days chart data
  const days = stats.last_7_days || [];
  const chartDays = days.map((d: any, i: number) => {
    const date = new Date(d.day);
    return { day: date.toLocaleDateString(i18n.language === "ar" ? "ar" : "en", { weekday: "short" }), total: d.total };
  });

  // Sparkline data derived from the 7-day timeline
  const pipelineSparkData = days.map((d: any) => d.total);
  const collectedSparkData = days.map((d: any) => d.amount_paid);
  const dealsCountSparkData = days.map((d: any) => d.count);
  const outstandingSparkData = days.map((d: any) => d.outstanding);

  // Collection rate as trend %
  const collectionRate = total > 0 ? (paid / total) * 100 : 0;

  // --- Real Data Wiring for Dashboard Widgets ---
  
  const revenueMTD = stats.revenue_mtd;
  const revenueLastMonth = stats.revenue_last_month;

  const growthAmount = revenueMTD - revenueLastMonth;
  const growthTrend = revenueLastMonth > 0 ? (growthAmount / revenueLastMonth) * 100 : (revenueMTD > 0 ? 100 : 0);

  // Assuming a generic 25% profit margin for the MTD Profit metric
  const profitMTD = revenueMTD * 0.25;
  const profitLastMonth = revenueLastMonth * 0.25;
  const profitTrend = profitLastMonth > 0 ? ((profitMTD - profitLastMonth) / profitLastMonth) * 100 : (profitMTD > 0 ? 100 : 0);

  // Compute generic trends based on the 7-day spark data arrays (Today vs 7 days ago)
  const calculateSparkTrend = (spark: number[]) => {
    if (!spark || spark.length < 2) return 0;
    const first = spark[0];
    const last = spark[spark.length - 1];
    if (first === 0) return last > 0 ? 100 : 0;
    return ((last - first) / first) * 100;
  };

  const dealsTrend = calculateSparkTrend(dealsCountSparkData);
  const pipelineTrend = calculateSparkTrend(pipelineSparkData);
  const collectedTrend = calculateSparkTrend(collectedSparkData);
  const outstandingTrend = calculateSparkTrend(outstandingSparkData);

  // 1. Sales Funnel Data (using payment status as pipeline stages)
  const funnelLeads = myDeals.length;
  const funnelNegotiation = myDeals.filter(d => d.paymentStatus === "unpaid" || d.paymentStatus === "partial").length;
  const funnelWon = myDeals.filter(d => d.paymentStatus === "paid").length;
  const funnelLeadsPct = 100;
  const funnelNegotiationPct = funnelLeads > 0 ? Math.round((funnelNegotiation / funnelLeads) * 100) : 0;
  const funnelWonPct = funnelLeads > 0 ? Math.round((funnelWon / funnelLeads) * 100) : 0;

  // 2. Collections Overview
  const maxCollected = Math.max(...collectedSparkData, 1); // Avoid div by zero
  const collectionsChartData = collectedSparkData.map(amount => ({
    amount,
    pct: Math.max((amount / maxCollected) * 100, 5) // at least 5% height for visibility
  }));

  // 3. Receivables Aging
  const agingCurrent = stats.aging_current;
  const aging30to60 = stats.aging_30_60;
  const aging90plus = stats.aging_90_plus;
  const avgAgingDays = stats.avg_aging_days;
  const totalReceivables = agingCurrent + aging30to60 + aging90plus;

  // Calculate stroke dash offset for gauge (max 125.6)
  // Let's say 90 days is 100% of the gauge (worst case)
  const agingPct = Math.min(avgAgingDays / 90, 1);
  const agingDashOffset = 125.6 - (125.6 * agingPct);

  return (
    <PageTransition className="relative p-4 sm:p-6 lg:p-8 w-full max-w-[1600px] mx-auto space-y-8 font-sans overflow-hidden">
      {/* Greeting Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            {t(getGreetingKey(), { defaultValue: "Good Morning" })}, {user?.name.split(" ")[0]}
            <span className="animate-waving-hand inline-block origin-bottom-right">👋</span>
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {t("dashboard.desc_overview", { defaultValue: "Here's what's happening with your projects today." })}
          </p>
        </div>
      </div>

      {/* Low Stock Banner Alert */}
      {lowStockProducts.length > 0 && (user?.role === "admin" || user?.role === "finance") && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between p-4 glass-card bg-amber-500/5 border-amber-500/20 text-amber-800 dark:text-amber-300 rounded-xl"
        >
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-amber-500/15 grid place-items-center shrink-0">
              <AlertTriangle className="h-4.5 w-4.5 text-amber-500" />
            </div>
            <div className="text-xs">
              <span className="font-bold">{t("dashboard.inventory_alert")}</span> {t("dashboard.low_stock_msg", { count: lowStockProducts.length })}
            </div>
          </div>
          <Link to="/inventory">
            <Button size="sm" variant="outline" className="text-xs h-8 border-amber-500/30 hover:bg-amber-500/15 shrink-0">
              {t("dashboard.audit_stock")}
            </Button>
          </Link>
        </motion.div>
      )}

      {/* Pending Edit Requests Banner (Finance/Admin) */}
      {pendingEditRequests.length > 0 && (user?.role === "admin" || user?.role === "finance") && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex flex-col gap-3 p-4 glass-card bg-violet-500/5 border-violet-500/20 text-violet-800 dark:text-violet-300 rounded-xl"
        >
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-violet-500/15 grid place-items-center shrink-0">
              <Edit2 className="h-4.5 w-4.5 text-violet-500" />
            </div>
            <div className="text-xs">
              <span className="font-bold">{t("dashboard.edit_requests_pending", { defaultValue: "Edit Requests Pending" })}</span> — {pendingEditRequests.length} {t("dashboard.deals_await_review", { defaultValue: "deal(s) await your review." })}
            </div>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3">
            {pendingEditRequests.map(deal => (
              <div key={deal.id} className="flex items-center justify-between p-2.5 rounded-lg bg-white/50 dark:bg-white/5 border border-violet-500/10 hover:border-violet-500/20 transition-colors">
                <div className="flex flex-col overflow-hidden">
                  <span className="text-xs font-semibold truncate">{deal.reference}</span>
                  <span className="text-[10px] opacity-70 truncate">{deal.editRequest?.requestedByName}</span>
                </div>
                <Link to="/deals/$id" params={{ id: deal.id }}>
                  <Button size="sm" variant="ghost" className="h-6 text-[10px] px-2 text-violet-600 hover:text-violet-700 hover:bg-violet-500/10 dark:text-violet-400">
                    {t("common.review", { defaultValue: "Review" })}
                  </Button>
                </Link>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Main KPI Grid */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4"
      >
        <motion.div variants={itemVariants}>
          <KpiCard
            icon={FileText}
            label={t("dashboard.total_deals", { defaultValue: "Total Deals" })}
            value={myDeals.length.toString()}
            numericValue={myDeals.length}
            formatter={(v) => Math.round(v).toString()}
            trend={dealsTrend}
            sparkData={dealsCountSparkData}
            tone="primary"
          />
        </motion.div>
        <motion.div variants={itemVariants}>
          <KpiCard
            icon={TrendingUp}
            label={t("dashboard.pipeline", { defaultValue: "Total Pipeline" })}
            value={formatCompactEGP(total)}
            numericValue={total}
            formatter={(v) => formatCompactEGP(v)}
            trend={pipelineTrend}
            sparkData={pipelineSparkData}
            tone="primary"
          />
        </motion.div>
        <motion.div variants={itemVariants}>
          <KpiCard
            icon={Wallet}
            label={t("dashboard.collected", { defaultValue: "Collected Cash" })}
            value={formatCompactEGP(paid)}
            numericValue={paid}
            formatter={(v) => formatCompactEGP(v)}
            trend={collectedTrend}
            sparkData={collectedSparkData}
            tone="success"
          />
        </motion.div>
        <motion.div variants={itemVariants}>
          <KpiCard
            icon={AlertTriangle}
            label={t("dashboard.outstanding", { defaultValue: "Outstanding" })}
            value={formatCompactEGP(outstanding)}
            numericValue={outstanding}
            formatter={(v) => formatCompactEGP(v)}
            trend={outstandingTrend}
            sparkData={outstandingSparkData}
            tone={outstanding > 0 ? "danger" : "success"}
          />
        </motion.div>
        <motion.div variants={itemVariants}>
          <KpiCard
            icon={Zap}
            label={t("dashboard.growth", { defaultValue: "Growth (MoM)" })}
            value={formatCompactEGP(growthAmount)}
            numericValue={growthAmount}
            formatter={(v) => formatCompactEGP(v)}
            trend={growthTrend}
            sparkData={revenueSparkData}
            tone={growthAmount >= 0 ? "success" : "danger"}
          />
        </motion.div>
        <motion.div variants={itemVariants}>
          <KpiCard
            icon={BarChart2}
            label={t("dashboard.profit", { defaultValue: "Profit (MTD)" })}
            value={formatCompactEGP(profitMTD)}
            numericValue={profitMTD}
            formatter={(v) => formatCompactEGP(v)}
            trend={profitTrend}
            sparkData={profitSparkData}
            tone={profitMTD >= 0 ? "primary" : "danger"}
          />
        </motion.div>
      </motion.div>

      {/* Charts Grid */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Main Area Chart */}
        <GlowCard className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 shadow-sm">
          <GlowCardHeader className="flex flex-row items-center justify-between pb-4">
            <div>
              <GlowCardTitle className="text-base font-bold">{t("dashboard.revenue_timeline")}</GlowCardTitle>
              <GlowCardDescription className="text-xs">{t("dashboard.revenue_timeline_desc")}</GlowCardDescription>
            </div>
            <div className="h-9 w-9 rounded-lg bg-indigo-500/10 grid place-items-center">
              <BarChart2 className="h-4 w-4 text-indigo-500" />
            </div>
          </GlowCardHeader>
          <GlowCardContent className="h-72">
            <div dir="ltr" className="h-full w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={days} margin={{ left: -10, right: 10 }}>
                  <defs>
                    <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="rgb(99, 102, 241)" stopOpacity={0.15}/>
                      <stop offset="95%" stopColor="rgb(99, 102, 241)" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" strokeOpacity={0.5} />
                  <XAxis dataKey="day" stroke="var(--color-muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="var(--color-muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="glass-panel p-3 text-xs font-sans shadow-xl border border-indigo-500/20 rounded-xl">
                            <p className="font-bold text-muted-foreground mb-1">{label}</p>
                            <p className="text-indigo-600 dark:text-indigo-400 font-extrabold text-sm">
                              {formatEGP(payload[0].value as number)}
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }}
                    cursor={{ stroke: "var(--color-indigo-500)", strokeWidth: 1, strokeDasharray: "4 4", opacity: 0.5 }}
                  />
                  <Area type="monotone" dataKey="total" stroke="rgb(99, 102, 241)" strokeWidth={2.5} fillOpacity={1} fill="url(#colorTotal)" dot={false} activeDot={{ r: 5, stroke: "rgb(99, 102, 241)", strokeWidth: 2, fill: "var(--color-card)" }} animationDuration={1500} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </GlowCardContent>
        </GlowCard>

        {/* Donut Status Chart */}
        <GlowCard className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 shadow-sm">
          <GlowCardHeader className="pb-4">
            <GlowCardTitle className="text-base font-bold text-slate-900 dark:text-white">{t("dashboard.payment_allocation")}</GlowCardTitle>
            <GlowCardDescription className="text-xs text-slate-500">{t("dashboard.payment_allocation_desc")}</GlowCardDescription>
          </GlowCardHeader>
          <GlowCardContent className="h-72 flex flex-col justify-between">
            {myDeals.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-muted-foreground">{t("dashboard.no_active_pipelines")}</div>
            ) : (
              <div className="flex items-center w-full h-full pb-4">
                <div className="relative flex-1 h-full min-h-[200px]">
                  <div dir="ltr" className="h-full w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={byStatus} dataKey="value" nameKey="name" innerRadius={60} outerRadius={85} paddingAngle={4} strokeWidth={0} cornerRadius={4}>
                          {byStatus.map((_, i) => <Cell key={i} fill={STATUS_COLORS[i % STATUS_COLORS.length]} />)}
                        </Pie>
                        <Tooltip
                          contentStyle={{
                            background: "var(--color-card)",
                            border: "1px solid var(--color-border)",
                            borderRadius: 12,
                            fontSize: 11,
                            boxShadow: "0 10px 25px -5px rgb(0 0 0 / 0.1)",
                          }}
                          itemStyle={{ color: "var(--color-foreground)" }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  {/* Center stat label */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="text-center mt-2">
                      <div className="text-3xl font-black text-slate-900 dark:text-white leading-none">{myDeals.length}</div>
                      <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-1">{t("dashboard.total_deals")}</div>
                    </div>
                  </div>
                </div>
                {/* Legend */}
                <div className="flex flex-col justify-center gap-4 text-xs w-32 shrink-0 border-l border-slate-100 dark:border-slate-800 pl-4 ml-2">
                  {byStatus.map((s, idx) => (
                    <div key={s.name} className="flex flex-col gap-1">
                      <div className="flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: STATUS_COLORS[idx % STATUS_COLORS.length] }} />
                        <span className="text-slate-500 dark:text-slate-400 font-medium">{s.name}</span>
                      </div>
                      <span className="font-bold text-slate-900 dark:text-white pl-3.5">{s.value} <span className="text-slate-400 font-normal">{t("dashboard.deals", { defaultValue: "deals" })}</span></span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </GlowCardContent>
        </GlowCard>

      </div>

      {/* Secondary Charts Row */}
      <div className="grid gap-4 lg:grid-cols-4">
        {/* Sales Funnel Placeholder */}
        <GlowCard className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 shadow-sm">
          <GlowCardHeader className="pb-2 border-b border-slate-100 dark:border-slate-800/50">
            <GlowCardTitle className="text-sm font-bold text-slate-900 dark:text-white">{t("dashboard.sales_funnel", { defaultValue: "Sales Funnel" })}</GlowCardTitle>
          </GlowCardHeader>
          <GlowCardContent className="h-64 p-4 flex flex-col justify-center gap-2">
            <div className="w-full flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">{t("dashboard.total_pipeline_deals", { defaultValue: "Total Pipeline (Deals)" })}</span>
              <span className="text-xs font-bold text-slate-900 dark:text-white">{formatNumber(funnelLeads)}</span>
            </div>
            <div className="w-full bg-indigo-50 dark:bg-indigo-900/20 h-8 rounded-md flex items-center px-3 border border-indigo-100 dark:border-indigo-800/30">
              <div className="h-full bg-indigo-500 rounded-sm transition-all duration-1000" style={{ width: `${funnelLeadsPct}%` }}></div>
            </div>
            
            <div className="w-full flex items-center justify-between mt-1">
              <span className="text-xs font-semibold text-slate-500">{t("dashboard.in_progress_unpaid_partial", { defaultValue: "In Progress (Unpaid/Partial)" })}</span>
              <span className="text-xs font-bold text-slate-900 dark:text-white">{formatNumber(funnelNegotiation)}</span>
            </div>
            <div className="w-full bg-indigo-50 dark:bg-indigo-900/20 h-8 rounded-md flex items-center px-3 border border-indigo-100 dark:border-indigo-800/30">
              <div className="h-full bg-indigo-500/80 rounded-sm transition-all duration-1000" style={{ width: `${funnelNegotiationPct}%` }}></div>
            </div>

            <div className="w-full flex items-center justify-between mt-1">
              <span className="text-xs font-semibold text-slate-500">{t("dashboard.won_fully_paid", { defaultValue: "Won (Fully Paid)" })}</span>
              <span className="text-xs font-bold text-slate-900 dark:text-white">{formatNumber(funnelWon)}</span>
            </div>
            <div className="w-full bg-indigo-50 dark:bg-indigo-900/20 h-8 rounded-md flex items-center px-3 border border-indigo-100 dark:border-indigo-800/30">
              <div className="h-full bg-indigo-500/60 rounded-sm transition-all duration-1000" style={{ width: `${funnelWonPct}%` }}></div>
            </div>
          </GlowCardContent>
        </GlowCard>

        {/* Collections Overview */}
        <GlowCard className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 shadow-sm">
          <GlowCardHeader className="pb-2 border-b border-slate-100 dark:border-slate-800/50">
            <GlowCardTitle className="text-sm font-bold text-slate-900 dark:text-white">{t("dashboard.collections_7_days", { defaultValue: "Collections (7 Days)" })}</GlowCardTitle>
          </GlowCardHeader>
          <GlowCardContent className="h-64 p-4 flex flex-col justify-end gap-2">
             <div className="flex items-end justify-between h-full pt-4">
                {collectionsChartData.map((d, i) => (
                  <div key={i} className="w-6 sm:w-8 bg-emerald-500/20 hover:bg-emerald-500/40 transition-colors rounded-t-md relative group cursor-pointer" style={{ height: `${d.pct}%` }}>
                     <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 text-[10px] font-bold bg-slate-800 text-white px-1.5 py-0.5 rounded transition-opacity whitespace-nowrap z-10">
                       {formatEGP(d.amount)}
                     </div>
                  </div>
                ))}
             </div>
             <div className="flex justify-between text-[10px] text-slate-400 font-medium mt-2">
                {days.map(d => (
                  <span key={d.day}>{d.day}</span>
                ))}
             </div>
          </GlowCardContent>
        </GlowCard>

        {/* Receivables Aging */}
        <GlowCard className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 shadow-sm">
          <GlowCardHeader className="pb-2 border-b border-slate-100 dark:border-slate-800/50">
            <GlowCardTitle className="text-sm font-bold text-slate-900 dark:text-white">{t("dashboard.receivables_aging", { defaultValue: "Receivables Aging" })}</GlowCardTitle>
          </GlowCardHeader>
          <GlowCardContent className="h-64 p-4 flex flex-col items-center justify-between">
             <div className="relative w-full flex-1 flex flex-col items-center justify-center">
               <svg viewBox="0 0 100 50" className="w-full max-w-[160px] overflow-visible">
                  <path d="M 10 50 A 40 40 0 0 1 90 50" fill="none" stroke="currentColor" className="text-slate-100 dark:text-slate-800" strokeWidth="12" strokeLinecap="round" />
                  <path d="M 10 50 A 40 40 0 0 1 90 50" fill="none" stroke="currentColor" className="text-amber-500" strokeWidth="12" strokeLinecap="round" strokeDasharray="125.6" strokeDashoffset={agingDashOffset} style={{ transition: 'stroke-dashoffset 1s ease-out' }} />
               </svg>
               <div className="absolute bottom-0 left-0 right-0 flex flex-col items-center justify-end pointer-events-none pb-2">
                  <div className="text-3xl font-black text-slate-900 dark:text-white leading-none">{avgAgingDays}<span className="text-base text-slate-500 font-bold ml-0.5">{t("dashboard.days_short", { defaultValue: "d" })}</span></div>
                  <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-1">{t("dashboard.avg_aging", { defaultValue: "Avg Aging" })}</div>
               </div>
             </div>
             <div className="w-full flex justify-between text-[10px] font-bold mt-4 pt-4 border-t border-slate-100 dark:border-slate-800/50">
                <div className="text-emerald-600 dark:text-emerald-400 text-left">{t("dashboard.aging_current", { defaultValue: "Current" })}<br/><span className="text-slate-900 dark:text-white text-xs whitespace-nowrap">{formatEGP(agingCurrent)}</span></div>
                <div className="text-amber-600 dark:text-amber-400 text-center">{t("dashboard.aging_30_60", { defaultValue: "30-60" })}<br/><span className="text-slate-900 dark:text-white text-xs whitespace-nowrap">{formatEGP(aging30to60)}</span></div>
                <div className="text-rose-600 dark:text-rose-400 text-right">{t("dashboard.aging_60_plus", { defaultValue: "60+" })}<br/><span className="text-slate-900 dark:text-white text-xs whitespace-nowrap">{formatEGP(aging90plus)}</span></div>
             </div>
          </GlowCardContent>
        </GlowCard>

        {/* Recent Activity Timeline */}
        <GlowCard className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 shadow-sm">
          <GlowCardHeader className="flex flex-row items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800/50">
            <GlowCardTitle className="text-sm font-bold text-slate-900 dark:text-white">{t("dashboard.recent_deals")}</GlowCardTitle>
            <Link to="/deals">
              <Button variant="ghost" size="sm" className="h-6 text-[10px] text-indigo-500 hover:text-indigo-600 px-2 -mr-2">
                {t("common.view_all")}
              </Button>
            </Link>
          </GlowCardHeader>
          <GlowCardContent className="h-64 overflow-y-auto p-4 custom-scrollbar">
            {myDeals.length === 0 ? (
              <div className="text-center py-8 text-xs text-muted-foreground flex flex-col items-center gap-2">
                <ShoppingBag className="h-6 w-6 text-muted-foreground/50" />
                <p className="font-semibold">{t("dashboard.no_deals_yet")}</p>
              </div>
            ) : (
              <div className="space-y-4 relative before:absolute before:inset-0 before:ml-[9px] before:-translate-x-px before:h-full before:w-0.5 before:bg-slate-100 dark:before:bg-slate-800">
                {myDeals.slice(0, 5).map((d) => (
                  <div 
                    key={d.id} 
                    className="relative flex items-start gap-3 cursor-pointer group"
                    onClick={() => navigate({ to: "/deals/$id", params: { id: d.id } })}
                  >
                    {/* Dot */}
                    <div className={cn(
                      "flex items-center justify-center w-5 h-5 rounded-full border-2 border-white dark:border-slate-900 z-10 shrink-0 mt-1",
                      d.paymentStatus === "paid" ? "bg-emerald-500" : d.paymentStatus === "partial" ? "bg-amber-500" : "bg-rose-500"
                    )}>
                       <div className="h-1.5 w-1.5 bg-white rounded-full" />
                    </div>
                    {/* Content */}
                    <div className="flex-1 min-w-0 border-b border-slate-100 dark:border-slate-800/50 pb-3 last:border-0 group-hover:bg-slate-50 dark:group-hover:bg-slate-800/30 transition-colors p-1 rounded-sm -m-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-slate-900 dark:text-white truncate pr-2 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{d.customerName}</span>
                        <span className="text-[9px] text-slate-400 font-medium shrink-0">{new Date(d.dealDate).toLocaleDateString()}</span>
                      </div>
                      <div className="text-[10px] text-slate-500 truncate mt-0.5">{d.reference}</div>
                      <div className="text-xs font-black text-slate-900 dark:text-white mt-1">{formatCompactEGP(d.total)}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </GlowCardContent>
        </GlowCard>
      </div>

      {/* Bottom Row: Workflows & Quick Actions */}
      <div className="grid gap-4 lg:grid-cols-4">
        {/* Recent Deal Workflows */}
        <GlowCard className="lg:col-span-3 bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 shadow-sm">
          <GlowCardHeader className="flex flex-row items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800/50">
            <div>
              <GlowCardTitle className="text-sm font-bold text-slate-900 dark:text-white">{t("dashboard.recent_deal_workflows", { defaultValue: "Recent Deal Workflows" })}</GlowCardTitle>
              <GlowCardDescription className="text-[11px] text-slate-500 mt-1">{t("dashboard.recent_deal_workflows_desc", { defaultValue: "Track the status of your latest active deals in the pipeline." })}</GlowCardDescription>
            </div>
          </GlowCardHeader>
          <GlowCardContent className="p-0">
             <div className="overflow-x-auto">
               <table className="w-full text-left text-xs whitespace-nowrap">
                  <thead className="bg-slate-50/50 dark:bg-slate-800/20 text-slate-500 font-semibold border-b border-slate-100 dark:border-slate-800/50">
                    <tr>
                      <th className="px-4 py-3 font-medium">{t("deals.customer", { defaultValue: "Customer" })}</th>
                      <th className="px-4 py-3 font-medium">{t("deals.deal_ref", { defaultValue: "Deal Ref" })}</th>
                      <th className="px-4 py-3 font-medium">{t("deals.status", { defaultValue: "Status" })}</th>
                      <th className="px-4 py-3 font-medium text-right">{t("deals.value", { defaultValue: "Value" })}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                    {myDeals.slice(0, 5).map((d) => (
                      <tr 
                        key={d.id} 
                        className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors cursor-pointer group"
                        onClick={() => navigate({ to: "/deals/$id", params: { id: d.id } })}
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                             <div className="h-6 w-6 rounded-full bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-[9px] shrink-0">
                               {d.customerName.slice(0,2).toUpperCase()}
                             </div>
                             <span className="font-semibold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{d.customerName}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-slate-500 font-mono">{d.reference}</td>
                        <td className="px-4 py-3">
                          <Badge variant="outline" className={cn(
                            "text-[9px] font-bold uppercase tracking-wider border-0 px-2 py-0.5",
                            d.paymentStatus === "paid" ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : d.paymentStatus === "partial" ? "bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400" : "bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400"
                          )}>
                            {t(`common.status.${d.paymentStatus}`)}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-slate-900 dark:text-white">{formatCompactEGP(d.total)}</td>
                      </tr>
                    ))}
                  </tbody>
               </table>
             </div>
          </GlowCardContent>
        </GlowCard>

        {/* Quick Actions */}
        <GlowCard className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 shadow-sm">
          <GlowCardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800/50">
            <GlowCardTitle className="text-sm font-bold text-slate-900 dark:text-white">{t("dashboard.quick_actions")}</GlowCardTitle>
          </GlowCardHeader>
          <GlowCardContent className="p-4 grid grid-cols-2 gap-3 h-[calc(100%-48px)] items-center">
            {(user?.role === "salesman" || user?.role === "admin") && (
              <Link to="/deals/new">
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="w-full h-[88px] rounded-xl border border-slate-100 dark:border-slate-800 hover:border-indigo-500/30 hover:bg-indigo-50/50 dark:hover:bg-indigo-900/10 flex flex-col items-center justify-center gap-2 transition-colors cursor-pointer group">
                  <div className="h-8 w-8 rounded-lg bg-slate-50 dark:bg-slate-800 group-hover:bg-indigo-100 dark:group-hover:bg-indigo-800/50 flex items-center justify-center transition-colors">
                    <Plus className="h-4 w-4 text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400" />
                  </div>
                  <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400 group-hover:text-indigo-700 dark:group-hover:text-indigo-300">{t("dashboard.new_deal")}</span>
                </motion.div>
              </Link>
            )}
            {(user?.role === "finance" || user?.role === "admin") && (
              <Link to="/inventory">
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="w-full h-[88px] rounded-xl border border-slate-100 dark:border-slate-800 hover:border-emerald-500/30 hover:bg-emerald-50/50 dark:hover:bg-emerald-900/10 flex flex-col items-center justify-center gap-2 transition-colors cursor-pointer group">
                  <div className="h-8 w-8 rounded-lg bg-slate-50 dark:bg-slate-800 group-hover:bg-emerald-100 dark:group-hover:bg-emerald-800/50 flex items-center justify-center transition-colors">
                    <Package className="h-4 w-4 text-slate-400 group-hover:text-emerald-600 dark:group-hover:text-emerald-400" />
                  </div>
                  <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400 group-hover:text-emerald-700 dark:group-hover:text-emerald-300">{t("nav.inventory")}</span>
                </motion.div>
              </Link>
            )}
            <Link to="/customers">
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="w-full h-[88px] rounded-xl border border-slate-100 dark:border-slate-800 hover:border-blue-500/30 hover:bg-blue-50/50 dark:hover:bg-blue-900/10 flex flex-col items-center justify-center gap-2 transition-colors cursor-pointer group">
                <div className="h-8 w-8 rounded-lg bg-slate-50 dark:bg-slate-800 group-hover:bg-blue-100 dark:group-hover:bg-blue-800/50 flex items-center justify-center transition-colors">
                  <Users className="h-4 w-4 text-slate-400 group-hover:text-blue-600 dark:group-hover:text-blue-400" />
                </div>
                <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400 group-hover:text-blue-700 dark:group-hover:text-blue-300">{t("nav.customers")}</span>
              </motion.div>
            </Link>
            <Link to="/reports">
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="w-full h-[88px] rounded-xl border border-slate-100 dark:border-slate-800 hover:border-purple-500/30 hover:bg-purple-50/50 dark:hover:bg-purple-900/10 flex flex-col items-center justify-center gap-2 transition-colors cursor-pointer group">
                <div className="h-8 w-8 rounded-lg bg-slate-50 dark:bg-slate-800 group-hover:bg-purple-100 dark:group-hover:bg-purple-800/50 flex items-center justify-center transition-colors">
                  <BarChart2 className="h-4 w-4 text-slate-400 group-hover:text-purple-600 dark:group-hover:text-purple-400" />
                </div>
                <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400 group-hover:text-purple-700 dark:group-hover:text-purple-300">{t("nav.reports")}</span>
              </motion.div>
            </Link>
          </GlowCardContent>
        </GlowCard>
      </div>
    </PageTransition>
  );
}
