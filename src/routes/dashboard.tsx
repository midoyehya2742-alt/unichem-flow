import { createFileRoute } from "@tanstack/react-router";
import { RequireAuth } from "@/components/require-auth";
import { PageHeader } from "@/components/app-shell";
import { useAuth } from "@/lib/auth";
import { useDb } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { formatEGP, formatNumber } from "@/lib/format";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Plus, TrendingUp, Wallet, FileText, Clock, CheckCircle2, AlertTriangle, Users,
  ArrowRight, ShieldCheck, ShoppingBag, Package, Sparkles, BarChart2, Zap, Edit2
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell, Legend, BarChart, Bar,
} from "recharts";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { PageTransition } from "@/components/ui/page-transition";
import { KpiCard } from "@/components/ui/kpi-card";

export const Route = createFileRoute("/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — UniChem ERP" }] }),
  component: () => <RequireAuth><Dashboard /></RequireAuth>,
});

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.08 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 300, damping: 24 } }
};

function Dashboard() {
  const { user } = useAuth();
  const db = useDb();
  const [loading, setLoading] = useState(true);
  const { t } = useTranslation("common");

  // Simulate premium skeleton loader
  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 500);
    return () => clearTimeout(t);
  }, []);

  const deals = db.listDeals();
  const products = db.listProducts();
  const customers = db.listCustomers();
  const movements = db.listInventoryMovements();

  const myDeals = deals;

  const total = myDeals.reduce((s, d) => s + d.total, 0);
  const paid = myDeals.reduce((s, d) => s + d.amountPaid, 0);
  const outstanding = total - paid;
  const pending = myDeals.filter((d) => d.paymentStatus !== "paid").length;
  
  // Low Stock Alert calculations
  const lowStockProducts = products.filter((p) => p.stockQuantity <= p.minimumStockLevel);

  // Pending Edit Requests calculations (for finance/admin)
  const pendingEditRequests = deals.filter(d => d.editRequest?.status === "pending");

  // Status mapping
  const byStatus = [
    { name: "Paid", value: myDeals.filter((d) => d.paymentStatus === "paid").length },
    { name: "Partial", value: myDeals.filter((d) => d.paymentStatus === "partial").length },
    { name: "Unpaid", value: myDeals.filter((d) => d.paymentStatus === "unpaid").length },
  ].filter(s => s.value > 0);

  const STATUS_COLORS = ["#10b981", "#f59e0b", "#ef4444"];

  const bySalesman = Object.values(
    myDeals.reduce<Record<string, { name: string; total: number }>>((acc, d) => {
      acc[d.salesmanId] = acc[d.salesmanId] || { name: d.salesmanName, total: 0 };
      acc[d.salesmanId].total += d.total;
      return acc;
    }, {}),
  ).sort((a, b) => b.total - a.total).slice(0, 5);

  // last 7 days chart data
  const days = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (6 - i));
    const key = d.toISOString().slice(0, 10);
    const sum = myDeals.filter((x) => x.dealDate.slice(0, 10) === key).reduce((s, x) => s + x.total, 0);
    return { day: d.toLocaleDateString("en", { weekday: "short" }), total: sum };
  });

  if (loading) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
        <div className="h-10 w-48 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-28 bg-slate-200 dark:bg-slate-800 rounded-xl animate-pulse" />
          ))}
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2 h-80 bg-slate-200 dark:bg-slate-800 rounded-xl animate-pulse" />
          <div className="h-80 bg-slate-200 dark:bg-slate-800 rounded-xl animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <PageTransition className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6 font-sans">
      <PageHeader
        title={t("dashboard.welcome", { name: user?.name.split(" ")[0] })}
        description={
          user?.role === "salesman" ? t("dashboard.desc_sales")
            : user?.role === "finance" ? t("dashboard.desc_finance")
              : t("dashboard.desc_admin")
        }
        actions={
          <div className="flex gap-2">
            {(user?.role === "salesman" || user?.role === "admin") && (
              <Link to="/deals/new">
                <Button className="shadow-lg shadow-indigo-600/10">
                  <Plus className="h-4 w-4 ms-2" /> {t("dashboard.new_deal")}
                </Button>
              </Link>
            )}
          </div>
        }
      />

      {/* Low Stock Banner Alert */}
      {lowStockProducts.length > 0 && (user?.role === "admin" || user?.role === "finance") && (
        <div className="flex items-center justify-between p-4 bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-300 rounded-xl">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0" />
            <div className="text-xs">
              <span className="font-bold">{t("dashboard.inventory_alert")}</span> {t("dashboard.low_stock_msg", { count: lowStockProducts.length })}
            </div>
          </div>
          <Link to="/inventory">
            <Button size="sm" variant="outline" className="text-xs h-8 border-amber-500/30 hover:bg-amber-500/20">
              {t("dashboard.audit_stock")}
            </Button>
          </Link>
        </div>
      )}

      {/* Pending Edit Requests Banner (Finance/Admin) */}
      {pendingEditRequests.length > 0 && (user?.role === "admin" || user?.role === "finance") && (
        <div className="flex flex-col gap-3 p-4 bg-violet-500/10 border border-violet-500/20 text-violet-800 dark:text-violet-300 rounded-xl">
          <div className="flex items-center gap-3">
            <Edit2 className="h-5 w-5 text-violet-500 shrink-0" />
            <div className="text-xs">
              <span className="font-bold">Edit Requests Pending</span> — {pendingEditRequests.length} deal(s) await your review.
            </div>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3">
            {pendingEditRequests.map(deal => (
              <div key={deal.id} className="flex items-center justify-between p-2 rounded-lg bg-white/50 dark:bg-black/20 border border-violet-500/10">
                <div className="flex flex-col overflow-hidden">
                  <span className="text-xs font-semibold truncate">{deal.reference}</span>
                  <span className="text-[10px] opacity-70 truncate">{deal.editRequest?.requestedByName}</span>
                </div>
                <Link to="/deals/$id" params={{ id: deal.id }}>
                  <Button size="sm" variant="ghost" className="h-6 text-[10px] px-2 text-violet-600 hover:text-violet-700 hover:bg-violet-500/10 dark:text-violet-400">
                    Review
                  </Button>
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* KPI Cards Grid */}
      <motion.div 
        variants={containerVariants} 
        initial="hidden" 
        animate="show" 
        className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
      >
        <motion.div variants={itemVariants}>
          <KpiCard
            icon={FileText}
            label={t("dashboard.total_deals")}
            value={formatNumber(myDeals.length)}
            sub="Submitted to console"
            tone="primary"
          />
        </motion.div>
        <motion.div variants={itemVariants}>
          <KpiCard
            icon={TrendingUp}
            label={t("dashboard.total_pipeline")}
            value={formatEGP(total)}
            sub="Sum of deal values"
            tone="primary"
          />
        </motion.div>
        <motion.div variants={itemVariants}>
          <KpiCard
            icon={Wallet}
            label={t("dashboard.collected_cash")}
            value={formatEGP(paid)}
            sub="Total validated receipts"
            tone="success"
          />
        </motion.div>
        <motion.div variants={itemVariants}>
          <KpiCard
            icon={Clock}
            label={t("dashboard.outstanding")}
            value={formatEGP(outstanding)}
            sub={`${pending} open requests`}
            tone={outstanding > 0 ? "warning" : "muted"}
          />
        </motion.div>
      </motion.div>

      {/* Charts Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Area Chart */}
        <Card className="lg:col-span-2 shadow-sm border-slate-200 dark:border-slate-800">
          <CardHeader className="flex flex-row items-center justify-between pb-4">
            <div>
              <CardTitle className="text-base font-bold">{t("dashboard.revenue_timeline")}</CardTitle>
              <CardDescription className="text-xs">{t("dashboard.revenue_timeline_desc")}</CardDescription>
            </div>
            <BarChart2 className="h-4.5 w-4.5 text-slate-400" />
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={days} margin={{ left: -10, right: 10 }}>
                <defs>
                  <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="rgb(79, 70, 229)" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="rgb(79, 70, 229)" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.1)" />
                <XAxis dataKey="day" stroke="var(--color-muted-foreground)" fontSize={11} tickLine={false} />
                <YAxis stroke="var(--color-muted-foreground)" fontSize={11} tickLine={false} />
                <Tooltip
                  contentStyle={{ background: "var(--color-card)", border: "1px solid var(--color-border)", borderRadius: 8, fontSize: 12 }}
                  formatter={(v: number) => [formatEGP(v), t("dashboard.revenue")]}
                />
                <Area type="monotone" dataKey="total" stroke="rgb(79, 70, 229)" strokeWidth={2} fillOpacity={1} fill="url(#colorTotal)" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Pie Status Chart */}
        <Card className="shadow-sm border-slate-200 dark:border-slate-800">
          <CardHeader className="pb-4">
            <CardTitle className="text-base font-bold">{t("dashboard.payment_allocation")}</CardTitle>
            <CardDescription className="text-xs">{t("dashboard.payment_allocation_desc")}</CardDescription>
          </CardHeader>
          <CardContent className="h-72 flex flex-col justify-between">
            {myDeals.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">{t("dashboard.no_active_pipelines")}</div>
            ) : (
              <div className="relative w-full h-full">
                <ResponsiveContainer width="100%" height="80%">
                  <PieChart>
                    <Pie data={byStatus} dataKey="value" nameKey="name" innerRadius={50} outerRadius={70} paddingAngle={3}>
                      {byStatus.map((_, i) => <Cell key={i} fill={STATUS_COLORS[i % STATUS_COLORS.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={{ background: "var(--color-card)", border: "1px solid var(--color-border)", borderRadius: 8, fontSize: 11 }} />
                  </PieChart>
                </ResponsiveContainer>
                {/* Legend list */}
                <div className="flex justify-center gap-4 text-xs mt-2">
                  {byStatus.map((s, idx) => (
                    <div key={s.name} className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: STATUS_COLORS[idx % STATUS_COLORS.length] }} />
                      <span className="text-slate-600 dark:text-slate-400">{s.name} ({s.value})</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Bottom Grid: Recent Activity & Admin Widgets */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Recent Deals Table list */}
        <Card className="lg:col-span-2 shadow-sm border-slate-200 dark:border-slate-800">
          <CardHeader className="flex flex-row items-center justify-between pb-4">
            <div>
              <CardTitle className="text-base font-bold">{t("dashboard.recent_deals")}</CardTitle>
              <CardDescription className="text-xs">{t("dashboard.recent_deals_desc")}</CardDescription>
            </div>
            <Link to="/deals">
              <Button variant="ghost" size="sm" className="text-xs text-indigo-500 hover:text-indigo-600">
                {t("common.view_all")} <ArrowRight className="h-3 w-3 ms-1 rtl:rotate-180" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {myDeals.length === 0 ? (
              <div className="text-center py-10 text-xs text-slate-400 flex flex-col items-center gap-2">
                <ShoppingBag className="h-8 w-8 text-slate-300 dark:text-slate-700" />
                <span>{t("dashboard.no_deals_yet")}</span>
                {(user?.role === "salesman" || user?.role === "admin") && (
                  <Link to="/deals/new" className="mt-2">
                    <Button size="sm">{t("dashboard.create_first_deal")}</Button>
                  </Link>
                )}
              </div>
            ) : (
              <motion.div variants={containerVariants} initial="hidden" animate="show" className="divide-y divide-slate-100 dark:divide-slate-800">
                {myDeals.slice(0, 5).map((d) => (
                  <motion.div variants={itemVariants} key={d.id}>
                    <Link
                      to="/deals/$id"
                      params={{ id: d.id }}
                      className="flex items-center justify-between py-3 hover:bg-slate-100/40 dark:hover:bg-slate-800/20 px-2 rounded-lg transition"
                    >
                      <div className="min-w-0">
                        <div className="font-semibold text-xs text-slate-800 dark:text-slate-200">{d.reference} · {d.customerName}</div>
                        <div className="text-[10px] text-slate-400 mt-0.5">{t("dashboard.assigned")}: {d.salesmanName} · {new Date(d.dealDate).toLocaleDateString()}</div>
                      </div>
                      <div className="text-right ms-4">
                        <div className="font-bold text-xs text-slate-800 dark:text-slate-200">{formatEGP(d.total)}</div>
                        <Badge variant={d.paymentStatus === "paid" ? "default" : d.paymentStatus === "partial" ? "secondary" : "destructive"} className="text-[9px] px-1 py-0 h-4 mt-0.5">
                          {t(`common.status.${d.paymentStatus}`)}
                        </Badge>
                      </div>
                    </Link>
                  </motion.div>
                ))}
              </motion.div>
            )}
          </CardContent>
        </Card>

        {/* Personalized Role Panel / Quick Shortcuts */}
        <div className="space-y-6">
          <Card className="shadow-sm border-slate-200 dark:border-slate-800">
            <CardHeader>
              <CardTitle className="text-base font-bold">{t("dashboard.quick_actions")}</CardTitle>
              <CardDescription className="text-xs">{t("dashboard.quick_actions_desc")}</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-2">
              {(user?.role === "salesman" || user?.role === "admin") && (
                <Link to="/deals/new" className="w-full">
                  <Button variant="outline" className="w-full h-16 flex flex-col gap-1 text-xs justify-center items-center">
                    <Plus className="h-4.5 w-4.5 text-indigo-500" />
                    <span>{t("dashboard.new_deal")}</span>
                  </Button>
                </Link>
              )}
              {(user?.role === "finance" || user?.role === "admin") && (
                <Link to="/inventory" className="w-full">
                  <Button variant="outline" className="w-full h-16 flex flex-col gap-1 text-xs justify-center items-center">
                    <Package className="h-4.5 w-4.5 text-emerald-500" />
                    <span>{t("nav.inventory")}</span>
                  </Button>
                </Link>
              )}
              <Link to="/customers" className="w-full">
                <Button variant="outline" className="w-full h-16 flex flex-col gap-1 text-xs justify-center items-center">
                  <Users className="h-4.5 w-4.5 text-blue-500" />
                  <span>{t("nav.customers")}</span>
                </Button>
              </Link>
              {(user?.role === "admin" || user?.role === "finance" || user?.role === "salesman") && (
                <Link to="/reports" className="w-full">
                  <Button variant="outline" className="w-full h-16 flex flex-col gap-1 text-xs justify-center items-center">
                    <BarChart2 className="h-4.5 w-4.5 text-indigo-500" />
                    <span>{t("nav.reports")}</span>
                  </Button>
                </Link>
              )}
            </CardContent>
          </Card>

          {/* Performance Goal widget */}
          <Card className="shadow-sm border-slate-200 dark:border-slate-800 relative overflow-hidden bg-gradient-to-br from-indigo-900 to-slate-950 text-white">
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <Zap className="h-24 w-24" />
            </div>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold flex items-center gap-1.5 text-yellow-500">
                <Sparkles className="h-4 w-4" /> {t("dashboard.role_summary")}
              </CardTitle>
            </CardHeader>
            <CardContent className="text-xs space-y-3">
              <div>
                <span className="text-slate-400">{t("dashboard.current_role")}: </span>
                <span className="font-bold text-white capitalize">{user?.role}</span>
              </div>

              {user?.role === "salesman" ? (
                <div className="space-y-2">
                  <div>{t("dashboard.pipeline_active")}</div>
                  <div className="pt-2">
                    <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                      <span>{t("dashboard.monthly_target")}</span>
                      <span>{t("dashboard.deals_target", { count: myDeals.length })}</span>
                    </div>
                    <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                      <div className="bg-indigo-500 h-full rounded-full transition-all" style={{ width: `${Math.min(100, (myDeals.length / 10) * 100)}%` }} />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-1 text-slate-300">
                  <div className="flex justify-between py-1 border-b border-white/5">
                    <span>{t("dashboard.products_in_catalog")}:</span>
                    <span className="font-bold text-white">{products.length}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-white/5">
                    <span>{t("dashboard.active_customers")}:</span>
                    <span className="font-bold text-white">{customers.length}</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span>{t("dashboard.global_movements")}:</span>
                    <span className="font-bold text-white">{t("dashboard.movements_logged", { count: movements.length })}</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </PageTransition>
  );
}
