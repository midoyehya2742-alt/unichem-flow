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
  ArrowRight, ShieldCheck, ShoppingBag, Package, Sparkles, BarChart2, Zap
} from "lucide-react";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell, Legend, BarChart, Bar,
} from "recharts";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — UniChem ERP" }] }),
  component: () => <RequireAuth><Dashboard /></RequireAuth>,
});

function Dashboard() {
  const { user } = useAuth();
  const db = useDb();
  const [loading, setLoading] = useState(true);

  // Simulate premium skeleton loader
  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 500);
    return () => clearTimeout(t);
  }, []);

  const deals = db.listDeals();
  const products = db.listProducts();
  const customers = db.listCustomers();
  const movements = db.listInventoryMovements();

  const myDeals = user?.role === "salesman" ? deals.filter((d) => d.salesmanId === user.id) : deals;

  const total = myDeals.reduce((s, d) => s + d.total, 0);
  const paid = myDeals.reduce((s, d) => s + d.amountPaid, 0);
  const outstanding = total - paid;
  const pending = myDeals.filter((d) => d.paymentStatus !== "paid").length;
  
  // Low Stock Alert calculations
  const lowStockProducts = products.filter((p) => p.stockQuantity <= p.minimumStockLevel);

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
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6 font-sans">
      <PageHeader
        title={`Welcome, ${user?.name.split(" ")[0]}`}
        description={
          user?.role === "salesman" ? "Here is your personal pipeline overview."
            : user?.role === "finance" ? "Unified company cashflow, payments, and invoices."
              : "Complete system controls and administrative activities."
        }
        actions={
          <div className="flex gap-2">
            {(user?.role === "salesman" || user?.role === "admin") && (
              <Link to="/deals/new">
                <Button className="shadow-lg shadow-indigo-600/10">
                  <Plus className="h-4 w-4 mr-2" /> New Deal
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
              <span className="font-bold">Inventory Alert:</span> {lowStockProducts.length} chemical items are at or below minimum reserve thresholds.
            </div>
          </div>
          <Link to="/inventory">
            <Button size="sm" variant="outline" className="text-xs h-8 border-amber-500/30 hover:bg-amber-500/20">
              Audit Stock
            </Button>
          </Link>
        </div>
      )}

      {/* KPI Cards Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          icon={FileText}
          label="Total Deals"
          value={formatNumber(myDeals.length)}
          sub="Submitted to console"
          tone="primary"
        />
        <KpiCard
          icon={TrendingUp}
          label="Total Pipeline"
          value={formatEGP(total)}
          sub="Sum of deal values"
          tone="primary"
        />
        <KpiCard
          icon={Wallet}
          label="Collected Cash"
          value={formatEGP(paid)}
          sub="Total validated receipts"
          tone="success"
        />
        <KpiCard
          icon={Clock}
          label="Outstanding"
          value={formatEGP(outstanding)}
          sub={`${pending} open requests`}
          tone={outstanding > 0 ? "warning" : "muted"}
        />
      </div>

      {/* Charts Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Area Chart */}
        <Card className="lg:col-span-2 shadow-sm border-slate-200 dark:border-slate-800">
          <CardHeader className="flex flex-row items-center justify-between pb-4">
            <div>
              <CardTitle className="text-base font-bold">Revenue Timeline</CardTitle>
              <CardDescription className="text-xs">7-day rolling sales totals (EGP)</CardDescription>
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
                  formatter={(v: number) => [formatEGP(v), "Revenue"]}
                />
                <Area type="monotone" dataKey="total" stroke="rgb(79, 70, 229)" strokeWidth={2} fillOpacity={1} fill="url(#colorTotal)" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Pie Status Chart */}
        <Card className="shadow-sm border-slate-200 dark:border-slate-800">
          <CardHeader className="pb-4">
            <CardTitle className="text-base font-bold">Payment Allocation</CardTitle>
            <CardDescription className="text-xs">Deals distribution by status</CardDescription>
          </CardHeader>
          <CardContent className="h-72 flex flex-col justify-between">
            {myDeals.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">No active pipelines.</div>
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
              <CardTitle className="text-base font-bold">Recent Deal Workflows</CardTitle>
              <CardDescription className="text-xs">Latest submissions and payment tracking</CardDescription>
            </div>
            <Link to="/deals">
              <Button variant="ghost" size="sm" className="text-xs text-indigo-500 hover:text-indigo-600">
                View all <ArrowRight className="h-3 w-3 ml-1" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {myDeals.length === 0 ? (
              <div className="text-center py-10 text-xs text-slate-400 flex flex-col items-center gap-2">
                <ShoppingBag className="h-8 w-8 text-slate-300 dark:text-slate-700" />
                <span>No deals submitted yet. Start by generating a transaction.</span>
                {(user?.role === "salesman" || user?.role === "admin") && (
                  <Link to="/deals/new" className="mt-2">
                    <Button size="sm">Create First Deal</Button>
                  </Link>
                )}
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {myDeals.slice(0, 5).map((d) => (
                  <Link
                    key={d.id}
                    to="/deals/$id"
                    params={{ id: d.id }}
                    className="flex items-center justify-between py-3 hover:bg-slate-100/40 dark:hover:bg-slate-800/20 px-2 rounded-lg transition"
                  >
                    <div className="min-w-0">
                      <div className="font-semibold text-xs text-slate-800 dark:text-slate-200">{d.reference} · {d.customerName}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">Assigned: {d.salesmanName} · {new Date(d.dealDate).toLocaleDateString()}</div>
                    </div>
                    <div className="text-right ml-4">
                      <div className="font-bold text-xs text-slate-800 dark:text-slate-200">{formatEGP(d.total)}</div>
                      <Badge variant={d.paymentStatus === "paid" ? "default" : d.paymentStatus === "partial" ? "secondary" : "destructive"} className="text-[9px] px-1 py-0 h-4 mt-0.5">
                        {d.paymentStatus}
                      </Badge>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Personalized Role Panel / Quick Shortcuts */}
        <div className="space-y-6">
          <Card className="shadow-sm border-slate-200 dark:border-slate-800">
            <CardHeader>
              <CardTitle className="text-base font-bold">Quick Actions</CardTitle>
              <CardDescription className="text-xs">Perform routine tasks immediately</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-2">
              {(user?.role === "salesman" || user?.role === "admin") && (
                <Link to="/deals/new" className="w-full">
                  <Button variant="outline" className="w-full h-16 flex flex-col gap-1 text-xs justify-center items-center">
                    <Plus className="h-4.5 w-4.5 text-indigo-500" />
                    <span>New Deal</span>
                  </Button>
                </Link>
              )}
              {(user?.role === "finance" || user?.role === "admin") && (
                <Link to="/inventory" className="w-full">
                  <Button variant="outline" className="w-full h-16 flex flex-col gap-1 text-xs justify-center items-center">
                    <Package className="h-4.5 w-4.5 text-emerald-500" />
                    <span>Inventory</span>
                  </Button>
                </Link>
              )}
              <Link to="/customers" className="w-full">
                <Button variant="outline" className="w-full h-16 flex flex-col gap-1 text-xs justify-center items-center">
                  <Users className="h-4.5 w-4.5 text-blue-500" />
                  <span>Customers</span>
                </Button>
              </Link>
              {(user?.role === "admin" || user?.role === "finance") && (
                <Link to="/reports" className="w-full">
                  <Button variant="outline" className="w-full h-16 flex flex-col gap-1 text-xs justify-center items-center">
                    <BarChart2 className="h-4.5 w-4.5 text-indigo-500" />
                    <span>Reports</span>
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
                <Sparkles className="h-4 w-4" /> Role Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="text-xs space-y-3">
              <div>
                <span className="text-slate-400">Current Role: </span>
                <span className="font-bold text-white capitalize">{user.role}</span>
              </div>
              
              {user.role === "salesman" ? (
                <div className="space-y-2">
                  <div>Pipeline conversion status is active. Add transactions via the side panel to update finance ledger logs.</div>
                  <div className="pt-2">
                    <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                      <span>Monthly pipeline target</span>
                      <span>{formatNumber(myDeals.length)} / 10 deals</span>
                    </div>
                    <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                      <div className="bg-indigo-500 h-full rounded-full transition-all" style={{ width: `${Math.min(100, (myDeals.length / 10) * 100)}%` }} />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-1 text-slate-300">
                  <div className="flex justify-between py-1 border-b border-white/5">
                    <span>Products in catalog:</span>
                    <span className="font-bold text-white">{products.length}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-white/5">
                    <span>Active Customers:</span>
                    <span className="font-bold text-white">{customers.length}</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span>Global Movements log:</span>
                    <span className="font-bold text-white">{movements.length} logged</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function KpiCard({
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
